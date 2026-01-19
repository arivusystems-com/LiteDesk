# Inbox Aggregation Contract

## Purpose

Define how Tasks and Events are transformed into `InboxItem` based on human attention, not data completeness. This document specifies the server-side aggregation rules that create a unified, coherent attention surface.

**See also:**
- `docs/architecture/inbox-surface-invariants.md` - UX principles and surface rules
- `client/src/types/inboxItem.types.ts` - TypeScript type definitions

---

## 1. Aggregation Responsibility

### Server-Side Concern

**Inbox aggregation is a server-side concern.**

- Backend aggregates Tasks and Events into `InboxItem[]`
- Backend applies all filtering, inclusion rules, and transformations
- Backend computes attention labels, urgency, and time relevance
- Backend handles sorting and ordering

### UI Receives Ready-to-Render Data

**UI receives only ready-to-render `InboxItem[]`.**

- UI never receives raw Task or Event models
- UI never filters Tasks or Events
- UI never computes attention labels or urgency
- UI only renders what backend provides

### Why This Matters

**Separation of concerns:**
- Backend owns business logic (what belongs in Inbox)
- UI owns presentation (how to display Inbox items)
- Changes to aggregation rules don't require UI changes
- UI remains simple and focused on rendering

**Performance:**
- Aggregation happens once on server (efficient)
- UI receives pre-computed, optimized data
- No client-side filtering or sorting needed

**Consistency:**
- All users see same aggregation logic
- Rules are enforced server-side (can't be bypassed)
- Single source of truth for "what belongs in Inbox"

---

## 2. Task → InboxItem Rules

### Inclusion Criteria

**Include only tasks that meet ALL of the following:**

1. **Assigned to user:**
   - `Task.assignedTo === currentUserId`
   - User must be the explicit assignee

2. **Not completed or cancelled:**
   - `Task.status !== 'completed'`
   - `Task.status !== 'cancelled'`
   - Only active tasks appear in Inbox

3. **Time-relevant:**
   - Task is overdue: `Task.dueDate < now`
   - OR task is due within near-term window: `Task.dueDate <= now + NEAR_TERM_WINDOW`
   - See "Time Relevance Windows" section for window definitions

**Exclude tasks that:**
- Are not assigned to the user
- Are completed or cancelled
- Are due far in the future (beyond near-term window)
- Have no due date AND are not overdue

### Field Mapping

**Common fields:**

```typescript
{
  kind: 'task',
  id: Task._id.toString() || Task.taskId,
  title: Task.title,
  dueAt: Task.dueDate, // Can be null
  isOverdue: Task.dueDate < now && Task.status !== 'completed',
  sourceApp: determineSourceApp(Task), // From Task.relatedTo or context
  relatedLabel: formatRelatedLabel(Task), // e.g., "Deal · Acme Corp"
  organizationLabel: Organization.name, // From Task.organizationId
  routeTarget: `/sales/tasks/${Task._id}`, // Or appropriate app route
  updatedAt: Task.modifiedTime || Task.createdTime
}
```

**Task-specific fields:**

```typescript
{
  allowComplete: true, // Always true for tasks
  completeAction: `/api/tasks/${Task._id}/complete` // Or route to completion UI
}
```

### Attention Label Mapping

**Map task status + due date to human-readable attention label:**

| Task Status | Due Date | Attention Label |
|------------|----------|----------------|
| `todo` | Overdue | "Overdue" |
| `todo` | Due today | "Due today" |
| `todo` | Due tomorrow | "Due tomorrow" |
| `todo` | Due in N days (≤7) | "Due in N days" |
| `todo` | Due in N days (>7) | "Due in N days" |
| `todo` | No due date | "No due date" |
| `in_progress` | Overdue | "Overdue" |
| `in_progress` | Due today | "Due today" |
| `in_progress` | Due tomorrow | "Due tomorrow" |
| `in_progress` | Due in N days | "Due in N days" |
| `in_progress` | No due date | "In progress" |
| `waiting` | Any | "Waiting" |

**Examples:**
- Task with `status: 'todo'`, `dueDate: yesterday` → `attentionLabel: "Overdue"`
- Task with `status: 'in_progress'`, `dueDate: today` → `attentionLabel: "Due today"`
- Task with `status: 'waiting'`, `dueDate: tomorrow` → `attentionLabel: "Waiting"`

### Source App Determination

**Determine source app from task context:**

- If `Task.relatedTo.type === 'Deal'` → `sourceApp: 'Sales'`
- If `Task.relatedTo.type === 'Project'` → `sourceApp: 'Projects'`
- If `Task.relatedTo.type === 'Ticket'` → `sourceApp: 'Helpdesk'`
- If `Task.relatedTo.type === 'Event'` → `sourceApp: 'Audit'` (or appropriate app)
- Default: `sourceApp: 'Tasks'` (or organization's default app)

### Related Label Format

**Format related label from task context:**

- `Task.relatedTo.type === 'Deal'` → `relatedLabel: "Deal · ${Deal.name}"`
- `Task.relatedTo.type === 'Project'` → `relatedLabel: "Project · ${Project.name}"`
- `Task.relatedTo.type === 'Ticket'` → `relatedLabel: "Ticket #${Ticket.number}"`
- `Task.relatedTo.type === 'Event'` → `relatedLabel: "${Event.eventType} · ${Organization.name}"`
- No related entity → `relatedLabel: "Task"`

---

## 3. Event → InboxItem Rules

### Inclusion Criteria

**Include only events that meet ALL of the following:**

1. **User has explicit role:**
   - User is `Event.eventOwnerId` (event owner)
   - OR user is `Event.auditorId` (auditor)
   - OR user is `Event.reviewerId` (reviewer)
   - OR user is `Event.correctiveOwnerId` (corrective owner)
   - User must have an explicit, actionable role

2. **Event requires action:**
   - Event needs to be started: `Event.auditState === 'Ready to start'` AND user is auditor/owner
   - OR event responses need review: `Event.auditState === 'needs_review'` AND user is reviewer
   - OR corrective actions need attention: `Event.auditState === 'pending_corrective'` AND user is corrective owner
   - OR event needs approval: `Event.auditState === 'approved'` AND workflow requires final approval
   - See "Event Attention Type Determination" below

3. **Event is time-relevant:**
   - Event is starting soon: `Event.startDateTime <= now + STARTING_SOON_WINDOW`
   - OR event has overdue actions: corrective actions due < now
   - OR event has pending review: review deadline < now + REVIEW_WINDOW
   - See "Time Relevance Windows" section for window definitions

**Exclude events that:**
- User has no role in (not assigned, not involved)
- Are completed: `Event.status === 'Completed'`
- Are cancelled: `Event.status === 'Cancelled'`
- Are purely informational (no action required)
- Are far in the future (beyond time relevance windows)
- Are in 'Planned' status with no immediate action needed

### Event Attention Type Determination

**Determine `eventAttentionType` based on user role + event state:**

| User Role | Event State | Attention Type |
|-----------|------------|----------------|
| Auditor/Owner | `auditState === 'Ready to start'` AND `startDateTime <= now + STARTING_SOON_WINDOW` | `'start'` |
| Reviewer | `auditState === 'needs_review'` | `'review'` |
| Reviewer | `auditState === 'submitted'` AND review deadline approaching | `'review'` |
| Corrective Owner | `auditState === 'pending_corrective'` | `'corrective'` |
| Corrective Owner | Corrective actions overdue | `'corrective'` |
| Reviewer/Owner | `auditState === 'approved'` AND final approval needed | `'approval'` |

**Examples:**
- User is auditor, event `auditState: 'Ready to start'`, starts in 2 hours → `eventAttentionType: 'start'`
- User is reviewer, event `auditState: 'needs_review'` → `eventAttentionType: 'review'`
- User is corrective owner, event `auditState: 'pending_corrective'` → `eventAttentionType: 'corrective'`

### Field Mapping

**Common fields:**

```typescript
{
  kind: 'event',
  id: Event._id.toString() || Event.eventId,
  title: Event.eventName,
  dueAt: computeDueAt(Event, eventAttentionType), // See below
  isOverdue: computeIsOverdue(Event, eventAttentionType), // See below
  sourceApp: determineSourceApp(Event), // From Event.eventType
  relatedLabel: formatRelatedLabel(Event), // e.g., "Audit · Acme Corp"
  organizationLabel: Organization.name, // From Event.organizationId or Event.relatedToId
  routeTarget: `/audit/events/${Event._id}`, // Or appropriate app route
  updatedAt: Event.modifiedTime || Event.createdTime
}
```

**Event-specific fields:**

```typescript
{
  allowComplete: false, // Always false for events
  eventAttentionType: determineAttentionType(Event, currentUserId) // 'start' | 'review' | 'corrective' | 'approval'
}
```

### Due At Computation

**Compute `dueAt` based on `eventAttentionType`:**

- `eventAttentionType === 'start'` → `dueAt: Event.startDateTime`
- `eventAttentionType === 'review'` → `dueAt: Event.endDateTime` OR review deadline
- `eventAttentionType === 'corrective'` → `dueAt: earliest corrective action due date`
- `eventAttentionType === 'approval'` → `dueAt: Event.endDateTime` OR approval deadline

**Can be null if:**
- No specific due date for the attention type
- Event has no time-bound action requirement

### Is Overdue Computation

**Compute `isOverdue` based on `eventAttentionType`:**

- `eventAttentionType === 'start'` → `isOverdue: Event.startDateTime < now`
- `eventAttentionType === 'review'` → `isOverdue: review deadline < now` (if exists)
- `eventAttentionType === 'corrective'` → `isOverdue: any corrective action due date < now`
- `eventAttentionType === 'approval'` → `isOverdue: approval deadline < now` (if exists)

### Attention Label Mapping

**Map event attention type + due date to human-readable attention label:**

| Attention Type | Due Date | Attention Label |
|----------------|----------|----------------|
| `'start'` | Overdue | "Started" (or "Overdue") |
| `'start'` | Starts today | "Starts today" |
| `'start'` | Starts tomorrow | "Starts tomorrow" |
| `'start'` | Starts in N hours (≤24) | "Starts in N hours" |
| `'start'` | Starts in N days | "Starts in N days" |
| `'review'` | Overdue | "Review overdue" |
| `'review'` | Due today | "Needs review" |
| `'review'` | Due soon | "Review due soon" |
| `'corrective'` | Overdue | "N corrective actions overdue" |
| `'corrective'` | Due today | "N corrective actions due today" |
| `'corrective'` | Due soon | "N corrective actions pending" |
| `'approval'` | Overdue | "Approval overdue" |
| `'approval'` | Due today | "Needs approval" |
| `'approval'` | Due soon | "Approval due soon" |

**Examples:**
- Event with `eventAttentionType: 'start'`, `startDateTime: 2 hours from now` → `attentionLabel: "Starts in 2 hours"`
- Event with `eventAttentionType: 'review'`, review deadline: yesterday → `attentionLabel: "Review overdue"`
- Event with `eventAttentionType: 'corrective'`, 3 overdue actions → `attentionLabel: "3 corrective actions overdue"`

### Source App Determination

**Determine source app from event type:**

- `Event.eventType === 'Internal Audit'` → `sourceApp: 'Audit'`
- `Event.eventType === 'External Audit — Single Org'` → `sourceApp: 'Audit'`
- `Event.eventType === 'External Audit Beat'` → `sourceApp: 'Audit'`
- `Event.eventType === 'Field Sales Beat'` → `sourceApp: 'Sales'`
- `Event.eventType === 'Meeting / Appointment'` → `sourceApp: 'Calendar'`
- Default: `sourceApp: 'Calendar'`

### Related Label Format

**Format related label from event context:**

- Audit events: `relatedLabel: "${Event.eventType} · ${Organization.name}"`
  - Example: `"Internal Audit · Acme Corp"`
  - Example: `"External Audit — Single Org · Beta Inc"`
- Field Sales Beat: `relatedLabel: "Sales Beat · ${RouteName}"` (if available)
- Meeting/Appointment: `relatedLabel: "Meeting · ${Organization.name}"` (if relatedToId exists)
- Default: `relatedLabel: Event.eventName`

---

## 4. Time Relevance Windows (UX-Driven)

### Starting Soon Window

**Definition:**
- Events are considered "starting soon" if `Event.startDateTime <= now + STARTING_SOON_WINDOW`
- Default: **48 hours** (2 days)

**Rationale:**
- Users need advance notice to prepare for events
- 48 hours provides enough time for preparation
- Events further out don't need immediate attention

**Examples:**
- Event starts in 12 hours → Included (within 48h window)
- Event starts in 3 days → Excluded (beyond 48h window)
- Event started 1 hour ago → Included (overdue, needs attention)

### Near-Term Window (Tasks)

**Definition:**
- Tasks are considered "near-term" if `Task.dueDate <= now + NEAR_TERM_WINDOW`
- Default: **7 days** (1 week)

**Rationale:**
- Tasks due within a week need attention
- Tasks further out can be planned later (not urgent)
- Keeps Inbox focused on actionable work

**Examples:**
- Task due in 3 days → Included (within 7-day window)
- Task due in 10 days → Excluded (beyond 7-day window)
- Task overdue → Included (regardless of window)

### Review Window (Events)

**Definition:**
- Reviews are considered "due soon" if review deadline `<= now + REVIEW_WINDOW`
- Default: **24 hours** (1 day)

**Rationale:**
- Reviews need quick turnaround
- 24 hours provides urgency without panic
- Reviews further out don't need immediate attention

**Examples:**
- Review due in 6 hours → Included (within 24h window)
- Review due in 2 days → Excluded (beyond 24h window)
- Review overdue → Included (regardless of window)

### Overdue Logic

**Definition:**
- **Tasks:** `Task.dueDate < now && Task.status !== 'completed'`
- **Events (start):** `Event.startDateTime < now && Event.auditState === 'Ready to start'`
- **Events (review):** `review deadline < now && Event.auditState === 'needs_review'`
- **Events (corrective):** `corrective action due date < now && Event.auditState === 'pending_corrective'`

**Rationale:**
- Overdue items always need attention (regardless of windows)
- Overdue items are highest priority
- Overdue items appear even if beyond time windows

**Examples:**
- Task due yesterday → Included (overdue)
- Event started 2 hours ago, not checked in → Included (overdue)
- Corrective action due last week → Included (overdue)

### Explicit Exclusions

**Exclude far-future events:**
- Events starting beyond `STARTING_SOON_WINDOW` (48 hours) are excluded
- Exception: Events with overdue actions (corrective, review) are always included

**Exclude far-future tasks:**
- Tasks due beyond `NEAR_TERM_WINDOW` (7 days) are excluded
- Exception: Overdue tasks are always included

**Rationale:**
- Far-future items don't need immediate attention
- Inbox focuses on "what do I need to act on now?"
- Far-future items belong in planning/calendar views, not Inbox

---

## 5. Sorting Rules (Very Important)

### Primary Sort: Urgency Tiers

**Sort items into urgency tiers, then sort within each tier:**

#### Tier 1: Overdue Items (Highest Priority)

**Include:**
- Tasks: `isOverdue === true`
- Events: `isOverdue === true` (any attention type)

**Sort within tier:**
1. Most overdue first: `dueAt ASC` (earliest overdue first)
2. Tie-breaker: `updatedAt DESC` (most recently updated first)

**Rationale:**
- Overdue items need immediate attention
- Most overdue items are most urgent
- Recent updates indicate active work

#### Tier 2: Review/Approval Required

**Include:**
- Events: `eventAttentionType === 'review'` OR `eventAttentionType === 'approval'`
- Tasks: `status === 'waiting'` (blocked, waiting on something)

**Sort within tier:**
1. Due soonest: `dueAt ASC` (earliest due first)
2. Tie-breaker: `updatedAt DESC` (most recently updated first)

**Rationale:**
- Reviews/approvals block workflows
- Earlier deadlines are more urgent
- Recent updates indicate active work

#### Tier 3: Due/Starting Soon

**Include:**
- Tasks: `dueAt <= now + 24 hours` (due today or tomorrow)
- Events: `eventAttentionType === 'start'` AND `dueAt <= now + 24 hours` (starting today or tomorrow)

**Sort within tier:**
1. Due soonest: `dueAt ASC` (earliest due first)
2. Tie-breaker: `updatedAt DESC` (most recently updated first)

**Rationale:**
- Items due today/tomorrow need attention soon
- Earlier deadlines are more urgent
- Recent updates indicate active work

#### Tier 4: Everything Else

**Include:**
- All other included tasks and events

**Sort within tier:**
1. Due soonest: `dueAt ASC` (earliest due first)
2. No due date last: `dueAt IS NULL` (items without due dates)
3. Tie-breaker: `updatedAt DESC` (most recently updated first)

**Rationale:**
- Items with due dates are more urgent than items without
- Earlier deadlines are more urgent
- Recent updates indicate active work

### Stable Sort by Updated At

**Use `updatedAt` as tie-breaker within each tier:**

- `updatedAt DESC` (most recently updated first)
- Ensures stable, predictable sorting
- Prevents items from jumping around when due dates are equal

**Rationale:**
- Recent updates indicate active work
- Stable sort prevents UI jitter
- Predictable ordering improves UX

### Complete Sort Algorithm

```typescript
function sortInboxItems(items: InboxItem[]): InboxItem[] {
  return items.sort((a, b) => {
    // Tier 1: Overdue items
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    
    // Tier 2: Review/approval required
    if (a.isOverdue === b.isOverdue) {
      const aIsReview = a.kind === 'event' && (a.eventAttentionType === 'review' || a.eventAttentionType === 'approval');
      const bIsReview = b.kind === 'event' && (b.eventAttentionType === 'review' || b.eventAttentionType === 'approval');
      const aIsWaiting = a.kind === 'task' && a.status === 'waiting';
      const bIsWaiting = b.kind === 'task' && b.status === 'waiting';
      
      if ((aIsReview || aIsWaiting) && !(bIsReview || bIsWaiting)) return -1;
      if (!(aIsReview || aIsWaiting) && (bIsReview || bIsWaiting)) return 1;
    }
    
    // Tier 3: Due/starting soon (within 24 hours)
    if (a.dueAt && b.dueAt) {
      const aDueSoon = new Date(a.dueAt) <= addHours(now, 24);
      const bDueSoon = new Date(b.dueAt) <= addHours(now, 24);
      
      if (aDueSoon && !bDueSoon) return -1;
      if (!aDueSoon && bDueSoon) return 1;
    }
    
    // Within same tier: sort by dueAt ASC
    if (a.dueAt && b.dueAt) {
      const aDue = new Date(a.dueAt).getTime();
      const bDue = new Date(b.dueAt).getTime();
      if (aDue !== bDue) return aDue - bDue;
    } else if (a.dueAt && !b.dueAt) {
      return -1; // Items with due dates come first
    } else if (!a.dueAt && b.dueAt) {
      return 1; // Items without due dates come last
    }
    
    // Tie-breaker: updatedAt DESC
    const aUpdated = new Date(a.updatedAt).getTime();
    const bUpdated = new Date(b.updatedAt).getTime();
    return bUpdated - aUpdated;
  });
}
```

---

## 6. Non-Goals (Explicit)

### Inbox is NOT a Planner

**What this means:**
- Inbox does not show all future work
- Inbox does not show items due far in the future
- Inbox does not show items that don't need immediate attention

**Why:**
- Inbox focuses on "what do I need to act on now?"
- Far-future items belong in planning/calendar views
- Showing everything makes Inbox noisy and unusable

### Inbox is NOT a Calendar

**What this means:**
- Inbox does not show all events
- Inbox does not show informational events
- Inbox does not show events where user has no role

**Why:**
- Inbox shows attention-worthy moments, not all events
- Calendar views show all events for scheduling
- Inbox focuses on actionable work, not scheduling

### Inbox is NOT an Activity Feed

**What this means:**
- Inbox does not show historical activity
- Inbox does not show completed items (except briefly)
- Inbox does not show system events or logs

**Why:**
- Inbox shows current attention needs, not history
- Activity feeds show "what happened?"
- Inbox shows "what do I need to do?"

### Inbox is NOT a Task Manager

**What this means:**
- Inbox does not allow full task editing
- Inbox does not show task details (descriptions, subtasks, etc.)
- Inbox does not show task management features

**Why:**
- Inbox is an attention surface, not a task manager
- Task editing happens in owning surfaces (Sales, Projects, etc.)
- Inbox focuses on "what needs action?" not "how do I manage this?"

### Inbox is NOT a Notification Center

**What this means:**
- Inbox does not show notifications or alerts
- Inbox does not show system messages
- Inbox does not show passive information

**Why:**
- Inbox shows actionable work, not notifications
- Notifications are separate (alerts, system messages)
- Inbox focuses on work requiring user action

---

## 7. Lock Statement

**Any change to Inbox aggregation rules must update this document first.**

This document defines the contract between backend aggregation and UI rendering. Changes to:

- Inclusion criteria
- Time relevance windows
- Sorting rules
- Field mappings
- Attention label logic

**MUST** be documented here before implementation.

**Rationale:**
- Ensures consistency across team
- Prevents accidental breaking changes
- Documents decision rationale
- Enables review and discussion

**Process:**
1. Propose change in this document (PR or issue)
2. Discuss with team (UX, backend, frontend)
3. Update document with agreed changes
4. Implement changes in code
5. Verify implementation matches document

**Exceptions:**
- Bug fixes (document after fixing)
- Performance optimizations (document if logic changes)
- Emergency fixes (document within 24 hours)

---

## Summary

**Inbox aggregation transforms Tasks and Events into `InboxItem[]` based on:**

1. **Human attention** - What needs user action now?
2. **Time relevance** - Is it overdue or due soon?
3. **User role** - Does user have an actionable role?
4. **Action requirement** - Does it require action or is it informational?

**The result is a unified, coherent attention surface that:**
- Shows actionable work, not all work
- Focuses on "what do I need to act on now?"
- Treats Tasks and Events as equals
- Provides clear, scannable information
- Sorts by urgency and time relevance

**UI receives ready-to-render data:**
- No client-side filtering or sorting
- No raw Task/Event models
- Only `InboxItem[]` with computed fields
- Simple, focused rendering logic

This separation ensures Inbox remains calm, focused, and actionable.
