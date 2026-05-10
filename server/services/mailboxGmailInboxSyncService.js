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

function normalizeOAuthLoginHint(raw) {
  const s = String(raw || '').trim().slice(0, 320);
  if (!s || !s.includes('@')) return '';
  return s;
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
        emailAddress: accountEmail || mb.emailAddress
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

  let messageIds = [];
  let storedHistory = mailboxLean.gmailHistoryId ? String(mailboxLean.gmailHistoryId) : '';

  if (storedHistory) {
    const hist = await listMessageIdsSinceHistory(gmail, storedHistory);
    if (hist.resetHistory) {
      storedHistory = '';
    } else {
      messageIds = [...new Set(hist.ids)].slice(0, MAX_MESSAGES_PER_RUN);
    }
  }

  if (!messageIds.length) {
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: MAX_MESSAGES_PER_RUN,
      q: 'in:inbox'
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
  runGmailInboxSyncForMailbox,
  assertPersonalOwner,
  MAX_MESSAGES_PER_RUN
};
