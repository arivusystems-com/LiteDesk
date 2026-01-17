const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const controller = require('../controllers/settingsController');

// All routes require authentication and organization context
router.use(protect);
router.use(organizationIsolation);

// Core Modules endpoints
router.get('/core-modules', controller.getCoreModules);
router.get('/core-modules/:moduleKey', controller.getCoreModule);
router.patch('/core-modules/:moduleKey/applications/:appKey', controller.toggleAppParticipation);

// Applications endpoints
router.get('/applications', controller.getApplications);
router.get('/applications/:appKey', controller.getApplication);

// Subscriptions endpoints
router.get('/subscriptions', controller.getSubscriptions);
router.get('/subscriptions/:appKey', controller.getSubscription);

// Organization settings endpoints
router.get('/organization', controller.getOrganizationSettings);
router.put('/organization', controller.updateOrganizationSettings);

// Security settings endpoints
router.get('/security', controller.getSecuritySettings);
router.put('/security', controller.updateSecuritySettings);
router.get('/security/activity', controller.getSecurityActivity);

// Integrations settings endpoints
router.get('/integrations', controller.getIntegrations);
router.get('/integrations/:key', controller.getIntegration);
router.post('/integrations/:key/enable', controller.enableIntegration);
router.post('/integrations/:key/disable', controller.disableIntegration);

module.exports = router;

