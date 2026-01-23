/**
 * ============================================================================
 * Event Utilities
 * ============================================================================
 * 
 * Shared utility functions for Event-related operations.
 * 
 * See: docs/architecture/event-settings.md
 * ============================================================================
 */

/**
 * Audit Event Types
 * 
 * These event types are managed exclusively by the Audit application.
 * They require complex configuration (roles, forms, geo) and should only
 * be created through Audit flows, not generic event creation interfaces.
 * 
 * See: docs/architecture/event-settings.md Section 7 (Quick Create Rules)
 */
const AUDIT_EVENT_TYPES = [
    'Internal Audit',
    'External Audit — Single Org',
    'External Audit Beat'
];

/**
 * Check if an event type is an audit event type
 * 
 * Audit event types require:
 * - Complex role configuration (Auditor, Reviewer, Corrective Owner)
 * - Form linking (often required)
 * - Geo requirements (always required for audit events)
 * - Audit-specific workflows and state management
 * 
 * These events should ONLY be created through Audit application flows,
 * not through generic event creation interfaces.
 * 
 * @param {string} eventType - The event type to check
 * @returns {boolean} - True if the event type is an audit event type
 * 
 * @example
 * isAuditEventType('Internal Audit') // true
 * isAuditEventType('Meeting / Appointment') // false
 * 
 * See: docs/architecture/event-settings.md
 */
function isAuditEventType(eventType) {
    if (!eventType || typeof eventType !== 'string') {
        return false;
    }
    return AUDIT_EVENT_TYPES.includes(eventType);
}

module.exports = {
    isAuditEventType,
    AUDIT_EVENT_TYPES
};
