/**
 * ============================================================================
 * INBOXTASK DATA CONTRACT
 * ============================================================================
 * 
 * This type defines the STRICT data contract for Task items in Inbox UI.
 * 
 * IMPORTANT: This is a PROJECTION, not a model.
 * - Backend responses MUST be mapped to this shape before reaching the UI
 * - This type enforces the boundary between task management complexity and Inbox simplicity
 * - It prevents task-management features from leaking into the attention surface
 * 
 * See docs/architecture/inbox-surface-invariants.md for the architectural
 * rules that this contract enforces.
 * 
 * ============================================================================
 */

/**
 * Inbox status states
 * 
 * Simplified from full Task status model for Inbox context:
 * - 'open' = requires action (todo, in_progress)
 * - 'waiting' = blocked or waiting on something
 * - 'completed' = done, may appear briefly before dismissal
 */
export type InboxTaskStatus = 'open' | 'waiting' | 'completed';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Source application identifier
 * 
 * Indicates which app/module this task belongs to (Sales, Projects, Helpdesk, etc.)
 * Used for visual grouping and navigation context.
 */
export type SourceApp = string; // e.g., 'Sales', 'Projects', 'Helpdesk', 'Audit'

/**
 * InboxTaskItem
 * 
 * Represents a Task in Inbox without leaking task-management complexity.
 * 
 * PURPOSE:
 * Inbox is an attention surface, not a task manager. This projection ensures
 * that Inbox items are scannable in under 2 seconds and clearly communicate:
 * - Why am I seeing this? (sourceApp, relatedLabel, organizationLabel)
 * - What happens if I click it? (links to owning surface)
 * - When do I need to act? (dueDate, isOverdue, priority)
 * 
 * This projection intentionally excludes:
 * - Task management features (subtasks, time tracking, descriptions)
 * - Project internals (projectId, relatedTo.id, internal references)
 * - Assignment details (assignedBy, createdBy)
 * - Completion tracking (completionPercentage, actualHours)
 * - Administrative fields (tags, reminderDate, etc.)
 * 
 * Inbox shows attention, not task details. Full task editing happens in
 * the owning surface (Sales, Projects, Helpdesk, etc.).
 */
export interface InboxTaskItem {
  /** Task ID */
  id: string;

  /** Task title (required for scannability) */
  title: string;

  /**
   * Inbox status state
   * 
   * Mapped from Task.status:
   * - 'todo' | 'in_progress' → 'open'
   * - 'waiting' → 'waiting'
   * - 'completed' → 'completed'
   * - 'cancelled' → excluded from Inbox
   */
  status: InboxTaskStatus;

  /**
   * Task priority
   * 
   * Used for visual hierarchy and sorting.
   * Time & urgency first (per inbox-surface-invariants.md).
   */
  priority: TaskPriority;

  /**
   * Due date
   * 
   * Used for urgency calculation and sorting.
   * Null if no due date set.
   */
  dueDate: Date | string | null;

  /**
   * Overdue flag
   * 
   * Computed: true if dueDate is in the past and status is not 'completed'.
   * Used for visual emphasis and filtering.
   */
  isOverdue: boolean;

  /**
   * Source application
   * 
   * Human-readable app name (e.g., 'Sales', 'Projects', 'Helpdesk').
   * Indicates which app/module this task belongs to.
   * Used for visual grouping and navigation context.
   */
  sourceApp: SourceApp;

  /**
   * Related entity label
   * 
   * Human-readable context string (e.g., "Deal · Acme", "Ticket #1234", "Project · Q4 Launch").
   * Answers: "What is this task about?"
   * Used for quick context scanning.
   */
  relatedLabel: string;

  /**
   * Organization label
   * 
   * Human-readable organization name.
   * Answers: "Which organization does this relate to?"
   * Used for context and filtering.
   */
  organizationLabel: string;

  /**
   * Last updated timestamp
   * 
   * Used for sorting and freshness indication.
   * ISO date string or Date object.
   */
  updatedAt: Date | string;
}

/**
 * ============================================================================
 * EXPLICIT EXCLUSIONS
 * ============================================================================
 * 
 * The following fields are EXPLICITLY EXCLUDED from InboxTaskItem because
 * they belong to task management, not the attention surface:
 * 
 * EXCLUDED FIELDS:
 * 
 * - description: Full task description (too dense for Inbox scanning)
 *   WHY: Inbox items must be scannable in under 2 seconds. Description belongs
 *        in the full task view, not the attention surface.
 * 
 * - subtasks: Subtask checklist (task management complexity)
 *   WHY: Inbox shows attention, not task breakdown. Subtasks belong in the
 *        full task management interface.
 * 
 * - estimatedHours / actualHours: Time tracking (task management feature)
 *   WHY: Time tracking is a task management concern, not an attention signal.
 *        Inbox focuses on "what needs action," not "how long will it take."
 * 
 * - completionPercentage: Completion tracking (task management metric)
 *   WHY: Inbox shows binary attention states (needs action / done), not
 *        progress metrics. Progress belongs in task management views.
 * 
 * - projectId: Internal project reference (project internals)
 *   WHY: Inbox shows human-readable context (relatedLabel), not internal IDs.
 *        Navigation uses relatedLabel, not projectId.
 * 
 * - relatedTo.id: Internal entity reference (project internals)
 *   WHY: Inbox shows human-readable context (relatedLabel), not internal IDs.
 *        Navigation uses relatedLabel, not relatedTo.id.
 * 
 * - relatedTo.type: Internal entity type (project internals)
 *   WHY: Inbox shows human-readable context (relatedLabel), not internal types.
 *        The relatedLabel already encodes the entity type (e.g., "Deal · Acme").
 * 
 * - assignedTo: Assignment user ID (assignment details)
 *   WHY: Inbox is user-scoped by definition. If a task appears in a user's
 *        Inbox, they are already the assignee. No need to show assignment.
 * 
 * - assignedBy: Assigner user reference (assignment details)
 *   WHY: Assignment metadata is not relevant for attention scanning. Inbox
 *        focuses on "what" and "when," not "who assigned it."
 * 
 * - createdBy: Creator user reference (system field)
 *   WHY: Creation metadata is not relevant for attention scanning. Inbox
 *        focuses on current attention needs, not historical creation.
 * 
 * - createdAt: Creation timestamp (system field)
 *   WHY: Inbox prioritizes updatedAt (freshness) over createdAt (age).
 *        Age is not a useful attention signal.
 * 
 * - startDate: Start date (task management timeline)
 *   WHY: Inbox focuses on due dates (urgency) and updatedAt (freshness), not
 *        start dates. Start dates belong in task management views.
 * 
 * - completedDate: Completion timestamp (task management tracking)
 *   WHY: Completion tracking is not needed for attention scanning. Status
 *        'completed' is sufficient signal.
 * 
 * - tags: Task tags (task management organization)
 *   WHY: Tags are organizational tools for task management, not attention signals.
 *        Inbox uses sourceApp and relatedLabel for context, not tags.
 * 
 * - reminderDate: Reminder scheduling (task management feature)
 *   WHY: Reminders are task management features, not Inbox concerns. Inbox
 *        shows current attention needs, not future reminders.
 * 
 * - reminderSent: Reminder status (task management tracking)
 *   WHY: Reminder tracking is a task management concern, not an attention signal.
 * 
 * - organizationId: Internal organization reference (project internals)
 *   WHY: Inbox shows human-readable context (organizationLabel), not internal IDs.
 *        Navigation uses organizationLabel, not organizationId.
 * 
 * These exclusions ensure that InboxTaskItem remains a lightweight projection
 * focused on attention signals, not task management complexity. Full task
 * editing and management happens in the owning surface (Sales, Projects,
 * Helpdesk, etc.), not in Inbox.
 * 
 * ============================================================================
 */
