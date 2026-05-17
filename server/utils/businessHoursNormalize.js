'use strict';

/**
 * Normalize wall-clock strings from HTML time inputs (HH:MM:SS) to HH:MM.
 */
function normalizeTimeHHMM(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return raw;
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeWeek(week) {
  if (!Array.isArray(week)) return week;
  return week.map((day) => ({
    ...day,
    windows: (day.windows || []).map((w) => ({
      start: normalizeTimeHHMM(w.start),
      end: normalizeTimeHHMM(w.end)
    })),
    breaks: (day.breaks || []).map((b) => ({
      start: normalizeTimeHHMM(b.start),
      end: normalizeTimeHHMM(b.end)
    }))
  }));
}

function normalizeLinkedTo(linkedTo) {
  if (!linkedTo || typeof linkedTo !== 'object') {
    return { type: 'company', id: null };
  }
  const type = linkedTo.type || 'company';
  if (type === 'company') {
    return { type: 'company', id: null };
  }
  return {
    type,
    id: linkedTo.id || null
  };
}

function normalizeBusinessHourSetBody(body) {
  const normalized = { ...body };
  if (body.week) normalized.week = normalizeWeek(body.week);
  if (body.linkedTo) normalized.linkedTo = normalizeLinkedTo(body.linkedTo);
  return normalized;
}

module.exports = {
  normalizeTimeHHMM,
  normalizeWeek,
  normalizeLinkedTo,
  normalizeBusinessHourSetBody
};
