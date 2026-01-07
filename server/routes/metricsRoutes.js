const express = require('express');
const router = express.Router();
const {
    getAggregatedMetrics,
    collectInstanceMetrics,
    collectAllMetrics
} = require('../controllers/metricsController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazyCRMInitialization } = require('../middleware/lazyCRMInitializationMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');

// All routes require authentication and owner/admin role
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazyCRMInitialization); // Lazy initialize CRM if needed
router.use(requireCRMApp); // Enforce CRM-only access

// Get aggregated metrics
router.get('/aggregated', requireAdmin(), getAggregatedMetrics);

// Collect metrics for a specific instance
router.post('/collect/:id', requireAdmin(), collectInstanceMetrics);

// Collect metrics for all instances
router.post('/collect-all', requireAdmin(), collectAllMetrics);

module.exports = router;

