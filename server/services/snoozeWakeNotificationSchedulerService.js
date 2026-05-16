'use strict';

/**
 * Phase 6: when a user's email thread snooze window ends (snoozedUntil <= now),
 * emit a one-time in-app notification per snooze session.
 */

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const ThreadView = require('../models/ThreadView');
const Communication = require('../models/Communication');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const domainEvents = require('../constants/domainEvents');
const { emitNotification } = require('./notificationEngine');

const DEBUG = process.env.SNOOZE_WAKE_NOTIFICATION_DEBUG === 'true';
const BATCH_PER_TENANT = Math.min(500, Math.max(20, parseInt(process.env.SNOOZE_WAKE_BATCH_PER_TENANT || '120', 10)));
const LOOKBACK_MS =
  Math.max(1, parseInt(process.env.SNOOZE_WAKE_MAX_LOOKBACK_HOURS || '72', 10)) * 3600000;

async function resolveThreadSubject(organizationId, threadIdStr) {
  const s = String(threadIdStr || '').trim();
  if (!s || !mongoose.Types.ObjectId.isValid(s)) return '(No subject)';
  const oid = new mongoose.Types.ObjectId(s);
  const comm = await Communication.findOne({
    organizationId,
    $or: [{ threadId: oid }, { _id: oid }]
  })
    .sort({ createdAt: -1 })
    .select('subject')
    .lean();
  const sub = String(comm?.subject || '').trim();
  return sub || '(No subject)';
}

/**
 * @returns {Promise<{ tenantsProcessed: number, notified: number, skipped: number, errors: number }>}
 */
async function tickSnoozeWakeNotifications() {
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - LOOKBACK_MS);

  const tenants = await Organization.find({
    isTenant: true,
    isActive: true,
    'database.name': { $exists: true, $nin: [null, ''] }
  })
    .select('_id database.name')
    .lean();

  let tenantsProcessed = 0;
  let notified = 0;
  let skipped = 0;
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
      console.error(`[snoozeWakeNotification] tenant ${tenant._id} DB connect failed:`, err.message);
      continue;
    }

    try {
      await runWithTenantContext(
        { organizationId: tenant._id, connection: conn, databaseName: dbName },
        async () => {
          const candidates = await ThreadView.find({
            snoozedUntil: { $type: 'date', $lte: now, $gte: lookbackStart },
            $expr: {
              $or: [
                { $eq: [{ $ifNull: ['$snoozeWakeNotifiedAt', null] }, null] },
                { $ne: ['$snoozeWakeNotifiedAt', '$snoozedUntil'] }
              ]
            }
          })
            .select('_id userId organizationId threadId snoozedUntil')
            .limit(BATCH_PER_TENANT)
            .lean();

          for (const row of candidates) {
            if (!row.snoozedUntil) {
              skipped += 1;
              continue;
            }
            const su = new Date(row.snoozedUntil);
            if (Number.isNaN(su.getTime()) || su.getTime() > now.getTime()) {
              skipped += 1;
              continue;
            }

            try {
              const subject = await resolveThreadSubject(row.organizationId, row.threadId);
              await emitNotification({
                eventType: domainEvents.EMAIL_THREAD_SNOOZE_ENDED,
                entity: {
                  type: 'EmailThread',
                  id: String(row.threadId),
                  subject,
                  notifyUserId: row.userId
                },
                organizationId: row.organizationId,
                triggeredBy: null,
                sourceAppKey: 'SALES'
              });

              await ThreadView.updateOne(
                { _id: row._id, organizationId: row.organizationId },
                { $set: { snoozeWakeNotifiedAt: row.snoozedUntil } }
              );
              notified += 1;
              if (DEBUG) {
                console.log(
                  `[snoozeWakeNotification] org=${tenant._id} user=${row.userId} thread=${row.threadId}`
                );
              }
            } catch (err) {
              errors += 1;
              console.error(
                `[snoozeWakeNotification] org=${tenant._id} threadView=${row._id}:`,
                err.message
              );
            }
          }
        }
      );
      tenantsProcessed += 1;
    } catch (err) {
      errors += 1;
      console.error(`[snoozeWakeNotification] tenant ${tenant._id} tick failed:`, err.message);
    }
  }

  if (DEBUG || notified > 0 || errors > 0) {
    console.log(
      `[snoozeWakeNotification] tick: tenants=${tenantsProcessed} notified=${notified} skipped=${skipped} errors=${errors}`
    );
  }

  return { tenantsProcessed, notified, skipped, errors };
}

module.exports = { tickSnoozeWakeNotifications };
