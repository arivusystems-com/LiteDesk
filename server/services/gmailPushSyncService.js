'use strict';

/**
 * Handle Gmail Pub/Sub push notifications → run mailbox sync (R3.1).
 */

const Organization = require('../models/Organization');
const Mailbox = require('../models/Mailbox');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const { runGmailInboxSyncForMailbox, isGmailMailboxReady } = require('./mailboxGmailInboxSyncService');

async function syncMailboxesForEmailAddress(emailAddress, historyId) {
  const normalized = String(emailAddress || '').trim().toLowerCase();
  if (!normalized) {
    return { mailboxesSynced: 0, errors: [] };
  }

  let mailboxesSynced = 0;
  const errors = [];

  async function processMailboxesInContext() {
    const mailboxes = await Mailbox.find({
      inboxProvider: 'google',
      $or: [{ emailAddress: normalized }, { inboxSyncAccountEmail: normalized }]
    }).lean();

    for (const mb of mailboxes) {
      if (!isGmailMailboxReady(mb)) continue;
      if (historyId) {
        await Mailbox.updateOne(
          { _id: mb._id, organizationId: mb.organizationId },
          { $set: { gmailHistoryId: String(historyId) } }
        );
        mb.gmailHistoryId = String(historyId);
      }
      try {
        const result = await runGmailInboxSyncForMailbox(mb);
        if (result.error) {
          errors.push({ mailboxId: String(mb._id), error: result.error });
        } else {
          mailboxesSynced += 1;
        }
      } catch (err) {
        errors.push({ mailboxId: String(mb._id), error: err?.message || String(err) });
      }
    }
  }

  // Master DB (orgs without dedicated tenant DB)
  await processMailboxesInContext();

  const tenants = await Organization.find({
    isTenant: true,
    isActive: true,
    'database.name': { $exists: true, $nin: [null, ''] },
    'database.initialized': true
  })
    .select('_id database.name')
    .lean();

  for (const tenant of tenants) {
    const dbName = tenant.database?.name;
    if (!dbName) continue;
    try {
      const conn = await dbConnectionManager.getOrganizationConnection(dbName);
      if (conn.readyState !== 1 && typeof conn.asPromise === 'function') {
        await conn.asPromise();
      }
      await runWithTenantContext(
        { organizationId: tenant._id, connection: conn, databaseName: dbName },
        processMailboxesInContext
      );
    } catch (err) {
      errors.push({ organizationId: String(tenant._id), error: err.message });
    }
  }

  return { mailboxesSynced, errors };
}

module.exports = {
  syncMailboxesForEmailAddress
};
