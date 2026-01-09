const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazySalesInitialization } = require('../middleware/lazySalesInitializationMiddleware');
const { requireSalesApp } = require('../middleware/requireSalesAppMiddleware');
const controller = require('../controllers/moduleController');

// Require auth and organization context
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazySalesInitialization); // Lazy initialize CRM if needed
router.use(requireSalesApp); // Enforce CRM-only access
router.use(organizationIsolation);

// Settings permission (reuse settings.edit to manage modules)
router.get('/', checkPermission('settings', 'edit'), controller.listModules);
router.post('/', checkPermission('settings', 'edit'), controller.createModule);
router.delete('/:id', checkPermission('settings', 'edit'), controller.deleteModule);
router.put('/:id', checkPermission('settings', 'edit'), controller.updateModule);
router.put('/system/:key', checkPermission('settings', 'edit'), controller.updateSystemModule);

module.exports = router;


