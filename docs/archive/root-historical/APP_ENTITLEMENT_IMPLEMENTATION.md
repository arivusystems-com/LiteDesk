# App Entitlement Enforcement Implementation

**Date:** Implementation of user-level App Entitlement enforcement  
**Purpose:** Prevent users from accessing applications they are not entitled to, regardless of URL

---

## Overview

User-level App Entitlement enforcement ensures that users can only access applications they are explicitly entitled to. This prevents Portal users from accessing CRM APIs (even via `/api/*` URLs) and CRM users from accessing Portal APIs (even via `/portal/*` URLs).

---

## Implementation

### 1. User Model Extension

**File:** `server/models/User.js`

**Added Field:**
```javascript
allowedApps: {
    type: [String],
    enum: ['CRM', 'PORTAL', 'AUDIT', 'LMS'],
    default: ['CRM'] // Default existing users to CRM access
}
```

**Behavior:**
- Existing users default to `['CRM']` (backward compatible)
- Portal users will have `['PORTAL']`
- Multi-app users can have `['CRM', 'PORTAL']`
- Empty array means no app access (edge case)

---

### 2. App Entitlement Middleware

**File:** `server/middleware/requireAppEntitlementMiddleware.js`

**Function:** `requireAppEntitlement(req, res, next)`

**Behavior:**
- Checks if `req.user.allowedApps` includes `req.appKey`
- Returns `403 Forbidden` if user is not entitled
- Allows request to continue if user is entitled
- Logs blocked attempts with clear explanations

**Error Response:**
```json
{
  "success": false,
  "message": "You do not have access to the CRM application",
  "code": "APP_ENTITLEMENT_REQUIRED",
  "currentApp": "CRM",
  "allowedApps": ["PORTAL"],
  "error": "User is not entitled to access CRM application. Allowed apps: [PORTAL]. Please contact your administrator to grant access."
}
```

---

### 3. Middleware Chain Position

**Order (for CRM routes):**
```javascript
router.use(protect);                    // 1. Authentication
router.use(resolveAppContext);          // 2. Resolve appKey from URL
router.use(requireAppEntitlement);      // 3. Check user's app entitlements ← NEW
router.use(requireCRMApp);              // 4. Enforce CRM-only access
router.use(organizationIsolation);      // 5. Organization context
```

**Order (for Portal routes):**
```javascript
router.use(protect);                    // 1. Authentication
router.use(resolveAppContext);          // 2. Resolve appKey from URL
router.use(requireAppEntitlement);      // 3. Check user's app entitlements ← NEW
router.use(requirePortalApp);           // 4. Enforce Portal-only access
router.use(organizationIsolation);      // 5. Organization context
```

---

### 4. Routes Updated

All CRM and Portal routes now include `requireAppEntitlement`:

**CRM Routes (18 files):**
- `dealRoutes.js`
- `userRoutes.js`
- `roleRoutes.js`
- `peopleRoutes.js`
- `organizationRoutes.js`
- `organizationV2Routes.js`
- `taskRoutes.js`
- `eventRoutes.js`
- `formRoutes.js`
- `itemRoutes.js`
- `groupRoutes.js`
- `reportRoutes.js`
- `moduleRoutes.js`
- `csvRoutes.js`
- `importHistoryRoutes.js`
- `userPreferencesRoutes.js`
- `uploadRoutes.js`
- `metricsRoutes.js`

**Portal Routes (1 file):**
- `portalRoutes.js`

---

## Example Flows

### ✅ Allowed: CRM User Accesses CRM API

**User:** `allowedApps = ['CRM']`  
**Request:**
```http
GET /api/deals
Authorization: Bearer <crm_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'CRM'` (from `/api/*` URL)
3. `requireAppEntitlement` checks `['CRM'].includes('CRM')` ✅
4. `requireCRMApp` checks `appKey === 'CRM'` ✅
5. **Allowed** - Continues to business logic

**Response:** 200 OK with deals data

**Log:**
```
[AppContext] appKey=CRM path=/api/deals userId=... orgId=...
```

---

### ❌ Blocked: Portal User Attempts to Access CRM API via /api/*

**User:** `allowedApps = ['PORTAL']`  
**Request:**
```http
GET /api/deals
Authorization: Bearer <portal_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'CRM'` (from `/api/*` URL)
3. `requireAppEntitlement` checks `['PORTAL'].includes('CRM')` ❌
4. **Blocked** - Returns 403 Forbidden

**Response:**
```json
{
  "success": false,
  "message": "You do not have access to the CRM application",
  "code": "APP_ENTITLEMENT_REQUIRED",
  "currentApp": "CRM",
  "allowedApps": ["PORTAL"],
  "error": "User is not entitled to access CRM application. Allowed apps: [PORTAL]. Please contact your administrator to grant access."
}
```

**Log:**
```
[AppContext] appKey=CRM path=/api/deals userId=... orgId=...
[AppEntitlement] Blocked access: userId=... email=portal@example.com appKey=CRM allowedApps=[PORTAL] path=/api/deals orgId=...
```

---

### ❌ Blocked: CRM User Attempts to Access Portal API via /portal/*

**User:** `allowedApps = ['CRM']`  
**Request:**
```http
GET /portal/me
Authorization: Bearer <crm_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'PORTAL'` (from `/portal/*` URL)
3. `requireAppEntitlement` checks `['CRM'].includes('PORTAL')` ❌
4. **Blocked** - Returns 403 Forbidden

**Response:**
```json
{
  "success": false,
  "message": "You do not have access to the PORTAL application",
  "code": "APP_ENTITLEMENT_REQUIRED",
  "currentApp": "PORTAL",
  "allowedApps": ["CRM"],
  "error": "User is not entitled to access PORTAL application. Allowed apps: [CRM]. Please contact your administrator to grant access."
}
```

**Log:**
```
[AppContext] appKey=PORTAL path=/portal/me userId=... orgId=...
[AppEntitlement] Blocked access: userId=... email=crm@example.com appKey=PORTAL allowedApps=[CRM] path=/portal/me orgId=...
```

---

### ✅ Allowed: Portal User Accesses Portal API

**User:** `allowedApps = ['PORTAL']`  
**Request:**
```http
GET /portal/me
Authorization: Bearer <portal_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'PORTAL'` (from `/portal/*` URL)
3. `requireAppEntitlement` checks `['PORTAL'].includes('PORTAL')` ✅
4. `requirePortalApp` checks `appKey === 'PORTAL'` ✅
5. **Allowed** - Continues to business logic

**Response:** 200 OK with user profile

**Log:**
```
[AppContext] appKey=PORTAL path=/portal/me userId=... orgId=...
```

---

### ✅ Allowed: Multi-App User Accesses Both Apps

**User:** `allowedApps = ['CRM', 'PORTAL']`  
**Request 1:**
```http
GET /api/deals
Authorization: Bearer <multi_app_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'CRM'`
3. `requireAppEntitlement` checks `['CRM', 'PORTAL'].includes('CRM')` ✅
4. `requireCRMApp` checks `appKey === 'CRM'` ✅
5. **Allowed** - Continues to business logic

**Request 2:**
```http
GET /portal/me
Authorization: Bearer <multi_app_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'PORTAL'`
3. `requireAppEntitlement` checks `['CRM', 'PORTAL'].includes('PORTAL')` ✅
4. `requirePortalApp` checks `appKey === 'PORTAL'` ✅
5. **Allowed** - Continues to business logic

**Response:** Both requests return 200 OK

---

## Behavior Guarantees

### ✅ Portal Users Cannot Hit /api/* (Even if URL Says CRM)

- Portal users with `allowedApps = ['PORTAL']` are blocked from `/api/*` routes
- `requireAppEntitlement` checks user's entitlements before app-specific enforcement
- Clear error message explains the block

### ✅ CRM Users Cannot Hit /portal/*

- CRM users with `allowedApps = ['CRM']` are blocked from `/portal/*` routes
- `requireAppEntitlement` checks user's entitlements before app-specific enforcement
- Clear error message explains the block

### ✅ Multi-App Users Can Hit Both

- Users with `allowedApps = ['CRM', 'PORTAL']` can access both apps
- Entitlement check passes for both app contexts
- No restrictions on multi-app users

### ✅ CRM Behavior Unchanged

- Existing users default to `allowedApps = ['CRM']`
- All existing CRM functionality works as before
- No breaking changes

### ✅ Logs Clearly Explain Blocks

- Blocked attempts logged with:
  - User ID and email
  - Requested appKey
  - User's allowedApps
  - Request path
  - Organization ID

**Log Format:**
```
[AppEntitlement] Blocked access: userId=507f1f77bcf86cd799439011 email=portal@example.com appKey=CRM allowedApps=[PORTAL] path=/api/deals orgId=507f191e810c19729de860ea
```

---

## Middleware Ordering

### Correct Order (Required)

```javascript
router.use(protect);                    // 1. Authentication (sets req.user)
router.use(resolveAppContext);          // 2. Resolve appKey from URL (sets req.appKey)
router.use(requireAppEntitlement);      // 3. Check user entitlements (uses req.user.allowedApps and req.appKey)
router.use(requireCRMApp);              // 4. App-specific enforcement (uses req.appKey)
router.use(organizationIsolation);      // 5. Organization context
```

**Why This Order:**
- `protect` must run first to set `req.user`
- `resolveAppContext` must run before `requireAppEntitlement` to set `req.appKey`
- `requireAppEntitlement` must run before app-specific enforcement to check user entitlements
- App-specific enforcement (`requireCRMApp`/`requirePortalApp`) runs after entitlement check

---

## Implementation Details

### User Model Default

```javascript
allowedApps: {
    type: [String],
    enum: ['CRM', 'PORTAL', 'AUDIT', 'LMS'],
    default: ['CRM'] // Default existing users to CRM access
}
```

**Backward Compatibility:**
- Existing users without `allowedApps` field default to `['CRM']`
- Middleware handles missing field: `const allowedApps = req.user.allowedApps || ['CRM'];`
- No migration required for existing users

### Middleware Logic

```javascript
const requireAppEntitlement = (req, res, next) => {
    // 1. Check authentication
    if (!req.user) {
        return res.status(401).json({ ... });
    }
    
    // 2. Check appKey is set
    if (!req.appKey) {
        return res.status(403).json({ ... });
    }
    
    // 3. Get user's allowed apps (default to ['CRM'])
    const allowedApps = req.user.allowedApps || ['CRM'];
    
    // 4. Check entitlement
    if (!allowedApps.includes(req.appKey)) {
        // Log and block
        console.warn(`[AppEntitlement] Blocked access: ...`);
        return res.status(403).json({ ... });
    }
    
    // 5. User is entitled, continue
    next();
};
```

---

## Testing

### Test Case 1: CRM User Accesses CRM API (Should Succeed)

```bash
# User: allowedApps = ['CRM']
curl -X GET http://localhost:5000/api/deals \
  -H "Authorization: Bearer <crm_user_token>"

# Expected: 200 OK
```

### Test Case 2: Portal User Accesses CRM API (Should Fail)

```bash
# User: allowedApps = ['PORTAL']
curl -X GET http://localhost:5000/api/deals \
  -H "Authorization: Bearer <portal_user_token>"

# Expected: 403 Forbidden with APP_ENTITLEMENT_REQUIRED error
```

### Test Case 3: CRM User Accesses Portal API (Should Fail)

```bash
# User: allowedApps = ['CRM']
curl -X GET http://localhost:5000/portal/me \
  -H "Authorization: Bearer <crm_user_token>"

# Expected: 403 Forbidden with APP_ENTITLEMENT_REQUIRED error
```

### Test Case 4: Multi-App User Accesses Both (Should Succeed)

```bash
# User: allowedApps = ['CRM', 'PORTAL']
curl -X GET http://localhost:5000/api/deals \
  -H "Authorization: Bearer <multi_app_user_token>"
# Expected: 200 OK

curl -X GET http://localhost:5000/portal/me \
  -H "Authorization: Bearer <multi_app_user_token>"
# Expected: 200 OK
```

---

## Files Modified

1. **`server/models/User.js`** - Added `allowedApps` field
2. **`server/middleware/requireAppEntitlementMiddleware.js`** - Created entitlement middleware
3. **All CRM routes (18 files)** - Added `requireAppEntitlement` middleware
4. **`server/routes/portalRoutes.js`** - Added `requireAppEntitlement` middleware

---

## Summary

✅ **User-level App Entitlement enforcement is now active**
- Users can only access apps they are entitled to
- Portal users blocked from CRM APIs (even via `/api/*` URLs)
- CRM users blocked from Portal APIs (even via `/portal/*` URLs)
- Multi-app users can access both

✅ **Backward Compatible**
- Existing users default to `['CRM']`
- No migration required
- No breaking changes

✅ **Observable**
- All blocked attempts logged with clear explanations
- Error messages explain entitlement requirements

**Status:** ✅ Implemented and operational  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained

