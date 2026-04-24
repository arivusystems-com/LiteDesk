const TenantAppConfiguration = require('../models/TenantAppConfiguration');

const DEFAULT_PRIORITY_TARGETS_MINUTES = {
  Low: { firstResponseMinutes: 8 * 60, resolutionMinutes: 72 * 60 },
  Medium: { firstResponseMinutes: 4 * 60, resolutionMinutes: 48 * 60 },
  High: { firstResponseMinutes: 2 * 60, resolutionMinutes: 24 * 60 },
  Critical: { firstResponseMinutes: 1 * 60, resolutionMinutes: 8 * 60 }
};

function parseTimeToMinutes(value, fallbackMinutes) {
  if (!value || typeof value !== 'string' || !value.includes(':')) return fallbackMinutes;
  const [hh, mm] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return fallbackMinutes;
  return (hh * 60) + mm;
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function startOfBusinessWindow(date, startMinutes) {
  const d = cloneDate(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(startMinutes);
  return d;
}

function endOfBusinessWindow(date, endMinutes) {
  const d = cloneDate(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(endMinutes);
  return d;
}

function nextDay(date) {
  const d = cloneDate(date);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeBusinessHours(input = null) {
  const candidate = input && typeof input === 'object' ? input : {};
  const workingDays = Array.isArray(candidate.workingDays) && candidate.workingDays.length > 0
    ? candidate.workingDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [1, 2, 3, 4, 5];

  const startMinutes = parseTimeToMinutes(candidate.startTime, 9 * 60);
  const endMinutes = parseTimeToMinutes(candidate.endTime, 18 * 60);

  return {
    enabled: Boolean(candidate.enabled),
    timezone: candidate.timezone || 'UTC',
    workingDays,
    startTime: candidate.startTime || '09:00',
    endTime: candidate.endTime || '18:00',
    startMinutes,
    endMinutes: endMinutes > startMinutes ? endMinutes : (startMinutes + 60)
  };
}

function addMinutesWithinBusinessHours(startAt, minutesToAdd, businessHours) {
  if (!businessHours?.enabled) {
    return new Date(startAt.getTime() + (minutesToAdd * 60000));
  }

  let remaining = Math.max(0, Number(minutesToAdd) || 0);
  let cursor = cloneDate(startAt);
  let guard = 0;

  while (remaining > 0 && guard < 20000) {
    guard += 1;
    const day = cursor.getDay();
    const isWorkingDay = businessHours.workingDays.includes(day);
    const dayStart = startOfBusinessWindow(cursor, businessHours.startMinutes);
    const dayEnd = endOfBusinessWindow(cursor, businessHours.endMinutes);

    if (!isWorkingDay || cursor >= dayEnd) {
      cursor = startOfBusinessWindow(nextDay(cursor), businessHours.startMinutes);
      continue;
    }

    if (cursor < dayStart) {
      cursor = dayStart;
    }

    const availableMinutes = Math.floor((dayEnd.getTime() - cursor.getTime()) / 60000);
    if (availableMinutes <= 0) {
      cursor = startOfBusinessWindow(nextDay(cursor), businessHours.startMinutes);
      continue;
    }

    const consume = Math.min(availableMinutes, remaining);
    cursor = new Date(cursor.getTime() + (consume * 60000));
    remaining -= consume;
  }

  return cursor;
}

function normalizeTargets(targets = {}) {
  return {
    firstResponseMinutes: Number(targets.firstResponseMinutes) > 0
      ? Number(targets.firstResponseMinutes)
      : 4 * 60,
    resolutionMinutes: Number(targets.resolutionMinutes) > 0
      ? Number(targets.resolutionMinutes)
      : 48 * 60
  };
}

async function loadHelpdeskSlaConfig(organizationId) {
  try {
    const appConfig = await TenantAppConfiguration.findOne({
      organizationId,
      appKey: 'HELPDESK',
      enabled: true
    })
      .select('settings')
      .lean();

    const rootSettings = appConfig?.settings && typeof appConfig.settings === 'object'
      ? appConfig.settings
      : {};
    const settings = rootSettings.helpdeskExecution && typeof rootSettings.helpdeskExecution === 'object'
      ? rootSettings.helpdeskExecution
      : rootSettings;

    return {
      priorities: settings.slaPriorityTargets || DEFAULT_PRIORITY_TARGETS_MINUTES,
      businessHours: normalizeBusinessHours(settings.businessHours || null),
      defaultPolicyKey: settings.defaultSlaPolicyKey || null,
      policies: Array.isArray(settings.slaPolicies) ? settings.slaPolicies : []
    };
  } catch (error) {
    console.warn('[helpdeskSlaService] Failed to load tenant SLA config. Falling back to defaults:', error.message);
    return {
      priorities: DEFAULT_PRIORITY_TARGETS_MINUTES,
      businessHours: normalizeBusinessHours(null),
      defaultPolicyKey: null,
      policies: []
    };
  }
}

function resolvePolicyForCase(config, { caseType, priority, channel }) {
  const policies = Array.isArray(config.policies) ? config.policies : [];
  const defaultPolicy = policies.find((p) => p?.key && p.key === config.defaultPolicyKey) || null;

  const matched = policies.find((policy) => {
    if (!policy || typeof policy !== 'object') return false;
    if (Array.isArray(policy.caseTypes) && policy.caseTypes.length > 0 && !policy.caseTypes.includes(caseType)) {
      return false;
    }
    if (Array.isArray(policy.channels) && policy.channels.length > 0 && !policy.channels.includes(channel)) {
      return false;
    }
    if (Array.isArray(policy.priorities) && policy.priorities.length > 0 && !policy.priorities.includes(priority)) {
      return false;
    }
    return true;
  }) || defaultPolicy;

  const policyPriorityTargets = matched?.priorityTargets?.[priority];
  const fallbackPriorityTargets = config.priorities?.[priority];
  const targets = normalizeTargets(policyPriorityTargets || fallbackPriorityTargets || {});

  return {
    policyKey: matched?.key || 'default',
    policyName: matched?.name || 'Default SLA Policy',
    targets
  };
}

function buildPolicySnapshot(policy, context, businessHours, computedAt) {
  return {
    key: policy.policyKey,
    name: policy.policyName,
    caseType: context.caseType,
    priority: context.priority,
    channel: context.channel,
    firstResponseMinutes: policy.targets.firstResponseMinutes,
    resolutionMinutes: policy.targets.resolutionMinutes,
    businessHours: {
      enabled: businessHours.enabled,
      timezone: businessHours.timezone,
      workingDays: businessHours.workingDays,
      startTime: businessHours.startTime,
      endTime: businessHours.endTime
    },
    computedAt
  };
}

async function computeSlaTargetsForCase(organizationId, context, startedAt = new Date()) {
  const config = await loadHelpdeskSlaConfig(organizationId);
  const businessHours = config.businessHours;
  const policy = resolvePolicyForCase(config, context);
  const responseTargetAt = addMinutesWithinBusinessHours(startedAt, policy.targets.firstResponseMinutes, businessHours);
  const resolutionTargetAt = addMinutesWithinBusinessHours(startedAt, policy.targets.resolutionMinutes, businessHours);

  return {
    responseTargetAt,
    resolutionTargetAt,
    policySnapshot: buildPolicySnapshot(policy, context, businessHours, new Date())
  };
}

async function applySlaTargetsToCycle({ organizationId, cycle, context, startedAt }) {
  const effectiveStart = startedAt || cycle.startedAt || new Date();
  const targets = await computeSlaTargetsForCase(organizationId, context, effectiveStart);
  return {
    ...cycle,
    responseTargetAt: targets.responseTargetAt,
    resolutionTargetAt: targets.resolutionTargetAt,
    policySnapshot: targets.policySnapshot
  };
}

module.exports = {
  loadHelpdeskSlaConfig,
  computeSlaTargetsForCase,
  applySlaTargetsToCycle
};
