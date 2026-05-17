'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { legacyHelpdeskHoursToSchedule } = require('../helpdeskBusinessHoursService');
const { addBusinessMinutes } = require('../businessHoursEngine');

test('legacy helpdesk hours map to engine schedule', () => {
  const schedule = legacyHelpdeskHoursToSchedule({
    timezone: 'America/New_York',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00'
  });
  const mon = DateTime.fromObject(
    { year: 2026, month: 5, day: 11, hour: 10, minute: 0 },
    { zone: 'America/New_York' }
  );
  const sat = DateTime.fromObject(
    { year: 2026, month: 5, day: 16, hour: 10, minute: 0 },
    { zone: 'America/New_York' }
  );
  const { isOpen } = require('../businessHoursEngine');
  assert.equal(isOpen(mon.toJSDate(), schedule), true);
  assert.equal(isOpen(sat.toJSDate(), schedule), false);
});

test('addBusinessMinutes skips weekend for SLA-style targets', () => {
  const schedule = legacyHelpdeskHoursToSchedule({
    timezone: 'America/New_York',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00'
  });
  const friday = DateTime.fromObject(
    { year: 2026, month: 5, day: 15, hour: 17, minute: 0 },
    { zone: 'America/New_York' }
  );
  const result = addBusinessMinutes(friday.toJSDate(), 120, schedule);
  const resultDt = DateTime.fromJSDate(result, { zone: 'America/New_York' });
  assert.equal(resultDt.weekday, 1);
  assert.equal(resultDt.hour, 10);
});
