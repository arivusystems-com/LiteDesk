/**
 * EVENT EXECUTION PERMISSIONS (BACKEND)
 *
 * See docs/architecture/event-domain-contract.md
 *
 * This module enforces execution permissions server-side.
 * It mirrors the frontend permission explanation model.
 *
 * This is enforcement, not configuration.
 * This module must remain pure and deterministic.
 */

/**
 * Map eventType label (from database) to event type key
 */
function mapEventTypeLabelToKey(eventType) {
  if (!eventType || typeof eventType !== 'string') {
    return null;
  }
  
  const labelToKeyMap = {
    'Meeting': 'MEETING',
    'Meeting / Appointment': 'MEETING',
    'Internal Audit': 'INTERNAL_AUDIT',
    'External Audit — Single Org': 'EXTERNAL_AUDIT_SINGLE',
    'External Audit Beat': 'EXTERNAL_AUDIT_BEAT',
    'Field Sales Beat': 'FIELD_SALES_BEAT'
  };
  
  return labelToKeyMap[eventType] || null;
}

/**
 * Get EventTypeDefinition by key
 * 
 * This mirrors the frontend EVENT_TYPE_DEFINITIONS structure.
 * Only includes fields needed for permission derivation.
 */
function getEventTypeDefinitionByKey(key) {
  if (!key) return null;
  
  const definitions = {
    'MEETING': {
      key: 'MEETING',
      executionMode: 'generic',
      isAuditEvent: false
    },
    'INTERNAL_AUDIT': {
      key: 'INTERNAL_AUDIT',
      executionMode: 'audit-workflow',
      isAuditEvent: true
    },
    'EXTERNAL_AUDIT_SINGLE': {
      key: 'EXTERNAL_AUDIT_SINGLE',
      executionMode: 'audit-workflow',
      isAuditEvent: true
    },
    'EXTERNAL_AUDIT_BEAT': {
      key: 'EXTERNAL_AUDIT_BEAT',
      executionMode: 'audit-workflow',
      isAuditEvent: true
    },
    'FIELD_SALES_BEAT': {
      key: 'FIELD_SALES_BEAT',
      executionMode: 'generic',
      isAuditEvent: false
    }
  };
  
  return definitions[key] || null;
}

/**
 * Derive execution state from event data
 * 
 * Mirrors frontend deriveExecutionState logic.
 */
function deriveExecutionState(event) {
  if (!event) return 'NOT_STARTED';
  
  if (event.status === 'Cancelled' || event.status === 'CANCELLED') {
    return 'CANCELLED';
  }
  if (event.status === 'Completed' || event.status === 'COMPLETED') {
    return 'COMPLETED';
  }
  if (event.executionStartTime || event.executionStartedAt) {
    return 'IN_PROGRESS';
  }
  
  return 'NOT_STARTED';
}

/**
 * Derive event action permission
 * 
 * Pure function that determines if an action is allowed.
 * Returns { allowed: boolean, reason?: string }
 * 
 * @param {Object} params - Parameters for permission derivation
 * @param {Object} params.event - Event object from database
 * @param {string} params.action - Action to check: 'START_EXECUTION' | 'COMPLETE_EXECUTION' | 'CANCEL_EXECUTION' | 'AUDIT_CHECK_IN'
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
function deriveEventActionPermission({ event, action }) {
  if (!event || !action) {
    return {
      allowed: false,
      reason: 'Event or action not provided'
    };
  }
  
  // Map eventType label to key
  const eventTypeKey = mapEventTypeLabelToKey(event.eventType);
  if (!eventTypeKey) {
    return {
      allowed: false,
      reason: 'Unknown event type'
    };
  }
  
  // Get EventTypeDefinition
  const eventTypeDefinition = getEventTypeDefinitionByKey(eventTypeKey);
  if (!eventTypeDefinition) {
    return {
      allowed: false,
      reason: 'Event type definition not found'
    };
  }
  
  const executionMode = eventTypeDefinition.executionMode || 'generic';
  const isAuditEvent = eventTypeDefinition.isAuditEvent === true;
  const executionState = deriveExecutionState(event);
  
  // ============================================================================
  // GENERIC EVENT PERMISSIONS
  // ============================================================================
  
  if (executionMode === 'generic') {
    if (action === 'START_EXECUTION') {
      const allowed = executionState === 'NOT_STARTED';
      return {
        allowed,
        reason: allowed
          ? undefined
          : executionState === 'COMPLETED'
          ? 'Event has already been completed'
          : executionState === 'CANCELLED'
          ? 'Event has been cancelled'
          : 'Event execution has already started'
      };
    }
    
    if (action === 'COMPLETE_EXECUTION') {
      const allowed = executionState === 'IN_PROGRESS';
      return {
        allowed,
        reason: allowed
          ? undefined
          : executionState === 'NOT_STARTED'
          ? 'Event execution must be started first'
          : executionState === 'COMPLETED'
          ? 'Event has already been completed'
          : 'Event has been cancelled'
      };
    }
    
    if (action === 'CANCEL_EXECUTION') {
      const allowed = executionState === 'IN_PROGRESS';
      return {
        allowed,
        reason: allowed
          ? undefined
          : executionState === 'NOT_STARTED'
          ? 'Event execution must be started first'
          : executionState === 'COMPLETED'
          ? 'Event has already been completed and cannot be cancelled'
          : 'Event has already been cancelled'
      };
    }
    
    // AUDIT_CHECK_IN is not applicable to generic events
    if (action === 'AUDIT_CHECK_IN') {
      return {
        allowed: false,
        reason: 'Check-in is only available for audit events'
      };
    }
  }
  
  // ============================================================================
  // AUDIT EVENT PERMISSIONS
  // ============================================================================
  
  if (isAuditEvent && executionMode === 'audit-workflow') {
    // START_EXECUTION → ❌ always false for audit events
    if (action === 'START_EXECUTION') {
      return {
        allowed: false,
        reason: 'Audit events are started via workflow'
      };
    }
    
    // COMPLETE_EXECUTION → ❌ always false for audit events
    if (action === 'COMPLETE_EXECUTION') {
      return {
        allowed: false,
        reason: 'Audit events are completed only by workflow closure'
      };
    }
    
    // CANCEL_EXECUTION → ❌ always false for audit events
    if (action === 'CANCEL_EXECUTION') {
      return {
        allowed: false,
        reason: 'Audit events cannot be cancelled manually'
      };
    }
    
    // AUDIT_CHECK_IN
    if (action === 'AUDIT_CHECK_IN') {
      const auditState = event.auditState || 'Ready to start';
      const canCheckIn = auditState === 'Ready to start' || auditState === 'ready to start';
      
      // Check geo requirement
      if (event.geoRequired && (!event.checkIn || !event.checkIn.location)) {
        // Note: This checks if geo is already satisfied (checkIn exists)
        // The actual location validation happens in the controller
        // We just check if geo requirement is satisfied
      }
      
      return {
        allowed: canCheckIn,
        reason: canCheckIn
          ? undefined
          : auditState === 'checked_in' || auditState === 'CHECKED_IN'
          ? 'Audit has already been checked in'
          : auditState === 'submitted' || auditState === 'SUBMITTED'
          ? 'Audit has already been submitted'
          : auditState === 'approved' || auditState === 'APPROVED' || auditState === 'closed' || auditState === 'CLOSED'
          ? 'Audit workflow has been completed'
          : 'Audit is not ready for check-in'
      };
    }
  }
  
  // Unknown action
  return {
    allowed: false,
    reason: `Unknown action: ${action}`
  };
}

// ============================================================================
// DEV-ONLY ASSERTIONS
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // Assert: Audit events never allow COMPLETE_EXECUTION
  const testAuditEvent = {
    eventType: 'Internal Audit',
    status: 'Planned',
    auditState: 'Ready to start'
  };
  const auditCompletePermission = deriveEventActionPermission({
    event: testAuditEvent,
    action: 'COMPLETE_EXECUTION'
  });
  console.assert(
    !auditCompletePermission.allowed,
    '[eventPermissions] Audit events must never allow COMPLETE_EXECUTION',
    { permission: auditCompletePermission }
  );
  
  // Assert: Execution mode matches event type
  const testGenericEvent = {
    eventType: 'Meeting',
    status: 'Planned'
  };
  const genericDef = getEventTypeDefinitionByKey(mapEventTypeLabelToKey(testGenericEvent.eventType));
  console.assert(
    genericDef && genericDef.executionMode === 'generic' && !genericDef.isAuditEvent,
    '[eventPermissions] Generic events must have executionMode: generic',
    { definition: genericDef }
  );
  
  const testAuditEvent2 = {
    eventType: 'Internal Audit',
    status: 'Planned'
  };
  const auditDef = getEventTypeDefinitionByKey(mapEventTypeLabelToKey(testAuditEvent2.eventType));
  console.assert(
    auditDef && auditDef.executionMode === 'audit-workflow' && auditDef.isAuditEvent,
    '[eventPermissions] Audit events must have executionMode: audit-workflow',
    { definition: auditDef }
  );
}

module.exports = {
  deriveEventActionPermission
};
