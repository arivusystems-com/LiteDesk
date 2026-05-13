# Settings API Reference - Quick Reference

## Overview
Quick reference for all Settings API endpoints, organized by section.

---

## Settings Landing Page

### GET /api/settings/sections
**Purpose:** Get available Settings sections based on permissions

**Response:** List of sections with availability flags

**Enforcement:** Permission-based visibility

---

## Core Modules

### GET /api/settings/core-modules
**Purpose:** List all core modules with application usage

**Response:** Array of modules with app usage details

**Data Source:** App Registry (ModuleDefinition)

### GET /api/settings/core-modules/:moduleKey
**Purpose:** Get detailed module information

**Response:** Module details with app usage and toggle capabilities

**Data Source:** App Registry (ModuleDefinition)

### PATCH /api/settings/core-modules/:moduleKey/applications/:appKey
**Purpose:** Toggle optional application usage

**Request:** `{ "enabled": true/false }`

**Response:** Success status

**Enforcement:** 
- Module must be platform-owned
- App must be optional (not required)
- Must confirm before disabling

**Data Source:** App Registry

---

## Applications

### GET /api/settings/applications
**Purpose:** List all applications with status and dependencies

**Response:** Array of applications with status and dependencies

**Data Source:** App Registry (AppDefinition) + Organization (enabledApps)

### GET /api/settings/applications/:appKey
**Purpose:** Get detailed application information

**Response:** Application details with dependencies and status

**Data Source:** App Registry (AppDefinition) + Organization (enabledApps)

### POST /api/settings/applications/:appKey/enable
**Purpose:** Enable an application

**Response:** Success status

**Enforcement:**
- App must exist in App Registry
- Subscription must allow (if subscription-based)
- Must confirm before enabling

**Data Source:** Organization (enabledApps)

### POST /api/settings/applications/:appKey/disable
**Purpose:** Disable an application

**Request:** `{ "confirm": true }`

**Response:** Success status

**Enforcement:**
- Cannot disable if included in subscription
- Cannot disable if in trial
- Cannot disable if required
- Must confirm before disabling

**Data Source:** Organization (enabledApps)

---

## Subscriptions

### GET /api/settings/subscriptions
**Purpose:** List all application subscriptions

**Response:** Array of subscriptions with plan, pricing, usage

**Data Source:** Subscription Service + Application layer (usage)

### GET /api/settings/subscriptions/:appKey
**Purpose:** Get detailed subscription information

**Response:** Subscription details with usage, limits, available plans

**Data Source:** Subscription Service + Application layer (usage)

### POST /api/settings/subscriptions/:appKey/upgrade
**Purpose:** Upgrade subscription plan

**Request:** `{ "plan": "professional", "confirm": true }`

**Response:** Success status with new plan details

**Enforcement:**
- Plan must be available
- Cannot upgrade if included
- Cannot upgrade during trial (unless cancelling)
- Must confirm before upgrading

**Data Source:** Subscription Service

---

## Users & Access

### GET /api/settings/users
**Purpose:** List all users

**Response:** Array of users with roles and app access

**Data Source:** Platform Core (User model)

### GET /api/settings/users/:userId
**Purpose:** Get detailed user information

**Response:** User details with permissions and app access

**Data Source:** Platform Core (User model + Role model)

### PUT /api/settings/users/:userId
**Purpose:** Update user access or permissions

**Request:** `{ "applicationAccess": [...], "appPermissions": {...} }`

**Response:** Success status

**Enforcement:**
- Cannot assign access to apps not enabled for organization
- Cannot modify platform permissions
- Cannot edit legacy permissions
- Must have permission to manage users

**Data Source:** Platform Core (User model)

### GET /api/settings/roles
**Purpose:** List all roles

**Response:** Array of roles with user counts

**Data Source:** Platform Core (Role model)

### GET /api/settings/roles/:roleId
**Purpose:** Get detailed role information

**Response:** Role details with permissions

**Data Source:** Platform Core (Role model)

### PUT /api/settings/roles/:roleId
**Purpose:** Update role permissions

**Request:** `{ "appPermissions": {...} }`

**Response:** Success status

**Enforcement:**
- Cannot modify platform permissions
- Cannot assign permissions for apps not enabled
- Cannot edit legacy permissions
- Must have permission to manage roles

**Data Source:** Platform Core (Role model)

---

## Security

### GET /api/settings/security
**Purpose:** Get security settings and status

**Response:** Security settings with status and recent activity

**Data Source:** Platform Core (Organization security settings)

### PUT /api/settings/security/password-rules
**Purpose:** Update password rules

**Request:** Password rule configuration

**Response:** Success status

**Enforcement:**
- Minimum length must be at least 8
- Must confirm before changing (if high-risk)
- Changes logged to security events

**Data Source:** Platform Core (Organization model)

### PUT /api/settings/security/session-controls
**Purpose:** Update session controls

**Request:** Session control configuration

**Response:** Success status

**Enforcement:**
- Session duration must be valid option
- Inactive timeout must be reasonable
- Changes logged to security events

**Data Source:** Platform Core (Organization model)

### PUT /api/settings/security/two-factor-auth
**Purpose:** Update two-factor authentication requirements

**Request:** 2FA configuration

**Response:** Success status

**Enforcement:**
- Must confirm before requiring 2FA for all users
- Changes logged to security events

**Data Source:** Platform Core (Organization model)

### GET /api/settings/security/login-activity
**Purpose:** Get login activity history

**Query Params:** `timeRange`, `userId`, `status`

**Response:** Array of login events

**Data Source:** Platform Core (LoginActivity model or audit log)

### GET /api/settings/security/events
**Purpose:** Get security events history

**Query Params:** `timeRange`, `eventType`

**Response:** Array of security events

**Data Source:** Platform Core (SecurityEvent model or audit log)

---

## Integrations

### GET /api/settings/integrations
**Purpose:** List all available integrations

**Response:** Array of integrations with status

**Data Source:** Integration Service (IntegrationDefinition)

### GET /api/settings/integrations/:integrationKey
**Purpose:** Get detailed integration information

**Response:** Integration details with scope and data sharing

**Data Source:** Integration Service (IntegrationDefinition)

### POST /api/settings/integrations/:integrationKey/connect
**Purpose:** Initiate integration connection

**Request:** `{ "provider": "...", "confirm": true }`

**Response:** OAuth URL and state token

**Enforcement:**
- Integration must be available
- Provider must be supported
- Must confirm before connecting

**Data Source:** Integration Service

### POST /api/settings/integrations/:integrationKey/oauth/callback
**Purpose:** Handle OAuth callback

**Request:** `{ "code": "...", "state": "..." }`

**Response:** Success status

**Enforcement:**
- OAuth state must match
- Authorization code must be valid

**Data Source:** Integration Service

### POST /api/settings/integrations/:integrationKey/disconnect
**Purpose:** Disconnect an integration

**Request:** `{ "confirm": true }`

**Response:** Success status

**Enforcement:**
- Integration must be connected
- Must confirm before disconnecting

**Data Source:** Integration Service

---

## Common Patterns

### Authentication
All endpoints require:
- Valid JWT token
- User belongs to organization
- OrganizationId scoping

### Permission Checks
Some endpoints require:
- Admin role
- Specific permissions (manageUsers, manageSettings, etc.)

### Organization Scoping
All endpoints:
- Filter by organizationId
- Validate user belongs to organization
- Return only organization's data

### Confirmation Required
High-risk actions require:
- `confirm: true` in request body
- Backend validates confirmation
- Logged to audit trail

### Audit Logging
All changes logged to:
- Audit trail (general changes)
- Security events (security changes)
- Integration events (integration changes)

---

## Data Source Mapping

| Section | Primary Data Source | Secondary Data Source |
|---------|-------------------|---------------------|
| Landing Page | Static config | User permissions |
| Core Modules | App Registry | Organization |
| Applications | App Registry | Organization, Subscription Service |
| Subscriptions | Subscription Service | Application layer (usage) |
| Users & Access | Platform Core (User, Role) | Organization |
| Security | Platform Core (Organization) | LoginActivity, SecurityEvent |
| Integrations | Integration Service | Organization |

---

## Enforcement Summary

### UI Guardrails (Frontend)
- Lock icons for required items
- Confirmation modals for high-risk actions
- Impact warnings before changes
- Read-only indicators
- Permission-based visibility

### Backend Middleware (Backend)
- Authentication middleware
- Permission middleware
- Organization scoping middleware
- Validation middleware
- Boundary protection middleware

### Validation Rules
- Data validation (format, range, required)
- Business rule validation (can enable, can disable, etc.)
- Boundary validation (platform vs app, required vs optional)
- Permission validation (user has permission to modify)

---

## Quick Checklist

### Frontend
- [ ] All 7 sections implemented
- [ ] Confirmation modals for high-risk actions
- [ ] Permission-based visibility
- [ ] Read-only indicators
- [ ] Navigation between sections
- [ ] Loading and error states

### Backend
- [ ] All API endpoints implemented
- [ ] Authentication middleware
- [ ] Permission middleware
- [ ] Organization scoping
- [ ] Validation rules
- [ ] Audit logging
- [ ] Boundary protection

### Testing
- [ ] All endpoints tested
- [ ] Permission checks tested
- [ ] Validation rules tested
- [ ] Boundary protection tested
- [ ] Confirmation flows tested
- [ ] Error handling tested

