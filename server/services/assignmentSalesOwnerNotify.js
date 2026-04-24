const domainEvents = require('../constants/domainEvents');
const { emitNotification } = require('./notificationEngine');

function toIdString(value) {
  if (value == null) return null;
  return value.toString ? value.toString() : String(value);
}

/**
 * Emit notifications when SALES assignment automation assigns or reassigns a record owner.
 * Shared by immediate execution and scheduled job application.
 *
 * @param {Object} params
 * @param {import('mongoose').Types.ObjectId|string} params.organizationId - Tenant organization id
 * @param {string} params.moduleKey - people | deals | tasks | organizations
 * @param {import('mongoose').Document} params.record - Persisted document (after owner field set)
 * @param {import('mongoose').Types.ObjectId|null} [params.triggeredBy] - Actor for immediate runs; null for scheduler
 * @returns {Promise<void>}
 */
function emitSalesRecordOwnerAssignedNotify({ organizationId, moduleKey, record, triggeredBy = null }) {
  const key = String(moduleKey || '').toLowerCase();
  const base = {
    organizationId,
    triggeredBy,
    sourceAppKey: 'SALES'
  };
  const rid = toIdString(record._id);

  if (key === 'tasks') {
    return emitNotification({
      eventType: domainEvents.TASK_ASSIGNED,
      entity: {
        type: 'Task',
        id: rid,
        title: record.title,
        status: record.status,
        priority: record.priority
      },
      ...base
    });
  }
  if (key === 'people') {
    return emitNotification({
      eventType: domainEvents.PEOPLE_ASSIGNED,
      entity: { type: 'Person', id: rid },
      ...base
    });
  }
  if (key === 'deals') {
    return emitNotification({
      eventType: domainEvents.DEAL_ASSIGNED,
      entity: { type: 'Deal', id: rid, name: record.name },
      ...base
    });
  }
  if (key === 'organizations') {
    return emitNotification({
      eventType: domainEvents.ORGANIZATION_ASSIGNED,
      entity: { type: 'Organization', id: rid, name: record.name },
      ...base
    });
  }
  return Promise.resolve();
}

module.exports = {
  emitSalesRecordOwnerAssignedNotify
};
