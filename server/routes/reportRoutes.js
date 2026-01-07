const express = require('express');
const { 
    createReport, 
    getReports, 
    getReportById, 
    updateReport, 
    deleteReport,
    runReport,
    exportReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus, checkFeatureAccess } = require('../middleware/organizationMiddleware');
const { checkPermission, filterByOwnership } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazyCRMInitialization } = require('../middleware/lazyCRMInitializationMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazyCRMInitialization); // Lazy initialize CRM if needed
router.use(requireCRMApp); // Enforce CRM-only access
router.use(organizationIsolation);
router.use(checkTrialStatus);
router.use(checkFeatureAccess('reports'));

// Routes that handle collections (GET all, POST new)
router.route('/')
    .get(filterByOwnership('reports'), checkPermission('reports', 'view'), getReports)
    .post(checkPermission('reports', 'create'), createReport);

// Routes that handle single resources (GET by ID, PUT, DELETE)
router.route('/:id')
    .get(checkPermission('reports', 'view'), getReportById)
    .put(checkPermission('reports', 'edit'), updateReport)
    .delete(checkPermission('reports', 'delete'), deleteReport);

// Execute report
router.post('/:id/run', checkPermission('reports', 'view'), runReport);

// Export report
router.post('/:id/export', checkPermission('reports', 'export'), exportReport);

module.exports = router;

