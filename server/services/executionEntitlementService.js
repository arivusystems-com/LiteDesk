/**
 * ============================================================================
 * Phase 0J: Execution Entitlement Service
 * ============================================================================
 * 
 * Clean, explicit execution entitlement layer that:
 * - Allows organization owners to execute during TRIAL
 * - Requires active subscription + seat for execution after trial
 * - Keeps ADMIN visibility non-billable
 * - Eliminates confusing execution errors
 * - Works uniformly across all apps
 * - Is future-proof for Process Designer
 * 
 * Core Principles (Non-Negotiable):
 * - ADMIN ≠ EXECUTION
 * - Trial grants temporary execution
 * - Subscription governs execution after trial
 * - Owner is billable if executing post-trial
 * - No free plan
 * - Platform admins (LiteDesk) are never billable
 * 
 * ============================================================================
 */

const Instance = require('../models/Instance');
const { INSTANCE_STATUS } = require('../constants/instanceLifecycle');

/**
 * Check if user email is a LiteDesk internal email
 * @param {string} email - User email
 * @returns {boolean} - True if internal email
 */
function isLiteDeskInternalEmail(email) {
    if (!email) return false;
    const internalDomains = [
        'litedesk.com',
        'litedesk.io',
        '@litedesk' // Allow any @litedesk domain
    ];
    const emailLower = email.toLowerCase();
    return internalDomains.some(domain => emailLower.includes(domain));
}

/**
 * Resolve execution entitlement for a user
 * 
 * @param {Object} params - Execution entitlement parameters
 * @param {Object} params.user - User object (must have _id, organizationId, email, isOwner, isPlatformAdmin, appAccess)
 * @param {Object} params.organization - Organization object (must have _id, subscription)
 * @param {Object} params.instance - Instance object (must have status)
 * @param {string} params.appKey - Application key (SALES, AUDIT, PORTAL, etc.)
 * @param {string} params.intent - Intent: 'EXECUTE' | 'CONFIGURE' | 'VIEW'
 * @returns {Object} Execution entitlement result
 * 
 * @returns {Object} result
 * @returns {boolean} result.allowed - Whether execution is allowed
 * @returns {boolean} result.billable - Whether this execution is billable
 * @returns {string|null} result.reason - Reason code for the decision
 */
function resolveExecutionEntitlement({ user, organization, instance, appKey, intent }) {
    // Initialize result object
    const result = {
        allowed: false,
        billable: false,
        reason: null
    };

    // ============================================================================
    // A. Platform Admin (LiteDesk internal)
    // ============================================================================
    // Platform admins are never billable and can always access (for VIEW/CONFIGURE)
    // For EXECUTE, they still need seats (future: platform admin override)
    const isPlatformAdmin = user.isPlatformAdmin === true || 
                           isLiteDeskInternalEmail(user.email);

    if (isPlatformAdmin) {
        // Platform admins can VIEW and CONFIGURE without restrictions
        if (intent === 'VIEW' || intent === 'CONFIGURE') {
            result.allowed = true;
            result.billable = false;
            result.reason = 'PLATFORM_ADMIN_ACCESS';
            return result;
        }
        
        // For EXECUTE, platform admins still need proper execution access
        // (This maintains billing integrity even for platform admins)
        // Fall through to normal execution checks
    }

    // ============================================================================
    // B. Instance Status Guards
    // ============================================================================
    // SUSPENDED or TERMINATED instances block all execution
    if (instance && (instance.status === INSTANCE_STATUS.SUSPENDED || 
                     instance.status === INSTANCE_STATUS.TERMINATED)) {
        result.allowed = false;
        result.billable = false;
        result.reason = 'INSTANCE_BLOCKED';
        return result;
    }

    // ============================================================================
    // C. Trial Mode (CRITICAL)
    // ============================================================================
    // Trial execution is instance-based, not seat-based
    // Owners can execute during TRIAL without a seat
    // BUT: Trial can expire - check organization subscription status
    const instanceStatus = instance ? instance.status : null;
    const subscriptionStatus = organization.subscription?.status;
    
    // Check if trial has expired (either via instance status or organization subscription)
    let trialExpired = false;
    if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
        trialExpired = true;
    } else if (organization.subscription?.trialEndDate) {
        // Check if trial end date has passed
        const trialEndDate = new Date(organization.subscription.trialEndDate);
        trialExpired = new Date() > trialEndDate;
    }
    
    if (instanceStatus === INSTANCE_STATUS.TRIAL || subscriptionStatus === 'trial') {
        // Check if trial has expired
        if (trialExpired && intent === 'EXECUTE') {
            result.allowed = false;
            result.billable = false;
            result.reason = 'TRIAL_EXPIRED';
            return result;
        }
        
        if (intent === 'EXECUTE') {
            // During trial, execution is allowed without seat requirement
            result.allowed = true;
            result.billable = false;
            result.reason = 'TRIAL_EXECUTION_ALLOWED';
            return result;
        }
        // For VIEW and CONFIGURE, trial allows access (fall through)
        // (Treat trial similar to active for non-execution intents)
    }

    // ============================================================================
    // D. Active Subscription Required Post-Trial
    // ============================================================================
    // After trial, execution requires active subscription
    if (instanceStatus === INSTANCE_STATUS.ACTIVE || 
        (!instanceStatus && organization.subscription)) {
        
        // Check if subscription is active
        // Organization.subscription.status can be: 'trial', 'active', 'expired', 'cancelled'
        const subscriptionStatus = organization.subscription?.status;
        const subscriptionIsActive = subscriptionStatus === 'active';

        if (!subscriptionIsActive && intent === 'EXECUTE') {
            // If instance is ACTIVE but subscription is not active, block execution
            if (instanceStatus === INSTANCE_STATUS.ACTIVE) {
                result.allowed = false;
                result.billable = false;
                result.reason = 'SUBSCRIPTION_REQUIRED';
                return result;
            }
            // If no instance but subscription exists and is not active, block execution
            if (!instanceStatus && subscriptionStatus && subscriptionStatus !== 'trial') {
                result.allowed = false;
                result.billable = false;
                result.reason = 'SUBSCRIPTION_REQUIRED';
                return result;
            }
        }
    }

    // ============================================================================
    // E. Execution Requires Seat After Trial
    // ============================================================================
    // After trial, EXECUTE intent requires explicit seat (user.appAccess entry)
    if (intent === 'EXECUTE' && 
        (instanceStatus === INSTANCE_STATUS.ACTIVE || 
         (!instanceStatus && organization.subscription?.status === 'active'))) {
        
        // Check if user has explicit app access (seat)
        const appAccess = user.appAccess || [];
        const userAppAccess = appAccess.find(
            access => access.appKey === appKey.toUpperCase() && access.status === 'ACTIVE'
        );

        // Backward compatibility: check allowedApps if appAccess is empty
        let hasLegacyAccess = false;
        if (!userAppAccess && (!appAccess || appAccess.length === 0)) {
            const allowedApps = user.allowedApps || [];
            hasLegacyAccess = allowedApps.includes(appKey.toUpperCase());
        }

        if (!userAppAccess && !hasLegacyAccess) {
            result.allowed = false;
            result.billable = false;
            result.reason = 'EXECUTION_SEAT_REQUIRED';
            return result;
        }

        // User has seat and can execute (billable)
        result.allowed = true;
        result.billable = true;
        result.reason = hasLegacyAccess ? 'LEGACY_EXECUTION_SEAT' : 'EXPLICIT_EXECUTION_SEAT';
        return result;
    }

    // ============================================================================
    // F. Admin Visibility (Always Allowed)
    // ============================================================================
    // VIEW and CONFIGURE intents are always allowed (non-billable)
    // This allows owners/admins to see and configure even without seats
    if (intent === 'VIEW' || intent === 'CONFIGURE') {
        result.allowed = true;
        result.billable = false;
        result.reason = intent === 'VIEW' ? 'ADMIN_VISIBILITY_ALLOWED' : 'ADMIN_CONFIGURE_ALLOWED';
        return result;
    }

    // ============================================================================
    // Default: Deny
    // ============================================================================
    // If we reach here, execution is not allowed
    result.allowed = false;
    result.billable = false;
    result.reason = 'EXECUTION_NOT_ALLOWED';
    return result;
}

/**
 * Get user-friendly error message for execution entitlement reason
 * 
 * @param {string} reason - Reason code from resolveExecutionEntitlement
 * @returns {string} User-friendly error message
 */
function getExecutionErrorMessage(reason) {
    const errorMessages = {
        'INSTANCE_BLOCKED': 'Your instance is currently suspended.',
        'SUBSCRIPTION_REQUIRED': 'An active subscription is required to execute actions.',
        'EXECUTION_SEAT_REQUIRED': 'This action requires an active user seat.',
        'EXECUTION_NOT_ALLOWED': 'This action is not allowed.',
        // Trial expiration is handled separately via organization subscription status
        'TRIAL_EXPIRED': 'Your trial has ended. Please subscribe to continue.'
    };

    return errorMessages[reason] || 'This action is not allowed.';
}

module.exports = {
    resolveExecutionEntitlement,
    getExecutionErrorMessage
};

