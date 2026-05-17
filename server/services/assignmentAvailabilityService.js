'use strict';

const Group = require('../models/Group');
const AssignmentScheduleJob = require('../models/AssignmentScheduleJob');
const { isOpen, nextOpenInstant } = require('./businessHoursEngine');
const { resolveBusinessSchedule } = require('./businessHoursResolveService');

/**
 * Users whose resolved schedule is open at `at`.
 */
async function filterUsersAvailableNow(organizationId, userIds, at = new Date()) {
  const unique = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
  const available = [];

  for (const userId of unique) {
    const resolved = await resolveBusinessSchedule({
      organizationId,
      userId,
      at
    });
    if (isOpen(at, resolved.schedule)) {
      available.push(userId);
    }
  }

  return available;
}

/**
 * Earliest next open instant across users (for deferred assignment jobs).
 */
async function getNextOpenInstantForUsers(organizationId, userIds, at = new Date()) {
  const unique = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
  let earliest = null;

  for (const userId of unique) {
    const resolved = await resolveBusinessSchedule({
      organizationId,
      userId,
      at
    });
    const next = nextOpenInstant(at, resolved.schedule, { inclusive: false });
    if (!next) continue;
    const nextDate = next instanceof Date ? next : new Date(next);
    if (!earliest || nextDate < earliest) {
      earliest = nextDate;
    }
  }

  return earliest;
}

async function collectMemberIdsForRules(organizationId, rules = []) {
  const groupIds = new Set();
  for (const rule of rules) {
    if (rule?.primaryGroupId) groupIds.add(String(rule.primaryGroupId));
    for (const id of rule?.fallbackGroupIds || []) {
      if (id) groupIds.add(String(id));
    }
  }
  if (!groupIds.size) return [];

  const groups = await Group.find({
    organizationId,
    _id: { $in: [...groupIds] },
    isActive: { $ne: false }
  })
    .select('members')
    .lean();

  const userIds = new Set();
  for (const group of groups) {
    for (const memberId of group.members || []) {
      userIds.add(String(memberId));
    }
  }
  return [...userIds];
}

async function collectMemberIdsForRule(organizationId, rule) {
  return collectMemberIdsForRules(organizationId, rule ? [rule] : []);
}

/**
 * Queue assignment retry when availability_based finds no open users (off-hours).
 */
async function enqueueOffHoursDeferredAssignment({
  organizationId,
  appKey,
  moduleKey,
  recordId,
  rule,
  ruleSetVersion,
  actorId
}) {
  const memberIds = await collectMemberIdsForRule(organizationId, rule);
  const runAt = await getNextOpenInstantForUsers(organizationId, memberIds);
  if (!runAt) {
    return { queued: false, reason: 'no_next_open_instant' };
  }

  const dedupeKey = [
    'asgjob-bh',
    organizationId,
    recordId,
    rule.ruleId,
    String(ruleSetVersion || 1),
    new Date(runAt).toISOString()
  ].join(':');

  try {
    await AssignmentScheduleJob.create({
      organizationId,
      appKey: String(appKey || '').toUpperCase(),
      moduleKey: String(moduleKey || '').toLowerCase(),
      recordId,
      ruleId: rule.ruleId,
      executionMode: 'delayed',
      runAt,
      status: 'pending',
      attempts: 0,
      maxAttempts: 5,
      dedupeKey,
      snapshotVersion: ruleSetVersion,
      details: {
        actorId: actorId || null,
        waitForBusinessHours: true,
        deferReason: 'off_hours_deferred',
        recheckConditionsAtExecution: true
      }
    });
    return { queued: true, runAt };
  } catch (error) {
    if (error?.code === 11000) {
      return { queued: false, reason: 'duplicate' };
    }
    throw error;
  }
}

module.exports = {
  filterUsersAvailableNow,
  getNextOpenInstantForUsers,
  collectMemberIdsForRules,
  collectMemberIdsForRule,
  enqueueOffHoursDeferredAssignment
};
