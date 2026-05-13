# CRM → Audit App Sync Implementation

## Overview

One-way, event-driven synchronization from CRM to Audit App that keeps `AuditAssignment`, `AuditTimeline`, and `AuditExecutionContext` in sync with CRM without duplicating logic or state machines.

**Core Principles:**
- ✅ CRM remains single source of truth
- ✅ Sync is CRM → Audit App only
- ✅ No logic duplication
- ✅ No state machines
- ✅ Never blocks CRM execution

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CRM (Source of Truth)                    │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │    Event     │  │ FormResponse │                        │
│  │              │  │              │                        │
│  │ - auditState │  │ - execution  │                        │
│  │ - workflow   │  │   status     │                        │
│  └──────┬───────┘  └──────┬───────┘                        │
│         │                  │                                 │
│         │ Post-Save Hooks │                                 │
│         │ Explicit Calls  │                                 │
│         └────────┬─────────┘                                 │
│                  │                                           │
│                  ▼                                           │
│  ┌──────────────────────────────────────┐                  │
│  │    auditSyncService.js                │                  │
│  │  - syncAuditAssignmentFromEvent()     │                  │
│  │  - syncAuditTimelineFromEvent()      │                  │
│  │  - syncAuditExecutionContextFrom... │                  │
│  └──────────────┬───────────────────────┘                  │
└──────────────────┼─────────────────────────────────────────┘
                   │
                   │ One-Way Sync
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Audit App (Read-Only Cache)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Audit      │  │   Timeline   │  │   Execution  │      │
│  │ Assignment   │  │              │  │   Context    │      │
│  │              │  │              │  │              │      │
│  │ - snapshot   │  │ - history    │  │ - UX state   │      │
│  │ - read-only  │  │ - read-only  │  │ - tracking   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Sync Service

### File: `server/services/auditSyncService.js`

**Functions:**

1. **`syncAuditAssignmentFromEvent(event)`**
   - Syncs AuditAssignment from CRM Event
   - Triggered: Event created, auditState changes, approve/reject/close
   - Fields synced:
     - `auditorId` → from `event.auditorId` or `event.eventOwnerId`
     - `organizationId` → from `event.organizationId`
     - `eventId` → from `event._id`
     - `auditType` → from `event.eventType`
     - `auditState` → from `event.auditState` (read-only cache)
     - `scheduledAt` → from `event.startDateTime`
     - `dueAt` → from `event.endDateTime`
     - `status` → `'closed'` if `auditState === 'closed'`, else `'active'`

2. **`syncAuditTimelineFromEvent(event, meta)`**
   - Creates timeline entry for audit events
   - Triggered: Event created, auditState changes, approve/reject
   - Action mapping:
     - `CREATED` - Event created
     - `CHECK_IN` - Auditor checked in
     - `SUBMIT` - Form submitted
     - `APPROVE` - Audit approved
     - `REJECT` - Audit rejected
     - `STATUS_CHANGED` - Generic state change
     - `RESCHEDULED` - Event rescheduled
     - `CANCELLED` - Event cancelled

3. **`syncAuditExecutionContextFromFormResponse(formResponse)`**
   - Updates execution context when form is submitted
   - Triggered: FormResponse submitted
   - Only updates if context exists (never creates workflow logic)
   - Updates: `executionStatus`, `checkedOutAt`

---

## Hooks & Explicit Calls

### Event Model Post-Save Hook

**File:** `server/models/Event.js`

```javascript
eventSchema.post('save', async function (doc) {
    try {
        const AUDIT_EVENT_TYPES = ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'];
        if (!AUDIT_EVENT_TYPES.includes(doc.eventType)) {
            return;
        }
        
        const auditSyncService = require('../services/auditSyncService');
        await auditSyncService.syncAuditAssignmentFromEvent(doc);
    } catch (error) {
        // Never throw - log and continue
        console.error('[Event Model] Error in post-save sync hook:', error.message);
    }
});
```

**Triggers:**
- Event created
- Event updated (any field change)
- auditState changes

### FormResponse Model Post-Save Hook

**File:** `server/models/FormResponse.js`

```javascript
FormResponseSchema.post('save', async function (doc) {
    try {
        if (doc.executionStatus === 'Submitted') {
            const auditSyncService = require('../services/auditSyncService');
            await auditSyncService.syncAuditExecutionContextFromFormResponse(doc);
        }
    } catch (error) {
        // Never throw - log and continue
        console.error('[FormResponse Model] Error in post-save sync hook:', error.message);
    }
});
```

**Triggers:**
- FormResponse submitted

### Explicit Calls in CRM Controllers

**File:** `server/controllers/eventController.js`

#### 1. checkIn()
- **Location:** After `event.save()` when auditState set to `'checked_in'`
- **Syncs:**
  - AuditAssignment (auditState update)
  - AuditTimeline (CHECK_IN action)

#### 2. submitAudit()
- **Location:** After `event.save()` when auditState changes
- **Syncs:**
  - AuditAssignment (auditState update)
  - AuditTimeline (SUBMIT action)

#### 3. approveAudit()
- **Location:** After `event.save()` when auditState set to `'closed'`
- **Syncs:**
  - AuditAssignment (status = 'closed')
  - AuditTimeline (APPROVE action)

#### 4. rejectAudit()
- **Location:** After `event.save()` when auditState set to `'rejected'`
- **Syncs:**
  - AuditAssignment (status = 'active', auditState = 'rejected')
  - AuditTimeline (REJECT action)

**Why Explicit Calls?**
- Semantic actions need precise timeline entries
- State transitions need accurate metadata
- Post-save hooks are too generic for specific actions

---

## Safeguards

### Mandatory Guards

1. **Ignore Non-Audit Events**
   ```javascript
   if (!AUDIT_EVENT_TYPES.includes(event.eventType)) {
       return;
   }
   ```

2. **Ignore Missing auditorId**
   ```javascript
   const auditorId = event.auditorId || event.eventOwnerId;
   if (!auditorId) {
       console.warn('[AuditSync] Skipping sync: Event missing auditorId');
       return;
   }
   ```

3. **Never Throw Errors**
   ```javascript
   try {
       // Sync logic
   } catch (error) {
       // Never throw - log and continue
       console.error('[AuditSync] Error:', error.message);
   }
   ```

4. **Log Sync Failures**
   - All sync errors are logged
   - Never crash CRM execution flows
   - Failures are non-blocking

---

## Sync Flow Examples

### Event Creation

```
1. CRM: Event created (eventType = 'Internal Audit')
   ↓
2. Event.post('save') hook triggered
   ↓
3. auditSyncService.syncAuditAssignmentFromEvent()
   - Creates AuditAssignment
   - Sets auditState = 'Ready to start'
   - Sets status = 'active'
   ↓
4. (Optional) Explicit timeline call for CREATED action
```

### Check-In

```
1. CRM: checkIn() called
   ↓
2. Event.auditState = 'checked_in'
   ↓
3. event.save() → Post-save hook syncs AuditAssignment
   ↓
4. Explicit sync call:
   - syncAuditAssignmentFromEvent() (updates auditState)
   - syncAuditTimelineFromEvent() (creates CHECK_IN entry)
```

### Submit Audit

```
1. CRM: submitAudit() called
   ↓
2. Event.auditState = 'submitted' | 'pending_corrective' | 'needs_review'
   ↓
3. event.save() → Post-save hook syncs AuditAssignment
   ↓
4. Explicit sync call:
   - syncAuditAssignmentFromEvent() (updates auditState)
   - syncAuditTimelineFromEvent() (creates SUBMIT entry)
   ↓
5. FormResponse.save() → Post-save hook syncs AuditExecutionContext
```

### Approve Audit

```
1. CRM: approveAudit() called
   ↓
2. Event.auditState = 'closed'
   Event.status = 'Completed'
   ↓
3. event.save() → Post-save hook syncs AuditAssignment
   ↓
4. Explicit sync call:
   - syncAuditAssignmentFromEvent() (status = 'closed')
   - syncAuditTimelineFromEvent() (creates APPROVE entry)
```

### Reject Audit

```
1. CRM: rejectAudit() called
   ↓
2. Event.auditState = 'rejected'
   Event.status = 'Planned' (remains)
   ↓
3. event.save() → Post-save hook syncs AuditAssignment
   ↓
4. Explicit sync call:
   - syncAuditAssignmentFromEvent() (status = 'active', auditState = 'rejected')
   - syncAuditTimelineFromEvent() (creates REJECT entry)
```

---

## Validation Checklist

### ✅ Creating Audit Event Auto-Creates AuditAssignment

- [x] Post-save hook triggers on event creation
- [x] Sync service creates AuditAssignment
- [x] All required fields populated
- [x] auditState = 'Ready to start'

### ✅ auditState Changes Sync to AuditAssignment

- [x] Post-save hook triggers on auditState change
- [x] AuditAssignment.auditState updated
- [x] No logic duplication
- [x] Read-only cache maintained

### ✅ Approve → AuditAssignment.status = closed

- [x] Explicit sync call in approveAudit()
- [x] Status set to 'closed'
- [x] auditState = 'closed'
- [x] Timeline entry created

### ✅ Reject → AuditAssignment Stays Active

- [x] Explicit sync call in rejectAudit()
- [x] Status remains 'active' (for retry)
- [x] auditState = 'rejected'
- [x] Timeline entry created

### ✅ Timeline Entries Created for All State Transitions

- [x] CHECK_IN entry created
- [x] SUBMIT entry created
- [x] APPROVE entry created
- [x] REJECT entry created
- [x] CREATED entry (optional, via explicit call)

### ✅ No CRM Controller Behavior Changed

- [x] All CRM logic unchanged
- [x] Sync calls are non-blocking
- [x] Errors don't affect CRM execution
- [x] No breaking changes

### ✅ No Duplicate State Machines

- [x] All state logic in CRM
- [x] Audit App models are read-only cache
- [x] No workflow decisions in sync service
- [x] Single source of truth maintained

### ✅ Audit App Remains Read-Only

- [x] No write operations from Audit App
- [x] All mutations via CRM
- [x] Sync is one-way only
- [x] Ownership preserved

---

## Error Handling

### Non-Blocking Errors

All sync operations are wrapped in try-catch:

```javascript
try {
    await auditSyncService.syncAuditAssignmentFromEvent(event);
} catch (syncError) {
    // Never throw - log and continue
    console.error('[Sync] Error (non-blocking):', syncError.message);
}
```

### Logging

- Sync failures logged with context
- Event ID included for debugging
- No user-facing errors
- CRM execution continues normally

---

## Files Created

1. **`server/services/auditSyncService.js`**
   - Sync service with 3 functions
   - Safeguards and error handling
   - One-way sync logic

## Files Modified

1. **`server/models/Event.js`**
   - Added post-save hook
   - Syncs AuditAssignment on save

2. **`server/models/FormResponse.js`**
   - Added post-save hook
   - Syncs AuditExecutionContext on submit

3. **`server/controllers/eventController.js`**
   - Added explicit sync calls in:
     - `checkIn()`
     - `submitAudit()`
     - `approveAudit()`
     - `rejectAudit()`

---

## Summary

The CRM → Audit App sync implementation successfully:

✅ Keeps AuditAssignment in sync with CRM Event  
✅ Creates timeline entries for all state transitions  
✅ Updates execution context when forms are submitted  
✅ Never blocks CRM execution  
✅ Never duplicates workflow logic  
✅ Maintains CRM as single source of truth  
✅ One-way sync only (CRM → Audit App)  
✅ Non-breaking changes  

**Status:** ✅ Implemented and operational  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained

---

**Last Updated:** Based on CRM → Audit App Sync requirements

