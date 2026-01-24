/**
 * ============================================================================
 * PLATFORM CORE: Automation Context Routes
 * ============================================================================
 *
 * Read-only API for automation visibility.
 * No editing - Control Plane is the only place to modify automation.
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getContext,
  getAppFlows,
  batchCheck
} = require('../controllers/automationContextController');

// All routes require authentication
router.use(protect);

// GET /api/automation/context?entityType=&entityId=
router.get('/context', getContext);

// GET /api/automation/app-flows?appKey=
router.get('/app-flows', getAppFlows);

// POST /api/automation/batch-check
router.post('/batch-check', batchCheck);

module.exports = router;
