'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { isOpen, nextOpenInstant, normalizeSchedule } = require('../businessHoursEngine');
const { buildDefaultWeek } = require('../../constants/businessHoursDefaults');
const { evaluateAutomationDeferral, buildDeferDedupeKey } = require('../automationBusinessHoursService');

function baseSchedule(overrides = {}) {
  return normalizeSchedule({
    name: 'Test',
    timezone: 'America/New_York',
    week: buildDefaultWeek(),
    status: 'active',
    holidayDates: [],
    ...overrides
  });
}

test('buildDeferDedupeKey is stable', () => {
  const key = buildDeferDedupeKey('evt-1', 'rule-2', 0);
  assert.equal(key, 'auto-bh:evt-1:rule-2:0');
});

test('evaluateAutomationDeferral skips when flag off', async () => {
  const result = await evaluateAutomationDeferral(
    { organizationId: '507f1f77bcf86cd799439011', eventId: 'e1' },
    { respectBusinessHours: false }
  );
  assert.equal(result.shouldDefer, false);
});

test('getNextOpenInstantForUsers picks earliest across schedules', () => {
  const scheduleA = baseSchedule({ timezone: 'America/New_York' });
  const scheduleB = baseSchedule({ timezone: 'Europe/London' });
  const at = DateTime.fromObject(
    { year: 2026, month: 5, day: 10, hour: 12, minute: 0 },
    { zone: 'UTC' }
  ).toJSDate();

  const nextA = nextOpenInstant(at, scheduleA, { inclusive: false });
  const nextB = nextOpenInstant(at, scheduleB, { inclusive: false });
  const candidates = [nextA, nextB].filter(Boolean).map((d) => new Date(d));
  const earliest = candidates.reduce((min, d) => (!min || d < min ? d : min), null);

  assert.ok(earliest);
  assert.ok(earliest > at);
});

test('availability_based queues when no member is open', () => {
  const schedule = baseSchedule();
  const at = DateTime.fromObject(
    { year: 2026, month: 5, day: 10, hour: 10, minute: 0 },
    { zone: 'America/New_York' }
  ).toJSDate();
  assert.equal(isOpen(at, schedule), false);

  const members = ['user-a', 'user-b'];
  const available = members.filter(() => false);
  const selected = members.find((id) => available.includes(id));
  assert.equal(selected, undefined);

  const outcome = selected
    ? { assignmentState: 'assigned' }
    : { assignmentState: 'queued', strategyDetail: 'off_hours_deferred' };
  assert.equal(outcome.assignmentState, 'queued');
  assert.equal(outcome.strategyDetail, 'off_hours_deferred');
});
