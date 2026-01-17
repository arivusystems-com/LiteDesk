# Empty State & Onboarding Contract

**Status:** ✅ Complete  
**Date:** January 2025

---

## 🎯 Objective

Define standard empty state and onboarding contracts so that:
- No screen is ever blank
- Permission changes never feel broken
- New users always know “what to do next”

Applies to:
- Dashboards
- Modules
- Lists / tables
- KPIs / widgets
- Entire domains with no active modules

Core principle: **Empty is a state — not an error.**  
Every empty state must answer: **“What should I do next?”**

---

## 1️⃣ Empty State Types

Defined in `client/src/types/empty-state.types.ts`:

```ts
enum EmptyStateType {
  NO_ACCESS     // User can see app shell but has no access to data
  NOT_CONFIGURED// App/feature installed but not configured or modules disabled
  NO_DATA       // Feature enabled and accessible, but no records yet
  DISABLED      // Feature explicitly disabled at org/app level
  FIRST_TIME    // First-time experience for a user/app
}
```

---

## 2️⃣ Empty State Data Contract (Data, Not UI)

Also in `empty-state.types.ts`:

```ts
interface EmptyStateAction {
  label: string;
  route?: string;
  permission?: string; // primary only
}

interface EmptyStateDefinition {
  type: EmptyStateType;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}
```

**No components. No visuals. Data only.**  
Renderers consume these structures and decide how to show them.

---

## 3️⃣ Where Empty States Apply

### Dashboards

- **App visible, no modules enabled** → `NOT_CONFIGURED`
- **First-time user** → `FIRST_TIME` (decided by API / higher-level logic)
- **User can see app shell but no effective access** → `NO_ACCESS`

### Modules / Lists / Tables

- **No records** → `NO_DATA`
- **Feature disabled** → `DISABLED`
- **User has no permission to view module** → `NO_ACCESS`

### KPIs / Widgets

- **No permission** → treat KPI/widget as `HIDDEN` (from permission contract)
- **Feature disabled** → `DISABLED` empty state if needed

---

## 4️⃣ Registry-Driven Defaults

Dashboards can optionally define empty states in the app registry (see `dashboard.types.ts`):

```ts
dashboard: {
  title: string;
  // ...
  emptyStates?: {
    [key in EmptyStateType]?: EmptyStateDefinition;
  };
}
```

If not provided, **platform defaults are used** by the builder.

Example (NOT_CONFIGURED override):

```ts
emptyStates: {
  NOT_CONFIGURED: {
    type: 'NOT_CONFIGURED',
    title: 'Sales app not configured',
    description: 'Enable at least one module to start using Sales.',
    primaryAction: {
      label: 'Enable modules',
      route: '/settings/apps?app=SALES',
      permission: 'apps.manage'
    }
  }
}
```

---

## 5️⃣ Builder Responsibility (No UI Guessing)

### `buildDashboardFromRegistry`

Location: `client/src/utils/buildDashboardFromRegistry.ts`

Responsibilities:
- Apply permission outcomes (via `PermissionOutcome`)
- Decide if a dashboard-level empty state applies
- Attach `emptyState?: EmptyStateDefinition` to `DashboardDefinition`

Logic (simplified):
- If **no enabled modules** → `NOT_CONFIGURED` (use registry override if present, else platform default)
- Else if **no enabled actions/KPIs/widgets** → `NO_ACCESS` (registry override or default)
- Other types (`FIRST_TIME`, `NO_DATA`, `DISABLED`) are handled at API/module-level builders.

UI **must not** infer empty states with `if list.length === 0` logic.  
It simply renders `dashboard.emptyState` if present.

### Modules / Lists

Future module/list builders will:
- Decide between `NO_DATA`, `DISABLED`, `NO_ACCESS`, `FIRST_TIME`
- Provide `EmptyStateDefinition` alongside data
- Keep all empty-state reasoning out of components

---

## 6️⃣ Explicitly Excluded

- ❌ Ad-hoc `if list.length === 0` UI logic
- ❌ Per-app custom empty visuals (data contract is shared)
- ❌ Silent blank screens
- ❌ Hardcoded onboarding copy in components

All behavior flows from:
- Permission visibility contract (`PermissionOutcome`)
- Empty state contract (`EmptyStateType`, `EmptyStateDefinition`)
- Registry configuration and builders

---

## 7️⃣ Sample Outputs

### Sales with No Modules (NOT_CONFIGURED)

```json
{
  "appKey": "SALES",
  "title": "Sales",
  "modules": [],
  "actions": [],
  "kpis": [],
  "widgets": [],
  "emptyState": {
    "type": "NOT_CONFIGURED",
    "title": "App not configured yet",
    "description": "This app is installed but no modules are enabled. Configure modules to get started.",
    "primaryAction": {
      "label": "Configure app",
      "route": "/settings/apps?app=SALES"
    }
  }
}
```

### Helpdesk with No Tickets (NO_DATA at list level)

Dashboard:

```json
{
  "appKey": "HELPDESK",
  "title": "Helpdesk",
  "modules": [
    { "moduleKey": "tickets", "route": "/helpdesk/tickets", "visibility": "ENABLED" }
  ],
  "emptyState": null
}
```

Tickets list builder (future):

```json
{
  "records": [],
  "emptyState": {
    "type": "NO_DATA",
    "title": "No tickets yet",
    "description": "You haven't received any helpdesk tickets yet.",
    "primaryAction": {
      "label": "Create a test ticket",
      "route": "/helpdesk/tickets/new",
      "permission": "tickets.create"
    }
  }
}
```

### Read-Only User (NO_ACCESS)

```json
{
  "appKey": "SALES",
  "title": "Sales",
  "modules": [
    { "moduleKey": "deals", "route": "/deals", "visibility": "ENABLED" }
  ],
  "actions": [],
  "kpis": [],
  "widgets": [],
  "emptyState": {
    "type": "NO_ACCESS",
    "title": "You do not have access to this dashboard",
    "description": "Your current role does not grant access to this app’s data. Contact your administrator if you believe this is a mistake."
  }
}
```

---

## 8️⃣ Acceptance Criteria

- **No blank screens anywhere**
- **Empty states are explainable and consistent**
- **Permissions never feel like bugs**
- **Onboarding paths are obvious**
- **Marketplace apps inherit sane defaults**

---

**Last Updated:** January 2025  
**Status:** ✅ Empty State Contract Implemented


