const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus } = require('../middleware/organizationMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const {
  getScheduling,
  getEntityScheduling,
  createScheduling,
  getSchedulingById,
  updateScheduling,
  deleteScheduling,
  updateSchedulingStatus,
  rescheduleEvent
} = require('../controllers/schedulingController');

// Apply middleware to all scheduling routes
router.use(protect);
router.use(resolveAppContext); // Resolve appKey from URL
router.use(organizationIsolation);
router.use(checkTrialStatus);

// CRUD routes (list endpoint must come before parameterized routes)
router.route('/')
  .get(getScheduling) // Get all scheduling items (organization-wide list)
  .post(createScheduling);

// Get scheduling items for an entity (must come after list endpoint to avoid route conflicts)
router.get('/:entityType/:entityId', getEntityScheduling);

router.route('/:id')
  .get(getSchedulingById)
  .put(updateScheduling)
  .delete(deleteScheduling);

// Quick actions
router.patch('/:id/status', updateSchedulingStatus); // For tasks: complete/reopen
router.patch('/:id/reschedule', rescheduleEvent); // For events: reschedule

module.exports = router;

