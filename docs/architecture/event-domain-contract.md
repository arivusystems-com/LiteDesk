# Event Domain Contract

**Version:** 1.0  
**Date:** January 2026  
**Status:** Contract-Locked (Frozen)  
**Type:** Domain Doctrine

---

## Purpose of the Event Domain

The Event domain represents scheduled, executable work items in the LiteDesk platform. Events are the primary mechanism for organizing time-bound activities, whether they are meetings, audits, sales beats, or other scheduled work. The Event domain provides a unified model for execution, tracking, and completion of work across different event types while maintaining strict boundaries between creation, execution, and configuration.

**This domain is contract-locked.** All changes must align with this contract. See "Change Policy" below.

---

## What an Event IS

An Event is:

1. **A Scheduled Work Item**
   - Has a start and end date/time
   - Represents a discrete unit of work to be performed
   - Can be linked to organizations, people, forms, and other work items

2. **An Executable Entity**
   - Has an execution state (Planned, In Progress, Completed, Cancelled)
   - Supports role-based execution (Owner, Auditor, Reviewer, Corrective Owner)
   - Can be executed through a dedicated execution surface

3. **A Type-Aware Entity**
   - Has a defined event type (Meeting, Internal Audit, External Audit, Field Sales Beat)
   - Event type determines execution mode (generic vs. audit-workflow)
   - Event type determines available actions and workflow paths

4. **A Stateful Entity**
   - Maintains execution status (`status`: Planned, Completed, Cancelled)
   - Maintains audit workflow state (`auditState`: Ready to start, checked_in, submitted, etc.) for audit events
   - Tracks execution metadata (check-in/check-out, time spent, geo location)

5. **A Permission-Aware Entity**
   - Permissions are explained in the UI (read-only explanation)
   - Permissions are enforced on the backend (server-side validation)
   - Permission model is deterministic and pure

---

## What an Event IS NOT

An Event is **NOT**:

1. **A Configuration Entity**
   - Events are not event type definitions
   - Events are not settings or configuration
   - Event structure is configured separately (Event Settings)

2. **A Creation Interface**
   - Events are not created in the execution surface
   - Event creation belongs to creation surfaces (GenericEventCreateSurface, AuditScheduleSurface)
   - Event execution operates on existing events

3. **A Scheduling Interface**
   - Events are not scheduled in the execution surface
   - Scheduling happens during creation
   - Execution operates on already-scheduled events

4. **A Settings Interface**
   - Events are not configured in the execution surface
   - Settings belong to Settings → Core Modules → Events
   - Execution operates within configured constraints

5. **A Generic Activity Log**
   - Events have a canonical activity model (EventActivity)
   - Activity log is not a generic audit trail
   - Activity entries follow a defined schema and ordering

---

## Execution Authority (Single Surface)

**INVARIANT: Event execution happens through a single, authoritative execution surface.**

### Execution Surface

- **Location:** `/events/:eventId` (Event Detail view)
- **Component:** `EventExecutionSurface.vue`
- **Purpose:** Exclusive interface for performing event-related work

### Execution Actions

Execution actions are **server-enforced**:

- `START_EXECUTION` - Start event execution (generic events only)
- `COMPLETE_EXECUTION` - Complete event execution (generic events only)
- `CANCEL_EXECUTION` - Cancel event execution (generic events only)
- `AUDIT_CHECK_IN` - Check in to audit event (audit events only)

**Enforcement:** `server/domain/events/eventPermissions.js`

### Execution State Machine

Execution state transitions are **system-controlled**:

- `Planned` → `In Progress` (via start/check-in)
- `In Progress` → `Completed` (via complete/check-out)
- `Planned` or `In Progress` → `Cancelled` (via cancel)
- `Completed` and `Cancelled` are terminal states

**No partial state.** Events must be reloaded after mutations to ensure consistent state.

---

## Audit Workflow Authority (Server-Enforced)

**INVARIANT: Audit workflow transitions are server-enforced and follow strict state machine rules.**

### Audit Workflow States

Audit events follow a workflow state machine:

- `Ready to start` → `checked_in` → `submitted` / `pending_corrective` / `needs_review` → `approved` / `rejected` → `closed`

### Workflow Actions

Workflow actions are **server-enforced**:

- `SUBMIT_AUDIT` - Submit audit form (requires `checked_in` state, requires formResponseId)
- `CLOSE_AUDIT` - Close audit (requires `needs_review` state, requires no pending corrective actions)
- `REOPEN_AUDIT` - Reopen closed audit (requires `closed` state)

**Enforcement:** `server/domain/audit/auditWorkflowPermissions.js`

### Workflow Rules

1. **State Transitions Must Be Valid**
   - Cannot skip states
   - Cannot transition backwards (except via explicit reopen)
   - Cannot transition from terminal states

2. **Corrective Actions Must Be Complete**
   - Cannot close audit with pending corrective actions
   - Corrective actions are tracked in FormResponse model
   - All `managerAction.status` must be `'completed'` before closing

3. **Form Response Required**
   - Cannot submit audit without formResponseId
   - Form response must belong to event's linked form
   - Form response must exist and be valid

---

## Permission Model (Explanatory UI + Enforced Backend)

**INVARIANT: Permissions are explained in the UI and enforced on the backend.**

### UI Permission Explanation

- **Location:** `client/src/platform/events/eventPermissions.utils.ts`
- **Purpose:** Explain which actions are allowed and why
- **Behavior:** Read-only, does not block actions
- **Model:** `EventActionPermission` interface

### Backend Permission Enforcement

- **Location:** `server/domain/events/eventPermissions.js`
- **Purpose:** Enforce execution permissions server-side
- **Behavior:** Rejects invalid actions with 403 status
- **Response:** `{ error: 'ACTION_NOT_ALLOWED', message: '<reason>' }`

### Permission Rules

**Generic Events:**
- `START_EXECUTION`: Only if `status === 'Planned'` and not started
- `COMPLETE_EXECUTION`: Only if execution already started
- `CANCEL_EXECUTION`: Only if execution already started

**Audit Events:**
- `START_EXECUTION`: Always false (started via workflow)
- `COMPLETE_EXECUTION`: Always false (completed by workflow closure)
- `CANCEL_EXECUTION`: Always false (cannot be cancelled manually)
- `AUDIT_CHECK_IN`: Only if `auditState === 'Ready to start'`

**Workflow Actions:**
- `SUBMIT_AUDIT`: Only if `auditState === 'checked_in'` and formResponseId exists
- `CLOSE_AUDIT`: Only if `auditState === 'needs_review'` and no pending corrective actions
- `REOPEN_AUDIT`: Only if `auditState === 'closed'`

---

## Activity Log Canon

**INVARIANT: Event activities follow a canonical model and ordering.**

### Activity Model

- **Location:** `client/src/platform/events/eventActivity.types.ts`
- **Purpose:** Canonical representation of event activities
- **Behavior:** Read-only, deterministic ordering

### Activity Types

- `EVENT_CREATED` - Event was created
- `STATUS_CHANGED` - Event status changed
- `EXECUTION_STARTED` - Event execution started
- `EXECUTION_COMPLETED` - Event execution completed
- `EXECUTION_CANCELLED` - Event execution cancelled
- `AUDIT_CHECK_IN` - Audit checked in
- `AUDIT_SUBMITTED` - Audit submitted
- `AUDIT_APPROVED` - Audit approved
- `AUDIT_REJECTED` - Audit rejected
- `GEO_CAPTURED` - Geo location captured
- `NOTE_ADDED` - Note added to event

### Activity Sources

- `SYSTEM` - System-generated activity
- `USER` - User-initiated activity
- `WORKFLOW` - Workflow-generated activity

### Activity Ordering

Activities are ordered by timestamp (most recent first). Activities must be deterministic and not inferred from missing data.

---

## Reload Invariants (No Partial State)

**INVARIANT: Events must be reloaded after mutations to ensure consistent state.**

### Reload Rules

1. **After Execution Mutations**
   - After `START_EXECUTION`, reload event to get updated `executionStartTime`
   - After `COMPLETE_EXECUTION`, reload event to get updated `status` and `completedAt`
   - After `CANCEL_EXECUTION`, reload event to get updated `status` and `cancelledAt`

2. **After Workflow Mutations**
   - After `SUBMIT_AUDIT`, reload event to get updated `auditState`
   - After `CLOSE_AUDIT`, reload event to get updated `auditState` and `status`
   - After `REOPEN_AUDIT`, reload event to get updated `auditState`

3. **After Check-In/Check-Out**
   - After `AUDIT_CHECK_IN`, reload event to get updated `auditState` and `checkIn`
   - After check-out, reload event to get updated `checkOut` and `timeSpent`

### No Partial State

- **Never** assume state after mutation
- **Always** reload event after mutation
- **Never** infer missing state from existing fields
- **Always** use server-returned state

---

## Explicit Non-Goals

The Event domain **does not**:

1. **Manage Event Creation**
   - Creation belongs to creation surfaces
   - Execution operates on existing events

2. **Manage Event Scheduling**
   - Scheduling happens during creation
   - Execution operates on already-scheduled events

3. **Manage Event Settings**
   - Settings belong to Settings module
   - Execution operates within configured constraints

4. **Manage Event Type Definitions**
   - Event types are defined in metadata
   - Execution uses existing type definitions

5. **Manage Role Assignments**
   - Roles are assigned during creation
   - Execution uses existing role assignments

6. **Manage Form Linking**
   - Forms are linked during creation
   - Execution uses existing form links

7. **Provide Generic Audit Trail**
   - Activity log is event-specific
   - Not a generic audit trail system

---

## Change Policy

**This domain is contract-locked.** Changes must align with this contract.

### Allowed Changes

1. **Bug Fixes**
   - Fixing incorrect behavior
   - Fixing security vulnerabilities
   - Fixing performance issues

2. **Non-Breaking Enhancements**
   - Adding new event types (following existing patterns)
   - Adding new activity types (following existing patterns)
   - Adding new permission checks (following existing patterns)

3. **Documentation Updates**
   - Clarifying existing behavior
   - Updating examples
   - Fixing documentation errors

### Prohibited Changes

1. **Breaking Contract Changes**
   - Changing execution authority model
   - Changing permission model
   - Changing activity log canon
   - Changing reload invariants

2. **Architectural Changes**
   - Splitting execution surface
   - Adding new execution surfaces
   - Changing state machine rules
   - Changing workflow rules

3. **Model Changes**
   - Changing Event schema without migration
   - Changing permission model structure
   - Changing activity model structure

### Change Process

1. **Propose Change**
   - Document proposed change
   - Explain why it's needed
   - Show how it aligns with contract

2. **Review Contract**
   - Review against this contract
   - Identify contract updates needed
   - Update contract if change is approved

3. **Implement Change**
   - Follow existing patterns
   - Maintain backward compatibility
   - Update all cross-file references

4. **Update Contract**
   - Update this document
   - Update cross-file references
   - Update DEV-only guards

---

## Cross-File References

This contract is referenced in:

- `client/src/views/EventDetail.vue`
- `client/src/views/EventExecutionSurface.vue`
- `client/src/platform/events/eventActivity.types.ts`
- `client/src/platform/events/eventPermissions.types.ts`
- `server/domain/events/eventPermissions.js`
- `server/domain/audit/auditWorkflowPermissions.js`

**All Event domain files must reference this contract.**

---

## DEV-Only Guards

In development mode, the Event domain signals its contract-locked status:

```javascript
console.info(
  '[Event Domain]',
  'Event domain is contract-locked. See docs/architecture/event-domain-contract.md'
);
```

This signals to future developers that this domain is intentional and guarded.

---

## Conclusion

The Event domain is **contract-locked**. All changes must align with this contract. This document is the single source of truth for Event domain behavior, structure, and evolution.

**This domain is frozen.** Changes require contract review and approval.
