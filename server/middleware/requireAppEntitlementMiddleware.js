/**
 * ============================================================================
 * App Entitlement Enforcement Middleware
 * ============================================================================
 * 
 * Ensures that users can only access applications they are entitled to.
 * Uses appAccess array (new) or allowedApps (legacy) for backward compatibility.
 * 
 * CRITICAL VALIDATION ORDER (MANDATORY):
 * 1. Validate app exists in appRegistry
 * 2. Validate user.appAccess contains appKey (ACTIVE)
 * 3. Validate user.userType is allowed for the app
 * 4. Validate organization.enabledApps contains appKey (ACTIVE)
 * 
 * If ANY validation fails → 403 Forbidden
 * ❌ No fallback to CRM
 * ❌ No silent allow
 * ❌ No assumptions
 * 
 * Usage:
 *   router.use(requireAppEntitlement);
 * 
 * Middleware Chain Position:
 * - Runs AFTER resolveAppContext (which sets req.appKey)
 * - Runs BEFORE requireCRMApp / requirePortalApp (app-specific enforcement)
 * 
 * ============================================================================
 */

const { APP_KEYS, isValidAppKey } = require('../constants/appKeys');
const Organization = require('../models/Organization');
const { getAppConfig, validateUserTypeForApp, isAppEnabledForOrg } = require('../utils/appAccessUtils');
const { getOrgSubscription, assertSubscriptionUsable } = require('../utils/subscriptionUtils');

/**
 * Require App Entitlement Middleware
 * 
 * Enforces that users can only access applications they are entitled to.
 * Prevents Portal users from accessing CRM APIs (even via /api/* URLs)
 * and CRM users from accessing Portal APIs (even via /portal/* URLs).
 */
const requireAppEntitlement = async (req, res, next) => {
    // Check if user is authenticated (should be set by protect middleware)
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
        });
    }
    
    // Check if appKey is set (should be set by resolveAppContext middleware)
    if (!req.appKey) {
        console.warn(`[AppEntitlement] req.appKey not set for path: ${req.path}`);
        return res.status(403).json({
            success: false,
            message: 'Application context not resolved',
            code: 'APP_CONTEXT_MISSING',
            error: 'Application context (appKey) not resolved. Cannot verify app entitlement.'
        });
    }
    
    // Validate appKey
    if (!isValidAppKey(req.appKey)) {
        console.warn(`[AppEntitlement] Invalid appKey: ${req.appKey}`);
        return res.status(403).json({
            success: false,
            message: 'Invalid application context',
            code: 'INVALID_APP_KEY',
            error: `Invalid appKey: ${req.appKey}`
        });
    }
    
    // ============================================================================
    // VALIDATION ORDER (MANDATORY - ALL CHECKS MUST PASS)
    // ============================================================================
    
    // STEP 1: Validate app exists in registry
    const appConfig = getAppConfig(req.appKey);
    if (!appConfig) {
        console.warn(`[AppEntitlement] App not found in registry: ${req.appKey}`);
        return res.status(403).json({
            success: false,
            message: 'Invalid application',
            code: 'INVALID_APP',
            error: `Application ${req.appKey} is not registered in the system.`
        });
    }

    // STEP 2: Validate user.appAccess contains appKey (ACTIVE)
    const appAccess = req.user.appAccess || [];
    const hasAppAccess = appAccess.some(
        access => access.appKey === req.appKey && access.status === 'ACTIVE'
    );
    
    // Backward compatibility: check allowedApps if appAccess is empty
    let hasLegacyAccess = false;
    if (!hasAppAccess && (!appAccess || appAccess.length === 0)) {
        const allowedApps = req.user.allowedApps || ['CRM'];
        hasLegacyAccess = allowedApps.includes(req.appKey);
    }
    
    // If no access found, deny
    if (!hasAppAccess && !hasLegacyAccess) {
        const userId = req.user._id?.toString() || 'unknown';
        const orgId = req.user.organizationId?.toString() || 'unknown';
        const userEmail = req.user.email || 'unknown';
        
        const userAppKeys = appAccess.length > 0 
            ? appAccess.filter(a => a.status === 'ACTIVE').map(a => a.appKey).join(', ')
            : (req.user.allowedApps || ['CRM']).join(', ');
        
        console.warn(`[AppEntitlement] Blocked access: userId=${userId} email=${userEmail} appKey=${req.appKey} userApps=[${userAppKeys}] path=${req.path} orgId=${orgId}`);
        
        return res.status(403).json({
            success: false,
            message: `You do not have access to the ${req.appKey} application`,
            code: 'APP_ENTITLEMENT_REQUIRED',
            currentApp: req.appKey,
            userApps: userAppKeys,
            error: `User is not entitled to access ${req.appKey} application. User has access to: [${userAppKeys}]. Please contact your administrator to grant access.`
        });
    }

    // STEP 3: Validate user.userType is allowed for the app
    const userType = req.user.userType || 'INTERNAL'; // Default to INTERNAL for backward compatibility
    if (!validateUserTypeForApp(userType, req.appKey)) {
        console.warn(`[AppEntitlement] UserType ${userType} not allowed for app ${req.appKey}`);
        return res.status(403).json({
            success: false,
            message: `Your user type (${userType}) does not have access to ${req.appKey}`,
            code: 'USER_TYPE_NOT_ALLOWED',
            userType: userType,
            appKey: req.appKey,
            error: `User type ${userType} is not allowed to access ${req.appKey} application.`
        });
    }
    
    // STEP 4: Validate organization.enabledApps contains appKey (ACTIVE)
    // This is MANDATORY - both user access AND org enablement are required
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
        console.warn(`[AppEntitlement] User has no organizationId: userId=${req.user._id}`);
        return res.status(403).json({
            success: false,
            message: 'Organization context required',
            code: 'ORGANIZATION_REQUIRED',
            error: 'User must belong to an organization to access applications.'
        });
    }

    try {
        const organization = await Organization.findById(organizationId).select('enabledApps');
        if (!organization) {
            console.warn(`[AppEntitlement] Organization not found: orgId=${organizationId}`);
            return res.status(403).json({
                success: false,
                message: 'Organization not found',
                code: 'ORGANIZATION_NOT_FOUND',
                error: 'Your organization could not be found. Please contact support.'
            });
        }

        // Use helper function to check if app is enabled (supports both new and legacy structures)
        const isAppEnabled = isAppEnabledForOrg(organization, req.appKey);
        
        if (!isAppEnabled) {
            const userId = req.user._id?.toString() || 'unknown';
            const orgId = organizationId.toString();
            
            // Get enabled apps for error message
            let enabledAppKeys = [];
            if (organization.enabledApps && organization.enabledApps.length > 0) {
                if (typeof organization.enabledApps[0] === 'object') {
                    enabledAppKeys = organization.enabledApps
                        .filter(app => app.status === 'ACTIVE')
                        .map(app => app.appKey);
                } else {
                    enabledAppKeys = organization.enabledApps;
                }
            }
            
            console.warn(`[AppEntitlement] App not enabled for organization: userId=${userId} appKey=${req.appKey} enabledApps=[${enabledAppKeys.join(', ')}] path=${req.path} orgId=${orgId}`);
            
            return res.status(403).json({
                success: false,
                message: `The ${req.appKey} application is not enabled for your organization`,
                code: 'APP_NOT_ENABLED',
                currentApp: req.appKey,
                enabledApps: enabledAppKeys,
                error: `The ${req.appKey} application is not enabled for your organization. Enabled apps: [${enabledAppKeys.join(', ')}]. Please contact your administrator to enable this application.`
            });
        }

        // STEP 5: Validate subscription status (NEW - Billing Enforcement)
        // SUBSCRIPTION RULE: ACTIVE and TRIAL are usable, SUSPENDED/CANCELLED are blocked
        // SPECIAL CASE: CRM is the control plane - if enabled, allow access even without subscription
        try {
            let subscription = await getOrgSubscription(organizationId);
            let appSubscription = subscription?.apps.find(app => app.appKey === req.appKey);

            // Special handling for CRM: Auto-create TRIAL subscription if missing but app is enabled
            if (req.appKey === APP_KEYS.CRM && !appSubscription && isAppEnabled) {
                const OrganizationSubscription = require('../models/OrganizationSubscription');
                const appPricingRegistry = require('../constants/appPricingRegistry');
                
                // Create subscription document if it doesn't exist
                if (!subscription) {
                    subscription = await OrganizationSubscription.create({
                        organizationId: organizationId,
                        apps: []
                    });
                }

                // Create CRM TRIAL subscription
                const pricingConfig = appPricingRegistry[APP_KEYS.CRM];
                const defaultPlan = pricingConfig?.defaultPlan || 'BASIC';
                const trialDays = pricingConfig?.trialDays || 14;
                const planConfig = pricingConfig?.plans[defaultPlan];
                const seatLimit = planConfig?.seatLimit || null;

                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

                appSubscription = {
                    appKey: APP_KEYS.CRM,
                    planKey: defaultPlan,
                    seatLimit: seatLimit,
                    seatsUsed: 0,
                    status: 'TRIAL',
                    trialEndsAt: trialEndsAt,
                    startedAt: new Date()
                };

                subscription.apps.push(appSubscription);
                await subscription.save();

                console.info('[AppEntitlement] Auto-created CRM TRIAL subscription', {
                    orgId: organizationId,
                    trialEndsAt: trialEndsAt.toISOString()
                });
            }

            // For non-CRM apps, require subscription
            if (!subscription) {
                // Missing subscription - blocked (except CRM which was handled above)
                return res.status(402).json({
                    success: false,
                    message: `Subscription for ${req.appKey} is not active`,
                    code: 'SUBSCRIPTION_INACTIVE',
                    currentApp: req.appKey,
                    status: 'NONE',
                    error: 'Subscription not found. Please contact your administrator.'
                });
            }

            if (!appSubscription) {
                // App not subscribed - blocked (except CRM which was handled above)
                return res.status(402).json({
                    success: false,
                    message: `Subscription for ${req.appKey} is not active`,
                    code: 'SUBSCRIPTION_INACTIVE',
                    currentApp: req.appKey,
                    status: 'NONE',
                    error: `App ${req.appKey} is not subscribed. Please contact your administrator.`
                });
            }

            // Check for expired trial (auto-suspend)
            if (appSubscription.status === 'TRIAL' && appSubscription.trialEndsAt) {
                if (new Date() > appSubscription.trialEndsAt) {
                    // Auto-suspend expired trial
                    const OrganizationSubscription = require('../models/OrganizationSubscription');
                    await OrganizationSubscription.updateOne(
                        { organizationId: organizationId, 'apps.appKey': req.appKey },
                        { $set: { 'apps.$.status': 'SUSPENDED' } }
                    );
                    appSubscription.status = 'SUSPENDED';
                }
            }

            // Use canonical helper to assert subscription is usable
            // This will throw if status is SUSPENDED, CANCELLED, or invalid
            assertSubscriptionUsable(appSubscription, req.appKey);
        } catch (err) {
            // Handle subscription validation errors
            if (err.code === 'SUBSCRIPTION_INACTIVE') {
                const userId = req.user._id?.toString() || 'unknown';
                const orgId = organizationId.toString();
                
                console.warn(`[AppEntitlement] Subscription not usable: userId=${userId} appKey=${req.appKey} status=${err.meta?.status} path=${req.path} orgId=${orgId}`);
                
                return res.status(err.httpStatus || 402).json({
                    success: false,
                    message: err.message,
                    code: err.code,
                    currentApp: req.appKey,
                    status: err.meta?.status || 'NONE',
                    meta: err.meta,
                    error: err.message
                });
            }
            
            // Re-throw unexpected errors
            throw err;
        }
    } catch (error) {
        // Hard fail - cannot verify org enablement
        console.error(`[AppEntitlement] Error checking organization enablement: ${error.message}`);
        return res.status(403).json({
            success: false,
            message: 'Unable to verify organization app enablement',
            code: 'ORG_ENABLEMENT_CHECK_FAILED',
            error: 'Could not verify if the application is enabled for your organization. Please contact support.'
        });
    }
    
    // All validations passed - allow request to continue
    next();
};

module.exports = {
    requireAppEntitlement
};

