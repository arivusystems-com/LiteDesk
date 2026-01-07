const User = require('../models/User');
const NotificationPreference = require('../models/NotificationPreference');
const { emitNotification } = require('./notificationEngine');
const { aggregateDigest } = require('./notificationDigestService');
const { ensureDefaultPreferences } = require('./notificationPreferenceBootstrap');
const domainEvents = require('../constants/domainEvents');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';

function debugLog(event, data) {
  if (NOTIFICATION_DEBUG) {
    console.log(`[digestScheduler:${event}]`, JSON.stringify(data));
  }
}

/**
 * Run daily digest for all active users.
 * Idempotent, never throws, logs only when NOTIFICATION_DEBUG=true.
 */
async function runDailyDigest() {
  debugLog('DailyDigestStart', { timestamp: new Date().toISOString() });

  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Get all active users
    const users = await User.find({
      status: 'active'
    }).select('_id organizationId appAccess allowedApps');

    debugLog('DailyDigestUsers', { userCount: users.length });

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Determine which apps this user has access to
        const appKeys = getUserAppKeys(user);

        for (const appKey of appKeys) {
          try {
            // Ensure preferences exist
            await ensureDefaultPreferences(user._id, appKey);

            // Get preferences
            const pref = await NotificationPreference.findOne({
              userId: user._id,
              appKey
            });

            if (!pref) {
              skipped++;
              continue;
            }

            // Check if daily digest is enabled for any channel
            const digestPref = pref.events.get(domainEvents.DIGEST_DAILY);
            if (!digestPref || (!digestPref.inApp && !digestPref.email)) {
              debugLog('DailyDigestSkipped', {
                userId: String(user._id),
                appKey,
                reason: 'disabled'
              });
              skipped++;
              continue;
            }

            // Check for existing digest today (idempotency guard)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existing = await require('../models/Notification').findOne({
              userId: user._id,
              organizationId: user.organizationId,
              appKey,
              eventType: domainEvents.DIGEST_DAILY,
              createdAt: { $gte: today }
            });

            if (existing) {
              debugLog('DailyDigestDuplicate', {
                userId: String(user._id),
                appKey,
                reason: 'already_sent_today'
              });
              skipped++;
              continue;
            }

            // Emit digest notification
            // Note: The recipient resolver will generate digest content on the fly
            // If there's no content, the resolver returns empty and no notification is created
            await emitNotification({
              eventType: domainEvents.DIGEST_DAILY,
              entity: null, // Digests have no entity
              organizationId: user.organizationId,
              triggeredBy: user._id, // Pass userId so recipient resolver can use it
              sourceAppKey: appKey
            });

            processed++;
            debugLog('DailyDigestEmitted', {
              userId: String(user._id),
              appKey
            });
          } catch (appErr) {
            errors++;
            console.error(`[digestScheduler] Error processing app ${appKey} for user ${user._id}:`, appErr);
          }
        }
      } catch (userErr) {
        errors++;
        console.error(`[digestScheduler] Error processing user ${user._id}:`, userErr);
      }
    }

    debugLog('DailyDigestComplete', {
      processed,
      skipped,
      errors,
      totalUsers: users.length
    });
  } catch (err) {
    // Never throw - digest failures should not affect users
    console.error('[digestScheduler] Daily digest failed:', err);
  }
}

/**
 * Run weekly digest for all active users.
 * Idempotent, never throws, logs only when NOTIFICATION_DEBUG=true.
 */
async function runWeeklyDigest() {
  debugLog('WeeklyDigestStart', { timestamp: new Date().toISOString() });

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get all active users
    const users = await User.find({
      status: 'active'
    }).select('_id organizationId appAccess allowedApps');

    debugLog('WeeklyDigestUsers', { userCount: users.length });

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Determine which apps this user has access to
        const appKeys = getUserAppKeys(user);

        for (const appKey of appKeys) {
          try {
            // Ensure preferences exist
            await ensureDefaultPreferences(user._id, appKey);

            // Get preferences
            const pref = await NotificationPreference.findOne({
              userId: user._id,
              appKey
            });

            if (!pref) {
              skipped++;
              continue;
            }

            // Check if weekly digest is enabled for email (weekly is email-only)
            const digestPref = pref.events.get(domainEvents.DIGEST_WEEKLY);
            if (!digestPref || !digestPref.email) {
              debugLog('WeeklyDigestSkipped', {
                userId: String(user._id),
                appKey,
                reason: 'disabled'
              });
              skipped++;
              continue;
            }

            // Check for existing digest this week (idempotency guard)
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
            weekStart.setHours(0, 0, 0, 0);
            const existing = await require('../models/Notification').findOne({
              userId: user._id,
              organizationId: user.organizationId,
              appKey,
              eventType: domainEvents.DIGEST_WEEKLY,
              createdAt: { $gte: weekStart }
            });

            if (existing) {
              debugLog('WeeklyDigestDuplicate', {
                userId: String(user._id),
                appKey,
                reason: 'already_sent_this_week'
              });
              skipped++;
              continue;
            }

            // Emit digest notification
            // Note: The recipient resolver will generate digest content on the fly
            // If there's no content, the resolver returns empty and no notification is created
            await emitNotification({
              eventType: domainEvents.DIGEST_WEEKLY,
              entity: null,
              organizationId: user.organizationId,
              triggeredBy: user._id, // Pass userId so recipient resolver can use it
              sourceAppKey: appKey
            });

            processed++;
            debugLog('WeeklyDigestEmitted', {
              userId: String(user._id),
              appKey
            });
          } catch (appErr) {
            errors++;
            console.error(`[digestScheduler] Error processing app ${appKey} for user ${user._id}:`, appErr);
          }
        }
      } catch (userErr) {
        errors++;
        console.error(`[digestScheduler] Error processing user ${user._id}:`, userErr);
      }
    }

    debugLog('WeeklyDigestComplete', {
      processed,
      skipped,
      errors,
      totalUsers: users.length
    });
  } catch (err) {
    // Never throw - digest failures should not affect users
    console.error('[digestScheduler] Weekly digest failed:', err);
  }
}

/**
 * Get app keys for a user (from appAccess or allowedApps).
 */
function getUserAppKeys(user) {
  // Prefer appAccess (new system)
  if (user.appAccess && Array.isArray(user.appAccess) && user.appAccess.length > 0) {
    return user.appAccess
      .filter(access => access.status === 'ACTIVE')
      .map(access => access.appKey);
  }

  // Fallback to allowedApps (legacy)
  if (user.allowedApps && Array.isArray(user.allowedApps) && user.allowedApps.length > 0) {
    return user.allowedApps;
  }

  // Default to CRM if nothing specified
  return ['CRM'];
}

module.exports = {
  runDailyDigest,
  runWeeklyDigest
};

