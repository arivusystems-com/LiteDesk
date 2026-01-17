# Sidebar Contract & Data Model (FOUNDATION)

**Status:** ✅ Complete  
**Date:** January 2025

---

## 🎯 Objective

Define a single, platform-level sidebar contract that supports:
- Core primitives
- App dashboards
- Modules

**Without any app switcher.**

---

## 📋 Requirements Met

### ✅ Pure Data Contract
- **No UI logic** - Pure TypeScript interfaces/types
- **No Vue/React specifics** - Framework-agnostic
- **Registry-driven** - Built entirely from app registry
- **Permission-aware** - Filters based on user permissions

### ✅ Three Sections
1. **Core** → Global, non-collapsible items (e.g., Dashboard)
2. **Domain** → Apps (Sales, Helpdesk, etc.) with modules
3. **Platform** → Governance (Settings, Apps, Users)

### ✅ Domain Structure
- Domain headers are **first-class items**
- Each domain has:
  - `appKey` (e.g., 'SALES', 'HELPDESK')
  - `label` (e.g., 'Sales', 'Helpdesk')
  - `dashboardRoute` (e.g., '/sales')
  - `children` (modules)

### ✅ Module Structure
- Modules are **leaf nodes**
- Must include:
  - `route` (e.g., '/contacts')
  - Optional `permission` (e.g., 'contacts.view')
- **No nesting beyond one level**

### ✅ State Management
- Only supports `expanded/collapsed` state (to be stored later)
- **No customization features:**
  - ❌ No drag/drop
  - ❌ No pinning
  - ❌ No reordering

---

## 📁 Deliverables

### 1. `sidebar.types.ts` ✅
**Location:** `client/src/types/sidebar.types.ts`

**Interfaces Defined:**
- `SidebarModule` - Leaf node module
- `SidebarDomain` - App domain with modules
- `SidebarCoreItem` - Core section item
- `SidebarPlatformItem` - Platform section item
- `SidebarStructure` - Complete sidebar structure
- `AppRegistryEntry` - App registry entry
- `AppRegistry` - Complete app registry
- `UserPermissions` - User permissions map

### 2. `buildSidebarFromRegistry()` ✅
**Location:** `client/src/utils/buildSidebarFromRegistry.ts`

**Function Signature:**
```typescript
function buildSidebarFromRegistry(
  appRegistry: AppRegistry,
  userPermissions: UserPermissions,
  coreItems?: SidebarCoreItem[],
  platformItems?: SidebarPlatformItem[]
): SidebarStructure
```

**Features:**
- Filters items based on permissions
- Sorts items by order
- Builds all three sections
- Handles domain headers as first-class items
- Modules are leaf nodes only

### 3. Sample Output JSON ✅
**Location:** `client/src/utils/sidebar.sample.json`

**Structure:**
```json
{
  "core": [...],
  "domain": [
    {
      "appKey": "SALES",
      "label": "Sales",
      "dashboardRoute": "/sales",
      "children": [
        {
          "moduleKey": "contacts",
          "label": "Contacts",
          "route": "/contacts",
          "permission": "contacts.view"
        }
      ]
    }
  ],
  "platform": [...]
}
```

### 4. Usage Examples ✅
**Location:** `client/src/utils/sidebar.example.ts`

**Examples:**
- Sales user sidebar
- Admin user sidebar
- Adding new app (zero code changes)

---

## ✅ Acceptance Criteria (All Pass)

### ✅ Sidebar can be rendered entirely from:
- ✅ App Registry
- ✅ User permissions

### ✅ Adding a new app requires zero sidebar code changes
- ✅ Just add app to registry
- ✅ No hardcoded module lists
- ✅ No sidebar code modifications

### ✅ Clicking a domain header can navigate to a dashboard
- ✅ Domain headers have `dashboardRoute` property
- ✅ Headers are first-class items (not just labels)

### ✅ Sidebar structure remains identical across apps
- ✅ Same three-section structure
- ✅ Same domain/module hierarchy
- ✅ No per-app sidebars

---

## 🚫 Explicitly Excluded

- ❌ **App switcher** - Not part of sidebar contract
- ❌ **Per-app sidebars** - Single platform sidebar only
- ❌ **Hardcoded module lists** - All from registry
- ❌ **Customization features:**
  - ❌ Drag/drop
  - ❌ Pinning
  - ❌ Reordering
  - ❌ Custom sections

---

## 📖 Usage

### Basic Usage

```typescript
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';
import type { AppRegistry, UserPermissions } from '@/types/sidebar.types';

// 1. Define app registry
const appRegistry: AppRegistry = {
  SALES: {
    appKey: 'SALES',
    label: 'Sales',
    dashboardRoute: '/sales',
    modules: [
      {
        moduleKey: 'contacts',
        label: 'Contacts',
        route: '/contacts',
        permission: 'contacts.view',
      },
    ],
  },
};

// 2. Define user permissions
const userPermissions: UserPermissions = {
  'contacts.view': true,
};

// 3. Build sidebar
const sidebar = buildSidebarFromRegistry(appRegistry, userPermissions);

// 4. Use sidebar structure
console.log(sidebar.core);      // Core items
console.log(sidebar.domain);    // App domains
console.log(sidebar.platform);  // Platform items
```

### Adding a New App

```typescript
// Just add to registry - no sidebar code changes needed!
const appRegistry: AppRegistry = {
  SALES: { /* ... */ },
  NEW_APP: {  // ← New app
    appKey: 'NEW_APP',
    label: 'New App',
    dashboardRoute: '/new-app',
    modules: [
      {
        moduleKey: 'module1',
        label: 'Module 1',
        route: '/new-app/module1',
        permission: 'newapp.module1.view',
      },
    ],
  },
};

// Same function call - automatically includes new app!
const sidebar = buildSidebarFromRegistry(appRegistry, userPermissions);
```

---

## 🔄 Next Steps (Future)

1. **State Storage** - Store `expanded/collapsed` state per domain
2. **UI Implementation** - Build Vue component using this contract
3. **Backend Integration** - Connect to app registry API
4. **Permission Integration** - Connect to permission system

---

## 📝 Notes

- **Pure Data Contract** - No UI logic, no framework dependencies
- **Registry-Driven** - All structure comes from app registry
- **Permission-Aware** - Filters items based on user permissions
- **Extensible** - Adding new apps requires zero sidebar code changes
- **Consistent** - Same structure across all apps

---

**Last Updated:** January 2025  
**Status:** ✅ Foundation Complete

