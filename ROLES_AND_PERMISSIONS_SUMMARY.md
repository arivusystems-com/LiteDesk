# Roles and Permissions System Summary

## Overview

The LiteDesk platform uses an **app-scoped, role-based access control (RBAC)** system that separates permissions by application and provides both platform-level and application-level permissions.

---

## Key Concepts

### 1. **App-Scoped Permissions**
- Permissions are organized by **application** (SALES, HELPDESK, PROJECTS, AUDIT, PORTAL)
- Each application has its own set of modules and permissions
- Users can have different roles in different applications
- No global roles - all roles are scoped to specific apps

### 2. **Two-Level Permission Structure**

#### **Platform Permissions** (Cross-Application)
Apply across all applications:
- `inviteUsers` - Invite new users to the organization
- `manageSettings` - Manage organization settings
- `viewBilling` - View billing information
- `manageIntegrations` - Manage third-party integrations

#### **App Permissions** (Application-Specific)
Scoped to individual applications:
- **SALES App**: contacts, deals, organizations, tasks, events, forms, items, reports
- **HELPDESK App**: tickets, knowledge base, etc.
- **PROJECTS App**: projects, tasks, milestones
- **AUDIT App**: audit workflows, audit events
- **PORTAL App**: customer profile, self-service

---

## User Model Structure

### App Access (`appAccess` array)
```javascript
appAccess: [{
    appKey: 'SALES' | 'HELPDESK' | 'PROJECTS' | 'AUDIT' | 'PORTAL',
    roleKey: String,  // e.g., 'ADMIN', 'MANAGER', 'USER', 'AUDITOR'
    status: 'ACTIVE' | 'DISABLED',
    addedAt: Date
}]
```

**Key Rules:**
- A user has access to an app **only if** an entry exists in this array
- No implicit app access - this is the single source of truth
- Roles are scoped to appKey - no global roles
- Users can have different roles in different apps

### User Types
- **INTERNAL**: Employees of the organization (default)
- **EXTERNAL**: Auditors, customers, vendors
- **SYSTEM**: Future automation (no UI usage yet)

### Legacy Fields (Backward Compatibility)
- `allowedApps`: Array of app keys (legacy)
- `permissions`: Legacy CRM-scoped permissions (read-only)
- `role`: Legacy role string ('owner', 'admin', 'manager', 'user', 'viewer')

---

## Role Model Structure

### App-Scoped Permissions (`appPermissions`)
```javascript
appPermissions: {
    'SALES': {
        'contacts': { 'create': true, 'read': true, 'update': true, 'delete': false, 'export': true },
        'deals': { 'create': true, 'read': true, 'update': true, 'delete': false }
    },
    'PORTAL': {
        'profile': { 'read': true, 'update': true }
    }
}
```

### Platform Permissions (`platformPermissions`)
```javascript
platformPermissions: {
    inviteUsers: Boolean,
    manageSettings: Boolean,
    viewBilling: Boolean,
    manageIntegrations: Boolean
}
```

### Application Access (`applicationAccess`)
Array of app keys the role has access to:
```javascript
applicationAccess: ['SALES', 'HELPDESK']
```

### Legacy Permissions (`permissions`)
- CRM-specific permissions (deprecated)
- Kept for backward compatibility
- Treated as SALES-app scoped
- Read-only in new implementations

---

## Application Roles

### SALES Application Roles
- **ADMIN**: Full access to sales modules
- **MANAGER**: Team-level access
- **USER**: Standard user access

### AUDIT Application Roles
- **AUDITOR**: Audit-specific access

### PORTAL Application Roles
- **CUSTOMER**: Customer self-service access
- **VIEWER**: Read-only customer access

---

## Default System Roles

When a new organization is created, these default roles are automatically created:

1. **Owner** (System Role)
   - Full system access with all permissions
   - Cannot be deleted
   - Level 0 (top of hierarchy)

2. **Admin** (System Role)
   - Administrative access with most permissions
   - Cannot delete organizations or manage billing
   - Level 1

3. **Manager** (Custom Role)
   - Team management with team-level access
   - Can view/edit team data, not all data
   - Level 2

4. **User** (Custom Role)
   - Standard user with own record access
   - Limited permissions
   - Level 3

5. **Viewer** (Custom Role)
   - Read-only access to assigned records
   - Minimal permissions
   - Level 4

---

## Permission Actions

### Common Module Actions
- `create` - Create new records
- `read` / `view` - View records
- `update` / `edit` - Edit records
- `delete` - Delete records
- `export` / `exportData` - Export data
- `import` - Import data
- `viewAll` - View all records (not just assigned)
- `scope` - Data scope: 'all', 'team', 'own', 'none'

### Module-Specific Actions
- **Settings**: `manageUsers`, `manageBilling`, `manageIntegrations`, `customizeFields`
- **Reports**: `viewStandard`, `viewCustom`, `createCustom`, `exportReports`
- **Users**: `manageRoles`

---

## Settings UI Structure

### Navigation Path
**Settings → People & Access → Roles & Permissions**

### Tabs
1. **User Management**
   - List all users
   - Invite new users
   - Edit user access and permissions
   - View user details

2. **Roles & Permissions**
   - **Roles Management**: Create/edit roles, view permissions
   - **Organization Hierarchy**: Manage role hierarchy

3. **Groups & Teams**
   - Manage user groups and teams

---

## Role Detail View

When viewing/editing a role, admins see:

### Platform Permissions Section
- Checkboxes for platform-level permissions
- Applies across all applications
- Clear label: "These permissions apply across all applications"

### Application Permissions Sections
- One section per application the role has access to
- Grouped by module (Contacts, Deals, Organizations, etc.)
- Clear label: "These permissions only apply to the [App Name] application"
- Only shows apps the role has access to

### Legacy Permissions (if present)
- Warning banner explaining they're legacy
- Read-only (cannot edit)
- Migration path available
- Not hidden, but discouraged

---

## Permission Enforcement

### Backend Validation
- Backend validates `appPermissions` against App Registry
- Backend validates `applicationAccess` against `Organization.enabledApps`
- Backend validates user has `manageUsers` permission to modify roles
- Backend logs all changes to audit trail

### Permission Checks
- Middleware checks app-scoped permissions first
- Falls back to legacy permissions for backward compatibility
- CRM modules are only accessible from CRM app
- Platform permissions checked separately from app permissions

---

## Key Features

### 1. **App Scoping**
- Permissions grouped by application
- Only see permissions for apps user/role has access to
- Cannot configure permissions for apps not enabled
- Clear separation between platform and app permissions

### 2. **Role-Based Management**
- Changes to role affect all users with that role
- Easy to manage permissions for multiple users
- Consistent permissions across users
- User count displayed for each role

### 3. **Backward Compatibility**
- Legacy permissions field maintained
- Legacy role strings mapped to new app roles
- Migration path available
- Gradual migration supported

### 4. **System Roles**
- Owner and Admin are system roles (cannot be deleted)
- Custom roles can be created and deleted
- Role hierarchy supported (parent/child roles)
- Level-based hierarchy (0 = top, higher = lower)

---

## API Endpoints

### Roles
- `GET /api/settings/roles` - List all roles with user counts
- `GET /api/settings/roles/:roleId` - Get detailed role information
- `PUT /api/settings/roles/:roleId` - Update role permissions
- `POST /api/settings/roles` - Create new role
- `DELETE /api/settings/roles/:roleId` - Delete role (if not system role)

### Users
- `GET /api/settings/users` - List all users
- `GET /api/settings/users/:userId` - Get user details
- `PUT /api/settings/users/:userId` - Update user access and permissions
- `POST /api/settings/users/invite` - Invite new user
- `GET /api/settings/users/capabilities` - Get available apps and roles for user type

---

## Best Practices

1. **Use App-Scoped Permissions**
   - Prefer `appPermissions` over legacy `permissions`
   - Group permissions by application
   - Clear labels for each app section

2. **Platform vs App Separation**
   - Use platform permissions for cross-app features
   - Use app permissions for app-specific features
   - Don't mix them

3. **Role Management**
   - Create roles for common permission sets
   - Use system roles (Owner, Admin) as templates
   - Document custom roles with descriptions

4. **User Access**
   - Grant app access explicitly (no implicit access)
   - Assign appropriate role per app
   - Review user access regularly

5. **Migration**
   - Migrate from legacy permissions gradually
   - Test permissions after migration
   - Keep legacy permissions visible but read-only

---

## Related Documentation

- `USERS_ACCESS_EXAMPLE_WALKTHROUGH.md` - Detailed walkthrough of managing roles
- `SETTINGS_DATA_MODELS.md` - Data model specifications
- `SETTINGS_API_CONTRACTS.md` - API endpoint documentation
- `APP_AWARE_PERMISSIONS.md` - App-aware permission system details
- `PLATFORM_USER_TYPES_IMPLEMENTATION.md` - User type implementation
- `SETTINGS_IMPLEMENTATION_BLUEPRINT.md` - Settings implementation guide

---

## Summary

The roles and permissions system provides:
- ✅ **App-scoped permissions** - Clear separation by application
- ✅ **Platform permissions** - Cross-application capabilities
- ✅ **Role-based management** - Easy permission management for groups
- ✅ **Backward compatibility** - Legacy support during migration
- ✅ **System roles** - Pre-configured roles for common use cases
- ✅ **User types** - Support for internal/external users
- ✅ **Hierarchy support** - Role hierarchy and levels
- ✅ **Clear UI** - Intuitive settings interface

The system is designed to be safe, understandable, and scalable for multi-application platforms.
