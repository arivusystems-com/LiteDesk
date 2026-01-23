/**
 * ============================================================================
 * Audit Schedule Types
 * ============================================================================
 * 
 * Type definitions for the Audit Scheduling Surface.
 * 
 * ARCHITECTURE NOTE: These types represent a draft state, not a persisted entity.
 * The AuditScheduleDraft is used during the scheduling flow to collect required
 * configuration before creating the audit event instance.
 * 
 * Once an audit event is scheduled (created), these fields become immutable.
 * The draft is discarded after successful event creation.
 * 
 * See: docs/architecture/audit-scheduling-surface.md
 * ============================================================================
 */

/**
 * Audit Schedule Step
 * 
 * Enumeration of steps in the guided audit scheduling flow.
 * Mirrors the doctrine steps defined in audit-scheduling-surface.md.
 * 
 * Flow:
 * 1. SELECT_TYPE - Choose audit type (Internal Audit, External Audit — Single Org, External Audit Beat)
 * 2. SELECT_TARGET - Select target organization(s) (single org or multi-org beat)
 * 3. ASSIGN_ROLES - Assign Auditor, Reviewer (conditional), Corrective Owner
 * 4. SCHEDULE_TIME - Set start and end date/time
 * 5. LINK_FORM - Select and link required audit form
 * 6. REVIEW_CONFIRM - Review all configuration and confirm scheduling
 * 
 * See: docs/architecture/audit-scheduling-surface.md Section 6.1 (Guided, Step-Based Flow)
 */
export enum AuditScheduleStep {
  SELECT_TYPE = 'SELECT_TYPE',
  SELECT_TARGET = 'SELECT_TARGET',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  SCHEDULE_TIME = 'SCHEDULE_TIME',
  LINK_FORM = 'LINK_FORM',
  REVIEW_CONFIRM = 'REVIEW_CONFIRM'
}

/**
 * Audit Schedule Draft
 * 
 * Draft state for creating an audit event instance.
 * This is NOT a persisted entity - it's a temporary state used during
 * the scheduling flow to collect required configuration.
 * 
 * Once the audit event is created, these fields become immutable.
 * The draft is discarded after successful event creation.
 * 
 * Field Requirements:
 * - auditType: Required, must be an audit event type
 * - targetOrganizations: Required, single org for Internal/External Single Org, multiple for Beat
 * - auditorId: Required for all audit types
 * - reviewerId: Required for External Audit — Single Org only, optional for others
 * - correctiveOwnerId: Required for all audit types
 * - startDateTime: Required, ISO 8601 datetime string
 * - endDateTime: Required, ISO 8601 datetime string, must be after startDateTime
 * - linkedFormId: Required, must be an audit form
 * 
 * Immutability After Scheduling:
 * Once an audit event is created, all these fields become immutable.
 * Audit events can only be cancelled (not edited) to ensure audit trail integrity.
 * 
 * See: docs/architecture/audit-scheduling-surface.md
 * - Section 4 (Required Inputs)
 * - Section 5.5 (Immutable Constraints After Scheduling)
 */
export interface AuditScheduleDraft {
  /**
   * Audit type selection
   * 
   * Must be one of:
   * - 'Internal Audit'
   * - 'External Audit — Single Org'
   * - 'External Audit Beat'
   * 
   * Cannot be changed after scheduling (immutable).
   */
  auditType: 'Internal Audit' | 'External Audit — Single Org' | 'External Audit Beat' | null;

  /**
   * Target organization(s)
   * 
   * For single-org audits (Internal Audit, External Audit — Single Org):
   * - Array with single organization ID
   * - Internal Audit: Must be requester's organization (locked)
   * - External Audit — Single Org: Can be any organization
   * 
   * For beat audits (External Audit Beat):
   * - Array with multiple organization IDs (minimum 2)
   * - Order determines route sequence
   * 
   * Cannot be changed after scheduling (immutable).
   */
  targetOrganizations: string[];

  /**
   * Auditor assignment
   * 
   * Required for all audit types.
   * User who will conduct the audit.
   * 
   * Cannot be changed after scheduling (immutable).
   */
  auditorId: string | null;

  /**
   * Reviewer assignment (conditional)
   * 
   * Required for External Audit — Single Org only.
   * Optional for Internal Audit and External Audit Beat.
   * 
   * For External Audit — Single Org:
   * - Required
   * - Cannot be same as auditor
   * 
   * For Internal Audit:
   * - Optional (self-review allowed via allowSelfReview)
   * 
   * For External Audit Beat:
   * - Not required (single reviewer for entire route)
   * 
   * Cannot be changed after scheduling (immutable).
   */
  reviewerId: string | null;

  /**
   * Corrective Owner assignment
   * 
   * Required for all audit types.
   * User responsible for addressing audit findings.
   * 
   * Cannot be changed after scheduling (immutable).
   */
  correctiveOwnerId: string | null;

  /**
   * Start date and time
   * 
   * Required, ISO 8601 datetime string.
   * When the audit event is scheduled to begin.
   * 
   * Cannot be changed after scheduling (immutable).
   */
  startDateTime: string | null;

  /**
   * End date and time
   * 
   * Required, ISO 8601 datetime string.
   * When the audit event is scheduled to end.
   * Must be after startDateTime.
   * 
   * Cannot be changed after scheduling (immutable).
   */
  endDateTime: string | null;

  /**
   * Linked audit form
   * 
   * Required for all audit types.
   * Must be an audit form (formType: 'Audit').
   * Form must be active/published.
   * 
   * Cannot be changed after scheduling (immutable).
   */
  linkedFormId: string | null;
}

/**
 * Audit Schedule Validation Result
 * 
 * Result of validating an AuditScheduleDraft.
 * Used to provide feedback during the scheduling flow.
 */
export interface AuditScheduleValidationResult {
  /**
   * Whether the draft is valid
   */
  isValid: boolean;

  /**
   * Validation errors by field
   */
  errors: Partial<Record<keyof AuditScheduleDraft, string>>;

  /**
   * General validation message
   */
  message?: string;
}
