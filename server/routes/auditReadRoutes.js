/**
 * ============================================================================
 * Audit Read Routes (Read-Only APIs)
 * ============================================================================
 * 
 * Routes for Audit App read-only endpoints.
 * 
 * Base Path: /audit/assignments/*
 * App Key: AUDIT
 * 
 * Endpoints:
 * - GET /audit/assignments - List assigned audits
 * - GET /audit/assignments/:eventId - Audit detail view
 * - GET /audit/assignments/:eventId/timeline - Timeline
 * - GET /audit/assignments/:eventId/execution-status - Execution status helper
 * 
 * Security:
 * - Requires authentication
 * - Enforces Audit app context (appKey = AUDIT)
 * - Enforces organization isolation
 * - Ownership-based authorization (no CRM permissions)
 * - Uses app-aware permission system
 * 
 * Middleware Chain (EXACT ORDER):
 * 1. protect - Authentication
 * 2. resolveAppContext - Resolve appKey from URL
 * 3. requireAppEntitlement - Check user's app entitlements
 * 4. requireAuditApp - Enforce Audit-only access
 * 5. organizationIsolation - Organization context
 * 
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireAppEntitlement } = require('../middleware/requireAppEntitlementMiddleware');
const { requireAuditApp } = require('../middleware/requireAuditAppMiddleware');
const {
    listAssignments,
    getAssignmentDetail,
    getTimeline,
    getExecutionStatus
} = require('../controllers/auditReadController');

// Apply middleware to all Audit read routes
// Order: auth → app context → app entitlement → audit enforcement → organization isolation
router.use(protect);
router.use(resolveAppContext); // Resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(requireAuditApp); // Enforce Audit-only access
router.use(organizationIsolation); // Organization context

// Audit read endpoints (READ-ONLY)
router.get('/', listAssignments); // GET /audit/assignments
router.get('/:eventId', getAssignmentDetail); // GET /audit/assignments/:eventId
router.get('/:eventId/timeline', getTimeline); // GET /audit/assignments/:eventId/timeline
router.get('/:eventId/execution-status', getExecutionStatus); // GET /audit/assignments/:eventId/execution-status

module.exports = router;

