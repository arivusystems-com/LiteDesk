const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus } = require('../middleware/organizationMiddleware');
const { canManageRoles } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazyCRMInitialization } = require('../middleware/lazyCRMInitializationMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');
const {
    getRoles,
    getRole,
    getRoleHierarchy,
    createRole,
    updateRole,
    deleteRole,
    getPermissionModules,
    initializeDefaultRoles
} = require('../controllers/roleController');

// Apply auth and organization middleware to all routes
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazyCRMInitialization); // Lazy initialize CRM if needed
router.use(requireCRMApp); // Enforce CRM-only access
router.use(organizationIsolation);
router.use(checkTrialStatus);

// Public routes (any authenticated user can view roles)
router.get('/modules', getPermissionModules);
router.get('/hierarchy', getRoleHierarchy);
router.get('/', getRoles);
router.get('/:id', getRole);

// Protected routes (requires manageRoles permission)
router.post('/', canManageRoles(), createRole);
router.post('/initialize', canManageRoles(), initializeDefaultRoles);
router.put('/:id', canManageRoles(), updateRole);
router.delete('/:id', canManageRoles(), deleteRole);

module.exports = router;

