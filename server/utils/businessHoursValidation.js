'use strict';

const { DateTime } = require('luxon');

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTimeHHMM(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (HHMM.test(trimmed)) return true;
  return /^(\d{1,2}):(\d{2}):\d{2}$/.test(trimmed);
}

function parseTimeMinutes(value) {
  if (!isValidTimeHHMM(value)) return null;
  const parts = String(value).trim().split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return (h * 60) + m;
}

function isValidIanaTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  const trimmed = tz.trim();
  if (!trimmed) return false;
  const probe = DateTime.now().setZone(trimmed);
  return probe.isValid;
}

function validateTimeWindow(window, label) {
  if (!window || typeof window !== 'object') return `${label} must be an object`;
  if (!isValidTimeHHMM(window.start)) return `${label}.start must be HH:MM`;
  if (!isValidTimeHHMM(window.end)) return `${label}.end must be HH:MM`;
  const start = parseTimeMinutes(window.start);
  const end = parseTimeMinutes(window.end);
  if (end <= start) return `${label}.end must be after ${label}.start`;
  return null;
}

function validateDayEntry(dayEntry) {
  if (!dayEntry || typeof dayEntry !== 'object') return 'Each week day must be an object';
  if (!Number.isInteger(dayEntry.day) || dayEntry.day < 0 || dayEntry.day > 6) {
    return 'week[].day must be 0–6 (Sun–Sat)';
  }
  if (typeof dayEntry.enabled !== 'boolean') return `week[${dayEntry.day}].enabled must be boolean`;
  if (!Array.isArray(dayEntry.windows)) return `week[${dayEntry.day}].windows must be an array`;
  if (!Array.isArray(dayEntry.breaks)) return `week[${dayEntry.day}].breaks must be an array`;

  for (let i = 0; i < dayEntry.windows.length; i += 1) {
    const err = validateTimeWindow(dayEntry.windows[i], `week[${dayEntry.day}].windows[${i}]`);
    if (err) return err;
  }

  if (dayEntry.enabled && dayEntry.windows.length === 0) {
    return `week[${dayEntry.day}] is enabled but has no windows`;
  }

  for (let i = 0; i < dayEntry.breaks.length; i += 1) {
    const err = validateTimeWindow(dayEntry.breaks[i], `week[${dayEntry.day}].breaks[${i}]`);
    if (err) return err;
  }

  return null;
}

function validateWeek(week) {
  if (!Array.isArray(week) || week.length === 0) return 'week must be a non-empty array';
  const seen = new Set();
  for (const entry of week) {
    const err = validateDayEntry(entry);
    if (err) return err;
    if (seen.has(entry.day)) return `Duplicate week day: ${entry.day}`;
    seen.add(entry.day);
  }
  for (let d = 0; d <= 6; d += 1) {
    if (!seen.has(d)) return `week must include day ${d}`;
  }
  return null;
}

function validateBusinessHourSetInput(body, { isUpdate = false } = {}) {
  if (!isUpdate && (!body.name || typeof body.name !== 'string' || !body.name.trim())) {
    return 'name is required';
  }
  if (body.name != null && (typeof body.name !== 'string' || !body.name.trim())) {
    return 'name must be a non-empty string';
  }
  if (body.timezone != null && !isValidIanaTimezone(body.timezone)) {
    return 'timezone must be a valid IANA timezone';
  }
  if (body.week != null) {
    const weekErr = validateWeek(body.week);
    if (weekErr) return weekErr;
  }
  if (body.linkedTo != null) {
    const lt = body.linkedTo;
    if (!lt || typeof lt !== 'object') return 'linkedTo must be an object';
    if (!['company', 'group', 'user'].includes(lt.type)) {
      return 'linkedTo.type must be company, group, or user';
    }
    if (lt.type !== 'company' && !lt.id) return 'linkedTo.id is required for group and user scopes';
    if (lt.type === 'company' && lt.id) return 'linkedTo.id must be null for company scope';
  }
  if (body.status != null && !['active', 'inactive'].includes(body.status)) {
    return 'status must be active or inactive';
  }
  return null;
}

function validateHolidayCalendarInput(body) {
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return 'name is required';
  }
  if (body.dates != null) {
    if (!Array.isArray(body.dates)) return 'dates must be an array';
    for (let i = 0; i < body.dates.length; i += 1) {
      const row = body.dates[i];
      if (!row || typeof row !== 'object') return `dates[${i}] must be an object`;
      if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))) {
        return `dates[${i}].date must be YYYY-MM-DD`;
      }
      if (!row.name || typeof row.name !== 'string' || !row.name.trim()) {
        return `dates[${i}].name is required`;
      }
    }
  }
  return null;
}

module.exports = {
  isValidTimeHHMM,
  isValidIanaTimezone,
  parseTimeMinutes,
  validateWeek,
  validateBusinessHourSetInput,
  validateHolidayCalendarInput
};
