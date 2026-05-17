'use strict';

const BusinessHourSet = require('../models/BusinessHourSet');
const HolidayCalendar = require('../models/HolidayCalendar');
const User = require('../models/User');
const Group = require('../models/Group');
const {
  normalizeSchedule,
  formatScheduleSummary
} = require('./businessHoursEngine');

async function loadHolidayDates(calendarId) {
  if (!calendarId) return [];
  const cal = await HolidayCalendar.findById(calendarId).select('dates').lean();
  return (cal?.dates || []).map((row) => row.date);
}

async function enrichSetWithHolidays(setDoc) {
  if (!setDoc) return null;
  const holidayDates = await loadHolidayDates(setDoc.holidayCalendarId);
  return normalizeSchedule({
    ...setDoc,
    holidayDates
  });
}

async function loadSetById(organizationId, setId) {
  if (!setId) return null;
  const doc = await BusinessHourSet.findOne({
    _id: setId,
    organizationId
  }).lean();
  if (!doc) return null;
  return enrichSetWithHolidays(doc);
}

async function loadDefaultCompanySet(organizationId) {
  const doc = await BusinessHourSet.findOne({
    organizationId,
    isDefault: true,
    status: 'active'
  }).lean();
  if (!doc) {
    return BusinessHourSet.findOne({
      organizationId,
      'linkedTo.type': 'company',
      status: 'active'
    })
      .sort({ createdAt: 1 })
      .lean();
  }
  return doc;
}

async function loadActiveSetForLink(organizationId, type, id) {
  const query = {
    organizationId,
    status: 'active',
    'linkedTo.type': type
  };
  if (type === 'company') {
    query['linkedTo.id'] = null;
  } else {
    query['linkedTo.id'] = id;
  }
  return BusinessHourSet.findOne(query).lean();
}

/**
 * Resolve which business hour set applies for a user at a point in time.
 */
async function resolveBusinessSchedule({
  organizationId,
  userId = null,
  groupIds = null,
  at = new Date()
}) {
  const orgId = organizationId;

  if (userId) {
    const user = await User.findById(userId).select('businessHourSetId').lean();
    if (user?.businessHourSetId) {
      const doc = await BusinessHourSet.findById(user.businessHourSetId).lean();
      if (doc && doc.status === 'active') {
        const schedule = await enrichSetWithHolidays(doc);
        return wrapResolved(schedule, 'user', user.businessHourSetId, at);
      }
    }

    let groups = groupIds;
    if (!groups) {
      const memberships = await Group.find({
        organizationId: orgId,
        members: userId,
        isActive: { $ne: false }
      })
        .select('_id businessHourSetId name')
        .lean();
      groups = memberships;
    }

    if (Array.isArray(groups) && groups.length) {
      for (const group of groups) {
        if (group.businessHourSetId) {
          const doc = await BusinessHourSet.findById(group.businessHourSetId).lean();
          if (doc && doc.status === 'active') {
            const schedule = await enrichSetWithHolidays(doc);
            return wrapResolved(schedule, 'group', group.businessHourSetId, at, group.name);
          }
        }
        const byLink = await loadActiveSetForLink(orgId, 'group', group._id);
        if (byLink) {
          const schedule = await enrichSetWithHolidays(byLink);
          return wrapResolved(schedule, 'group', byLink._id, at, group.name);
        }
      }
    }

    const userLinked = await loadActiveSetForLink(orgId, 'user', userId);
    if (userLinked) {
      const schedule = await enrichSetWithHolidays(userLinked);
      return wrapResolved(schedule, 'user', userLinked._id, at);
    }
  }

  const companyDoc = await loadDefaultCompanySet(orgId);
  if (companyDoc) {
    const schedule = await enrichSetWithHolidays(companyDoc);
    return wrapResolved(schedule, 'company', companyDoc._id, at);
  }

  const fallback = normalizeSchedule({ name: '24/7', timezone: 'UTC', status: 'active' });
  return {
    schedule: fallback,
    setId: null,
    name: '24/7',
    source: 'fallback',
    sourceLabel: 'Always available',
    summary: '24/7 (no schedule configured)',
    timezone: 'UTC',
    at: new Date(at).toISOString()
  };
}

function wrapResolved(schedule, source, setId, at, groupName = null) {
  const sourceLabels = {
    user: 'Personal schedule',
    group: groupName ? `${groupName} schedule` : 'Team schedule',
    company: 'Company default'
  };

  return {
    schedule,
    setId: setId ? String(setId) : null,
    name: schedule.name,
    source,
    sourceLabel: sourceLabels[source] || source,
    summary: formatScheduleSummary(schedule),
    timezone: schedule.timezone,
    at: new Date(at).toISOString()
  };
}

async function ensureDefaultCompanySet(organizationId, timezone = 'UTC', userId = null) {
  const existing = await loadDefaultCompanySet(organizationId);
  if (existing) return existing;

  const { buildDefaultBusinessHourSetPayload } = require('../constants/businessHoursDefaults');
  const payload = buildDefaultBusinessHourSetPayload(organizationId, timezone);
  payload.createdBy = userId;
  payload.modifiedBy = userId;

  const created = await BusinessHourSet.create(payload);
  return created.toObject();
}

module.exports = {
  resolveBusinessSchedule,
  loadSetById,
  loadDefaultCompanySet,
  ensureDefaultCompanySet,
  enrichSetWithHolidays,
  loadHolidayDates
};
