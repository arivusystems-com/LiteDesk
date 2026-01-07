/**
 * ============================================================================
 * Portal App Access Enforcement Middleware
 * ============================================================================
 * 
 * Ensures that only requests with appKey = 'PORTAL' can access Portal routes.
 * 
 * Usage:
 *   router.use(requirePortalApp);
 * 
 * Behavior:
 * - Checks if req.appKey === 'PORTAL'
 * - Returns 403 Forbidden if appKey is not PORTAL
 * - Allows request to continue if appKey is PORTAL
 * 
 * Middleware Chain Position:
 * - Runs AFTER resolveAppContext (which sets req.appKey)
 * - Runs BEFORE business logic controllers
 * 
 * ============================================================================
 */

const { APP_KEYS } = require('../constants/appKeys');

/**
 * Require Portal App Middleware
 * 
 * Enforces that only requests with appKey = 'PORTAL' can access Portal routes.
 * Returns 403 Forbidden for non-Portal app contexts.
 */
const requirePortalApp = (req, res, next) => {
    // Check if appKey is set (should be set by resolveAppContext middleware)
    if (!req.appKey) {
        // If appKey is not set, this is likely a programming error
        // But we'll default to blocking for safety
        console.warn(`[PortalApp] req.appKey not set for path: ${req.path}`);
        return res.status(403).json({
            success: false,
            message: 'This endpoint requires Portal application context',
            code: 'PORTAL_APP_REQUIRED',
            error: 'Application context not resolved. This endpoint is only accessible from the Portal application.'
        });
    }
    
    // Check if appKey is PORTAL
    if (req.appKey !== APP_KEYS.PORTAL) {
        // Log the blocked access attempt
        const userId = req.user?._id?.toString() || 'unknown';
        const orgId = req.user?.organizationId?.toString() || 'unknown';
        console.warn(`[PortalApp] Blocked access attempt: appKey=${req.appKey} path=${req.path} userId=${userId} orgId=${orgId}`);
        
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only accessible from the Portal application',
            code: 'PORTAL_APP_REQUIRED',
            currentApp: req.appKey,
            requiredApp: APP_KEYS.PORTAL,
            error: `This endpoint requires appKey='${APP_KEYS.PORTAL}' but received appKey='${req.appKey}'. Please access this endpoint from the Portal application.`
        });
    }
    
    // appKey is PORTAL, allow request to continue
    next();
};

module.exports = {
    requirePortalApp
};

