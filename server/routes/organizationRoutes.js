const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const deprecate = require('../middleware/deprecationMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { canManageBilling, requireOwner } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazyCRMInitialization } = require('../middleware/lazyCRMInitializationMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');
const {
    getOrganization,
    updateOrganization,
    getSubscription,
    upgradeSubscription,
    cancelSubscription,
    getStats,
    enableApp,
    disableApp
} = require('../controllers/organizationController');

// Apply auth and organization middleware to all routes
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazyCRMInitialization); // Lazy initialize CRM if needed
router.use(requireCRMApp); // Enforce CRM-only access
router.use(organizationIsolation);
router.use(deprecate('/api/organization', '/api/v2/organization'));

// --- Organization Routes ---
router.get('/', getOrganization);
router.put('/', requireOwner(), updateOrganization);
router.get('/stats', getStats);

// --- Subscription Routes ---
router.get('/subscription', getSubscription);
router.post('/subscription/upgrade', canManageBilling(), upgradeSubscription);
router.post('/subscription/cancel', canManageBilling(), cancelSubscription);

// --- App Management Routes (Admin only) ---
router.post('/apps/enable', requireOwner(), enableApp);
router.post('/apps/disable', requireOwner(), disableApp);
// Support organization ID in path for admin operations
router.post('/:id/apps/enable', requireOwner(), enableApp);
router.post('/:id/apps/disable', requireOwner(), disableApp);

module.exports = router;

