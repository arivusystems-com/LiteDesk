/**
 * ============================================================================
 * Audit App Access Enforcement Middleware
 * ============================================================================
 * 
 * Ensures that only requests with appKey = 'AUDIT' can access Audit routes.
 * 
 * Usage:
 *   router.use(requireAuditApp);
 * 
 * Behavior:
 * - Checks if req.appKey === 'AUDIT'
 * - Returns 403 Forbidden if appKey is not AUDIT
 * - Allows request to continue if appKey is AUDIT
 * 
 * Middleware Chain Position:
 * - Runs AFTER resolveAppContext (which sets req.appKey)
 * - Runs BEFORE business logic controllers
 * 
 * ============================================================================
 */

const { APP_KEYS } = require('../constants/appKeys');

/**
 * Require Audit App Middleware
 * 
 * Enforces that only requests with appKey = 'AUDIT' can access Audit routes.
 * Returns 403 Forbidden for non-Audit app contexts.
 */
const requireAuditApp = (req, res, next) => {
    // Check if appKey is set (should be set by resolveAppContext middleware)
    if (!req.appKey) {
        // If appKey is not set, this is likely a programming error
        // But we'll default to blocking for safety
        console.warn(`[AuditApp] req.appKey not set for path: ${req.path}`);
        return res.status(403).json({
            success: false,
            message: 'This endpoint requires Audit application context',
            code: 'AUDIT_APP_REQUIRED',
            error: 'Application context not resolved. This endpoint is only accessible from the Audit application.'
        });
    }
    
    // Check if appKey is AUDIT
    if (req.appKey !== APP_KEYS.AUDIT) {
        // Log the blocked access attempt
        const userId = req.user?._id?.toString() || 'unknown';
        const orgId = req.user?.organizationId?.toString() || 'unknown';
        console.warn(`[AuditApp] Blocked access attempt: appKey=${req.appKey} path=${req.path} userId=${userId} orgId=${orgId}`);
        
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only accessible from the Audit application',
            code: 'AUDIT_APP_REQUIRED',
            currentApp: req.appKey,
            requiredApp: APP_KEYS.AUDIT,
            error: `This endpoint requires appKey='${APP_KEYS.AUDIT}' but received appKey='${req.appKey}'. Please access this endpoint from the Audit application.`
        });
    }
    
    // appKey is AUDIT, allow request to continue
    next();
};

module.exports = {
    requireAuditApp
};

