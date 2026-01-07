/**
 * ============================================================================
 * Audit Application Routes
 * ============================================================================
 * 
 * Routes for Audit application (App #3).
 * 
 * Base Path: /audit/*
 * App Key: AUDIT
 * 
 * Features:
 * - User profile (GET /audit/me)
 * - Organization summary (GET /audit/org)
 * - Health check (GET /audit/health)
 * 
 * Security:
 * - Requires authentication
 * - Enforces Audit app context (appKey = AUDIT)
 * - Enforces organization isolation
 * - No CRM permissions required
 * - Uses app-aware permission system
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
    getMe,
    getOrg,
    getHealth
} = require('../controllers/auditController');

// Apply middleware to all Audit routes
// Order: auth → app context → app entitlement → audit enforcement → organization isolation
router.use(protect);
router.use(resolveAppContext); // Resolve appKey from URL
router.use(requireAppEntitlement); // Check user's app entitlements
router.use(requireAuditApp); // Enforce Audit-only access
router.use(organizationIsolation); // Organization context

// Audit endpoints
router.get('/me', getMe); // User profile
router.get('/org', getOrg); // Organization summary
router.get('/health', getHealth); // Health check

module.exports = router;

