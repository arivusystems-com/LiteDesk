/**
 * AUDIT WORKFLOW PERMISSIONS (BACKEND)
 *
 * See docs/architecture/event-domain-contract.md
 *
 * This module enforces audit workflow transition permissions server-side.
 * It ensures audit state can only progress through valid workflow paths.
 *
 * This is enforcement, not configuration.
 * This module must remain pure and deterministic.
 */

/**
 * Derive audit workflow permission
 * 
 * Pure function that determines if a workflow action is allowed.
 * Returns { allowed: boolean, reason?: string }
 * 
 * @param {Object} params - Parameters for permission derivation
 * @param {Object} params.event - Event object from database
 * @param {string} params.action - Action to check: 'SUBMIT_AUDIT' | 'CLOSE_AUDIT' | 'REOPEN_AUDIT'
 * @param {Object} params.options - Optional additional context
 * @param {string} params.options.formResponseId - Form response ID (for SUBMIT_AUDIT)
 * @param {Array} params.options.formResponses - Array of form responses (for CLOSE_AUDIT to check corrective actions)
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
function deriveAuditWorkflowPermission({ event, action, options = {} }) {
  if (!event || !action) {
    return {
      allowed: false,
      reason: 'Event or action not provided'
    };
  }
  
  // Validate event is an audit event
  const auditEventTypes = ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'];
  if (!auditEventTypes.includes(event.eventType)) {
    return {
      allowed: false,
      reason: 'This event type does not support audit workflow'
    };
  }
  
  const auditState = event.auditState || 'Ready to start';
  
  // ============================================================================
  // SUBMIT_AUDIT
  // ============================================================================
  
  if (action === 'SUBMIT_AUDIT') {
    // Allowed only if auditState === 'checked_in' (case-insensitive)
    const normalizedState = (auditState || '').toLowerCase();
    const isCheckedIn = normalizedState === 'checked_in' || normalizedState === 'checked in';
    
    if (!isCheckedIn) {
      return {
        allowed: false,
        reason: auditState === 'Ready to start' || normalizedState === 'ready to start'
          ? 'Audit must be checked in before submission'
          : auditState === 'submitted' || normalizedState === 'submitted'
          ? 'Audit has already been submitted'
          : auditState === 'needs_review' || normalizedState === 'needs_review'
          ? 'Audit is already in review'
          : auditState === 'approved' || normalizedState === 'approved' || auditState === 'closed' || normalizedState === 'closed'
          ? 'Audit workflow has been completed'
          : `Audit is not in a valid state for submission. Current state: ${auditState}`
      };
    }
    
    // Require formResponseId
    if (!options.formResponseId) {
      return {
        allowed: false,
        reason: 'Form response ID is required for submission'
      };
    }
    
    return {
      allowed: true,
      reason: undefined
    };
  }
  
  // ============================================================================
  // CLOSE_AUDIT
  // ============================================================================
  
  if (action === 'CLOSE_AUDIT') {
    // Allowed only if auditState === 'needs_review' (case-insensitive)
    const normalizedState = (auditState || '').toLowerCase();
    const isNeedsReview = normalizedState === 'needs_review' || normalizedState === 'needs review';
    
    if (!isNeedsReview) {
      return {
        allowed: false,
        reason: auditState === 'Ready to start' || normalizedState === 'ready to start'
          ? 'Audit must be checked in and submitted before closing'
          : auditState === 'checked_in' || normalizedState === 'checked_in' || normalizedState === 'checked in'
          ? 'Audit must be submitted before closing'
          : auditState === 'submitted' || normalizedState === 'submitted' || auditState === 'pending_corrective' || normalizedState === 'pending_corrective'
          ? 'All corrective actions must be completed before closing'
          : auditState === 'approved' || normalizedState === 'approved' || auditState === 'closed' || normalizedState === 'closed'
          ? 'Audit has already been closed'
          : auditState === 'rejected' || normalizedState === 'rejected'
          ? 'Rejected audits cannot be closed'
          : `Audit is not in a valid state for closing. Current state: ${auditState}`
      };
    }
    
    // Check for pending corrective actions
    // This requires formResponses to be passed in options
    if (options.formResponses && Array.isArray(options.formResponses)) {
      const hasPendingCorrectiveActions = options.formResponses.some(response => {
        if (!response.correctiveActions || !Array.isArray(response.correctiveActions)) {
          return false;
        }
        
        // Check if any corrective action is not completed
        return response.correctiveActions.some(action => {
          return action.managerAction?.status !== 'completed';
        });
      });
      
      if (hasPendingCorrectiveActions) {
        return {
          allowed: false,
          reason: 'All corrective actions must be completed before closing the audit'
        };
      }
    }
    
    return {
      allowed: true,
      reason: undefined
    };
  }
  
  // ============================================================================
  // REOPEN_AUDIT
  // ============================================================================
  
  if (action === 'REOPEN_AUDIT') {
    // Allowed only if auditState === 'closed' (case-insensitive)
    const normalizedState = (auditState || '').toLowerCase();
    const isClosed = normalizedState === 'closed';
    
    if (!isClosed) {
      return {
        allowed: false,
        reason: auditState === 'Ready to start' || normalizedState === 'ready to start'
          ? 'Audit has not been closed yet'
          : auditState === 'checked_in' || normalizedState === 'checked_in' || normalizedState === 'checked in'
          ? 'Audit has not been closed yet'
          : auditState === 'submitted' || normalizedState === 'submitted' || auditState === 'pending_corrective' || normalizedState === 'pending_corrective'
          ? 'Audit has not been closed yet'
          : auditState === 'needs_review' || normalizedState === 'needs_review'
          ? 'Audit has not been closed yet'
          : auditState === 'approved' || normalizedState === 'approved'
          ? 'Audit has not been closed yet'
          : auditState === 'rejected' || normalizedState === 'rejected'
          ? 'Rejected audits cannot be reopened'
          : `Audit is not in a valid state for reopening. Current state: ${auditState}`
      };
    }
    
    return {
      allowed: true,
      reason: undefined
    };
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
  // Assert: Audit events must never bypass workflow
  const testAuditEvent = {
    eventType: 'Internal Audit',
    auditState: 'Ready to start'
  };
  
  // SUBMIT_AUDIT should not be allowed from 'Ready to start'
  const submitPermission = deriveAuditWorkflowPermission({
    event: testAuditEvent,
    action: 'SUBMIT_AUDIT',
    options: { formResponseId: 'test-id' }
  });
  console.assert(
    !submitPermission.allowed,
    '[auditWorkflowPermissions] SUBMIT_AUDIT must not be allowed from Ready to start',
    { permission: submitPermission }
  );
  
  // CLOSE_AUDIT should not be allowed from 'Ready to start'
  const closePermission = deriveAuditWorkflowPermission({
    event: testAuditEvent,
    action: 'CLOSE_AUDIT'
  });
  console.assert(
    !closePermission.allowed,
    '[auditWorkflowPermissions] CLOSE_AUDIT must not be allowed from Ready to start',
    { permission: closePermission }
  );
  
  // Assert: CLOSED audits must not accept submissions
  const closedAuditEvent = {
    eventType: 'Internal Audit',
    auditState: 'closed'
  };
  const closedSubmitPermission = deriveAuditWorkflowPermission({
    event: closedAuditEvent,
    action: 'SUBMIT_AUDIT',
    options: { formResponseId: 'test-id' }
  });
  console.assert(
    !closedSubmitPermission.allowed,
    '[auditWorkflowPermissions] CLOSED audits must not accept submissions',
    { permission: closedSubmitPermission }
  );
}

module.exports = {
  deriveAuditWorkflowPermission
};
