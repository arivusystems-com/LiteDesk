'use strict';

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_WINDOW = { start: '09:00', end: '18:00' };

/**
 * Mon–Fri 09:00–18:00, weekends off (day 0 = Sunday … 6 = Saturday).
 */
function buildDefaultWeek() {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    windows: [{ ...DEFAULT_WINDOW }],
    breaks: []
  }));
}

function buildDefaultBusinessHourSetPayload(organizationId, timezone = DEFAULT_TIMEZONE) {
  return {
    organizationId,
    name: 'Default company hours',
    timezone: timezone || DEFAULT_TIMEZONE,
    week: buildDefaultWeek(),
    holidayCalendarId: null,
    overtimeAllowed: false,
    linkedTo: { type: 'company', id: null },
    isDefault: true,
    status: 'active',
    effectiveFrom: null,
    effectiveTo: null
  };
}

module.exports = {
  DEFAULT_TIMEZONE,
  DEFAULT_WINDOW,
  buildDefaultWeek,
  buildDefaultBusinessHourSetPayload
};
