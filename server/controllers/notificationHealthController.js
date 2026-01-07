const notificationSSEHub = require('../services/notificationSSEHub');

/**
 * GET /internal/notifications/health
 * 
 * Internal health endpoint for SSE connection monitoring.
 * Protected by NODE_ENV !== 'production' OR internal token.
 * 
 * Phase 10G: Observability endpoint for debugging and ops visibility.
 */
exports.getHealth = async (req, res) => {
  // Security: Only allow in non-production or with internal token
  const isProduction = process.env.NODE_ENV === 'production';
  const internalToken = process.env.INTERNAL_HEALTH_TOKEN;
  const providedToken = req.query.token || req.headers['x-internal-token'];

  if (isProduction && (!internalToken || providedToken !== internalToken)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const stats = notificationSSEHub.getHealthStats();
    return res.json({
      success: true,
      connections: stats
    });
  } catch (err) {
    console.error('[notificationHealthController] Error getting health:', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

