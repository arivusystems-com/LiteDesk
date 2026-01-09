# Architecture, Platform & Apps - Changes Summary

**Date:** January 2025  
**Status:** Production-Ready Multi-Application Platform

---

## 🎯 Executive Summary

LiteDesk has evolved from a **single-tenant CRM application** into a **comprehensive multi-application platform** that supports multiple distinct applications (CRM, Audit, Portal, LMS) running on unified infrastructure. The platform follows a **Platform Core + Apps** pattern with app-aware security, permissions, and entitlements.

---

## 🏗️ 1. Platform Architecture Evolution

### Before: Single-Tenant CRM
- Single application focused on CRM
- Organization-based multi-tenancy with shared database
- CRM-specific permissions and modules
- No app boundaries or context awareness

### After: Multi-Application Platform ✅
- **Platform Core** (app-agnostic infrastructure)
- **Multiple Apps** (CRM, Audit, Portal, LMS)
- **App-Aware Security** at every layer
- **App Context Resolution** from URLs
- **App Isolation** with clear boundaries

### Key Architectural Principles Implemented:

1. **Platform Core First**
   - Shared infrastructure is app-agnostic
   - Authentication, organization management, notifications
   - No CRM assumptions in core

2. **App Isolation**
   - Each app has own routes, permissions, business logic
   - Clear boundaries prevent cross-app contamination
   - Independent scaling per app

3. **App-Aware Security**
   - Permissions scoped by application
   - URL-based app context resolution
   - Multi-layer entitlement checks

4. **Backward Compatibility**
   - Existing CRM functionality preserved
   - No breaking changes
   - Legacy fields supported with fallbacks

---

## 🔐 2. Security Architecture Implementation

### Comprehensive Security Measures ✅

#### Authentication & Authorization
- ✅ JWT authentication with secure secrets (no defaults)
- ✅ Role-based access control (RBAC)
- ✅ Permission-based authorization
- ✅ Organization isolation enforced
- ✅ User ownership verification

#### Rate Limiting
- ✅ General API rate limiting (100 req/15min)
- ✅ Authentication rate limiting (5 attempts/15min)
- ✅ Registration rate limiting (3/hour)
- ✅ Password reset rate limiting (3/hour)
- ✅ Sensitive operation rate limiting (10/15min)

#### Security Headers
- ✅ X-Frame-Options (prevent clickjacking)
- ✅ X-Content-Type-Options (prevent MIME sniffing)
- ✅ X-XSS-Protection
- ✅ Referrer-Policy
- ✅ Permissions-Policy
- ✅ Content-Security-Policy (CSP)
- ✅ Strict-Transport-Security (HSTS) for production

#### CSRF Protection
- ✅ CSRF middleware for state-changing operations
- ✅ Origin validation
- ✅ JWT-based CSRF protection

#### Security Logging & Monitoring
- ✅ Authentication event logging
- ✅ Permission denial logging
- ✅ Suspicious activity logging
- ✅ Rate limit violation logging
- ✅ Data access logging (configurable)

**Security Maturity:** Level 3 - Good Security ✅

---

## 🎯 3. App-Level Changes

### 3.1 CRM Application

**Status:** Enhanced & Preserved ✅

**Changes:**
- Remains the **execution engine** for audit workflows
- All business logic and state machines remain in CRM
- Lazy initialization middleware for performance
- Backward compatible with all existing functionality

**Modules Preserved:**
- Contacts (People)
- Organizations (Companies)
- Deals (Sales Pipeline)
- Events (Calendar & Audits)
- Forms (Data Collection)
- Tasks
- Items (Products/Services)
- Reports

**Key Role:** Single source of truth for all execution logic

---

### 3.2 Audit Application (NEW) ✅

**Purpose:** License-cheap auditor workspace for executing audits

**Architecture Pattern:** Workspace + Proxy

**Key Features:**
- ✅ **License-Cheap:** Auditors don't need CRM licenses
- ✅ **Security:** No CRM data exposure to auditors
- ✅ **Simplicity:** Audit-specific UI, no CRM module clutter
- ✅ **Ownership-Based:** Only event owner can execute

**Components:**
- `AuditAssignment` - Read-only cache of Event data
- `AuditTimeline` - Read-only history of audit actions
- `AuditExecutionContext` - UX state tracking

**Routes:**
- `/audit/assignments/*` - Read-only assignment APIs
- `/audit/execute/*` - Execution proxy endpoints
- `/audit/me`, `/audit/org`, `/audit/health` - Info endpoints

**Sync Pattern: One-Way (CRM → Audit App)**
- CRM is always the source of truth
- Event-driven sync via post-save hooks
- Kill switch: `AUDIT_SYNC_ENABLED` environment variable
- Reverse sync prevention (hard boundary)

**Execution Flow:**
1. Auditor calls Audit App endpoint
2. Audit App validates ownership
3. Audit App calls CRM controller internally (no HTTP)
4. CRM executes business logic
5. Audit App syncs read-only cache
6. Response returned to auditor

**Why CRM is Never Exposed:**
- Data isolation (no CRM data access)
- Permission isolation (no CRM permissions required)
- License efficiency (no CRM licenses needed)
- Clear boundaries (CRM = execution engine, Audit = workspace)

---

### 3.3 Portal Application (NEW) ✅

**Purpose:** Customer/Partner self-service portal

**Access:** `allowedApps: ['PORTAL']`, `enabledApps: ['PORTAL']`

**Components:**
- Profile Management
- Order Management
- Request Submissions
- Document Access

**Routes:**
- `/portal/me` - User profile
- `/portal/org` - Organization info
- `/portal/orders/*` - Order management
- `/portal/requests/*` - Request submissions

**Key Features:**
- Self-service interface
- Limited access to CRM data
- Portal-specific permissions
- Customer-facing workflows

---

### 3.4 LMS Application (Future)

**Purpose:** Learning Management System

**Status:** Defined in constants, implementation pending

---

## 🔑 4. Permission & Entitlement Systems

### 4.1 App Context Resolution ✅

**Purpose:** Automatically determine which application a request belongs to

**Implementation:** `server/middleware/resolveAppContextMiddleware.js`

**Resolution Strategy:**
1. URL namespace mapping (highest priority)
2. Fallback to `DEFAULT_APP_KEY` (CRM)

**URL Mappings:**
```javascript
{
  '/api/audit': 'AUDIT',   // Must come before /api
  '/api/portal': 'PORTAL', // Must come before /api
  '/api/lms': 'LMS',       // Must come before /api
  '/app/crm': 'CRM',
  '/portal': 'PORTAL',
  '/audit': 'AUDIT',
  '/lms': 'LMS',
  '/api': 'CRM'            // Legacy default (lowest priority)
}
```

**Usage:**
- `req.appKey` attached to all authenticated requests
- Used by permission middleware for app-aware checks
- Logged for debugging and audit trails

---

### 4.2 App Entitlement Enforcement ✅

**Purpose:** Prevent users from accessing applications they are not entitled to

**Multi-Layer Enforcement:**

#### Layer 1: User-Level Entitlements
- **Field:** `User.allowedApps` (legacy, backward compatible)
- **Field:** `User.appAccess` (new, structured)
- **Behavior:** User must have app in allowed apps

#### Layer 2: Organization-Level Enablement
- **Field:** `Organization.enabledApps`
- **Behavior:** Organization must have app enabled

#### Layer 3: App-Specific Enforcement
- **Middleware:** `requireAppEntitlement`
- **Behavior:** Both user AND org checks must pass

**Error Response:**
```json
{
  "success": false,
  "message": "You do not have access to the CRM application",
  "code": "APP_ENTITLEMENT_REQUIRED",
  "currentApp": "CRM",
  "allowedApps": ["PORTAL"],
  "error": "User is not entitled to access CRM application. Allowed apps: [PORTAL]. Please contact your administrator to grant access."
}
```

---

### 4.3 Platform User Types & App Access ✅

**Purpose:** Structured app access system with user types

**User Model Extensions:**
- `userType`: `['INTERNAL', 'EXTERNAL', 'SYSTEM']` (default: `'INTERNAL'`)
- `appAccess`: Array with structure:
  ```javascript
  {
    appKey: 'CRM' | 'AUDIT' | 'PORTAL',
    roleKey: String (required),
    status: 'ACTIVE' | 'DISABLED' (default: 'ACTIVE'),
    addedAt: Date
  }
  ```
- `allowedApps`: Legacy field (kept for backward compatibility)

**App Registry:**
- Single source of truth in `server/constants/appRegistry.js`
- Defines which roles belong to which app
- Defines which userTypes can access which apps
- Default role per app

**Validation:**
- App exists in registry
- User's `userType` is allowed for the app
- User has active access entry
- Falls back to `allowedApps` (legacy) if needed

---

### 4.4 Organization App Enablement ✅

**Purpose:** Organizations control which apps are available

**Organization Model:**
- `enabledApps`: `['CRM', 'PORTAL', 'AUDIT', 'LMS']` (default: `['CRM']`)
- `enabledModules`: Legacy field (kept for backward compatibility)

**Feature Access Logic:**
- App-aware `hasFeature()` method
- Maps CRM module names to CRM app enablement
- Falls back to `enabledModules` if needed

**Backward Compatibility:**
- Existing orgs default to `enabledApps: ['CRM']`
- No migration required
- All existing functionality preserved

---

## ⚙️ 5. Execution Capabilities & Metadata

### 5.1 Execution Capabilities Registry ✅

**Purpose:** Formal registry declaring what actions exist in the system

**File:** `server/constants/executionCapabilities.js`

**Capability Structure:**
```javascript
{
  capabilityKey: 'RESPONSE_APPROVE',
  domain: 'RESPONSE',
  action: 'APPROVE',
  executionOwnerApp: 'CRM',
  executionType: 'USER' | 'SYSTEM' | 'AUTOMATION',
  discoverableBy: ['CRM', 'AUDIT', 'PORTAL', 'PROCESS_DESIGNER'],
  executableBy: ['CRM'],
  auditAppPolicy: 'READ_ONLY' | 'HIDDEN',
  portalPolicy: 'READ_ONLY' | 'HIDDEN',
  requiresOwnership: Boolean,
  requiresInstanceActive: Boolean,
  uiHints: { label, variant, icon, confirmationRequired }
}
```

**Key Rules:**
- All capabilities declare CRM as execution owner
- Audit App policy is always 'READ_ONLY'
- Portal policy is 'READ_ONLY' or 'HIDDEN'
- Discovery ≠ Execution (apps can discover but not execute)

**Capabilities Defined:**
- RESPONSE Domain: SUBMIT, APPROVE, REJECT, CLOSE
- EVENT/AUDIT Domain: CHECK_IN, SUBMIT, APPROVE, REJECT

---

### 5.2 Execution Feedback Metadata ✅

**Purpose:** Explain why execution is blocked/allowed with user-friendly messages

**File:** `server/constants/executionFeedbackRegistry.js`

**Feedback Structure:**
```javascript
{
  code: 'TRIAL_EXPIRED',
  severity: 'WARNING',
  title: 'Trial Ended',
  message: 'Your trial has ended. Please subscribe to continue execution.'
}
```

**Severity Levels:**
- `NONE`: No message (execution allowed)
- `INFO`: Informational (trial active, etc.)
- `WARNING`: Warning (trial expired, etc.)
- `ERROR`: Error (blocked, seat required, etc.)

**Usage:**
- Disabled buttons with tooltips
- Inline banners ("Trial expired", "Seat required")
- Process Designer validation messages
- Consistent UX across all apps

**Guardrails:**
- Feedback never grants access (only `allowed` field grants access)
- Feedback is read-only metadata
- UI must not infer execution logic from feedback alone
- CRM remains the execution engine

---

## 📊 6. Data Flow Patterns

### Pattern 1: CRM Execution (Standard)
```
CRM User → POST /api/events/:id/check-in
    │
    ├─→ CRM Controller
    │   ├─→ Permission Check (CRM app)
    │   ├─→ Business Logic
    │   ├─→ State Machine Update
    │   └─→ Database Write
    │
    └─→ Response
```

### Pattern 2: Audit App Proxy Execution
```
Audit User → POST /audit/execute/:id/check-in
    │
    ├─→ Audit Execution Controller
    │   ├─→ Ownership Check (eventOwnerId)
    │   ├─→ Call CRM Controller (internal)
    │   │   ├─→ Business Logic
    │   │   ├─→ State Machine Update
    │   │   └─→ Database Write
    │   │
    │   ├─→ Update Audit App Models (sync)
    │   └─→ Create Timeline Entry
    │
    └─→ Response
```

### Pattern 3: Event-Driven Sync
```
CRM Event Updated
    │
    ├─→ Post-Save Hook Triggered
    │   └─→ auditSyncService.syncAuditAssignmentFromEvent()
    │       ├─→ Check AUDIT_SYNC_ENABLED
    │       ├─→ Check reverse sync guard (prevent Audit → CRM)
    │       ├─→ Update AuditAssignment
    │       ├─→ Create AuditTimeline entry (if state changed)
    │       └─→ Log (non-blocking errors)
    │
    └─→ CRM Execution Continues (unaffected)
```

---

## 🔄 7. Backward Compatibility Strategy

### Existing Organizations ✅
- **No Action Required:**
  - Existing orgs automatically get `enabledApps: ['CRM']` (default)
  - All existing functionality preserved
  - No breaking changes

### Existing Users ✅
- **No Action Required:**
  - Existing users default to `allowedApps: ['CRM']` (default)
  - Legacy `allowedApps` field preserved
  - Middleware falls back to `allowedApps` if `appAccess` is empty

### Legacy Fields Preserved ✅
- `enabledModules` (organization)
- `allowedApps` (user)
- `permissions` (role, treated as CRM-scoped)

### Migration Scripts Available ✅
- Optional migration from `allowedApps` to `appAccess`
- Idempotent and safe to run multiple times

---

## 📈 8. Performance & Scalability

### Lazy Initialization ✅
- CRM modules initialized on demand
- Checks app enablement before initializing
- Reduces startup time and memory footprint

### Multi-Instance Deployment ✅
- Separate instance per organization
- Complete data isolation
- Independent scaling per instance
- Custom branding per instance

### Caching Strategy ✅
- User sessions (JWT tokens)
- Organization settings
- Permission lookups
- Frequently accessed lists

---

## 🎯 9. Key Achievements

### ✅ Platform-Level
- **Multi-Application Platform:** Supports CRM, Audit, Portal, LMS
- **App-Aware Security:** Permissions and entitlements scoped by application
- **App Context Resolution:** Automatic app identification from URLs
- **Platform Core:** App-agnostic shared infrastructure

### ✅ Security
- **Comprehensive Security:** Multi-layer protection
- **Rate Limiting:** Protection against abuse
- **Security Headers:** Protection against common attacks
- **Security Logging:** Full audit trail

### ✅ Applications
- **CRM:** Enhanced and preserved as execution engine
- **Audit App:** License-cheap workspace with proxy execution
- **Portal App:** Customer self-service portal
- **LMS:** Defined and ready for implementation

### ✅ Permissions & Entitlements
- **User-Level:** App entitlements (`allowedApps`, `appAccess`)
- **Org-Level:** App enablement (`enabledApps`)
- **App-Aware:** Permissions scoped by application
- **Backward Compatible:** Legacy fields preserved

### ✅ Execution System
- **Capabilities Registry:** Formal declaration of actions
- **Feedback Metadata:** User-friendly error messages
- **Execution Ownership:** Explicit ownership per capability
- **Discovery vs Execution:** Clear separation

---

## 📋 10. Files & Components Modified

### Platform Core
- `server/models/User.js` - Added `allowedApps`, `appAccess`, `userType`
- `server/models/Organization.js` - Added `enabledApps`, app-aware `hasFeature()`
- `server/constants/appKeys.js` - App key constants
- `server/constants/appRegistry.js` - App registry (roles, userTypes)
- `server/middleware/resolveAppContextMiddleware.js` - App context resolution
- `server/middleware/requireAppEntitlementMiddleware.js` - App entitlement enforcement
- `server/middleware/lazyCRMInitializationMiddleware.js` - Lazy CRM initialization

### Audit App
- `server/models/AuditAssignment.js` - Read-only cache model
- `server/models/AuditTimeline.js` - Timeline history model
- `server/models/AuditExecutionContext.js` - Execution context model
- `server/routes/auditRoutes.js` - Audit App routes
- `server/controllers/auditExecutionController.js` - Execution proxy
- `server/services/auditSyncService.js` - One-way sync service

### Portal App
- `server/routes/portalRoutes.js` - Portal App routes
- `server/controllers/portalController.js` - Portal controllers

### Execution System
- `server/constants/executionCapabilities.js` - Capabilities registry
- `server/constants/executionFeedbackRegistry.js` - Feedback registry
- `server/utils/executionCapabilityRegistry.js` - Capability utilities
- `server/utils/executionFeedbackResolver.js` - Feedback resolver
- `server/services/recordContextService.js` - Record context with capabilities

### Security
- `server/middleware/securityMiddleware.js` - Security headers
- `server/middleware/rateLimitMiddleware.js` - Rate limiting
- `server/middleware/csrfMiddleware.js` - CSRF protection
- Security logging throughout

---

## 🚀 11. Next Steps (Future Enhancements)

### Planned Features
1. **LMS Application** - Full Learning Management System
2. **Enhanced Portal** - Payment integration, document sharing
3. **Platform-Level Features** - SSO, API Gateway, Webhooks, GraphQL
4. **Advanced Sync** - Real-time sync (WebSockets), conflict resolution
5. **Process Designer** - Visual workflow builder using capabilities registry

### Advanced Security
- Two-factor authentication (2FA)
- IP whitelisting for admin
- Advanced bot detection
- Web Application Firewall (WAF)

### Compliance
- GDPR compliance audit
- SOC 2 preparation
- Security certifications
- Regular penetration testing

---

## ✅ Summary

The LiteDesk Platform Architecture successfully:

✅ **Supports Multiple Applications** on unified infrastructure  
✅ **Maintains App Isolation** with clear boundaries  
✅ **Provides App-Aware Security** at every layer  
✅ **Enables License-Efficient Apps** (Audit App pattern)  
✅ **Preserves Backward Compatibility** for existing deployments  
✅ **Scales Independently** per organization and app  
✅ **Event-Driven Architecture** for loose coupling  
✅ **Comprehensive Security** with multi-layer protection  
✅ **Execution Metadata** for future Process Designer  
✅ **User-Friendly Feedback** for blocked actions  

**Status:** ✅ Production-Ready  
**Breaking Changes:** None  
**Backward Compatibility:** 100% maintained  
**Enterprise Ready:** Yes

---

**Last Updated:** January 2025  
**Audience:** Engineers, Architects, Product Managers, Enterprise Buyers  
**Document Version:** 1.0

