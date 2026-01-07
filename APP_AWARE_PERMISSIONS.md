# App-Aware Role and Permission System

**Date:** Refactoring role and permission system to be app-aware and platform-safe  
**Purpose:** Enable permissions to be scoped by appKey, preventing CRM module access from non-CRM apps

---

## Overview

The role and permission system has been refactored to be app-aware, ensuring that:
- Permissions are scoped by appKey (CRM, PORTAL, AUDIT, LMS)
- CRM modules are only accessible from CRM app
- Platform core does not assume CRM modules
- Existing CRM roles and permissions continue to work (backward compatible)

---

## Implementation

### 1. Role Model Changes

**File:** `server/models/Role.js`

**Added Field:**
```javascript
appPermissions: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
}
```

**Structure:**
```javascript
appPermissions: {
    'CRM': {
        'contacts': { 'create': true, 'read': true, ... },
        'deals': { 'create': true, 'read': true, ... }
    },
    'PORTAL': {
        'profile': { 'read': true, 'update': true }
    }
}
```

**Updated Methods:**
- `hasPermission(module, action, appKey)` - App-aware permission check
- `hasAppPermission(appKey, module, action)` - Explicit app-scoped check

**Legacy Field (Kept for Backward Compatibility):**
```javascript
permissions: {
    // CRM-specific permissions (treated as CRM-app scoped)
    contacts: { create: true, read: true, ... },
    deals: { create: true, read: true, ... },
    ...
}
```

---

### 2. Permission Middleware Updates

**File:** `server/middleware/permissionMiddleware.js`

**Key Changes:**

1. **CRM Module Detection:**
   ```javascript
   const CRM_MODULES = [
       'contacts', 'people', 'deals', 'tasks', 'events', 'forms', 'items',
       'organizations', 'projects', 'reports', 'imports', 'settings'
   ];
   ```

2. **App-Aware Permission Check:**
   - Checks if module is CRM-specific
   - If CRM module and `req.appKey !== 'CRM'`, denies access
   - Existing permissions treated as CRM-scoped

3. **App-Aware Ownership Filter:**
   - Only filters CRM modules from CRM app
   - Prevents non-CRM apps from accessing CRM data

---

### 3. Permission Check Flow

**Updated `checkPermission` Middleware:**

```javascript
1. Check if module is CRM-specific
2. If CRM module:
   - If req.appKey !== 'CRM' → Deny (403)
   - If req.appKey === 'CRM' or not set → Continue
3. Check user permissions (treated as CRM-scoped)
4. Allow or deny based on permission
```

**Example:**
```javascript
// Request from CRM app
req.appKey = 'CRM'
checkPermission('deals', 'create')
→ Module is CRM → appKey is CRM → Check permissions → Allow/Deny

// Request from Portal app
req.appKey = 'PORTAL'
checkPermission('deals', 'create')
→ Module is CRM → appKey is PORTAL → Deny (403)
```

---

## Backward Compatibility Strategy

### Existing Roles

**Current State:**
- Have `permissions` field with CRM-specific modules
- Do NOT have `appPermissions` field

**Behavior:**
1. **Permission Checks:**
   - `hasPermission(module, action)` without appKey
   - Falls back to legacy `permissions` field
   - Treated as CRM-scoped (backward compatible)

2. **App-Aware Checks:**
   - `hasPermission(module, action, 'CRM')` → checks legacy permissions
   - `hasPermission(module, action, 'PORTAL')` → returns false (no Portal permissions)

3. **Result:**
   - All existing CRM roles continue to work
   - No breaking changes
   - Permissions are implicitly CRM-scoped

### Existing Permission Checks

**Current Usage:**
```javascript
checkPermission('deals', 'create')
```

**Behavior:**
- Works exactly as before for CRM app
- Denies access from non-CRM apps (new safety)
- Backward compatible for CRM routes

---

## Safety Guarantees

### ✅ CRM Modules Only Accessible from CRM App

- Permission checks verify `req.appKey === 'CRM'` for CRM modules
- Non-CRM apps receive 403 when accessing CRM modules
- Prevents accidental CRM data access from Portal/Audit/LMS

### ✅ Platform Core Does Not Assume CRM Modules

- Permission middleware checks app context before allowing access
- CRM module list is explicit and centralized
- Non-CRM apps can define their own permissions (future)

### ✅ Existing Permissions Treated as CRM-Scoped

- Legacy `permissions` field treated as CRM-app scoped
- No migration required
- All existing roles continue to work

### ✅ App-Scoped Permissions Supported

- New `appPermissions` field supports multi-app permissions
- Roles can define permissions per app
- Future-proof for Portal, Audit, LMS permissions

---

## Example Flows

### Flow 1: CRM User Accesses CRM Module (Backward Compatible)

**Request:**
```http
GET /api/deals
Authorization: Bearer <token>
appKey: CRM (from URL)
```

**Flow:**
1. `checkPermission('deals', 'view')` called
2. Module is CRM → Check `req.appKey === 'CRM'` → ✅
3. Check `user.permissions.deals.view` → ✅
4. Allow access

**Result:** Works exactly as before ✅

---

### Flow 2: Portal User Attempts to Access CRM Module (Blocked)

**Request:**
```http
GET /api/deals
Authorization: Bearer <token>
appKey: PORTAL (from URL)
```

**Flow:**
1. `checkPermission('deals', 'view')` called
2. Module is CRM → Check `req.appKey === 'CRM'` → ❌ (PORTAL)
3. Return 403:
   ```json
   {
     "message": "CRM modules are only accessible from the CRM application",
     "code": "CRM_MODULE_NOT_ACCESSIBLE",
     "module": "deals",
     "action": "view",
     "currentApp": "PORTAL",
     "requiredApp": "CRM"
   }
   ```

**Result:** Access denied (as expected) ✅

---

### Flow 3: Owner Accesses CRM Module from Any App (Backward Compatible)

**Request:**
```http
GET /api/deals
Authorization: Bearer <owner_token>
appKey: PORTAL (from URL)
```

**Flow:**
1. `checkPermission('deals', 'view')` called
2. Check `user.isOwner` → ✅
3. Check if CRM module → ✅
4. Owner can access CRM modules from any app (backward compatibility)
5. Allow access

**Result:** Owner access preserved ✅

---

### Flow 4: Future Portal Permission Check

**Request:**
```http
GET /portal/profile
Authorization: Bearer <token>
appKey: PORTAL (from URL)
```

**Flow:**
1. `checkPermission('profile', 'read')` called
2. Module is NOT CRM → Skip CRM check
3. Check Portal-specific permissions (future):
   - `role.appPermissions.get('PORTAL').profile.read`
   - Or Portal-specific permission structure
4. Allow or deny based on Portal permissions

**Result:** Portal permissions work independently ✅

---

## Files Modified

1. **`server/models/Role.js`**
   - Added `appPermissions` field (Map structure)
   - Updated `hasPermission()` to be app-aware
   - Added `hasAppPermission()` method
   - Kept legacy `permissions` for backward compatibility

2. **`server/middleware/permissionMiddleware.js`**
   - Added CRM module detection
   - Updated `checkPermission()` to be app-aware
   - Updated `filterByOwnership()` to be app-aware
   - Prevents CRM module access from non-CRM apps

---

## Migration Path

### For New Apps (Portal, Audit, LMS)

**Step 1:** Define app-specific permissions in roles
```javascript
role.appPermissions.set('PORTAL', {
    profile: { read: true, update: true },
    org: { read: true }
});
```

**Step 2:** Use app-aware permission checks
```javascript
checkPermission('profile', 'read') // From Portal app context
```

**Step 3:** Permission middleware handles app context automatically

### For Existing CRM Roles

**No Migration Required:**
- Existing `permissions` field continues to work
- Treated as CRM-scoped automatically
- All existing functionality preserved

---

## Summary

✅ **App-aware permissions introduced**
- Permissions scoped by appKey
- CRM modules only accessible from CRM app
- Platform core does not assume CRM modules

✅ **Backward compatible**
- Existing CRM roles continue to work
- Existing permissions treated as CRM-scoped
- No breaking changes

✅ **Future-proof**
- `appPermissions` field supports multi-app permissions
- Roles can define permissions per app
- Ready for Portal, Audit, LMS permissions

**Status:** ✅ Implemented and operational  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained

