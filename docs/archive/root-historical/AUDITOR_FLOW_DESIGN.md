# Auditor Flow Design in Events & Response Modules

## Overview

This document explains how the auditor flow is designed in the current codebase, covering the audit workflow from event creation through approval/rejection, including the relationship between Events and Form Responses.

---

## Key Concepts

### 1. Audit Event Types

The system supports three audit event types:

1. **Internal Audit**
   - Audits within the same organization
   - All roles (Auditor, Reviewer, Corrective Owner) must belong to the audit organization
   - `relatedToId` must equal the requester's organization

2. **External Audit — Single Org**
   - Audits of a specific external organization
   - Auditor can be internal user OR user from the selected organization
   - Corrective Owner must belong to the selected organization
   - Reviewer must be internal user

3. **External Audit Beat**
   - Route-based audits (multiple organizations)
   - Auditor must be internal user only
   - Corrective Owner must be internal user
   - Supports background tracking

### 2. Key Fields in Event Model

```javascript
{
  eventType: 'Internal Audit' | 'External Audit — Single Org' | 'External Audit Beat',
  auditState: 'Ready to start' | 'checked_in' | 'submitted' | 'pending_corrective' | 'needs_review' | 'approved' | 'rejected' | 'closed',
  status: 'Planned' | 'Completed' | 'Cancelled',  // System-controlled
  eventOwnerId: ObjectId,  // Mirrors auditorId for ownership
  auditorId: ObjectId,      // Explicit auditor field (source of truth for audit events)
  correctiveOwnerId: ObjectId,  // User responsible for corrective actions
  relatedToId: ObjectId,    // Organization being audited
  reviewerId: ObjectId      // Optional reviewer
}
```

**Important:** For audit events, `auditorId` is the source of truth. The system mirrors `auditorId` to `eventOwnerId` for ownership purposes, but `eventOwnerId` is hidden in the audit UX to avoid confusion.

---

## Auditor Selection Rules

### Validation Logic (`validateAuditUserRoleScopes`)

The system enforces strict rules for who can be assigned as an auditor based on event type:

#### Internal Audit
- **Auditor:** Must belong to the audit organization (`relatedToId`)
- **Reviewer:** Must belong to the audit organization
- **Corrective Owner:** Must belong to the audit organization

#### External Audit — Single Org
- **Auditor:** Can be:
  - Internal user (from requester's organization), OR
  - User from the selected organization (`relatedToId`)
- **Reviewer:** Must be internal user
- **Corrective Owner:** Must belong to the selected organization

#### External Audit Beat
- **Auditor:** Must be internal user only
- **Corrective Owner:** Must be internal user
- **Reviewer:** Must be internal user (if provided)

### Code Location
- **File:** `server/controllers/eventController.js`
- **Function:** `validateAuditUserRoleScopes()` (lines 12-166)

---

## Audit State Flow

The `auditState` field tracks the workflow progression separately from the system-controlled `status` field.

### State Transitions

```
┌─────────────────┐
│ Event Created   │
│ (audit event)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ready to start  │ ◄─── Default state on creation
│                 │      - Shows "Check-In" button
│                 │      - Event can be edited
└────────┬────────┘
         │
         │ User clicks "Check-In"
         │ (GEO validation)
         ▼
┌─────────────────┐
│   checked_in    │ ◄─── User checked in successfully
│                 │      - Shows "Open Audit Form" button
│                 │      - Event locked from editing
│                 │      - Form response created
└────────┬────────┘
         │
         │ User submits audit form
         │ (via FormResponse submission)
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────────┐
│submitted│ │pending_corrective│
│         │ │                  │
│(No      │ │(Has failures)    │
│failures)│ │                  │
└────┬────┘ └────────┬──────────┘
     │               │
     │               │ Corrective Owner
     │               │ complete all actions
     │               │
     │               ▼
     │        ┌──────────────┐
     │        │needs_review  │ ◄─── All corrective actions completed
     │        │              │      - Notifies auditor (event owner)
     │        │              │      - Shows "Approve"/"Reject" buttons
     │        └──────┬───────┘
     │               │
     │               │ Auditor decision
     │               │
     │        ┌──────┴───────┐
     │        │              │
     │        ▼              ▼
     │   ┌─────────┐    ┌──────────┐
     │   │approved │    │rejected  │
     │   │         │    │          │
     │   │(immediate│    │- Reopens │
     │   │transition)│   │  corrective│
     │   │         │    │  actions │
     │   └────┬────┘    │- Sets to │
     │        │         │  'open'  │
     │        │         │- Notifies │
     │        │         │  owners  │
     │        │         └────┬─────┘
     │        │              │
     │        │              │ Owner can retry
     │        │              │ (back to needs_review)
     │        │              │
     │        ▼              │
     │   ┌─────────┐         │
     │   │ closed  │ ◄───────┘
     │   │         │
     │   │- status │
     │   │  =      │
     │   │  'Completed'│
     │   │- Read-only│
     │   │- Final state│
     │   └─────────┘
     │
     └───────────────┐
                     │
                     ▼
              ┌──────────┐
              │  closed  │ ◄─── Direct path (no failures)
              │          │      (status = 'Completed')
              └──────────┘
```

### Detailed State Descriptions

1. **Ready to start** (Initial)
   - Set by: Model pre-save hook
   - UI: Shows "Check-In" button
   - Editable: Yes

2. **checked_in**
   - Set by: `checkIn()` in `eventController.js`
   - UI: Shows "Open Audit Form" button
   - Editable: No (event locked)
   - Actions: Creates FormResponse if linked form exists

3. **submitted**
   - Set by: `submitAudit()` when form submitted with NO failures
   - Auto actions: Auto check-out, calculate time spent

4. **pending_corrective**
   - Set by: `submitAudit()` when form submitted with failures
   - Actions: Creates corrective action records for each failed question
   - Assigns to `Event.correctiveOwnerId`

5. **needs_review**
   - Set by: `updateCorrectiveActionStatus()` when ALL corrective actions completed
   - UI: Shows "Approve Audit" and "Reject Audit" buttons (to auditor only)
   - Actions: Notifies auditor (event owner)

6. **approved** (Transient)
   - Set by: `approveAudit()` in `eventController.js`
   - Duration: Immediately transitions to `closed`
   - Actions: Marks all form responses as approved

7. **rejected**
   - Set by: `rejectAudit()` in `eventController.js`
   - Actions:
     - Reopens ALL corrective actions (sets status to `open`)
     - Clears auditor verification
     - Notifies Corrective Owner
     - Event `status` remains `'Planned'` (can be retried)

8. **closed** (Final)
   - Set by: `approveAudit()` immediately after `approved`
   - UI: Fully read-only, no action buttons
   - Actions:
     - Sets `status = 'Completed'`
     - Sets `completedAt` timestamp
     - Makes all form responses read-only

---

## Auditor Authorization

### Approval/Rejection Authorization

**Key Rule:** Only the event owner (auditor) can approve or reject audits.

**Code Location:** `server/controllers/eventController.js`

#### Approve Audit (`approveAudit`)
- **Endpoint:** `POST /api/events/:id/approve`
- **Authorization Check:**
  ```javascript
  if (event.eventOwnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
          message: 'Only the event owner (auditor) can approve this audit.'
      });
  }
  ```
- **State Requirements:**
  - Event must be in `needs_review` state
  - Event type must be an audit type
- **Actions:**
  1. Transitions: `needs_review` → `approved` → `closed`
  2. Sets `status = 'Completed'`
  3. Sets `completedAt` timestamp
  4. Marks all linked form responses as approved
  5. Sets `reviewStatus = 'Closed'` on responses
  6. Adds audit entry for status change

#### Reject Audit (`rejectAudit`)
- **Endpoint:** `POST /api/events/:id/reject`
- **Authorization Check:**
  ```javascript
  if (event.eventOwnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
          message: 'Only the event owner (auditor) can reject this audit.'
      });
  }
  ```
- **State Requirements:**
  - Event must be in `needs_review` state
  - Event type must be an audit type
- **Actions:**
  1. Transitions: `needs_review` → `rejected`
  2. Reopens ALL corrective actions (sets status to `open`)
  3. Clears auditor verification on corrective actions
  4. Notifies Corrective Owner
  5. Event `status` remains `'Planned'` (can be retried)
  6. Adds audit entry for rejection

---

## Form Response Integration

### Response States and Audit Flow

Form responses are tightly integrated with the audit event workflow:

1. **Response Creation**
   - Created when user checks in to audit event
   - Linked to event via `linkedTo: { type: 'Event', id: eventId }`

2. **Response Submission**
   - When form is submitted, system checks for failures
   - If failures exist:
     - Creates corrective actions for each failed question
     - Sets event `auditState = 'pending_corrective'`
     - Sets response `reviewStatus = 'Pending Corrective Action'`
   - If no failures:
     - Sets event `auditState = 'submitted'` or `'needs_review'`
     - Sets response `reviewStatus = 'Needs Auditor Review'`

3. **Corrective Actions**
   - Each failed question gets a corrective action
   - Assigned to `Event.correctiveOwnerId`
   - Corrective actions have:
     - `managerAction`: Status (open, in_progress, completed)
     - `auditorVerification`: Approved status, comment, verifiedBy, verifiedAt

4. **Review Status Transitions**
   - `Pending Corrective Action`: When failures exist
   - `Needs Auditor Review`: When all corrective actions completed
   - `Closed`: When auditor approves
   - `Rejected`: When auditor rejects (reopens corrective actions)

### Response Immutability

**Important:** Once a response is submitted (`executionStatus = 'Submitted'`), it becomes immutable except for:
- `reviewStatus`
- `correctiveActions`
- `finalReport`
- Archive/invalidate fields

This ensures audit data integrity.

**Code Location:**
- Model: `server/models/FormResponse.js` (pre-save middleware)
- Controller: `server/controllers/formResponseController.js`

---

## Permissions & Access Control

### Current Permission Model

The system uses **CRM-scoped permissions** for Events module:
- Module: `events`
- Actions: `create`, `read`, `update`, `delete`
- Scope: `all`, `team`, `own`, `none`

**Code Location:** `server/models/Role.js`

### Auditor-Specific Permissions

Currently, **auditor authorization is based on ownership**, not role permissions:
- Only `eventOwnerId` (which mirrors `auditorId`) can approve/reject
- This is enforced at the controller level, not via permission middleware

### Future Considerations for Audit App

When building the Audit App, consider:
1. **App-Scoped Permissions:** Create audit-specific permissions in `appPermissions` field
2. **Auditor Role:** Define what permissions auditors need in the Audit app context
3. **Cross-App Access:** Determine if auditors need access to Events module from Audit app

---

## Key Code Locations

### Event Controller
- **File:** `server/controllers/eventController.js`
- **Key Functions:**
  - `validateAuditUserRoleScopes()` (lines 12-166): Auditor selection validation
  - `checkIn()` (line ~1148): Check-in flow
  - `submitAudit()` (line ~1591): Form submission
  - `approveAudit()` (line 1967): Approval flow
  - `rejectAudit()` (line 2075): Rejection flow

### Form Response Controller
- **File:** `server/controllers/formResponseController.js`
- **Key Functions:**
  - `submitForm()`: Form submission with failure detection
  - `updateCorrectiveActionStatus()` (line ~993): Corrective action completion
  - `getResponseById()`: Response retrieval with event context

### Event Model
- **File:** `server/models/Event.js`
- **Key Fields:**
  - `auditState` (line 96): Workflow state
  - `auditorId` (line ~256): Explicit auditor field
  - `eventOwnerId` (line 110): Ownership (mirrors auditorId)
  - `correctiveOwnerId` (line ~256): Corrective action owner

### Form Response Model
- **File:** `server/models/FormResponse.js`
- **Key Features:**
  - Immutability enforcement (pre-save middleware)
  - Corrective actions structure
  - Review status tracking

---

## Notification Flow

### Current Implementation

Notifications are logged to console (TODO: implement notification service):

1. **Check-in:** Notifies Corrective Owner (if set)
2. **Form Submission with Failures:** Notifies Corrective Owner
3. **All Corrective Actions Completed:** Notifies auditor (event owner)
4. **Rejection:** Notifies Corrective Owner

**Code Locations:**
- Check-in: `eventController.js` (checkIn function)
- Submission: `eventController.js` (submitAudit function)
- Corrective completion: `formResponseController.js` (updateCorrectiveActionStatus)
- Rejection: `eventController.js` (rejectAudit function)

---

## Summary

### Auditor Flow Design Principles

1. **Ownership-Based Authorization**
   - Auditor is identified by `auditorId` (mirrored to `eventOwnerId`)
   - Only event owner can approve/reject

2. **State-Driven Workflow**
   - `auditState` tracks workflow progression
   - `status` is system-controlled (Planned → Completed)

3. **Strict Validation**
   - Auditor selection rules enforced by event type
   - Organization scoping validated at creation/update

4. **Data Integrity**
   - Form responses are immutable once submitted
   - Audit trail preserved for all actions
   - Corrective actions cannot be deleted (only archived/invalidated)

5. **Integration Points**
   - Events and Form Responses are tightly coupled
   - State transitions synchronized between both models
   - Corrective actions bridge the gap between responses and events

### For Audit App Development

When building the Audit App, you'll need to:

1. **Understand the existing flow** (this document)
2. **Determine access patterns:**
   - How will auditors access events from Audit app?
   - Do they need read-only access or approval capabilities?
   - Should they see all audit events or only assigned ones?

3. **Consider permissions:**
   - Create audit-specific permissions
   - Define auditor role in Audit app context
   - Handle cross-app access if needed

4. **Maintain data integrity:**
   - Ensure immutability rules are respected
   - Preserve audit trail
   - Handle corrective actions appropriately

---

**Status:** ✅ Complete documentation of current auditor flow design  
**Last Updated:** Based on current codebase analysis

