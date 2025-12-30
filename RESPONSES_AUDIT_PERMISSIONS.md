# Responses Module - Audit Permissions & Integrity

## Overview
Refactored the Responses module to enforce strict audit integrity for Audit form responses. This ensures all audit data is preserved, immutable once submitted, and can only be archived or invalidated (not deleted) with proper audit trails.

**Implementation Date:** December 2024  
**Status:** ✅ Complete and Ready to Use

---

## 🎯 Problem Statement

Previously, all form responses could be deleted, which posed risks for audit integrity:
- Audit responses could be permanently deleted
- No audit trail for why responses were removed
- Submitted responses could be modified, compromising data integrity
- No distinction between different form types in terms of data protection

---

## ✨ Solution

### Three-Layer Protection

1. **Hard Delete Prevention**
   - Audit responses cannot be hard deleted
   - Submitted responses (all types) cannot be hard deleted
   - Only non-submitted, non-audit responses can be deleted

2. **Archive/Invalidate System**
   - Archive: Hide from active lists while preserving all data
   - Invalidate: Mark as invalid with required reason (for audit trail)
   - Both preserve complete historical data

3. **Immutability Enforcement**
   - Submitted responses are immutable (except review status and corrective actions)
   - Pre-save middleware prevents unauthorized modifications
   - Controller-level validation ensures data integrity

---

## 📊 Model Changes

### New Fields Added to FormResponse

```javascript
{
  // Archive fields
  archived: Boolean (default: false),
  archivedAt: Date (nullable),
  archivedBy: ObjectId (ref: 'User', nullable),
  archiveReason: String (maxlength: 1000),
  
  // Invalidation fields
  invalidated: Boolean (default: false),
  invalidatedAt: Date (nullable),
  invalidatedBy: ObjectId (ref: 'User', nullable),
  invalidationReason: String (maxlength: 1000, required if invalidated)
}
```

### Indexes Added
- `{ archived: 1, invalidated: 1 }` - For filtering archived/invalidated responses

---

## 🔄 Workflow

### Delete Attempt Flow
```
1. User attempts to delete response
   ↓
2. Check if form is Audit type
   ↓
3a. If Audit → Show Archive/Invalidate modal (no delete)
3b. If Submitted → Show Archive/Invalidate modal (no delete)
3c. If Non-Audit & Not Submitted → Allow delete
```

### Archive/Invalidate Flow
```
1. User selects Archive or Invalidate
   ↓
2. User provides required reason
   ↓
3. Response is marked as archived/invalidated
   ↓
4. All data preserved, hidden from active lists
   ↓
5. Can be restored if needed
```

### Immutability Flow
```
1. Response executionStatus = 'Submitted'
   ↓
2. Pre-save middleware checks modifications
   ↓
3. Only allowed fields can be updated:
   - reviewStatus
   - correctiveActions
   - finalReport
   - archive/invalidate fields
   ↓
4. All other fields are blocked
```

---

## 📁 Files Modified

### Backend Files

1. **`server/models/FormResponse.js`**
   - Added archive/invalidate fields
   - Added pre-save middleware for immutability
   - Added indexes for filtering

2. **`server/controllers/formResponseController.js`**
   - Updated `deleteResponse` to prevent audit/submitted deletion
   - Added `archiveResponse` endpoint
   - Added `invalidateResponse` endpoint
   - Added `restoreResponse` endpoint
   - Added immutability checks to update methods
   - Updated queries to filter archived/invalidated by default

3. **`server/routes/formRoutes.js`**
   - Added routes for archive/invalidate/restore

### Frontend Files

1. **`client/src/views/Responses.vue`**
   - Added Archive/Invalidate modal
   - Updated delete handler to check form type
   - Added archive/invalidate buttons for audit responses
   - Added restore button for archived/invalidated responses
   - Added archive status display

---

## 🔌 API Changes

### New Endpoints

#### Archive Response
```
POST /api/forms/:id/responses/:responseId/archive
Body: { reason: string (required) }
Response: { success: true, data: FormResponse, message: string }
```

#### Invalidate Response
```
POST /api/forms/:id/responses/:responseId/invalidate
Body: { reason: string (required) }
Response: { success: true, data: FormResponse, message: string }
```

#### Restore Response
```
POST /api/forms/:id/responses/:responseId/restore
Response: { success: true, data: FormResponse, message: string }
```

### Modified Endpoints

#### Delete Response
**Before:** Always allowed deletion  
**After:** 
- Returns `403` for audit responses with code `AUDIT_DELETE_FORBIDDEN`
- Returns `403` for submitted responses with code `SUBMITTED_DELETE_FORBIDDEN`
- Only allows deletion for non-audit, non-submitted responses

### Query Parameters

#### Filter Archived/Invalidated
```
GET /api/forms/responses/all?includeArchived=true
GET /api/forms/responses/all?includeInvalidated=true
```

**Default Behavior:** Archived and invalidated responses are excluded from results unless explicitly requested.

---

## 🎨 UI Changes

### Archive/Invalidate Modal
- **Trigger:** Clicking delete on audit response or submitted response
- **Options:**
  - **Archive:** Hide from active lists, preserve data
  - **Invalidate:** Mark as invalid with reason, preserve data
- **Required:** Reason field (mandatory)
- **Actions:** Archive/Invalidate button, Cancel button

### Action Buttons
- **Archive/Invalidate Button:** 
  - Shown for audit responses that are not archived/invalidated
  - Orange icon, appears in row actions
- **Restore Button:**
  - Shown for archived/invalidated responses
  - Blue icon, appears in row actions

### Status Display
- **Archived Badge:** Gray badge with archive date
- **Invalidated Badge:** Red badge with invalidation date

---

## 🔐 Business Rules

### Delete Rules
1. **Audit Responses:** Cannot be deleted (hard blocked)
2. **Submitted Responses:** Cannot be deleted (hard blocked)
3. **Non-Audit, Non-Submitted:** Can be deleted (with confirmation)

### Archive/Invalidate Rules
1. **Reason Required:** Both archive and invalidate require a reason
2. **Audit Trail:** All archive/invalidate actions are logged with:
   - User who performed action
   - Timestamp
   - Reason provided
3. **Reversible:** Both archive and invalidate can be reversed via restore

### Immutability Rules
1. **Submitted Responses:** Only these fields can be modified:
   - `reviewStatus` (review workflow)
   - `correctiveActions` (corrective action workflow)
   - `finalReport` (report generation)
   - `archived`, `archivedAt`, `archivedBy`, `archiveReason`
   - `invalidated`, `invalidatedAt`, `invalidatedBy`, `invalidationReason`
2. **All Other Fields:** Blocked from modification
3. **Pre-save Validation:** Middleware enforces immutability at model level
4. **Controller Validation:** Additional checks at API level

### Query Rules
1. **Default Filtering:** Archived/invalidated responses excluded by default
2. **Explicit Inclusion:** Use `includeArchived=true` or `includeInvalidated=true` to include
3. **Filtering:** Can filter by `archived` or `invalidated` status

---

## 🧪 Testing Checklist

### Backend Testing
- [x] Audit response deletion returns 403
- [x] Submitted response deletion returns 403
- [x] Non-audit, non-submitted response can be deleted
- [x] Archive requires reason
- [x] Invalidate requires reason
- [x] Archive sets all archive fields correctly
- [x] Invalidate sets all invalidation fields correctly
- [x] Restore clears all archive/invalidate fields
- [x] Submitted response immutability enforced
- [x] Pre-save middleware blocks unauthorized modifications
- [x] Queries exclude archived/invalidated by default
- [x] Queries include archived/invalidated when requested

### Frontend Testing
- [x] Delete button shows archive/invalidate modal for audit responses
- [x] Delete button shows archive/invalidate modal for submitted responses
- [x] Archive/invalidate modal requires reason
- [x] Archive/invalidate buttons appear for audit responses
- [x] Restore button appears for archived/invalidated responses
- [x] Archive status displays correctly
- [x] Invalidation status displays correctly
- [x] Modal closes after successful action
- [x] List refreshes after archive/invalidate/restore

### Integration Testing
- [x] End-to-end archive flow works
- [x] End-to-end invalidate flow works
- [x] End-to-end restore flow works
- [x] Immutability prevents unauthorized modifications
- [x] Audit trail is preserved for all actions

---

## 📝 Usage Examples

### Archive a Response
```javascript
// API Call
POST /api/forms/:formId/responses/:responseId/archive
{
  "reason": "Response was created in error and should be hidden from active lists"
}

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "archived": true,
    "archivedAt": "2024-12-01T10:00:00Z",
    "archivedBy": "userId",
    "archiveReason": "Response was created in error..."
  }
}
```

### Invalidate a Response
```javascript
// API Call
POST /api/forms/:formId/responses/:responseId/invalidate
{
  "reason": "Data was found to be incorrect after submission"
}

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "invalidated": true,
    "invalidatedAt": "2024-12-01T10:00:00Z",
    "invalidatedBy": "userId",
    "invalidationReason": "Data was found to be incorrect..."
  }
}
```

### Restore a Response
```javascript
// API Call
POST /api/forms/:formId/responses/:responseId/restore

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "archived": false,
    "archivedAt": null,
    "archivedBy": null,
    "archiveReason": null,
    "invalidated": false,
    "invalidatedAt": null,
    "invalidatedBy": null,
    "invalidationReason": null
  }
}
```

### Query Including Archived
```javascript
// API Call
GET /api/forms/responses/all?includeArchived=true

// Response includes archived responses
```

---

## 🚀 Benefits

### 1. Audit Integrity
- All audit data is preserved
- Complete audit trail for all actions
- No data loss for compliance purposes

### 2. Data Protection
- Submitted responses cannot be modified
- Prevents accidental or malicious data changes
- Ensures data consistency

### 3. Flexible Management
- Archive for temporary hiding
- Invalidate for marking as incorrect
- Restore for reversing actions

### 4. Compliance Ready
- Meets audit requirements
- Maintains historical records
- Provides audit trail documentation

### 5. User-Friendly
- Clear UI guidance
- Modal-based workflow
- Intuitive action buttons

---

## 📚 Related Documentation

- **Response Model Refactoring**: See `RESPONSE_MODEL_REFACTORING.md`
- **Responses Module**: See `RESPONSES_MODULE_IMPLEMENTATION.md`
- **Event → Response Handoff**: See `EVENT_RESPONSE_HANDOFF_IMPLEMENTATION.md`

---

## ⚠️ Important Notes

### Migration
- **No migration required** - New fields are added with defaults
- Existing responses will have `archived: false` and `invalidated: false`
- No data loss or breaking changes

### Backward Compatibility
- Old delete endpoints still exist but return appropriate errors
- Queries automatically exclude archived/invalidated (backward compatible)
- UI gracefully handles both old and new response structures

### Performance
- Indexes added for efficient filtering
- Queries optimized to exclude archived/invalidated by default
- No performance impact on active responses

---

## ✅ Summary

The Responses module audit permissions refactoring successfully:
- ✅ Prevents hard delete for audit responses
- ✅ Prevents hard delete for submitted responses
- ✅ Provides archive/invalidate with required reasons
- ✅ Enforces immutability for submitted responses
- ✅ Preserves all historical data
- ✅ Maintains complete audit trail
- ✅ Updates UI with appropriate actions
- ✅ Filters archived/invalidated by default

The refactoring is **production-ready** and maintains full backward compatibility while providing enhanced audit integrity.

---

## Status: **COMPLETE & PRODUCTION-READY** 🚀

All changes implemented, tested, and verified. Ready for QA and deployment.

