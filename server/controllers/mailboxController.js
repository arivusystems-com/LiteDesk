/**
 * ============================================================================
 * Mailbox API (tenant-scoped)
 * ============================================================================
 */

const mongoose = require('mongoose');
const Mailbox = require('../models/Mailbox');
const { isTenantAdmin, canUserAccessMailboxThreads } = require('../services/mailboxAccessService');
const { loadWorkspaceThreadSummaries } = require('../services/workspaceThreadSummariesService');
const {
  buildGmailAuthorizeUrl,
  completeGmailOAuthCallback,
  resolveClientBaseUrlFromState,
  runGmailInboxSyncForMailbox,
  listGmailLabelsForMailbox,
  normalizeGmailSyncLabelIds,
  assertPersonalOwner
} = require('../services/mailboxGmailInboxSyncService');
const { getGmailOAuthAppCredentialsForServer } = require('../platform/communication/config/communicationConfigService');

function toId(value) {
  if (value == null) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(String(value))) return new mongoose.Types.ObjectId(String(value));
  return null;
}

function serializeMailbox(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  const hasGmailToken = Boolean(
    o.inboxProvider === 'google' && String(o.inboxSyncEncryptedRefreshToken || '').length > 0
  );
  return {
    id: String(o._id),
    organizationId: o.organizationId ? String(o.organizationId) : undefined,
    kind: o.kind,
    label: o.label,
    emailAddress: o.emailAddress || '',
    ownerUserId: o.ownerUserId ? String(o.ownerUserId) : null,
    memberUserIds: Array.isArray(o.memberUserIds) ? o.memberUserIds.map((id) => String(id)) : [],
    createdByUserId: o.createdByUserId ? String(o.createdByUserId) : undefined,
    status: o.status,
    syncStatus: o.syncStatus,
    inboxProvider: o.inboxProvider || 'none',
    gmailInboxSync: {
      connected: hasGmailToken,
      accountEmail: o.inboxSyncAccountEmail || '',
      lastSyncAt: o.lastInboxSyncAt || null,
      lastError: o.lastInboxSyncError ? String(o.lastInboxSyncError).slice(0, 500) : '',
      syncLabelIds: Array.isArray(o.gmailSyncLabelIds)
        ? o.gmailSyncLabelIds.map((x) => String(x).trim()).filter(Boolean)
        : []
    },
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
}

/**
 * GET /api/mailboxes
 * Lists group mailboxes for the org + the current user's personal mailbox (if any).
 */
async function listMailboxes(req, res) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;

    const personal = await Mailbox.find({ organizationId: orgId, kind: 'personal', ownerUserId: userId })
      .sort({ updatedAt: -1 })
      .lean();

    const groups = await Mailbox.find({ organizationId: orgId, kind: 'group' }).sort({ updatedAt: -1 }).lean();
    const groupsVisible = groups.filter((g) => canUserAccessMailboxThreads(req.user, g));

    const mailboxes = [
      ...personal.map((m) => serializeMailbox(m)),
      ...groupsVisible.map((m) => serializeMailbox(m))
    ];

    const canCreateGroup = isTenantAdmin(req.user);
    const canCreatePersonal = personal.length === 0;

    const gmailOAuthCheck = await getGmailOAuthAppCredentialsForServer(orgId);

    const includeThreadCounts = String(req.query.includeThreadCounts || '').toLowerCase() === 'true';
    const includeDoneForCounts = String(req.query.includeDone || '').toLowerCase() === 'true';
    let allMailThreadUnread = null;
    if (includeThreadCounts) {
      const summary = await loadWorkspaceThreadSummaries(req, '');
      if (summary.error) {
        allMailThreadUnread = 0;
        mailboxes.forEach((mb) => {
          mb.threadUnreadCount = 0;
        });
      } else {
        const threads = summary.threads;
        const base = includeDoneForCounts ? threads : threads.filter((t) => !t.done);
        const unreadList = base.filter((t) => t.unread);
        allMailThreadUnread = unreadList.length;
        const countByMb = new Map(mailboxes.map((m) => [m.id, 0]));
        for (const t of unreadList) {
          const mid = t.mailboxId ? String(t.mailboxId) : '';
          if (mid && countByMb.has(mid)) {
            countByMb.set(mid, countByMb.get(mid) + 1);
          }
        }
        mailboxes.forEach((mb) => {
          mb.threadUnreadCount = countByMb.get(mb.id) || 0;
        });
      }
    }

    return res.json({
      success: true,
      data: {
        mailboxes,
        flags: {
          canCreatePersonal,
          canCreateGroup,
          gmailOAuthAppConfigured: !gmailOAuthCheck.error
        },
        ...(includeThreadCounts && allMailThreadUnread != null ? { allMailThreadUnread } : {})
      }
    });
  } catch (err) {
    console.error('[mailboxController] listMailboxes:', err);
    return res.status(500).json({ success: false, message: 'Failed to list mailboxes' });
  }
}

/**
 * POST /api/mailboxes
 * Body: { kind, label, emailAddress?, memberUserIds? }
 */
async function createMailbox(req, res) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const { kind, label, emailAddress, memberUserIds } = req.body || {};

    if (kind !== 'personal' && kind !== 'group') {
      return res.status(400).json({ success: false, message: 'kind must be personal or group' });
    }
    if (!label || typeof label !== 'string' || !String(label).trim()) {
      return res.status(400).json({ success: false, message: 'label is required' });
    }

    if (kind === 'group' && !isTenantAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admins can create group mailboxes' });
    }

    if (kind === 'personal') {
      const existing = await Mailbox.findOne({ organizationId: orgId, kind: 'personal', ownerUserId: userId });
      if (existing) {
        return res.status(409).json({ success: false, message: 'You already have a personal mailbox' });
      }
      const doc = await Mailbox.create({
        organizationId: orgId,
        kind: 'personal',
        label: String(label).trim(),
        emailAddress: emailAddress ? String(emailAddress).trim().toLowerCase() : '',
        ownerUserId: userId,
        memberUserIds: [],
        createdByUserId: userId,
        status: 'draft',
        syncStatus: 'not_configured'
      });
      return res.status(201).json({ success: true, data: { mailbox: serializeMailbox(doc) } });
    }

    let members = [];
    if (Array.isArray(memberUserIds) && memberUserIds.length) {
      members = memberUserIds.map((id) => toId(id)).filter(Boolean);
    }

    const doc = await Mailbox.create({
      organizationId: orgId,
      kind: 'group',
      label: String(label).trim(),
      emailAddress: emailAddress ? String(emailAddress).trim().toLowerCase() : '',
      ownerUserId: null,
      memberUserIds: members,
      createdByUserId: userId,
      status: 'draft',
      syncStatus: 'not_configured'
    });
    return res.status(201).json({ success: true, data: { mailbox: serializeMailbox(doc) } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Mailbox already exists' });
    }
    console.error('[mailboxController] createMailbox:', err);
    return res.status(500).json({ success: false, message: 'Failed to create mailbox' });
  }
}

function canEditMailbox(user, mailboxLean) {
  if (!mailboxLean) return false;
  if (mailboxLean.kind === 'group') return isTenantAdmin(user);
  if (mailboxLean.kind === 'personal') {
    const owner = mailboxLean.ownerUserId && String(mailboxLean.ownerUserId);
    return owner === String(user._id) || isTenantAdmin(user);
  }
  return false;
}

/**
 * PATCH /api/mailboxes/:id
 */
async function updateMailbox(req, res) {
  try {
    const orgId = req.user.organizationId;
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid mailbox id' });
    }

    const mailbox = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    if (!mailbox) {
      return res.status(404).json({ success: false, message: 'Mailbox not found' });
    }

    if (!canEditMailbox(req.user, mailbox)) {
      return res.status(403).json({ success: false, message: 'Not allowed to update this mailbox' });
    }

    const { label, emailAddress, memberUserIds, status, syncStatus } = req.body || {};
    const updates = {};

    if (label !== undefined) {
      if (typeof label !== 'string' || !String(label).trim()) {
        return res.status(400).json({ success: false, message: 'label must be a non-empty string' });
      }
      updates.label = String(label).trim();
    }
    if (emailAddress !== undefined) {
      updates.emailAddress = emailAddress ? String(emailAddress).trim().toLowerCase() : '';
    }
    if (mailbox.kind === 'group' && memberUserIds !== undefined) {
      if (!Array.isArray(memberUserIds)) {
        return res.status(400).json({ success: false, message: 'memberUserIds must be an array' });
      }
      updates.memberUserIds = memberUserIds.map((x) => toId(x)).filter(Boolean);
    }
    if (status !== undefined) {
      if (status !== 'draft' && status !== 'active') {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      updates.status = status;
    }
    if (syncStatus !== undefined) {
      if (!['not_configured', 'pending', 'connected'].includes(syncStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid syncStatus' });
      }
      updates.syncStatus = syncStatus;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const doc = await Mailbox.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: updates }, { new: true });
    return res.json({ success: true, data: { mailbox: serializeMailbox(doc) } });
  } catch (err) {
    console.error('[mailboxController] updateMailbox:', err);
    return res.status(500).json({ success: false, message: 'Failed to update mailbox' });
  }
}

/**
 * GET /api/mailboxes/:id
 */
async function getMailbox(req, res) {
  try {
    const orgId = req.user.organizationId;
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid mailbox id' });
    }

    const mailbox = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    if (!mailbox) {
      return res.status(404).json({ success: false, message: 'Mailbox not found' });
    }

    if (!canUserAccessMailboxThreads(req.user, mailbox)) {
      return res.status(403).json({ success: false, message: 'Not allowed to view this mailbox' });
    }

    return res.json({ success: true, data: { mailbox: serializeMailbox(mailbox) } });
  } catch (err) {
    console.error('[mailboxController] getMailbox:', err);
    return res.status(500).json({ success: false, message: 'Failed to load mailbox' });
  }
}

/**
 * GET /api/mailboxes/inbox-sync/google/callback — Google redirects here (no JWT).
 *
 * Frontend base URL for the post-callback redirect is resolved up front so
 * every exit path (success, structured error, thrown error) lands on the same
 * host. Resolution order:
 *   1. process.env.CLIENT_URL — explicit operator override
 *   2. origin of the per-org Gmail redirect URI (Settings → Integrations →
 *      Email → Advanced, or GOOGLE_GMAIL_REDIRECT_URI env). Works for single-
 *      host deployments where the API and SPA share a hostname.
 *   3. http://localhost:5173 — dev fallback
 */
async function gmailOAuthCallback(req, res) {
  let base = String(process.env.CLIENT_URL || '').replace(/\/$/, '');
  if (!base) {
    const fromState = await resolveClientBaseUrlFromState(req.query.state).catch(() => '');
    base = (fromState || 'http://localhost:5173').replace(/\/$/, '');
  }

  try {
    const result = await completeGmailOAuthCallback({
      code: req.query.code,
      state: req.query.state
    });
    if (result.ok) {
      return res.redirect(`${base}/inbox?gmail=connected`);
    }
    const msg = encodeURIComponent(String(result.error || 'oauth_failed').slice(0, 800));
    return res.redirect(`${base}/inbox?gmail=error&message=${msg}`);
  } catch (err) {
    console.error('[mailboxController] gmailOAuthCallback:', err);
    return res.redirect(`${base}/inbox?gmail=error&message=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
}

/**
 * GET /api/mailboxes/:id/inbox-sync/google/start — returns Google OAuth URL (personal mailbox only).
 */
async function gmailInboxSyncGoogleStart(req, res) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid mailbox id' });
    }
    const mailbox = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    const ownerErr = assertPersonalOwner(mailbox, userId);
    if (ownerErr) {
      return res.status(403).json({ success: false, message: ownerErr });
    }
    const loginHintRaw =
      req.query?.login_hint != null
        ? req.query.login_hint
        : req.query?.loginHint != null
          ? req.query.loginHint
          : '';
    const loginHintSingle = Array.isArray(loginHintRaw) ? loginHintRaw[0] : loginHintRaw;
    const built = await buildGmailAuthorizeUrl({
      mailboxId: String(id),
      userId: String(userId),
      organizationId: String(orgId),
      loginHint: loginHintSingle
    });
    if (built.error) {
      return res.status(503).json({ success: false, message: built.error });
    }
    return res.json({ success: true, data: { url: built.url } });
  } catch (err) {
    console.error('[mailboxController] gmailInboxSyncGoogleStart:', err);
    return res.status(500).json({ success: false, message: 'Failed to start Gmail OAuth' });
  }
}

/**
 * POST /api/mailboxes/:id/inbox-sync/run — pull recent INBOX messages from Gmail into workspace threads.
 */
async function gmailInboxSyncRun(req, res) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid mailbox id' });
    }
    const mailbox = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    const ownerErr = assertPersonalOwner(mailbox, userId);
    if (ownerErr) {
      return res.status(403).json({ success: false, message: ownerErr });
    }
    if (!mailbox || mailbox.inboxProvider !== 'google' || !mailbox.inboxSyncEncryptedRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail inbox is not connected for this mailbox. Complete OAuth first.'
      });
    }
    const result = await runGmailInboxSyncForMailbox(mailbox);
    if (result.error) {
      await Mailbox.updateOne(
        { _id: id, organizationId: orgId },
        {
          $set: {
            lastInboxSyncError: String(result.error).slice(0, 2000),
            lastInboxSyncAt: new Date()
          }
        }
      );
      return res.status(502).json({
        success: false,
        message: result.error,
        data: { imported: result.imported, skipped: result.skipped }
      });
    }
    return res.json({
      success: true,
      data: { imported: result.imported, skipped: result.skipped }
    });
  } catch (err) {
    const apiMsg = err?.response?.data?.error?.message;
    const displayMsg = apiMsg || err.message || 'Gmail sync failed';
    console.error('[mailboxController] gmailInboxSyncRun:', displayMsg, err.stack || err);
    const orgId = req.user.organizationId;
    const id = toId(req.params.id);
    if (id) {
      await Mailbox.updateOne(
        { _id: id, organizationId: orgId },
        {
          $set: {
            lastInboxSyncError: String(displayMsg).slice(0, 2000),
            lastInboxSyncAt: new Date()
          }
        }
      );
    }
    return res.status(500).json({
      success: false,
      message: displayMsg
    });
  }
}

/**
 * GET /api/mailboxes/:id/inbox-sync/google/labels — list Gmail labels + current sync selection (owner).
 */
async function listGmailInboxSyncLabels(req, res) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid mailbox id' });
    }
    const mailbox = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    const ownerErr = assertPersonalOwner(mailbox, userId);
    if (ownerErr) {
      return res.status(403).json({ success: false, message: ownerErr });
    }
    if (!mailbox || mailbox.inboxProvider !== 'google' || !mailbox.inboxSyncEncryptedRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail inbox is not connected for this mailbox.'
      });
    }
    const result = await listGmailLabelsForMailbox(mailbox);
    if (result.error) {
      return res.status(502).json({ success: false, message: result.error });
    }
    const selected =
      Array.isArray(mailbox.gmailSyncLabelIds) && mailbox.gmailSyncLabelIds.length > 0
        ? normalizeGmailSyncLabelIds(mailbox.gmailSyncLabelIds)
        : normalizeGmailSyncLabelIds([]);
    return res.json({
      success: true,
      data: {
        labels: result.labels,
        selectedLabelIds: selected
      }
    });
  } catch (err) {
    console.error('[mailboxController] listGmailInboxSyncLabels:', err);
    return res.status(500).json({ success: false, message: 'Failed to list Gmail labels' });
  }
}

/**
 * PATCH /api/mailboxes/:id/inbox-sync/google/sync-labels
 * Body: { labelIds: string[] } — which Gmail labels/folders to import on sync.
 */
async function patchGmailInboxSyncSyncLabels(req, res) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid mailbox id' });
    }
    const mailbox = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    const ownerErr = assertPersonalOwner(mailbox, userId);
    if (ownerErr) {
      return res.status(403).json({ success: false, message: ownerErr });
    }
    if (!mailbox || mailbox.inboxProvider !== 'google' || !mailbox.inboxSyncEncryptedRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail inbox is not connected for this mailbox.'
      });
    }
    const raw = req.body?.labelIds;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ success: false, message: 'labelIds must be a non-empty array' });
    }
    if (raw.length > 40) {
      return res.status(400).json({ success: false, message: 'Too many labels selected' });
    }

    const listResult = await listGmailLabelsForMailbox(mailbox);
    if (listResult.error) {
      return res.status(502).json({ success: false, message: listResult.error });
    }
    const allowed = new Set((listResult.labels || []).map((l) => l.id));
    const requested = normalizeGmailSyncLabelIds(raw).filter((lid) => allowed.has(lid));
    const finalIds = requested.length ? requested : ['INBOX'];

    await Mailbox.updateOne(
      { _id: id, organizationId: orgId },
      { $set: { gmailSyncLabelIds: finalIds } }
    );
    const updated = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    return res.json({
      success: true,
      data: { mailbox: serializeMailbox(updated), selectedLabelIds: finalIds }
    });
  } catch (err) {
    console.error('[mailboxController] patchGmailInboxSyncSyncLabels:', err);
    return res.status(500).json({ success: false, message: 'Failed to save sync folders' });
  }
}

/**
 * POST /api/mailboxes/:id/inbox-sync/google/disconnect
 */
async function gmailInboxSyncDisconnect(req, res) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid mailbox id' });
    }
    const mailbox = await Mailbox.findOne({ _id: id, organizationId: orgId }).lean();
    const ownerErr = assertPersonalOwner(mailbox, userId);
    if (ownerErr) {
      return res.status(403).json({ success: false, message: ownerErr });
    }
    await Mailbox.updateOne(
      { _id: id, organizationId: orgId },
      {
        $set: {
          inboxProvider: 'none',
          inboxSyncEncryptedRefreshToken: '',
          inboxSyncAccountEmail: '',
          gmailHistoryId: '',
          gmailSyncLabelIds: [],
          lastInboxSyncError: '',
          syncStatus: 'not_configured'
        }
      }
    );
    return res.json({ success: true, data: { disconnected: true } });
  } catch (err) {
    console.error('[mailboxController] gmailInboxSyncDisconnect:', err);
    return res.status(500).json({ success: false, message: 'Failed to disconnect Gmail' });
  }
}

module.exports = {
  listMailboxes,
  createMailbox,
  updateMailbox,
  getMailbox,
  gmailOAuthCallback,
  gmailInboxSyncGoogleStart,
  gmailInboxSyncRun,
  listGmailInboxSyncLabels,
  patchGmailInboxSyncSyncLabels,
  gmailInboxSyncDisconnect
};
