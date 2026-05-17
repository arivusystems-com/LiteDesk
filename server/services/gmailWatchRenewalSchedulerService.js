'use strict';

/**
 * Renew Gmail Pub/Sub watches before they expire (R3.1).
 */

const Organization = require('../models/Organization');
const Mailbox = require('../models/Mailbox');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const {
  isGmailPushEnabled,
  registerGmailWatchForMailbox
} = require('./gmailWatchService');
const { isGmailMailboxReady } = require('./mailboxGmailInboxSyncService');

async function renewExpiringWatchesInContext() {
  const renewBefore = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const mailboxes = await Mailbox.find({
    inboxProvider: 'google',
    inboxSyncEncryptedRefreshToken: { $exists: true, $nin: [null, ''] }
  })
    .select('_id organizationId gmailWatchExpiration gmailSyncLabelIds inboxSyncEncryptedRefreshToken emailAddress inboxSyncAccountEmail inboxProvider gmailHistoryId')
    .lean();

  let renewed = 0;
  let skipped = 0;

  for (const mb of mailboxes) {
    if (!isGmailMailboxReady(mb)) {
      skipped += 1;
      continue;
    }
    const exp = mb.gmailWatchExpiration ? new Date(mb.gmailWatchExpiration) : null;
    const needsRenew = !exp || exp <= renewBefore;
    if (!needsRenew) {
      skipped += 1;
      continue;
    }
    const result = await registerGmailWatchForMailbox(mb);
    if (result.ok) renewed += 1;
    else skipped += 1;
  }

  return { renewed, skipped };
}

async function tickRenewGmailWatches() {
  if (!isGmailPushEnabled()) {
    return { renewed: 0, skipped: 0, pushDisabled: true };
  }

  let renewed = 0;
  let skipped = 0;

  const master = await renewExpiringWatchesInContext();
  renewed += master.renewed;
  skipped += master.skipped;

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
      const r = await runWithTenantContext(
        { organizationId: tenant._id, connection: conn, databaseName: dbName },
        renewExpiringWatchesInContext
      );
      renewed += r.renewed;
      skipped += r.skipped;
    } catch (err) {
      console.error(`[gmailWatchRenewal] tenant ${tenant._id}:`, err.message);
    }
  }

  return { renewed, skipped };
}

module.exports = {
  tickRenewGmailWatches
};
