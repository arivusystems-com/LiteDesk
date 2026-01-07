/**
 * ============================================================================
 * CRM App Access Enforcement Middleware
 * ============================================================================
 * 
 * Ensures that only requests with appKey = 'CRM' can access CRM routes.
 * 
 * Usage:
 *   router.use(requireCRMApp);
 * 
 * Behavior:
 * - Checks if req.appKey === 'CRM'
 * - Returns 403 Forbidden if appKey is not CRM
 * - Allows request to continue if appKey is CRM
 * 
 * Middleware Chain Position:
 * - Runs AFTER resolveAppContext (which sets req.appKey)
 * - Runs BEFORE business logic controllers
 * 
 * ============================================================================
 */

const { APP_KEYS } = require('../constants/appKeys');

/**
 * Require CRM App Middleware
 * 
 * Enforces that only requests with appKey = 'CRM' can access CRM routes.
 * Returns 403 Forbidden for non-CRM app contexts.
 */
const requireCRMApp = (req, res, next) => {
    // Check if appKey is set (should be set by resolveAppContext middleware)
    if (!req.appKey) {
        // If appKey is not set, this is likely a programming error
        // But we'll default to blocking for safety
        console.warn(`[CRMApp] req.appKey not set for path: ${req.path}`);
        return res.status(403).json({
            success: false,
            message: 'This endpoint requires CRM application context',
            code: 'CRM_APP_REQUIRED',
            error: 'Application context not resolved. This endpoint is only accessible from the CRM application.'
        });
    }
    
    // Check if appKey is CRM
    if (req.appKey !== APP_KEYS.CRM) {
        // Log the blocked access attempt
        const userId = req.user?._id?.toString() || 'unknown';
        const orgId = req.user?.organizationId?.toString() || 'unknown';
        console.warn(`[CRMApp] Blocked access attempt: appKey=${req.appKey} path=${req.path} userId=${userId} orgId=${orgId}`);
        
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only accessible from the CRM application',
            code: 'CRM_APP_REQUIRED',
            currentApp: req.appKey,
            requiredApp: APP_KEYS.CRM,
            error: `This endpoint requires appKey='${APP_KEYS.CRM}' but received appKey='${req.appKey}'. Please access this endpoint from the CRM application.`
        });
    }
    
    // appKey is CRM, allow request to continue
    next();
};

module.exports = {
    requireCRMApp
};

