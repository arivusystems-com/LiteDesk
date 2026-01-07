const Notification = require('../models/Notification');
const domainEvents = require('../constants/domainEvents');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';

function debugLog(event, data) {
  if (NOTIFICATION_DEBUG) {
    console.log(`[notificationDigestService:${event}]`, JSON.stringify(data));
  }
}

/**
 * Aggregate unread notifications per user + app for digest generation.
 * Groups by semantic category and produces a human-readable summary.
 * 
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} organizationId - Organization ID
 * @param {String} appKey - App key (CRM, AUDIT, PORTAL)
 * @param {Date} sinceDate - Start of time window
 * @returns {Object|null} Digest summary or null if no content
 */
async function aggregateDigest(userId, organizationId, appKey, sinceDate) {
  try {
    // Fetch unread notifications for this user/app in the time window
    const notifications = await Notification.find({
      userId,
      organizationId,
      appKey,
      readAt: null, // Only unread
      createdAt: { $gte: sinceDate }
    })
      .select('eventType title body createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!notifications || notifications.length === 0) {
      debugLog('AggregateEmpty', { userId: String(userId), appKey, sinceDate });
      return null;
    }

    // Group by semantic category
    const items = groupByCategory(notifications, appKey);

    // Generate human-readable summary
    const summary = generateSummary(items, appKey);

    debugLog('AggregateComplete', {
      userId: String(userId),
      appKey,
      itemCount: items.length,
      notificationCount: notifications.length
    });

    return {
      title: summary.title,
      body: summary.body,
      items,
      notificationCount: notifications.length
    };
  } catch (err) {
    // Never throw - digest failures should not affect users
    console.error('[notificationDigestService] Failed to aggregate digest:', err);
    return null;
  }
}

/**
 * Group notifications by semantic category based on app.
 */
function groupByCategory(notifications, appKey) {
  const categoryMap = new Map();

  for (const notif of notifications) {
    const category = categorizeEvent(notif.eventType, appKey);
    if (!category) continue;

    const existing = categoryMap.get(category) || { type: category, count: 0 };
    existing.count += 1;
    categoryMap.set(category, existing);
  }

  return Array.from(categoryMap.values());
}

/**
 * Categorize event type into semantic groups.
 */
function categorizeEvent(eventType, appKey) {
  // CRM categories
  if (appKey === 'CRM') {
    if (eventType === domainEvents.AUDIT_ASSIGNED || 
        eventType === domainEvents.AUDIT_SUBMITTED ||
        eventType === domainEvents.AUDIT_APPROVED ||
        eventType === domainEvents.AUDIT_REJECTED) {
      return 'AUDITS';
    }
    if (eventType === domainEvents.CORRECTIVE_ACTION_CREATED ||
        eventType === domainEvents.CORRECTIVE_ACTION_DUE_SOON ||
        eventType === domainEvents.CORRECTIVE_ACTION_OVERDUE) {
      return 'CORRECTIVE_ACTIONS';
    }
    if (eventType === domainEvents.SYSTEM_TRIAL_EXPIRING ||
        eventType === domainEvents.SYSTEM_SUBSCRIPTION_SUSPENDED) {
      return 'SUBSCRIPTIONS';
    }
    if (eventType === domainEvents.USER_ADDED_TO_APP) {
      return 'USER_MANAGEMENT';
    }
  }

  // AUDIT categories
  if (appKey === 'AUDIT') {
    if (eventType === domainEvents.AUDIT_ASSIGNED) {
      return 'AUDIT_ASSIGNED';
    }
    if (eventType === domainEvents.AUDIT_SUBMITTED ||
        eventType === domainEvents.AUDIT_APPROVED ||
        eventType === domainEvents.AUDIT_REJECTED) {
      return 'AUDIT_STATUS';
    }
    if (eventType === domainEvents.AUDIT_CHECKED_IN) {
      return 'AUDIT_EXECUTION';
    }
  }

  // PORTAL categories
  if (appKey === 'PORTAL') {
    if (eventType === domainEvents.CORRECTIVE_ACTION_CREATED) {
      return 'CORRECTIVE_ACTION_CREATED';
    }
    if (eventType === domainEvents.CORRECTIVE_ACTION_DUE_SOON) {
      return 'CORRECTIVE_ACTION_DUE_SOON';
    }
    if (eventType === domainEvents.CORRECTIVE_ACTION_OVERDUE) {
      return 'CORRECTIVE_ACTION_OVERDUE';
    }
    if (eventType === domainEvents.EVIDENCE_UPLOADED) {
      return 'EVIDENCE_UPLOADED';
    }
  }

  // Unknown category - skip
  return null;
}

/**
 * Generate human-readable summary from categorized items.
 */
function generateSummary(items, appKey) {
  if (items.length === 0) {
    return { title: 'No updates', body: 'You have no new notifications.' };
  }

  const parts = [];
  let title = '';

  if (appKey === 'CRM') {
    title = 'Your daily CRM summary';
    const audits = items.find(i => i.type === 'AUDITS');
    const corrective = items.find(i => i.type === 'CORRECTIVE_ACTIONS');
    const subscriptions = items.find(i => i.type === 'SUBSCRIPTIONS');
    const users = items.find(i => i.type === 'USER_MANAGEMENT');

    if (audits) parts.push(`${audits.count} audit${audits.count !== 1 ? 's' : ''} update${audits.count !== 1 ? 's' : ''}`);
    if (corrective) parts.push(`${corrective.count} corrective action${corrective.count !== 1 ? 's' : ''}`);
    if (subscriptions) parts.push(`${subscriptions.count} subscription update${subscriptions.count !== 1 ? 's' : ''}`);
    if (users) parts.push(`${users.count} user management update${users.count !== 1 ? 's' : ''}`);
  } else if (appKey === 'AUDIT') {
    title = 'Your daily audit summary';
    const assigned = items.find(i => i.type === 'AUDIT_ASSIGNED');
    const status = items.find(i => i.type === 'AUDIT_STATUS');
    const execution = items.find(i => i.type === 'AUDIT_EXECUTION');

    if (assigned) parts.push(`${assigned.count} audit${assigned.count !== 1 ? 's' : ''} assigned`);
    if (status) parts.push(`${status.count} audit status update${status.count !== 1 ? 's' : ''}`);
    if (execution) parts.push(`${execution.count} audit execution update${execution.count !== 1 ? 's' : ''}`);
  } else if (appKey === 'PORTAL') {
    title = 'Your daily portal summary';
    const created = items.find(i => i.type === 'CORRECTIVE_ACTION_CREATED');
    const dueSoon = items.find(i => i.type === 'CORRECTIVE_ACTION_DUE_SOON');
    const overdue = items.find(i => i.type === 'CORRECTIVE_ACTION_OVERDUE');
    const evidence = items.find(i => i.type === 'EVIDENCE_UPLOADED');

    if (created) parts.push(`${created.count} new corrective action${created.count !== 1 ? 's' : ''}`);
    if (dueSoon) parts.push(`${dueSoon.count} corrective action${dueSoon.count !== 1 ? 's' : ''} due soon`);
    if (overdue) parts.push(`${overdue.count} corrective action${overdue.count !== 1 ? 's' : ''} overdue`);
    if (evidence) parts.push(`${evidence.count} evidence upload${evidence.count !== 1 ? 's' : ''}`);
  } else {
    title = 'Your daily summary';
    parts.push(`${items.reduce((sum, i) => sum + i.count, 0)} notification${items.length !== 1 ? 's' : ''}`);
  }

  const body = parts.length > 0
    ? `You have ${parts.join(', ')}.`
    : 'You have new notifications.';

  return { title, body };
}

module.exports = {
  aggregateDigest
};

