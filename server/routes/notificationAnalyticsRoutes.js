const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');
const {
  getOverview,
  getChannels,
  getUsers,
  getEvents,
  getInsights
} = require('../controllers/notificationAnalyticsController');

/**
 * Notification Analytics Routes (Phase 15)
 * 
 * Admin-only read-only endpoints for notification analytics.
 * All routes require:
 * - Authentication (protect)
 * - Organization isolation
 * - Admin role (requireAdmin)
 * - App context (resolveAppContext)
 */

// Apply middleware to all routes
router.use(protect);
router.use(organizationIsolation);
router.use(resolveAppContext);
// Require admin role
router.use((req, res, next) => {
  // Check if user is admin or owner
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const isAdmin = user.isOwner || 
                  (user.role && String(user.role).toLowerCase() === 'admin') ||
                  (user.roleId && user.roleId.name && String(user.roleId.name).toLowerCase() === 'admin');

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
});

// Routes
router.get('/overview', getOverview);
router.get('/channels', getChannels);
router.get('/users', getUsers);
router.get('/events', getEvents);
router.get('/insights', getInsights);

module.exports = router;

