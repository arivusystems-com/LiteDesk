# Audit State Flow in Events

## Overview

The `auditState` field tracks the workflow progression for audit events (Internal Audit, External Audit — Single Org, External Audit Beat). It's separate from the system-controlled `status` field (Planned, Completed, Cancelled).

## Audit State Values

```javascript
enum: [
  'Ready to start',      // Initial state when event is created
  'checked_in',          // User has checked in (GEO validation passed)
  'submitted',           // Audit form has been submitted
  'pending_corrective',  // Form submitted with failures - corrective actions needed
  'needs_review',        // All corrective actions completed - ready for auditor review
  'approved',            // Auditor approved (transient state)
  'rejected',            // Auditor rejected - corrective actions reopened
  'closed'               // Final state - audit completed and approved
]
```

## Complete Flow Diagram

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

## Detailed State Transitions

### 1. **Ready to start** (Initial State)
- **When**: Event is created (audit event types only)
- **Set by**: Model pre-save hook
- **UI**: Shows "Check-In" button
- **Editable**: Yes, event can be edited
- **Next**: `checked_in` (on check-in)

### 2. **checked_in**
- **When**: User successfully checks in (GEO validation passed)
- **Set by**: `checkIn()` in `eventController.js`
- **UI**: Shows "Open Audit Form" button
- **Editable**: No, event is locked
- **Actions**:
  - Creates FormResponse if linked form exists
  - Stores check-in location and timestamp
- **Next**: `submitted` or `pending_corrective` (on form submission)

### 3. **submitted**
- **When**: Audit form submitted with NO failures
- **Set by**: `submitAudit()` in `eventController.js`
- **UI**: Shows "Corrective Actions" tab (if applicable)
- **Auto actions**:
  - Auto check-out
  - Calculate time spent
- **Next**: 
  - If failures exist → `pending_corrective`
  - If no failures → Can go to `needs_review` (if corrective actions exist) or remain `submitted`

### 4. **pending_corrective**
- **When**: Form submitted with failures (questions marked "Fail")
- **Set by**: `submitAudit()` when failures detected
- **UI**: Shows "Corrective Actions" tab
- **Actions**:
  - Creates corrective action records for each failed question
- Assigns to `Event.correctiveOwnerId`
  - Notifies Corrective Owner
- **Next**: `needs_review` (when all corrective actions completed)

### 5. **needs_review**
- **When**: ALL corrective actions are marked as `completed`
- **Set by**: `updateCorrectiveActionStatus()` in `formResponseController.js`
- **UI**: 
  - Shows "Approve Audit" and "Reject Audit" buttons (to auditor only)
  - Read-only for others
- **Actions**:
  - Notifies auditor (event owner) that review is needed
- **Next**: `approved` or `rejected` (auditor decision)

### 6. **approved** (Transient State)
- **When**: Auditor clicks "Approve Audit"
- **Set by**: `approveAudit()` in `eventController.js`
- **Duration**: Immediately transitions to `closed`
- **Actions**:
  - Marks all form responses as approved
  - Sets `reviewStatus = 'Closed'` on responses
- **Next**: `closed` (immediate)

### 7. **rejected**
- **When**: Auditor clicks "Reject Audit"
- **Set by**: `rejectAudit()` in `eventController.js`
- **UI**: Shows corrective actions that need to be redone
- **Actions**:
  - Reopens ALL corrective actions (sets status to `open`)
  - Clears auditor verification
  - Notifies Corrective Owner
  - Event `status` remains `'Planned'` (can be retried)
- **Next**: `needs_review` (when all corrective actions completed again)

### 8. **closed** (Final State)
- **When**: Auditor approves audit
- **Set by**: `approveAudit()` immediately after `approved`
- **UI**: Fully read-only, no action buttons
- **Actions**:
  - Sets `status = 'Completed'`
  - Sets `completedAt` timestamp
  - Makes all form responses read-only
- **Next**: Terminal state (no further transitions)

## Status Field Relationship

The `status` field (system-controlled) is separate but related:

| auditState | status | Notes |
|------------|--------|-------|
| Ready to start | Planned | Initial state |
| checked_in | Planned | During execution |
| submitted | Planned | After submission |
| pending_corrective | Planned | Waiting for corrective actions |
| needs_review | Planned | Waiting for auditor |
| approved | Planned → Completed | Transitions during approval |
| rejected | Planned | Can be retried |
| closed | Completed | Final state |

## Key Rules

1. **Only audit event types** have `auditState`:
   - Internal Audit
   - External Audit — Single Org
   - External Audit Beat

2. **Status is system-controlled**:
   - Users cannot set `status` directly
   - Only transitions: Planned → Completed (via approve) or Planned → Cancelled (via cancel)

3. **Edit restrictions**:
   - Event can be edited when: `auditState = 'Ready to start'`
   - Event is locked when: `auditState IN (checked_in, submitted, approved, closed)`
   - Event is locked when: `status IN (Completed, Cancelled)`

4. **Authorization**:
   - Only event owner (auditor) can approve/reject
  - Only `Event.correctiveOwnerId` can update corrective actions

5. **Notifications**:
   - Check-in: Notifies Corrective Owner (if set)
   - Form submission: Notifies Corrective Owner (if failures)
   - All corrective actions completed: Notifies auditor
   - Rejection: Notifies Corrective Owner

## Code Locations

- **Model Definition**: `server/models/Event.js` (lines 96-100, 482-490, 509-520)
- **Check-In**: `server/controllers/eventController.js` (line 1148)
- **Form Submission**: `server/controllers/eventController.js` (lines 1591, 1620, 1624)
- **Corrective Action Completion**: `server/controllers/formResponseController.js` (line 993)
- **Approval**: `server/controllers/eventController.js` (lines 1744, 1748)
- **Rejection**: `server/controllers/eventController.js` (line 1874)

