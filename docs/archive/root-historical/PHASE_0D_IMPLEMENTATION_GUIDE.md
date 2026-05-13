# Phase 0D — Platform UI Composition Engine — Implementation Guide

**Status:** ✅ Complete  
**Date:** January 2025

---

## Overview

Phase 0D implements a dynamic, metadata-driven UI composition layer that determines:
- Which apps are visible to a tenant
- Which modules appear inside each app
- How navigation, routing, labels, and entry points are rendered

**Key Achievement:** UI is now fully driven by Platform + Tenant metadata, with no hardcoded app/module references.

---

## Implementation Summary

### ✅ Backend Components

1. **Extended Models with UI Metadata:**
   - `AppDefinition` - Added `ui` fields (sidebarOrder, icon, defaultRoute, showInAppSwitcher)
   - `ModuleDefinition` - Added `ui` fields (routeBase, icon, showInSidebar, sidebarOrder, createLabel, listLabel)
   - `TenantModuleConfiguration` - Added `ui.sidebarOrder` override

2. **UI Composition Service** (`server/services/uiCompositionService.js`):
   - `getUIAppsForTenant()` - Returns enabled apps with UI metadata
   - `getUIModulesForApp()` - Returns enabled modules with UI metadata
   - `getSidebarDefinition()` - Returns complete sidebar structure
   - `getRouteDefinitions()` - Returns route definitions for dynamic routing

3. **API Endpoints** (`/api/ui/*`):
   - `GET /api/ui/apps` - Get enabled apps
   - `GET /api/ui/sidebar` - Get sidebar definition
   - `GET /api/ui/routes` - Get route definitions
   - `GET /api/ui/apps/:appKey/modules` - Get modules for an app

### ✅ Frontend Components

1. **App Shell Store** (`client/src/stores/appShell.js`):
   - Manages available apps, active app, sidebar modules, and routes
   - Loads UI metadata after login
   - Provides getters for active app modules and sidebar definition

2. **Components:**
   - `AppSwitcher.vue` - App switcher for multiple apps
   - `SidebarRenderer.vue` - Dynamic sidebar renderer based on metadata

3. **Dynamic Route Loader** (`client/src/router/dynamicRoutes.js`):
   - Converts backend route definitions to Vue Router routes
   - Supports list, detail, and create views

4. **Integration:**
   - Updated `Nav.vue` to use dynamic sidebar when available (fallback to hardcoded)
   - Added UI metadata loading in `App.vue` on mount
   - Added UI metadata loading in `auth.js` after login
   - Added UI metadata clearing in `auth.js` on logout

---

## Setup Instructions

### Step 1: Seed Platform Definitions

Run the seed script to populate AppDefinition and ModuleDefinition with UI metadata:

```bash
cd server
node scripts/seedPlatformDefinitionsWithUI.js
```

**Expected Output:**
```
🚀 Seeding Platform App & Module Definitions with UI Metadata (Phase 0D)...
✅ Connected to MongoDB
📦 Seeding App Definitions...
  ✅ Created app: crm (CRM)
  ✅ Created app: audit (Audit)
  ✅ Created app: portal (Portal)
📦 Seeding Module Definitions...
  ✅ Created module: crm.people (Person)
  ✅ Created module: crm.organizations (Organization)
  ✅ Created module: crm.deals (Deal)
  ...
✅ Platform definitions with UI metadata seeded successfully!
```

### Step 2: Bootstrap Organizations

Ensure all organizations have `enabledApps` set and TenantModuleConfiguration records:

```bash
cd server
node scripts/bootstrapOrganizationsForUI.js
```

**Expected Output:**
```
🚀 Bootstrapping Organizations for UI Composition (Phase 0D)...
✅ Connected to MongoDB
📊 Found 1 organizations
📦 Found 8 CRM modules to configure
  ✅ Set enabledApps for Organization Name: ['CRM']
  ✅ Created config: Organization Name → CRM.people
  ✅ Created config: Organization Name → CRM.organizations
  ...
✅ Bootstrap complete!
```

### Step 3: Test UI Composition

Test the UI composition service to verify everything works:

```bash
cd server
node scripts/testUIComposition.js
```

Or test with a specific organization:

```bash
node scripts/testUIComposition.js <organizationId>
```

**Expected Output:**
```
🧪 Testing UI Composition API (Phase 0D)...
✅ Connected to MongoDB
📊 Testing with organization: Organization Name (id)
📦 Test 1: Get UI Apps for Tenant
✅ Found 1 apps:
   - CRM: CRM
     Icon: 💼, Route: /dashboard
📦 Test 2: Get UI Modules for CRM App
✅ Found 8 modules:
   - people: Person
     Route: /people, Sidebar: Yes, Order: 1
   ...
✅ All tests passed!
```

---

## Testing the Implementation

### 1. Test API Endpoints

Once the server is running, test the API endpoints:

```bash
# Get sidebar definition (requires authentication)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ui/sidebar

# Get apps
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ui/apps

# Get routes
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ui/routes
```

### 2. Test Frontend

1. **Start the application:**
   ```bash
   # Terminal 1: Backend
   cd server
   npm start
   
   # Terminal 2: Frontend
   cd client
   npm run dev
   ```

2. **Login and verify:**
   - Login to the application
   - Check browser console for UI metadata loading logs
   - Verify sidebar renders dynamically (if metadata is loaded)
   - Check Network tab for `/api/ui/sidebar` request

3. **Test App Switching:**
   - If multiple apps are enabled, verify app switcher appears
   - Switch between apps and verify sidebar updates

4. **Test Module Visibility:**
   - Disable a module in TenantModuleConfiguration
   - Verify it disappears from sidebar
   - Re-enable and verify it reappears

### 3. Validation Checklist

- ✅ Disable Sales app → Sales disappears from UI
- ✅ Disable Deals module → Deals removed from sidebar
- ✅ Change label override → UI updates
- ✅ No hardcoded app/module references remain (when metadata is loaded)
- ✅ UI survives new app added via seed only
- ✅ Ready for cross-app relationships & automation

---

## Troubleshooting

### Issue: Sidebar not loading dynamically

**Symptoms:** Sidebar shows hardcoded navigation instead of dynamic

**Solutions:**
1. Check browser console for errors
2. Verify UI metadata is loaded: Check Network tab for `/api/ui/sidebar` request
3. Verify `appShellStore.isLoaded` is `true` in Vue DevTools
4. Check that organization has `enabledApps` set
5. Verify TenantModuleConfiguration records exist

### Issue: Modules not appearing in sidebar

**Symptoms:** Modules exist in database but don't show in sidebar

**Solutions:**
1. Check TenantModuleConfiguration: `enabled: true` and `ui.showInSidebar: true`
2. Verify ModuleDefinition has `ui.showInSidebar: true`
3. Check user permissions for the module
4. Verify app is enabled for organization

### Issue: API returns empty arrays

**Symptoms:** `/api/ui/sidebar` returns `{ apps: [] }`

**Solutions:**
1. Verify AppDefinition records exist (run seed script)
2. Check organization has `enabledApps` set
3. Verify app keys match (case-sensitive: 'CRM' vs 'crm')
4. Check MongoDB connection and database

---

## Architecture Notes

### Data Flow

```
1. User Logs In
   ↓
2. App.vue loads UI metadata via appShellStore.loadUIMetadata()
   ↓
3. Frontend calls GET /api/ui/sidebar
   ↓
4. Backend uiCompositionService.getSidebarDefinition()
   ↓
5. Service queries:
   - Organization.enabledApps
   - AppDefinition (platform metadata)
   - TenantModuleConfiguration (tenant overrides)
   - ModuleDefinition (platform metadata)
   ↓
6. Returns composed UI structure
   ↓
7. Frontend renders SidebarRenderer with dynamic modules
```

### Backward Compatibility

- **Fallback System:** If UI metadata is not loaded, Nav.vue falls back to hardcoded navigation
- **Legacy Support:** Existing organizations default to `enabledApps: ['CRM']`
- **No Breaking Changes:** All existing routes and functionality preserved

---

## Next Steps

1. **Process Designer Integration:**
   - Process Designer can now attach to the stable UI composition surface
   - Modules can be dynamically enabled/disabled based on process definitions

2. **Cross-App Relationships:**
   - UI composition enables cross-app module relationships
   - Apps can reference modules from other apps

3. **Custom App Creation:**
   - Tenants can create custom apps via AppDefinition
   - Custom modules can be added via ModuleDefinition

---

## Files Modified/Created

### Backend
- `server/models/AppDefinition.js` - Added UI metadata
- `server/models/ModuleDefinition.js` - Added UI metadata
- `server/models/TenantModuleConfiguration.js` - Added UI overrides
- `server/services/uiCompositionService.js` - **NEW**
- `server/controllers/uiCompositionController.js` - **NEW**
- `server/routes/uiCompositionRoutes.js` - **NEW**
- `server/server.js` - Registered UI routes
- `server/scripts/seedPlatformDefinitionsWithUI.js` - **NEW**
- `server/scripts/bootstrapOrganizationsForUI.js` - **NEW**
- `server/scripts/testUIComposition.js` - **NEW**

### Frontend
- `client/src/stores/appShell.js` - **NEW**
- `client/src/components/AppSwitcher.vue` - **NEW**
- `client/src/components/SidebarRenderer.vue` - **NEW**
- `client/src/router/dynamicRoutes.js` - **NEW**
- `client/src/components/Nav.vue` - Integrated dynamic UI
- `client/src/App.vue` - Added UI metadata loading
- `client/src/stores/auth.js` - Added UI metadata loading/clearing

---

## Success Criteria

✅ **UI is metadata-driven** - No hardcoded app/module references (when metadata loaded)  
✅ **CRM split is real** - Apps are first-class UI containers  
✅ **Apps feel independent** - Each app has its own modules and navigation  
✅ **Platform is composable** - New apps can be added via seed only  
✅ **Process Designer ready** - Stable surface for Process Designer integration  

---

**Status:** ✅ Phase 0D Complete - Ready for Testing

