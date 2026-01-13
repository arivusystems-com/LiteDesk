/**
 * ============================================================================
 * PLATFORM CORE: Global Search Routes
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const searchController = require('../controllers/searchController');

/**
 * GET /api/search
 * Global search across all modules
 */
router.get(
  '/',
  protect,
  organizationIsolation,
  searchController.globalSearch
);

module.exports = router;

