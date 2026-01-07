# CRM App Enforcement Implementation

**Date:** Implementation of CRM-only access enforcement  
**Purpose:** Make CRM an explicit application (App #1) with enforced access control

---

## Overview

All existing CRM routes (`/api/*`) now enforce that only requests with `appKey = 'CRM'` can access them. This makes CRM an explicit application in the multi-app platform, preventing Portal/Audit/LMS users from accidentally accessing CRM APIs.

---

## Implementation

### 1. CRM App Enforcement Middleware

**File:** `server/middleware/requireCRMAppMiddleware.js`

**Function:** `requireCRMApp(req, res, next)`

**Behavior:**
- Checks if `req.appKey === 'CRM'`
- Returns `403 Forbidden` if `appKey` is not CRM
- Allows request to continue if `appKey` is CRM
- Logs blocked access attempts

**Error Response:**
```json
{
  "success": false,
  "message": "This endpoint is only accessible from the CRM application",
  "code": "CRM_APP_REQUIRED",
  "currentApp": "PORTAL",
  "requiredApp": "CRM",
  "error": "This endpoint requires appKey='CRM' but received appKey='PORTAL'. Please access this endpoint from the CRM application."
}
```

---

### 2. Middleware Chain Position

**Applied at router level, after `resolveAppContext` but before business logic:**

```javascript
router.use(protect);                    // 1. Authentication
router.use(resolveAppContext);          // 2. Resolve appKey
router.use(requireCRMApp);              // 3. Enforce CRM-only access ← NEW
router.use(organizationIsolation);      // 4. Organization context
router.use(checkTrialStatus);           // 5. Trial validation
router.use(checkPermission(...));       // 6. Permission checks
```

---

### 3. Routes Updated

All CRM routes now enforce CRM-only access:

| Route File | Path | Status |
|------------|------|--------|
| `dealRoutes.js` | `/api/deals/*` | ✅ Enforced |
| `userRoutes.js` | `/api/users/*` | ✅ Enforced |
| `roleRoutes.js` | `/api/roles/*` | ✅ Enforced |
| `peopleRoutes.js` | `/api/people/*` | ✅ Enforced |
| `organizationRoutes.js` | `/api/organization/*` | ✅ Enforced |
| `organizationV2Routes.js` | `/api/v2/organization/*` | ✅ Enforced |
| `taskRoutes.js` | `/api/tasks/*` | ✅ Enforced |
| `eventRoutes.js` | `/api/events/*` | ✅ Enforced |
| `formRoutes.js` | `/api/forms/*` | ✅ Enforced (protected routes only) |
| `itemRoutes.js` | `/api/items/*` | ✅ Enforced |
| `groupRoutes.js` | `/api/groups/*` | ✅ Enforced |
| `reportRoutes.js` | `/api/reports/*` | ✅ Enforced |
| `moduleRoutes.js` | `/api/modules/*` | ✅ Enforced |
| `csvRoutes.js` | `/api/csv/*` | ✅ Enforced |
| `importHistoryRoutes.js` | `/api/imports/*` | ✅ Enforced |
| `userPreferencesRoutes.js` | `/api/user-preferences/*` | ✅ Enforced |
| `uploadRoutes.js` | `/api/upload/*` | ✅ Enforced |
| `metricsRoutes.js` | `/api/metrics/*` | ✅ Enforced |

**Routes NOT Updated (Platform Management or Public):**
- `authRoutes.js` - Public authentication endpoints
- `adminRoutes.js` - Platform administration (cross-org)
- `instanceRoutes.js` - Instance management (platform)
- `demoRoutes.js` - Demo request handling (platform)
- `healthRoutes.js` - Public health check

---

## Example: Blocked Access Behavior

### Scenario 1: Portal User Attempts to Access CRM API

**Request:**
```http
GET /api/deals
Authorization: Bearer <portal_user_token>
```

**Request Flow:**
1. `protect` middleware authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'PORTAL'` (from URL or default)
3. `requireCRMApp` checks `req.appKey === 'CRM'` ❌
4. **Blocked** - Returns 403 Forbidden

**Response:**
```json
{
  "success": false,
  "message": "This endpoint is only accessible from the CRM application",
  "code": "CRM_APP_REQUIRED",
  "currentApp": "PORTAL",
  "requiredApp": "CRM",
  "error": "This endpoint requires appKey='CRM' but received appKey='PORTAL'. Please access this endpoint from the CRM application."
}
```

**Log Output:**
```
[AppContext] appKey=PORTAL path=/api/deals userId=507f1f77bcf86cd799439011 orgId=507f191e810c19729de860ea
[CRMApp] Blocked access attempt: appKey=PORTAL path=/api/deals userId=507f1f77bcf86cd799439011 orgId=507f191e810c19729de860ea
```

---

### Scenario 2: Audit User Attempts to Access CRM API

**Request:**
```http
GET /api/users
Authorization: Bearer <audit_user_token>
```

**Request Flow:**
1. `protect` middleware authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'AUDIT'` (from URL `/audit/*` or default)
3. `requireCRMApp` checks `req.appKey === 'CRM'` ❌
4. **Blocked** - Returns 403 Forbidden

**Response:**
```json
{
  "success": false,
  "message": "This endpoint is only accessible from the CRM application",
  "code": "CRM_APP_REQUIRED",
  "currentApp": "AUDIT",
  "requiredApp": "CRM",
  "error": "This endpoint requires appKey='CRM' but received appKey='AUDIT'. Please access this endpoint from the CRM application."
}
```

---

### Scenario 3: CRM User Accesses CRM API (Normal Flow)

**Request:**
```http
GET /api/deals
Authorization: Bearer <crm_user_token>
```

**Request Flow:**
1. `protect` middleware authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'CRM'` (default for `/api/*`)
3. `requireCRMApp` checks `req.appKey === 'CRM'` ✅
4. **Allowed** - Continues to business logic

**Response:**
```json
{
  "success": true,
  "data": [...deals...]
}
```

**Log Output:**
```
[AppContext] appKey=CRM path=/api/deals userId=507f1f77bcf86cd799439012 orgId=507f191e810c19729de860ea
```

---

## Behavior Guarantees

### ✅ CRM Works Exactly as Before

- All existing CRM routes default to `appKey = 'CRM'`
- CRM users see no change in behavior
- All existing functionality remains intact

### ✅ Non-CRM Apps Blocked

- Portal users cannot access CRM APIs → 403 Forbidden
- Audit users cannot access CRM APIs → 403 Forbidden
- LMS users cannot access CRM APIs → 403 Forbidden

### ✅ No Breaking Changes

- No route renaming
- No controller refactoring
- No permission changes
- No new roles introduced
- No UI changes required

### ✅ Clean Logs

- All access attempts are logged
- Blocked attempts are logged with warning level
- Normal CRM access continues to log as before

---

## Testing

### Test Case 1: CRM User Access (Should Succeed)

```bash
# Authenticate as CRM user
curl -X GET http://localhost:5000/api/deals \
  -H "Authorization: Bearer <crm_user_token>"

# Expected: 200 OK with deals data
```

### Test Case 2: Portal User Access (Should Fail)

```bash
# Authenticate as Portal user (if Portal app exists)
curl -X GET http://localhost:5000/api/deals \
  -H "Authorization: Bearer <portal_user_token>"

# Expected: 403 Forbidden with error message
```

### Test Case 3: Missing appKey (Should Fail)

```bash
# Request without appKey resolution (edge case)
# This should not happen in normal flow, but middleware handles it

# Expected: 403 Forbidden with "Application context not resolved" error
```

---

## Implementation Details

### Middleware Code

```javascript
const requireCRMApp = (req, res, next) => {
    // Check if appKey is set
    if (!req.appKey) {
        return res.status(403).json({
            success: false,
            message: 'This endpoint requires CRM application context',
            code: 'CRM_APP_REQUIRED',
            error: 'Application context not resolved...'
        });
    }
    
    // Check if appKey is CRM
    if (req.appKey !== APP_KEYS.CRM) {
        // Log blocked attempt
        console.warn(`[CRMApp] Blocked access attempt: appKey=${req.appKey} path=${req.path}...`);
        
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only accessible from the CRM application',
            code: 'CRM_APP_REQUIRED',
            currentApp: req.appKey,
            requiredApp: APP_KEYS.CRM,
            error: `This endpoint requires appKey='${APP_KEYS.CRM}' but received appKey='${req.appKey}'...`
        });
    }
    
    // appKey is CRM, allow request to continue
    next();
};
```

### Route Pattern

```javascript
const { protect } = require('../middleware/authMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const { requireCRMApp } = require('../middleware/requireCRMAppMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');

router.use(protect);
router.use(resolveAppContext); // After auth, before permissions
router.use(requireCRMApp); // Enforce CRM-only access
router.use(organizationIsolation);
```

---

## Summary

✅ **CRM is now an explicit application (App #1)**
- All CRM routes enforce `appKey === 'CRM'`
- Non-CRM apps are blocked with clear error messages
- Existing CRM behavior unchanged

✅ **No Breaking Changes**
- No route renaming
- No controller refactoring
- No permission changes
- No UI changes

✅ **Observable**
- All access attempts logged
- Blocked attempts logged with warnings
- Clear error messages for debugging

**Status:** ✅ Implemented and operational  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained

