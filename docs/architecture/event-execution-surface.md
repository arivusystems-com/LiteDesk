# Event Execution Surface Architecture

**Version:** 1.0  
**Date:** January 2026  
**Status:** Architectural Specification (Locked)  
**Type:** Platform Architecture Specification

---

## Executive Summary

This document defines the Event Execution Surface as the **exclusive execution interface** for performing events in the LiteDesk platform. Event Execution guides users through completing event-related work, managing execution state, and interacting with linked work (forms, tasks). This specification establishes clear boundaries between event execution, creation, scheduling, and settings, ensuring a focused, task-oriented execution experience.

**Surface Location:** `/events/:eventId` (Event Detail)  
**Component:** `EventExecution.vue`  
**Related Documents:** `audit-scheduling-surface.md`, `event-settings.md`, `inbox-surface-invariants.md`  
**Doctrine Reference:** `module-settings-doctrine.md`

---

## 1. Purpose & Scope

### Purpose

Event Execution guides users through performing an event. It provides a focused, task-oriented interface for executing event-related work, managing execution state, and completing role-based responsibilities. Event Execution is distinct from event creation, scheduling, and settings—it operates on existing event instances that have already been created and scheduled.

### Scope

Event Execution applies to **executable events** across all event types:

- **Generic Events:** Meeting / Appointment, Field Sales Beat
- **Audit Events:** Internal Audit, External Audit — Single Org, External Audit Beat
- **Execution States:** Not started, In progress, Completed, Cancelled
- **Role-Based Execution:** Owner, Auditor, Reviewer, Corrective Owner

### Explicit Scope Exclusions

Event Execution **does not** manage event creation, scheduling, or structural configuration. The following belong to other domains:

#### Event Creation
**Excluded:** Creating new events, scheduling events, configuring event structure, assigning roles, linking forms, and setting event metadata.

**Rationale:** Creation belongs to creation surfaces (GenericEventCreateSurface, AuditScheduleSurface). Event Execution operates on existing events that have already been created and scheduled.

**Location:** Event creation belongs in GenericEventCreateSurface (`/events/create`) and AuditScheduleSurface (`/audit/schedule`).

#### Event Scheduling
**Excluded:** Scheduling event times, assigning dates, configuring recurrence, and setting time-based constraints.

**Rationale:** Scheduling happens during event creation. Event Execution operates on events that have already been scheduled.

**Location:** Event scheduling belongs in creation surfaces (GenericEventCreateSurface, AuditScheduleSurface).

#### Event Settings
**Excluded:** Configuring event structure, field visibility, role requirements, geo rules, form linking rules, and event type configuration.

**Rationale:** Settings configure the structure and constraints that events follow. Event Execution operates within those constraints but does not modify them.

**Location:** Event settings belong in Settings → Core Modules → Events (`/settings/core-modules/events`).

#### Event Editing
**Excluded:** Editing event structure, changing event type, modifying roles, updating scheduling, and changing immutable fields.

**Rationale:** Event Execution focuses on performing work, not editing event structure. Structural changes belong in event editing surfaces (if implemented for non-audit events).

**Location:** Event editing (for non-audit events) belongs in Event Surfaces and Work interfaces.

### Mental Model

```
Event Creation → Create event instances with structure and scheduling
Event Execution → Perform work on existing event instances
Event Settings → Configure event structure and constraints
Inbox → Aggregate attention-worthy events requiring execution
```

---

## 2. Core Definitions

### 2.1 Executable Event

An Executable Event is an event instance that has been created and scheduled and is ready for execution. The event must have:

- **Event Type:** Defined event type (Meeting, Audit, Beat, etc.)
- **Scheduling:** Start and end date/time assigned
- **Status:** Execution status (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- **Role Assignments:** Required roles assigned (Owner, Auditor, Reviewer, Corrective Owner)
- **Linked Work:** Optional linked forms, tasks, or other work items

### 2.2 Execution State

Execution State represents the current phase of event execution:

- **Not Started (`PLANNED`):** Event is scheduled but execution has not begun
- **In Progress (`IN_PROGRESS`):** Event execution is active (check-in completed, work in progress)
- **Completed (`COMPLETED`):** Event execution is finished (check-out completed, all work done)
- **Cancelled (`CANCELLED`):** Event execution was cancelled (cannot be resumed)

**State Transitions:**
- `PLANNED` → `IN_PROGRESS` (via check-in or start action)
- `IN_PROGRESS` → `COMPLETED` (via check-out or completion action)
- `PLANNED` or `IN_PROGRESS` → `CANCELLED` (via cancellation action)
- `COMPLETED` and `CANCELLED` are terminal states (cannot transition)

### 2.3 Role-Based Execution

Role-Based Execution determines what actions a user can perform based on their assigned role:

#### Owner
- **Responsibilities:** General event management, starting/stopping generic events
- **Actions:** Start event, complete event, cancel event
- **Applies To:** Generic events (Meeting, Field Sales Beat)

#### Auditor
- **Responsibilities:** Conducting audit, completing audit forms, checking in/out
- **Actions:** Check-in, complete form, check-out, submit audit
- **Applies To:** Audit events (Internal Audit, External Audit — Single Org, External Audit Beat)

#### Reviewer
- **Responsibilities:** Reviewing audit results, approving/rejecting audit submissions
- **Actions:** Review form response, approve audit, reject audit
- **Applies To:** External Audit — Single Org (conditional role)

#### Corrective Owner
- **Responsibilities:** Addressing audit findings, implementing corrective actions
- **Actions:** View findings, acknowledge corrective actions, mark corrective actions complete
- **Applies To:** Audit events (all audit types)

---

## 3. Entry Points

### 3.1 Allowed Entry Points

Event Execution has **exactly four** entry points. All entry points route to the same surface (`/events/:eventId`):

#### 3.1.1 Inbox Item Click

**Location:** Inbox surface (`/inbox`)  
**Route:** `/events/:eventId`  
**Context:** User clicks an event item in Inbox  
**Action:** Opens Event Detail with EventExecution component focused

**Rationale:** Inbox aggregates attention-worthy events. Clicking an Inbox item navigates to execution surface to perform required work.

#### 3.1.2 Search Result Click

**Location:** Global Search or Command Palette search results  
**Route:** `/events/:eventId`  
**Context:** User searches for an event and clicks result  
**Action:** Opens Event Detail with EventExecution component focused

**Rationale:** Search provides discovery mechanism for events. Clicking a search result navigates to execution surface.

#### 3.1.3 Command Palette → "Go to Event"

**Location:** Global command palette (`/go to event` or event name)  
**Route:** `/events/:eventId`  
**Context:** User initiates from any context  
**Action:** Opens Event Detail with EventExecution component focused

**Rationale:** Command Palette provides fast navigation to events. Commands route to execution surface for performing work.

#### 3.1.4 Calendar (Read-Only → Execute)

**Location:** Calendar view (read-only event display)  
**Route:** `/events/:eventId`  
**Context:** User clicks an event in calendar  
**Action:** Opens Event Detail with EventExecution component focused

**Rationale:** Calendar displays scheduled events. Clicking an event navigates to execution surface to perform work.

### 3.2 Entry Point Unification

**All entry points route to the same surface.** This ensures:

- Consistent execution interface
- Consistent state management
- Single source of truth for execution logic
- No duplicate execution paths

**Implementation Note:** Entry points may pre-fill context (e.g., event ID from Inbox), but the surface itself is unified.

### 3.3 Prohibited Entry Points

The following are **explicitly prohibited** as direct execution entry points:

- **Event Creation Surfaces:** GenericEventCreateSurface, AuditScheduleSurface (these create events, not execute them)
- **Event Lists:** Event list views (these display events, execution happens in detail view)
- **Settings:** Event Settings (these configure structure, not execute events)

**Rationale:** These entry points serve different purposes (creation, display, configuration). Execution belongs in Event Execution Surface.

---

## 4. Execution Modes

### 4.1 Generic Event (Meeting / Appointment)

**Mode:** Simple execution flow for generic events.

**Execution Flow:**
1. **Start Event:** User clicks "Start Event" → status changes to `IN_PROGRESS`
2. **Perform Work:** User completes meeting/appointment activities
3. **Complete Event:** User clicks "Complete Event" → status changes to `COMPLETED`

**Actions Available:**
- Start Event (if `PLANNED`)
- Complete Event (if `IN_PROGRESS`)
- Cancel Event (if `PLANNED` or `IN_PROGRESS`)

**Linked Work:**
- Optional linked tasks (can be created/completed)
- Optional notes (can be added/updated)

**State Management:**
- System-controlled state transitions
- No manual state editing
- Clear state visibility (badges, indicators)

### 4.2 Field Sales Beat

**Mode:** Route-based execution for sales beats with multiple stops.

**Execution Flow:**
1. **Start Beat:** User clicks "Start Beat" → status changes to `IN_PROGRESS`
2. **Navigate Route:** User moves through route sequence (org 1 → org 2 → org 3)
3. **Complete Stop:** User completes work at each stop (optional forms, notes)
4. **Complete Beat:** User clicks "Complete Beat" → status changes to `COMPLETED`

**Actions Available:**
- Start Beat (if `PLANNED`)
- Move to Next Stop (if `IN_PROGRESS`, has next stop)
- Complete Stop (if `IN_PROGRESS`, at a stop)
- Complete Beat (if `IN_PROGRESS`, all stops complete)
- Cancel Beat (if `PLANNED` or `IN_PROGRESS`)

**Linked Work:**
- Route sequence management (current stop, next stop)
- Per-stop forms (optional)
- Per-stop notes (optional)
- Order creation (if enabled)
- Payment collection (if enabled)

**State Management:**
- System-controlled state transitions
- Route sequence tracking (`currentOrgIndex`)
- Clear route progress visibility

### 4.3 Audit Event

**Mode:** Compliance-grade execution flow for audit events with role-based actions.

**Execution Flow:**
1. **Check-In:** Auditor clicks "Check-In" → geo verification, `auditState` changes to `In progress`
2. **Complete Form:** Auditor completes linked audit form → form response submitted
3. **Check-Out:** Auditor clicks "Check-Out" → geo verification, `auditState` changes to `Ready for review`
4. **Review:** Reviewer reviews form response → approves or rejects
5. **Corrective Actions:** Corrective Owner addresses findings → marks corrective actions complete
6. **Close:** Event transitions to `approved` or `closed` state

**Actions Available (by Role):**

**Auditor:**
- Check-In (if `Ready to start`, requires geo)
- Complete Form (if checked in, form not submitted)
- Submit Form (if form completed)
- Check-Out (if form submitted, requires geo)

**Reviewer (External Audit — Single Org only):**
- Review Form Response (if `Ready for review`)
- Approve Audit (if reviewed)
- Reject Audit (if reviewed, requires reason)

**Corrective Owner:**
- View Findings (if audit has findings)
- Acknowledge Corrective Actions (if findings exist)
- Mark Corrective Actions Complete (if corrective actions assigned)

**Linked Work:**
- Required linked audit form (must be completed)
- Geo tracking (required for check-in/check-out)
- Form responses (submitted, reviewed, approved/rejected)
- Corrective actions (assigned, acknowledged, completed)

**State Management:**
- System-controlled state transitions (`auditState`)
- Role-based action availability
- Immutable audit trail (no editing after check-in)
- Clear state visibility (badges, indicators, role-based UI)

---

## 5. What Execution MAY DO

### 5.1 Check-In / Start

**Action:** Begin event execution.

**Implementation:**
- Generic events: "Start Event" → status `PLANNED` → `IN_PROGRESS`
- Audit events: "Check-In" → geo verification → `auditState` `Ready to start` → `In progress`
- Field Sales Beat: "Start Beat" → status `PLANNED` → `IN_PROGRESS`

**State Changes:**
- System-controlled state transitions
- Timestamp recording (`startTime`, `checkIn.timestamp`)
- Geo capture (for audit events)

### 5.2 Launch Linked Work

**Action:** Open or interact with linked forms, tasks, or other work items.

**Implementation:**
- **Forms:** Open linked form in execution context, submit form response
- **Tasks:** View linked tasks, create tasks from event, complete tasks
- **Orders:** Create orders (Field Sales Beat), view order history
- **Payments:** Collect payments (Field Sales Beat), view payment history

**Context Preservation:**
- Linked work maintains event context
- Form responses linked to event
- Task creation pre-fills event linkage

### 5.3 Show Execution Context

**Action:** Display event information relevant to execution.

**Implementation:**
- **Event Details:** Name, type, scheduling, location
- **Role Information:** Assigned roles, current user's role, role responsibilities
- **Execution State:** Current state, state history, state transitions
- **Linked Work Status:** Form completion status, task completion status, route progress

**Visual Hierarchy:**
- Execution state first (badges, indicators)
- Current action second (what to do now)
- Context information last (details, metadata)

### 5.4 Mark Completion (System-Controlled)

**Action:** Complete event execution via system-controlled state transitions.

**Implementation:**
- Generic events: "Complete Event" → status `IN_PROGRESS` → `COMPLETED`
- Audit events: "Check-Out" → geo verification → `auditState` `In progress` → `Ready for review`
- Field Sales Beat: "Complete Beat" → status `IN_PROGRESS` → `COMPLETED` (if all stops complete)

**State Changes:**
- System-controlled state transitions (no manual editing)
- Timestamp recording (`endTime`, `checkOut.timestamp`)
- Geo capture (for audit events)
- Completion validation (all required work complete)

---

## 6. What Execution MUST NOT DO

### 6.1 Edit Event Structure

**Prohibited:** Modifying event structure, event type, or core event fields.

**Rationale:** Event structure is defined during creation. Execution operates within that structure but does not modify it.

**Examples of Prohibited Actions:**
- Changing event type
- Modifying event name (except minor corrections)
- Changing event category or classification
- Adding/removing core fields

**Location:** Event structure editing belongs in event editing surfaces (if implemented for non-audit events).

### 6.2 Change Scheduling

**Prohibited:** Modifying event scheduling, dates, times, or time-based constraints.

**Rationale:** Scheduling happens during creation. Execution operates within scheduled times but does not modify them.

**Examples of Prohibited Actions:**
- Changing start date/time
- Changing end date/time
- Modifying recurrence (if applicable)
- Rescheduling events

**Location:** Event scheduling belongs in creation surfaces (GenericEventCreateSurface, AuditScheduleSurface).

### 6.3 Modify Roles

**Prohibited:** Changing role assignments, adding/removing roles, or modifying role responsibilities.

**Rationale:** Role assignments are defined during creation (especially for audit events). Execution operates within assigned roles but does not modify them.

**Examples of Prohibited Actions:**
- Changing auditor assignment
- Adding/removing reviewers
- Modifying corrective owner
- Changing role permissions

**Location:** Role assignment belongs in creation surfaces (AuditScheduleSurface) and Settings (Event Settings).

### 6.4 Bypass Workflow Rules

**Prohibited:** Skipping required steps, bypassing validation, or circumventing workflow constraints.

**Rationale:** Workflow rules ensure compliance and data integrity. Execution must follow workflow rules, not bypass them.

**Examples of Prohibited Actions:**
- Completing event without required form submission
- Checking out without checking in
- Approving audit without review
- Skipping geo verification (for audit events)
- Completing beat without completing all stops

**Enforcement:**
- Backend validates workflow rules
- Frontend disables actions that violate workflow
- Clear error messages explain workflow requirements

---

## 7. UX Principles

### 7.1 Calm, Focused, Task-Oriented

**Principle:** Event Execution must feel calm and focused, not busy or overwhelming.

**Implementation:**
- **Single Focus:** One primary action at a time
- **Clear Hierarchy:** Execution state and current action prominently displayed
- **Minimal Distractions:** No side navigation, no unrelated actions
- **Task-Oriented Language:** "What do I do now?" not "Here are all options"

**Rationale:** Execution is about performing work, not exploring features. A calm, focused interface reduces cognitive load and improves task completion.

### 7.2 No Side Navigation

**Principle:** Event Execution must not include side navigation or navigation menus.

**Implementation:**
- **Full-Width Layout:** Execution interface uses full viewport width
- **No Sidebar:** No navigation sidebar or menu
- **Focused Content:** Execution actions and context only
- **Breadcrumb Navigation:** Optional breadcrumb for context, but no persistent navigation

**Rationale:** Side navigation distracts from execution tasks. Users should focus on performing work, not navigating to other areas.

### 7.3 Clear "What Do I Do Now"

**Principle:** Event Execution must clearly answer "What do I do now?" at every step.

**Implementation:**
- **Primary Action Prominent:** Current action displayed prominently (large button, clear label)
- **State-Based Actions:** Actions change based on execution state
- **Role-Based Actions:** Actions change based on user's role
- **Progress Indicators:** Clear progress indicators for multi-step execution
- **Helper Text:** Inline helper text explains what each action does

**Rationale:** Users need clear guidance on what to do next. Ambiguity leads to confusion and incomplete execution.

### 7.4 Strong State Visibility

**Principle:** Event Execution must make execution state highly visible and understandable.

**Implementation:**
- **State Badges:** Prominent badges showing current state (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- **State History:** Optional state history showing state transitions
- **Role Indicators:** Clear indicators showing user's role and available actions
- **Progress Indicators:** Progress bars or indicators for multi-step execution (forms, route progress)
- **Visual Feedback:** Immediate visual feedback on state changes (animations, color changes)

**Rationale:** State visibility helps users understand where they are in the execution process and what comes next.

---

## 8. Relationship to Other Surfaces

### 8.1 Inbox

**Relationship:** Event Execution resolves Inbox items by providing the execution interface for events that require attention.

**Flow:**
1. Event appears in Inbox for assigned users (based on role and execution state)
2. User clicks Inbox item → navigates to Event Execution (`/events/:eventId`)
3. User performs required work (check-in, complete form, check-out, etc.)
4. Event state changes → Inbox item updates or disappears
5. User returns to Inbox → sees updated state or item removed

**Boundary:** Inbox aggregates attention-worthy events; Event Execution performs the work.

**See:** `inbox-surface-invariants.md` for Inbox architecture.

### 8.2 Forms

**Relationship:** Event Execution launches and manages linked forms, submitting form responses as part of event execution.

**Flow:**
1. Event has `linkedFormId` (required for audit events, optional for others)
2. User clicks "Complete Form" or "Open Form" → form opens in execution context
3. User completes form → form response submitted
4. Form response linked to event (`formResponseId` stored in event)
5. Form completion status updates → execution state may change
6. For audit events: Form response reviewed → approval/rejection affects audit state

**Boundary:** Forms are linked work; Event Execution manages form completion as part of execution workflow.

**See:** Form architecture documents for form structure and response handling.

### 8.3 Event State

**Relationship:** Event Execution updates Event state through system-controlled state transitions.

**Flow:**
1. Event Execution performs actions (check-in, complete form, check-out, etc.)
2. Actions trigger state transitions via execution API (`/execution/execute`)
3. Backend validates state transitions and updates event state
4. Event state changes propagate to:
   - Event Detail view (immediate update)
   - Inbox (item updates or disappears)
   - Calendar (state badge updates)
   - Search results (state badge updates)
   - Audit dashboards (state aggregation updates)

**Boundary:** Event Execution triggers state changes; Backend controls state transitions; Other surfaces display state.

**State Management:**
- **System-Controlled:** State transitions are system-controlled, not manually editable
- **Validation:** Backend validates state transitions (workflow rules)
- **Immutability:** Completed and cancelled events are read-only (no further state changes)

### 8.4 Audit Scheduling Surface

**Relationship:** Audit Scheduling Surface creates audit events that are executed in Event Execution Surface.

**Flow:**
1. Audit Scheduling Surface creates audit event with `auditState: 'Ready to start'`
2. Event appears in Auditor's Inbox or Event Execution interface
3. Event Execution Surface provides execution interface (check-in, form, check-out)
4. Execution state changes (`Ready to start` → `In progress` → `Ready for review`)
5. Reviewer and Corrective Owner perform their role responsibilities
6. Event transitions to `approved` or `closed` state

**Boundary:** Audit Scheduling creates; Event Execution executes.

**See:** `audit-scheduling-surface.md` for audit creation architecture.

### 8.5 Event Settings

**Relationship:** Event Settings configure the structure and constraints that Event Execution operates within.

**Flow:**
1. Event Settings configure role requirements per event type
2. Event Settings configure geo rules (required for audit events)
3. Event Settings configure form linking rules
4. Event Execution enforces these constraints during execution
5. Execution actions respect Settings constraints (e.g., geo required for check-in)

**Boundary:** Event Settings configure structure; Event Execution operates within that structure.

**See:** `event-settings.md` for event settings architecture.

---

## 9. Lock Statement

### 9.1 Exclusive Execution Interface

Event execution logic **must live in Event Execution Surface**. This is a **hard architectural constraint**, not a recommendation.

**Prohibited Execution Locations:**
- Event list views (execution actions in lists)
- Event creation surfaces (execution during creation)
- Settings surfaces (execution in settings)
- Calendar views (execution in calendar, except navigation to execution surface)
- Inbox (execution in Inbox, except navigation to execution surface)

**Enforcement:**
- Execution actions (`/execution/execute` API calls) must originate from Event Execution Surface
- Other surfaces navigate to Event Execution Surface for execution
- Code comments reference this document

### 9.2 No Execution Actions in Lists

**Prohibited:** Execution actions (check-in, complete form, check-out) in event list views.

**Rationale:** Lists are for discovery and navigation, not execution. Execution requires focused interface with full context.

**Allowed:** Lists may show execution state (badges, indicators) and navigate to Event Execution Surface.

**Location:** Execution actions belong in Event Execution Surface (`/events/:eventId`).

### 9.3 No Execution Actions in Settings

**Prohibited:** Execution actions in Settings surfaces.

**Rationale:** Settings configure structure, not execute events. Execution belongs in execution surfaces.

**Location:** Execution actions belong in Event Execution Surface (`/events/:eventId`).

### 9.4 New Execution Feature Requirements

Any proposal to add a new execution feature must:

1. **Reference this document** in the proposal
2. **Justify the feature** with clear use case
3. **Ensure it fits execution scope** (performing work, not creating/editing)
4. **Update this document** if the feature is approved
5. **Update execution API** if backend changes needed

### 9.5 Violation Process

Any violation of this lock (execution actions outside Event Execution Surface) must:

1. **Be rejected in code review** (PR rejection)
2. **Require architecture review** before reconsideration
3. **Update this document** if exception is approved
4. **Update execution API** if exception is approved

### 9.6 Change Process

Any proposal to modify Event Execution Surface scope must:

1. **Justify the change** with clear architectural reasoning
2. **Propose alternative** that maintains the exclusive execution interface
3. **Update this document** if the change is approved
4. **Update related documents** (`audit-scheduling-surface.md`, `event-settings.md`, `inbox-surface-invariants.md`) if needed
5. **Update execution API** if needed

### 9.7 Enforcement Mechanisms

**Code-Level Enforcement:**
- Execution API (`/execution/execute`) validates execution context
- Frontend routes execution actions to Event Execution Surface
- Code comments reference this document

**Documentation Enforcement:**
- This document serves as the architectural guardrail
- Code comments reference this document
- Architecture reviews check compliance with this document

**Process Enforcement:**
- Code reviews reject violations
- Architecture reviews required for exceptions
- Documentation updates required for approved changes

---

## Appendix: Related Documents

- **Audit Scheduling Surface:** `docs/architecture/audit-scheduling-surface.md` — Creates audit events executed in Event Execution Surface
- **Event Settings:** `docs/architecture/event-settings.md` — Configures event structure and constraints
- **Inbox Surface Invariants:** `docs/architecture/inbox-surface-invariants.md` — How events appear in Inbox and route to execution
- **Module Settings Doctrine:** `docs/architecture/module-settings-doctrine.md` — Settings/Surfaces/Work separation

---

**Document Status:** Locked  
**Last Updated:** January 2026  
**Next Review:** When event execution requirements change
