'use strict';

const { buildDefaultWeek } = require('../constants/businessHoursDefaults');
const { normalizeSchedule } = require('./businessHoursEngine');
const {
  resolveBusinessSchedule,
  loadSetById
} = require('./businessHoursResolveService');

function effectiveScheduleSource(config) {
  const source = config?.scheduleSource;
  if (source === 'inherit' || source === 'custom' || source === 'legacy') return source;
  return 'legacy';
}

/**
 * Map legacy booking-page fields to a normalized engine schedule.
 */
function legacyConfigToSchedule(config) {
  const days = new Set(config?.availableDays || [1, 2, 3, 4, 5]);
  const week = buildDefaultWeek().map((entry) => ({
    day: entry.day,
    enabled: days.has(entry.day),
    windows: days.has(entry.day)
      ? [{
        start: config?.workingHours?.start || '09:00',
        end: config?.workingHours?.end || '18:00'
      }]
      : [],
    breaks: []
  }));

  return normalizeSchedule({
    name: config?.displayName ? `${config.displayName} hours` : 'Booking page hours',
    timezone: config?.workingHours?.timezone || 'UTC',
    week,
    holidayDates: [],
    status: 'active'
  });
}

/**
 * Resolve the schedule used for appointment slot generation.
 * @returns {Promise<{ schedule: object, timezone: string, source: string, meta?: object }>}
 */
async function resolveScheduleForBookingConfig(config, organizationId, userId) {
  const source = effectiveScheduleSource(config);

  if (source === 'inherit' && userId) {
    const resolved = await resolveBusinessSchedule({
      organizationId,
      userId
    });
    return {
      schedule: resolved.schedule,
      timezone: resolved.timezone,
      source: 'inherit',
      meta: resolved
    };
  }

  if (source === 'custom' && config?.businessHourSetId) {
    const doc = await loadSetById(organizationId, config.businessHourSetId);
    if (doc) {
      return {
        schedule: doc,
        timezone: doc.timezone,
        source: 'custom',
        meta: { name: doc.name, setId: String(config.businessHourSetId) }
      };
    }
  }

  const legacy = legacyConfigToSchedule(config);
  return {
    schedule: legacy,
    timezone: legacy.timezone,
    source: 'legacy',
    meta: { sourceLabel: 'Hours on this booking page' }
  };
}

function getDisplayTimezone(config, resolved) {
  return resolved?.timezone || config?.workingHours?.timezone || 'UTC';
}

module.exports = {
  effectiveScheduleSource,
  legacyConfigToSchedule,
  resolveScheduleForBookingConfig,
  getDisplayTimezone
};
