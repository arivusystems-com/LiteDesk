/**
 * ============================================================================
 * Audit Execution Routes (Proxy Layer)
 * ============================================================================
 * 
 * Routes for Audit App execution endpoints that proxy to CRM.
 * 
 * Base Path: /audit/execute/*
 * App Key: AUDIT
 * 
 * Endpoints:
 * - POST /audit/execute/:eventId/check-in
 * - POST /audit/execute/:eventId/submit
 * - POST /audit/execute/:eventId/approve
 * - POST /audit/execute/:eventId/reject
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
    checkInAudit,
    submitAudit,
    approveAudit,
    rejectAudit
} = require('../controllers/auditExecutionController');

// Apply middleware to all Audit execution routes
// Order: auth → app context → app entitlement → audit enforcement → organization isolation
router.use(protect);
router.use(resolveAppContext); // Resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(requireAuditApp); // Enforce Audit-only access
router.use(organizationIsolation); // Organization context

// Audit execution endpoints
router.post('/:eventId/check-in', checkInAudit);
router.post('/:eventId/submit', submitAudit);
router.post('/:eventId/approve', approveAudit);
router.post('/:eventId/reject', rejectAudit);

module.exports = router;

