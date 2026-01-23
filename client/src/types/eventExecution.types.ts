/**
 * ============================================================================
 * Event Execution Types
 * ============================================================================
 * 
 * Type definitions for Event Execution Surface.
 * 
 * ARCHITECTURE NOTE: These types represent execution context projections,
 * not the full Event model. Execution context contains only the minimal
 * data needed for execution interface and actions.
 * 
 * See: docs/architecture/event-execution-surface.md
 * ============================================================================
 */

/**
 * Execution State
 * 
 * Represents the current phase of event execution.
 * 
 * ARCHITECTURE NOTE: Execution state is system-controlled. State transitions
 * happen via execution actions (START, CHECK_IN, CHECK_OUT, COMPLETE) and
 * are validated by the backend. Frontend cannot manually set execution state.
 * 
 * State Transitions:
 * - NOT_STARTED → IN_PROGRESS (via START or CHECK_IN)
 * - IN_PROGRESS → COMPLETED (via COMPLETE or CHECK_OUT)
 * - NOT_STARTED or IN_PROGRESS → CANCELLED (via cancellation)
 * - COMPLETED and CANCELLED are terminal states
 * 
 * See: docs/architecture/event-execution-surface.md Section 2.2
 */
export type ExecutionState = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * User Role in Event Execution
 * 
 * Represents the current user's role in the event execution context.
 * 
 * Role determines:
 * - Available actions (canStart, canComplete, etc.)
 * - UI visibility (role-specific sections)
 * - Workflow responsibilities
 * 
 * See: docs/architecture/event-execution-surface.md Section 2.3
 */
export type ExecutionUserRole =
  | 'OWNER'
  | 'AUDITOR'
  | 'REVIEWER'
  | 'CORRECTIVE_OWNER'
  | null; // null if user has no role in this event

/**
 * Event Execution Context
 * 
 * Minimal execution context projection for Event Execution Surface.
 * 
 * ARCHITECTURE NOTE: This is a projection, not the Event model.
 * Execution context contains only the minimal data needed for:
 * - Displaying execution interface
 * - Determining available actions
 * - Managing execution state
 * 
 * Full event details are not needed for execution. This projection
 * reduces data transfer and improves performance.
 * 
 * See: docs/architecture/event-execution-surface.md Section 1
 */
export interface EventExecutionContext {
  /**
   * Event identifier
   * 
   * Unique identifier for the event being executed.
   */
  eventId: string;

  /**
   * Event type
   * 
   * Type of event (Meeting, Audit, Beat, etc.).
   * Determines execution mode and available actions.
   * 
   * See: docs/architecture/event-execution-surface.md Section 4
   */
  eventType: string;

  /**
   * Execution state
   * 
   * Current execution state (NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED).
   * 
   * ARCHITECTURE NOTE: Execution state is system-controlled. State transitions
   * happen via execution actions and are validated by the backend.
   * 
   * See: docs/architecture/event-execution-surface.md Section 2.2
   */
  executionState: ExecutionState;

  /**
   * User role
   * 
   * Current user's role in this event execution (OWNER, AUDITOR, REVIEWER, CORRECTIVE_OWNER).
   * null if user has no role in this event.
   * 
   * Role determines available actions and UI visibility.
   * 
   * See: docs/architecture/event-execution-surface.md Section 2.3
   */
  userRole: ExecutionUserRole;

  /**
   * Can start execution
   * 
   * Whether the current user can start event execution.
   * 
   * Determined by:
   * - Execution state (must be NOT_STARTED)
   * - User role (must have appropriate role)
   * - Workflow rules (backend validation)
   */
  canStart: boolean;

  /**
   * Can complete execution
   * 
   * Whether the current user can complete event execution.
   * 
   * Determined by:
   * - Execution state (must be IN_PROGRESS)
   * - User role (must have appropriate role)
   * - Workflow rules (all required work complete)
   * - Backend validation
   */
  canComplete: boolean;

  /**
   * Linked form identifier
   * 
   * Optional identifier for form linked to this event.
   * 
   * For audit events, linked form is required.
   * For generic events, linked form is optional.
   * 
   * If present, execution interface will provide form completion actions.
   */
  linkedFormId?: string | null;

  /**
   * Display title (optional)
   *
   * ARCHITECTURE NOTE: Display-only convenience for the execution surface UI.
   * This remains a projection (not the full Event model) and must not expand
   * into a full schema mirror.
   */
  title?: string;

  /**
   * Display start time (optional)
   *
   * Stored for rendering the header/context panel.
   */
  startDateTime?: string;

  /**
   * Display end time (optional)
   *
   * Stored for rendering the header/context panel.
   */
  endDateTime?: string;
}

/**
 * Execution Action
 * 
 * Actions that can be performed during event execution.
 * 
 * ARCHITECTURE NOTE: Execution actions trigger system-controlled state transitions.
 * Actions are validated by the backend and may be rejected if workflow rules
 * are not satisfied.
 * 
 * See: docs/architecture/event-execution-surface.md Section 5
 */
export enum ExecutionAction {
  /**
   * Start event execution
   * 
   * Transitions execution state from NOT_STARTED to IN_PROGRESS.
   * 
   * Applies to:
   * - Generic events (Meeting, Field Sales Beat)
   * 
   * See: docs/architecture/event-execution-surface.md Section 4.1
   */
  START = 'START',

  /**
   * Complete event execution
   * 
   * Transitions execution state from IN_PROGRESS to COMPLETED.
   * 
   * Applies to:
   * - Generic events (Meeting, Field Sales Beat)
   * 
   * Requires:
   * - All required work complete
   * - Workflow rules satisfied
   * 
   * See: docs/architecture/event-execution-surface.md Section 4.1
   */
  COMPLETE = 'COMPLETE',

  /**
   * Check in to event
   * 
   * Transitions execution state from NOT_STARTED to IN_PROGRESS.
   * Includes geo verification for audit events.
   * 
   * Applies to:
   * - Audit events (Internal Audit, External Audit — Single Org, External Audit Beat)
   * 
   * Requires:
   * - Geo verification (if geoRequired is true)
   * - User is assigned as Auditor
   * 
   * See: docs/architecture/event-execution-surface.md Section 4.3
   */
  CHECK_IN = 'CHECK_IN',

  /**
   * Check out from event
   * 
   * Transitions execution state from IN_PROGRESS to COMPLETED (or Ready for review for audit events).
   * Includes geo verification for audit events.
   * 
   * Applies to:
   * - Audit events (Internal Audit, External Audit — Single Org, External Audit Beat)
   * 
   * Requires:
   * - Geo verification (if geoRequired is true)
   * - User is assigned as Auditor
   * - Form submission complete (for audit events)
   * 
   * See: docs/architecture/event-execution-surface.md Section 4.3
   */
  CHECK_OUT = 'CHECK_OUT'
}
