# Field Governance Model

**Authoritative Reference** | Last Updated: 2024

This document defines the invariants for field ownership, context, and access control. These rules are enforced at runtime and MUST NOT be violated.

---

## 1. Field Ownership Rules

### 1.1 Ownership Types

Fields MUST have exactly one owner from: `'platform'`, `'app'`, or `'org'`.

- **`owner = 'platform'`**: Fields shipped by the platform core
- **`owner = 'app'`**: Fields shipped by an app/capability (e.g., Sales, Support)
- **`owner = 'org'`**: Fields created by organization administrators

### 1.2 Ownership Invariants

#### Platform-Owned Fields (`owner = 'platform'`)

- MUST NOT be deleted
- MUST NOT be renamed
- MUST NOT have their type changed
- MUST NOT be hidden globally
- CAN be edited ONLY by owners (`user.isOwner === true`)
- Regular users MUST NOT edit platform fields

#### App-Owned Fields (`owner = 'app'`)

- MUST NOT be deleted via UI
- MUST NOT be renamed by organization users
- CAN be removed ONLY during app uninstall (see Section 1.3)
- CAN be edited by users with:
  - App access (`user.appAccess` includes the app)
  - Edit permission for the module (`user.permissions[module].edit === true`)

#### Org-Owned Fields (`owner = 'org'`)

- CAN be deleted by organization administrators
- CAN be renamed
- CAN have their type changed (subject to existing constraints)
- CAN be edited by users with edit permission for the module

### 1.3 App Uninstall Behavior

When an app is uninstalled:

- Fields where `owner = 'app'` AND `context = <app>` MUST be removed
- Fields where `owner = 'org'` MUST be preserved
- Fields where `owner = 'platform'` MUST be preserved
- Field data in records MAY be preserved (fields become hidden, data remains)

---

## 2. Field Context Rules

### 2.1 Context Definition

Context defines WHERE a field applies (visibility scope), not WHO controls it.

### 2.2 Valid Context Values

- **`context = 'global'`**: Field is visible in all contexts
- **`context = '<app>'`**: Field is visible ONLY in that app context (e.g., `'sales'`, `'support'`)

### 2.3 Context Invariants

- Context MUST NOT be `'org'`, `'tenant'`, or `'customer'`
- Organizations are NOT contexts
- Context MUST be a string (non-nullable)
- Default context for existing fields: `'global'`

### 2.4 Context Visibility Rules

#### Global Fields (`context = 'global'`)

- MUST be visible in all contexts
- MUST appear in platform-level views
- MUST appear in app-specific views

#### App-Specific Fields (`context = '<app>'`)

- MUST be visible ONLY when operating inside that app
- MUST NOT appear in:
  - Platform → Core Entities views
  - Other apps
  - Generic views outside the app context

#### Platform Context

- When current context = `'platform'`:
  - Show fields where `context = 'global'` ONLY
  - MUST NOT show app-specific fields

#### App Context

- When current context = `'<app>'`:
  - Show fields where `context = '<app>'` OR `context = 'global'`
  - MUST NOT show fields from other apps

#### Missing/Unknown Context

- If context is missing or unknown:
  - Default to `'platform'` context
  - Show ONLY global fields

---

## 3. Field Access Control Rules

### 3.1 Access Types

Field access is controlled by:
- **READ access**: Can the user view the field value?
- **WRITE access**: Can the user edit the field value?

Access control is ORTHOGONAL to ownership and context. It controls ACCESS, not existence.

### 3.2 READ Access Rules

#### Owners

- Users where `user.isOwner === true`:
  - CAN read ALL fields (regardless of ownership, context, or permissions)

#### Regular Users

- Users MUST have module-level view permission:
  - `user.permissions[module].view === true` OR
  - `user.permissions[module].viewAll === true`
- If view permission is granted:
  - User CAN read ALL fields in that module
- If view permission is NOT granted:
  - User MUST NOT read any fields in that module

#### Fail-Safe

- If user is missing → deny read
- If permission is unclear → deny read

### 3.3 WRITE Access Rules

#### Owners

- Users where `user.isOwner === true`:
  - CAN write to platform-owned fields
  - CAN write to app-owned fields
  - CAN write to org-owned fields

#### Platform-Owned Fields

- Regular users MUST NOT edit platform-owned fields
- Only owners can edit platform fields

#### App-Owned Fields

- Users MUST have:
  - App access: `user.appAccess` includes the app OR `user.allowedApps` includes the app
  - Edit permission: `user.permissions[module].edit === true`
- If app context is `'global'`:
  - User needs edit permission only
- If app context is app-specific:
  - User needs BOTH app access AND edit permission

#### Org-Owned Fields

- Users MUST have edit permission: `user.permissions[module].edit === true`
- If edit permission is granted → user CAN edit
- If edit permission is NOT granted → user MUST NOT edit

#### Fail-Safe

- If user is missing → deny write
- If permission is unclear → deny write
- If ownership is unclear → deny write

---

## 4. Enforcement Points

### 4.1 Field Definition Mutations

- **Location**: `server/controllers/moduleController.js`
- **Functions**: `updateModule`, `updateSystemModule`
- **Enforcement**: `validateFieldMutations()` checks ownership rules before allowing mutations

### 4.2 Field Visibility (Context Filtering)

- **Location**: `server/controllers/moduleController.js`
- **Function**: `listModules`
- **Enforcement**: `filterFieldsByContext()` filters fields by current context

### 4.3 Field READ Access

- **Location**: `server/controllers/moduleController.js`
- **Function**: `listModules`
- **Enforcement**: `filterFieldsByReadAccess()` filters fields by user permissions

### 4.4 Field WRITE Access

- **Location**: Update endpoints in controllers
  - `server/controllers/dealController.js` → `updateDeal`
  - `server/controllers/peopleController.js` → `update`
  - `server/controllers/taskController.js` → `updateTask`
- **Enforcement**: `validateFieldWrite()` checks write permissions before allowing updates

### 4.5 App Uninstall Cleanup

- **Location**: `server/controllers/organizationController.js`
- **Function**: `disableApp`
- **Enforcement**: Removes only app-owned fields with matching context

---

## 5. Utility Functions

### 5.1 Field Access Control

**File**: `server/utils/fieldAccessControl.js`

- `canReadField(field, user, moduleKey)` → boolean
- `canWriteField(field, user, moduleKey)` → boolean
- `filterFieldsByReadAccess(fields, user, moduleKey)` → Array
- `filterFieldsByWriteAccess(fields, user, moduleKey)` → Array
- `validateFieldWrite(fieldKey, fields, user, moduleKey)` → { allowed: boolean, reason: string }

### 5.2 Context Filtering

**File**: `server/controllers/moduleController.js`

- `filterFieldsByContext(fields, currentContext)` → Array

### 5.3 Field Mutation Validation

**File**: `server/controllers/moduleController.js`

- `validateFieldMutations(existingFields, newFields, isOrgAdmin)` → { isValid: boolean, message: string }

---

## 6. Data Model

### 6.1 Field Definition Structure

```javascript
{
  key: String,           // Field identifier
  label: String,         // Display label
  dataType: String,      // Field type
  owner: String,         // 'platform' | 'app' | 'org' (REQUIRED)
  context: String,       // 'global' | '<app>' (REQUIRED)
  // ... other field properties
}
```

### 6.2 Default Values

- New fields without `owner` → default to `'platform'`
- New fields without `context` → default to `'global'`
- Existing fields (migrated) → `owner = 'platform'`, `context = 'global'`

---

## 7. Key Principles

1. **Backend is Source of Truth**: All access checks happen server-side
2. **Fail-Safe Defaults**: When in doubt, deny access
3. **No Special Cases**: Use ownership/context/access flags, not hardcoded field names
4. **Orthogonal Concerns**: Ownership, context, and access are independent
5. **No Data Loss**: Field removal does not delete record data (data preserved, fields hidden)

---

## 8. Common Patterns

### 8.1 Adding a New Platform Field

```javascript
{
  key: 'newField',
  label: 'New Field',
  dataType: 'Text',
  owner: 'platform',      // REQUIRED
  context: 'global',     // REQUIRED
  // ... other properties
}
```

### 8.2 Adding a New App Field

```javascript
{
  key: 'salesField',
  label: 'Sales Field',
  dataType: 'Text',
  owner: 'app',          // REQUIRED
  context: 'sales',      // REQUIRED (app name)
  // ... other properties
}
```

### 8.3 Adding a New Org Field

```javascript
{
  key: 'customField',
  label: 'Custom Field',
  dataType: 'Text',
  owner: 'org',          // REQUIRED
  context: 'global',     // REQUIRED (org fields are typically global)
  // ... other properties
}
```

---

## 9. Violations to Avoid

❌ **DO NOT**:
- Set `context = 'org'`, `'tenant'`, or `'customer'`
- Allow regular users to edit platform fields
- Allow users without app access to edit app fields
- Show app-specific fields in platform context
- Hardcode field names in access checks
- Delete org-owned fields during app uninstall
- Change ownership of existing fields

✅ **DO**:
- Always set `owner` and `context` when creating fields
- Check ownership before allowing mutations
- Filter fields by context before displaying
- Filter fields by access before returning to client
- Validate write access before updating records
- Preserve org-owned fields during app uninstall

---

**End of Document**

