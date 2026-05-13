# Settings Architectural Boundaries

## Purpose
This document defines strict architectural boundaries for the Settings implementation to prevent architectural drift and maintain platform integrity.

---

## Platform Boundaries

### Platform Core
**Owns:**
- Organization settings
- User management
- Role management
- Platform-level permissions
- Security settings
- Platform-wide integrations

**Cannot:**
- Modify application-specific settings
- Access subscription billing logic
- Modify shared platform capabilities from app context

### Application Layer
**Owns:**
- Application-specific settings
- Application subscriptions
- Application usage metrics
- App-specific integrations

**Cannot:**
- Modify platform-level settings
- Modify shared platform capabilities
- Access other applications' data

### Shared Capabilities (Core Modules)
**Owns:**
- Core module definitions
- Application usage of capabilities
- Capability dependencies

**Cannot:**
- Be modified from application settings
- Be deleted or renamed
- Have their ownership changed

---

## Data Ownership Rules

### Platform Core Data
**Models:** Organization, User, Role, SecuritySettings

**Access Rules:**
- Only Platform Core endpoints can modify
- Application endpoints cannot modify
- Read access allowed for display purposes

**Examples:**
- User.allowedApps (Platform Core)
- Role.appPermissions (Platform Core)
- Organization.securitySettings (Platform Core)

### App Registry Data
**Models:** AppDefinition, ModuleDefinition

**Access Rules:**
- Read-only from Settings UI
- Modified only through admin/system processes
- Used for display and validation

**Examples:**
- AppDefinition (read-only)
- ModuleDefinition (read-only, except app usage toggles)

### Subscription Service Data
**Models:** AppSubscription, UsageMetrics

**Access Rules:**
- Subscription Service owns app subscriptions
- Application layer provides usage metrics
- Platform Core cannot modify subscriptions

**Examples:**
- AppSubscription.plan (Subscription Service)
- UsageMetrics.current (Application layer)

### Integration Service Data
**Models:** IntegrationDefinition, IntegrationConfiguration

**Access Rules:**
- Integration Service owns integration configs
- Platform Core cannot modify integration definitions
- OAuth tokens encrypted and stored securely

**Examples:**
- IntegrationConfiguration.status (Integration Service)
- OAuth tokens (Integration Service, encrypted)

---

## Enforcement Rules

### Rule 1: Platform Core Cannot Modify App Settings
**Enforcement:** Backend middleware blocks Platform Core endpoints from modifying app-specific settings

**Example:**
- Cannot modify Sales pipeline settings from Platform Core endpoint
- Cannot modify Helpdesk ticket settings from Platform Core endpoint

### Rule 2: Applications Cannot Modify Platform Settings
**Enforcement:** Backend middleware blocks application endpoints from modifying platform-level settings

**Example:**
- Cannot modify password rules from Sales app endpoint
- Cannot modify user roles from Helpdesk app endpoint

### Rule 3: Core Modules Cannot Be Modified from App Context
**Enforcement:** Backend validates moduleKey is platform-owned before allowing modifications

**Example:**
- Cannot modify People module from Sales app settings
- Cannot modify Organizations module from Helpdesk app settings

### Rule 4: Subscriptions Are App-Specific
**Enforcement:** Subscription endpoints scoped to appKey, cannot modify platform-level subscriptions

**Example:**
- Cannot modify Sales subscription from Platform Core
- Cannot modify Helpdesk subscription from Sales app

### Rule 5: Billing Logic Never Appears in Core or Modules
**Enforcement:** No billing/pricing logic in Core Modules or Applications sections

**Example:**
- Core Modules section has no pricing information
- Applications section has no billing controls
- Subscriptions section is separate and app-specific

---

## API Boundary Rules

### Core Modules Endpoints
**Scope:** Platform Core + App Registry

**Allowed:**
- Read module definitions
- Toggle optional app usage
- Read application dependencies

**Not Allowed:**
- Modify module definitions
- Delete modules
- Rename modules
- Modify required app usage

### Applications Endpoints
**Scope:** App Registry + Organization

**Allowed:**
- Read application definitions
- Enable/disable applications
- Read dependencies

**Not Allowed:**
- Modify application definitions
- Modify dependencies
- Access subscription billing logic

### Subscriptions Endpoints
**Scope:** Subscription Service + Application layer

**Allowed:**
- Read subscriptions
- Upgrade subscriptions
- Read usage metrics

**Not Allowed:**
- Modify platform capabilities
- Access billing payment processing
- Modify usage metrics directly

### Users & Access Endpoints
**Scope:** Platform Core

**Allowed:**
- Read users and roles
- Modify user app access
- Modify role permissions

**Not Allowed:**
- Modify platform structure
- Modify legacy permissions (read-only)
- Access subscription logic

### Security Endpoints
**Scope:** Platform Core

**Allowed:**
- Read security settings
- Modify password rules
- Modify session controls
- Modify 2FA settings
- Read login activity
- Read security events

**Not Allowed:**
- Modify app-specific security (if exists)
- Access subscription logic

### Integrations Endpoints
**Scope:** Integration Service

**Allowed:**
- Read integration definitions
- Connect/disconnect integrations
- Configure integrations

**Not Allowed:**
- Modify integration definitions
- Access OAuth tokens directly (encrypted storage)

---

## Validation Rules

### Core Modules Validation
- ModuleKey must exist in App Registry
- ModuleKey must be platform-owned (`appKey: 'platform'`)
- AppKey must exist and be enabled for organization
- Cannot toggle required applications
- Must confirm before disabling optional apps

### Applications Validation
- AppKey must exist in App Registry
- Cannot enable app not available in App Registry
- Cannot disable included apps
- Cannot disable during trial (unless cancelling)
- Must confirm before enabling/disabling

### Subscriptions Validation
- AppKey must exist
- Plan must be available for app
- Cannot upgrade if included
- Cannot upgrade during trial (unless cancelling)
- Must confirm before upgrading

### Users & Access Validation
- UserId must belong to organization
- Cannot assign access to apps not enabled for organization
- Cannot modify platform permissions from user settings
- Cannot edit legacy permissions
- Must have permission to manage users/roles

### Security Validation
- Password rules must be reasonable (min 8 characters)
- Session duration must be valid option
- Must confirm before high-risk changes
- Changes logged to security events

### Integrations Validation
- IntegrationKey must exist
- Provider must be supported
- Cannot connect if app not enabled (for app-specific integrations)
- Must confirm before connecting/disconnecting

---

## Backward Compatibility Rules

### Legacy Permissions
- **Visibility:** Must be visible but collapsed by default
- **Editability:** Read-only, cannot be modified
- **Migration:** Link to migrate to app-scoped permissions
- **Display:** Clearly marked as legacy, discouraged

### Legacy App Structure
- **CRM app:** Treated as Sales app for display
- **Legacy modules:** Mapped to platform capabilities
- **Support:** Both old and new structures supported

### Data Migration
- **No breaking changes:** All existing data preserved
- **Gradual migration:** Can migrate over time
- **Dual support:** Both structures supported during transition

---

## Error Handling Rules

### Validation Errors
**Response Format:**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Human-friendly error message",
  "field": "fieldName" // if applicable
}
```

**Examples:**
- "Cannot disable required application"
- "Application not enabled for organization"
- "Plan not available for this application"

### Permission Errors
**Response Format:**
```json
{
  "success": false,
  "error": "permission_denied",
  "message": "You do not have permission to perform this action"
}
```

**Examples:**
- "You do not have permission to manage users"
- "You do not have permission to modify security settings"

### Boundary Violation Errors
**Response Format:**
```json
{
  "success": false,
  "error": "boundary_violation",
  "message": "This action is not allowed from this context"
}
```

**Examples:**
- "Cannot modify platform capabilities from application settings"
- "Cannot modify application settings from platform core"

---

## Testing Requirements

### Boundary Tests
- [ ] Platform Core cannot modify app settings
- [ ] Applications cannot modify platform settings
- [ ] Core modules cannot be modified from app context
- [ ] Subscriptions are app-specific
- [ ] Billing logic never appears in Core or Modules

### Validation Tests
- [ ] All validation rules enforced
- [ ] Confirmation required for high-risk actions
- [ ] Permission checks enforced
- [ ] Organization scoping enforced

### Backward Compatibility Tests
- [ ] Legacy permissions visible but read-only
- [ ] Legacy app structure supported
- [ ] Data migration paths work
- [ ] No breaking changes

---

## Success Criteria

### ✅ Frontend engineer can build without guessing
- Clear API contracts
- Explicit validation rules
- Clear error messages
- Complete data models

### ✅ Backend engineer knows which APIs to build
- Complete endpoint list
- Request/response formats
- Validation rules
- Enforcement points

### ✅ Product decisions are locked
- Explicit boundaries
- Clear constraints
- No ambiguity
- No reinterpretation possible

---

## Conclusion

This document defines strict architectural boundaries that must be enforced throughout implementation. Any deviation from these boundaries requires explicit approval and documentation.

