/**
 * ============================================================================
 * Sales App Access Enforcement Middleware
 * ============================================================================
 * 
 * Ensures that only requests with appKey = 'SALES' can access Sales routes.
 * 
 * Usage:
 *   router.use(requireSalesApp);
 * 
 * Behavior:
 * - Checks if req.appKey === 'SALES'
 * - Returns 403 Forbidden if appKey is not Sales
 * - Allows request to continue if appKey is Sales
 * 
 * Middleware Chain Position:
 * - Runs AFTER resolveAppContext (which sets req.appKey)
 * - Runs BEFORE business logic controllers
 * 
 * ============================================================================
 */

const { APP_KEYS } = require('../constants/appKeys');

/**
 * Require Sales App Middleware
 * 
 * Enforces that only requests with appKey = 'SALES' can access Sales routes.
 * Returns 403 Forbidden for non-Sales app contexts.
 */
const requireSalesApp = (req, res, next) => {
    // Check if appKey is set (should be set by resolveAppContext middleware)
    if (!req.appKey) {
        // If appKey is not set, this is likely a programming error
        // But we'll default to blocking for safety
        console.warn(`[SalesApp] req.appKey not set for path: ${req.path}`);
        return res.status(403).json({
            success: false,
            message: 'This endpoint requires Sales application context',
            code: 'SALES_APP_REQUIRED',
            error: 'Application context not resolved. This endpoint is only accessible from the Sales application.'
        });
    }
    
    // Check if appKey is Sales
    if (req.appKey !== APP_KEYS.SALES) {
        // Log the blocked access attempt
        const userId = req.user?._id?.toString() || 'unknown';
        const orgId = req.user?.organizationId?.toString() || 'unknown';
        console.warn(`[SalesApp] Blocked access attempt: appKey=${req.appKey} path=${req.path} userId=${userId} orgId=${orgId}`);
        
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only accessible from the Sales application',
            code: 'SALES_APP_REQUIRED',
            currentApp: req.appKey,
            requiredApp: APP_KEYS.SALES,
            error: `This endpoint requires appKey='${APP_KEYS.SALES}' but received appKey='${req.appKey}'. Please access this endpoint from the Sales application.`
        });
    }
    
    // appKey is Sales, allow request to continue
    next();
};

module.exports = {
    requireSalesApp
};

