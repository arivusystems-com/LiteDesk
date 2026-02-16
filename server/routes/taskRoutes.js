const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus, checkFeatureAccess } = require('../middleware/organizationMiddleware');
const { checkPermission, filterByOwnership } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { lazySalesInitialization } = require('../middleware/lazySalesInitializationMiddleware');
const { requireSalesApp } = require('../middleware/requireSalesAppMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  toggleSubtask,
  getTaskStats,
  getTaskActivityLogs,
  getTaskComments,
  createTaskComment,
  updateTaskComment,
  toggleTaskCommentReaction,
  deleteTaskComment,
  uploadTaskCommentAttachment,
  getTaskCustomFields,
  getDescriptionVersions,
  restoreDescriptionVersion
} = require('../controllers/taskController');

// Apply middleware to all task routes
router.use(protect);
router.use(resolveAppContext); // After auth, resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(lazySalesInitialization); // Lazy initialize CRM if needed
router.use(requireSalesApp); // Enforce Sales-only access
router.use(organizationIsolation);
router.use(checkTrialStatus);
router.use(checkFeatureAccess('tasks')); // Ensure 'tasks' module is enabled

// Task statistics
router.get('/stats/summary', checkPermission('tasks', 'view'), getTaskStats);

// Task CRUD routes
router.route('/')
  .post(checkPermission('tasks', 'create'), createTask)
  .get(filterByOwnership('tasks'), checkPermission('tasks', 'view'), getTasks);

// Comment, activity, and custom fields routes (more specific - must be before /:id)
router.get('/:id/activity-logs', checkPermission('tasks', 'view'), getTaskActivityLogs);
router.get('/:id/description-versions', checkPermission('tasks', 'view'), getDescriptionVersions);
router.post('/:id/description-versions/restore', checkPermission('tasks', 'edit'), restoreDescriptionVersion);
router.get('/:id/comments', checkPermission('tasks', 'view'), getTaskComments);
router.get('/:id/custom-fields', checkPermission('tasks', 'view'), getTaskCustomFields);
router.post('/:id/comment-attachments', checkPermission('tasks', 'edit'), uploadSingle('file'), uploadTaskCommentAttachment);
router.post('/:id/comments', checkPermission('tasks', 'edit'), createTaskComment);
router.put('/:id/comments/:commentId', checkPermission('tasks', 'edit'), updateTaskComment);
router.post('/:id/comments/:commentId/reactions', checkPermission('tasks', 'edit'), toggleTaskCommentReaction);
router.delete('/:id/comments/:commentId', checkPermission('tasks', 'edit'), deleteTaskComment);

router.route('/:id')
  .get(checkPermission('tasks', 'view'), getTaskById)
  .put(checkPermission('tasks', 'edit'), updateTask)
  .delete(checkPermission('tasks', 'delete'), deleteTask);

// Quick actions
router.patch('/:id/status', checkPermission('tasks', 'edit'), updateTaskStatus);
router.patch('/:id/subtasks/:subtaskId', checkPermission('tasks', 'edit'), toggleSubtask);

module.exports = router;
