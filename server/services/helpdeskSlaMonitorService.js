const Case = require('../models/Case');
const TenantAppConfiguration = require('../models/TenantAppConfiguration');
const notificationDomainEvents = require('../constants/domainEvents');
const { emitNotification } = require('./notificationEngine');

const WARNING_THRESHOLD_PERCENT = 80;

function toIdString(value) {
  if (value == null) return null;
  return value.toString ? value.toString() : String(value);
}

function getSlaElapsedPercent(caseRecord) {
  const cycle = caseRecord?.currentSlaCycle;
  const startedAt = cycle?.startedAt ? new Date(cycle.startedAt) : null;
  const resolutionTargetAt = cycle?.resolutionTargetAt ? new Date(cycle.resolutionTargetAt) : null;
  if (!startedAt || !resolutionTargetAt) return null;
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(resolutionTargetAt.getTime())) return null;
  const total = resolutionTargetAt.getTime() - startedAt.getTime();
  if (total <= 0) return null;
  const elapsed = Date.now() - startedAt.getTime();
  return Math.max(0, Math.round((elapsed / total) * 100));
}

function getAlertState(caseRecord) {
  const existing = caseRecord.currentSlaCycle?.policySnapshot?.alerts;
  if (existing && typeof existing === 'object') return existing;
  return {
    warningNotifiedAt: null,
    breachNotifiedAt: null
  };
}

async function getOrganizationNotificationPrefs(organizationId, cache) {
  const key = toIdString(organizationId);
  if (cache.has(key)) return cache.get(key);

  const appConfig = await TenantAppConfiguration.findOne({
    organizationId,
    appKey: 'HELPDESK'
  })
    .select('settings.helpdeskExecution.notifications settings.notifications')
    .lean();
  const notifications = appConfig?.settings?.helpdeskExecution?.notifications ||
    appConfig?.settings?.notifications ||
    {};
  const prefs = {
    notifyOnSlaWarning: notifications.notifyOnSlaWarning !== false,
    notifyOnSlaBreach: notifications.notifyOnSlaBreach !== false
  };
  cache.set(key, prefs);
  return prefs;
}

async function emitCaseSlaNotification(caseRecord, eventType, elapsedPercent) {
  await emitNotification({
    eventType,
    entity: {
      type: 'Case',
      id: toIdString(caseRecord?._id),
      title: caseRecord?.title || '',
      status: caseRecord?.status || '',
      priority: caseRecord?.priority || '',
      elapsedPercent
    },
    organizationId: caseRecord?.organizationId || null,
    triggeredBy: null,
    sourceAppKey: 'HELPDESK'
  });
}

async function tickHelpdeskSlaNotifications() {
  const rows = await Case.find({
    deletedAt: null,
    status: { $nin: ['Resolved', 'Closed'] },
    'currentSlaCycle.status': { $in: ['running', 'paused'] },
    'currentSlaCycle.resolutionTargetAt': { $ne: null }
  })
    .select('_id organizationId title status priority currentSlaCycle')
    .limit(500);

  const orgPrefCache = new Map();
  let processed = 0;
  let warningSent = 0;
  let breachSent = 0;

  for (const row of rows) {
    try {
      processed += 1;
      const elapsedPercent = getSlaElapsedPercent(row);
      if (elapsedPercent == null) continue;

      const prefs = await getOrganizationNotificationPrefs(row.organizationId, orgPrefCache);
      const alerts = getAlertState(row);
      let changed = false;

      if (
        prefs.notifyOnSlaWarning &&
        elapsedPercent >= WARNING_THRESHOLD_PERCENT &&
        elapsedPercent < 100 &&
        !alerts.warningNotifiedAt
      ) {
        await emitCaseSlaNotification(row, notificationDomainEvents.CASE_SLA_WARNING, elapsedPercent);
        alerts.warningNotifiedAt = new Date();
        warningSent += 1;
        changed = true;
      }

      if (
        prefs.notifyOnSlaBreach &&
        elapsedPercent >= 100 &&
        !alerts.breachNotifiedAt
      ) {
        await emitCaseSlaNotification(row, notificationDomainEvents.CASE_SLA_BREACHED, elapsedPercent);
        alerts.breachNotifiedAt = new Date();
        breachSent += 1;
        changed = true;
      }

      if (changed) {
        row.currentSlaCycle.policySnapshot = {
          ...(row.currentSlaCycle.policySnapshot || {}),
          alerts
        };
        await row.save();
      }
    } catch (error) {
      console.error('[helpdeskSlaMonitorService] case processing failed:', error.message);
    }
  }

  return { processed, warningSent, breachSent };
}

module.exports = {
  tickHelpdeskSlaNotifications
};
