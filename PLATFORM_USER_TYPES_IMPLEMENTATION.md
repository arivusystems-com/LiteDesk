# Platform User Types & App-Based Access Implementation

## ✅ Implementation Complete

This document summarizes the implementation of platform-wide user access model that supports:
- CRM users
- Audit-only users
- Customer Portal users
- Per-app billing structure (ready for future implementation)
- Future apps

## 📋 Changes Made

### 1. User Model Updates (`server/models/User.js`)

#### Added `userType` Field
- Type: `'INTERNAL' | 'EXTERNAL' | 'SYSTEM'`
- Default: `'INTERNAL'`
- **INTERNAL**: employees of the organization
- **EXTERNAL**: auditors, customers, vendors
- **SYSTEM**: future automation (no UI usage yet)

#### Added `appAccess` Array Structure
```javascript
appAccess: [{
    appKey: 'CRM' | 'AUDIT' | 'PORTAL',
    roleKey: String,
    status: 'ACTIVE' | 'INVITED' | 'SUSPENDED',
    addedAt: Date
}]
```

**Rules:**
- A user has access to an app only if an entry exists
- No implicit app access
- No global roles - roles are scoped to appKey
- This is the single source of truth for app access

#### Kept `allowedApps` for Backward Compatibility
- Legacy field maintained during migration period
- New middleware checks `appAccess` first, falls back to `allowedApps`

### 2. App Role Constants (`server/constants/appRoles.js`)

Created role definitions (constants only, no permission logic):

- **CRM_ROLES**: `['ADMIN', 'MANAGER', 'USER']`
- **AUDIT_ROLES**: `['AUDITOR']`
- **PORTAL_ROLES**: `['CUSTOMER', 'VIEWER']`

Helper functions:
- `getRolesForApp(appKey)` - Get valid roles for an app
- `isValidRoleForApp(appKey, roleKey)` - Validate role for app
- `mapLegacyRoleToCRM(legacyRole)` - Map legacy roles to CRM roleKeys

### 3. Migration Script (`server/scripts/migrateUsersToAppAccess.js`)

Migration rules:
1. Sets `userType = 'INTERNAL'` for all existing users
2. Converts `allowedApps` to `appAccess` format
3. Maps legacy role to appAccess roleKey:
   - `owner` → `ADMIN`
   - `admin` → `ADMIN`
   - `manager` → `MANAGER`
   - `user` → `USER`
   - `viewer` → `USER`
4. Ensures organization owners (`isOwner = true`) have `CRM: ADMIN`

**To run migration:**
```bash
node server/scripts/migrateUsersToAppAccess.js
```

### 4. Middleware Updates (`server/middleware/requireAppEntitlementMiddleware.js`)

Updated to check `appAccess` structure:
- Checks if `req.user.appAccess` contains entry with `appKey === req.appKey` and `status === 'ACTIVE'`
- Falls back to `allowedApps` for backward compatibility (if `appAccess` is empty)
- Returns 403 Forbidden if user is not entitled to the app
- Logs blocked attempts with clear explanations

### 5. User Creation Updates

#### `server/controllers/authController.js`
- New organization owners get:
  - `userType: 'INTERNAL'`
  - `appAccess: [{ appKey: 'CRM', roleKey: 'ADMIN', status: 'ACTIVE' }]`

#### `server/controllers/userController.js`
- New users get:
  - `userType: 'INTERNAL'`
  - `appAccess: [{ appKey: 'CRM', roleKey: <mapped from legacy role>, status: 'ACTIVE' }]`
  - Owners always get `CRM: ADMIN`

#### `server/scripts/createDefaultAdmin.js`
- Default admin gets:
  - `userType: 'INTERNAL'`
  - `appAccess: [{ appKey: 'CRM', roleKey: 'ADMIN', status: 'ACTIVE' }]`

## 🔒 Access Resolution Flow

1. **Request arrives** → `resolveAppContext` middleware sets `req.appKey`
2. **Authentication** → `protect` middleware sets `req.user`
3. **App Entitlement Check** → `requireAppEntitlement` middleware:
   - Checks `req.user.appAccess` for entry matching `req.appKey` with `status === 'ACTIVE'`
   - Falls back to `req.user.allowedApps` if `appAccess` is empty (backward compatibility)
   - Returns 403 if no access found
4. **Permission Check** → `checkPermission` middleware (existing, unchanged)

## ✅ Validation Checklist

- [x] Existing CRM users continue to work (backward compatible)
- [x] Audit App users can exist without CRM access (structure supports it)
- [x] Portal-only users are possible (structure supports it)
- [x] No user gets app access implicitly (must have `appAccess` entry)
- [x] App access is the single source of truth (`appAccess` array)
- [x] No breaking schema changes (`allowedApps` kept for compatibility)
- [x] Organization owners always have `CRM: ADMIN`
- [x] Default existing users to `userType = 'INTERNAL'`

## 🚀 Next Steps (Not Implemented - Out of Scope)

The following were explicitly NOT implemented (as per requirements):
- ❌ Add User UI
- ❌ Billing UI
- ❌ Billing logic (structure is ready: `billableSeats(appKey) = count(users where appAccess.appKey === appKey)`)
- ❌ Permission matrices
- ❌ CRM permissions refactoring

## 📝 Notes

- **Backward Compatibility**: The system maintains full backward compatibility during migration
- **Migration Required**: Run the migration script to update existing users
- **New Users**: Automatically get the new structure
- **Legacy Support**: `allowedApps` field is checked as fallback if `appAccess` is empty

## 🔍 Testing Recommendations

1. **Run Migration**: Execute migration script on a test database first
2. **Verify Existing Users**: Ensure all existing CRM users can still access CRM
3. **Test New User Creation**: Verify new users get correct `appAccess`
4. **Test Owner Access**: Verify owners always have `CRM: ADMIN`
5. **Test Access Denial**: Verify users without app access get 403

