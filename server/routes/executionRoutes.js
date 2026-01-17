/**
 * ============================================================================
 * Phase 1E + 1F: Execution Routes
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { execute } = require('../controllers/executionController');

// All routes require authentication, organization isolation, and app context
router.use(protect);
router.use(organizationIsolation);
router.use(resolveAppContext); // Phase 1F: Required for safety guardrails

// Execute capability action
router.post('/execute', execute);

module.exports = router;

