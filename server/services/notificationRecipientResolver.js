const Event = require('../models/Event');
const User = require('../models/User');
const domainEvents = require('../constants/domainEvents');
const { aggregateDigest } = require('./notificationDigestService');

/**
 * Resolve semantic recipient keys into concrete user records.
 * This stays app-aware to prevent data leakage across SALES/AUDIT/PORTAL.
 */
async function resolveRecipients(recipientKeys, context) {
  const recipients = [];
  for (const key of recipientKeys) {
    // eslint-disable-next-line no-await-in-loop
    const resolved = await resolveKey(key, { ...context, appKey: context.appKey || context.sourceAppKey });
    if (resolved && Array.isArray(resolved)) {
      recipients.push(...resolved);
    }
  }
  // Deduplicate by userId
  const unique = new Map();
  for (const r of recipients) {
    unique.set(String(r.userId), r);
  }
  return Array.from(unique.values());
}

async function resolveKey(key, context) {
  switch (key) {
    case 'EVENT_AUDITOR':
      return resolveEventAuditor(context);
    case 'CRM_ADMIN':
      return resolveOrgAdmins(context);
    case 'USER_SELF':
      return resolveUserSelf(context);
    default:
      console.warn('[notificationRecipientResolver] Unhandled recipient key:', key);
      return [];
  }
}

async function resolveEventAuditor({ entity, organizationId }) {
  if (!entity || entity.type !== 'Audit' || !entity.id) return [];
  const event = await Event.findOne({ _id: entity.id, organizationId })
    .select('formAssignment auditorId eventOwnerId eventName title');
  if (!event) return [];

  const userId = event.formAssignment?.assignedAuditor || event.auditorId || event.eventOwnerId;
  if (!userId) return [];

  return [{
    userId,
    title: 'Audit Assigned',
    body: `You have been assigned to audit "${event.eventName || event.title || 'Audit'}".`
  }];
}

async function resolveOrgAdmins({ organizationId }) {
  if (!organizationId) return [];
  const admins = await User.find({
    organizationId,
    role: { $in: ['admin', 'owner'] },
    status: 'active'
  }).select('_id firstName lastName');

  return admins.map(a => ({
    userId: a._id,
    title: 'Admin notification',
    body: 'You have a new notification.'
  }));
}

async function resolveUserSelf({ userId, eventType, organizationId, appKey, triggeredBy }) {
  // For digest events, triggeredBy contains the userId
  const targetUserId = userId || triggeredBy;
  if (!targetUserId) return [];
  
  const user = await User.findById(targetUserId).select('_id firstName lastName organizationId');
  if (!user) return [];

  // Handle digest events - generate digest content
  if (eventType === domainEvents.DIGEST_DAILY || eventType === domainEvents.DIGEST_WEEKLY) {
    const sinceDate = new Date();
    if (eventType === domainEvents.DIGEST_DAILY) {
      sinceDate.setDate(sinceDate.getDate() - 1);
    } else {
      sinceDate.setDate(sinceDate.getDate() - 7);
    }

    // Determine appKey if not provided (for '*' rules)
    const resolvedAppKey = appKey || determineAppKeyFromContext(user);
    
    const digest = await aggregateDigest(
      user._id,
      organizationId || user.organizationId,
      resolvedAppKey,
      sinceDate
    );

    if (!digest) {
      // No content - return empty to skip notification
      return [];
    }

    return [{
      userId: user._id,
      title: digest.title,
      body: digest.body
    }];
  }

  return [{
    userId: user._id,
    title: 'Your notification',
    body: 'You have a new notification.'
  }];
}

/**
 * Determine appKey from context when rule has appKey: '*'
 */
function determineAppKeyFromContext(user) {
  // Try to infer from user's app access
  if (user.appAccess && Array.isArray(user.appAccess) && user.appAccess.length > 0) {
    const activeApp = user.appAccess.find(access => access.status === 'ACTIVE');
    if (activeApp) return activeApp.appKey;
  }
  if (user.allowedApps && Array.isArray(user.allowedApps) && user.allowedApps.length > 0) {
    return user.allowedApps[0]; // Use first app
  }
  return 'SALES'; // Default
}

module.exports = resolveRecipients;

