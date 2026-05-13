# Audit App Read APIs (Auditor Workspace)

## Overview

Read-only APIs for the Audit App that enable auditors to view their assigned audits, execution context, and timeline without mutating any CRM state.

**Core Principles:**
- ✅ CRM remains single source of truth
- ✅ No workflow logic
- ✅ No state transitions
- ✅ No auditState mutations
- ✅ Ownership-based access only
- ✅ No CRM permissions required

---

## API Endpoints

### Base Path
`/audit/assignments`

### Middleware Chain
1. `protect` - Authentication
2. `resolveAppContext` - Resolve appKey from URL
3. `requireAppEntitlement` - Check user's app entitlements
4. `requireAuditApp` - Enforce Audit-only access
5. `organizationIsolation` - Organization context

---

## 1. List Assigned Audits

**Endpoint:** `GET /audit/assignments`

**Purpose:** Show all audits assigned to the logged-in auditor (primary dashboard API)

**Query Parameters:**
- `auditState` (optional) - Filter by audit state
- `auditType` (optional) - Filter by audit type
- `status` (optional, default: 'active') - Filter by assignment status
- `sortBy` (optional, default: 'dueAt') - Sort field
- `sortOrder` (optional, default: 'asc') - Sort order
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 50) - Items per page

**Filters Applied:**
- `auditorId = req.user._id`
- `organizationId = req.user.organizationId`
- `status = 'active'` (by default)

**Response:**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "assignmentId": "ObjectId",
        "eventId": "ObjectId",
        "auditType": "Internal Audit",
        "auditState": "Ready to start",
        "scheduledAt": "2024-01-01T00:00:00Z",
        "dueAt": "2024-01-15T00:00:00Z",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**Example:**
```bash
GET /audit/assignments?auditState=needs_review&sortBy=dueAt&sortOrder=asc
```

---

## 2. Audit Detail View

**Endpoint:** `GET /audit/assignments/:eventId`

**Purpose:** Get detailed view of a specific audit assignment

**URL Parameters:**
- `eventId` - Event ID (MongoDB _id or UUID eventId)

**Ownership Validation:**
- Assignment must exist
- `assignment.auditorId === req.user._id`
- `assignment.organizationId === req.user.organizationId`

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "assignmentId": "ObjectId",
      "eventId": "ObjectId",
      "auditType": "Internal Audit",
      "auditState": "checked_in",
      "scheduledAt": "2024-01-01T00:00:00Z",
      "dueAt": "2024-01-15T00:00:00Z",
      "status": "active"
    },
    "event": {
      "id": "ObjectId",
      "eventId": "UUID",
      "auditState": "checked_in",
      "eventType": "Internal Audit",
      "startDateTime": "2024-01-01T00:00:00Z",
      "endDateTime": "2024-01-15T00:00:00Z",
      "relatedToId": "ObjectId",
      "location": "123 Main St",
      "geoRequired": true,
      "relatedOrganization": {
        "_id": "ObjectId",
        "name": "Organization Name"
      }
    },
    "executionContext": {
      "executionStatus": "in_progress",
      "checkedInAt": "2024-01-01T10:00:00Z",
      "checkedOutAt": null,
      "geo": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "accuracy": 10,
        "address": "123 Main St"
      }
    }
  }
}
```

**Note:** `executionContext` may be `null` if execution hasn't started yet.

---

## 3. Audit Timeline

**Endpoint:** `GET /audit/assignments/:eventId/timeline`

**Purpose:** Get chronological audit history (read-only)

**URL Parameters:**
- `eventId` - Event ID (MongoDB _id or UUID eventId)

**Ownership Validation:**
- Assignment must exist and belong to auditor

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "action": "CREATED",
        "fromState": null,
        "toState": "Ready to start",
        "actor": {
          "_id": "ObjectId",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "meta": {}
      },
      {
        "action": "CHECK_IN",
        "fromState": "Ready to start",
        "toState": "checked_in",
        "actor": {
          "_id": "ObjectId",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "createdAt": "2024-01-01T10:00:00Z",
        "meta": {
          "location": { "latitude": 40.7128, "longitude": -74.0060 }
        }
      }
    ]
  }
}
```

**Timeline Actions:**
- `CREATED` - Event created
- `CHECK_IN` - Auditor checked in
- `CHECK_OUT` - Auditor checked out
- `SUBMIT` - Form submitted
- `CORRECTIVE_ACTION_CREATED` - Corrective action created
- `CORRECTIVE_ACTION_COMPLETED` - Corrective action completed
- `APPROVE` - Audit approved
- `REJECT` - Audit rejected
- `STATUS_CHANGED` - Event status changed
- `RESCHEDULED` - Event rescheduled
- `CANCELLED` - Event cancelled

**Sorting:** Entries are sorted by `createdAt` ASC (chronological order)

---

## 4. Execution Status Helper

**Endpoint:** `GET /audit/assignments/:eventId/execution-status`

**Purpose:** Lightweight endpoint for UI state decisions (which buttons to show)

**URL Parameters:**
- `eventId` - Event ID (MongoDB _id or UUID eventId)

**Ownership Validation:**
- Assignment must exist and belong to auditor

**Response:**
```json
{
  "success": true,
  "data": {
    "auditState": "needs_review",
    "executionStatus": "submitted",
    "canCheckIn": false,
    "canSubmit": false,
    "canApprove": true,
    "canReject": true,
    "checkedInAt": "2024-01-01T10:00:00Z",
    "checkedOutAt": "2024-01-01T12:00:00Z"
  }
}
```

**Logic (DERIVED, not enforced):**
- `canCheckIn`: `auditState === 'Ready to start'` AND `executionStatus !== 'in_progress'`
- `canSubmit`: `auditState === 'checked_in'` AND `executionStatus === 'in_progress'`
- `canApprove`: `auditState === 'needs_review'`
- `canReject`: `auditState === 'needs_review'`

**Important:** This logic is for UI guidance only. Actual enforcement happens in execution endpoints.

---

## Authorization

### Ownership-Based Access

All endpoints enforce ownership:
- Assignment must exist
- `assignment.auditorId === req.user._id`
- `assignment.organizationId === req.user.organizationId`

### No CRM Permissions Required

- ❌ No CRM permission middleware
- ❌ No role-based checks
- ✅ Ownership = access authority
- ✅ Event owner (auditorId) = view authority

---

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "message": "Assignment not found or access denied."
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error fetching assignments.",
  "error": "Detailed error (development only)"
}
```

---

## Data Sources

| Endpoint | Primary Source | Secondary Source |
|----------|---------------|------------------|
| List Assignments | `AuditAssignment` | None |
| Assignment Detail | `AuditAssignment` | `Event` (read-only), `AuditExecutionContext` |
| Timeline | `AuditTimeline` | None |
| Execution Status | `AuditAssignment` | `AuditExecutionContext` |

**Key Points:**
- All data sources are Audit App models
- CRM models (`Event`) are referenced via IDs only
- No direct CRM controller usage
- No CRM permission checks

---

## Validation Checklist

### ✅ Auditor with Only AUDIT App Can:

- [x] See assigned audits (list endpoint)
- [x] Open audit details (detail endpoint)
- [x] View timeline (timeline endpoint)
- [x] Check execution status (status endpoint)

### ✅ Auditor Cannot See:

- [x] Unassigned audits (filtered by `auditorId`)
- [x] Other auditors' audits (ownership enforced)
- [x] CRM-only data (minimal event fields only)

### ✅ CRM Users:

- [x] Cannot access `/audit/*` (app entitlement check)
- [x] CRM routes remain unchanged
- [x] No impact on existing CRM functionality

### ✅ Legacy CRM Audits:

- [x] Continue working unchanged
- [x] No breaking changes
- [x] Backward compatible

---

## Files Created

1. **`server/controllers/auditReadController.js`**
   - Read-only controller
   - 4 endpoints
   - Ownership validation
   - No state mutations

2. **`server/routes/auditReadRoutes.js`**
   - Read-only routes
   - Middleware chain
   - Route definitions

3. **`AUDIT_READ_APIS.md`**
   - This documentation

## Files Modified

1. **`server/server.js`**
   - Added `auditReadRoutes` import
   - Registered `/audit/assignments` routes

---

## Summary

The Audit Read APIs successfully:

✅ Enable auditors to view assigned audits  
✅ Provide execution context for UX  
✅ Show timeline history  
✅ Support UI state decisions  
✅ Enforce ownership-based access  
✅ Require no CRM permissions  
✅ Maintain CRM as source of truth  
✅ No state mutations  
✅ No workflow logic  

**Status:** ✅ Implemented and operational  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained

---

**Last Updated:** Based on Audit App Read APIs requirements

