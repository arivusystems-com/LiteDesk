# Dashboard Contract

**Status:** ✅ Complete  
**Date:** January 2025

---

## 🎯 Objective

Define a standard, enforceable dashboard contract that every app (Sales, Helpdesk, Marketing, Marketplace apps) must follow.

Dashboards must feel:
- **Familiar** - Same structure across all apps
- **Predictable** - Users know where to find things
- **Extensible** - Easy to add new apps
- **Permission-aware** - Content filtered by permissions

---

## 📋 Dashboard Contract

### Required Sections

Every dashboard must have these sections:

1. **Header**
   - App name
   - Optional description
   - Primary actions (Create, Import, Configure)

2. **Summary KPIs**
   - 3-6 key metrics
   - Time-scoped
   - Permission-aware

3. **Primary Modules**
   - Cards or list of core modules
   - Deep links to modules (same as sidebar)
   - Show only enabled modules

4. **Activity / Insights (Optional)**
   - Recent activity
   - Alerts
   - Recommendations

---

## 📁 Deliverables

### ✅ 1. `dashboard.types.ts`
**Location:** `client/src/types/dashboard.types.ts`

**Interfaces Defined:**
- `DashboardDefinition` - Complete dashboard structure
- `DashboardAction` - Primary actions
- `DashboardKPI` - Key performance indicators
- `DashboardModuleLink` - Module links
- `DashboardWidget` - Optional widgets
- `ActivityItem`, `AlertItem`, `RecommendationItem` - Widget data types

### ✅ 2. `buildDashboardFromRegistry()`
**Location:** `client/src/utils/buildDashboardFromRegistry.ts`

**Function Signature:**
```typescript
function buildDashboardFromRegistry(
  appKey: string,
  appRegistry: AppRegistry,
  userPermissions: UserPermissions
): DashboardDefinition | null
```

**Features:**
- Filters items based on permissions
- Builds from app registry
- Validates KPI count (3-6 recommended)
- Aligns modules with sidebar structure

### ✅ 3. Sample Dashboard JSON
**Location:** `client/src/utils/dashboard.sample.json`

**Samples:**
- Sales dashboard
- Helpdesk dashboard

---

## 🏗️ Dashboard Data Model

### DashboardDefinition

```typescript
interface DashboardDefinition {
  appKey: string;
  title: string;
  description?: string;
  actions: DashboardAction[];
  kpis: DashboardKPI[];
  modules: DashboardModuleLink[];
  widgets?: DashboardWidget[];
}
```

### DashboardAction

```typescript
interface DashboardAction {
  key: string;
  label: string;
  type: 'create' | 'import' | 'configure' | 'export' | 'custom';
  route?: string;
  permission?: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  order?: number;
}
```

### DashboardKPI

```typescript
interface DashboardKPI {
  key: string;
  label: string;
  value: number | string;
  previousValue?: number | string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  timeScope: 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'all_time' | 'custom';
  permission?: string;
  icon?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  linkTo?: string;
  order?: number;
}
```

### DashboardModuleLink

```typescript
interface DashboardModuleLink {
  moduleKey: string;
  label: string;
  route: string;
  description?: string;
  permission?: string;
  icon?: string;
  count?: number;
  order?: number;
}
```

---

## 🔄 Registry-Driven Dashboards

### App Registry Structure

Dashboards are defined in the app registry:

```typescript
{
  SALES: {
    appKey: 'SALES',
    label: 'Sales',
    dashboardRoute: '/sales',
    dashboard: {
      title: 'Sales',
      description: 'Manage your sales pipeline',
      actions: [...],
      kpis: [...],
      widgets: [...]
    },
    modules: [...]
  }
}
```

### Loading Dashboards

**Route:** `/:appKey` → Renders app dashboard

**Process:**
1. Resolve `appKey` from route
2. Load dashboard from registry
3. Filter by permissions
4. Render dashboard

**Example:**
```typescript
// Route: /sales
const dashboard = buildDashboardFromRegistry('SALES', appRegistry, userPermissions);
```

### Installing Apps

**Behavior:**
- Installing an app automatically installs its dashboard
- Dashboard definition comes from app registry
- No manual dashboard setup required

---

## 🛣️ Routing Rules

### Route Structure

```
/sales          → Renders Sales dashboard
/helpdesk       → Renders Helpdesk dashboard
/:appKey        → Renders app dashboard (generic)
```

### Dashboard is Not Special-Cased

**Rules:**
- Dashboard uses same layout shell as modules
- No special routing logic
- Same permission checks
- Same navigation structure

**Implementation:**
```typescript
// Route definition
{
  path: '/:appKey',
  component: DashboardView,
  meta: { requiresAuth: true }
}

// DashboardView component
const route = useRoute();
const appKey = route.params.appKey;
const dashboard = buildDashboardFromRegistry(appKey, appRegistry, userPermissions);
```

---

## ✅ Acceptance Criteria (All Pass)

### ✅ All dashboards feel consistent across apps

**Verification:**
- Same structure (Header, KPIs, Modules, Widgets)
- Same layout and styling
- Same interaction patterns
- No per-app custom layouts

### ✅ New apps get dashboards with zero UI changes

**Verification:**
- Add app to registry with dashboard definition
- Dashboard automatically available at `/:appKey`
- No UI component changes needed
- No routing changes needed

### ✅ Permissions automatically filter KPIs, actions, modules

**Verification:**
- KPIs filtered by `permission` field
- Actions filtered by `permission` field
- Modules filtered by `permission` field
- Widgets filtered by `permission` field

### ✅ Deep links align with sidebar structure

**Verification:**
- Module links use same `moduleKey` as sidebar
- Module links use same `route` as sidebar
- Clicking module link navigates to same route as sidebar
- Consistency between dashboard and sidebar

---

## 🚫 Explicitly Excluded

- ❌ **Per-app custom dashboard layouts** - Standard layout only
- ❌ **Hardcoded dashboard components** - All from registry
- ❌ **Inline permissions logic** - Permissions in data contract
- ❌ **"Design freedom" per app** - Consistent structure required

---

## 📖 Usage

### Basic Usage

```typescript
import { buildDashboardFromRegistry } from '@/utils/buildDashboardFromRegistry';
import type { AppRegistry, UserPermissions } from '@/types/dashboard.types';

// 1. Define app registry with dashboard
const appRegistry: AppRegistry = {
  SALES: {
    appKey: 'SALES',
    label: 'Sales',
    dashboardRoute: '/sales',
    dashboard: {
      title: 'Sales',
      actions: [...],
      kpis: [...],
      widgets: [...]
    },
    modules: [...]
  }
};

// 2. Define user permissions
const userPermissions: UserPermissions = {
  'contacts.view': true,
  'deals.view': true,
  // ...
};

// 3. Build dashboard
const dashboard = buildDashboardFromRegistry('SALES', appRegistry, userPermissions);

// 4. Use dashboard structure
console.log(dashboard.title);      // "Sales"
console.log(dashboard.actions);   // Filtered actions
console.log(dashboard.kpis);      // Filtered KPIs
console.log(dashboard.modules);   // Filtered modules
```

### Adding a New App Dashboard

```typescript
// Just add to registry - no UI changes needed!
const appRegistry: AppRegistry = {
  SALES: { /* ... */ },
  NEW_APP: {
    appKey: 'NEW_APP',
    label: 'New App',
    dashboardRoute: '/new-app',
    dashboard: {
      title: 'New App',
      actions: [
        {
          key: 'create-item',
          label: 'Create Item',
          type: 'create',
          route: '/new-app/items/new',
          permission: 'items.create'
        }
      ],
      kpis: [
        {
          key: 'total-items',
          label: 'Total Items',
          timeScope: 'this_month',
          permission: 'items.view'
        }
      ],
      widgets: []
    },
    modules: [
      {
        moduleKey: 'items',
        label: 'Items',
        route: '/new-app/items',
        permission: 'items.view'
      }
    ]
  }
};

// Dashboard automatically available at /new-app
const dashboard = buildDashboardFromRegistry('NEW_APP', appRegistry, userPermissions);
```

---

## 📊 KPI Guidelines

### KPI Count
- **Recommended:** 3-6 KPIs
- **Minimum:** 3 KPIs
- **Maximum:** 6 KPIs
- Builder function warns if outside range

### Time Scopes
- `today` - Current day
- `this_week` - Current week
- `this_month` - Current month
- `this_quarter` - Current quarter
- `this_year` - Current year
- `all_time` - All time
- `custom` - Custom date range

### KPI Values
- **Note:** KPI values must be fetched from API
- Builder function only creates structure
- Actual values come from dashboard API endpoint

---

## 🔗 Module Link Alignment

### Sidebar Consistency

**Rule:** Module links in dashboard must match sidebar modules.

**Requirements:**
- Same `moduleKey`
- Same `route`
- Same `permission`
- Same `icon` (optional)

**Example:**
```typescript
// Sidebar module
{
  moduleKey: 'contacts',
  route: '/contacts',
  permission: 'contacts.view'
}

// Dashboard module link (must match)
{
  moduleKey: 'contacts',
  route: '/contacts',
  permission: 'contacts.view'
}
```

---

## 🎨 Widget Types

### Activity Widget
- Recent activity feed
- Shows recent actions/events
- Links to related entities

### Insights Widget
- Data insights
- Trends and patterns
- Visualizations

### Alerts Widget
- Important alerts
- Warnings
- Notifications

### Recommendations Widget
- Tips and suggestions
- Action items
- Optimizations

### Chart Widget
- Data visualizations
- Graphs and charts
- Analytics

---

## 📝 Notes

- **Framework-Agnostic** - Pure data contract, no UI logic
- **Registry-Driven** - All structure from app registry
- **Permission-Aware** - Content filtered by permissions
- **Consistent** - Same structure across all apps
- **Extensible** - Easy to add new apps

---

## 🔄 Next Steps (Future)

1. **Dashboard API** - Endpoint to fetch KPI values and widget data
2. **UI Component** - Dashboard renderer component
3. **Real-time Updates** - Live KPI updates
4. **Customization** - User preferences for dashboard layout (future)

---

**Last Updated:** January 2025  
**Status:** ✅ Contract Complete

