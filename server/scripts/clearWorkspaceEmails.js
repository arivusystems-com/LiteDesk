#!/usr/bin/env node
'use strict';

/**
 * Clear email data for inbox empty-state / UI testing.
 *
 * Deletes (per tenant DB):
 *   - Communication documents (emails)
 *   - CommunicationEvent rows for those communications
 *   - ThreadView + CommunicationThreadMeta for affected thread ids
 *   - Optional: communication attachment files on disk
 *
 * Does NOT delete Mailboxes or Gmail OAuth tokens unless --disconnect-gmail is passed.
 *
 * Usage:
 *   node scripts/clearWorkspaceEmails.js --dry-run
 *   node scripts/clearWorkspaceEmails.js --confirm
 *   node scripts/clearWorkspaceEmails.js --scope=all --confirm
 *
 * With no --org-id, clears every active tenant that has a database (typical local dev).
 *
 * Options:
 *   --org-id=<id>           Limit to one tenant organization _id
 *   --all-tenants           Same as default when --org-id is omitted
 *   --scope=workspace       Only workspace inbox mail (default)
 *   --scope=all             All email communications (records + workspace)
 *   --dry-run               Print counts only; no deletes
 *   --confirm               Required to perform deletes (except with --dry-run)
 *   --delete-attachments    Remove attachment files from server/uploads
 *   --disconnect-gmail      Clear Gmail tokens on personal mailboxes (stops re-import)
 *   --reset-gmail-cursor    Clear gmailHistoryId (next sync may re-import everything)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Communication = require('../models/Communication');
const CommunicationEvent = require('../models/CommunicationEvent');
const CommunicationThreadMeta = require('../models/CommunicationThreadMeta');
const ThreadView = require('../models/ThreadView');
const Mailbox = require('../models/Mailbox');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const { uploadsDir } = require('../middleware/uploadMiddleware');

function parseArgs(argv) {
  const out = {
    orgId: '',
    allTenants: false,
    scope: 'workspace',
    dryRun: false,
    confirm: false,
    deleteAttachments: false,
    disconnectGmail: false,
    resetGmailCursor: false
  };
  for (const arg of argv) {
    if (arg === '--all-tenants') out.allTenants = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--confirm') out.confirm = true;
    else if (arg === '--delete-attachments') out.deleteAttachments = true;
    else if (arg === '--disconnect-gmail') out.disconnectGmail = true;
    else if (arg === '--reset-gmail-cursor') out.resetGmailCursor = true;
    else if (arg.startsWith('--org-id=')) out.orgId = arg.slice('--org-id='.length).trim();
    else if (arg.startsWith('--scope=')) {
      const s = arg.slice('--scope='.length).trim();
      if (s === 'workspace' || s === 'all') out.scope = s;
      else throw new Error(`Invalid --scope=${s} (use workspace or all)`);
    }
  }
  return out;
}

function buildEmailQuery(organizationId, scope) {
  const base = {
    organizationId: new mongoose.Types.ObjectId(String(organizationId)),
    kind: 'email'
  };
  if (scope === 'workspace') {
    base['relatedTo.moduleKey'] = 'workspace';
  }
  return base;
}

async function collectThreadIds(communications) {
  const set = new Set();
  for (const c of communications) {
    const tid = c.threadId != null ? String(c.threadId) : String(c._id);
    if (tid) set.add(tid);
  }
  return [...set];
}

function deleteAttachmentFiles(communications) {
  let removed = 0;
  let failed = 0;
  for (const c of communications) {
    for (const att of c.attachments || []) {
      const rel = att?.storagePath;
      if (!rel) continue;
      const full = path.join(uploadsDir, rel);
      try {
        if (fs.existsSync(full)) {
          fs.unlinkSync(full);
          removed += 1;
        }
      } catch {
        failed += 1;
      }
    }
  }
  return { removed, failed };
}

async function clearTenantEmails(tenant, opts) {
  const masterDbName = process.env.MASTER_DB_NAME || 'arivu_master';
  let dbName = tenant.database?.name;
  let conn;

  if (dbName) {
    conn = await dbConnectionManager.getOrganizationConnection(dbName);
    if (conn.readyState !== 1) await conn.asPromise();
  } else {
    dbName = masterDbName;
    conn = await dbConnectionManager.getOrganizationConnection(masterDbName);
    if (conn.readyState !== 1) await conn.asPromise();
    console.warn(`  ${tenant.name || tenant._id}: no database.name — using master DB (${masterDbName})`);
  }

  return runWithTenantContext(
    { organizationId: tenant._id, connection: conn, databaseName: dbName },
    async () => {
      const orgId = tenant._id;
      const emailQuery = buildEmailQuery(orgId, opts.scope);

      const communications = await Communication.find(emailQuery)
        .select('_id threadId attachments')
        .lean();

      const commIds = communications.map((c) => c._id);
      const threadIds = await collectThreadIds(communications);

      const eventQuery = {
        organizationId: orgId,
        communicationId: { $in: commIds }
      };

      const [eventCount, threadViewCount, threadMetaCount] = await Promise.all([
        CommunicationEvent.countDocuments(eventQuery),
        threadIds.length
          ? ThreadView.countDocuments({ organizationId: orgId, threadId: { $in: threadIds } })
          : 0,
        threadIds.length
          ? CommunicationThreadMeta.countDocuments({
              organizationId: orgId,
              threadId: { $in: threadIds }
            })
          : 0
      ]);

      const summary = {
        tenantId: String(orgId),
        tenantName: tenant.name || '',
        scope: opts.scope,
        communications: communications.length,
        events: eventCount,
        threadViews: threadViewCount,
        threadMeta: threadMetaCount,
        threadIds: threadIds.length
      };

      if (opts.dryRun || !opts.confirm) {
        return summary;
      }

      if (opts.deleteAttachments && communications.length) {
        summary.attachmentsRemoved = deleteAttachmentFiles(communications).removed;
      }

      if (commIds.length) {
        await CommunicationEvent.deleteMany(eventQuery);
      }
      if (threadIds.length) {
        await ThreadView.deleteMany({ organizationId: orgId, threadId: { $in: threadIds } });
        await CommunicationThreadMeta.deleteMany({
          organizationId: orgId,
          threadId: { $in: threadIds }
        });
      }
      if (commIds.length) {
        await Communication.deleteMany({ _id: { $in: commIds } });
      }

      if (opts.disconnectGmail || opts.resetGmailCursor) {
        const mbUpdate = {};
        if (opts.disconnectGmail) {
          mbUpdate.inboxProvider = 'none';
          mbUpdate.inboxSyncEncryptedRefreshToken = '';
          mbUpdate.inboxSyncAccountEmail = '';
          mbUpdate.syncStatus = 'not_configured';
          mbUpdate.gmailHistoryId = '';
          mbUpdate.lastInboxSyncAt = null;
          mbUpdate.lastInboxSyncError = '';
        } else if (opts.resetGmailCursor) {
          mbUpdate.gmailHistoryId = '';
        }
        const mbRes = await Mailbox.updateMany(
          { organizationId: orgId, kind: 'personal', inboxProvider: 'google' },
          { $set: mbUpdate }
        );
        summary.mailboxesUpdated = mbRes.modifiedCount;
      }

      return summary;
    }
  );
}

async function resolveTenants(opts) {
  if (opts.orgId) {
    if (!mongoose.Types.ObjectId.isValid(opts.orgId)) {
      throw new Error(`Invalid --org-id=${opts.orgId}`);
    }
    const org = await Organization.findById(opts.orgId).select('_id name database.name isTenant').lean();
    if (!org) throw new Error(`Organization not found: ${opts.orgId}`);
    if (!org.database?.name) throw new Error(`Organization ${opts.orgId} has no tenant database`);
    return [org];
  }

  let tenants = await Organization.find({
    isTenant: true,
    isActive: true,
    'database.name': { $exists: true, $nin: [null, ''] }
  })
    .select('_id name database.name')
    .lean();

  if (tenants.length === 0) {
    tenants = await Organization.find({ isTenant: true, isActive: true })
      .select('_id name database.name isTenant')
      .lean();
  }

  if (tenants.length === 0) {
    throw new Error(
      'No tenant organizations with a database found. Is MongoDB running and seeded?'
    );
  }

  return tenants;
}

function printSummary(summary) {
  console.log(
    `  communications=${summary.communications} events=${summary.events} ` +
      `threadViews=${summary.threadViews} threadMeta=${summary.threadMeta} ` +
      `(scope=${summary.scope})`
  );
  if (summary.attachmentsRemoved != null) {
    console.log(`  attachment files removed: ${summary.attachmentsRemoved}`);
  }
  if (summary.mailboxesUpdated != null) {
    console.log(`  personal mailboxes updated: ${summary.mailboxesUpdated}`);
  }
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
  if (!mongoUri) {
    console.error('MONGODB_URI / MONGO_URI is required.');
    process.exit(1);
  }

  const masterDbName = process.env.MASTER_DB_NAME || 'arivu_master';
  const [uriWithoutQuery, queryPart] = mongoUri.split('?');
  const query = queryPart ? `?${queryPart}` : '';
  const baseUri = uriWithoutQuery.split('/').slice(0, -1).join('/');
  const masterUri = `${baseUri}/${masterDbName}${query}`;

  if (!opts.dryRun && !opts.confirm) {
    console.error(
      'Refusing to delete without --confirm. Use --dry-run to preview counts first.\n\n' +
        'Example:\n' +
        '  node scripts/clearWorkspaceEmails.js --dry-run\n' +
        '  node scripts/clearWorkspaceEmails.js --confirm --disconnect-gmail'
    );
    process.exit(1);
  }

  await mongoose.connect(masterUri);
  console.log(`Connected to master DB: ${masterDbName}`);

  try {
    const tenants = await resolveTenants(opts);
    console.log(
      `\n${opts.dryRun ? '[DRY RUN] ' : ''}Clear emails — scope=${opts.scope}, tenants=${tenants.length}\n`
    );

    if (!opts.dryRun && opts.confirm) {
      console.log(
        'Tip: add --disconnect-gmail to avoid Gmail background sync refilling the inbox immediately.\n'
      );
    }

    for (const tenant of tenants) {
      console.log(`Tenant: ${tenant.name || tenant._id} (${tenant._id})`);
      const summary = await clearTenantEmails(tenant, opts);
      if (summary) printSummary(summary);
    }

    console.log(opts.dryRun ? '\nDry run complete. Re-run with --confirm to delete.' : '\nDone.');
  } finally {
    await mongoose.connection.close();
  }
}

run().catch(async (err) => {
  console.error('clearWorkspaceEmails failed:', err);
  try {
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
