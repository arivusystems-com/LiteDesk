# Audit Execution Gateway (Proxy Layer)

## Overview

The Audit Execution Gateway enables AUDIT app users (auditors) to execute audits end-to-end without granting CRM app access or CRM permissions. CRM remains the single execution engine, while Audit App acts as a secure execution proxy.

**Core Principle (NON-NEGOTIABLE):**
- ❌ Do NOT duplicate CRM logic
- ❌ Do NOT move audit state machines
- ❌ Do NOT weaken authorization
- ❌ Do NOT expose CRM routes to Audit users
- ✅ Audit App calls CRM internally
- ✅ Ownership-based authorization remains intact
- ✅ CRM controllers remain source of truth

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Audit App (Frontend)                    │
│  - Auditor UI                                               │
│  - No CRM access                                            │
│  - No CRM permissions                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP Requests
                        │ /audit/execute/*
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         Audit Execution Gateway (Proxy Layer)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  auditExecutionController.js                         │  │
│  │  - checkInAudit()                                    │  │
│  │  - submitAudit()                                     │  │
│  │  - approveAudit()                                    │  │
│  │  - rejectAudit()                                     │  │
│  │                                                       │  │
│  │  Authorization: eventOwnerId === req.user._id        │  │
│  │  Updates: AuditExecutionContext                      │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                       │
│                      │ Internal Function Calls              │
│                      │ (No HTTP, No Routes)                 │
│                      ▼                                       │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Direct Function Invocation
                        │ (Same Process)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              CRM Controllers (Source of Truth)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  eventController.js                                   │  │
│  │  - checkIn()                                          │  │
│  │  - submitAudit()                                      │  │
│  │  - approveAudit()                                    │  │
│  │  - rejectAudit()                                      │  │
│  │                                                       │  │
│  │  All workflow logic                                   │  │
│  │  All state transitions                                │  │
│  │  All business rules                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Models (Source of Truth)                            │  │
│  │  - Event (auditState, workflow)                       │  │
│  │  - FormResponse (form data, corrective actions)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

### 1. Check-In Flow

```
Auditor → POST /audit/execute/:eventId/check-in
    │
    ├─→ auditExecutionController.checkInAudit()
    │   ├─→ Validate ownership (eventOwnerId === userId)
    │   ├─→ Validate event type (audit type)
    │   ├─→ Call CRM eventController.checkIn()
    │   │   ├─→ GEO validation
    │   │   ├─→ Update Event.checkIn
    │   │   ├─→ Set auditState = 'checked_in'
    │   │   └─→ Create FormResponse (if linked form)
    │   │
    │   ├─→ Update AuditExecutionContext
    │   │   ├─→ executionStatus = 'in_progress'
    │   │   ├─→ checkedInAt = now
    │   │   └─→ Store GEO data
    │   │
    │   └─→ Return updated state
    │
    └─→ Response: { event, executionContext }
```

### 2. Submit Flow

```
Auditor → POST /audit/execute/:eventId/submit
    │
    ├─→ auditExecutionController.submitAudit()
    │   ├─→ Validate ownership
    │   ├─→ Validate formResponseId
    │   ├─→ Call CRM eventController.submitAudit()
    │   │   ├─→ Validate form response
    │   │   ├─→ Check for failures
    │   │   ├─→ Create corrective actions (if failures)
    │   │   ├─→ Set auditState = 'submitted' | 'pending_corrective' | 'needs_review'
    │   │   ├─→ Auto check-out
    │   │   └─→ Calculate time spent
    │   │
    │   ├─→ Update AuditExecutionContext
    │   │   ├─→ executionStatus = 'submitted'
    │   │   └─→ checkedOutAt = now
    │   │
    │   ├─→ Sync AuditAssignment.auditState
    │   │
    │   └─→ Return updated state
    │
    └─→ Response: { event, requiresCorrective, executionContext }
```

### 3. Approve Flow

```
Auditor → POST /audit/execute/:eventId/approve
    │
    ├─→ auditExecutionController.approveAudit()
    │   ├─→ Validate ownership
    │   ├─→ Validate state (must be 'needs_review')
    │   ├─→ Call CRM eventController.approveAudit()
    │   │   ├─→ Validate state
    │   │   ├─→ Transition: needs_review → approved → closed
    │   │   ├─→ Set status = 'Completed'
    │   │   ├─→ Mark form responses as approved
    │   │   └─→ Set reviewStatus = 'Closed'
    │   │
    │   ├─→ Update AuditAssignment
    │   │   ├─→ status = 'closed'
    │   │   └─→ auditState = 'closed'
    │   │
    │   └─→ Return success
    │
    └─→ Response: { event, assignment }
```

### 4. Reject Flow

```
Auditor → POST /audit/execute/:eventId/reject
    │
    ├─→ auditExecutionController.rejectAudit()
    │   ├─→ Validate ownership
    │   ├─→ Validate state (must be 'needs_review')
    │   ├─→ Call CRM eventController.rejectAudit()
    │   │   ├─→ Validate state
    │   │   ├─→ Set auditState = 'rejected'
    │   │   ├─→ Reopen all corrective actions
    │   │   ├─→ Clear auditor verification
    │   │   └─→ Notify corrective owner
    │   │
    │   ├─→ Update AuditAssignment
    │   │   ├─→ auditState = 'rejected'
    │   │   └─→ status = 'active' (keep active for retry)
    │   │
    │   └─→ Return updated state
    │
    └─→ Response: { event, reopenedCorrectiveActions, assignment }
```

---

## Authorization Rules

### Ownership-Based Authorization (MANDATORY)

**Rule:** Only the event owner (auditor) can execute audits.

**Implementation:**
```javascript
if (event.eventOwnerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
        success: false,
        message: 'Only the event owner (auditor) can execute this audit.'
    });
}
```

**Applied to:**
- ✅ checkInAudit
- ✅ submitAudit
- ✅ approveAudit
- ✅ rejectAudit

### No CRM Permissions Required

- ❌ Do NOT use CRM permission middleware
- ❌ Do NOT rely on roles
- ✅ Ownership = authority
- ✅ Event owner (`eventOwnerId` / `auditorId`) = execution authority

### State Validation

**Approve/Reject:**
- Event must be in `needs_review` state
- Validated in both proxy and CRM controller

**Check-In:**
- Event must be audit type
- GEO validation handled by CRM

**Submit:**
- Event must be audit type
- Form response must exist and belong to event

---

## Routes

### Base Path
`/audit/execute`

### Endpoints

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/audit/execute/:eventId/check-in` | Check in to audit | eventOwnerId === userId |
| POST | `/audit/execute/:eventId/submit` | Submit audit form | eventOwnerId === userId |
| POST | `/audit/execute/:eventId/approve` | Approve audit | eventOwnerId === userId |
| POST | `/audit/execute/:eventId/reject` | Reject audit | eventOwnerId === userId |

### Middleware Chain (EXACT ORDER)

1. `protect` - Authentication
2. `resolveAppContext` - Resolve appKey from URL
3. `requireAppEntitlement` - Check user's app entitlements
4. `requireAuditApp` - Enforce Audit-only access
5. `organizationIsolation` - Organization context

**File:** `server/routes/auditExecutionRoutes.js`

---

## CRM Logic Invocation

### Allowed

✅ Import CRM controller functions
```javascript
const crmEventController = require('./eventController');
await crmEventController.checkIn(proxyReq, proxyRes);
```

✅ Extract shared service logic (if already present)

### Forbidden

❌ Duplicating validation logic
❌ Rewriting workflow transitions
❌ Creating new audit rules
❌ Modifying CRM controller logic

### Proxy Pattern

The Audit Execution Controller uses a proxy pattern:

1. **Create proxy request/response objects**
   - Modify `req.params` to match CRM expectations
   - Capture CRM response via proxy `res` object

2. **Call CRM function**
   - Direct function invocation (same process)
   - No HTTP calls
   - No route exposure

3. **Capture response**
   - Extract CRM response data
   - Preserve error messages
   - Return to Audit App client

**Example:**
```javascript
// Create proxy request
const proxyReq = {
    ...req,
    params: { id: eventId },
    body: { location }
};

// Create proxy response to capture
let crmResponse = null;
let crmResponseStatus = 200;
const proxyRes = {
    status: (code) => {
        crmResponseStatus = code;
        return proxyRes;
    },
    json: (data) => {
        crmResponse = data;
        return proxyRes;
    }
};

// Call CRM function
await crmEventController.checkIn(proxyReq, proxyRes);

// Use captured response
if (crmResponseStatus !== 200 || !crmResponse?.success) {
    return res.status(crmResponseStatus).json(crmResponse);
}
```

---

## AuditExecutionContext Updates

### Rules

1. **Lazy Creation**
   - Created on first execution action
   - One active context per assignment
   - Never controls workflow

2. **Mirrors Execution Only**
   - Tracks UX state (`idle`, `in_progress`, `submitted`)
   - Stores GEO data for display
   - Records check-in/check-out times

3. **Never Controls Workflow**
   - All state decisions in CRM
   - Execution context is read-only cache
   - Used for Audit App UI only

### Update Points

| Action | Execution Context Update |
|--------|--------------------------|
| Check-In | `executionStatus = 'in_progress'`<br>`checkedInAt = now`<br>`geo = { lat, lng, accuracy }` |
| Submit | `executionStatus = 'submitted'`<br>`checkedOutAt = now` |
| Approve | No update (already submitted) |
| Reject | No update (remains active) |

---

## Error Handling

### Preserve CRM Error Messages

```javascript
// If CRM call failed, return error
if (crmResponseStatus !== 200 || !crmResponse?.success) {
    return res.status(crmResponseStatus).json(crmResponse || {
        success: false,
        message: 'Operation failed'
    });
}
```

### Do NOT Swallow CRM Validation Errors

- All CRM validation errors are passed through
- No error transformation
- No error suppression
- Meaningful error messages preserved

### Error Response Format

```json
{
    "success": false,
    "message": "Error message from CRM",
    "error": "Detailed error (development only)"
}
```

---

## Data Flow

### Check-In

```
Audit App Request
    ↓
auditExecutionController.checkInAudit()
    ├─→ Validate ownership
    ├─→ Call CRM checkIn()
    │   └─→ Update Event (checkIn, auditState)
    │
    └─→ Update AuditExecutionContext
        └─→ executionStatus = 'in_progress'
```

### Submit

```
Audit App Request
    ↓
auditExecutionController.submitAudit()
    ├─→ Validate ownership
    ├─→ Call CRM submitAudit()
    │   ├─→ Update Event (auditState)
    │   ├─→ Update FormResponse
    │   └─→ Create corrective actions (if failures)
    │
    ├─→ Update AuditExecutionContext
    │   └─→ executionStatus = 'submitted'
    │
    └─→ Sync AuditAssignment
        └─→ auditState = event.auditState
```

### Approve

```
Audit App Request
    ↓
auditExecutionController.approveAudit()
    ├─→ Validate ownership
    ├─→ Call CRM approveAudit()
    │   ├─→ Update Event (auditState = 'closed', status = 'Completed')
    │   └─→ Update FormResponse (reviewStatus = 'Closed')
    │
    └─→ Update AuditAssignment
        └─→ status = 'closed'
```

### Reject

```
Audit App Request
    ↓
auditExecutionController.rejectAudit()
    ├─→ Validate ownership
    ├─→ Call CRM rejectAudit()
    │   ├─→ Update Event (auditState = 'rejected')
    │   └─→ Reopen corrective actions
    │
    └─→ Update AuditAssignment
        └─→ status = 'active' (keep for retry)
```

---

## Why Auditors Don't Need CRM Access

### Separation of Concerns

1. **CRM = Execution Engine**
   - Workflow logic
   - State management
   - Business rules
   - Data integrity

2. **Audit App = Auditor Workspace**
   - Execution interface
   - Assignment management
   - Timeline view
   - Reporting

### Benefits

1. **No License Cost**
   - Auditors don't need CRM licenses
   - Only Audit App access required

2. **Simplified UI**
   - Audit-specific interface
   - No CRM module clutter
   - Focused workflow

3. **Security**
   - No CRM data exposure
   - No CRM permissions needed
   - Ownership-based access only

4. **Maintainability**
   - Clear separation
   - Single source of truth (CRM)
   - No logic duplication

---

## Validation Checklist

### ✅ Auditor with Only AUDIT App Can Execute Full Audit

- [x] Check-in works without CRM access
- [x] Submit works without CRM access
- [x] Approve works without CRM access
- [x] Reject works without CRM access
- [x] All operations use Audit App routes only

### ✅ CRM Users Unchanged

- [x] No changes to CRM controllers
- [x] No changes to CRM routes
- [x] No changes to CRM permissions
- [x] CRM workflow unchanged

### ✅ No CRM Routes Exposed

- [x] Audit App uses `/audit/execute/*` only
- [x] CRM routes remain `/api/events/*`
- [x] No CRM route exposure to auditors

### ✅ No CRM Permissions Added

- [x] Ownership-based authorization only
- [x] No CRM permission middleware
- [x] No role-based checks
- [x] Event owner = execution authority

### ✅ Ownership Enforced Everywhere

- [x] checkInAudit validates ownership
- [x] submitAudit validates ownership
- [x] approveAudit validates ownership
- [x] rejectAudit validates ownership

### ✅ CRM Remains Execution Engine

- [x] All workflow logic in CRM
- [x] All state transitions in CRM
- [x] All business rules in CRM
- [x] Audit App is thin proxy only

---

## Files Created

1. **`server/controllers/auditExecutionController.js`**
   - Proxy controller for audit execution
   - Ownership validation
   - CRM function invocation
   - AuditExecutionContext updates

2. **`server/routes/auditExecutionRoutes.js`**
   - Execution routes
   - Middleware chain
   - Route definitions

3. **`AUDIT_EXECUTION_GATEWAY.md`**
   - This documentation

## Files Modified

1. **`server/server.js`**
   - Added auditExecutionRoutes import
   - Registered `/audit/execute` routes

---

## Summary

The Audit Execution Gateway successfully:

✅ Enables auditors to execute audits without CRM access  
✅ Maintains strict ownership-based authorization  
✅ Preserves CRM as single source of truth  
✅ Updates AuditExecutionContext for UX tracking  
✅ No CRM logic duplication  
✅ No CRM route exposure  
✅ No CRM permissions required  

**Status:** ✅ Implemented and operational  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained

---

**Last Updated:** Based on Audit Execution Gateway requirements

