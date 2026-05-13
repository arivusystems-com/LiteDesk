# Settings Data Models - Schema Reference

## Overview

This document defines the exact data model schemas required to support the Settings API contracts. All models are registry-driven and enforce platform boundaries.

---

## Platform Core Models

### Organization Model (Security Settings)

**Ownership:** Platform Core

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId (self-reference)",
  "name": "string",
  
  "securitySettings": {
    "passwordRules": {
      "minLength": "number (default: 8)",
      "requireUppercase": "boolean (default: true)",
      "requireLowercase": "boolean (default: true)",
      "requireNumbers": "boolean (default: true)",
      "requireSpecialChars": "boolean (default: false)",
      "expirationEnabled": "boolean (default: false)",
      "expirationDays": "number (nullable)",
      "preventReuse": "boolean (default: true)",
      "reuseHistoryCount": "number (default: 5)"
    },
    "sessionControls": {
      "duration": "string (enum: 1_hour|1_day|7_days|30_days|never, default: 7_days)",
      "inactiveTimeoutEnabled": "boolean (default: true)",
      "inactiveTimeoutMinutes": "number (default: 120)"
    },
    "twoFactorAuth": {
      "required": "boolean (default: false)",
      "requiredForAdmins": "boolean (default: false)"
    }
  },
  
  "enabledApps": [
    {
      "appKey": "string (enum: SALES|HELPDESK|PROJECTS|AUDIT|PORTAL|LMS)",
      "status": "string (enum: ACTIVE|SUSPENDED, default: ACTIVE)",
      "enabledAt": "Date"
    }
  ],
  
  "coreModuleAppUsage": {
    "[moduleKey]": {
      "[appKey]": {
        "enabled": "boolean",
        "required": "boolean (from App Registry)"
      }
    }
  }
}
```

**Enforcement:** 
- Backend validates securitySettings values
- Backend validates enabledApps against App Registry
- Backend validates coreModuleAppUsage against App Registry

---

### User Model (Application Access)

**Ownership:** Platform Core

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  
  "roleId": "ObjectId (reference to Role)",
  "role": "string (legacy, enum: owner|admin|manager|user|viewer)",
  
  "allowedApps": [
    "string (enum: SALES|HELPDESK|PROJECTS|AUDIT|PORTAL|LMS)"
  ],
  
  "appPermissions": {
    "[appKey]": {
      "[moduleKey]": {
        "[action]": "boolean"
      }
    }
  },
  
  "platformPermissions": {
    "inviteUsers": "boolean",
    "manageSettings": "boolean",
    "viewBilling": "boolean",
    "manageIntegrations": "boolean"
  },
  
  "permissions": {
    "[moduleKey]": {
      "[action]": "boolean"
    }
  },
  
  "status": "string (enum: active|inactive|suspended, default: active)",
  "lastLogin": "Date"
}
```

**Enforcement:**
- Backend validates allowedApps against Organization.enabledApps
- Backend validates appPermissions against App Registry
- Backend validates platformPermissions are valid
- Backend marks permissions as legacy (read-only)

---

### Role Model (App-Scoped Permissions)

**Ownership:** Platform Core

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId",
  "name": "string",
  "description": "string",
  "isSystemRole": "boolean (default: false)",
  
  "platformPermissions": {
    "inviteUsers": "boolean",
    "manageSettings": "boolean",
    "viewBilling": "boolean",
    "manageIntegrations": "boolean"
  },
  
  "appPermissions": {
    "[appKey]": {
      "[moduleKey]": {
        "[action]": "boolean"
      }
    }
  },
  
  "applicationAccess": [
    "string (array of appKeys)"
  ],
  
  "permissions": {
    "[moduleKey]": {
      "[action]": "boolean"
    }
  }
}
```

**Enforcement:**
- Backend validates appPermissions against App Registry
- Backend validates applicationAccess against Organization.enabledApps
- Backend marks permissions as legacy (read-only)

---

## App Registry Models

### AppDefinition Model

**Ownership:** App Registry (read-only from Settings)

**Schema:**
```json
{
  "_id": "ObjectId",
  "appKey": "string (unique, enum: SALES|HELPDESK|PROJECTS|AUDIT|PORTAL|LMS)",
  "name": "string",
  "description": "string",
  "extendedDescription": "string",
  "icon": "string",
  
  "dependencies": [
    {
      "capabilityKey": "string",
      "required": "boolean",
      "usage": "string"
    }
  ],
  
  "settingsEntryPoint": {
    "available": "boolean",
    "path": "string"
  },
  
  "canDisable": "boolean (computed from subscription)",
  "canEnable": "boolean (computed from subscription)"
}
```

**Enforcement:**
- Backend reads from App Registry
- Settings UI cannot modify (read-only)
- Modified only through admin/system processes

---

### ModuleDefinition Model

**Ownership:** App Registry (read-only from Settings, except app usage toggles)

**Schema:**
```json
{
  "_id": "ObjectId",
  "moduleKey": "string (unique)",
  "name": "string",
  "description": "string",
  "icon": "string",
  "appKey": "string (platform or appKey)",
  
  "platformOwned": "boolean (computed: appKey === 'platform')",
  
  "appPermissions": {
    "[appKey]": {
      "required": "boolean",
      "enabled": "boolean (writable for optional apps)",
      "usage": "string"
    }
  },
  
  "ui": {
    "navigationEntity": "boolean",
    "navigationCore": "boolean",
    "excludeFromApps": "boolean"
  }
}
```

**Enforcement:**
- Backend validates moduleKey is platform-owned before allowing app usage toggles
- Backend validates appKey exists before allowing toggle
- Backend validates required flag (cannot toggle if required)

---

## Subscription Service Models

### AppSubscription Model

**Ownership:** Subscription Service

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId",
  "appKey": "string",
  
  "plan": "string (enum: trial|starter|professional|enterprise|included)",
  "planName": "string",
  "price": "number",
  "billingFrequency": "string (nullable, enum: monthly|annual)",
  
  "status": "string (enum: trial|active|expired|cancelled)",
  "trialDaysRemaining": "number (nullable)",
  "trialStartDate": "Date (nullable)",
  "trialEndDate": "Date (nullable)",
  
  "currentPeriodStart": "Date (nullable)",
  "currentPeriodEnd": "Date (nullable)",
  
  "limits": {
    "[metricKey]": "number (nullable for unlimited)"
  }
}
```

**Enforcement:**
- Backend validates appKey exists
- Backend validates plan is available for app
- Backend enforces subscription rules (cannot upgrade if included, etc.)

---

### UsageMetrics Model

**Ownership:** Application Layer (per app)

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId",
  "appKey": "string",
  
  "metrics": {
    "[metricKey]": {
      "current": "number",
      "limit": "number (nullable for unlimited)",
      "period": "string (nullable, enum: monthly|all_time)",
      "unit": "string (nullable, enum: count|GB|hours)"
    }
  },
  
  "lastUpdated": "Date"
}
```

**Enforcement:**
- Backend reads from Application layer
- Settings UI cannot modify (read-only)
- Updated by Application layer based on app usage

---

## Integration Service Models

### IntegrationDefinition Model

**Ownership:** Integration Service (read-only from Settings)

**Schema:**
```json
{
  "_id": "ObjectId",
  "integrationKey": "string (unique)",
  "name": "string",
  "description": "string",
  "extendedDescription": "string",
  "icon": "string",
  
  "scope": {
    "type": "string (enum: platform|app_specific)",
    "apps": ["string (nullable, array of appKeys if app_specific)"]
  },
  
  "dataShared": ["string"],
  "dataNotShared": ["string"],
  "whyShared": "string",
  
  "providers": [
    {
      "providerKey": "string",
      "providerName": "string",
      "available": "boolean"
    }
  ]
}
```

**Enforcement:**
- Backend reads from Integration Service
- Settings UI cannot modify (read-only)
- Modified only through admin/system processes

---

### IntegrationConfiguration Model

**Ownership:** Integration Service

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId",
  "integrationKey": "string",
  "provider": "string",
  
  "status": "string (enum: pending|enabled|disconnected, default: pending)",
  
  "oauthTokens": {
    "accessToken": "string (encrypted)",
    "refreshToken": "string (encrypted, nullable)",
    "expiresAt": "Date (nullable)"
  },
  
  "config": {
    "[configKey]": "any"
  },
  
  "connectedAt": "Date (nullable)",
  "disconnectedAt": "Date (nullable)"
}
```

**Enforcement:**
- Backend validates integrationKey exists
- Backend validates provider is supported
- Backend encrypts OAuth tokens before storage
- Backend validates app is enabled (for app-specific integrations)

---

## Audit & Activity Models

### LoginActivity Model

**Ownership:** Platform Core

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId",
  "userId": "ObjectId",
  "userEmail": "string",
  "userName": "string",
  
  "status": "string (enum: successful|failed)",
  "ipAddress": "string",
  "location": "string (nullable)",
  "userAgent": "string",
  
  "timestamp": "Date"
}
```

**Enforcement:**
- Backend creates on login attempt
- Settings UI cannot modify (read-only)
- Filtered by organizationId

---

### SecurityEvent Model

**Ownership:** Platform Core

**Schema:**
```json
{
  "_id": "ObjectId",
  "organizationId": "ObjectId",
  
  "type": "string (enum: password_changed|user_suspended|role_changed|permission_changed|two_factor_enabled|two_factor_disabled|security_setting_changed)",
  "description": "string",
  
  "userId": "ObjectId (nullable)",
  "userName": "string (nullable)",
  "userEmail": "string (nullable)",
  
  "adminUserId": "ObjectId (nullable)",
  "adminUserName": "string (nullable)",
  
  "location": "string (nullable)",
  "ipAddress": "string (nullable)",
  
  "metadata": {
    "[key]": "any"
  },
  
  "timestamp": "Date"
}
```

**Enforcement:**
- Backend creates on security-related actions
- Settings UI cannot modify (read-only)
- Filtered by organizationId

---

## Registry Structure

### App Registry Structure
```json
{
  "apps": {
    "SALES": {
      "name": "Sales",
      "description": "Customer relationship management and sales pipeline",
      "dependencies": [
        {
          "capabilityKey": "people",
          "required": true,
          "usage": "Used for contact management and leads"
        }
      ],
      "requiredCapabilities": ["people", "organizations"]
    }
  },
  "modules": {
    "people": {
      "appKey": "platform",
      "name": "People",
      "appPermissions": {
        "SALES": {
          "required": true,
          "enabled": true,
          "usage": "Used for contact management and leads"
        },
        "AUDIT": {
          "required": false,
          "enabled": true,
          "usage": "Used for auditor contact information"
        }
      }
    }
  }
}
```

**Ownership:** App Registry

**Enforcement:** Backend reads from App Registry, validates all app/module references

---

## Contract Validation Rules

### Core Modules Validation
- `moduleKey` must exist in App Registry
- `moduleKey` must have `appKey: 'platform'`
- `appKey` must exist in App Registry
- `appKey` must be in Organization.enabledApps
- Cannot toggle if `required: true`
- Must confirm before disabling optional apps

### Applications Validation
- `appKey` must exist in App Registry
- Cannot enable if not in App Registry
- Cannot disable if `status: 'included'`
- Cannot disable if `status: 'trial'` (unless cancelling)
- Cannot disable if required by organization config

### Subscriptions Validation
- `appKey` must exist
- `plan` must be available for app
- Cannot upgrade if `plan: 'included'`
- Cannot upgrade during trial (unless cancelling)
- Must confirm before upgrading

### Users & Access Validation
- `userId` must belong to organization
- `roleId` must belong to organization
- Cannot assign access to apps not enabled for organization
- Cannot modify platform permissions from user/role settings
- Cannot edit legacy permissions (read-only)
- `appPermissions` must be valid for each app (from App Registry)

### Security Validation
- `minLength` must be at least 8, at most 20
- `reuseHistoryCount` must be between 0 and 10
- `duration` must be valid enum value
- `inactiveTimeoutMinutes` must be between 30 and 480
- Must confirm before high-risk changes

### Integrations Validation
- `integrationKey` must exist in Integration Service
- `provider` must be supported for integration
- Cannot connect if app not enabled (for app-specific integrations)
- Must confirm before connecting/disconnecting

---

## Data Source Mapping

| Data Field | Source | Ownership | Writable from Settings |
|-----------|--------|-----------|----------------------|
| Core module definitions | App Registry | App Registry | No |
| Core module app usage | App Registry/Organization | Platform Core | Yes (optional apps only) |
| Application definitions | App Registry | App Registry | No |
| Application status | Organization.enabledApps | Platform Core | Yes |
| Application dependencies | App Registry | App Registry | No |
| Subscription plans | Subscription Service | Subscription Service | No |
| Subscription status | Subscription Service | Subscription Service | Yes (upgrade only) |
| Usage metrics | Application layer | Application layer | No |
| User data | Platform Core (User) | Platform Core | Yes |
| Role data | Platform Core (Role) | Platform Core | Yes |
| Permissions | Platform Core (Role/User) | Platform Core | Yes (app-scoped only) |
| Security settings | Platform Core (Organization) | Platform Core | Yes |
| Login activity | Platform Core (LoginActivity) | Platform Core | No |
| Security events | Platform Core (SecurityEvent) | Platform Core | No |
| Integration definitions | Integration Service | Integration Service | No |
| Integration status | Integration Service | Integration Service | Yes (connect/disconnect) |

---

## Backward Compatibility

### Legacy Permissions Field
**Location:** User.permissions, Role.permissions

**Structure:**
```json
{
  "permissions": {
    "[moduleKey]": {
      "[action]": "boolean"
    }
  }
}
```

**Handling:**
- Marked as deprecated
- Read-only in Settings UI
- Migration path to appPermissions available
- Synced from role on login (for backward compatibility)

---

## Success Criteria Validation

### ✅ Frontend can be implemented without hardcoding rules
- **Evidence:** All app lists, module lists, dependencies come from registries
- **Mechanism:** Registry-driven models + explicit contracts + no hardcoded data

### ✅ Backend enforcement is clear and centralized
- **Evidence:** Explicit validation rules, data source ownership, boundary checks
- **Mechanism:** Model schemas + validation rules + middleware enforcement

### ✅ Future apps can plug into Settings without refactors
- **Evidence:** App Registry drives all app-related data, new apps automatically appear
- **Mechanism:** Registry-driven models + app-scoped contracts + dynamic app lists

---

## Conclusion

These data models ensure:
1. **Registry-driven** - All data comes from registries, no hardcoded structures
2. **Platform-safe** - Clear ownership, boundaries enforced
3. **Explicit** - No implicit behavior, all fields defined
4. **Backward compatible** - Legacy fields supported with migration paths
5. **Extensible** - New apps/integrations plug in automatically

All models are explicit, non-technical, and unambiguous. Frontend and backend engineers can implement without guessing intent.

