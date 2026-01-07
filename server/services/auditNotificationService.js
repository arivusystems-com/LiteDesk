const notificationEngine = require('./notificationEngine');
const domainEvents = require('../constants/domainEvents');

/**
 * Emits domain events for audit lifecycle without blocking request flows.
 */
function emitAuditAssigned({ eventId, organizationId, triggeredBy }) {
  if (!eventId || !organizationId) {
    return;
  }

  // Fire-and-forget; engine logs its own failures.
  notificationEngine.emitNotification({
    eventType: domainEvents.AUDIT_ASSIGNED,
    organizationId,
    entity: { type: 'Audit', id: eventId },
    triggeredBy,
    sourceAppKey: 'AUDIT'
  });
}

module.exports = {
  emitAuditAssigned
};

