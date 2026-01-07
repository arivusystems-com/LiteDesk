const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus, checkFeatureAccess } = require('../middleware/organizationMiddleware');
const { checkPermission, filterByOwnership } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazyCRMInitialization } = require('../middleware/lazyCRMInitializationMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  toggleSubtask,
  getTaskStats
} = require('../controllers/taskController');

// Apply middleware to all task routes
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazyCRMInitialization); // Lazy initialize CRM if needed
router.use(requireCRMApp); // Enforce CRM-only access
router.use(organizationIsolation);
router.use(checkTrialStatus);
router.use(checkFeatureAccess('tasks')); // Ensure 'tasks' module is enabled

// Task statistics
router.get('/stats/summary', checkPermission('tasks', 'view'), getTaskStats);

// Task CRUD routes
router.route('/')
  .post(checkPermission('tasks', 'create'), createTask)
  .get(filterByOwnership('tasks'), checkPermission('tasks', 'view'), getTasks);

router.route('/:id')
  .get(checkPermission('tasks', 'view'), getTaskById)
  .put(checkPermission('tasks', 'edit'), updateTask)
  .delete(checkPermission('tasks', 'delete'), deleteTask);

// Quick actions
router.patch('/:id/status', checkPermission('tasks', 'edit'), updateTaskStatus);
router.patch('/:id/subtasks/:subtaskId', checkPermission('tasks', 'edit'), toggleSubtask);

module.exports = router;

