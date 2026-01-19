/**
 * OrganizationSurface Routes
 * 
 * Alias route for /api/organizations/:id/surface
 * Maps to the same controller as /api/v2/organization/:id/surface
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazySalesInitialization } = require('../middleware/lazySalesInitializationMiddleware');
const { requireSalesApp } = require('../middleware/requireSalesAppMiddleware');
const controller = require('../controllers/organizationV2Controller');

router.use(protect);
router.use(resolveAppContext);
router.use(requireAppEntitlement);
router.use(lazySalesInitialization);
router.use(requireSalesApp);

// OrganizationSurface endpoint
router.get('/:id/surface', controller.getSurface);

module.exports = router;
