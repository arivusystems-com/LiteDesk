/**
 * ============================================================================
 * Phase 0K: Execution Feedback Registry
 * ============================================================================
 * 
 * Pure metadata layer that explains why an execution action is available or blocked.
 * 
 * Purpose:
 * - Maps execution entitlement results → UX-safe explanations
 * - Enables consistent UX, clear error/tooltips
 * - Safe reuse by Platform UI, Audit App, Portal, and Process Designer
 * 
 * Design Rules:
 * - ❌ No UI components
 * - ❌ No new permissions
 * - ❌ No execution logic
 * - ✅ Metadata only
 * - ✅ Reusable everywhere
 * - ✅ Safe for Audit & Portal
 * - ✅ Ready for Process Designer
 * 
 * ============================================================================
 */

/**
 * Severity levels for feedback
 */
const FEEDBACK_SEVERITY = {
    NONE: 'NONE',           // No message (execution allowed)
    INFO: 'INFO',           // Informational (trial active, etc.)
    WARNING: 'WARNING',     // Warning (trial expired, etc.)
    ERROR: 'ERROR'          // Error (blocked, seat required, etc.)
};

/**
 * Execution Feedback Registry
 * 
 * Maps execution entitlement reason codes to user-friendly feedback objects.
 * 
 * Structure:
 * - code: Unique identifier matching reason code
 * - severity: Feedback severity level (NONE, INFO, WARNING, ERROR)
 * - title: Short title for UI (null if no title needed)
 * - message: User-friendly message explaining the state
 */
const EXECUTION_FEEDBACK = {
    // ============================================================================
    // ALLOWED STATES (Execution is permitted)
    // ============================================================================
    
    ALLOWED: {
        code: 'ALLOWED',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    TRIAL_EXECUTION_ALLOWED: {
        code: 'TRIAL_EXECUTION_ALLOWED',
        severity: FEEDBACK_SEVERITY.INFO,
        title: 'Trial Active',
        message: 'You can execute actions during your trial period.'
    },

    INTERNAL_INSTANCE_OVERRIDE: {
        code: 'INTERNAL_INSTANCE_OVERRIDE',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    PLATFORM_ADMIN_ACCESS: {
        code: 'PLATFORM_ADMIN_ACCESS',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    ADMIN_VISIBILITY_ALLOWED: {
        code: 'ADMIN_VISIBILITY_ALLOWED',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    ADMIN_CONFIGURE_ALLOWED: {
        code: 'ADMIN_CONFIGURE_ALLOWED',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    OWNER_IMPLICIT_ADMIN: {
        code: 'OWNER_IMPLICIT_ADMIN',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    EXPLICIT_EXECUTION_ACCESS: {
        code: 'EXPLICIT_EXECUTION_ACCESS',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    LEGACY_EXECUTION_ACCESS: {
        code: 'LEGACY_EXECUTION_ACCESS',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    EXPLICIT_EXECUTION_SEAT: {
        code: 'EXPLICIT_EXECUTION_SEAT',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    LEGACY_EXECUTION_SEAT: {
        code: 'LEGACY_EXECUTION_SEAT',
        severity: FEEDBACK_SEVERITY.NONE,
        title: null,
        message: null
    },

    // ============================================================================
    // BLOCKED STATES (Execution is not permitted)
    // ============================================================================

    TRIAL_EXPIRED: {
        code: 'TRIAL_EXPIRED',
        severity: FEEDBACK_SEVERITY.WARNING,
        title: 'Trial Ended',
        message: 'Your trial has ended. Please subscribe to continue execution.'
    },

    SUBSCRIPTION_REQUIRED: {
        code: 'SUBSCRIPTION_REQUIRED',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Subscription Required',
        message: 'An active subscription is required to perform this action.'
    },

    EXECUTION_SEAT_REQUIRED: {
        code: 'EXECUTION_SEAT_REQUIRED',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Seat Required',
        message: 'This action requires an active execution seat.'
    },

    INSTANCE_BLOCKED: {
        code: 'INSTANCE_BLOCKED',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Instance Blocked',
        message: 'Your instance is currently suspended or terminated.'
    },

    APP_NOT_FOUND: {
        code: 'APP_NOT_FOUND',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Application Not Found',
        message: 'The requested application is not available.'
    },

    APP_NOT_ENABLED_FOR_TENANT: {
        code: 'APP_NOT_ENABLED_FOR_TENANT',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Application Not Enabled',
        message: 'This application is not enabled for your organization.'
    },

    PLATFORM_ONLY_APP: {
        code: 'PLATFORM_ONLY_APP',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Restricted Access',
        message: 'This application is available only to platform administrators.'
    },

    NO_EXPLICIT_APP_ACCESS: {
        code: 'NO_EXPLICIT_APP_ACCESS',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Access Denied',
        message: 'You do not have access to this application.'
    },

    ADMIN_CANNOT_EXECUTE: {
        code: 'ADMIN_CANNOT_EXECUTE',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Execution Not Allowed',
        message: 'Administrative access does not grant execution permissions. An active execution seat is required.'
    },

    EXECUTION_CANNOT_CONFIGURE: {
        code: 'EXECUTION_CANNOT_CONFIGURE',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Configuration Not Allowed',
        message: 'Execution access does not allow configuration changes. Administrative access is required.'
    },

    CONTROL_PLANE_ACCESS_DENIED: {
        code: 'CONTROL_PLANE_ACCESS_DENIED',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Access Denied',
        message: 'Control plane access is restricted to platform administrators.'
    },

    CONTROL_PLANE_NO_EXECUTION: {
        code: 'CONTROL_PLANE_NO_EXECUTION',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Execution Not Supported',
        message: 'The control plane does not support execution operations.'
    },

    ORGANIZATION_NOT_FOUND: {
        code: 'ORGANIZATION_NOT_FOUND',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Organization Not Found',
        message: 'Your organization could not be found. Please contact support.'
    },

    INVALID_ROLE_FOR_APP: {
        code: 'INVALID_ROLE_FOR_APP',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Invalid Role',
        message: 'The assigned role is not valid for this application.'
    },

    NO_DEFAULT_ROLE_FOR_APP: {
        code: 'NO_DEFAULT_ROLE_FOR_APP',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Role Configuration Error',
        message: 'No default role is configured for this application. Please contact support.'
    },

    EXECUTION_NOT_ALLOWED: {
        code: 'EXECUTION_NOT_ALLOWED',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Execution Not Allowed',
        message: 'You do not have permission to execute this action.'
    },

    UNKNOWN: {
        code: 'UNKNOWN',
        severity: FEEDBACK_SEVERITY.ERROR,
        title: 'Unknown Error',
        message: 'An unknown error occurred while checking execution permissions.'
    }
};

module.exports = {
    FEEDBACK_SEVERITY,
    EXECUTION_FEEDBACK
};

