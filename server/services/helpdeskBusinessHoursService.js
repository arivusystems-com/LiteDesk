'use strict';

const { buildDefaultWeek } = require('../constants/businessHoursDefaults');
const {
  normalizeSchedule,
  isOpen,
  formatScheduleSummary,
  formatPauseReason
} = require('./businessHoursEngine');
const {
  resolveBusinessSchedule,
  loadSetById
} = require('./businessHoursResolveService');

function effectiveSlaScheduleSource(businessHours) {
  const source = businessHours?.scheduleSource;
  if (source === 'inherit' || source === 'custom' || source === 'legacy') return source;
  return 'legacy';
}

/**
 * Convert legacy helpdesk inline hours to a normalized engine schedule.
 */
function legacyHelpdeskHoursToSchedule(businessHours) {
  const days = new Set(businessHours?.workingDays || [1, 2, 3, 4, 5]);
  const week = buildDefaultWeek().map((entry) => ({
    day: entry.day,
    enabled: days.has(entry.day),
    windows: days.has(entry.day)
      ? [{
        start: businessHours?.startTime || '09:00',
        end: businessHours?.endTime || '18:00'
      }]
      : [],
    breaks: []
  }));

  return normalizeSchedule({
    name: 'Helpdesk SLA hours',
    timezone: businessHours?.timezone || 'UTC',
    week,
    holidayDates: [],
    status: 'active'
  });
}

/**
 * Resolve business schedule for org-level SLA calculations.
 * @returns {Promise<{ useCalendarTime: boolean, schedule: object|null, meta: object }>}
 */
async function resolveSlaScheduleForOrganization(organizationId) {
  const { loadHelpdeskSlaConfig } = require('./helpdeskSlaService');
  const config = await loadHelpdeskSlaConfig(organizationId);
  const businessHours = config.businessHours || {};

  if (!businessHours.enabled) {
    return {
      useCalendarTime: true,
      schedule: null,
      meta: { source: 'calendar', sourceLabel: '24/7 SLA clock' }
    };
  }

  const source = effectiveSlaScheduleSource(businessHours);

  if (source === 'inherit') {
    const resolved = await resolveBusinessSchedule({ organizationId, userId: null });
    return {
      useCalendarTime: false,
      schedule: resolved.schedule,
      meta: {
        source: 'inherit',
        sourceLabel: resolved.sourceLabel,
        name: resolved.name,
        setId: resolved.setId,
        summary: resolved.summary,
        timezone: resolved.timezone
      }
    };
  }

  if (source === 'custom' && businessHours.businessHourSetId) {
    const doc = await loadSetById(organizationId, businessHours.businessHourSetId);
    if (doc) {
      return {
        useCalendarTime: false,
        schedule: doc,
        meta: {
          source: 'custom',
          sourceLabel: 'Custom schedule',
          name: doc.name,
          setId: String(businessHours.businessHourSetId),
          summary: formatScheduleSummary(doc),
          timezone: doc.timezone
        }
      };
    }
  }

  const legacy = legacyHelpdeskHoursToSchedule(businessHours);
  return {
    useCalendarTime: false,
    schedule: legacy,
    meta: {
      source: 'legacy',
      sourceLabel: 'Helpdesk inline hours',
      name: legacy.name,
      setId: null,
      summary: formatScheduleSummary(legacy),
      timezone: legacy.timezone
    }
  };
}

/**
 * Context for agents viewing SLA on a case (schedule + off-hours message).
 */
async function getSlaScheduleContext(organizationId, at = new Date()) {
  const resolved = await resolveSlaScheduleForOrganization(organizationId);
  if (resolved.useCalendarTime) {
    return {
      useBusinessHours: false,
      isOpen: true,
      pauseReason: null,
      summary: 'SLA uses calendar time (business hours disabled)',
      scheduleName: null,
      timezone: 'UTC'
    };
  }

  const open = isOpen(at, resolved.schedule);
  return {
    useBusinessHours: true,
    isOpen: open,
    pauseReason: open ? null : formatPauseReason(at, resolved.schedule),
    summary: resolved.meta?.summary || formatScheduleSummary(resolved.schedule),
    scheduleName: resolved.meta?.name || null,
    scheduleSource: resolved.meta?.source,
    scheduleSourceLabel: resolved.meta?.sourceLabel,
    timezone: resolved.meta?.timezone || resolved.schedule?.timezone || 'UTC'
  };
}

module.exports = {
  effectiveSlaScheduleSource,
  legacyHelpdeskHoursToSchedule,
  resolveSlaScheduleForOrganization,
  getSlaScheduleContext
};
