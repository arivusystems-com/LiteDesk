const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazyCRMInitialization } = require('../middleware/lazyCRMInitializationMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');
const controller = require('../controllers/groupController');

router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazyCRMInitialization); // Lazy initialize CRM if needed
router.use(requireCRMApp); // Enforce CRM-only access
router.use(organizationIsolation);

router.post('/', controller.create);
router.get('/', controller.list);

// Member management (before /:id route)
router.post('/:id/members', controller.addMember);
router.delete('/:id/members', controller.removeMember);

// Activity logs (before /:id route)
router.get('/:id/activity-logs', controller.getActivityLogs);

router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;

