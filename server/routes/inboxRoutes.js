const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { getInboxItems } = require('../controllers/inboxController');

/**
 * ============================================================================
 * INBOX ROUTES
 * ============================================================================
 * 
 * Inbox is a cross-app attention surface that aggregates Tasks and Events
 * into unified InboxItem[].
 * 
 * IMPORTANT: Inbox is app-agnostic (not scoped to Sales, Audit, etc.)
 * - Available to all authenticated users
 * - Shows attention-worthy work across all apps
 * - No app-specific middleware required
 * 
 * See docs/architecture/inbox-aggregation.md for aggregation rules.
 * See client/src/types/inboxItem.types.ts for type definitions.
 * 
 * ============================================================================
 */

// All routes require authentication
router.use(protect);
router.use(organizationIsolation);

/**
 * GET /api/inbox
 * 
 * Get unified Inbox items (Tasks + Events)
 * 
 * Returns: InboxItem[] (ready-to-render, never raw Task/Event models)
 * 
 * Aggregation rules:
 * - Tasks: Assigned to user, not completed/cancelled, overdue or due within 7 days
 * - Events: User has role, requires action, time-relevant (starting soon or overdue)
 * - Sorted by urgency tiers (Overdue → Review/Approval → Due Soon → Everything Else)
 */
router.get('/', getInboxItems);

module.exports = router;
