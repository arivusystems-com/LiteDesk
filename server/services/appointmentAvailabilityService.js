const Event = require('../models/Event');

const DAY_MS = 24 * 60 * 60 * 1000;

function parseTimeToMinutes(timeStr) {
  const [h, m] = String(timeStr || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToDate(baseDate, minutes, timezone) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/**
 * Build slot start/end Date objects for a calendar day in local wall-clock (config timezone
 * applied as offset label only for MVP — slots use server-local day boundaries from date param).
 */
function generateDaySlots(config, dayStart) {
  const duration = config.slotDurationMinutes || 30;
  const buffer = config.bufferMinutes || 0;
  const startMin = parseTimeToMinutes(config.workingHours?.start);
  const endMin = parseTimeToMinutes(config.workingHours?.end);
  const step = duration + buffer;
  const slots = [];

  for (let m = startMin; m + duration <= endMin; m += step) {
    const start = minutesToDate(dayStart, m);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    slots.push({ start, end });
  }
  return slots;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * @param {import('../models/AppointmentBookingConfig')} config
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @param {ObjectId} ownerId
 * @param {ObjectId} organizationId
 */
async function getAvailableSlots(config, rangeStart, rangeEnd, ownerId, organizationId) {
  const availableDays = new Set(config.availableDays || [1, 2, 3, 4, 5]);
  const now = new Date();

  const existing = await Event.find({
    organizationId,
    eventOwnerId: ownerId,
    deletedAt: null,
    status: { $ne: 'Cancelled' },
    startDateTime: { $lt: rangeEnd },
    endDateTime: { $gt: rangeStart }
  })
    .select('startDateTime endDateTime')
    .lean();

  const results = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= rangeEnd) {
    const dayOfWeek = cursor.getDay();
    if (availableDays.has(dayOfWeek)) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor.getTime() + DAY_MS);
      let slots = generateDaySlots(config, dayStart);

      if (config.dailyCapacity != null && config.dailyCapacity > 0) {
        const bookedToday = existing.filter((e) => {
          const s = new Date(e.startDateTime);
          return s >= dayStart && s < dayEnd;
        }).length;
        if (bookedToday >= config.dailyCapacity) {
          cursor.setDate(cursor.getDate() + 1);
          continue;
        }
      }

      slots = slots.filter((slot) => {
        if (slot.start < now) return false;
        return !existing.some((ev) =>
          overlaps(slot.start, slot.end, new Date(ev.startDateTime), new Date(ev.endDateTime))
        );
      });

      for (const slot of slots) {
        results.push({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          timezone: config.workingHours?.timezone || 'UTC'
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

/**
 * Single-day slots for public API.
 */
async function getSlotsForDate(config, dateStr, ownerId, organizationId) {
  const day = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) {
    throw new Error('Invalid date');
  }
  const rangeStart = new Date(day);
  const rangeEnd = new Date(day.getTime() + DAY_MS);
  return getAvailableSlots(config, rangeStart, rangeEnd, ownerId, organizationId);
}

module.exports = {
  getAvailableSlots,
  getSlotsForDate,
  generateDaySlots,
  overlaps
};
