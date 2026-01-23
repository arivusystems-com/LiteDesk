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
const eventController = require('../controllers/eventController');
const Organization = require('../models/Organization');
const User = require('../models/User');
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

// ============================================================================
// Audit Scheduling Support: Organization List (read-only)
// ============================================================================
// ARCHITECTURE NOTE:
// Audit scheduling needs to search/select target organizations without relying
// on Sales-only `/api/v2/organization` routes.
//
// This endpoint returns a lightweight list for the scheduling surface:
// - `_id`, `name`, `email`, `address`
//
// It does NOT expose full organization schema.
router.get('/organizations', async (req, res) => {
    try {
        const tenantOrganizationId = req.user?.organizationId;
        if (!tenantOrganizationId) {
            return res.status(400).json({ success: false, message: 'Organization context required.' });
        }

        const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
            .select('_id')
            .lean();
        const userIds = tenantUserIds.map(u => u._id);

        const limit = Math.min(parseInt(req.query.limit) || 200, 500);
        const name = (req.query.name || '').toString().trim();

        const query = {
            isTenant: false,
            createdBy: { $in: userIds },
            ...(name ? { name: new RegExp(name, 'i') } : {})
        };

        const orgs = await Organization.find(query)
            .select('_id name email address')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return res.status(200).json({ success: true, data: orgs });
    } catch (error) {
        console.error('[AuditRoutes] Error listing organizations:', error);
        return res.status(500).json({ success: false, message: 'Error fetching organizations.' });
    }
});

// ============================================================================
// Audit Scheduling Prerequisite: Organization Address (address-only)
// ============================================================================
// ARCHITECTURE NOTE:
// Audit scheduling requires a human-readable organization address.
// - This is a prerequisite completion flow (address), not full Organization editing.
// - Precise location enforcement happens at execution time via GEO check-in.
// - Non-goals: lat/lng, maps, radius, accuracy, full org edit form.
//
// This endpoint exists under `/api/audit/*` so audit-only users can complete the
// prerequisite without needing Sales app context.
router.put('/organizations/:id/address', async (req, res) => {
    try {
        const orgId = req.params.id;
        const address = (req.body?.address || '').toString().trim();

        if (!orgId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required.' });
        }
        if (!address) {
            return res.status(400).json({ success: false, message: 'Address is required.' });
        }

        const tenantOrganizationId = req.user?.organizationId;
        if (!tenantOrganizationId) {
            return res.status(400).json({ success: false, message: 'Organization context required.' });
        }

        // Case A: Internal Audit targets the tenant organization itself.
        // Allow updating address on the tenant org only (address-only).
        if (String(orgId) === String(tenantOrganizationId)) {
            const updatedTenantOrg = await Organization.findOneAndUpdate(
                { _id: tenantOrganizationId },
                { address },
                { new: true }
            ).lean();

            if (!updatedTenantOrg) {
                return res.status(404).json({ success: false, message: 'Organization not found.' });
            }

            return res.status(200).json({ success: true, data: updatedTenantOrg });
        }

        // Case B: External audits target Sales organizations created by tenant users.
        // Mirror the tenant-scoped update logic from OrganizationV2Controller.update,
        // but restrict updates to `address` only.
        const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
            .select('_id')
            .lean();
        const userIds = tenantUserIds.map(u => u._id);

        const updatedSalesOrg = await Organization.findOneAndUpdate(
            {
                _id: orgId,
                isTenant: false,
                createdBy: { $in: userIds }
            },
            { address },
            { new: true }
        ).lean();

        if (!updatedSalesOrg) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        return res.status(200).json({ success: true, data: updatedSalesOrg });
    } catch (error) {
        console.error('[AuditRoutes] Error updating organization address:', error);
        return res.status(400).json({
            success: false,
            message: 'Error updating organization address.',
            error: error.message
        });
    }
});

// ============================================================================
// Audit Scheduling (Exclusive Audit Event Creation Path)
// ============================================================================
// Invariant:
// Audit event types must be created only in AUDIT app context.
//
// This route exists specifically so the Audit Scheduling Surface can create
// audit events under `/api/audit/*` (appKey resolves to AUDIT), while keeping
// `/api/events` strictly Sales-only.
//
// Enforcement:
// - `requireAuditApp` ensures appKey === 'AUDIT'
// - `eventController.createEvent` blocks audit event creation outside AUDIT
//
// See: docs/architecture/audit-scheduling-surface.md
router.post('/events', eventController.createEvent);

module.exports = router;

