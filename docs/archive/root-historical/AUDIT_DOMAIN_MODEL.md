# Audit App Domain Model (Execution-Aware, CRM-Backed)

## Overview

This document describes the Audit App domain models that provide auditor-facing concepts while maintaining CRM as the single source of truth for audit execution logic.

**Key Principle:** Audit App models are **read-only references** and **execution context** only. All workflow logic, state management, and business rules remain in CRM.

---

## Architecture Principles

### Data Ownership

| Data | Owner | Location |
|------|-------|----------|
| `auditState` | CRM | `Event.auditState` |
| Form data | CRM | `FormResponse` |
| Corrective actions | CRM | `FormResponse.correctiveActions` |
| Approval / Rejection | CRM | `Event` (via `approveAudit`/`rejectAudit`) |
| Assignment | Audit App | `AuditAssignment` |
| Execution context | Audit App | `AuditExecutionContext` |
| Timeline | CRM → Audit App | `AuditTimeline` (read-only sync) |

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    CRM (Source of Truth)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Event     │  │ FormResponse │  │ Corrective   │      │
│  │              │  │              │  │   Actions    │      │
│  │ - auditState │  │ - responses  │  │ - workflow   │      │
│  │ - workflow   │  │ - immutability│ │ - status     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                 │              │
│         └──────────────────┴─────────────────┘              │
│                          │                                   │
│                    (Sync Hooks)                              │
└──────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Audit App (Auditor View)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Audit      │  │   Execution   │  │   Timeline   │      │
│  │ Assignment   │  │   Context     │  │              │      │
│  │              │  │               │  │              │      │
│  │ - index      │  │ - session     │  │ - history    │      │
│  │ - filter     │  │ - tracking    │  │ - read-only  │      │
│  │ - reference  │  │ - UX state    │  │ - sync only  │      │
│  └──────────────┘  └───────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Model Specifications

### 1. AuditAssignment

**File:** `server/models/AuditAssignment.js`

**Purpose:**
- Primary auditor-facing view of assigned audits
- Acts as index + access gate for Audit App
- Points to CRM Event (single source of truth)

**Key Fields:**

```javascript
{
  auditorId: ObjectId,            // User (AUDIT app user)
  organizationId: ObjectId,      // Auditor's org
  eventId: ObjectId,             // CRM Event ID (source of truth) - REQUIRED, UNIQUE
  
  // Denormalized snapshots (read-only cache)
  auditType: String,             // Copied for filtering
  auditState: String,            // Synced from Event (read-only)
  scheduledAt: Date,
  dueAt: Date,
  
  // Audit App managed
  status: 'active' | 'closed',
  
  createdAt, updatedAt
}
```

**Rules:**
- ✅ `eventId` is mandatory and unique (one assignment per event)
- ✅ No workflow state stored independently
- ✅ `auditState` is synced from Event (read-only cache)
- ✅ `auditType` is copied snapshot for filtering
- ✅ Assignment lifecycle managed by Audit App

**Indexes:**
- `{ organizationId, auditorId, status }` - Active assignments query
- `{ organizationId, auditType, status }` - Filter by type
- `{ auditorId, auditState }` - State-based queries
- `{ auditorId, dueAt }` - Due date sorting

**Methods:**
- `close()` - Mark assignment as closed
- `findActiveForAuditor(auditorId, organizationId)` - Static query helper
- `findByEvent(eventId)` - Static query helper for sync operations

---

### 2. AuditExecutionContext

**File:** `server/models/AuditExecutionContext.js`

**Purpose:**
- Tracks execution session metadata for Audit App UX
- NOT a workflow engine
- NOT a replacement for CRM logic
- Used only for Audit App UX & tracking

**Key Fields:**

```javascript
{
  auditAssignmentId: ObjectId,
  eventId: ObjectId,              // CRM Event
  formResponseId: ObjectId,       // CRM FormResponse
  
  // Execution tracking (mirrors CRM but for UX)
  checkedInAt: Date,
  checkedOutAt: Date,
  
  geo: {
    lat, lng, accuracy, address
  },
  
  executedBy: ObjectId,           // Auditor
  executionStatus: 'idle' | 'in_progress' | 'submitted',
  
  createdAt, updatedAt
}
```

**Rules:**
- ✅ Lifecycle mirrors CRM `auditState` but doesn't control it
- ✅ No state decisions allowed here
- ✅ All workflow logic remains in CRM
- ✅ Purely for execution tracking and UX

**Indexes:**
- `{ organizationId, executedBy, executionStatus }` - Active executions
- `{ auditAssignmentId, executionStatus }` - Assignment context
- `{ eventId, executedBy }` - Event-based queries

**Methods:**
- `startExecution(geoData)` - Mark as in progress with geo
- `markSubmitted()` - Mark as submitted
- `findActiveForAssignment(auditAssignmentId)` - Static query helper
- `findByEvent(eventId)` - Static query helper

---

### 3. AuditTimeline

**File:** `server/models/AuditTimeline.js`

**Purpose:**
- Auditor-visible timeline of audit events
- Mirrors CRM audit trail
- No write authority from Audit App

**Key Fields:**

```javascript
{
  eventId: ObjectId,
  actorId: ObjectId,
  action: String,                 // CHECK_IN, SUBMIT, APPROVE, REJECT, etc.
  fromState: String,
  toState: String,
  meta: Object,                   // Flexible metadata
  createdAt: Date
}
```

**Rules:**
- ✅ Populated via CRM hooks only
- ✅ Audit App never mutates this
- ✅ Read-only for Audit App users
- ✅ Source of truth remains in CRM `Event.auditHistory`

**Action Types:**
- `CHECK_IN` - Auditor checked in
- `CHECK_OUT` - Auditor checked out
- `SUBMIT` - Form submitted
- `CORRECTIVE_ACTION_CREATED` - Corrective action created
- `CORRECTIVE_ACTION_COMPLETED` - Corrective action completed
- `APPROVE` - Audit approved
- `REJECT` - Audit rejected
- `STATUS_CHANGED` - Event status changed
- `RESCHEDULED` - Event rescheduled
- `CREATED` - Event created
- `UPDATED` - Event updated
- `CANCELLED` - Event cancelled

**Indexes:**
- `{ eventId, createdAt }` - Chronological timeline
- `{ organizationId, actorId, createdAt }` - User activity
- `{ eventId, action }` - Action-based queries

**Methods:**
- `findByEvent(eventId)` - Get timeline for event
- `findRecent(organizationId, limit)` - Recent activity
- `findByAction(eventId, action)` - Filter by action type

---

## Sync Strategy

### Data Flow

```
CRM Event Created
    │
    ├─→ Create AuditAssignment (via hook/service)
    │   - Copy auditType, scheduledAt, dueAt
    │   - Set auditState from Event.auditState
    │
    └─→ Create AuditTimeline entry (via hook)
        - Action: CREATED
        - Actor: Event creator

CRM Event.auditState Changed
    │
    ├─→ Update AuditAssignment.auditState (sync)
    │   - Read-only update (no validation)
    │
    └─→ Create AuditTimeline entry (via hook)
        - Action: STATUS_CHANGED
        - fromState, toState

Form Response Submitted
    │
    ├─→ Update AuditExecutionContext (if exists)
    │   - Set executionStatus = 'submitted'
    │   - Set checkedOutAt
    │
    └─→ Create AuditTimeline entry
        - Action: SUBMIT

Corrective Actions Completed
    │
    └─→ Create AuditTimeline entry
        - Action: CORRECTIVE_ACTION_COMPLETED

Audit Approved/Rejected
    │
    ├─→ Update AuditAssignment.status = 'closed' (if approved)
    │
    └─→ Create AuditTimeline entry
        - Action: APPROVE or REJECT
```

### Sync Implementation (Future)

**Option 1: Post-Save Hooks (Recommended)**
```javascript
// In Event model post-save hook
eventSchema.post('save', async function(doc) {
  if (AUDIT_EVENT_TYPES.includes(doc.eventType)) {
    await syncAuditAssignment(doc);
    await syncAuditTimeline(doc);
  }
});
```

**Option 2: Service Layer**
```javascript
// In eventController.js after state changes
async function syncToAuditApp(event) {
  await AuditAssignment.findOneAndUpdate(
    { eventId: event._id },
    { auditState: event.auditState },
    { upsert: true }
  );
  
  await AuditTimeline.create({
    eventId: event._id,
    actorId: req.user._id,
    action: 'STATUS_CHANGED',
    fromState: previousState,
    toState: event.auditState
  });
}
```

**Rules:**
- ❌ No polling
- ❌ No dual state machines
- ✅ Event-driven sync only
- ✅ CRM is always source of truth

---

## Permissions & Access Control

### Current State

Auditors currently use **ownership-based authorization**:
- Only `eventOwnerId` (which mirrors `auditorId`) can approve/reject
- Enforced at controller level, not via permission middleware

### Future: Audit App Permissions

When implementing Audit App permissions:

```javascript
appPermissions: {
  AUDIT: {
    audits: {
      view: true,      // Can see assigned audits
      execute: true,   // Can check-in and submit
      approve: true    // Can approve/reject (if owner)
    }
  }
}
```

**Rules:**
- ✅ Auditor authorization remains ownership-based
- ✅ Event owner (`auditorId`) = execution authority
- ✅ Role permissions only gate visibility
- ✅ No CRM permissions required

---

## Relationship to CRM Models

### Event Model

**Reference:** `AuditAssignment.eventId → Event._id`

**Synced Fields:**
- `auditState` - Read-only sync from `Event.auditState`
- `auditType` - Copied from `Event.eventType`
- `scheduledAt` - Copied from `Event.startDateTime`
- `dueAt` - Copied from `Event.endDateTime`

**Never Synced:**
- Workflow logic
- State transitions
- Business rules

### FormResponse Model

**Reference:** `AuditExecutionContext.formResponseId → FormResponse._id`

**Usage:**
- Execution context tracks which response is being worked on
- No data duplication
- All form data remains in CRM

### Corrective Actions

**Location:** `FormResponse.correctiveActions` (CRM)

**Audit App Access:**
- Read-only via FormResponse reference
- Timeline entries track corrective action events
- No Audit App model for corrective actions

---

## Validation Checklist

### ✅ No CRM Logic Duplicated
- [x] AuditAssignment has no workflow logic
- [x] AuditExecutionContext has no state decisions
- [x] AuditTimeline is read-only
- [x] All models reference CRM, don't replace it

### ✅ CRM Remains Execution Engine
- [x] Event.auditState is source of truth
- [x] FormResponse contains all form data
- [x] Corrective actions in CRM only
- [x] Approval/rejection in CRM controllers

### ✅ Auditors Need Only AUDIT App
- [x] AuditAssignment provides auditor view
- [x] No CRM permissions required
- [x] Execution context for UX only
- [x] Timeline for visibility only

### ✅ No CRM Permissions Required
- [x] Ownership-based authorization
- [x] eventOwnerId = auditorId
- [x] No CRM module access needed
- [x] Audit App routes independent

### ✅ Clean Separation of Concerns
- [x] CRM = execution engine
- [x] Audit App = auditor workspace
- [x] Models reference, don't duplicate
- [x] Sync is one-way (CRM → Audit App)

### ✅ Future-Proof for Reporting & Analytics
- [x] AuditAssignment indexes support filtering
- [x] AuditTimeline supports activity analysis
- [x] Execution context supports performance metrics
- [x] All models have proper indexes

---

## What's NOT Included (Yet)

### ❌ No Audit UI
- Frontend components not created
- No Vue components for Audit App
- No routing for audit views

### ❌ No Execution APIs
- No check-in endpoints
- No form submission endpoints
- No approval/rejection endpoints (these remain in CRM)

### ❌ No CRM Controller Changes
- Existing audit flow unchanged
- No modifications to eventController.js
- No modifications to formResponseController.js

### ❌ No Sync Implementation
- Hooks not implemented yet
- Service layer not created
- Manual sync required for now

---

## Next Steps

### Phase 1: Sync Implementation
1. Create sync service (`server/services/auditSyncService.js`)
2. Add post-save hooks to Event model
3. Add hooks to FormResponse model
4. Test sync on event creation/update

### Phase 2: Audit App APIs
1. Create `auditController.js` with read endpoints
2. Create `auditRoutes.js` with proper middleware
3. Implement assignment listing
4. Implement execution context management

### Phase 3: Execution Integration
1. Proxy check-in to CRM (via Audit App)
2. Proxy form submission to CRM
3. Proxy approval/rejection to CRM
4. Maintain Audit App context throughout

### Phase 4: UI Implementation
1. Audit dashboard (assignment list)
2. Audit detail view (execution context)
3. Timeline view
4. Approval/rejection UI

---

## Summary

The Audit App domain models provide:

1. **AuditAssignment** - Auditor-facing index of assigned audits
2. **AuditExecutionContext** - Execution session tracking for UX
3. **AuditTimeline** - Read-only history of audit events

**Key Principles:**
- ✅ CRM remains single source of truth
- ✅ Audit App models are references only
- ✅ No workflow logic duplication
- ✅ Clean separation of concerns
- ✅ Future-proof for reporting

**Status:** ✅ Domain models created  
**Next:** Sync implementation and API endpoints

---

**Last Updated:** Based on Phase H - Step 2 requirements

