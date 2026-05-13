# Settings Contracts Summary

## Quick Reference

This document provides a quick reference for all Settings API contracts and data models, organized for easy lookup during implementation.

---

## API Endpoints by Section

### Settings Landing Page
- `GET /api/settings/sections` - List available sections

### Core Modules
- `GET /api/settings/core-modules` - List all core modules
- `GET /api/settings/core-modules/:moduleKey` - Get module details
- `PATCH /api/settings/core-modules/:moduleKey/applications/:appKey` - Toggle app usage

### Applications
- `GET /api/settings/applications` - List all applications
- `GET /api/settings/applications/:appKey` - Get application details
- `POST /api/settings/applications/:appKey/enable` - Enable application
- `POST /api/settings/applications/:appKey/disable` - Disable application

### Subscriptions
- `GET /api/settings/subscriptions` - List all subscriptions
- `GET /api/settings/subscriptions/:appKey` - Get subscription details
- `POST /api/settings/subscriptions/:appKey/upgrade` - Upgrade subscription

### Users & Access
- `GET /api/settings/users` - List all users
- `GET /api/settings/users/:userId` - Get user details
- `PUT /api/settings/users/:userId` - Update user
- `GET /api/settings/roles` - List all roles
- `GET /api/settings/roles/:roleId` - Get role details
- `PUT /api/settings/roles/:roleId` - Update role

### Security
- `GET /api/settings/security` - Get security settings
- `PUT /api/settings/security/password-rules` - Update password rules
- `PUT /api/settings/security/session-controls` - Update session controls
- `PUT /api/settings/security/two-factor-auth` - Update 2FA settings
- `GET /api/settings/security/login-activity` - Get login activity
- `GET /api/settings/security/events` - Get security events

### Integrations
- `GET /api/settings/integrations` - List all integrations
- `GET /api/settings/integrations/:integrationKey` - Get integration details
- `POST /api/settings/integrations/:integrationKey/connect` - Connect integration
- `POST /api/settings/integrations/:integrationKey/oauth/callback` - OAuth callback
- `POST /api/settings/integrations/:integrationKey/disconnect` - Disconnect integration

---

## Data Ownership Matrix

| Data Type | Owner | Read From | Write To | Settings UI Access |
|-----------|-------|-----------|----------|-------------------|
| Core module definitions | App Registry | App Registry | App Registry | Read-only |
| Core module app usage | Platform Core | App Registry/Org | App Registry/Org | Read/Write (optional apps) |
| Application definitions | App Registry | App Registry | App Registry | Read-only |
| Application status | Platform Core | Organization | Organization | Read/Write |
| Application dependencies | App Registry | App Registry | App Registry | Read-only |
| Subscription plans | Subscription Service | Subscription Service | Subscription Service | Read-only |
| Subscription status | Subscription Service | Subscription Service | Subscription Service | Read/Write (upgrade) |
| Usage metrics | Application layer | Application layer | Application layer | Read-only |
| User data | Platform Core | User model | User model | Read/Write |
| Role data | Platform Core | Role model | Role model | Read/Write |
| Permissions | Platform Core | Role/User models | Role/User models | Read/Write (app-scoped) |
| Security settings | Platform Core | Organization | Organization | Read/Write |
| Login activity | Platform Core | LoginActivity | N/A | Read-only |
| Security events | Platform Core | SecurityEvent | N/A | Read-only |
| Integration definitions | Integration Service | Integration Service | Integration Service | Read-only |
| Integration status | Integration Service | Integration Service | Integration Service | Read/Write |

---

## Permission Requirements

| Section | Read Permission | Write Permission |
|---------|----------------|-----------------|
| Landing Page | None | N/A |
| Core Modules | None | `manageSettings` |
| Applications | None | `manageSettings` |
| Subscriptions | `viewBilling` | `manageBilling` |
| Users & Access | `manageUsers` | `manageUsers` |
| Security | `manageSettings` | `manageSettings` |
| Integrations | `manageIntegrations` | `manageIntegrations` |

---

## Registry-Driven Fields

### App Registry Fields (Read-Only)
- App definitions (name, description, icon)
- Module definitions (name, description, icon)
- Dependencies (which capabilities apps use)
- Required flags (which capabilities are required)
- Usage descriptions (how apps use capabilities)

### Computed Fields (From Registries)
- Application status (from Organization.enabledApps)
- Core module app usage (from App Registry + Organization)
- Subscription availability (from Subscription Service)
- Permission validity (from App Registry)

---

## Validation Rules Summary

### Core Modules
- ModuleKey must be platform-owned
- AppKey must exist and be enabled
- Cannot toggle required apps
- Must confirm before disabling

### Applications
- AppKey must exist
- Cannot disable included apps
- Cannot disable during trial
- Must confirm before enable/disable

### Subscriptions
- Plan must be available
- Cannot upgrade if included
- Cannot upgrade during trial
- Must confirm before upgrading

### Users & Access
- Cannot assign access to disabled apps
- Cannot modify platform permissions
- Cannot edit legacy permissions
- AppPermissions must be valid (from registry)

### Security
- Password rules must be reasonable
- Session duration must be valid
- Must confirm high-risk changes
- Changes logged to security events

### Integrations
- IntegrationKey must exist
- Provider must be supported
- Cannot connect if app disabled (app-specific)
- Must confirm before connect/disconnect

---

## Error Response Format

All errors follow this structure:
```json
{
  "success": false,
  "error": "error_type",
  "message": "Human-friendly error message",
  "field": "fieldName (optional)",
  "reason": "specific_reason_code (optional)"
}
```

### Error Types
- `validation_error` - Data validation failed
- `permission_denied` - User lacks permission
- `boundary_violation` - Action violates platform boundary
- `not_found` - Resource not found
- `conflict` - Resource conflict

---

## Confirmation Requirements

These actions require `confirm: true` in request body:

### Core Modules
- Disabling optional app usage

### Applications
- Enabling application
- Disabling application

### Subscriptions
- Upgrading subscription

### Users & Access
- Modifying user permissions (if high-risk)
- Modifying role permissions (if high-risk)

### Security
- Changing password rules (if minLength increased)
- Changing session controls
- Requiring two-factor authentication

### Integrations
- Connecting integration
- Disconnecting integration

---

## Backward Compatibility

### Legacy Fields Supported
- `User.permissions` - Read-only, migration path available
- `Role.permissions` - Read-only, migration path available
- `Organization.enabledModules` - Mapped to enabledApps

### Migration Paths
- Legacy permissions → App-scoped permissions
- Legacy modules → Platform capabilities
- Legacy app structure → New app structure

---

## Implementation Checklist

### Frontend
- [ ] All API endpoints called correctly
- [ ] Request bodies match contracts
- [ ] Response handling matches contracts
- [ ] Error handling for all error types
- [ ] Confirmation modals for required actions
- [ ] Permission-based visibility
- [ ] Read-only indicators
- [ ] Loading and error states

### Backend
- [ ] All endpoints implemented
- [ ] Request validation matches contracts
- [ ] Response format matches contracts
- [ ] Permission checks enforced
- [ ] Organization scoping enforced
- [ ] Validation rules enforced
- [ ] Boundary protection enforced
- [ ] Audit logging implemented
- [ ] Error responses match contract format

### Testing
- [ ] All endpoints tested
- [ ] Validation rules tested
- [ ] Permission checks tested
- [ ] Boundary protection tested
- [ ] Confirmation flows tested
- [ ] Error handling tested
- [ ] Backward compatibility tested

---

## Key Principles

### 1. Registry-Driven
- All app/module lists from App Registry
- All integration lists from Integration Service
- No hardcoded app lists or rules

### 2. Read-Only by Default
- Most endpoints are read-only
- Mutations require confirmation
- Changes logged to audit trail

### 3. Explicit Ownership
- Each contract clearly owned
- No cross-boundary modifications
- Clear data source for each field

### 4. Backward Compatible
- Legacy fields supported
- Migration paths available
- No breaking changes

---

## Success Criteria

### ✅ Frontend can be implemented without hardcoding rules
- All data from registries
- No hardcoded app lists
- No hardcoded validation rules

### ✅ Backend enforcement is clear and centralized
- Explicit validation rules
- Permission checks enforced
- Boundary protection enforced

### ✅ Future apps can plug into Settings without refactors
- App Registry drives app lists
- New apps automatically appear
- No code changes needed

---

## Conclusion

These contracts ensure Settings is:
- **Registry-driven** - No hardcoded rules
- **Platform-safe** - Boundaries enforced
- **Explicit** - No ambiguity
- **Extensible** - New apps plug in automatically
- **Backward compatible** - Legacy support maintained

All contracts are ready for implementation.

