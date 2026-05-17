'use strict';

const { DateTime } = require('luxon');
const Case = require('../models/Case');
const AssignmentScheduleJob = require('../models/AssignmentScheduleJob');
const DeferredAutomationAction = require('../models/DeferredAutomationAction');
const BusinessHoursDailyKpi = require('../models/BusinessHoursDailyKpi');
const { isOpen, businessMinutesOnDate } = require('./businessHoursEngine');
const { resolveBusinessSchedule } = require('./businessHoursResolveService');

function dayBoundsUtc(dateStr, timezone) {
  const start = DateTime.fromISO(dateStr, { zone: timezone }).startOf('day');
  const end = start.endOf('day');
  return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
}

function collectCycles(caseRecord) {
  const historical = Array.isArray(caseRecord.slaCycles) ? caseRecord.slaCycles : [];
  const current = caseRecord.currentSlaCycle ? [caseRecord.currentSlaCycle] : [];
  return [...historical, ...current];
}

/**
 * Aggregate business-hours KPIs for one org calendar day (schedule timezone).
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.organizationId
 * @param {string} [params.date] YYYY-MM-DD in schedule TZ; defaults to yesterday
 */
async function aggregateBusinessHoursKpiForDay({ organizationId, date }) {
  const bootstrapAt = date
    ? DateTime.fromISO(date, { zone: 'UTC' }).plus({ hours: 12 }).toJSDate()
    : new Date();
  const resolved = await resolveBusinessSchedule({
    organizationId,
    at: bootstrapAt
  });
  const schedule = resolved.schedule;
  const timezone = resolved.timezone || schedule.timezone || 'UTC';
  const dateStr = date || DateTime.now().setZone(timezone).minus({ days: 1 }).toISODate();
  const { start, end } = dayBoundsUtc(dateStr, timezone);

  const businessMinutesAvailable = businessMinutesOnDate(dateStr, schedule);

  const cases = await Case.find({
    organizationId,
    $or: [
      { createdAt: { $gte: start, $lte: end } },
      { 'activities.createdAt': { $gte: start, $lte: end } },
      { 'slaCycles.stoppedAt': { $gte: start, $lte: end } },
      { 'currentSlaCycle.stoppedAt': { $gte: start, $lte: end } }
    ]
  })
    .select('createdAt activities slaCycles currentSlaCycle')
    .lean();

  let activitiesInsideHours = 0;
  let activitiesOutsideHours = 0;
  let overtimeCount = 0;
  let slaBreachesOffHours = 0;

  for (const row of cases) {
    const createdAt = row.createdAt ? new Date(row.createdAt) : null;
    if (createdAt && createdAt >= start && createdAt <= end) {
      if (isOpen(createdAt, schedule)) {
        activitiesInsideHours += 1;
      } else {
        activitiesOutsideHours += 1;
        overtimeCount += 1;
      }
    }

    for (const activity of row.activities || []) {
      const atActivity = activity.createdAt ? new Date(activity.createdAt) : null;
      if (!atActivity || atActivity < start || atActivity > end) continue;
      if (isOpen(atActivity, schedule)) {
        activitiesInsideHours += 1;
      } else {
        activitiesOutsideHours += 1;
        overtimeCount += 1;
      }
    }

    for (const cycle of collectCycles(row)) {
      const stoppedAt = cycle.stoppedAt ? new Date(cycle.stoppedAt) : null;
      const targetAt = cycle.resolutionTargetAt ? new Date(cycle.resolutionTargetAt) : null;
      if (!stoppedAt || stoppedAt < start || stoppedAt > end) continue;
      if (targetAt && stoppedAt > targetAt && !isOpen(stoppedAt, schedule)) {
        slaBreachesOffHours += 1;
      }
    }
  }

  const assignmentDeferredCount = await AssignmentScheduleJob.countDocuments({
    organizationId,
    createdAt: { $gte: start, $lte: end },
    'details.waitForBusinessHours': true
  });

  const automationDeferredCount = await DeferredAutomationAction.countDocuments({
    organizationId,
    createdAt: { $gte: start, $lte: end }
  });

  const activityTotal = activitiesInsideHours + activitiesOutsideHours;
  const utilizationPercent = activityTotal > 0
    ? Math.round((activitiesInsideHours / activityTotal) * 100)
    : 0;

  const payload = {
    organizationId,
    date: dateStr,
    scheduleId: resolved.setId || null,
    scheduleName: resolved.name || 'Default',
    timezone,
    businessMinutesAvailable,
    activitiesInsideHours,
    activitiesOutsideHours,
    overtimeCount,
    slaBreachesOffHours,
    assignmentDeferredCount,
    automationDeferredCount,
    utilizationPercent
  };

  const row = await BusinessHoursDailyKpi.findOneAndUpdate(
    { organizationId, date: dateStr },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return row;
}

module.exports = {
  aggregateBusinessHoursKpiForDay,
  dayBoundsUtc
};
