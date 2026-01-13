# Module List Contract

**Status:** ✅ Complete  
**Date:** January 2025

---

## 🎯 Objective

Define a standard, enforceable contract for:
- Module list pages (tables, boards, queues)
- Their columns, actions, filters, and states
- Without baking in UI assumptions

This must work for:
- Sales (Leads, Deals)
- Helpdesk (Tickets)
- Any marketplace app

---

## 🔑 Core Principle (Lock This)

**Lists are data contracts, not components.**

And:

**Every list must explain itself, even when empty.**

---

## 📋 Module List Contract

### ModuleListDefinition Structure

```typescript
interface ModuleListDefinition {
  moduleKey: string;
  appKey: string;
  title: string;
  description?: string;
  layout: "TABLE" | "BOARD" | "QUEUE" | "CARD";
  columns: ListColumn[];
  primaryActions: ListAction[];
  bulkActions?: ListAction[];
  rowActions?: ListAction[];
  filters?: ListFilter[];
  emptyState?: EmptyStateDefinition;
  defaultSort?: { column: string; order: 'asc' | 'desc' };
  pagination?: { pageSize: number; pageSizeOptions?: number[] };
}
```

---

## 📊 Column Contract (Critical)

### ListColumn Structure

```typescript
interface ListColumn {
  key: string;
  label: string;
  dataType: "text" | "number" | "date" | "status" | "user" | ...;
  sortable?: boolean;
  filterable?: boolean;
  permission?: string;
  visibility: PermissionOutcome; // HIDDEN, VISIBLE, ENABLED
  order?: number;
  fieldPath?: string;
}
```

### Column Rules

**Permission-Aware:**
- Columns can have permissions
- HIDDEN columns are filtered out
- VISIBLE/ENABLED columns are included

**Stable Across Users:**
- Hidden ≠ removed from definition
- Column definition remains, visibility changes
- UI can show "hidden" indicators if needed

**Data Types:**
- `text`, `number`, `date`, `datetime`, `status`, `user`, `currency`, `percentage`, `boolean`, `link`, `custom`

---

## 🎬 Actions & Permissions

### Action Types

**Primary Actions:**
- Create, Import, Configure
- Shown in header/toolbar
- Permission-aware

**Row Actions:**
- View, Edit, Delete, Duplicate
- Shown per row
- Permission-aware

**Bulk Actions:**
- Delete, Assign, Export, Archive
- Shown when items selected
- Permission-aware

### Permission Rules

**All Actions:**
- Carry `permission` field
- Use `PermissionOutcome` (HIDDEN, VISIBLE, ENABLED)
- **Never checked in UI** - Builder filters

**Action Visibility:**
- HIDDEN → Action excluded
- VISIBLE/ENABLED → Action included

---

## 🔨 Builder Responsibility

### buildModuleListFromRegistry()

**Function Signature:**
```typescript
function buildModuleListFromRegistry(
  moduleKey: string,
  appKey: string,
  appRegistry: AppRegistry,
  userPermissions: UserPermissions
): ModuleListDefinition | null
```

**Responsibilities:**
1. **Filter columns by permission** - HIDDEN excluded
2. **Filter actions by permission** - HIDDEN excluded
3. **Filter filters by permission** - HIDDEN excluded
4. **Attach emptyState** - NO_DATA / NO_ACCESS / DISABLED
5. **Never leave UI guessing** - Always returns complete definition

**Empty State Logic:**
- NO_ACCESS → User can see module but has no access
- NOT_CONFIGURED → Module has no columns configured
- NO_DATA → Module configured but no data

---

## 🛣️ Routing Alignment

### Route Structure

```
/sales/contacts → resolves:
  - Module definition (from registry)
  - List contract (from buildModuleListFromRegistry)
  - Empty state (from builder)

/helpdesk/tickets → resolves:
  - Module definition
  - List contract
  - Empty state
```

### Same Shell as Dashboards

**Rule:** List pages use same layout shell as dashboards.

**Benefits:**
- Consistent navigation
- Same permission checks
- Same empty state handling

---

## 📁 Deliverables

### ✅ 1. `module-list.types.ts`
**Location:** `client/src/types/module-list.types.ts`

**Types Defined:**
- `ModuleListDefinition` - Complete list definition
- `ListColumn` - Column definition
- `ListAction` - Action definition
- `ListFilter` - Filter definition
- `ListLayout` - TABLE, BOARD, QUEUE, CARD
- `ColumnDataType` - Data type enum
- `ActionType` - Action type enum
- `FilterType` - Filter type enum

### ✅ 2. `buildModuleListFromRegistry()`
**Location:** `client/src/utils/buildModuleListFromRegistry.ts`

**Features:**
- Builds list from app registry
- Filters by permissions
- Determines empty state
- Returns complete definition

### ✅ 3. Sample Definitions
**Location:** `client/src/utils/module-list.sample.json`

**Samples:**
- Sales Leads (Contacts)
- Helpdesk Tickets
- Read-only user example

---

## ✅ Acceptance Criteria (All Pass)

### ✅ All list pages behave consistently

**Verification:**
- Same structure (columns, actions, filters)
- Same permission logic
- Same empty state handling
- No per-module custom logic

### ✅ Permissions affect columns/actions predictably

**Verification:**
- Same permission → same visibility
- HIDDEN items excluded
- VISIBLE/ENABLED items included
- No UI permission checks

### ✅ Empty states always render meaningfully

**Verification:**
- NO_ACCESS → Clear message
- NOT_CONFIGURED → Configuration CTA
- NO_DATA → Create CTA
- Never blank screens

### ✅ New modules require zero list UI changes

**Verification:**
- Add module to registry → List works automatically
- No UI component changes needed
- No hardcoded lists

### ✅ Marketplace apps "just work"

**Verification:**
- App defines list in registry
- List automatically available
- Same behavior as built-in apps

---

## 🚫 Explicitly Excluded

- ❌ **Custom table logic per module** - Standard contract only
- ❌ **Inline permission checks in components** - Permissions in builder
- ❌ **Ad-hoc empty state logic** - Empty states in builder
- ❌ **UI-specific flags** - No widths, colors, icons in contract

---

## 📖 Usage

### Basic Usage

```typescript
import { buildModuleListFromRegistry } from '@/utils/buildModuleListFromRegistry';
import type { AppRegistry, UserPermissions } from '@/types/sidebar.types';

// 1. Define app registry with module list config
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
        list: {
          layout: 'TABLE',
          columns: [
            {
              key: 'name',
              label: 'Name',
              dataType: 'text',
              sortable: true,
              filterable: true
            }
          ],
          primaryActions: [
            {
              key: 'create',
              label: 'Add Contact',
              type: 'create',
              route: '/contacts/new',
              permission: 'contacts.create'
            }
          ]
        }
      }
    ]
  }
};

// 2. Define user permissions
const userPermissions: UserPermissions = {
  'contacts.view': true,
  'contacts.create': true
};

// 3. Build list definition
const listDefinition = buildModuleListFromRegistry(
  'contacts',
  'SALES',
  appRegistry,
  userPermissions
);

// 4. Use list definition
console.log(listDefinition.columns); // Filtered columns
console.log(listDefinition.primaryActions); // Filtered actions
console.log(listDefinition.emptyState); // Empty state
```

### Adding a New Module

```typescript
// Just add to registry - list works automatically!
const appRegistry = {
  SALES: {
    modules: [
      // ... existing modules
      {
        moduleKey: 'products',
        label: 'Products',
        route: '/products',
        permission: 'products.view',
        list: {
          layout: 'TABLE',
          columns: [
            {
              key: 'name',
              label: 'Product Name',
              dataType: 'text',
              sortable: true
            },
            {
              key: 'price',
              label: 'Price',
              dataType: 'currency',
              sortable: true
            }
          ],
          primaryActions: [
            {
              key: 'create',
              label: 'Add Product',
              type: 'create',
              route: '/products/new',
              permission: 'products.create'
            }
          ]
        }
      }
    ]
  }
};

// List automatically available at /products
const listDefinition = buildModuleListFromRegistry(
  'products',
  'SALES',
  appRegistry,
  userPermissions
);
```

---

## 📊 Column Visibility Rules

### Permission-Based Visibility

**Rule:** Columns are stable, visibility changes.

**Example:**
```typescript
// Column definition (always present)
{
  key: 'assignedTo',
  label: 'Assigned To',
  permission: 'contacts.viewAll',
  visibility: 'HIDDEN' // or 'ENABLED'
}

// User without permission:
// - Column definition exists
// - visibility: 'HIDDEN'
// - Column filtered out by builder

// User with permission:
// - Column definition exists
// - visibility: 'ENABLED'
// - Column included in list
```

---

## 🎬 Action Visibility Rules

### Primary Actions

**Rule:** Filtered by permission, never shown if HIDDEN.

**Example:**
```typescript
// Action definition
{
  key: 'create',
  label: 'Add Contact',
  type: 'create',
  permission: 'contacts.create',
  visibility: 'ENABLED' // or 'HIDDEN'
}

// User without permission:
// - Action filtered out
// - Not in primaryActions array

// User with permission:
// - Action included
// - Shown in header
```

### Row Actions

**Rule:** Same permission logic as primary actions.

**Example:**
```typescript
// Row action
{
  key: 'edit',
  label: 'Edit',
  type: 'edit',
  permission: 'contacts.edit',
  visibility: 'ENABLED'
}

// User without permission:
// - Action filtered out
// - Not in rowActions array

// User with permission:
// - Action included
// - Shown per row
```

---

## 🔍 Filter Visibility Rules

### Permission-Based Filters

**Rule:** Filters follow same permission logic as columns/actions.

**Example:**
```typescript
// Filter definition
{
  key: 'assignedTo',
  label: 'Assigned To',
  type: 'user',
  fieldPath: 'assignedTo',
  permission: 'contacts.viewAll',
  visibility: 'ENABLED'
}

// User without permission:
// - Filter filtered out
// - Not in filters array

// User with permission:
// - Filter included
// - Shown in filter bar
```

---

## 📝 Empty State Rules

### Automatic Determination

**Builder determines empty state based on:**
1. **Module permission** → NO_ACCESS if no permission
2. **Column count** → NOT_CONFIGURED if no columns
3. **Primary actions** → NO_DATA with create CTA if actions exist

**Example:**
```typescript
// NO_ACCESS
{
  type: 'NO_ACCESS',
  title: 'No Access',
  description: 'You don't have permission to view contacts.'
}

// NOT_CONFIGURED
{
  type: 'NOT_CONFIGURED',
  title: 'Module Not Configured',
  description: 'The contacts module has not been configured yet.',
  primaryAction: {
    label: 'Configure Module',
    route: '/settings/modules?module=contacts'
  }
}

// NO_DATA
{
  type: 'NO_DATA',
  title: 'No contacts found',
  description: 'Get started by creating your first contact.',
  primaryAction: {
    label: 'Create contact',
    route: '/contacts/new'
  }
}
```

---

## 📝 Notes

- **Data Contract Only** - No UI assumptions
- **Permission-Aware** - All items filtered by permissions
- **Registry-Driven** - All structure from app registry
- **Consistent** - Same behavior across all modules
- **Extensible** - Easy to add new modules

---

## 🔄 Next Steps (Future)

1. **UI Component** - List renderer component
2. **Data Fetching** - API integration for list data
3. **Sorting/Filtering** - Client/server-side implementation
4. **Pagination** - Pagination component
5. **Bulk Operations** - Bulk action execution

---

**Last Updated:** January 2025  
**Status:** ✅ Contract Complete

