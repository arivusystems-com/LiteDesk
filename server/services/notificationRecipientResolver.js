const Event = require('../models/Event');
const Task = require('../models/Task');
const Case = require('../models/Case');
const People = require('../models/People');
const Deal = require('../models/Deal');
const Organization = require('../models/Organization');
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
    case 'TASK_ASSIGNEE':
      return resolveTaskAssignee(context);
    case 'PEOPLE_ASSIGNEE':
      return resolvePeopleAssignee(context);
    case 'DEAL_OWNER':
      return resolveDealOwnerNotify(context);
    case 'ORGANIZATION_ASSIGNEE':
      return resolveSalesOrganizationAssignee(context);
    case 'CASE_OWNER':
      return resolveCaseOwner(context);
    default:
      console.warn('[notificationRecipientResolver] Unhandled recipient key:', key);
      return [];
  }
}

async function resolveTaskAssignee({ entity, organizationId, eventType }) {
  if (!entity || entity.type !== 'Task' || !entity.id) return [];
  const task = await Task.findOne({ _id: entity.id, organizationId })
    .select('assignedTo title');
  if (!task || !task.assignedTo) return [];

  const titles = {
    [domainEvents.TASK_ASSIGNED]: 'Task Assigned',
    [domainEvents.TASK_CREATED]: 'New Task',
    [domainEvents.TASK_STATUS_CHANGED]: 'Task Status Updated',
    [domainEvents.TASK_DUE_SOON]: 'Task Due Soon'
  };
  const bodies = {
    [domainEvents.TASK_ASSIGNED]: `You have been assigned to task "${task.title || 'Task'}".`,
    [domainEvents.TASK_CREATED]: `A new task "${task.title || 'Task'}" has been created and assigned to you.`,
    [domainEvents.TASK_STATUS_CHANGED]: `Task "${task.title || 'Task'}" status has been updated.`,
    [domainEvents.TASK_DUE_SOON]: `Task "${task.title || 'Task'}" is due soon.`
  };

  return [{
    userId: task.assignedTo,
    title: titles[eventType] || 'Task Notification',
    body: bodies[eventType] || `Update on task "${task.title || 'Task'}".`
  }];
}

async function resolvePeopleAssignee({ entity, organizationId, eventType }) {
  if (!entity || entity.type !== 'Person' || !entity.id || !organizationId) return [];
  const row = await People.findOne({ _id: entity.id, organizationId })
    .select('assignedTo first_name last_name');
  if (!row || !row.assignedTo) return [];

  const label = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Contact';
  const title = eventType === domainEvents.PEOPLE_ASSIGNED ? 'Contact assigned' : 'Contact update';
  const body =
    eventType === domainEvents.PEOPLE_ASSIGNED
      ? `You have been assigned to "${label}".`
      : `Update on contact "${label}".`;

  return [{ userId: row.assignedTo, title, body }];
}

async function resolveDealOwnerNotify({ entity, organizationId, eventType }) {
  if (!entity || entity.type !== 'Deal' || !entity.id || !organizationId) return [];
  const row = await Deal.findOne({ _id: entity.id, organizationId }).select('ownerId name');
  if (!row || !row.ownerId) return [];

  const label = row.name || 'Deal';
  const title = eventType === domainEvents.DEAL_ASSIGNED ? 'Deal assigned' : 'Deal update';
  const body =
    eventType === domainEvents.DEAL_ASSIGNED
      ? `You are now the owner of "${label}".`
      : `Update on deal "${label}".`;

  return [{ userId: row.ownerId, title, body }];
}

async function resolveSalesOrganizationAssignee({ entity, organizationId, eventType }) {
  if (!entity || entity.type !== 'Organization' || !entity.id || !organizationId) return [];
  const row = await Organization.findOne({ _id: entity.id, isTenant: false }).select(
    'assignedTo name createdBy'
  );
  if (!row || !row.assignedTo) return [];

  const allowed = await User.exists({ _id: row.createdBy, organizationId });
  if (!allowed) return [];

  const label = row.name || 'Organization';
  const title =
    eventType === domainEvents.ORGANIZATION_ASSIGNED ? 'Organization assigned' : 'Organization update';
  const body =
    eventType === domainEvents.ORGANIZATION_ASSIGNED
      ? `You have been assigned to "${label}".`
      : `Update on organization "${label}".`;

  return [{ userId: row.assignedTo, title, body }];
}

async function resolveCaseOwner({ entity, organizationId, eventType }) {
  if (!entity || entity.type !== 'Case' || !entity.id) return [];
  const row = await Case.findOne({ _id: entity.id, organizationId })
    .select('caseOwnerId caseId title');
  if (!row || !row.caseOwnerId) return [];

  const titles = {
    [domainEvents.CASE_CREATED]: 'Case Created',
    [domainEvents.CASE_ASSIGNED]: 'Case Assigned',
    [domainEvents.CASE_STATUS_CHANGED]: 'Case Status Updated',
    [domainEvents.CASE_REOPENED]: 'Case Reopened',
    [domainEvents.CASE_ESCALATED]: 'Case Escalated',
    [domainEvents.CASE_SLA_WARNING]: 'SLA Warning',
    [domainEvents.CASE_SLA_BREACHED]: 'SLA Breached'
  };

  const caseLabel = row.caseId || row.title || 'Case';
  const bodies = {
    [domainEvents.CASE_CREATED]: `${caseLabel} has been created and assigned to you.`,
    [domainEvents.CASE_ASSIGNED]: `${caseLabel} has been assigned to you.`,
    [domainEvents.CASE_STATUS_CHANGED]: `${caseLabel} status has changed.`,
    [domainEvents.CASE_REOPENED]: `${caseLabel} has been reopened.`,
    [domainEvents.CASE_ESCALATED]: `${caseLabel} has been escalated.`,
    [domainEvents.CASE_SLA_WARNING]: `${caseLabel} is nearing SLA breach.`,
    [domainEvents.CASE_SLA_BREACHED]: `${caseLabel} has breached SLA.`
  };

  return [{
    userId: row.caseOwnerId,
    title: titles[eventType] || 'Case Notification',
    body: bodies[eventType] || `Update on ${caseLabel}.`
  }];
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

