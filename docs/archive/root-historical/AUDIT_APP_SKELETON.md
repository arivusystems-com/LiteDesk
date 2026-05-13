# Audit Application Skeleton

**Date:** Creation of Audit App skeleton using platform app model  
**Purpose:** Establish Audit App (App #3) with minimal endpoints and proper access control

---

## Overview

The Audit Application skeleton has been created following the platform app model. It provides a minimal, app-agnostic foundation for future audit-specific functionality.

---

## Implementation

### 1. Audit App Middleware

**File:** `server/middleware/requireAuditAppMiddleware.js`

**Function:** `requireAuditApp(req, res, next)`

**Behavior:**
- Checks if `req.appKey === 'AUDIT'`
- Returns 403 Forbidden if appKey is not AUDIT
- Allows request to continue if appKey is AUDIT
- Logs blocked access attempts

**Error Response:**
```json
{
  "success": false,
  "message": "This endpoint is only accessible from the Audit application",
  "code": "AUDIT_APP_REQUIRED",
  "currentApp": "CRM",
  "requiredApp": "AUDIT",
  "error": "This endpoint requires appKey='AUDIT' but received appKey='CRM'."
}
```

---

### 2. Audit Controller

**File:** `server/controllers/auditController.js`

**Endpoints:**
- `getMe()` - Returns authenticated user profile
- `getOrg()` - Returns organization summary
- `getHealth()` - Audit-specific health check

**Features:**
- Uses existing User and Organization models (Platform Core)
- No CRM-specific logic
- Minimal data returned
- Error handling with development mode details

---

### 3. Audit Routes

**File:** `server/routes/auditRoutes.js`

**Base Path:** `/audit/*`

**Endpoints:**
- `GET /audit/me` - User profile
- `GET /audit/org` - Organization summary
- `GET /audit/health` - Health check

**Middleware Chain:**
```javascript
router.use(protect);                    // 1. Authentication
router.use(resolveAppContext);          // 2. Resolve appKey from URL
router.use(requireAppEntitlement);      // 3. Check user's app entitlements
router.use(requireAuditApp);            // 4. Enforce Audit-only access
router.use(organizationIsolation);      // 5. Organization context
```

---

### 4. Server Integration

**File:** `server/server.js`

**Added:**
```javascript
const auditRoutes = require('./routes/auditRoutes');
app.use('/audit', auditRoutes);
```

**App Context Resolution:**
- `/audit/*` paths automatically resolve to `appKey = 'AUDIT'`
- Already configured in `resolveAppContextMiddleware`

---

## Access Control

### ✅ App Entitlement Check

- `requireAppEntitlement` checks:
  - User's `allowedApps` includes `'AUDIT'`
  - Organization's `enabledApps` includes `'AUDIT'`
- Returns 403 if user or org doesn't have Audit access

### ✅ Audit App Enforcement

- `requireAuditApp` checks:
  - `req.appKey === 'AUDIT'`
- Returns 403 if appKey is not AUDIT

### ✅ Organization Isolation

- `organizationIsolation` ensures:
  - User belongs to active organization
  - Organization context available in controllers

### ✅ No CRM Permissions

- Audit routes do NOT use CRM permissions
- Uses app-aware permission system
- No dependency on CRM modules

---

## Example Flows

### ✅ Allowed: Audit User Accesses Audit API

**Request:**
```http
GET /audit/me
Authorization: Bearer <audit_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'AUDIT'` ✅
3. `requireAppEntitlement` checks:
   - User has `allowedApps: ['AUDIT']` ✅
   - Org has `enabledApps: ['AUDIT']` ✅
4. `requireAuditApp` checks `appKey === 'AUDIT'` ✅
5. `organizationIsolation` ensures org context ✅
6. Controller returns user profile ✅

**Response:** 200 OK with user profile

---

### ❌ Blocked: CRM User Attempts Audit API

**Request:**
```http
GET /audit/me
Authorization: Bearer <crm_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'AUDIT'` ✅
3. `requireAppEntitlement` checks:
   - User has `allowedApps: ['CRM']` ❌
   - Returns 403:
     ```json
     {
       "success": false,
       "message": "You do not have access to the AUDIT application",
       "code": "APP_ENTITLEMENT_REQUIRED",
       "currentApp": "AUDIT",
       "allowedApps": ["CRM"]
     }
     ```

**Result:** Access denied ✅

---

### ❌ Blocked: Audit User Attempts CRM API

**Request:**
```http
GET /api/deals
Authorization: Bearer <audit_user_token>
```

**Flow:**
1. `protect` authenticates user ✅
2. `resolveAppContext` resolves `appKey = 'CRM'` ✅
3. `requireAppEntitlement` checks:
   - User has `allowedApps: ['AUDIT']` ❌
   - Returns 403:
     ```json
     {
       "success": false,
       "message": "You do not have access to the CRM application",
       "code": "APP_ENTITLEMENT_REQUIRED",
       "currentApp": "CRM",
       "allowedApps": ["AUDIT"]
     }
     ```

**Result:** Access denied ✅

---

## Initialization

### ✅ No CRM Initialization

- Audit routes do NOT call `lazyCRMInitialization`
- Audit app is independent of CRM
- No CRM modules initialized for Audit

### 🔮 Future Audit Initialization Hook

**Prepared for:**
- Future `auditAppInitializer` service
- Audit-specific data structures
- Audit-specific configurations

**Pattern:**
```javascript
// Future: server/services/auditAppInitializer.js
async function initializeAudit(organizationId) {
    // Initialize audit-specific structures
    // Create audit schemas, indexes, etc.
}
```

---

## Files Created

1. **`server/middleware/requireAuditAppMiddleware.js`**
   - Audit app enforcement middleware
   - Checks `req.appKey === 'AUDIT'`

2. **`server/controllers/auditController.js`**
   - Audit application controller
   - Minimal endpoints: `/me`, `/org`, `/health`
   - No CRM logic

3. **`server/routes/auditRoutes.js`**
   - Audit application routes
   - Base path: `/audit/*`
   - Middleware chain configured

4. **`AUDIT_APP_SKELETON.md`**
   - This documentation

---

## Files Modified

1. **`server/server.js`**
   - Added `auditRoutes` import
   - Added `app.use('/audit', auditRoutes)`

---

## Summary

✅ **Audit App skeleton created**
- Base path: `/audit/*`
- App key: `AUDIT`
- Minimal endpoints: `/me`, `/org`, `/health`

✅ **Access control implemented**
- App entitlement check
- Audit app enforcement
- Organization isolation
- No CRM permissions

✅ **No CRM dependencies**
- No CRM modules initialized
- No CRM controllers reused
- Independent app structure

✅ **Future-ready**
- Prepared for audit initialization
- App-aware permission system
- Platform-safe architecture

**Status:** ✅ Implemented and operational  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained

The Audit Application skeleton is now available at `/audit/*` with proper access control and no CRM dependencies.

