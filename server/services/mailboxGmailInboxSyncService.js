'use strict';

/**
 * Gmail inbox sync for personal mailboxes (Phase 5).
 * Uses OAuth2 refresh token (encrypted on Mailbox) + Gmail API to fetch INBOX messages
 * and ingests them via the trusted workspace inbound path.
 */

const jwt = require('jsonwebtoken');
const Communication = require('../models/Communication');
const Mailbox = require('../models/Mailbox');
const { processRawInbound } = require('../platform/communication/inbound/inboundDispatcher');
const { getGmailOAuthAppCredentialsForServer } = require('../platform/communication/config/communicationConfigService');
const { encryptTenantSecret, decryptTenantSecret } = require('../utils/tenantSecretCrypto');

const MAX_MESSAGES_PER_RUN = 40;
const MAX_SYNC_LABELS = 24;
/** When the mailbox has no `gmailSyncLabelIds` yet (legacy rows), sync INBOX only. */
const LEGACY_DEFAULT_SYNC_LABEL_IDS = ['INBOX'];
/** Applied on first successful Gmail OAuth for a personal mailbox. */
const OAUTH_DEFAULT_SYNC_LABEL_IDS = ['INBOX', 'STARRED', 'IMPORTANT'];

function normalizeGmailSyncLabelIds(raw) {
  const list = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : [];
  const uniq = [...new Set(list)];
  const safe = uniq
    .filter((id) => /^[A-Za-z0-9_]+$/.test(id) && id.length <= 128)
    .slice(0, MAX_SYNC_LABELS);
  return safe.length ? safe : [...LEGACY_DEFAULT_SYNC_LABEL_IDS];
}

function buildGmailListQueryFromLabelIds(labelIds) {
  const ids = normalizeGmailSyncLabelIds(labelIds);
  if (ids.length === 1) return `label:${ids[0]}`;
  return `(${ids.map((id) => `label:${id}`).join(' OR ')})`;
}

function normalizeOAuthLoginHint(raw) {
  const s = String(raw || '').trim().slice(0, 320);
  if (!s || !s.includes('@')) return '';
  return s;
}

function originOf(url) {
  try {
    const u = new URL(String(url || ''));
    if (!u.protocol || !u.host) return '';
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

/**
 * Best-effort: pull the orgId out of the (possibly-expired) state JWT so we
 * can derive a frontend base URL from the per-org Gmail redirect URI's origin.
 * Used only to pick the host for the post-callback redirect, never for trust —
 * so we decode without verifying (verification still happens in
 * completeGmailOAuthCallback before any tokens are stored).
 *
 * @returns {Promise<string>} Origin like "https://app.example.com" or "" when
 *   the state is unparseable or no per-org redirect URI is configured.
 */
async function resolveClientBaseUrlFromState(state) {
  try {
    const payload = jwt.decode(String(state || ''));
    const orgId = payload && payload.oid;
    if (!orgId) return '';
    const creds = await getGmailOAuthAppCredentialsForServer(orgId);
    if (creds.error || !creds.redirectUri) return '';
    return originOf(creds.redirectUri);
  } catch {
    return '';
  }
}

async function getOAuthClient(organizationId) {
  const creds = await getGmailOAuthAppCredentialsForServer(organizationId);
  if (creds.error) return { error: creds.error };
  const { google } = require('googleapis');
  const oauth2Client = new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri);
  return { google, oauth2Client };
}

async function buildGmailAuthorizeUrl({ mailboxId, userId, organizationId, loginHint } = {}) {
  const r = await getOAuthClient(organizationId);
  if (r.error) return { error: r.error };
  const { oauth2Client } = r;
  if (!process.env.JWT_SECRET) {
    return { error: 'JWT_SECRET is required for OAuth state signing.' };
  }
  const state = jwt.sign(
    {
      mid: String(mailboxId),
      uid: String(userId),
      oid: String(organizationId)
    },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
  const authParams = {
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state
  };
  const hint = normalizeOAuthLoginHint(loginHint);
  if (hint) {
    authParams.login_hint = hint;
  }
  const url = oauth2Client.generateAuthUrl(authParams);
  return { url };
}

/**
 * Exchange OAuth code and persist refresh token on mailbox.
 * @returns {Promise<{ ok: boolean, error?: string, accountEmail?: string }>}
 */
async function completeGmailOAuthCallback({ code, state }) {
  let payload;
  try {
    payload = jwt.verify(String(state || ''), process.env.JWT_SECRET);
  } catch {
    return { ok: false, error: 'Invalid or expired OAuth state' };
  }
  const mailboxId = payload.mid;
  const userId = payload.uid;
  const organizationId = payload.oid;
  if (!mailboxId || !userId || !organizationId) {
    return { ok: false, error: 'OAuth state missing mailbox context' };
  }

  const client = await getOAuthClient(organizationId);
  if (client.error) return { ok: false, error: client.error };
  const { google, oauth2Client } = client;

  const { tokens } = await oauth2Client.getToken(String(code || ''));
  if (!tokens?.refresh_token) {
    return {
      ok: false,
      error:
        'No refresh token returned. Remove the app from your Google account security settings and try again (Google only returns refresh_token on first consent).'
    };
  }

  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const prof = await gmail.users.getProfile({ userId: 'me' });
  const accountEmail = String(prof.data.emailAddress || '').toLowerCase().trim();

  const mb = await Mailbox.findOne({
    _id: mailboxId,
    organizationId,
    kind: 'personal',
    ownerUserId: userId
  });
  if (!mb) {
    return { ok: false, error: 'Mailbox not found or not a personal mailbox owned by you' };
  }

  await Mailbox.updateOne(
    { _id: mb._id },
    {
      $set: {
        inboxProvider: 'google',
        inboxSyncEncryptedRefreshToken: encryptTenantSecret(tokens.refresh_token),
        inboxSyncAccountEmail: accountEmail,
        gmailHistoryId: prof.data.historyId ? String(prof.data.historyId) : '',
        syncStatus: 'connected',
        lastInboxSyncError: '',
        emailAddress: accountEmail || mb.emailAddress,
        gmailSyncLabelIds:
          Array.isArray(mb.gmailSyncLabelIds) && mb.gmailSyncLabelIds.length > 0
            ? mb.gmailSyncLabelIds
            : OAUTH_DEFAULT_SYNC_LABEL_IDS
      }
    }
  );

  return { ok: true, accountEmail };
}

async function listMessageIdsSinceHistory(gmail, historyId) {
  const ids = [];
  let nextPageToken;
  let latestHistoryId = String(historyId || '');
  try {
    do {
      const res = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: historyId,
        historyTypes: ['messageAdded'],
        pageToken: nextPageToken || undefined
      });
      if (res.data.historyId) latestHistoryId = String(res.data.historyId);
      for (const h of res.data.history || []) {
        for (const added of h.messagesAdded || []) {
          if (added?.message?.id) ids.push(String(added.message.id));
        }
      }
      nextPageToken = res.data.nextPageToken || null;
    } while (nextPageToken && ids.length < MAX_MESSAGES_PER_RUN);
  } catch (err) {
    const code = err?.code || err?.response?.status;
    if (code === 404) {
      return { ids: [], latestHistoryId: '', resetHistory: true };
    }
    throw err;
  }
  return { ids, latestHistoryId, resetHistory: false };
}

async function listGmailLabelsFromApi(gmail) {
  const res = await gmail.users.labels.list({ userId: 'me' });
  const labels = (res.data.labels || [])
    .map((l) => ({
      id: String(l.id || ''),
      name: String(l.name || l.id || ''),
      type: l.type === 'system' ? 'system' : 'user',
      messageListVisibility: l.messageListVisibility || ''
    }))
    .filter((l) => l.id);
  labels.sort((a, b) => {
    const ao = a.type === 'system' ? 0 : 1;
    const bo = b.type === 'system' ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });
  return labels;
}

/**
 * @param {object} mailboxLean — mailbox with encrypted refresh
 * @returns {Promise<{ labels?: Array<{ id: string, name: string, type: string, messageListVisibility: string }>, error?: string }>}
 */
async function listGmailLabelsForMailbox(mailboxLean) {
  const orgId = mailboxLean.organizationId;
  const enc = mailboxLean.inboxSyncEncryptedRefreshToken;
  const refresh = decryptTenantSecret(enc);
  if (!refresh) {
    return { error: 'Missing or invalid stored refresh token' };
  }
  const oauthClient = await getOAuthClient(orgId);
  if (oauthClient.error) return { error: oauthClient.error };
  const { google, oauth2Client } = oauthClient;
  oauth2Client.setCredentials({ refresh_token: refresh });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const labels = await listGmailLabelsFromApi(gmail);
    return { labels };
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

/**
 * @param {object} gmail — Gmail API client (googleapis v1)
 * @param {string[]} messageIds
 * @param {string[]} syncLabelIds
 * @returns {Promise<string[]>}
 */
async function filterMessageIdsBySyncLabels(gmail, messageIds, syncLabelIds) {
  const wanted = new Set(normalizeGmailSyncLabelIds(syncLabelIds));
  const out = [];
  for (const mid of messageIds) {
    try {
      const meta = await gmail.users.messages.get({
        userId: 'me',
        id: mid,
        format: 'metadata',
        metadataHeaders: []
      });
      const lids = meta.data.labelIds || [];
      if (lids.some((lid) => wanted.has(String(lid)))) {
        out.push(String(mid));
      }
    } catch {
      /* skip unreadable message */
    }
  }
  return out;
}

/**
 * @param {object} mailboxLean — mailbox with encrypted refresh
 * @returns {Promise<{ imported: number, skipped: number, error?: string }>}
 */
async function runGmailInboxSyncForMailbox(mailboxLean) {
  const orgId = mailboxLean.organizationId;
  const mailboxId = mailboxLean._id;
  const enc = mailboxLean.inboxSyncEncryptedRefreshToken;
  const refresh = decryptTenantSecret(enc);
  if (!refresh) {
    return { imported: 0, skipped: 0, error: 'Missing or invalid stored refresh token' };
  }

  const oauthClient = await getOAuthClient(orgId);
  if (oauthClient.error) return { imported: 0, skipped: 0, error: oauthClient.error };
  const { google, oauth2Client } = oauthClient;

  oauth2Client.setCredentials({ refresh_token: refresh });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const syncLabelIds =
    Array.isArray(mailboxLean.gmailSyncLabelIds) && mailboxLean.gmailSyncLabelIds.length > 0
      ? mailboxLean.gmailSyncLabelIds
      : LEGACY_DEFAULT_SYNC_LABEL_IDS;

  let messageIds = [];
  let storedHistory = mailboxLean.gmailHistoryId ? String(mailboxLean.gmailHistoryId) : '';

  if (storedHistory) {
    const hist = await listMessageIdsSinceHistory(gmail, storedHistory);
    if (hist.resetHistory) {
      storedHistory = '';
    } else {
      const rawIds = [...new Set(hist.ids)].slice(0, MAX_MESSAGES_PER_RUN);
      messageIds = await filterMessageIdsBySyncLabels(gmail, rawIds, syncLabelIds);
    }
  }

  if (!messageIds.length) {
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: MAX_MESSAGES_PER_RUN,
      q: buildGmailListQueryFromLabelIds(syncLabelIds)
    });
    messageIds = (list.data.messages || []).map((m) => String(m.id)).filter(Boolean);
  }

  let imported = 0;
  let skipped = 0;

  for (const mid of messageIds) {
    const providerMessageKey = `gmail:${mid}`;
    const dup = await Communication.findOne({
      organizationId: orgId,
      providerMessageKey
    })
      .select('_id')
      .lean();
    if (dup) {
      skipped += 1;
      continue;
    }

    const full = await gmail.users.messages.get({
      userId: 'me',
      id: mid,
      format: 'raw'
    });
    const rawB64 = full.data.raw;
    if (!rawB64) {
      skipped += 1;
      continue;
    }
    const rawMime = Buffer.from(String(rawB64).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    try {
      await processRawInbound({
        rawMime,
        headerOrganizationId: null,
        source: 'gmail-mailbox-sync',
        forcedWorkspaceInbox: {
          organizationId: orgId,
          mailboxId,
          providerMessageKey
        }
      });
      imported += 1;
    } catch (err) {
      const msg = err?.message || String(err);
      const code = err?.code;
      if (code === 11000 || msg.includes('duplicate') || msg.includes('E11000')) {
        skipped += 1;
        continue;
      }
      throw err;
    }
  }

  const prof = await gmail.users.getProfile({ userId: 'me' });
  const profileHistoryId = prof.data.historyId ? String(prof.data.historyId) : '';

  await Mailbox.updateOne(
    { _id: mailboxId, organizationId: orgId },
    {
      $set: {
        gmailHistoryId: profileHistoryId || storedHistory,
        lastInboxSyncAt: new Date(),
        lastInboxSyncError: '',
        syncStatus: 'connected'
      }
    }
  );

  return { imported, skipped };
}

function assertPersonalOwner(mailbox, userId) {
  if (!mailbox) return 'Mailbox not found';
  if (mailbox.kind !== 'personal') return 'Only personal mailboxes support Gmail inbox sync';
  if (String(mailbox.ownerUserId) !== String(userId)) {
    return 'Only the mailbox owner can connect Gmail';
  }
  return null;
}

module.exports = {
  encryptRefreshToken: encryptTenantSecret,
  decryptRefreshToken: decryptTenantSecret,
  buildGmailAuthorizeUrl,
  completeGmailOAuthCallback,
  resolveClientBaseUrlFromState,
  runGmailInboxSyncForMailbox,
  listGmailLabelsForMailbox,
  normalizeGmailSyncLabelIds,
  assertPersonalOwner,
  MAX_MESSAGES_PER_RUN,
  OAUTH_DEFAULT_SYNC_LABEL_IDS,
  LEGACY_DEFAULT_SYNC_LABEL_IDS
};
