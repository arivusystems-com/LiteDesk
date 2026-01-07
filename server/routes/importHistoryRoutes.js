const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus } = require('../middleware/organizationMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazyCRMInitialization } = require('../middleware/lazyCRMInitializationMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');
const {
  getImportHistory,
  getImportById,
  getImportStats,
  deleteImportHistory,
  getImportedRecords
} = require('../controllers/importHistoryController');

// Apply middleware to all routes
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazyCRMInitialization); // Lazy initialize CRM if needed
router.use(requireCRMApp); // Enforce CRM-only access
router.use(organizationIsolation);
router.use(checkTrialStatus);

// Import history routes
router.get('/', checkPermission('imports', 'view'), getImportHistory);
router.get('/stats/summary', checkPermission('imports', 'view'), getImportStats);
router.get('/:id', checkPermission('imports', 'view'), getImportById);
router.get('/:id/records/:type', checkPermission('imports', 'view'), getImportedRecords);
router.delete('/:id', checkPermission('imports', 'delete'), deleteImportHistory);

module.exports = router;

