# Audit App Final Architecture

## Executive Summary

The Audit App is a **license-cheap, workspace-only application** that enables auditors to execute audits end-to-end without requiring CRM access or CRM licenses. CRM remains the single execution engine, while Audit App provides a focused auditor workspace.

**Key Value Propositions:**
- ✅ **Cost Efficiency:** Auditors don't need CRM licenses
- ✅ **Security:** No CRM data exposure to auditors
- ✅ **Simplicity:** Audit-specific UI, no CRM module clutter
- ✅ **Scalability:** Clean separation allows independent scaling

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRM Application (Execution Engine)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │    Event     │  │ FormResponse │  │ Corrective   │        │
│  │              │  │              │  │   Actions    │        │
│  │ - auditState │  │ - responses  │  │ - workflow   │        │
│  │ - workflow   │  │ - immutability│ │ - status     │        │
│  │ - business   │  │ - data       │  │ - verification│       │
│  │   rules      │  │              │  │              │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                 │                 │
│         └──────────────────┴─────────────────┘                 │
│                          │                                      │
│                    (One-Way Sync)                               │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────┐                     │
│  │    auditSyncService.js                │                     │
│  │  (CRM → Audit App Only)               │                     │
│  └──────────────┬───────────────────────┘                     │
└──────────────────┼─────────────────────────────────────────────┘
                   │
                   │ Event-Driven Sync
                   │ (Post-Save Hooks + Explicit Calls)
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Audit App (Auditor Workspace)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Audit      │  │   Timeline   │  │   Execution  │          │
│  │ Assignment   │  │              │  │   Context    │          │
│  │              │  │              │  │              │          │
│  │ - index      │  │ - history    │  │ - UX state   │          │
│  │ - filter     │  │ - read-only  │  │ - tracking   │          │
│  │ - reference  │  │ - mirror     │  │ - session    │          │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘          │
│         │                                    │                  │
│         └──────────────┬─────────────────────┘                  │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────┐                       │
│  │  Audit Execution Gateway (Proxy)     │                       │
│  │  - checkInAudit()                    │                       │
│  │  - submitAudit()                     │                       │
│  │  - approveAudit()                    │                       │
│  │  - rejectAudit()                     │                       │
│  │                                       │                       │
│  │  Calls CRM internally (no HTTP)     │                       │
│  └──────────────┬───────────────────────┘                       │
│                  │                                                │
│                  │ Internal Function Calls                        │
│                  │ (Same Process)                                 │
│                  ▼                                                │
│  ┌──────────────────────────────────────┐                        │
│  │  CRM Controllers (Source of Truth)   │                        │
│  │  - checkIn()                         │                        │
│  │  - submitAudit()                     │                        │
│  │  - approveAudit()                    │                        │
│  │  - rejectAudit()                     │                        │
│  └──────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## App Boundaries

### CRM Application

**Responsibilities:**
- ✅ Event creation and management
- ✅ Form response storage and immutability
- ✅ Corrective action workflow
- ✅ Audit state machine (auditState transitions)
- ✅ Business rules and validation
- ✅ Data integrity enforcement

**Access:**
- ✅ CRM users (`allowedApps = ['CRM']`)
- ✅ Full CRUD on all modules
- ✅ Role-based permissions

**Routes:**
- `/api/events/*` - Event management
- `/api/forms/*` - Form management
- `/api/people/*` - Contact management
- All other `/api/*` routes

### Audit Application

**Responsibilities:**
- ✅ Auditor workspace (read-only views)
- ✅ Execution proxy (calls CRM internally)
- ✅ Assignment management
- ✅ Timeline visualization
- ✅ Execution context tracking

**Access:**
- ✅ Audit users (`allowedApps = ['AUDIT']`)
- ✅ Ownership-based authorization only
- ✅ No CRM permissions required

**Routes:**
- `/audit/assignments/*` - Read-only APIs
- `/audit/execute/*` - Execution proxy
- `/audit/me`, `/audit/org`, `/audit/health` - Basic info

**Blocked:**
- ❌ All `/api/*` routes (CRM routes)
- ❌ CRM module access
- ❌ CRM permissions

---

## Ownership Rules

### Execution Authorization

**Rule:** Only the event owner (auditor) can execute audits.

**Implementation:**
```javascript
if (event.eventOwnerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
        message: 'Only the event owner (auditor) can execute this audit.'
    });
}
```

**Applied to:**
- ✅ `checkInAudit()` - Check-in to audit
- ✅ `submitAudit()` - Submit audit form
- ✅ `approveAudit()` - Approve audit
- ✅ `rejectAudit()` - Reject audit

### View Authorization

**Rule:** Auditors can only see their assigned audits.

**Implementation:**
```javascript
const assignment = await AuditAssignment.findOne({
    eventId: eventObjectId,
    auditorId: userId,
    organizationId: organizationId
});
```

**Applied to:**
- ✅ `listAssignments()` - Filter by `auditorId`
- ✅ `getAssignmentDetail()` - Ownership check
- ✅ `getTimeline()` - Ownership check
- ✅ `getExecutionStatus()` - Ownership check

### No Role-Based Checks

- ❌ No CRM permission middleware
- ❌ No role-based authorization
- ✅ Ownership = authority
- ✅ Event owner (`eventOwnerId` / `auditorId`) = execution authority

---

## Sync Direction

### One-Way Sync: CRM → Audit App

**Direction:** CRM is always the source of truth. Audit App models are read-only caches.

**Sync Points:**

1. **Event Creation**
   - CRM: Event created
   - Sync: Creates `AuditAssignment`
   - Trigger: Post-save hook

2. **auditState Changes**
   - CRM: `Event.auditState` updated
   - Sync: Updates `AuditAssignment.auditState`
   - Trigger: Post-save hook + explicit calls

3. **Check-In**
   - CRM: `Event.auditState = 'checked_in'`
   - Sync: Updates assignment + creates timeline entry
   - Trigger: Explicit call in `checkIn()`

4. **Submit**
   - CRM: `Event.auditState = 'submitted' | 'pending_corrective' | 'needs_review'`
   - Sync: Updates assignment + creates timeline entry
   - Trigger: Explicit call in `submitAudit()`

5. **Approve**
   - CRM: `Event.auditState = 'closed'`, `status = 'Completed'`
   - Sync: Updates assignment (`status = 'closed'`) + creates timeline entry
   - Trigger: Explicit call in `approveAudit()`

6. **Reject**
   - CRM: `Event.auditState = 'rejected'`
   - Sync: Updates assignment (`status = 'active'`) + creates timeline entry
   - Trigger: Explicit call in `rejectAudit()`

7. **Form Submission**
   - CRM: `FormResponse.executionStatus = 'Submitted'`
   - Sync: Updates `AuditExecutionContext`
   - Trigger: Post-save hook

**Never:**
- ❌ Audit App → CRM sync
- ❌ Reverse sync
- ❌ Dual state machines
- ❌ Polling

---

## Why CRM is Never Exposed

### Security

1. **Data Isolation**
   - Auditors don't see CRM data (contacts, deals, etc.)
   - Only audit-specific data is accessible
   - Reduced attack surface

2. **Permission Isolation**
   - No CRM permissions required
   - Ownership-based access only
   - No role escalation risk

3. **Audit Trail**
   - All actions logged with app context
   - Clear separation of concerns
   - Compliance-ready

### Cost Efficiency

1. **License Savings**
   - Auditors don't need CRM licenses
   - Only Audit App access required
   - Scales cost-effectively

2. **Resource Efficiency**
   - No CRM module initialization for auditors
   - Lighter database queries
   - Reduced server load

### Maintainability

1. **Clear Boundaries**
   - CRM = execution engine
   - Audit App = workspace
   - No cross-contamination

2. **Independent Scaling**
   - Audit App can scale independently
   - No impact on CRM performance
   - Future-proof architecture

---

## Why Audit App is License-Cheap

### No CRM Dependencies

**Audit App requires:**
- ✅ User account (platform core)
- ✅ Organization membership (platform core)
- ✅ Audit App entitlement (`allowedApps = ['AUDIT']`)

**Audit App does NOT require:**
- ❌ CRM module access
- ❌ CRM permissions
- ❌ CRM licenses
- ❌ CRM initialization

### Minimal Resource Usage

**Audit App uses:**
- ✅ Read-only models (AuditAssignment, AuditTimeline, AuditExecutionContext)
- ✅ Minimal event data (only fields needed for execution)
- ✅ No CRM module queries
- ✅ No CRM data storage

### Scalable Architecture

**Cost per auditor:**
- Base platform cost (shared)
- Audit App access (minimal)
- No per-user CRM license

**As auditors scale:**
- Linear cost growth
- No exponential license costs
- Independent of CRM user count

---

## Production Guardrails

### 1. Kill Switch

**Environment Variable:** `AUDIT_SYNC_ENABLED`

**Usage:**
```bash
# Disable sync (emergency rollback)
AUDIT_SYNC_ENABLED=false

# Enable sync (default)
AUDIT_SYNC_ENABLED=true
```

**Purpose:**
- Emergency rollback without redeploy
- Zero-risk production toggle
- Non-breaking disable

### 2. Reverse Sync Prevention

**Guard:**
```javascript
// SAFETY: Never allow Audit App to call this service
if (process.env.APP_CONTEXT === 'AUDIT' || process.env.APP_KEY === 'AUDIT') {
    return;
}
```

**Purpose:**
- Prevents future mistakes
- Hard boundary enforcement
- Team growth safety

### 3. Defensive Logging

**Location:** `auditExecutionController.js`

**Logs:**
```javascript
console.info('[AuditExecute]', {
    action: 'CHECK_IN',
    eventId,
    auditorId: req.user._id,
    app: req.appKey || 'AUDIT',
    timestamp: new Date().toISOString()
});
```

**Purpose:**
- Legal audit trails
- Debugging without DB digging
- Enterprise readiness

### 4. Non-Blocking Errors

**All sync operations:**
- Wrapped in try-catch
- Never throw errors
- Log failures only
- CRM execution continues

---

## Access Matrix

### Audit-Only User

**Configuration:**
- `allowedApps = ['AUDIT']`
- No CRM role
- No CRM permissions

**Can Access:**
- ✅ `GET /audit/assignments` - List assignments
- ✅ `GET /audit/assignments/:eventId` - Assignment detail
- ✅ `GET /audit/assignments/:eventId/timeline` - Timeline
- ✅ `GET /audit/assignments/:eventId/execution-status` - Status
- ✅ `POST /audit/execute/:eventId/check-in` - Check-in (if owner)
- ✅ `POST /audit/execute/:eventId/submit` - Submit (if owner)
- ✅ `POST /audit/execute/:eventId/approve` - Approve (if owner)
- ✅ `POST /audit/execute/:eventId/reject` - Reject (if owner)

**Cannot Access:**
- ❌ `GET /api/events` - CRM events
- ❌ `GET /api/people` - CRM contacts
- ❌ Any `/api/*` routes - All CRM modules

### CRM-Only User

**Configuration:**
- `allowedApps = ['CRM']`
- CRM role and permissions

**Can Access:**
- ✅ All `/api/*` routes - Full CRM access
- ✅ CRM audit execution (unchanged)

**Cannot Access:**
- ❌ All `/audit/*` routes - Audit App blocked

### Non-Owner Auditor

**Configuration:**
- `allowedApps = ['AUDIT']`
- Assigned to audit but NOT `eventOwnerId`

**Can Access:**
- ✅ `GET /audit/assignments` - See assignment (if visible)
- ✅ `GET /audit/assignments/:eventId` - Read-only view (if visible)

**Cannot Access:**
- ❌ `POST /audit/execute/*` - All execution endpoints (403 Forbidden)

---

## Data Flow

### Check-In Flow

```
Auditor → POST /audit/execute/:eventId/check-in
    │
    ├─→ auditExecutionController.checkInAudit()
    │   ├─→ Log: [AuditExecute] CHECK_IN
    │   ├─→ Validate ownership
    │   ├─→ Call CRM checkIn()
    │   │   ├─→ Update Event.checkIn
    │   │   ├─→ Set auditState = 'checked_in'
    │   │   └─→ Create FormResponse (if linked form)
    │   │
    │   ├─→ Update AuditExecutionContext
    │   │   └─→ executionStatus = 'in_progress'
    │   │
    │   └─→ Sync (via hook + explicit call)
    │       ├─→ Update AuditAssignment.auditState
    │       └─→ Create AuditTimeline entry (CHECK_IN)
    │
    └─→ Response: { event, executionContext }
```

### Submit Flow

```
Auditor → POST /audit/execute/:eventId/submit
    │
    ├─→ auditExecutionController.submitAudit()
    │   ├─→ Log: [AuditExecute] SUBMIT
    │   ├─→ Validate ownership
    │   ├─→ Call CRM submitAudit()
    │   │   ├─→ Validate form response
    │   │   ├─→ Check for failures
    │   │   ├─→ Create corrective actions (if failures)
    │   │   ├─→ Set auditState = 'submitted' | 'pending_corrective' | 'needs_review'
    │   │   └─→ Auto check-out
    │   │
    │   ├─→ Update AuditExecutionContext
    │   │   └─→ executionStatus = 'submitted'
    │   │
    │   └─→ Sync (via hook + explicit call)
    │       ├─→ Update AuditAssignment.auditState
    │       └─→ Create AuditTimeline entry (SUBMIT)
    │
    └─→ Response: { event, requiresCorrective }
```

### Approve Flow

```
Auditor → POST /audit/execute/:eventId/approve
    │
    ├─→ auditExecutionController.approveAudit()
    │   ├─→ Log: [AuditExecute] APPROVE
    │   ├─→ Validate ownership
    │   ├─→ Call CRM approveAudit()
    │   │   ├─→ Transition: needs_review → approved → closed
    │   │   ├─→ Set status = 'Completed'
    │   │   └─→ Mark form responses as approved
    │   │
    │   └─→ Sync (via hook + explicit call)
    │       ├─→ Update AuditAssignment (status = 'closed')
    │       └─→ Create AuditTimeline entry (APPROVE)
    │
    └─→ Response: { event, assignment }
```

---

## Production Safety

### Error Handling

**All sync operations:**
```javascript
try {
    await auditSyncService.syncAuditAssignmentFromEvent(event);
} catch (syncError) {
    // Never throw - log and continue
    console.error('[Sync] Error (non-blocking):', syncError.message);
}
```

**All execution operations:**
```javascript
try {
    // Execution logic
} catch (error) {
    console.error('Error in checkInAudit:', error);
    res.status(500).json({
        success: false,
        message: 'Error checking in to audit.',
        error: error.message
    });
}
```

### Kill Switch

**Disable sync:**
```bash
AUDIT_SYNC_ENABLED=false
```

**Effect:**
- All sync operations return early
- No database writes
- CRM execution continues normally
- Audit App read APIs still work (cached data)

### Reverse Sync Prevention

**Guard in sync service:**
```javascript
if (process.env.APP_CONTEXT === 'AUDIT' || process.env.APP_KEY === 'AUDIT') {
    console.warn('[AuditSync] BLOCKED: Sync service called from Audit App context.');
    return;
}
```

**Effect:**
- Prevents accidental reverse sync
- Hard boundary enforcement
- Future-proof against mistakes

---

## Cost Analysis

### Traditional Approach (All Users Need CRM)

**Cost per auditor:**
- CRM license: $X/user/month
- CRM module initialization: Resource cost
- CRM data storage: Storage cost

**Total for 100 auditors:**
- 100 × $X = $100X/month
- Plus resource and storage costs

### Audit App Approach

**Cost per auditor:**
- Audit App access: Minimal (platform core only)
- No CRM license required
- Minimal resource usage

**Total for 100 auditors:**
- Base platform cost (shared)
- Minimal per-auditor overhead
- Significant savings vs. CRM licenses

**Scalability:**
- Linear cost growth
- No exponential license costs
- Independent of CRM user count

---

## Future-Proofing

### Independent Scaling

**Audit App can:**
- Scale independently of CRM
- Use separate infrastructure
- Optimize for audit-specific workloads

**CRM remains:**
- Unchanged
- Unaffected by Audit App scaling
- Focused on CRM workloads

### Extensibility

**Easy to add:**
- New audit-specific features
- Audit reporting
- Audit analytics
- Audit dashboards

**Without:**
- Modifying CRM
- Affecting CRM users
- Breaking existing flows

### Multi-App Architecture

**Pattern established:**
- CRM App (App #1)
- Portal App (App #2)
- Audit App (App #3)

**Future apps can:**
- Follow same pattern
- Use app-aware permissions
- Maintain clean boundaries

---

## Final Sign-Off Checklist

### ✅ Audit App Works Without CRM Access

- [x] Audit-only users can execute audits
- [x] No CRM routes accessible
- [x] No CRM permissions required
- [x] All functionality via Audit App routes

### ✅ CRM Audit Flow Unchanged

- [x] CRM users continue using audits as before
- [x] No breaking changes to CRM controllers
- [x] No modifications to CRM workflow
- [x] Backward compatibility maintained

### ✅ One-Way Sync Only

- [x] Sync is CRM → Audit App only
- [x] No reverse sync possible
- [x] Reverse sync guard implemented
- [x] Kill switch available

### ✅ Ownership Enforced Everywhere

- [x] All execution endpoints validate ownership
- [x] All read endpoints filter by ownership
- [x] No role-based checks
- [x] Event owner = execution authority

### ✅ No Duplicated State Machines

- [x] All state logic in CRM
- [x] Audit App models are read-only cache
- [x] No workflow decisions in sync service
- [x] Single source of truth maintained

### ✅ CRM Remains Execution Engine

- [x] All workflow logic in CRM
- [x] All business rules in CRM
- [x] All state transitions in CRM
- [x] Audit App is proxy only

### ✅ Audit App = Workspace Only

- [x] No execution logic in Audit App
- [x] No state machines in Audit App
- [x] No business rules in Audit App
- [x] Pure workspace functionality

### ✅ Costs Scale Safely

- [x] Auditors don't need CRM licenses
- [x] Minimal resource usage
- [x] Linear cost growth
- [x] Independent of CRM user count

---

## Summary

The Audit App architecture successfully:

✅ **Enables auditors to execute audits without CRM access**  
✅ **Maintains CRM as single execution engine**  
✅ **Provides license-cheap auditor workspace**  
✅ **Ensures clean boundaries and separation**  
✅ **Scales cost-effectively**  
✅ **Future-proof and extensible**  

**Status:** ✅ Production-ready  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained  
**Enterprise Ready:** Yes

---

**Last Updated:** Final architecture documentation  
**Audience:** Investors, Enterprise Buyers, Future Engineers

