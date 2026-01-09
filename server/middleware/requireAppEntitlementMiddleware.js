/**
 * ============================================================================
 * App Entitlement Enforcement Middleware
 * ============================================================================
 * 
 * Ensures that users can only access applications they are entitled to.
 * 
 * Phase 0F: Now uses accessResolutionService for unified access decisions.
 * Wraps existing subscription checks and maintains backward compatibility.
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
const { validateUserTypeForApp } = require('../utils/appAccessUtils');
const { getOrgSubscription, assertSubscriptionUsable } = require('../utils/subscriptionUtils');
const { resolveAppAccess } = require('../services/accessResolutionService');
const { resolveAccessFeedback } = require('../utils/executionFeedbackResolver');

// Debug flag for access resolution (can be enabled via environment variable)
const ACCESS_DEBUG = process.env.ACCESS_DEBUG === 'true';

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
    // Phase 0F: Use Unified Access Resolution Engine
    // ============================================================================
    
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
        console.warn(`[AppEntitlement] User has no organizationId: userId=${req.user._id}`, {
            user: {
                _id: req.user._id,
                email: req.user.email,
                organizationId: req.user.organizationId,
                isOwner: req.user.isOwner,
                hasOrganizationId: !!req.user.organizationId
            }
        });
        return res.status(403).json({
            success: false,
            message: 'Organization context required',
            code: 'ORGANIZATION_REQUIRED',
            error: 'User must belong to an organization to access applications.'
        });
    }
    
    // Debug: Log user info for owner access debugging
    if (req.user?.isOwner) {
        console.log(`[AppEntitlement] Owner access attempt:`, {
            userId: req.user._id,
            email: req.user.email,
            isOwner: req.user.isOwner,
            organizationId: organizationId,
            appKey: req.appKey,
            path: req.path
        });
    }

    try {
        // Get organization (needed for access resolution)
        // Note: enabledApps should be included by default unless explicitly excluded
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            console.warn(`[AppEntitlement] Organization not found: orgId=${organizationId}`);
            return res.status(403).json({
                success: false,
                message: 'Organization not found',
                code: 'ORGANIZATION_NOT_FOUND',
                error: 'Your organization could not be found. Please contact support.'
            });
        }
        
        // Debug logging for owner access
        if (req.user?.isOwner && ACCESS_DEBUG) {
            console.log(`[AppEntitlement] Owner access check:`, {
                userId: req.user._id,
                email: req.user.email,
                appKey: req.appKey,
                enabledApps: organization.enabledApps,
                organizationId: organizationId
            });
        }

        // Determine intent from request method and path
        // VIEW: GET requests (read-only)
        // CONFIGURE: PUT/PATCH requests to settings/config endpoints
        // EXECUTE: POST/PUT/PATCH/DELETE requests to data endpoints
        let intent = 'VIEW';
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
            // Check if this is a configuration endpoint
            if (req.path.includes('/settings') || req.path.includes('/config') || req.path.includes('/admin')) {
                intent = 'CONFIGURE';
            } else {
                intent = 'EXECUTE';
            }
        }

        // Convert user and organization to plain objects if they're Mongoose documents
        // This ensures all fields are available to resolveAppAccess
        const userForAccess = req.user.toObject ? req.user.toObject() : req.user;
        const orgForAccess = organization.toObject ? organization.toObject() : organization;
        
        // Use unified access resolution service
        const accessResult = await resolveAppAccess({
            user: userForAccess,
            organization: orgForAccess,
            appKey: req.appKey,
            intent: intent
        });

        // Check access result
        if (!accessResult.allowed) {
            const userId = req.user._id?.toString() || 'unknown';
            const userEmail = req.user.email || 'unknown';
            const orgId = organizationId.toString();
            
            // Debug logging for access denial (especially for owners)
            console.log(`[AppEntitlement] Access denied:`, {
                userId,
                userEmail,
                isOwner: req.user?.isOwner,
                appKey: req.appKey,
                intent,
                reason: accessResult.reason,
                mode: accessResult.mode,
                organizationEnabledApps: organization.enabledApps,
                userAllowedApps: req.user?.allowedApps,
                userAppAccess: req.user?.appAccess,
                path: req.path
            });
            
            // Phase 0K: Resolve feedback metadata
            const feedback = resolveAccessFeedback(accessResult);
            
            // Build user-friendly error message based on reason
            // Use feedback.message if available, otherwise fall back to legacy messages
            let errorMessage = feedback.message || 'Access denied';
            let errorCode = 'ACCESS_DENIED';
            
            switch (accessResult.reason) {
                case 'APP_NOT_FOUND':
                    errorMessage = `Application ${req.appKey} is not registered in the system.`;
                    errorCode = 'INVALID_APP';
                    break;
                case 'APP_NOT_ENABLED_FOR_TENANT':
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
                    errorMessage = `The ${req.appKey} application is not enabled for your organization. Enabled apps: [${enabledAppKeys.join(', ')}].`;
                    errorCode = 'APP_NOT_ENABLED';
                    break;
                case 'NO_EXPLICIT_APP_ACCESS':
                    const appAccess = req.user.appAccess || [];
                    const userAppKeys = appAccess.length > 0 
                        ? appAccess.filter(a => a.status === 'ACTIVE').map(a => a.appKey).join(', ')
                        : (req.user.allowedApps || ['SALES']).join(', ');
                    errorMessage = `You do not have access to the ${req.appKey} application. User has access to: [${userAppKeys}].`;
                    errorCode = 'APP_ENTITLEMENT_REQUIRED';
                    break;
                case 'ADMIN_CANNOT_EXECUTE':
                    // Phase 0K: Use feedback message (already resolved above)
                    errorMessage = feedback.message || 'This action requires an active user seat.';
                    errorCode = 'EXECUTION_SEAT_REQUIRED';
                    break;
                case 'INSTANCE_BLOCKED':
                    // Phase 0K: Use feedback message
                    errorMessage = feedback.message || 'Your instance is currently suspended.';
                    errorCode = 'INSTANCE_BLOCKED';
                    break;
                case 'SUBSCRIPTION_REQUIRED':
                    // Phase 0K: Use feedback message
                    errorMessage = feedback.message || 'An active subscription is required to execute actions.';
                    errorCode = 'SUBSCRIPTION_REQUIRED';
                    break;
                case 'EXECUTION_SEAT_REQUIRED':
                    // Phase 0K: Use feedback message
                    errorMessage = feedback.message || 'This action requires an active user seat.';
                    errorCode = 'EXECUTION_SEAT_REQUIRED';
                    break;
                case 'TRIAL_EXPIRED':
                    // Phase 0K: Use feedback message
                    errorMessage = feedback.message || 'Your trial has ended. Please subscribe to continue.';
                    errorCode = 'TRIAL_EXPIRED';
                    break;
                case 'EXECUTION_CANNOT_CONFIGURE':
                    errorMessage = 'Execution access does not allow configuration changes. Admin access required.';
                    errorCode = 'EXECUTION_CANNOT_CONFIGURE';
                    break;
                default:
                    errorMessage = `Access denied: ${accessResult.reason}`;
            }
            
            console.warn(`[AppEntitlement] Access denied: userId=${userId} email=${userEmail} appKey=${req.appKey} intent=${intent} reason=${accessResult.reason} path=${req.path} orgId=${orgId}`);
            
            // Phase 0K: Include feedback in error response
            return res.status(403).json({
                success: false,
                message: errorMessage,
                code: errorCode,
                currentApp: req.appKey,
                reason: accessResult.reason,
                feedback: feedback, // Phase 0K: Execution feedback metadata
                error: errorMessage
            });
        }

        // Validate user.userType is allowed for the app (separate check)
        // EXCEPTION: Owners on internal instances bypass user type restrictions
        // (This allows internal instance owners to access all apps for platform management)
        const userType = req.user.userType || 'INTERNAL';
        const isInternalInstanceOwner = accessResult.mode === 'ADMIN' && 
                                        accessResult.reason === 'INTERNAL_INSTANCE_OVERRIDE';
        
        if (!isInternalInstanceOwner && !validateUserTypeForApp(userType, req.appKey)) {
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
        
        // Log bypass for internal instance owners
        if (isInternalInstanceOwner && !validateUserTypeForApp(userType, req.appKey)) {
            console.log(`[AppEntitlement] Bypassing user type restriction for internal instance owner: userType=${userType} appKey=${req.appKey}`);
        }

        // Store access result in request for downstream middleware/controllers
        req.accessResult = accessResult;

        // ============================================================================
        // Phase 0J: Seat Accounting Hook (Metadata Only)
        // ============================================================================
        // This is a future billing hook point - no implementation yet
        // When billing engine is ready, this will track execution usage
        if (accessResult.billable && accessResult.mode === 'EXECUTION') {
            // Future: markExecutionUsage({
            //     userId: req.user._id,
            //     appKey: req.appKey,
            //     instanceId: req.organization?._id,
            //     timestamp: new Date()
            // })
            // This is a hook point only - no billing logic implemented
        }

        // ============================================================================
        // STEP 5: Validate subscription status (Billing Enforcement)
        // ============================================================================
        // Note: ADMIN access bypasses billing, EXECUTION access enforces seat limits
        // SUBSCRIPTION RULE: ACTIVE and TRIAL are usable, SUSPENDED/CANCELLED are blocked
        // SPECIAL CASE: CRM is the control plane - if enabled, allow access even without subscription
        try {
            let subscription = await getOrgSubscription(organizationId);
            let appSubscription = subscription?.apps.find(app => app.appKey === req.appKey);

            // Special handling for CRM: Auto-create TRIAL subscription if missing but app is enabled
            // Only for EXECUTION access (ADMIN bypasses billing)
            if (req.appKey === APP_KEYS.SALES && !appSubscription && accessResult.mode === 'EXECUTION') {
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
                const pricingConfig = appPricingRegistry[APP_KEYS.SALES];
                const defaultPlan = pricingConfig?.defaultPlan || 'BASIC';
                const trialDays = pricingConfig?.trialDays || 14;
                const planConfig = pricingConfig?.plans[defaultPlan];
                const seatLimit = planConfig?.seatLimit || null;

                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

                appSubscription = {
                    appKey: APP_KEYS.SALES,
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

            // ADMIN access bypasses billing checks
            if (accessResult.mode === 'ADMIN') {
                // Owner/admin can access without subscription
                // Skip subscription validation
            } else if (accessResult.mode === 'EXECUTION') {
                // EXECUTION access requires subscription
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
        console.error(`[AppEntitlement] Error checking organization enablement:`, {
            error: error.message,
            stack: error.stack,
            userId: req.user?._id,
            email: req.user?.email,
            organizationId: req.user?.organizationId,
            appKey: req.appKey,
            path: req.path,
            errorName: error.name
        });
        return res.status(403).json({
            success: false,
            message: 'Unable to verify organization app enablement',
            code: 'ORG_ENABLEMENT_CHECK_FAILED',
            error: process.env.NODE_ENV === 'development' 
                ? `Could not verify if the application is enabled for your organization. Error: ${error.message}`
                : 'Could not verify if the application is enabled for your organization. Please contact support.',
            details: process.env.NODE_ENV === 'development' ? {
                errorMessage: error.message,
                errorName: error.name,
                stack: error.stack
            } : undefined
        });
    }
    
    // All validations passed - allow request to continue
    next();
};

module.exports = {
    requireAppEntitlement
};

