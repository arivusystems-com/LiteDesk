/**
 * ============================================================================
 * PLATFORM CORE: Relationship Routes
 * ============================================================================
 * 
 * Routes for relationship management:
 * - POST /api/relationships/link - Link two records
 * - POST /api/relationships/unlink - Unlink two records
 * - GET /api/relationships/links - Get raw relationship links for a record
 * - GET /api/relationships/record-context - Get record context with relationships
 * 
 * ⚠️ Platform-level routes - app-agnostic
 * ⚠️ Permission enforcement stubbed (to be implemented later)
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const express = require('express');
const {
  linkRecords,
  unlinkRecords,
  getRecordLinks,
  getRecordContext
} = require('../controllers/relationshipController');
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(resolveAppContext); // Resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(organizationIsolation);

// Link records
router.post('/link', linkRecords);

// Unlink records
router.post('/unlink', unlinkRecords);

// Get raw links for a record
router.get('/links', getRecordLinks);

// Get record context
router.get('/record-context', getRecordContext);

module.exports = router;
