# Settings Implementation Blueprint

## Overview

This blueprint converts the finalized Settings UX structure (Steps 1-7) into a build-ready implementation specification. It preserves platform boundaries, prevents architectural drift, and provides clear guidance for frontend and backend engineers.

---

## Architecture Principles

### Platform Boundaries
- **Platform Core:** Owns organization, users, roles, security, integrations
- **Application Layer:** Owns app-specific settings, subscriptions, dependencies
- **Shared Capabilities:** Owned by Platform Core, used by applications

### Data Ownership
- **Platform Core:** Organization model, User model, Role model, Security settings
- **App Registry:** Application definitions, module definitions, dependencies
- **Subscription Service:** App-specific subscriptions, usage, limits
- **Integration Service:** Integration configurations, OAuth tokens

### Enforcement Points
- **UI Guardrails:** Prevent invalid actions, show warnings, require confirmations
- **Backend Middleware:** Enforce permissions, validate data, protect boundaries
- **Data Layer:** Database constraints, validation rules, referential integrity

---

## Section 1: Settings Landing Page

### Purpose
Help organization admins understand what can be configured and how the platform is structured, without exposing technical details. This is an orientation page, not an editing interface.

### Primary Screens

#### Landing Page (List View)
- **Purpose:** Show all top-level Settings sections
- **Layout:** Card-based grid (7 cards)
- **Navigation:** Click card → Navigate to section detail page
- **Read-only:** Yes (orientation only)

### Source of Truth
- **Section Definitions:** Static configuration (frontend)
- **Section Availability:** Based on user permissions (Platform Core)
- **No backend data:** This is a navigation/orientation page

### Editable vs Read-Only
- **All sections:** Read-only (cards are navigation links only)
- **No editing:** Landing page is for discovery, not configuration

### Required Backend Contracts

#### GET /api/settings/sections
**Purpose:** Return available Settings sections based on user permissions

**Response:**
```json
{
  "sections": [
    {
      "id": "organization",
      "name": "Organization",
      "description": "Manage your company information, branding, and organization-wide preferences",
      "available": true,
      "icon": "organization"
    },
    {
      "id": "people-access",
      "name": "People & Access",
      "description": "Control who can use the platform and what they're allowed to do",
      "available": true,
      "icon": "users"
    },
    // ... other sections
  ]
}
```

**Enforcement:** Backend checks user permissions (platform-level)

---

## Section 2: Core Modules

### Purpose
Help organization admins understand which capabilities are shared across multiple applications, see which applications use each shared capability, and safely control application participation where allowed.

### Primary Screens

#### Core Modules List View
- **Purpose:** Show all shared platform capabilities
- **Layout:** Card-based list (7 core modules)
- **Navigation:** Click card → Navigate to module detail view
- **Read-only:** Yes (list view is read-only)

#### Core Module Detail View
- **Purpose:** Show module details and application usage
- **Layout:** Header, Platform info box, Application usage list
- **Navigation:** Back to list view
- **Editable:** Partial (can toggle optional apps, cannot modify required apps)

### Source of Truth
- **Module Definitions:** App Registry (ModuleDefinition model with `appKey: 'platform'`)
- **Application Usage:** App Registry (ModuleDefinition.appPermissions or computed from app definitions)
- **Required vs Optional:** App Registry (app-specific configuration)

### Editable vs Read-Only

#### Read-Only
- **Module name:** Cannot be renamed
- **Module description:** Cannot be edited
- **Platform ownership:** Cannot be changed
- **Required applications:** Cannot be disabled (locked)
- **Dependencies:** Cannot be modified

#### Editable
- **Optional applications:** Can be enabled/disabled (with confirmation)
- **Toggle switches:** For optional apps only

### Required Backend Contracts

#### GET /api/settings/core-modules
**Purpose:** List all core modules with their application usage

**Response:**
```json
{
  "modules": [
    {
      "moduleKey": "people",
      "name": "People",
      "description": "Contact and lead management",
      "icon": "people",
      "applications": [
        {
          "appKey": "SALES",
          "name": "Sales",
          "required": true,
          "enabled": true,
          "usage": "Used for contact management and leads"
        },
        {
          "appKey": "AUDIT",
          "name": "Audit",
          "required": false,
          "enabled": true,
          "usage": "Used for auditor contact information"
        }
      ]
    }
  ]
}
```

**Enforcement:** Backend reads from App Registry, validates app existence

#### GET /api/settings/core-modules/:moduleKey
**Purpose:** Get detailed information about a specific core module

**Response:**
```json
{
  "moduleKey": "people",
  "name": "People",
  "description": "Contact and lead management",
  "icon": "people",
  "platformOwned": true,
  "applications": [
    {
      "appKey": "SALES",
      "name": "Sales",
      "required": true,
      "enabled": true,
      "usage": "Used for contact management and leads",
      "canToggle": false
    },
    {
      "appKey": "AUDIT",
      "name": "Audit",
      "required": false,
      "enabled": true,
      "usage": "Used for auditor contact information",
      "canToggle": true
    }
  ]
}
```

**Enforcement:** Backend validates moduleKey exists, is platform-owned

#### PATCH /api/settings/core-modules/:moduleKey/applications/:appKey
**Purpose:** Toggle optional application usage of a core module

**Request:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "moduleKey": "people",
  "appKey": "AUDIT",
  "enabled": true
}
```

**Enforcement:**
- Backend validates moduleKey is platform-owned
- Backend validates appKey exists and is enabled for organization
- Backend validates application is optional (not required)
- Backend updates App Registry (ModuleDefinition or app-specific config)
- Backend logs change to audit trail

**Validation Rules:**
- Cannot enable if app not enabled for organization
- Cannot disable if required
- Must confirm before disabling

---

## Section 3: Applications

### Purpose
Help organization admins see which applications are available and enabled, understand what each application depends on (shared platform capabilities), and access application-specific settings safely.

### Primary Screens

#### Applications List View
- **Purpose:** Show all available applications with status
- **Layout:** Card-based list (5 applications)
- **Navigation:** Click card → Navigate to application detail view
- **Read-only:** Yes (list view shows status only)

#### Application Detail View
- **Purpose:** Show application details, dependencies, and settings entry
- **Layout:** Header, Status section, About section, Dependencies section, Settings entry
- **Navigation:** Back to list view, "Open [App] Settings →" to app-specific settings
- **Editable:** Partial (can enable/disable apps, cannot modify dependencies)

### Source of Truth
- **Application Definitions:** App Registry (AppDefinition model)
- **Application Status:** Organization model (`enabledApps` array)
- **Dependencies:** App Registry (computed from ModuleDefinition.appPermissions)
- **App-Specific Settings:** Application layer (not in this section)

### Editable vs Read-Only

#### Read-Only
- **Application name:** Cannot be renamed
- **Application description:** Cannot be edited
- **Dependencies:** Cannot be modified (read-only, link to Core Modules)
- **App-specific settings:** Not editable here (link to app settings)

#### Editable
- **Application status:** Can enable/disable (with confirmation)
- **Toggle switches:** For enabling/disabling apps

### Required Backend Contracts

#### GET /api/settings/applications
**Purpose:** List all available applications with their status and dependencies

**Response:**
```json
{
  "applications": [
    {
      "appKey": "SALES",
      "name": "Sales",
      "description": "Customer relationship management and sales pipeline",
      "icon": "sales",
      "status": "enabled",
      "dependencies": [
        {
          "capabilityKey": "people",
          "capabilityName": "People",
          "usage": "Used for contact management and leads"
        }
      ]
    },
    {
      "appKey": "PROJECTS",
      "name": "Projects",
      "description": "Project management and collaboration",
      "icon": "projects",
      "status": "disabled",
      "dependencies": [
        {
          "capabilityKey": "people",
          "capabilityName": "People",
          "usage": "Used for team member management"
        }
      ]
    }
  ]
}
```

**Enforcement:** Backend reads from App Registry and Organization model

#### GET /api/settings/applications/:appKey
**Purpose:** Get detailed information about a specific application

**Response:**
```json
{
  "appKey": "SALES",
  "name": "Sales",
  "description": "Customer relationship management and sales pipeline",
  "extendedDescription": "Sales helps you manage customer relationships...",
  "icon": "sales",
  "status": "enabled",
  "dependencies": [
    {
      "capabilityKey": "people",
      "capabilityName": "People",
      "usage": "Used for contact management and leads",
      "viewInCoreModules": true
    }
  ],
  "canDisable": true,
  "canEnable": false
}
```

**Enforcement:** Backend validates appKey exists, checks organization status

#### POST /api/settings/applications/:appKey/enable
**Purpose:** Enable an application for the organization

**Response:**
```json
{
  "success": true,
  "appKey": "PROJECTS",
  "status": "enabled"
}
```

**Enforcement:**
- Backend validates appKey exists in App Registry
- Backend adds appKey to Organization.enabledApps
- Backend validates subscription allows app (if subscription-based)
- Backend logs change to audit trail

#### POST /api/settings/applications/:appKey/disable
**Purpose:** Disable an application for the organization

**Request:**
```json
{
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "appKey": "PROJECTS",
  "status": "disabled"
}
```

**Enforcement:**
- Backend validates appKey exists
- Backend validates app can be disabled (not required/included)
- Backend removes appKey from Organization.enabledApps
- Backend logs change to audit trail

**Validation Rules:**
- Cannot disable if status is "included" (part of subscription)
- Cannot disable if status is "trial" (during trial period)
- Cannot disable if required by organization configuration
- Must confirm before disabling

---

## Section 4: Subscriptions

### Purpose
Help organization admins see all active subscriptions in one place, understand plans and limits per application, and know where and how to upgrade an application when needed.

### Primary Screens

#### Subscriptions List View
- **Purpose:** Show all application subscriptions with plan, pricing, usage
- **Layout:** Card-based list (one card per app subscription)
- **Navigation:** Click card → Navigate to subscription detail view
- **Read-only:** Yes (list view shows status only)

#### Subscription Detail View
- **Purpose:** Show subscription details, usage, limits, available plans, upgrade flow
- **Layout:** Header, Current plan section, Usage & limits section, Available plans section, What's included section
- **Navigation:** Back to list view
- **Editable:** Partial (can upgrade, cannot modify usage or limits directly)

### Source of Truth
- **Subscription Data:** Subscription Service (per-application subscriptions)
- **Usage Data:** Application layer (usage metrics per app)
- **Plan Definitions:** Subscription Service (plan configurations)
- **Platform Capabilities:** App Registry (for "What's Included" section)

### Editable vs Read-Only

#### Read-Only
- **Current usage:** Cannot be edited (computed from app data)
- **Limits:** Cannot be edited (set by plan)
- **Platform capabilities:** Cannot be modified (read-only, link to Core Modules)
- **Billing information:** Cannot be edited (managed separately)

#### Editable
- **Plan selection:** Can upgrade to different plan (with confirmation)
- **Upgrade buttons:** For each available plan

### Required Backend Contracts

#### GET /api/settings/subscriptions
**Purpose:** List all application subscriptions with plan, pricing, and usage

**Response:**
```json
{
  "subscriptions": [
    {
      "appKey": "SALES",
      "appName": "Sales",
      "plan": "professional",
      "planName": "Professional",
      "price": 99,
      "billingFrequency": "monthly",
      "status": "active",
      "usage": {
        "users": { "current": 18, "limit": 25 },
        "contacts": { "current": 2450, "limit": 10000 }
      }
    },
    {
      "appKey": "HELPDESK",
      "appName": "Helpdesk",
      "plan": "trial",
      "planName": "Trial",
      "price": 0,
      "billingFrequency": null,
      "status": "trial",
      "trialDaysRemaining": 12,
      "usage": {
        "agents": { "current": 3, "limit": 5 },
        "tickets": { "current": 45, "limit": 100 }
      }
    }
  ],
  "platformCapabilities": {
    "message": "People, Organizations, Events, Tasks, Forms, Items, and Reports are shared platform capabilities. They are available to all applications at no additional cost.",
    "capabilities": ["people", "organizations", "events", "tasks", "forms", "items", "reports"]
  }
}
```

**Enforcement:** Backend reads from Subscription Service and Application layer

#### GET /api/settings/subscriptions/:appKey
**Purpose:** Get detailed subscription information for a specific application

**Response:**
```json
{
  "appKey": "HELPDESK",
  "appName": "Helpdesk",
  "currentPlan": {
    "plan": "trial",
    "planName": "Trial",
    "price": 0,
    "billingFrequency": null,
    "status": "trial",
    "trialDaysRemaining": 12
  },
  "usage": {
    "agents": { "current": 3, "limit": 5, "percentage": 60 },
    "tickets": { "current": 45, "limit": 100, "percentage": 45 },
    "storage": { "current": 2.1, "limit": 10, "percentage": 21 }
  },
  "availablePlans": [
    {
      "plan": "starter",
      "planName": "Starter",
      "price": 29,
      "billingFrequency": "monthly",
      "limits": {
        "agents": 5,
        "tickets": 100,
        "storage": 10
      },
      "features": ["5 agents", "100 tickets/month", "10 GB storage", "Email support"],
      "isCurrent": false,
      "canUpgrade": true
    },
    {
      "plan": "professional",
      "planName": "Professional",
      "price": 99,
      "billingFrequency": "monthly",
      "limits": {
        "agents": 25,
        "tickets": 1000,
        "storage": 100
      },
      "features": ["25 agents", "1,000 tickets/month", "100 GB storage", "Priority support", "Advanced reporting"],
      "isCurrent": false,
      "canUpgrade": true
    }
  ],
  "includedCapabilities": [
    {
      "capabilityKey": "people",
      "capabilityName": "People",
      "usage": "For customer contact information"
    }
  ]
}
```

**Enforcement:** Backend validates appKey, reads from Subscription Service

#### POST /api/settings/subscriptions/:appKey/upgrade
**Purpose:** Upgrade an application subscription to a different plan

**Request:**
```json
{
  "plan": "professional",
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "appKey": "HELPDESK",
  "previousPlan": "trial",
  "newPlan": "professional",
  "price": 99,
  "billingFrequency": "monthly"
}
```

**Enforcement:**
- Backend validates appKey exists
- Backend validates plan exists and is available
- Backend validates subscription can be upgraded (not included, not expired)
- Backend updates Subscription Service
- Backend updates Organization limits (if applicable)
- Backend logs change to audit trail

**Validation Rules:**
- Cannot upgrade if plan is "included" (part of subscription)
- Cannot upgrade during trial (must wait for trial end or cancel)
- Must confirm before upgrading
- Plan must be available for app

---

## Section 5: Users & Access

### Purpose
Help organization admins manage users in one place, control what each user can do per application, and understand the difference between platform-level access and application-level permissions.

### Primary Screens

#### Users List View
- **Purpose:** Show all users with roles and application access
- **Layout:** Table or card-based list
- **Navigation:** Click user → Navigate to user detail view
- **Read-only:** Yes (list view shows information only)

#### User Detail View
- **Purpose:** Show user details, application access, and permissions
- **Layout:** Header, Status section, Application access section, Permissions section
- **Navigation:** Back to list view
- **Editable:** Partial (can modify user permissions, cannot modify platform structure)

#### Roles List View
- **Purpose:** Show all roles with user counts
- **Layout:** Card-based grid
- **Navigation:** Click role → Navigate to role detail view
- **Read-only:** Yes (list view shows information only)

#### Role Detail View
- **Purpose:** Show role details and permissions
- **Layout:** Header, User count section, Permissions section
- **Navigation:** Back to list view
- **Editable:** Partial (can modify role permissions, cannot modify platform structure)

### Source of Truth
- **User Data:** Platform Core (User model)
- **Role Data:** Platform Core (Role model)
- **Permissions:** Platform Core (Role.appPermissions, User.permissions for legacy)
- **Application Access:** Platform Core (User.allowedApps, Organization.enabledApps)

### Editable vs Read-Only

#### Read-Only
- **Platform permissions:** Cannot be modified from app settings
- **Legacy permissions:** Read-only (cannot edit, migration path available)
- **Application dependencies:** Cannot be modified (read-only, link to Core Modules)

#### Editable
- **User application access:** Can enable/disable apps for user
- **Role permissions:** Can modify app-scoped permissions
- **User permissions:** Can modify (inherits from role, can override)

### Required Backend Contracts

#### GET /api/settings/users
**Purpose:** List all users with roles and application access

**Response:**
```json
{
  "users": [
    {
      "userId": "user123",
      "name": "John Smith",
      "email": "john.smith@company.com",
      "roleId": "role456",
      "roleName": "Sales Manager",
      "status": "active",
      "applicationAccess": ["SALES", "HELPDESK"],
      "lastLogin": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Enforcement:** Backend reads from User model, filters by organizationId

#### GET /api/settings/users/:userId
**Purpose:** Get detailed user information including permissions

**Response:**
```json
{
  "userId": "user123",
  "name": "John Smith",
  "email": "john.smith@company.com",
  "roleId": "role456",
  "roleName": "Sales Manager",
  "status": "active",
  "applicationAccess": [
    {
      "appKey": "SALES",
      "appName": "Sales",
      "enabled": true,
      "canToggle": true
    },
    {
      "appKey": "HELPDESK",
      "appName": "Helpdesk",
      "enabled": true,
      "canToggle": true
    }
  ],
  "platformPermissions": {
    "inviteUsers": false,
    "manageSettings": false,
    "viewBilling": false,
    "manageIntegrations": false
  },
  "appPermissions": {
    "SALES": {
      "contacts": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false,
        "viewAll": true,
        "exportData": false
      },
      "deals": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false,
        "viewAll": true,
        "exportData": false
      }
    },
    "HELPDESK": {
      "tickets": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false,
        "assign": true,
        "close": false
      }
    }
  },
  "legacyPermissions": {
    "present": false,
    "readOnly": true
  }
}
```

**Enforcement:** Backend reads from User model, Role model, validates organizationId

#### PUT /api/settings/users/:userId
**Purpose:** Update user application access or permissions

**Request:**
```json
{
  "applicationAccess": ["SALES", "HELPDESK", "PROJECTS"],
  "appPermissions": {
    "SALES": {
      "contacts": {
        "exportData": true
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user123",
  "applicationAccess": ["SALES", "HELPDESK", "PROJECTS"]
}
```

**Enforcement:**
- Backend validates userId exists and belongs to organization
- Backend validates applicationAccess apps exist and are enabled for organization
- Backend validates appPermissions are valid for each app
- Backend updates User model
- Backend logs change to audit trail

**Validation Rules:**
- Cannot assign access to apps not enabled for organization
- Cannot modify platform permissions from user settings
- Cannot edit legacy permissions (read-only)
- Must have permission to manage users

#### GET /api/settings/roles
**Purpose:** List all roles with user counts

**Response:**
```json
{
  "roles": [
    {
      "roleId": "role456",
      "name": "Sales Manager",
      "description": "For users who manage sales activities",
      "userCount": 5,
      "isSystemRole": false
    }
  ]
}
```

**Enforcement:** Backend reads from Role model, counts users per role

#### GET /api/settings/roles/:roleId
**Purpose:** Get detailed role information including permissions

**Response:**
```json
{
  "roleId": "role456",
  "name": "Sales Manager",
  "description": "For users who manage sales activities",
  "userCount": 5,
  "platformPermissions": {
    "inviteUsers": false,
    "manageSettings": false,
    "viewBilling": false,
    "manageIntegrations": false
  },
  "appPermissions": {
    "SALES": {
      "contacts": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false,
        "viewAll": true,
        "exportData": false
      },
      "deals": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false,
        "viewAll": true,
        "exportData": false
      }
    }
  },
  "applicationAccess": ["SALES"],
  "legacyPermissions": {
    "present": false,
    "readOnly": true
  }
}
```

**Enforcement:** Backend reads from Role model, validates roleId

#### PUT /api/settings/roles/:roleId
**Purpose:** Update role permissions

**Request:**
```json
{
  "appPermissions": {
    "SALES": {
      "contacts": {
        "exportData": true
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "roleId": "role456",
  "appPermissions": {
    "SALES": {
      "contacts": {
        "exportData": true
      }
    }
  }
}
```

**Enforcement:**
- Backend validates roleId exists and belongs to organization
- Backend validates appPermissions are valid for each app
- Backend validates applicationAccess apps exist and are enabled
- Backend updates Role model
- Backend syncs permissions to users with this role (if applicable)
- Backend logs change to audit trail

**Validation Rules:**
- Cannot modify platform permissions from role settings
- Cannot assign permissions for apps not enabled for organization
- Cannot edit legacy permissions (read-only)
- Must have permission to manage roles

---

## Section 6: Security

### Purpose
Help organization admins configure high-level security policies, monitor important security-related activity, and feel confident about platform protection without needing technical expertise.

### Primary Screens

#### Security Overview Page
- **Purpose:** Show security status, controls, and recent activity
- **Layout:** Status card, Control cards, Activity cards
- **Navigation:** Click control card → Navigate to configuration page
- **Read-only:** Partial (overview is read-only, controls are editable)

#### Password Rules Configuration
- **Purpose:** Configure password requirements
- **Layout:** Form with password rule options
- **Navigation:** Back to overview
- **Editable:** Yes (can modify password rules)

#### Session Controls Configuration
- **Purpose:** Configure session duration and timeout
- **Layout:** Form with session options
- **Navigation:** Back to overview
- **Editable:** Yes (can modify session settings)

#### Two-Factor Authentication Configuration
- **Purpose:** Configure two-factor authentication requirements
- **Layout:** Form with 2FA options
- **Navigation:** Back to overview
- **Editable:** Yes (can enable/disable 2FA)

#### Login Activity View
- **Purpose:** Show login history
- **Layout:** List of login events with filters
- **Navigation:** Back to overview
- **Read-only:** Yes (activity is read-only)

#### Security Events View
- **Purpose:** Show security-related events
- **Layout:** List of security events with filters
- **Navigation:** Back to overview
- **Read-only:** Yes (events are read-only)

### Source of Truth
- **Security Settings:** Platform Core (Organization model security settings)
- **Login Activity:** Platform Core (LoginActivity model or audit log)
- **Security Events:** Platform Core (SecurityEvent model or audit log)

### Editable vs Read-Only

#### Read-Only
- **Login activity:** Cannot be edited (historical record)
- **Security events:** Cannot be edited (audit trail)
- **Security status:** Cannot be edited (computed from settings)

#### Editable
- **Password rules:** Can modify (with confirmation)
- **Session controls:** Can modify (with confirmation)
- **Two-factor authentication:** Can enable/disable (with confirmation)

### Required Backend Contracts

#### GET /api/settings/security
**Purpose:** Get security settings and status

**Response:**
```json
{
  "status": "all_good",
  "statusMessage": "Your organization's security is up to date",
  "passwordRules": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": false,
    "expirationEnabled": false,
    "expirationDays": null,
    "preventReuse": true,
    "reuseHistoryCount": 5
  },
  "sessionControls": {
    "duration": "7_days",
    "inactiveTimeoutEnabled": true,
    "inactiveTimeoutMinutes": 120
  },
  "twoFactorAuth": {
    "required": false,
    "requiredForAdmins": false
  },
  "recentActivity": {
    "loginActivity": {
      "last7Days": {
        "successful": 45,
        "failed": 2
      }
    },
    "securityEvents": {
      "last7Days": 3,
      "recent": [
        {
          "type": "password_changed",
          "user": "John Smith",
          "timestamp": "2025-01-15T10:30:00Z"
        }
      ]
    }
  }
}
```

**Enforcement:** Backend reads from Organization model security settings

#### PUT /api/settings/security/password-rules
**Purpose:** Update password rules

**Request:**
```json
{
  "minLength": 12,
  "requireUppercase": true,
  "requireLowercase": true,
  "requireNumbers": true,
  "requireSpecialChars": false,
  "expirationEnabled": false,
  "preventReuse": true,
  "reuseHistoryCount": 5
}
```

**Response:**
```json
{
  "success": true,
  "passwordRules": {
    "minLength": 12,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": false,
    "expirationEnabled": false,
    "preventReuse": true,
    "reuseHistoryCount": 5
  }
}
```

**Enforcement:**
- Backend validates password rules are reasonable (min 8 characters)
- Backend updates Organization model security settings
- Backend logs change to security events
- Backend may require users to update passwords if rules changed

**Validation Rules:**
- Minimum length must be at least 8 characters
- Must confirm before changing (if high-risk change)
- Changes logged to security events

#### PUT /api/settings/security/session-controls
**Purpose:** Update session controls

**Request:**
```json
{
  "duration": "7_days",
  "inactiveTimeoutEnabled": true,
  "inactiveTimeoutMinutes": 120
}
```

**Response:**
```json
{
  "success": true,
  "sessionControls": {
    "duration": "7_days",
    "inactiveTimeoutEnabled": true,
    "inactiveTimeoutMinutes": 120
  }
}
```

**Enforcement:**
- Backend validates session duration is within allowed range
- Backend validates inactive timeout is reasonable
- Backend updates Organization model security settings
- Backend logs change to security events

**Validation Rules:**
- Session duration must be valid option
- Inactive timeout must be reasonable (30 minutes to 8 hours)
- Changes logged to security events

#### PUT /api/settings/security/two-factor-auth
**Purpose:** Update two-factor authentication requirements

**Request:**
```json
{
  "required": false,
  "requiredForAdmins": true
}
```

**Response:**
```json
{
  "success": true,
  "twoFactorAuth": {
    "required": false,
    "requiredForAdmins": true
  }
}
```

**Enforcement:**
- Backend validates two-factor settings
- Backend updates Organization model security settings
- Backend logs change to security events
- Backend may require users to set up 2FA if now required

**Validation Rules:**
- Must confirm before requiring 2FA for all users
- Changes logged to security events

#### GET /api/settings/security/login-activity
**Purpose:** Get login activity history

**Query Parameters:**
- `timeRange`: "7_days" | "30_days" | "all_time"
- `userId`: Optional user filter
- `status`: "all" | "successful" | "failed"

**Response:**
```json
{
  "loginActivity": [
    {
      "userId": "user123",
      "userName": "John Smith",
      "userEmail": "john.smith@company.com",
      "status": "successful",
      "location": "New York, US",
      "timestamp": "2025-01-15T10:30:00Z"
    },
    {
      "userId": "user456",
      "userName": "Sarah Johnson",
      "userEmail": "sarah@company.com",
      "status": "failed",
      "location": "Unknown",
      "timestamp": "2025-01-15T05:00:00Z"
    }
  ],
  "total": 47,
  "page": 1,
  "perPage": 20
}
```

**Enforcement:** Backend reads from LoginActivity model or audit log, filters by organizationId

#### GET /api/settings/security/events
**Purpose:** Get security events history

**Query Parameters:**
- `timeRange`: "7_days" | "30_days" | "all_time"
- `eventType`: Optional event type filter

**Response:**
```json
{
  "securityEvents": [
    {
      "eventId": "event123",
      "type": "password_changed",
      "description": "John Smith changed their password",
      "userId": "user123",
      "userName": "John Smith",
      "location": "New York, US",
      "timestamp": "2025-01-15T10:30:00Z"
    },
    {
      "eventId": "event456",
      "type": "user_suspended",
      "description": "Sarah Johnson was suspended by Platform Admin",
      "userId": "user456",
      "userName": "Sarah Johnson",
      "adminUserId": "admin123",
      "adminUserName": "Platform Admin",
      "reason": "Suspicious activity",
      "timestamp": "2025-01-14T08:00:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "perPage": 20
}
```

**Enforcement:** Backend reads from SecurityEvent model or audit log, filters by organizationId

---

## Section 7: Integrations

### Purpose
Help organization admins discover available integrations, understand what each integration connects to, and enable or disable integrations with confidence.

### Primary Screens

#### Integrations Catalog View
- **Purpose:** Show all available integrations
- **Layout:** Card-based list
- **Navigation:** Click card → Navigate to integration detail view
- **Read-only:** Yes (catalog is read-only)

#### Integration Detail View
- **Purpose:** Show integration details, scope, data sharing, and connection flow
- **Layout:** Header, Status section, What it does section, Scope section, Data sharing section, Connect section
- **Navigation:** Back to catalog, "Connect →" to setup flow
- **Editable:** Partial (can connect/disconnect, cannot modify integration definition)

### Source of Truth
- **Integration Definitions:** Integration Service (IntegrationDefinition model)
- **Integration Status:** Integration Service (IntegrationConfiguration model per organization)
- **OAuth Tokens:** Integration Service (encrypted storage)

### Editable vs Read-Only

#### Read-Only
- **Integration definition:** Cannot be modified (owned by platform)
- **Integration description:** Cannot be edited
- **Data sharing information:** Cannot be modified (defined by integration)
- **Scope:** Cannot be modified (defined by integration)

#### Editable
- **Integration status:** Can connect/disconnect (with confirmation)
- **Integration configuration:** Can configure (after connecting)

### Required Backend Contracts

#### GET /api/settings/integrations
**Purpose:** List all available integrations with their status

**Response:**
```json
{
  "integrations": [
    {
      "integrationKey": "email_provider",
      "name": "Email Provider",
      "description": "Send emails directly from the platform",
      "icon": "email",
      "scope": "platform",
      "status": "enabled",
      "provider": "aws_ses"
    },
    {
      "integrationKey": "calendar_sync",
      "name": "Calendar Sync",
      "description": "Sync events with Google Calendar or Outlook",
      "icon": "calendar",
      "scope": ["SALES", "HELPDESK", "PROJECTS"],
      "status": "not_connected"
    },
    {
      "integrationKey": "slack",
      "name": "Slack",
      "description": "Get notifications in your Slack workspace",
      "icon": "slack",
      "scope": "platform",
      "status": "not_connected"
    }
  ]
}
```

**Enforcement:** Backend reads from Integration Service, checks organization configuration

#### GET /api/settings/integrations/:integrationKey
**Purpose:** Get detailed integration information

**Response:**
```json
{
  "integrationKey": "calendar_sync",
  "name": "Calendar Sync",
  "description": "Sync events with Google Calendar or Outlook",
  "extendedDescription": "Calendar Sync automatically syncs events...",
  "icon": "calendar",
  "scope": {
    "type": "app_specific",
    "apps": ["SALES", "HELPDESK", "PROJECTS"],
    "appDetails": [
      {
        "appKey": "SALES",
        "appName": "Sales",
        "usage": "Syncs deal meetings and customer events"
      }
    ]
  },
  "status": "not_connected",
  "dataShared": [
    "Event titles and descriptions",
    "Event dates and times",
    "Event locations (if provided)"
  ],
  "dataNotShared": [
    "Contact information beyond names",
    "Deal amounts or financial data",
    "Internal notes or comments"
  ],
  "whyShared": "This data is needed to create and update calendar events in your Google Calendar or Outlook account. Without this information, we cannot sync your events.",
  "providers": ["google_calendar", "outlook"],
  "canConnect": true,
  "canDisconnect": false
}
```

**Enforcement:** Backend reads from Integration Service, validates integrationKey

#### POST /api/settings/integrations/:integrationKey/connect
**Purpose:** Initiate connection flow for an integration

**Request:**
```json
{
  "provider": "google_calendar",
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "integrationKey": "calendar_sync",
  "provider": "google_calendar",
  "oauthUrl": "https://accounts.google.com/oauth/authorize?...",
  "state": "oauth_state_token"
}
```

**Enforcement:**
- Backend validates integrationKey exists
- Backend validates provider is supported for integration
- Backend generates OAuth state token
- Backend creates IntegrationConfiguration record (pending status)
- Backend logs connection attempt to audit trail

**Validation Rules:**
- Integration must be available
- Provider must be supported
- Must confirm before connecting
- OAuth flow initiated

#### POST /api/settings/integrations/:integrationKey/oauth/callback
**Purpose:** Handle OAuth callback and complete connection

**Request:**
```json
{
  "code": "oauth_authorization_code",
  "state": "oauth_state_token"
}
```

**Response:**
```json
{
  "success": true,
  "integrationKey": "calendar_sync",
  "status": "enabled",
  "provider": "google_calendar"
}
```

**Enforcement:**
- Backend validates OAuth state token
- Backend exchanges authorization code for access token
- Backend stores access token (encrypted)
- Backend updates IntegrationConfiguration status to "enabled"
- Backend logs connection completion to audit trail

**Validation Rules:**
- OAuth state must match
- Authorization code must be valid
- Access token must be obtained successfully

#### POST /api/settings/integrations/:integrationKey/disconnect
**Purpose:** Disconnect an integration

**Request:**
```json
{
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "integrationKey": "calendar_sync",
  "status": "disconnected"
}
```

**Enforcement:**
- Backend validates integrationKey exists and is connected
- Backend revokes OAuth tokens (if applicable)
- Backend updates IntegrationConfiguration status to "disconnected"
- Backend logs disconnection to audit trail

**Validation Rules:**
- Integration must be connected
- Must confirm before disconnecting
- Disconnection logged to audit trail

---

## Enforcement Points Summary

### UI Guardrails (Frontend)

#### Core Modules
- **Lock icons:** Show for required applications (no toggle)
- **Confirmation modals:** Before disabling optional apps
- **Impact warnings:** Explain consequences of disabling
- **Read-only indicators:** For platform ownership, dependencies

#### Applications
- **Status badges:** Show enabled/disabled/trial/included
- **Confirmation modals:** Before enabling/disabling apps
- **Dependency links:** Read-only links to Core Modules
- **Settings entry:** Link to app-specific settings (separate section)

#### Subscriptions
- **Usage progress bars:** Visual indicators with color coding
- **Upgrade modals:** Show exact changes and pricing
- **Platform capabilities card:** Clearly marked as free
- **Read-only indicators:** For included apps, usage data

#### Users & Access
- **App scoping:** Only show permissions for apps user has access to
- **Platform separation:** Clear visual separation of platform vs app permissions
- **Legacy warnings:** Collapsed by default, read-only, migration path
- **Confirmation modals:** Before saving permission changes

#### Security
- **Confirmation modals:** Before changing password rules, session controls, 2FA
- **Impact explanations:** What will happen if changed
- **Status indicators:** All good, attention needed, action required
- **Read-only activity:** Login activity and security events are read-only

#### Integrations
- **Data sharing transparency:** Clear lists of what is/isn't shared
- **Confirmation modals:** Before connecting/disconnecting
- **Scope badges:** Platform-wide vs app-specific clearly indicated
- **OAuth flow:** Handled securely with state tokens

### Backend Middleware (Backend)

#### Authentication & Authorization
- **protect middleware:** All Settings endpoints require authentication
- **requireAdmin middleware:** Some endpoints require admin role
- **organizationMiddleware:** All endpoints scoped to organizationId

#### Validation
- **App Registry validation:** Validate appKey/moduleKey exists
- **Organization validation:** Validate organizationId matches user
- **Permission validation:** Validate user has permission to modify settings
- **Subscription validation:** Validate subscription allows actions

#### Boundary Protection
- **Platform Core protection:** Cannot modify platform capabilities from app settings
- **App scoping:** Cannot assign permissions for apps not enabled
- **Legacy protection:** Legacy permissions are read-only
- **Integration scoping:** Cannot connect integrations for apps not enabled

#### Audit Logging
- **All changes logged:** Settings changes logged to audit trail
- **Security events:** Security changes logged to security events
- **Integration events:** Integration connections/disconnections logged

---

## Data Flow Patterns

### Pattern 1: Reading Settings
```
Frontend → GET /api/settings/[section]
    │
    ├─→ Backend Middleware
    │   ├─→ Authentication check
    │   ├─→ Organization scoping
    │   └─→ Permission check
    │
    ├─→ Data Source
    │   ├─→ Platform Core (Users, Roles, Security)
    │   ├─→ App Registry (Apps, Modules)
    │   ├─→ Subscription Service (Subscriptions)
    │   └─→ Integration Service (Integrations)
    │
    └─→ Response (filtered by organization, permissions)
```

### Pattern 2: Updating Settings
```
Frontend → PUT/PATCH /api/settings/[section]/[id]
    │
    ├─→ Backend Middleware
    │   ├─→ Authentication check
    │   ├─→ Organization scoping
    │   ├─→ Permission check
    │   └─→ Validation
    │
    ├─→ Validation Rules
    │   ├─→ Data validation
    │   ├─→ Boundary checks
    │   └─→ Business rules
    │
    ├─→ Update Data Source
    │   ├─→ Platform Core
    │   ├─→ App Registry
    │   ├─→ Subscription Service
    │   └─→ Integration Service
    │
    ├─→ Audit Logging
    │   └─→ Log change to audit trail
    │
    └─→ Response (success/failure)
```

### Pattern 3: High-Risk Actions
```
Frontend → POST /api/settings/[section]/[action]
    │
    ├─→ Confirmation Check
    │   └─→ Request must include confirm: true
    │
    ├─→ Backend Middleware
    │   ├─→ Authentication check
    │   ├─→ Organization scoping
    │   ├─→ Permission check
    │   └─→ Validation
    │
    ├─→ Impact Assessment
    │   └─→ Check what will be affected
    │
    ├─→ Execute Action
    │   └─→ Update data source
    │
    ├─→ Audit Logging
    │   └─→ Log action to audit trail
    │
    └─→ Response (success/failure)
```

---

## Backward Compatibility

### Legacy Permissions
- **Visibility:** Legacy permissions visible but collapsed by default
- **Read-only:** Cannot edit legacy permissions
- **Migration path:** Link to migrate to app-scoped permissions
- **Display:** Clearly marked as legacy, discouraged

### Legacy App Structure
- **CRM app:** Treated as Sales app for display purposes
- **Legacy modules:** Mapped to platform capabilities where applicable
- **Backward compatibility:** Existing data structures supported

### Data Migration
- **No breaking changes:** All existing data structures preserved
- **Gradual migration:** Can migrate to new structure over time
- **Dual support:** Both old and new structures supported during transition

---

## API Endpoint Summary

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

## Implementation Checklist

### Frontend Implementation
- [ ] Settings landing page component
- [ ] Core Modules list and detail components
- [ ] Applications list and detail components
- [ ] Subscriptions list and detail components
- [ ] Users & Access list and detail components
- [ ] Roles list and detail components
- [ ] Security overview and configuration components
- [ ] Integrations catalog and detail components
- [ ] Confirmation modals for high-risk actions
- [ ] Navigation between sections
- [ ] Permission-based visibility
- [ ] Loading and error states

### Backend Implementation
- [ ] Settings sections endpoint
- [ ] Core Modules endpoints
- [ ] Applications endpoints
- [ ] Subscriptions endpoints
- [ ] Users & Access endpoints
- [ ] Security endpoints
- [ ] Integrations endpoints
- [ ] Authentication middleware
- [ ] Permission middleware
- [ ] Organization scoping middleware
- [ ] Validation rules
- [ ] Audit logging
- [ ] Boundary protection

### Data Models
- [ ] Verify Organization model has security settings
- [ ] Verify User model has app access
- [ ] Verify Role model has app permissions
- [ ] Verify App Registry has module definitions
- [ ] Verify Subscription Service has app subscriptions
- [ ] Verify Integration Service has integration configs
- [ ] Create LoginActivity model (if needed)
- [ ] Create SecurityEvent model (if needed)

---

## Success Criteria Validation

### ✅ Frontend engineer can build screens without guessing intent
- **Evidence:** Clear screen definitions, component structure, data contracts
- **Mechanism:** Detailed screen specifications + API contracts + data models

### ✅ Backend engineer knows which APIs must exist or be extended
- **Evidence:** Complete API endpoint list, request/response formats, validation rules
- **Mechanism:** API contracts + enforcement points + validation rules

### ✅ Product decisions are locked and not open to reinterpretation
- **Evidence:** Clear purpose statements, explicit constraints, boundary definitions
- **Mechanism:** Purpose statements + constraints + boundary protection + enforcement points

---

## Conclusion

This blueprint provides a complete implementation specification that:

1. **Preserves platform boundaries** - Core vs App separation clearly defined
2. **Prevents architectural drift** - Explicit data ownership and enforcement points
3. **Maintains backward compatibility** - Legacy support clearly defined
4. **Enables parallel development** - Frontend and backend can work independently
5. **Locks product decisions** - No ambiguity about what to build

All seven Settings sections are fully specified with purpose, screens, data sources, controls, and APIs. The blueprint is ready for implementation.

