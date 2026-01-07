# Platform Core vs CRM App - File Classification

**Generated:** Codebase review for Platform Core identification  
**Reference:** See `PLATFORM_CORE_ANALYSIS.md` for detailed analysis and violations

---

## ✅ Platform Core Files (App-Agnostic)

These files belong to the Platform Core layer and should be app-agnostic.

### Models

| File | Status | Notes |
|------|--------|-------|
| `server/models/User.js` | ⚠️ Has violations | User identity - contains CRM-specific permissions structure |
| `server/models/Organization.js` | ⚠️ Has violations | Tenant organization - mixed with CRM entity, CRM-specific enabledModules |
| `server/models/People.js` | ⚠️ Has violations | People/contacts - contains CRM-specific Lead/Contact fields |
| `server/models/Role.js` | ⚠️ Has violations | Role & permissions - contains CRM-module-specific permissions |

### Controllers

| File | Status | Notes |
|------|--------|-------|
| `server/controllers/authController.js` | ⚠️ Has violations | Authentication - creates CRM modules during registration |
| `server/controllers/userController.js` | ✅ Clean | User management |
| `server/controllers/organizationController.js` | ⚠️ Has violations | Organization management - handles both tenant + CRM entity |
| `server/controllers/peopleController.js` | ⚠️ Has violations | People management - contains CRM-specific logic |
| `server/controllers/roleController.js` | ✅ Clean | Role management |

### Middleware

| File | Status | Notes |
|------|--------|-------|
| `server/middleware/authMiddleware.js` | ✅ Clean | JWT authentication |
| `server/middleware/permissionMiddleware.js` | ⚠️ Has violations | Permission checking - checks CRM-module permissions |
| `server/middleware/organizationMiddleware.js` | ⚠️ Has violations | Organization isolation - checks CRM-specific features |
| `server/middleware/securityLoggingMiddleware.js` | ✅ Clean | Security event logging |
| `server/middleware/databaseMiddleware.js` | ✅ Clean | Database connection management |
| `server/middleware/rateLimitMiddleware.js` | ✅ Clean | Rate limiting |
| `server/middleware/securityHeadersMiddleware.js` | ✅ Clean | Security headers |
| `server/middleware/csrfMiddleware.js` | ✅ Clean | CSRF protection |
| `server/middleware/uploadMiddleware.js` | ✅ Clean | File upload handling |

### Routes

| File | Status | Notes |
|------|--------|-------|
| `server/routes/authRoutes.js` | ✅ Clean | Authentication routes |
| `server/routes/userRoutes.js` | ✅ Clean | User routes |
| `server/routes/organizationRoutes.js` | ✅ Clean | Organization routes |
| `server/routes/userPreferencesRoutes.js` | ✅ Clean | User preferences routes |
| `server/routes/peopleRoutes.js` | ✅ Clean | People routes |
| `server/routes/roleRoutes.js` | ✅ Clean | Role routes |
| `server/routes/healthRoutes.js` | ✅ Clean | Health check routes |

### Missing Platform Core Components

These should exist but are NOT implemented:

1. **Location Model/Service** - Generic location management
2. **Notification Infrastructure** - Generic notification system
3. **Centralized Audit Log Model** - Generic audit logging (currently embedded in models)

---

## 🏢 CRM App-Specific Files

These files are specific to the CRM application and should NOT be in Platform Core.

### CRM Models

- `server/models/Deal.js` - Sales pipeline, deals
- `server/models/Event.js` - Events, meetings, audits
- `server/models/Form.js` - Forms
- `server/models/FormResponse.js` - Form submissions
- `server/models/FormKPIs.js` - Form analytics
- `server/models/Task.js` - Task management
- `server/models/Item.js` - Inventory/items
- `server/models/Group.js` - Contact groups
- `server/models/Process.js` - Business processes
- `server/models/Report.js` - Reports
- `server/models/ResponseTemplate.js` - Response templates
- `server/models/ModuleDefinition.js` - Dynamic field definitions
- `server/models/EventTracking.js` - Event tracking
- `server/models/EventOrder.js` - Event ordering
- `server/models/ImportHistory.js` - Import history

### CRM Controllers

- `server/controllers/dealController.js` - Deal management
- `server/controllers/eventController.js` - Event management
- `server/controllers/formController.js` - Form management
- `server/controllers/formResponseController.js` - Form responses
- `server/controllers/taskController.js` - Task management
- `server/controllers/itemController.js` - Item management
- `server/controllers/groupController.js` - Group management
- `server/controllers/reportController.js` - Report generation
- `server/controllers/moduleController.js` - Module configuration
- `server/controllers/csvController.js` - CSV import/export
- `server/controllers/importHistoryController.js` - Import history
- `server/controllers/metricsController.js` - Metrics/analytics

### CRM Routes

- `server/routes/dealRoutes.js`
- `server/routes/eventRoutes.js`
- `server/routes/formRoutes.js`
- `server/routes/taskRoutes.js`
- `server/routes/itemRoutes.js`
- `server/routes/groupRoutes.js`
- `server/routes/reportRoutes.js`
- `server/routes/moduleRoutes.js`
- `server/routes/csvRoutes.js`
- `server/routes/importHistoryRoutes.js`
- `server/routes/metricsRoutes.js`
- `server/routes/uploadRoutes.js`

### CRM Services

- `server/services/formProcessingService.js`
- `server/services/formScoringService.js`
- `server/services/reportGenerationService.js`
- `server/services/reportTemplateService.js`
- `server/services/enhancedPdfReportService.js`
- `server/services/pdfPageGenerators.js`
- `server/services/geoValidationService.js` - Geo validation for events
- `server/services/blockRenderers/` (14 files) - Report block rendering

### CRM Utilities

- `server/utils/dependencyEvaluation.js` - Field dependencies
- `server/utils/blockVisibility.js` - Report block visibility
- `server/utils/mappers/organizationMapper.js` - Organization mapping
- `server/utils/mappers/peopleMapper.js` - People mapping

---

## 🛠️ Platform Management Files (Not Platform Core)

These files manage the platform itself (multi-instance deployment) and are NOT part of Platform Core for apps.

### Platform Management Models

- `server/models/InstanceRegistry.js` - Instance registry
- `server/models/DemoRequest.js` - Demo requests

### Platform Management Controllers

- `server/controllers/instanceController.js` - Instance management
- `server/controllers/demoController.js` - Demo request handling
- `server/controllers/adminController.js` - Platform administration

### Platform Management Routes

- `server/routes/instanceRoutes.js`
- `server/routes/demoRoutes.js`
- `server/routes/adminRoutes.js`

### Platform Management Services

- `server/services/provisioning/` (6 files) - Instance provisioning

---

## ⚠️ Violations Summary

### Critical Violations (App Logic in Platform Core)

1. **Registration creates CRM modules** (`authController.js:104-118`)
   - Initializes People and Deals modules during registration
   - Should be app-agnostic

2. **User permissions are CRM-module-specific** (`User.js:49-105`)
   - Hardcoded CRM modules (contacts, deals, tasks, events, forms, items, reports)
   - Should be generic capability-based

3. **Role permissions are CRM-module-aware** (`Role.js:34-162`)
   - CRM-module-specific permission structure
   - Should be generic resource-action permissions

4. **Organization model is dual-purpose** (`Organization.js`)
   - Contains both tenant organization (Platform Core) and CRM entity (CRM App)
   - Should be split into two models

5. **People model has CRM-specific fields** (`People.js:37-63`)
   - Lead/Contact distinction, CRM-specific status fields
   - Platform Core should be generic

6. **Enabled modules are CRM-specific** (`Organization.js:77-80`)
   - Default modules: ['contacts', 'deals', 'tasks', 'events']
   - Should be empty or use generic identifiers

7. **Feature access checks CRM features** (`organizationMiddleware.js:123-154`)
   - Checks CRM-specific feature names
   - Should use generic identifiers

8. **Activity logs contain CRM actions** (Various models)
   - CRM-specific action types
   - Should be generic or app-configurable

---

## 📊 Statistics

- **Platform Core Files:** 20+ files (with violations)
- **CRM App Files:** 50+ files
- **Platform Management Files:** 10+ files
- **Violations Found:** 8 critical violations

---

**See `PLATFORM_CORE_ANALYSIS.md` for detailed analysis and recommendations.**

