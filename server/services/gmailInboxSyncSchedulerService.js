'use strict';

/**
 * Cross-tenant scheduled Gmail inbox sync (Phase 5).
 * Reuses the same pipeline as POST /api/mailboxes/:id/inbox-sync/run but iterates
 * all tenant DBs and eligible personal mailboxes.
 */

const Organization = require('../models/Organization');
const Mailbox = require('../models/Mailbox');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const { runGmailInboxSyncForMailbox } = require('./mailboxGmailInboxSyncService');

const DEBUG = process.env.GMAIL_INBOX_SYNC_SCHEDULER_DEBUG === 'true';

function minIntervalMs() {
  const mins = Math.max(1, parseInt(process.env.GMAIL_INBOX_SYNC_MIN_INTERVAL_MINUTES || '4', 10));
  return mins * 60 * 1000;
}

/**
 * @returns {Promise<{ tenantsProcessed: number, mailboxesAttempted: number, mailboxesSkippedThrottle: number, importedTotal: number, errors: number }>}
 */
async function tickScheduledGmailInboxSync() {
  const throttleCutoff = new Date(Date.now() - minIntervalMs());

  const tenants = await Organization.find({
    isTenant: true,
    isActive: true,
    'database.name': { $exists: true, $nin: [null, ''] }
  })
    .select('_id database.name')
    .lean();

  let tenantsProcessed = 0;
  let mailboxesAttempted = 0;
  let mailboxesSkippedThrottle = 0;
  let importedTotal = 0;
  let errors = 0;

  for (const tenant of tenants) {
    const dbName = tenant.database?.name;
    if (!dbName) continue;

    let conn;
    try {
      conn = await dbConnectionManager.getOrganizationConnection(dbName);
      if (conn.readyState !== 1) await conn.asPromise();
    } catch (err) {
      errors += 1;
      console.error(`[gmailInboxSyncScheduler] tenant ${tenant._id} DB connect failed:`, err.message);
      continue;
    }

    try {
      await runWithTenantContext(
        { organizationId: tenant._id, connection: conn, databaseName: dbName },
        async () => {
          const mailboxes = await Mailbox.find({
            kind: 'personal',
            inboxProvider: 'google',
            inboxSyncEncryptedRefreshToken: { $exists: true, $nin: [null, ''] }
          })
            .select('_id organizationId inboxSyncEncryptedRefreshToken gmailHistoryId gmailSyncLabelIds lastInboxSyncAt')
            .lean();

          for (const mb of mailboxes) {
            if (!mb.inboxSyncEncryptedRefreshToken) continue;
            if (mb.lastInboxSyncAt && new Date(mb.lastInboxSyncAt) > throttleCutoff) {
              mailboxesSkippedThrottle += 1;
              continue;
            }

            mailboxesAttempted += 1;
            try {
              const result = await runGmailInboxSyncForMailbox(mb);
              if (result.error) {
                await Mailbox.updateOne(
                  { _id: mb._id, organizationId: mb.organizationId },
                  {
                    $set: {
                      lastInboxSyncError: String(result.error).slice(0, 2000),
                      lastInboxSyncAt: new Date()
                    }
                  }
                );
              }
              importedTotal += result.imported || 0;
              if (DEBUG && (result.imported > 0 || result.skipped > 0 || result.error)) {
                console.log(`[gmailInboxSyncScheduler] org=${tenant._id} mailbox=${mb._id}`, result);
              }
            } catch (err) {
              errors += 1;
              console.error(
                `[gmailInboxSyncScheduler] org=${tenant._id} mailbox=${mb._id}:`,
                err.message
              );
              try {
                await Mailbox.updateOne(
                  { _id: mb._id, organizationId: mb.organizationId },
                  {
                    $set: {
                      lastInboxSyncError: String(err.message || err).slice(0, 2000),
                      lastInboxSyncAt: new Date()
                    }
                  }
                );
              } catch (_) {
                /* best-effort */
              }
            }
          }
        }
      );
      tenantsProcessed += 1;
    } catch (err) {
      errors += 1;
      console.error(`[gmailInboxSyncScheduler] tenant ${tenant._id} tick failed:`, err.message);
    }
  }

  const shouldLog =
    DEBUG || importedTotal > 0 || errors > 0 || mailboxesAttempted > 0;
  if (shouldLog) {
    console.log(
      `[gmailInboxSyncScheduler] tick: tenants=${tenantsProcessed} attempted=${mailboxesAttempted} throttled=${mailboxesSkippedThrottle} imported=${importedTotal} errors=${errors}`
    );
  }

  return {
    tenantsProcessed,
    mailboxesAttempted,
    mailboxesSkippedThrottle,
    importedTotal,
    errors
  };
}

module.exports = { tickScheduledGmailInboxSync };
