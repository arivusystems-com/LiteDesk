/**
 * ============================================================================
 * Phase 0K: Execution Feedback Resolver
 * ============================================================================
 * 
 * Utility that resolves execution entitlement results to user-friendly feedback.
 * 
 * Responsibilities:
 * - Accepts execution entitlement result or access resolution result
 * - Returns normalized feedback object
 * - Never throws
 * - No permissions logic
 * - Pure metadata transformation
 * 
 * Design Rules:
 * - ❌ No UI components
 * - ❌ No new permissions
 * - ❌ No execution logic
 * - ✅ Metadata only
 * - ✅ Safe for all apps (CRM, AUDIT, PORTAL)
 * - ✅ Ready for Process Designer
 * 
 * ============================================================================
 */

const { EXECUTION_FEEDBACK } = require('../constants/executionFeedbackRegistry');

/**
 * Resolve execution feedback from entitlement result
 * 
 * @param {Object} entitlementResult - Execution entitlement result from resolveExecutionEntitlement or resolveAppAccess
 * @returns {Object} Normalized feedback object
 * 
 * @example
 * const entitlement = await resolveExecutionEntitlement({ user, organization, instance, appKey, intent });
 * const feedback = resolveExecutionFeedback(entitlement);
 * // Returns: { code: 'TRIAL_EXPIRED', severity: 'WARNING', title: 'Trial Ended', message: '...' }
 */
function resolveExecutionFeedback(entitlementResult) {
    // Guard: Handle null/undefined
    if (!entitlementResult) {
        return EXECUTION_FEEDBACK.UNKNOWN;
    }

    // Guard: Handle missing reason
    if (!entitlementResult.reason) {
        // If allowed is true but no reason, assume allowed
        if (entitlementResult.allowed === true) {
            return EXECUTION_FEEDBACK.ALLOWED;
        }
        // Otherwise, unknown error
        return EXECUTION_FEEDBACK.UNKNOWN;
    }

    // If execution is allowed, return corresponding feedback
    if (entitlementResult.allowed === true) {
        // Look up feedback by reason code
        const feedback = EXECUTION_FEEDBACK[entitlementResult.reason];
        
        // If found, return it
        if (feedback) {
            return feedback;
        }
        
        // If not found but allowed, return generic allowed feedback
        return EXECUTION_FEEDBACK.ALLOWED;
    }

    // Execution is blocked - look up feedback by reason code
    const feedback = EXECUTION_FEEDBACK[entitlementResult.reason];
    
    // If found, return it
    if (feedback) {
        return feedback;
    }

    // Fallback: Unknown error or unmapped reason code
    return EXECUTION_FEEDBACK.EXECUTION_NOT_ALLOWED;
}

/**
 * Resolve feedback from access resolution result
 * 
 * Convenience wrapper for access resolution results
 * 
 * @param {Object} accessResult - Access resolution result from resolveAppAccess
 * @returns {Object} Normalized feedback object
 */
function resolveAccessFeedback(accessResult) {
    return resolveExecutionFeedback(accessResult);
}

module.exports = {
    resolveExecutionFeedback,
    resolveAccessFeedback
};

