# Settings API Contracts & Data Models

## Overview

This document defines explicit data contracts and API structures required to implement the Settings UI. All contracts are registry-driven, platform-safe, and enforce Core vs App boundaries server-side.

---

## Contract Principles

### 1. Registry-Driven
- All data comes from registries (App Registry, Module Registry, etc.)
- No hardcoded rules in UI
- Metadata defines behavior

### 2. Read-Only by Default
- Most endpoints are read-only
- Mutations require explicit confirmation
- Changes logged to audit trail

### 3. Explicit Ownership
- Each contract clearly owned by Platform Core, App, or Subscription Service
- No cross-boundary modifications
- Clear data source for each field

### 4. Backward Compatible
- Legacy fields supported but marked deprecated
- Migration paths available
- No breaking changes

---

## Section 1: Settings Landing Page

### GET /api/settings/sections

**Ownership:** Platform Core

**Purpose:** Return available Settings sections based on user permissions

**Permission Required:** None (all authenticated users)

**Request:** None

**Response:**
```json
{
  "sections": [
    {
      "id": "organization",
      "name": "Organization",
      "description": "Manage your company information, branding, and organization-wide preferences",
      "icon": "organization",
      "available": true,
      "order": 1
    },
    {
      "id": "people-access",
      "name": "People & Access",
      "description": "Control who can use the platform and what they're allowed to do",
      "icon": "users",
      "available": true,
      "order": 2
    },
    {
      "id": "applications",
      "name": "Applications",
      "description": "Install and configure the business applications your organization uses",
      "icon": "apps",
      "available": true,
      "order": 3
    },
    {
      "id": "billing-subscription",
      "name": "Billing & Subscription",
      "description": "Manage your subscription plan, payment method, and usage limits",
      "icon": "billing",
      "available": true,
      "order": 4
    },
    {
      "id": "security",
      "name": "Security",
      "description": "Configure authentication, password policies, and security settings",
      "icon": "security",
      "available": true,
      "order": 5
    },
    {
      "id": "notifications",
      "name": "Notifications",
      "description": "Set up how your team receives alerts and updates across all applications",
      "icon": "notifications",
      "available": true,
      "order": 6
    },
    {
      "id": "integrations",
      "name": "Integrations",
      "description": "Connect external services and tools to extend platform capabilities",
      "icon": "integrations",
      "available": true,
      "order": 7
    }
  ]
}
```

**Data Source:** Static configuration + User permissions (Platform Core)

**Enforcement:** Backend filters sections based on user permissions

---

## Section 2: Core Modules

### GET /api/settings/core-modules

**Ownership:** App Registry (read), Platform Core (app usage toggles)

**Purpose:** List all core modules with their application usage

**Permission Required:** None (read-only)

**Request:** None

**Response:**
```json
{
  "modules": [
    {
      "moduleKey": "people",
      "name": "People",
      "description": "Contact and lead management",
      "icon": "people",
      "platformOwned": true,
      "applications": [
        {
          "appKey": "SALES",
          "appName": "Sales",
          "required": true,
          "enabled": true,
          "usage": "Used for contact management and leads",
          "canToggle": false
        },
        {
          "appKey": "AUDIT",
          "appName": "Audit",
          "required": false,
          "enabled": true,
          "usage": "Used for auditor contact information",
          "canToggle": true
        },
        {
          "appKey": "PORTAL",
          "appName": "Portal",
          "required": false,
          "enabled": false,
          "usage": "Used for customer profile management",
          "canToggle": true
        }
      ]
    }
  ]
}
```

**Data Source:** 
- Module definitions: App Registry (ModuleDefinition with `appKey: 'platform'`)
- Application usage: App Registry (computed from app definitions)
- Enabled state: Organization model or App Registry config

**Enforcement:** 
- Backend reads from App Registry
- Backend validates moduleKey is platform-owned
- Backend computes application usage from registry

---

### GET /api/settings/core-modules/:moduleKey

**Ownership:** App Registry (read), Platform Core (app usage toggles)

**Purpose:** Get detailed information about a specific core module

**Permission Required:** None (read-only)

**Request:** Path parameter: `moduleKey` (string)

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
      "appName": "Sales",
      "required": true,
      "enabled": true,
      "usage": "Used for contact management and leads",
      "canToggle": false,
      "reason": "This application requires People capability"
    },
    {
      "appKey": "AUDIT",
      "appName": "Audit",
      "required": false,
      "enabled": true,
      "usage": "Used for auditor contact information",
      "canToggle": true,
      "reason": null
    },
    {
      "appKey": "PROJECTS",
      "appName": "Projects",
      "required": false,
      "enabled": false,
      "usage": null,
      "canToggle": false,
      "reason": "This application does not use People"
    }
  ]
}
```

**Data Source:** 
- Module definition: App Registry
- Application usage: App Registry + Organization config
- Required flags: App Registry (app-specific configuration)

**Enforcement:**
- Backend validates moduleKey exists and is platform-owned
- Backend computes application usage from registry
- Backend determines required vs optional from registry

---

### PATCH /api/settings/core-modules/:moduleKey/applications/:appKey

**Ownership:** Platform Core (writes to App Registry config)

**Purpose:** Toggle optional application usage of a core module

**Permission Required:** `manageSettings` (platform-level)

**Request:**
```json
{
  "enabled": true,
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "moduleKey": "people",
  "appKey": "AUDIT",
  "enabled": true,
  "message": "People capability enabled for Audit"
}
```

**Data Source:** 
- Read: App Registry (ModuleDefinition, AppDefinition)
- Write: App Registry (app-specific module usage config) or Organization model

**Enforcement:**
- Backend validates moduleKey is platform-owned
- Backend validates appKey exists and is enabled for organization
- Backend validates application is optional (not required)
- Backend validates `confirm: true` is present
- Backend updates App Registry config or Organization model
- Backend logs change to audit trail

**Validation Rules:**
- `moduleKey` must exist in App Registry with `appKey: 'platform'`
- `appKey` must exist in App Registry
- `appKey` must be in Organization.enabledApps
- Application must not be required (registry flag)
- `confirm: true` must be present
- `enabled` must be boolean

**Error Responses:**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Cannot disable required application",
  "field": "enabled"
}
```

```json
{
  "success": false,
  "error": "permission_denied",
  "message": "You do not have permission to manage core modules"
}
```

---

## Section 3: Applications

### GET /api/settings/applications

**Ownership:** App Registry (read), Organization (status)

**Purpose:** List all available applications with their status and dependencies

**Permission Required:** None (read-only)

**Request:** None

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
      "statusReason": null,
      "dependencies": [
        {
          "capabilityKey": "people",
          "capabilityName": "People",
          "usage": "Used for contact management and leads",
          "required": true,
          "viewInCoreModules": true
        },
        {
          "capabilityKey": "organizations",
          "capabilityName": "Organizations",
          "usage": "Used for company and account management",
          "required": true,
          "viewInCoreModules": true
        }
      ],
      "canDisable": true,
      "canEnable": false
    },
    {
      "appKey": "PROJECTS",
      "name": "Projects",
      "description": "Project management and collaboration",
      "icon": "projects",
      "status": "disabled",
      "statusReason": null,
      "dependencies": [
        {
          "capabilityKey": "people",
          "capabilityName": "People",
          "usage": "Used for team member management",
          "required": true,
          "viewInCoreModules": true
        }
      ],
      "canDisable": false,
      "canEnable": true
    }
  ]
}
```

**Data Source:**
- Application definitions: App Registry (AppDefinition)
- Status: Organization.enabledApps array
- Dependencies: App Registry (computed from ModuleDefinition.appPermissions)
- Can enable/disable: Subscription Service + App Registry

**Enforcement:**
- Backend reads from App Registry
- Backend checks Organization.enabledApps for status
- Backend computes dependencies from registry
- Backend determines canEnable/canDisable from subscription + registry

---

### GET /api/settings/applications/:appKey

**Ownership:** App Registry (read), Organization (status)

**Purpose:** Get detailed information about a specific application

**Permission Required:** None (read-only)

**Request:** Path parameter: `appKey` (string)

**Response:**
```json
{
  "appKey": "SALES",
  "name": "Sales",
  "description": "Customer relationship management and sales pipeline",
  "extendedDescription": "Sales helps you manage customer relationships, track deals through your sales pipeline, and close more business. It includes features for contact management, deal tracking, pipeline management, and sales reporting.",
  "icon": "sales",
  "status": "enabled",
  "statusReason": null,
  "dependencies": [
    {
      "capabilityKey": "people",
      "capabilityName": "People",
      "usage": "Used for contact management and leads",
      "required": true,
      "viewInCoreModules": true
    }
  ],
  "canDisable": true,
  "canEnable": false,
  "settingsEntryPoint": {
    "available": true,
    "path": "/settings/apps/sales"
  }
}
```

**Data Source:**
- Application definition: App Registry
- Status: Organization.enabledApps
- Dependencies: App Registry
- Settings entry point: App Registry (app-specific config)

**Enforcement:**
- Backend validates appKey exists in App Registry
- Backend checks Organization.enabledApps for status
- Backend computes dependencies from registry

---

### POST /api/settings/applications/:appKey/enable

**Ownership:** Organization (writes to enabledApps)

**Purpose:** Enable an application for the organization

**Permission Required:** `manageSettings` (platform-level)

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
  "status": "enabled",
  "message": "Projects has been enabled"
}
```

**Data Source:**
- Read: App Registry (AppDefinition), Subscription Service
- Write: Organization.enabledApps array

**Enforcement:**
- Backend validates appKey exists in App Registry
- Backend validates appKey not already in enabledApps
- Backend validates subscription allows app (if subscription-based)
- Backend validates `confirm: true` is present
- Backend adds appKey to Organization.enabledApps
- Backend logs change to audit trail

**Validation Rules:**
- `appKey` must exist in App Registry
- `appKey` must not be in Organization.enabledApps
- Subscription must allow app (if subscription-based)
- `confirm: true` must be present

---

### POST /api/settings/applications/:appKey/disable

**Ownership:** Organization (writes to enabledApps)

**Purpose:** Disable an application for the organization

**Permission Required:** `manageSettings` (platform-level)

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
  "status": "disabled",
  "message": "Projects has been disabled"
}
```

**Data Source:**
- Read: App Registry, Subscription Service, Organization
- Write: Organization.enabledApps array

**Enforcement:**
- Backend validates appKey exists
- Backend validates appKey is in enabledApps
- Backend validates app can be disabled (not included, not required)
- Backend validates `confirm: true` is present
- Backend removes appKey from Organization.enabledApps
- Backend logs change to audit trail

**Validation Rules:**
- `appKey` must exist
- `appKey` must be in Organization.enabledApps
- App must not be included in subscription
- App must not be required by organization config
- `confirm: true` must be present

**Error Responses:**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Cannot disable application included in subscription",
  "reason": "included"
}
```

---

## Section 4: Subscriptions

### GET /api/settings/subscriptions

**Ownership:** Subscription Service (read), Application layer (usage)

**Purpose:** List all application subscriptions with plan, pricing, and usage

**Permission Required:** `viewBilling` (platform-level)

**Request:** None

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
        "users": {
          "current": 18,
          "limit": 25,
          "percentage": 72,
          "status": "good"
        },
        "contacts": {
          "current": 2450,
          "limit": 10000,
          "percentage": 24,
          "status": "good"
        }
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
        "agents": {
          "current": 3,
          "limit": 5,
          "percentage": 60,
          "status": "good"
        },
        "tickets": {
          "current": 45,
          "limit": 100,
          "percentage": 45,
          "status": "good"
        }
      }
    }
  ],
  "platformCapabilities": {
    "message": "People, Organizations, Events, Tasks, Forms, Items, and Reports are shared platform capabilities. They are available to all applications at no additional cost.",
    "capabilities": [
      {
        "capabilityKey": "people",
        "capabilityName": "People",
        "viewInCoreModules": true
      }
    ]
  }
}
```

**Data Source:**
- Subscription data: Subscription Service (AppSubscription model)
- Usage data: Application layer (usage metrics per app)
- Platform capabilities: App Registry (platform modules)

**Enforcement:**
- Backend reads from Subscription Service
- Backend reads usage from Application layer
- Backend reads platform capabilities from App Registry
- Backend validates user has viewBilling permission

---

### GET /api/settings/subscriptions/:appKey

**Ownership:** Subscription Service (read), Application layer (usage)

**Purpose:** Get detailed subscription information for a specific application

**Permission Required:** `viewBilling` (platform-level)

**Request:** Path parameter: `appKey` (string)

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
    "trialDaysRemaining": 12,
    "nextBillingDate": null
  },
  "usage": {
    "agents": {
      "current": 3,
      "limit": 5,
      "percentage": 60,
      "status": "good"
    },
    "tickets": {
      "current": 45,
      "limit": 100,
      "percentage": 45,
      "status": "good",
      "period": "monthly"
    },
    "storage": {
      "current": 2.1,
      "limit": 10,
      "percentage": 21,
      "status": "good",
      "unit": "GB"
    }
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
      "features": [
        "5 agents",
        "100 tickets/month",
        "10 GB storage",
        "Email support"
      ],
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
      "features": [
        "25 agents",
        "1,000 tickets/month",
        "100 GB storage",
        "Priority support",
        "Advanced reporting"
      ],
      "isCurrent": false,
      "canUpgrade": true
    }
  ],
  "includedCapabilities": [
    {
      "capabilityKey": "people",
      "capabilityName": "People",
      "usage": "For customer contact information",
      "viewInCoreModules": true
    }
  ]
}
```

**Data Source:**
- Subscription: Subscription Service
- Usage: Application layer
- Available plans: Subscription Service (plan definitions)
- Included capabilities: App Registry (computed from app dependencies)

**Enforcement:**
- Backend validates appKey exists
- Backend reads from Subscription Service
- Backend reads usage from Application layer
- Backend computes included capabilities from App Registry

---

### POST /api/settings/subscriptions/:appKey/upgrade

**Ownership:** Subscription Service

**Purpose:** Upgrade an application subscription to a different plan

**Permission Required:** `manageBilling` (platform-level)

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
  "billingFrequency": "monthly",
  "changes": {
    "agents": { "from": 5, "to": 25 },
    "tickets": { "from": 100, "to": 1000 },
    "storage": { "from": 10, "to": 100 }
  },
  "nextBillingDate": "2025-02-15T00:00:00Z"
}
```

**Data Source:**
- Read: Subscription Service (current plan, available plans)
- Write: Subscription Service (update subscription)

**Enforcement:**
- Backend validates appKey exists
- Backend validates plan exists and is available
- Backend validates subscription can be upgraded
- Backend validates `confirm: true` is present
- Backend updates Subscription Service
- Backend updates Organization limits (if applicable)
- Backend logs change to audit trail

**Validation Rules:**
- `appKey` must exist
- `plan` must be available for app
- Subscription must not be included (part of base subscription)
- Subscription must not be in trial (unless cancelling)
- `confirm: true` must be present

**Error Responses:**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Cannot upgrade included subscription",
  "reason": "included"
}
```

---

## Section 5: Users & Access

### GET /api/settings/users

**Ownership:** Platform Core

**Purpose:** List all users with roles and application access

**Permission Required:** `manageUsers` (platform-level)

**Request:** Query parameters (optional):
- `page`: number (default: 1)
- `perPage`: number (default: 20)
- `search`: string (optional)
- `status`: "all" | "active" | "inactive" | "suspended" (optional)

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
      "applicationAccess": [
        {
          "appKey": "SALES",
          "appName": "Sales",
          "enabled": true
        },
        {
          "appKey": "HELPDESK",
          "appName": "Helpdesk",
          "enabled": true
        }
      ],
      "lastLogin": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "perPage": 20
}
```

**Data Source:** Platform Core (User model)

**Enforcement:**
- Backend reads from User model
- Backend filters by organizationId
- Backend validates user has manageUsers permission
- Backend applies pagination and search filters

---

### GET /api/settings/users/:userId

**Ownership:** Platform Core

**Purpose:** Get detailed user information including permissions

**Permission Required:** `manageUsers` (platform-level)

**Request:** Path parameter: `userId` (string)

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
    "readOnly": true,
    "migrationAvailable": false
  }
}
```

**Data Source:** 
- User data: Platform Core (User model)
- Role data: Platform Core (Role model)
- Permissions: Computed from Role.appPermissions + User overrides

**Enforcement:**
- Backend validates userId belongs to organization
- Backend reads from User and Role models
- Backend computes permissions from role + user overrides
- Backend validates user has manageUsers permission

---

### PUT /api/settings/users/:userId

**Ownership:** Platform Core

**Purpose:** Update user application access or permissions

**Permission Required:** `manageUsers` (platform-level)

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

**Data Source:**
- Read: Platform Core (User, Role, Organization)
- Write: Platform Core (User model)

**Enforcement:**
- Backend validates userId belongs to organization
- Backend validates applicationAccess apps exist and are enabled for organization
- Backend validates appPermissions are valid for each app (from App Registry)
- Backend validates user has manageUsers permission
- Backend updates User model
- Backend logs change to audit trail

**Validation Rules:**
- `userId` must belong to organization
- `applicationAccess` apps must exist in App Registry
- `applicationAccess` apps must be in Organization.enabledApps
- `appPermissions` must be valid for each app (from App Registry)
- Cannot modify platform permissions from user settings
- Cannot edit legacy permissions

---

### GET /api/settings/roles

**Ownership:** Platform Core

**Purpose:** List all roles with user counts

**Permission Required:** `manageUsers` (platform-level)

**Request:** None

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

**Data Source:** Platform Core (Role model)

**Enforcement:**
- Backend reads from Role model
- Backend filters by organizationId
- Backend counts users per role
- Backend validates user has manageUsers permission

---

### GET /api/settings/roles/:roleId

**Ownership:** Platform Core

**Purpose:** Get detailed role information including permissions

**Permission Required:** `manageUsers` (platform-level)

**Request:** Path parameter: `roleId` (string)

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
    "readOnly": true,
    "migrationAvailable": false
  }
}
```

**Data Source:** Platform Core (Role model)

**Enforcement:**
- Backend validates roleId belongs to organization
- Backend reads from Role model
- Backend validates user has manageUsers permission

---

### PUT /api/settings/roles/:roleId

**Ownership:** Platform Core

**Purpose:** Update role permissions

**Permission Required:** `manageUsers` (platform-level)

**Request:**
```json
{
  "appPermissions": {
    "SALES": {
      "contacts": {
        "exportData": true
      }
    }
  },
  "applicationAccess": ["SALES", "HELPDESK"]
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
  },
  "applicationAccess": ["SALES", "HELPDESK"]
}
```

**Data Source:**
- Read: Platform Core (Role, Organization, App Registry)
- Write: Platform Core (Role model)

**Enforcement:**
- Backend validates roleId belongs to organization
- Backend validates appPermissions are valid for each app (from App Registry)
- Backend validates applicationAccess apps exist and are enabled
- Backend validates user has manageUsers permission
- Backend updates Role model
- Backend syncs permissions to users with this role (if applicable)
- Backend logs change to audit trail

**Validation Rules:**
- `roleId` must belong to organization
- `appPermissions` must be valid for each app (from App Registry)
- `applicationAccess` apps must exist in App Registry
- `applicationAccess` apps must be in Organization.enabledApps
- Cannot modify platform permissions from role settings
- Cannot edit legacy permissions

---

## Section 6: Security

### GET /api/settings/security

**Ownership:** Platform Core

**Purpose:** Get security settings and status

**Permission Required:** `manageSettings` (platform-level)

**Request:** None

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
          "eventId": "event123",
          "type": "password_changed",
          "description": "John Smith changed their password",
          "timestamp": "2025-01-15T10:30:00Z"
        }
      ]
    }
  }
}
```

**Data Source:** 
- Security settings: Platform Core (Organization.securitySettings)
- Login activity: Platform Core (LoginActivity model)
- Security events: Platform Core (SecurityEvent model)

**Enforcement:**
- Backend reads from Organization model
- Backend computes status from settings
- Backend reads recent activity from audit logs
- Backend validates user has manageSettings permission

---

### PUT /api/settings/security/password-rules

**Ownership:** Platform Core

**Purpose:** Update password rules

**Permission Required:** `manageSettings` (platform-level)

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
  "reuseHistoryCount": 5,
  "confirm": true
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
  },
  "impact": {
    "usersAffected": 25,
    "actionRequired": "Users with passwords shorter than 12 characters will be prompted to change their password on next sign-in"
  }
}
```

**Data Source:**
- Read: Platform Core (Organization.securitySettings)
- Write: Platform Core (Organization.securitySettings)

**Enforcement:**
- Backend validates password rules are reasonable (min 8 characters)
- Backend validates `confirm: true` is present (if high-risk change)
- Backend updates Organization.securitySettings
- Backend logs change to security events
- Backend may require users to update passwords if rules changed

**Validation Rules:**
- `minLength` must be at least 8
- `minLength` must be at most 20
- `reuseHistoryCount` must be between 0 and 10
- `confirm: true` must be present if minLength increased significantly

---

### PUT /api/settings/security/session-controls

**Ownership:** Platform Core

**Purpose:** Update session controls

**Permission Required:** `manageSettings` (platform-level)

**Request:**
```json
{
  "duration": "7_days",
  "inactiveTimeoutEnabled": true,
  "inactiveTimeoutMinutes": 120,
  "confirm": true
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

**Data Source:** Platform Core (Organization.securitySettings)

**Enforcement:**
- Backend validates session duration is valid option
- Backend validates inactive timeout is reasonable (30-480 minutes)
- Backend validates `confirm: true` is present
- Backend updates Organization.securitySettings
- Backend logs change to security events

**Validation Rules:**
- `duration` must be one of: "1_hour", "1_day", "7_days", "30_days", "never"
- `inactiveTimeoutMinutes` must be between 30 and 480
- `confirm: true` must be present

---

### PUT /api/settings/security/two-factor-auth

**Ownership:** Platform Core

**Purpose:** Update two-factor authentication requirements

**Permission Required:** `manageSettings` (platform-level)

**Request:**
```json
{
  "required": false,
  "requiredForAdmins": true,
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "twoFactorAuth": {
    "required": false,
    "requiredForAdmins": true
  },
  "impact": {
    "usersAffected": 3,
    "actionRequired": "Admin users will be required to set up two-factor authentication on their next sign-in"
  }
}
```

**Data Source:** Platform Core (Organization.securitySettings)

**Enforcement:**
- Backend validates two-factor settings
- Backend validates `confirm: true` is present (if requiring for all users)
- Backend updates Organization.securitySettings
- Backend logs change to security events
- Backend may require users to set up 2FA if now required

**Validation Rules:**
- `required` and `requiredForAdmins` must be boolean
- `confirm: true` must be present if `required: true`

---

### GET /api/settings/security/login-activity

**Ownership:** Platform Core

**Purpose:** Get login activity history

**Permission Required:** `manageSettings` (platform-level)

**Request:** Query parameters:
- `timeRange`: "7_days" | "30_days" | "all_time" (default: "7_days")
- `userId`: string (optional)
- `status`: "all" | "successful" | "failed" (default: "all")
- `page`: number (default: 1)
- `perPage`: number (default: 20)

**Response:**
```json
{
  "loginActivity": [
    {
      "activityId": "activity123",
      "userId": "user123",
      "userName": "John Smith",
      "userEmail": "john.smith@company.com",
      "status": "successful",
      "location": "New York, US",
      "ipAddress": "192.168.1.1",
      "timestamp": "2025-01-15T10:30:00Z"
    },
    {
      "activityId": "activity456",
      "userId": "user456",
      "userName": "Sarah Johnson",
      "userEmail": "sarah@company.com",
      "status": "failed",
      "location": "Unknown",
      "ipAddress": "192.168.1.2",
      "timestamp": "2025-01-15T05:00:00Z"
    }
  ],
  "total": 47,
  "page": 1,
  "perPage": 20
}
```

**Data Source:** Platform Core (LoginActivity model or audit log)

**Enforcement:**
- Backend reads from LoginActivity model
- Backend filters by organizationId
- Backend applies time range, user, and status filters
- Backend validates user has manageSettings permission

---

### GET /api/settings/security/events

**Ownership:** Platform Core

**Purpose:** Get security events history

**Permission Required:** `manageSettings` (platform-level)

**Request:** Query parameters:
- `timeRange`: "7_days" | "30_days" | "all_time" (default: "7_days")
- `eventType`: string (optional)
- `page`: number (default: 1)
- `perPage`: number (default: 20)

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

**Data Source:** Platform Core (SecurityEvent model or audit log)

**Enforcement:**
- Backend reads from SecurityEvent model
- Backend filters by organizationId
- Backend applies time range and event type filters
- Backend validates user has manageSettings permission

---

## Section 7: Integrations

### GET /api/settings/integrations

**Ownership:** Integration Service

**Purpose:** List all available integrations with their status

**Permission Required:** `manageIntegrations` (platform-level)

**Request:** None

**Response:**
```json
{
  "integrations": [
    {
      "integrationKey": "email_provider",
      "name": "Email Provider",
      "description": "Send emails directly from the platform",
      "icon": "email",
      "scope": {
        "type": "platform",
        "apps": null
      },
      "status": "enabled",
      "provider": "aws_ses"
    },
    {
      "integrationKey": "calendar_sync",
      "name": "Calendar Sync",
      "description": "Sync events with Google Calendar or Outlook",
      "icon": "calendar",
      "scope": {
        "type": "app_specific",
        "apps": ["SALES", "HELPDESK", "PROJECTS"]
      },
      "status": "not_connected"
    },
    {
      "integrationKey": "slack",
      "name": "Slack",
      "description": "Get notifications in your Slack workspace",
      "icon": "slack",
      "scope": {
        "type": "platform",
        "apps": null
      },
      "status": "not_connected"
    }
  ]
}
```

**Data Source:** Integration Service (IntegrationDefinition model)

**Enforcement:**
- Backend reads from Integration Service
- Backend checks IntegrationConfiguration for status
- Backend validates user has manageIntegrations permission

---

### GET /api/settings/integrations/:integrationKey

**Ownership:** Integration Service

**Purpose:** Get detailed integration information

**Permission Required:** `manageIntegrations` (platform-level)

**Request:** Path parameter: `integrationKey` (string)

**Response:**
```json
{
  "integrationKey": "calendar_sync",
  "name": "Calendar Sync",
  "description": "Sync events with Google Calendar or Outlook",
  "extendedDescription": "Calendar Sync automatically syncs events from your platform to your Google Calendar or Outlook calendar. When you create or update an event in Sales, Helpdesk, or Projects, it will appear in your calendar.",
  "icon": "calendar",
  "scope": {
    "type": "app_specific",
    "apps": ["SALES", "HELPDESK", "PROJECTS"],
    "appDetails": [
      {
        "appKey": "SALES",
        "appName": "Sales",
        "usage": "Syncs deal meetings and customer events"
      },
      {
        "appKey": "HELPDESK",
        "appName": "Helpdesk",
        "usage": "Syncs support appointments"
      },
      {
        "appKey": "PROJECTS",
        "appName": "Projects",
        "usage": "Syncs project milestones and deadlines"
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
  "providers": [
    {
      "providerKey": "google_calendar",
      "providerName": "Google Calendar",
      "available": true
    },
    {
      "providerKey": "outlook",
      "providerName": "Outlook",
      "available": true
    }
  ],
  "canConnect": true,
  "canDisconnect": false
}
```

**Data Source:** Integration Service (IntegrationDefinition model)

**Enforcement:**
- Backend validates integrationKey exists
- Backend reads from Integration Service
- Backend checks IntegrationConfiguration for status
- Backend validates user has manageIntegrations permission

---

### POST /api/settings/integrations/:integrationKey/connect

**Ownership:** Integration Service

**Purpose:** Initiate connection flow for an integration

**Permission Required:** `manageIntegrations` (platform-level)

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
  "oauthUrl": "https://accounts.google.com/oauth/authorize?client_id=...&redirect_uri=...&state=...",
  "state": "oauth_state_token_12345"
}
```

**Data Source:** Integration Service (OAuth configuration)

**Enforcement:**
- Backend validates integrationKey exists
- Backend validates provider is supported for integration
- Backend validates `confirm: true` is present
- Backend validates app is enabled (for app-specific integrations)
- Backend generates OAuth state token
- Backend creates IntegrationConfiguration record (pending status)
- Backend logs connection attempt to audit trail

**Validation Rules:**
- `integrationKey` must exist in Integration Service
- `provider` must be supported for integration
- For app-specific integrations, apps must be enabled for organization
- `confirm: true` must be present

---

### POST /api/settings/integrations/:integrationKey/oauth/callback

**Ownership:** Integration Service

**Purpose:** Handle OAuth callback and complete connection

**Permission Required:** None (uses state token for validation)

**Request:**
```json
{
  "code": "oauth_authorization_code",
  "state": "oauth_state_token_12345"
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

**Data Source:** Integration Service (OAuth token exchange)

**Enforcement:**
- Backend validates OAuth state token matches
- Backend exchanges authorization code for access token
- Backend stores access token (encrypted)
- Backend updates IntegrationConfiguration status to "enabled"
- Backend logs connection completion to audit trail

**Validation Rules:**
- `state` must match stored OAuth state token
- `code` must be valid authorization code
- State token must not be expired

---

### POST /api/settings/integrations/:integrationKey/disconnect

**Ownership:** Integration Service

**Purpose:** Disconnect an integration

**Permission Required:** `manageIntegrations` (platform-level)

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

**Data Source:** Integration Service (IntegrationConfiguration)

**Enforcement:**
- Backend validates integrationKey exists and is connected
- Backend validates `confirm: true` is present
- Backend revokes OAuth tokens (if applicable)
- Backend updates IntegrationConfiguration status to "disconnected"
- Backend logs disconnection to audit trail

**Validation Rules:**
- `integrationKey` must exist
- Integration must be connected (status: "enabled")
- `confirm: true` must be present

---

## Data Model Contracts

### Core Module Contract
```json
{
  "moduleKey": "string (required, unique)",
  "name": "string (required)",
  "description": "string (required)",
  "icon": "string (required)",
  "appKey": "string (required, must be 'platform')",
  "platformOwned": "boolean (required, true)",
  "applications": [
    {
      "appKey": "string (required)",
      "required": "boolean (required)",
      "enabled": "boolean (required)",
      "usage": "string (optional)"
    }
  ]
}
```

**Ownership:** App Registry

**Enforcement:** Backend validates moduleKey is platform-owned before allowing modifications

---

### Application Contract
```json
{
  "appKey": "string (required, unique)",
  "name": "string (required)",
  "description": "string (required)",
  "extendedDescription": "string (optional)",
  "icon": "string (required)",
  "status": "string (required, enum: enabled|disabled|trial|included)",
  "dependencies": [
    {
      "capabilityKey": "string (required)",
      "capabilityName": "string (required)",
      "usage": "string (required)",
      "required": "boolean (required)",
      "viewInCoreModules": "boolean (required)"
    }
  ],
  "canDisable": "boolean (required)",
  "canEnable": "boolean (required)"
}
```

**Ownership:** App Registry (definition), Organization (status)

**Enforcement:** Backend validates appKey exists, checks Organization.enabledApps for status

---

### Subscription Contract
```json
{
  "appKey": "string (required)",
  "plan": "string (required)",
  "planName": "string (required)",
  "price": "number (required)",
  "billingFrequency": "string (nullable, enum: monthly|annual|null)",
  "status": "string (required, enum: trial|active|expired|cancelled)",
  "trialDaysRemaining": "number (nullable)",
  "usage": {
    "[metricKey]": {
      "current": "number (required)",
      "limit": "number (required, nullable for unlimited)",
      "percentage": "number (required)",
      "status": "string (required, enum: good|warning|critical)"
    }
  }
}
```

**Ownership:** Subscription Service

**Enforcement:** Backend reads from Subscription Service, validates appKey exists

---

### User Contract
```json
{
  "userId": "string (required)",
  "name": "string (required)",
  "email": "string (required)",
  "roleId": "string (nullable)",
  "roleName": "string (nullable)",
  "status": "string (required, enum: active|inactive|suspended)",
  "applicationAccess": [
    {
      "appKey": "string (required)",
      "appName": "string (required)",
      "enabled": "boolean (required)"
    }
  ],
  "platformPermissions": {
    "inviteUsers": "boolean (required)",
    "manageSettings": "boolean (required)",
    "viewBilling": "boolean (required)",
    "manageIntegrations": "boolean (required)"
  },
  "appPermissions": {
    "[appKey]": {
      "[moduleKey]": {
        "[action]": "boolean (required)"
      }
    }
  }
}
```

**Ownership:** Platform Core

**Enforcement:** Backend validates userId belongs to organization, computes permissions from role

---

### Role Contract
```json
{
  "roleId": "string (required)",
  "name": "string (required)",
  "description": "string (optional)",
  "userCount": "number (required)",
  "isSystemRole": "boolean (required)",
  "platformPermissions": {
    "inviteUsers": "boolean (required)",
    "manageSettings": "boolean (required)",
    "viewBilling": "boolean (required)",
    "manageIntegrations": "boolean (required)"
  },
  "appPermissions": {
    "[appKey]": {
      "[moduleKey]": {
        "[action]": "boolean (required)"
      }
    }
  },
  "applicationAccess": ["string (array of appKeys)"]
}
```

**Ownership:** Platform Core

**Enforcement:** Backend validates roleId belongs to organization, validates appPermissions against App Registry

---

### Security Settings Contract
```json
{
  "passwordRules": {
    "minLength": "number (required, min: 8, max: 20)",
    "requireUppercase": "boolean (required)",
    "requireLowercase": "boolean (required)",
    "requireNumbers": "boolean (required)",
    "requireSpecialChars": "boolean (required)",
    "expirationEnabled": "boolean (required)",
    "expirationDays": "number (nullable, min: 30, max: 365)",
    "preventReuse": "boolean (required)",
    "reuseHistoryCount": "number (nullable, min: 0, max: 10)"
  },
  "sessionControls": {
    "duration": "string (required, enum: 1_hour|1_day|7_days|30_days|never)",
    "inactiveTimeoutEnabled": "boolean (required)",
    "inactiveTimeoutMinutes": "number (nullable, min: 30, max: 480)"
  },
  "twoFactorAuth": {
    "required": "boolean (required)",
    "requiredForAdmins": "boolean (required)"
  }
}
```

**Ownership:** Platform Core (Organization model)

**Enforcement:** Backend validates settings are reasonable, logs changes to security events

---

### Integration Contract
```json
{
  "integrationKey": "string (required, unique)",
  "name": "string (required)",
  "description": "string (required)",
  "extendedDescription": "string (optional)",
  "icon": "string (required)",
  "scope": {
    "type": "string (required, enum: platform|app_specific)",
    "apps": ["string (nullable, array of appKeys if app_specific)"]
  },
  "status": "string (required, enum: enabled|not_connected|configured)",
  "dataShared": ["string (array of data items)"],
  "dataNotShared": ["string (array of data items)"],
  "whyShared": "string (required)",
  "providers": [
    {
      "providerKey": "string (required)",
      "providerName": "string (required)",
      "available": "boolean (required)"
    }
  ]
}
```

**Ownership:** Integration Service

**Enforcement:** Backend validates integrationKey exists, checks IntegrationConfiguration for status

---

## Permission Requirements Summary

| Endpoint Category | Permission Required |
|------------------|-------------------|
| Settings Landing Page | None (all authenticated users) |
| Core Modules (read) | None (read-only) |
| Core Modules (write) | `manageSettings` |
| Applications (read) | None (read-only) |
| Applications (write) | `manageSettings` |
| Subscriptions (read) | `viewBilling` |
| Subscriptions (write) | `manageBilling` |
| Users & Access (read) | `manageUsers` |
| Users & Access (write) | `manageUsers` |
| Security (read) | `manageSettings` |
| Security (write) | `manageSettings` |
| Integrations (read) | `manageIntegrations` |
| Integrations (write) | `manageIntegrations` |

---

## Registry-Driven Structure

### App Registry Structure
```json
{
  "apps": {
    "[appKey]": {
      "name": "string",
      "description": "string",
      "dependencies": ["capabilityKey"],
      "requiredCapabilities": ["capabilityKey"]
    }
  },
  "modules": {
    "[moduleKey]": {
      "appKey": "string (platform or appKey)",
      "name": "string",
      "appPermissions": {
        "[appKey]": {
          "required": "boolean",
          "enabled": "boolean"
        }
      }
    }
  }
}
```

**Usage:** All Settings UI reads from App Registry, no hardcoded rules

---

### Integration Registry Structure
```json
{
  "integrations": {
    "[integrationKey]": {
      "name": "string",
      "description": "string",
      "scope": {
        "type": "platform|app_specific",
        "apps": ["appKey"]
      },
      "dataShared": ["string"],
      "dataNotShared": ["string"],
      "whyShared": "string",
      "providers": ["providerKey"]
    }
  }
}
```

**Usage:** All integration definitions come from Integration Service registry

---

## Backward Compatibility

### Legacy Permissions Contract
```json
{
  "legacyPermissions": {
    "present": "boolean (required)",
    "readOnly": "boolean (required, always true)",
    "migrationAvailable": "boolean (required)",
    "structure": {
      "[moduleKey]": {
        "[action]": "boolean"
      }
    }
  }
}
```

**Ownership:** Platform Core (User model, Role model)

**Enforcement:** Backend marks legacy permissions as read-only, provides migration path

---

## Error Response Contract

### Standard Error Format
```json
{
  "success": false,
  "error": "string (required, error type)",
  "message": "string (required, human-friendly message)",
  "field": "string (optional, field name if validation error)",
  "reason": "string (optional, specific reason code)"
}
```

### Error Types
- `validation_error` - Data validation failed
- `permission_denied` - User lacks required permission
- `boundary_violation` - Action violates platform boundary
- `not_found` - Resource not found
- `conflict` - Resource conflict (e.g., already enabled)

---

## Success Criteria Validation

### ✅ Frontend can be implemented without hardcoding rules
- **Evidence:** All data comes from registries, no hardcoded app lists or rules
- **Mechanism:** Registry-driven structure + explicit contracts + metadata defines behavior

### ✅ Backend enforcement is clear and centralized
- **Evidence:** Explicit validation rules, permission checks, boundary protection
- **Mechanism:** Middleware enforcement + validation rules + audit logging

### ✅ Future apps can plug into Settings without refactors
- **Evidence:** App Registry drives all app-related data, new apps automatically appear
- **Mechanism:** Registry-driven structure + app-scoped contracts + no hardcoded app lists

---

## Conclusion

These contracts ensure:
1. **Registry-driven UI** - No hardcoded rules, all data from registries
2. **Platform-safe** - Boundaries enforced server-side
3. **Explicit ownership** - Clear data source for each field
4. **Backward compatible** - Legacy support with migration paths
5. **Extensible** - New apps/integrations plug in automatically

All contracts are explicit, non-technical, and unambiguous. Frontend and backend engineers can implement without guessing intent.

