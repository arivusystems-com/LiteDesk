/**
 * ============================================================================
 * Subscription Utilities
 * ============================================================================
 * 
 * Helper functions for subscription and seat management.
 * All functions validate app existence in both appRegistry and appPricingRegistry.
 * 
 * Rules:
 * - Seat usage is based on ACTIVE users with appAccess
 * - External users count if app is per-user
 * - Flat apps ignore seats
 * - All logic must validate app existence
 * 
 * SUBSCRIPTION RULE (NON-NEGOTIABLE):
 * ACTIVE and TRIAL are usable states
 * SUSPENDED and CANCELLED are blocked states
 * Missing subscription is blocked
 * 
 * ============================================================================
 */

const OrganizationSubscription = require('../models/OrganizationSubscription');
const User = require('../models/User');
const { getAppConfig } = require('./appAccessUtils');
const appPricingRegistry = require('../constants/appPricingRegistry');

/**
 * Get organization subscription document
 * @param {string|ObjectId} orgId - Organization ID
 * @returns {Promise<Object|null>} - Subscription document or null
 */
async function getOrgSubscription(orgId) {
    try {
        const subscription = await OrganizationSubscription.findOne({ organizationId: orgId });
        return subscription;
    } catch (error) {
        console.error(`[SubscriptionUtils] Error fetching subscription for org ${orgId}:`, error);
        return null;
    }
}

/**
 * Check if an app is subscribed for an organization
 * @param {string|ObjectId} orgId - Organization ID
 * @param {string} appKey - App key (CRM, AUDIT, PORTAL)
 * @returns {Promise<boolean>} - True if app is subscribed
 */
async function isAppSubscribed(orgId, appKey) {
    // Validate app exists in both registries
    const appConfig = getAppConfig(appKey);
    const pricingConfig = appPricingRegistry[appKey];
    
    if (!appConfig || !pricingConfig) {
        return false;
    }

    const subscription = await getOrgSubscription(orgId);
    if (!subscription) {
        return false;
    }

    const appSubscription = subscription.apps.find(app => app.appKey === appKey);
    return !!appSubscription;
}

/**
 * Get seat limit for an app in an organization
 * @param {string|ObjectId} orgId - Organization ID
 * @param {string} appKey - App key
 * @returns {Promise<number|null>} - Seat limit or null if unlimited
 */
async function getSeatLimit(orgId, appKey) {
    // Validate app exists
    const appConfig = getAppConfig(appKey);
    const pricingConfig = appPricingRegistry[appKey];
    
    if (!appConfig || !pricingConfig) {
        return null;
    }

    // FLAT apps don't have seat limits
    if (pricingConfig.billingType === 'FLAT') {
        return null;
    }

    const subscription = await getOrgSubscription(orgId);
    if (!subscription) {
        return null;
    }

    const appSubscription = subscription.apps.find(app => app.appKey === appKey);
    if (!appSubscription) {
        return null;
    }

    return appSubscription.seatLimit;
}

/**
 * Get current seats used for an app in an organization
 * @param {string|ObjectId} orgId - Organization ID
 * @param {string} appKey - App key
 * @returns {Promise<number>} - Number of seats used
 */
async function getSeatsUsed(orgId, appKey) {
    // Validate app exists
    const appConfig = getAppConfig(appKey);
    const pricingConfig = appPricingRegistry[appKey];
    
    if (!appConfig || !pricingConfig) {
        return 0;
    }

    // FLAT apps don't count seats
    if (pricingConfig.billingType === 'FLAT') {
        return 0;
    }

    try {
        // Count ACTIVE users with appAccess containing this appKey
        const count = await User.countDocuments({
            organizationId: orgId,
            status: 'active',
            appAccess: {
                $elemMatch: {
                    appKey: appKey,
                    status: 'ACTIVE'
                }
            }
        });

        return count;
    } catch (error) {
        console.error(`[SubscriptionUtils] Error counting seats for org ${orgId} app ${appKey}:`, error);
        return 0;
    }
}

/**
 * Check if a new user can be added to an app
 * 
 * SUBSCRIPTION RULE:
 * ACTIVE and TRIAL are usable states
 * Do NOT block TRIAL
 * 
 * @param {string|ObjectId} orgId - Organization ID
 * @param {string} appKey - App key
 * @returns {Promise<{allowed: boolean, reason?: string}>} - Result object
 */
async function canAddUserToApp(orgId, appKey) {
    // Validate app exists
    const appConfig = getAppConfig(appKey);
    const pricingConfig = appPricingRegistry[appKey];
    
    if (!appConfig || !pricingConfig) {
        return {
            allowed: false,
            reason: `App ${appKey} is not registered in the system`
        };
    }

    // FLAT apps always allow adding users
    if (pricingConfig.billingType === 'FLAT') {
        return { allowed: true };
    }

    // Check subscription exists
    const subscription = await getOrgSubscription(orgId);
    if (!subscription) {
        return {
            allowed: false,
            reason: 'Organization subscription not found'
        };
    }

    const appSubscription = subscription.apps.find(app => app.appKey === appKey);
    if (!appSubscription) {
        return {
            allowed: false,
            reason: `App ${appKey} is not subscribed`
        };
    }

    // SUBSCRIPTION RULE: ACTIVE and TRIAL are usable, SUSPENDED/CANCELLED are blocked
    // Check for expired trial (auto-suspend)
    if (appSubscription.status === 'TRIAL' && appSubscription.trialEndsAt) {
        if (new Date() > appSubscription.trialEndsAt) {
            // Auto-suspend expired trials
            await OrganizationSubscription.updateOne(
                { organizationId: orgId, 'apps.appKey': appKey },
                { $set: { 'apps.$.status': 'SUSPENDED' } }
            );
            appSubscription.status = 'SUSPENDED';
        }
    }

    // Use canonical helper to check if subscription is usable
    if (!isSubscriptionUsable(appSubscription)) {
        return {
            allowed: false,
            reason: `App ${appKey} subscription is ${appSubscription.status || 'not active'}`
        };
    }

    // Check seat limit
    const seatLimit = appSubscription.seatLimit;
    if (seatLimit === null) {
        // Unlimited
        return { allowed: true };
    }

    const seatsUsed = await getSeatsUsed(orgId, appKey);
    if (seatsUsed >= seatLimit) {
        return {
            allowed: false,
            reason: `Seat limit reached for ${appKey} app (${seatsUsed}/${seatLimit})`
        };
    }

    return { allowed: true };
}

/**
 * Increment seat usage for an app (atomic operation)
 * @param {string|ObjectId} orgId - Organization ID
 * @param {string} appKey - App key
 * @returns {Promise<boolean>} - True if successful
 */
async function incrementSeat(orgId, appKey) {
    // Validate app exists
    const appConfig = getAppConfig(appKey);
    const pricingConfig = appPricingRegistry[appKey];
    
    if (!appConfig || !pricingConfig) {
        return false;
    }

    // FLAT apps don't track seats
    if (pricingConfig.billingType === 'FLAT') {
        return true;
    }

    try {
        // Atomically increment seatsUsed
        const result = await OrganizationSubscription.updateOne(
            { organizationId: orgId, 'apps.appKey': appKey },
            { $inc: { 'apps.$.seatsUsed': 1 } }
        );

        // Recalculate actual seats used to keep in sync
        const actualSeatsUsed = await getSeatsUsed(orgId, appKey);
        await OrganizationSubscription.updateOne(
            { organizationId: orgId, 'apps.appKey': appKey },
            { $set: { 'apps.$.seatsUsed': actualSeatsUsed } }
        );

        return result.modifiedCount > 0;
    } catch (error) {
        console.error(`[SubscriptionUtils] Error incrementing seat for org ${orgId} app ${appKey}:`, error);
        return false;
    }
}

/**
 * Decrement seat usage for an app (atomic operation)
 * @param {string|ObjectId} orgId - Organization ID
 * @param {string} appKey - App key
 * @returns {Promise<boolean>} - True if successful
 */
async function decrementSeat(orgId, appKey) {
    // Validate app exists
    const appConfig = getAppConfig(appKey);
    const pricingConfig = appPricingRegistry[appKey];
    
    if (!appConfig || !pricingConfig) {
        return false;
    }

    // FLAT apps don't track seats
    if (pricingConfig.billingType === 'FLAT') {
        return true;
    }

    try {
        // Atomically decrement seatsUsed (but not below 0)
        const result = await OrganizationSubscription.updateOne(
            { 
                organizationId: orgId, 
                'apps.appKey': appKey,
                'apps.$.seatsUsed': { $gt: 0 }
            },
            { $inc: { 'apps.$.seatsUsed': -1 } }
        );

        // Recalculate actual seats used to keep in sync
        const actualSeatsUsed = await getSeatsUsed(orgId, appKey);
        await OrganizationSubscription.updateOne(
            { organizationId: orgId, 'apps.appKey': appKey },
            { $set: { 'apps.$.seatsUsed': actualSeatsUsed } }
        );

        return result.modifiedCount > 0;
    } catch (error) {
        console.error(`[SubscriptionUtils] Error decrementing seat for org ${orgId} app ${appKey}:`, error);
        return false;
    }
}

/**
 * Validate subscription status for an app
 * 
 * SUBSCRIPTION RULE:
 * ACTIVE and TRIAL are usable states
 * Do NOT block TRIAL
 * 
 * @param {string|ObjectId} orgId - Organization ID
 * @param {string} appKey - App key
 * @returns {Promise<{valid: boolean, status?: string, reason?: string}>} - Validation result
 */
async function validateSubscriptionStatus(orgId, appKey) {
    // Validate app exists
    const appConfig = getAppConfig(appKey);
    const pricingConfig = appPricingRegistry[appKey];
    
    if (!appConfig || !pricingConfig) {
        return {
            valid: false,
            reason: `App ${appKey} is not registered in the system`
        };
    }

    const subscription = await getOrgSubscription(orgId);
    if (!subscription) {
        return {
            valid: false,
            reason: 'Organization subscription not found'
        };
    }

    const appSubscription = subscription.apps.find(app => app.appKey === appKey);
    if (!appSubscription) {
        return {
            valid: false,
            reason: `App ${appKey} is not subscribed`
        };
    }

    // SUBSCRIPTION RULE: ACTIVE and TRIAL are usable, SUSPENDED/CANCELLED are blocked
    // Check for expired trial (auto-suspend)
    if (appSubscription.status === 'TRIAL' && appSubscription.trialEndsAt) {
        if (new Date() > appSubscription.trialEndsAt) {
            // Auto-suspend expired trials
            await OrganizationSubscription.updateOne(
                { organizationId: orgId, 'apps.appKey': appKey },
                { $set: { 'apps.$.status': 'SUSPENDED' } }
            );
            appSubscription.status = 'SUSPENDED';
        }
    }

    // Use canonical helper to check if subscription is usable
    if (isSubscriptionUsable(appSubscription)) {
        return {
            valid: true,
            status: appSubscription.status
        };
    }

    // Subscription is blocked
    return {
        valid: false,
        status: appSubscription.status || 'NONE',
        reason: `Subscription is ${appSubscription.status || 'not active'}`
    };
}

/**
 * ============================================================================
 * Canonical Subscription State Helpers (MANDATORY)
 * ============================================================================
 * 
 * These helpers enforce the subscription semantics rule:
 * - ACTIVE and TRIAL are usable states
 * - SUSPENDED and CANCELLED are blocked states
 * - Missing subscription is blocked
 * 
 * 🚫 No direct status === 'ACTIVE' checks allowed anywhere else
 * ============================================================================
 */

/**
 * Check if a subscription is in a usable state
 * @param {Object|null} subscription - App subscription object (from OrganizationSubscription.apps[])
 * @returns {boolean} - True if subscription is usable (ACTIVE or TRIAL)
 */
function isSubscriptionUsable(subscription) {
    if (!subscription) return false;
    return ['ACTIVE', 'TRIAL'].includes(subscription.status);
}

/**
 * Check if a subscription is in a blocked state
 * @param {Object|null} subscription - App subscription object
 * @returns {boolean} - True if subscription is blocked (SUSPENDED, CANCELLED, or missing)
 */
function isSubscriptionBlocked(subscription) {
    if (!subscription) return true;
    return ['SUSPENDED', 'CANCELLED'].includes(subscription.status);
}

/**
 * Assert that a subscription is usable, throw error if not
 * @param {Object|null} subscription - App subscription object
 * @param {string} appKey - App key for error message
 * @throws {Error} - Error with code 'SUBSCRIPTION_INACTIVE' and httpStatus 402
 */
function assertSubscriptionUsable(subscription, appKey) {
    if (!isSubscriptionUsable(subscription)) {
        const status = subscription?.status || 'NONE';
        const error = new Error(`Subscription for ${appKey} is not active`);
        error.code = 'SUBSCRIPTION_INACTIVE';
        error.httpStatus = 402;
        error.meta = { appKey, status };
        throw error;
    }
}

module.exports = {
    getOrgSubscription,
    isAppSubscribed,
    getSeatLimit,
    getSeatsUsed,
    canAddUserToApp,
    incrementSeat,
    decrementSeat,
    validateSubscriptionStatus,
    // Canonical subscription state helpers
    isSubscriptionUsable,
    isSubscriptionBlocked,
    assertSubscriptionUsable
};


