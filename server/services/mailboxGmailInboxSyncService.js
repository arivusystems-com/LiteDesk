'use strict';

/**
 * Gmail inbox sync for personal and shared (group) mailboxes (Phase 5 + R1).
 * Uses OAuth2 refresh token (encrypted on Mailbox) + Gmail API to fetch messages
 * and ingests them via the trusted workspace inbound path.
 */

const jwt = require('jsonwebtoken');
const Communication = require('../models/Communication');
const Mailbox = require('../models/Mailbox');
const Organization = require('../models/Organization');
const { processRawInbound, InboundDispatchError } = require('../platform/communication/inbound/inboundDispatcher');
const { getGmailOAuthAppCredentialsForServer } = require('../platform/communication/config/communicationConfigService');
const { encryptTenantSecret, decryptTenantSecret } = require('../utils/tenantSecretCrypto');
const { runWithOrganizationTenantContext } = require('../utils/organizationTenantContext');
const {
  canManageGmailInboxSync,
  canUserAccessMailboxThreads,
  assertGmailSyncManageAccess,
  assertGmailSyncRunAccess
} = require('./mailboxAccessService');
const User = require('../models/User');
const { isMailboxGmailSmtpReady } = require('./mailboxGmailSmtpService');

const MAX_MESSAGES_PER_RUN_DEFAULT = 40;
const MAX_SYNC_LABELS = 24;
/** When the mailbox has no `gmailSyncLabelIds` yet (legacy rows), sync INBOX only. */
const LEGACY_DEFAULT_SYNC_LABEL_IDS = ['INBOX'];
/** Applied on first successful Gmail OAuth for a personal mailbox. */
const OAUTH_DEFAULT_SYNC_LABEL_IDS = ['INBOX', 'STARRED', 'IMPORTANT'];

/** OAuth scopes for inbox sync + provider-native send (R2). Reconnect required after scope change. */
const GMAIL_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

function normalizeGmailSyncLabelIds(raw) {
  const list = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : [];
  const uniq = [...new Set(list)];
  const safe = uniq
    .filter((id) => /^[A-Za-z0-9_]+$/.test(id) && id.length <= 128)
    .slice(0, MAX_SYNC_LABELS);
  return safe.length ? safe : [...LEGACY_DEFAULT_SYNC_LABEL_IDS];
}

function getMaxMessagesPerRun(mailboxLean) {
  const mbCap = Number(mailboxLean?.gmailSyncMaxMessagesPerRun);
  if (Number.isFinite(mbCap) && mbCap > 0) {
    return Math.min(200, Math.floor(mbCap));
  }
  const envCap = parseInt(process.env.GMAIL_INBOX_SYNC_MAX_MESSAGES_PER_RUN || '', 10);
  if (Number.isFinite(envCap) && envCap > 0) {
    return Math.min(200, envCap);
  }
  return MAX_MESSAGES_PER_RUN_DEFAULT;
}

function formatGmailSyncError(err) {
  const apiMsg = err?.response?.data?.error?.message;
  if (apiMsg) return String(apiMsg);
  if (err instanceof InboundDispatchError) {
    return `${err.stage || 'inbound'}: ${err.message}`;
  }
  return String(err?.message || err);
}

/**
 * List recent message ids for any of the selected labels (union). Uses labelIds[] per label — more reliable than q OR.
 */
async function listMessageIdsForSyncLabels(gmail, syncLabelIds, maxResults = MAX_MESSAGES_PER_RUN_DEFAULT) {
  const ids = new Set();
  const labels = normalizeGmailSyncLabelIds(syncLabelIds);
  for (const labelId of labels) {
    let pageToken;
    do {
      const res = await gmail.users.messages.list({
        userId: 'me',
        labelIds: [labelId],
        maxResults: Math.min(50, Math.max(1, maxResults - ids.size)),
        pageToken: pageToken || undefined
      });
      for (const m of res.data.messages || []) {
        if (m?.id) ids.add(String(m.id));
        if (ids.size >= maxResults) break;
      }
      pageToken = ids.size >= maxResults ? null : res.data.nextPageToken || null;
    } while (pageToken && ids.size < maxResults);
    if (ids.size >= maxResults) break;
  }
  return [...ids];
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
    scope: GMAIL_OAUTH_SCOPES,
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

  return runWithOrganizationTenantContext(organizationId, async () => {
    const mb = await Mailbox.findOne({ _id: mailboxId, organizationId }).lean();
    if (!mb) {
      return { ok: false, error: 'Mailbox not found' };
    }

    const actor = await User.findById(userId).select('role isOwner _id').lean();
    if (!actor || !canManageGmailInboxSync(actor, mb)) {
      return {
        ok: false,
        error:
          mb.kind === 'group'
            ? 'Only organization admins can connect Gmail for shared mailboxes'
            : 'Mailbox not found or not owned by you'
      };
    }

    if (mb.kind === 'group' && mb.emailAddress) {
      const expected = String(mb.emailAddress).trim().toLowerCase();
      if (expected && accountEmail && accountEmail !== expected) {
        return {
          ok: false,
          error: `Google account ${accountEmail} does not match shared mailbox address ${expected}. Sign in with the shared inbox account or update the mailbox address.`
        };
      }
    }

    const nextEmail = accountEmail || mb.emailAddress || '';
    const defaultLabels = mb.kind === 'group' ? ['INBOX'] : OAUTH_DEFAULT_SYNC_LABEL_IDS;

    await Mailbox.updateOne(
      { _id: mb._id },
      {
        $set: {
          inboxProvider: 'google',
          outboundChannel: 'gmail_api',
          inboxSyncEncryptedRefreshToken: encryptTenantSecret(tokens.refresh_token),
          inboxSyncAccountEmail: accountEmail,
          gmailHistoryId: prof.data.historyId ? String(prof.data.historyId) : '',
          syncStatus: 'connected',
          status: 'active',
          lastInboxSyncError: '',
          emailAddress: nextEmail,
          gmailSyncLabelIds:
            Array.isArray(mb.gmailSyncLabelIds) && mb.gmailSyncLabelIds.length > 0
              ? mb.gmailSyncLabelIds
              : defaultLabels
        }
      }
    );

    const connectedMb = await Mailbox.findOne({ _id: mb._id, organizationId }).lean();
    if (connectedMb) {
      const { registerGmailWatchForMailbox } = require('./gmailWatchService');
      void registerGmailWatchForMailbox(connectedMb).catch((watchErr) => {
        console.warn('[gmailOAuth] watch registration failed:', watchErr?.message || watchErr);
      });
    }

    return { ok: true, accountEmail };
  });
}

async function listMessageIdsSinceHistory(gmail, historyId, maxResults = MAX_MESSAGES_PER_RUN_DEFAULT) {
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
    } while (nextPageToken && ids.length < maxResults);
  } catch (err) {
    const code = err?.code || err?.response?.status;
    if (code === 404) {
      return { ids: [], latestHistoryId: '', resetHistory: true };
    }
    throw err;
  }
  return { ids, latestHistoryId, resetHistory: false };
}

function resolveMailboxRefreshToken(mailboxLean) {
  const enc = String(mailboxLean?.inboxSyncEncryptedRefreshToken || '').trim();
  if (!enc) {
    return { refresh: null, error: 'GMAIL_REFRESH_TOKEN_MISSING' };
  }
  const secret = String(process.env.MAILBOX_OAUTH_SECRET || process.env.JWT_SECRET || '').trim();
  if (!secret) {
    return { refresh: null, error: 'GMAIL_ENCRYPTION_SECRET_MISSING' };
  }
  const refresh = decryptTenantSecret(enc);
  if (!refresh) {
    return { refresh: null, error: 'GMAIL_REFRESH_TOKEN_DECRYPT_FAILED' };
  }
  return { refresh, error: null };
}

function humanizeRefreshTokenError(code) {
  switch (code) {
    case 'GMAIL_REFRESH_TOKEN_MISSING':
      return 'Gmail is not connected for this mailbox. Connect Gmail in Inbox settings.';
    case 'GMAIL_REFRESH_TOKEN_DECRYPT_FAILED':
      return 'Stored Gmail credentials could not be read. Disconnect and reconnect Gmail for this mailbox (or verify JWT_SECRET has not changed since connect).';
    case 'GMAIL_ENCRYPTION_SECRET_MISSING':
      return 'Server is missing JWT_SECRET (required to decrypt mailbox OAuth tokens).';
    default:
      return 'Missing or invalid stored refresh token';
  }
}

function isGmailMailboxReady(mailboxLean) {
  if (!mailboxLean || mailboxLean.inboxProvider !== 'google') return false;
  return Boolean(resolveMailboxRefreshToken(mailboxLean).refresh);
}

/**
 * @param {object} mailboxLean
 * @returns {Promise<{ gmail?: import('googleapis').gmail_v1.Gmail, error?: string }>}
 */
async function getGmailApiClientForMailbox(mailboxLean) {
  const orgId = mailboxLean.organizationId;
  const tokenResult = resolveMailboxRefreshToken(mailboxLean);
  if (!tokenResult.refresh) {
    return {
      error: humanizeRefreshTokenError(tokenResult.error),
      code: tokenResult.error
    };
  }
  const refresh = tokenResult.refresh;
  const oauthClient = await getOAuthClient(orgId);
  if (oauthClient.error) return { error: oauthClient.error };
  const { google, oauth2Client } = oauthClient;
  oauth2Client.setCredentials({ refresh_token: refresh });
  return { gmail: google.gmail({ version: 'v1', auth: oauth2Client }) };
}

/**
 * Default connected Gmail mailbox for outbound (personal first, then accessible group).
 * @param {import('mongoose').Types.ObjectId | string} organizationId
 * @param {object} user — req.user shape
 */
function pickFirstSendableMailbox(user, mailboxes) {
  const list = Array.isArray(mailboxes) ? mailboxes : [];
  const apiReady = list.filter((m) => isGmailMailboxReady(m) && canUserAccessMailboxThreads(user, m));
  if (apiReady.length) return apiReady[0];
  const smtpReady = list.filter(
    (m) => isMailboxGmailSmtpReady(m) && canUserAccessMailboxThreads(user, m)
  );
  return smtpReady[0] || null;
}

async function resolveDefaultGmailMailboxForUser(organizationId, user) {
  if (!organizationId || !user) return null;

  const personal = await Mailbox.find({
    organizationId,
    kind: 'personal',
    ownerUserId: user._id,
    $or: [
      { inboxSyncEncryptedRefreshToken: { $exists: true, $nin: ['', null] } },
      { smtpOutboundEncryptedAppPassword: { $exists: true, $nin: ['', null] } }
    ]
  }).lean();

  const personalPick = pickFirstSendableMailbox(user, personal);
  if (personalPick) return personalPick;

  const groups = await Mailbox.find({
    organizationId,
    kind: 'group',
    $or: [
      { inboxSyncEncryptedRefreshToken: { $exists: true, $nin: ['', null] } },
      { smtpOutboundEncryptedAppPassword: { $exists: true, $nin: ['', null] } }
    ]
  }).lean();

  return pickFirstSendableMailbox(user, groups);
}

async function countSendableGmailMailboxesForUser(organizationId, user) {
  const all = await Mailbox.find({
    organizationId,
    inboxProvider: 'google',
    inboxSyncEncryptedRefreshToken: { $exists: true, $nin: ['', null] }
  }).lean();
  return all.filter((m) => isGmailMailboxReady(m) && canUserAccessMailboxThreads(user, m)).length;
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
  const tokenResult = resolveMailboxRefreshToken(mailboxLean);
  if (!tokenResult.refresh) {
    return { error: humanizeRefreshTokenError(tokenResult.error), code: tokenResult.error };
  }
  const oauthClient = await getOAuthClient(orgId);
  if (oauthClient.error) return { error: oauthClient.error };
  const { google, oauth2Client } = oauthClient;
  oauth2Client.setCredentials({ refresh_token: tokenResult.refresh });
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
        format: 'minimal'
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
  try {
    return await runGmailInboxSyncForMailboxInner(mailboxLean);
  } catch (err) {
    return { imported: 0, skipped: 0, error: formatGmailSyncError(err) };
  }
}

async function runGmailInboxSyncForMailboxInner(mailboxLean) {
  const orgId = mailboxLean.organizationId;
  const mailboxId = mailboxLean._id;
  const tokenResult = resolveMailboxRefreshToken(mailboxLean);
  if (!tokenResult.refresh) {
    return {
      imported: 0,
      skipped: 0,
      error: humanizeRefreshTokenError(tokenResult.error),
      code: tokenResult.error
    };
  }

  const oauthClient = await getOAuthClient(orgId);
  if (oauthClient.error) return { imported: 0, skipped: 0, error: oauthClient.error };
  const { google, oauth2Client } = oauthClient;

  oauth2Client.setCredentials({ refresh_token: tokenResult.refresh });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const maxPerRun = getMaxMessagesPerRun(mailboxLean);
  const syncLabelIds =
    Array.isArray(mailboxLean.gmailSyncLabelIds) && mailboxLean.gmailSyncLabelIds.length > 0
      ? mailboxLean.gmailSyncLabelIds
      : LEGACY_DEFAULT_SYNC_LABEL_IDS;

  let messageIds = [];
  let storedHistory = mailboxLean.gmailHistoryId ? String(mailboxLean.gmailHistoryId) : '';

  if (storedHistory) {
    const hist = await listMessageIdsSinceHistory(gmail, storedHistory, maxPerRun);
    if (hist.resetHistory) {
      storedHistory = '';
    } else {
      const rawIds = [...new Set(hist.ids)].slice(0, maxPerRun);
      messageIds = await filterMessageIdsBySyncLabels(gmail, rawIds, syncLabelIds);
    }
  }

  if (!messageIds.length) {
    messageIds = await listMessageIdsForSyncLabels(gmail, syncLabelIds, maxPerRun);
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
    const gmailLabelIds = (full.data.labelIds || []).map((x) => String(x).trim()).filter(Boolean);
    const providerThreadId = full.data.threadId ? String(full.data.threadId).trim().slice(0, 128) : '';

    try {
      await processRawInbound({
        rawMime,
        headerOrganizationId: null,
        source: 'gmail-mailbox-sync',
        forcedWorkspaceInbox: {
          organizationId: orgId,
          mailboxId,
          providerMessageKey,
          providerThreadId: providerThreadId || undefined,
          gmailLabelIds
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

  if (imported > 0) {
    const { emitInboxUpdated } = require('./inboxRealtimeService');
    void emitInboxUpdated({
      organizationId: orgId,
      mailboxId,
      reason: 'sync',
      meta: { imported, skipped }
    });
  }

  return { imported, skipped };
}

/** @deprecated Use mailboxAccessService.assertGmailSyncManageAccess */
function assertPersonalOwner(mailbox, user) {
  return assertGmailSyncManageAccess(mailbox, user);
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
  getMaxMessagesPerRun,
  assertPersonalOwner,
  assertGmailSyncManageAccess,
  assertGmailSyncRunAccess,
  isGmailMailboxReady,
  resolveMailboxRefreshToken,
  humanizeRefreshTokenError,
  getGmailApiClientForMailbox,
  resolveDefaultGmailMailboxForUser,
  countSendableGmailMailboxesForUser,
  runWithOrganizationTenantContext,
  GMAIL_OAUTH_SCOPES,
  MAX_MESSAGES_PER_RUN: MAX_MESSAGES_PER_RUN_DEFAULT,
  OAUTH_DEFAULT_SYNC_LABEL_IDS,
  LEGACY_DEFAULT_SYNC_LABEL_IDS
};
