const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const controller = require('../controllers/settingsController');
const helpdeskSettingsController = require('../controllers/helpdeskSettingsController');
const assignmentRulesController = require('../controllers/assignmentRulesController');

// All routes require authentication and organization context
router.use(protect);
router.use(organizationIsolation);

// Core Modules endpoints
router.get('/core-modules', controller.getCoreModules);
router.get('/core-modules/:moduleKey', controller.getCoreModule);
router.patch('/core-modules/:moduleKey/applications/:appKey', controller.toggleAppParticipation);

// Organization Status-Types endpoints (specific to organizations module)
router.get('/core-modules/organizations/status-types', controller.getOrganizationStatusTypes);
router.patch('/core-modules/organizations/status-types', controller.updateOrganizationStatusTypes);

// People types endpoint (tenant-configurable, e.g. Lead, Contact)
router.get('/core-modules/people/people-types/usage', controller.getPeopleTypesUsage);
router.get('/core-modules/people/people-types', controller.getPeopleTypes);
router.put('/core-modules/people/people-types', controller.updatePeopleTypes);

// Applications endpoints
router.get('/applications', controller.getApplications);
router.get('/applications/helpdesk/execution-settings', helpdeskSettingsController.getHelpdeskExecutionSettings);
router.put('/applications/helpdesk/execution-settings', helpdeskSettingsController.updateHelpdeskExecutionSettings);
router.get('/applications/:appKey', controller.getApplication);

// Assignment Rules (Step 7A simulation foundation)
router.get('/automation/assignment-rules', assignmentRulesController.getAssignmentRuleSet);
router.put('/automation/assignment-rules', assignmentRulesController.upsertAssignmentRuleSet);
router.post('/automation/assignment-rules/simulate', assignmentRulesController.simulateAssignmentRules);

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
router.post('/integrations/:key/test', controller.testIntegration);

module.exports = router;

