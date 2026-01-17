const express = require('express');
const { 
    createDeal, 
    getDeals, 
    getDealById, 
    updateDeal, 
    deleteDeal,
    addNote,
    getPipelineSummary,
    updateStage
} = require('../controllers/dealController');
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus, checkFeatureAccess } = require('../middleware/organizationMiddleware');
const { checkPermission, filterByOwnership } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazySalesInitialization } = require('../middleware/lazySalesInitializationMiddleware');
const { requireSalesApp } = require('../middleware/requireSalesAppMiddleware');

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazySalesInitialization); // Lazy initialize CRM if needed
router.use(requireSalesApp); // Enforce Sales-only access
router.use(organizationIsolation);
router.use(checkTrialStatus);
router.use(checkFeatureAccess('deals'));

// Pipeline summary (must come before /:id routes)
router.get('/pipeline/summary', checkPermission('deals', 'view'), getPipelineSummary);

// Routes that handle collections (GET all, POST new)
router.route('/')
    .get(filterByOwnership('deals'), checkPermission('deals', 'view'), getDeals)
    .post(checkPermission('deals', 'create'), createDeal);

// Routes that handle single resources (GET by ID, PUT, DELETE)
router.route('/:id')
    .get(checkPermission('deals', 'view'), getDealById)
    .put(checkPermission('deals', 'edit'), updateDeal)
    .delete(checkPermission('deals', 'delete'), deleteDeal);

// Update deal stage
router.patch('/:id/stage', checkPermission('deals', 'edit'), updateStage);

// Add note to deal
router.post('/:id/notes', checkPermission('deals', 'edit'), addNote);

module.exports = router;

