# Platform Core vs CRM App Analysis

**Date:** Generated during codebase review  
**Purpose:** Identify components that belong to Platform Core (app-agnostic) vs CRM App-specific functionality

---

## 🎯 Platform Core Components

Platform Core includes ONLY app-agnostic infrastructure that would be shared across any application built on this platform.

### 1. Authentication & Session Handling

**Files:**
- `server/controllers/authController.js` - Registration, login, token generation
- `server/middleware/authMiddleware.js` - JWT token verification, user authentication
- `server/routes/authRoutes.js` - Authentication routes

**Platform Core Elements:**
- User registration (creates organization + owner)
- User login with JWT tokens
- Password hashing (bcrypt)
- Token generation and verification
- Session management via JWT
- Security logging for auth events

**Note:** Registration currently creates CRM-specific module definitions (People, Deals). This is a **violation** - module initialization should be app-agnostic.

---

### 2. User Identity

**Files:**
- `server/models/User.js` - User model with identity, profile, permissions
- `server/controllers/userController.js` - User CRUD, profile management
- `server/routes/userRoutes.js` - User routes
- `server/controllers/userPreferencesController.js` - User preferences
- `server/routes/userPreferencesRoutes.js` - Preferences routes

**Platform Core Elements:**
- User profile (firstName, lastName, email, phoneNumber, avatar)
- User status (active, inactive, suspended)
- Password management (change, reset)
- User preferences
- Last login tracking

**CRM App Leakage:**
- User permissions structure includes CRM-specific modules (contacts, deals, tasks, events, forms, items, reports)
- Role-based permissions are CRM-module-aware
- Should be abstracted to generic "permissions" or "capabilities" system

---

### 3. People (Contacts)

**Files:**
- `server/models/People.js` - People/contacts model
- `server/controllers/peopleController.js` - People CRUD operations
- `server/routes/peopleRoutes.js` - People routes

**Platform Core Elements:**
- Basic contact information (name, email, phone)
- Organization reference (multi-tenancy)
- Assignment tracking (assignedTo, createdBy)
- Activity logs (generic audit trail)
- Notes (generic notes system)

**CRM App Leakage:**
- Lead/Contact type distinction (Lead vs Contact)
- Lead-specific fields (lead_status, lead_score, qualification_date)
- Contact-specific fields (contact_status, role, birthday, preferred_contact_method)
- Organization reference points to CRM Organization model (should be generic entity reference)

---

### 4. Organization (Tenant)

**Files:**
- `server/models/Organization.js` - Organization model (dual-purpose: tenant + CRM entity)
- `server/controllers/organizationController.js` - Organization management
- `server/routes/organizationRoutes.js` - Organization routes
- `server/middleware/organizationMiddleware.js` - Organization isolation, feature access

**Platform Core Elements:**
- Tenant organization (isTenant: true)
- Organization name, slug, industry
- Subscription management (status, tier, trial dates)
- Usage limits (maxUsers, maxContacts, maxDeals, maxStorageGB)
- Enabled modules/apps (enabledModules array)
- Organization settings (dateFormat, timeZone, currency, logoUrl, primaryColor)
- Organization status (isActive)
- Database configuration (for dedicated DB per org)

**CRM App Leakage:**
- Organization model also contains CRM-specific fields (types, website, phone, address, customerStatus, partnerStatus, vendorStatus, etc.)
- These CRM fields should be in a separate CRMOrganization model or entity
- Organization.enabledModules contains CRM-specific module names ('contacts', 'deals', 'tasks', 'events')
- Should be generic app identifiers

---

### 5. Location

**Status:** ❌ **NOT IMPLEMENTED AS PLATFORM CORE**

**Current State:**
- Location data exists only in CRM-specific models:
  - `Event.js` - geoLocation, location fields (for audit events)
  - `EventTracking.js` - location data for event tracking
- No standalone Location model or service

**Platform Core Should Include:**
- Generic Location model (address, coordinates, geocoding)
- Location service for validation and geocoding
- Location reference in People and Organization (generic)

---

### 6. App Access Flags

**Files:**
- `server/models/Organization.js` - `enabledModules` field
- `server/middleware/organizationMiddleware.js` - `checkFeatureAccess()` middleware

**Platform Core Elements:**
- Feature/module access control per organization
- Feature gating based on subscription tier
- Usage limit checking

**CRM App Leakage:**
- `enabledModules` contains CRM-specific module names
- Should be generic app/feature identifiers
- `checkFeatureAccess()` checks CRM-specific feature names

---

### 7. Audit Logging

**Files:**
- `server/middleware/securityLoggingMiddleware.js` - Security event logging
- Activity logs embedded in models (People, Organization, Event)

**Platform Core Elements:**
- Security event logging (auth events, permission denials, suspicious activity)
- Activity log infrastructure (user, action, timestamp, details)
- Audit trail for data changes

**CRM App Leakage:**
- Activity logs in CRM-specific models (Event, People) contain CRM-specific action types
- Should be generic audit log service/model

**Note:** Full audit logging infrastructure is partially implemented. Activity logs exist in models but no centralized audit log model.

---

### 8. Notification Infrastructure

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- Mentioned in roadmap (`8_WEEK_PRODUCTION_ROADMAP.md`)
- No notification model, service, or infrastructure exists
- Task model has `reminderDate` and `reminderSent` fields (CRM-specific)

**Platform Core Should Include:**
- Notification model (in-app, email, SMS)
- Notification service
- Notification preferences per user
- Notification delivery infrastructure

---

### 9. Role & Permissions (RBAC)

**Files:**
- `server/models/Role.js` - Role model with permissions
- `server/middleware/permissionMiddleware.js` - Permission checking middleware
- `server/controllers/roleController.js` - Role management
- `server/routes/roleRoutes.js` - Role routes

**Platform Core Elements:**
- Role-based access control
- Permission checking infrastructure
- Role hierarchy
- User-role assignment

**CRM App Leakage:**
- Role permissions structure is CRM-module-specific (contacts, deals, tasks, events, forms, items, reports)
- Should be generic capability/permission system
- Default roles (Owner, Admin, Manager, User, Viewer) have CRM-specific permissions

---

## 🏢 CRM App-Specific Components

These components are specific to the CRM application and should NOT be in Platform Core.

### CRM Models

1. **`server/models/Deal.js`** - Sales pipeline, deals, opportunities
2. **`server/models/Event.js`** - Events, meetings, audits (CRM-specific event types)
3. **`server/models/Form.js`** - Forms for data collection
4. **`server/models/FormResponse.js`** - Form submissions
5. **`server/models/FormKPIs.js`** - Form analytics
6. **`server/models/Task.js`** - Task management (related to deals, contacts, projects)
7. **`server/models/Item.js`** - Inventory/items management
8. **`server/models/Group.js`** - Contact groups/segments
9. **`server/models/Process.js`** - Business process workflows
10. **`server/models/Report.js`** - CRM reports
11. **`server/models/ResponseTemplate.js`** - Form response templates
12. **`server/models/ModuleDefinition.js`** - Dynamic field definitions for CRM modules
13. **`server/models/EventTracking.js`** - Event execution tracking
14. **`server/models/EventOrder.js`** - Event ordering/sequencing
15. **`server/models/ImportHistory.js`** - CSV import history

### CRM Controllers

1. **`server/controllers/dealController.js`** - Deal CRUD, pipeline management
2. **`server/controllers/eventController.js`** - Event CRUD, audit workflows
3. **`server/controllers/formController.js`** - Form management
4. **`server/controllers/formResponseController.js`** - Form submission handling
5. **`server/controllers/taskController.js`** - Task management
6. **`server/controllers/itemController.js`** - Item management
7. **`server/controllers/groupController.js`** - Group management
8. **`server/controllers/reportController.js`** - Report generation
9. **`server/controllers/moduleController.js`** - Dynamic module/field configuration
10. **`server/controllers/csvController.js`** - CSV import/export
11. **`server/controllers/importHistoryController.js`** - Import history
12. **`server/controllers/metricsController.js`** - CRM metrics/analytics

### CRM Routes

All corresponding route files for the above controllers.

### CRM Services

1. **`server/services/formProcessingService.js`** - Form processing logic
2. **`server/services/formScoringService.js`** - Form scoring
3. **`server/services/reportGenerationService.js`** - Report generation
4. **`server/services/reportTemplateService.js`** - Report templates
5. **`server/services/enhancedPdfReportService.js`** - PDF report generation
6. **`server/services/pdfPageGenerators.js`** - PDF page generation
7. **`server/services/blockRenderers/`** - Report block rendering (14 files)
8. **`server/services/geoValidationService.js`** - Geo validation for events

### CRM Utilities

1. **`server/utils/dependencyEvaluation.js`** - Field dependency evaluation (CRM-specific)
2. **`server/utils/blockVisibility.js`** - Report block visibility (CRM-specific)
3. **`server/utils/mappers/organizationMapper.js`** - Organization mapping (CRM-specific)
4. **`server/utils/mappers/peopleMapper.js`** - People mapping (CRM-specific)

### Multi-Instance Infrastructure (Platform Management)

**Note:** These are for managing the platform itself, not part of Platform Core for apps:

1. **`server/models/InstanceRegistry.js`** - Instance registry for multi-instance deployments
2. **`server/controllers/instanceController.js`** - Instance management
3. **`server/controllers/demoController.js`** - Demo request handling
4. **`server/controllers/adminController.js`** - Platform administration
5. **`server/services/provisioning/`** - Instance provisioning services
6. **`server/routes/instanceRoutes.js`** - Instance routes
7. **`server/routes/demoRoutes.js`** - Demo routes
8. **`server/routes/adminRoutes.js`** - Admin routes

---

## ⚠️ Violations: App Logic Leaking into Platform Logic

### 1. **Registration Creates CRM Modules**

**Location:** `server/controllers/authController.js:104-118`

```javascript
// 1.6. Initialize People Module Definition with dependencies
await updatePeopleModuleFields(organization._id);
await updateDealsModuleFields(organization._id);
```

**Issue:** Registration automatically initializes CRM-specific modules (People, Deals). This should be app-agnostic.

**Fix:** Module initialization should be handled by the app, not during user registration.

---

### 2. **User Permissions Structure is CRM-Specific**

**Location:** `server/models/User.js:49-105`

```javascript
permissions: {
    contacts: { view, create, edit, delete, viewAll, exportData },
    deals: { view, create, edit, delete, viewAll, exportData },
    // ... CRM-specific modules
}
```

**Issue:** User permissions are hardcoded to CRM modules.

**Fix:** Should be generic capability-based permissions or stored as flexible JSON.

---

### 3. **Role Permissions are CRM-Module-Aware**

**Location:** `server/models/Role.js:34-162`

```javascript
permissions: {
    contacts: { create, read, update, delete, export, import, scope },
    deals: { create, read, update, delete, export, import, scope },
    // ... CRM-specific modules
}
```

**Issue:** Role permissions structure assumes CRM modules.

**Fix:** Should be generic resource-action permissions.

---

### 4. **Organization Model Contains CRM Fields**

**Location:** `server/models/Organization.js:126-242`

**Issue:** Organization model serves dual purpose:
- Tenant organization (Platform Core)
- CRM organization entity (CRM App)

**Fix:** Split into two models:
- `TenantOrganization` (Platform Core)
- `CRMOrganization` (CRM App)

---

### 5. **People Model Contains CRM-Specific Fields**

**Location:** `server/models/People.js:37-63`

**Issue:** People model has Lead/Contact distinction and CRM-specific status fields.

**Fix:** Platform Core should have generic People model. CRM app can extend with Lead/Contact types.

---

### 6. **Enabled Modules Contains CRM Module Names**

**Location:** `server/models/Organization.js:77-80`

```javascript
enabledModules: {
    type: [String],
    default: ['contacts', 'deals', 'tasks', 'events']
}
```

**Issue:** Default enabled modules are CRM-specific.

**Fix:** Should be empty by default or use generic app identifiers.

---

### 7. **Feature Access Checks CRM-Specific Features**

**Location:** `server/middleware/organizationMiddleware.js:123-154`

**Issue:** `checkFeatureAccess()` checks CRM-specific feature names.

**Fix:** Should use generic feature identifiers.

---

### 8. **Activity Logs Contain CRM-Specific Actions**

**Location:** Various models (People, Organization, Event)

**Issue:** Activity log actions are CRM-specific (e.g., "lead_status_changed", "deal_stage_updated").

**Fix:** Should use generic action types or be app-configurable.

---

## 📋 Summary

### Platform Core Files (App-Agnostic)

**Models:**
- `server/models/User.js` ⚠️ (has CRM leakage in permissions)
- `server/models/Organization.js` ⚠️ (mixed tenant + CRM entity)
- `server/models/People.js` ⚠️ (has CRM-specific fields)
- `server/models/Role.js` ⚠️ (has CRM-specific permissions)

**Controllers:**
- `server/controllers/authController.js` ⚠️ (creates CRM modules)
- `server/controllers/userController.js`
- `server/controllers/organizationController.js` ⚠️ (handles both tenant + CRM org)
- `server/controllers/peopleController.js` ⚠️ (has CRM-specific logic)

**Middleware:**
- `server/middleware/authMiddleware.js`
- `server/middleware/permissionMiddleware.js` ⚠️ (checks CRM permissions)
- `server/middleware/organizationMiddleware.js` ⚠️ (checks CRM features)
- `server/middleware/securityLoggingMiddleware.js`

**Routes:**
- `server/routes/authRoutes.js`
- `server/routes/userRoutes.js`
- `server/routes/organizationRoutes.js`
- `server/routes/userPreferencesRoutes.js`
- `server/routes/peopleRoutes.js`
- `server/routes/roleRoutes.js`

### CRM App-Specific Files

**Models:** Deal, Event, Form, FormResponse, FormKPIs, Task, Item, Group, Process, Report, ResponseTemplate, ModuleDefinition, EventTracking, EventOrder, ImportHistory

**Controllers:** dealController, eventController, formController, formResponseController, taskController, itemController, groupController, reportController, moduleController, csvController, importHistoryController, metricsController

**Services:** All services in `server/services/` except provisioning (which is platform management)

**Routes:** All corresponding route files for CRM controllers

---

## 🎯 Recommendations

1. **Extract CRM-specific logic from Platform Core models:**
   - Split Organization into TenantOrganization and CRMOrganization
   - Make User permissions generic/capability-based
   - Make Role permissions generic
   - Remove CRM-specific fields from People model

2. **Create generic Platform Core services:**
   - Generic notification service
   - Generic location service
   - Generic audit log service

3. **Make module/app initialization app-specific:**
   - Remove CRM module initialization from registration
   - Let apps initialize their own modules

4. **Abstract feature access:**
   - Use generic feature identifiers instead of CRM module names
   - Make feature checking app-configurable

5. **Create Platform Core abstractions:**
   - Generic entity reference system (instead of hardcoded model refs)
   - Generic permission system (instead of CRM-module permissions)
   - Generic activity log service (instead of embedded logs)

---

**End of Analysis**

