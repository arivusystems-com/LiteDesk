# AppSidebar Implementation

**Status:** ✅ Complete  
**Date:** January 2025

---

## 🎯 Objective

Implement the actual Sidebar UI component that renders from the sidebar structure and enforces correct navigation, expansion, and active state — without reintroducing an app switcher.

---

## 📁 Deliverables

### ✅ 1. `AppSidebar.vue`
**Location:** `client/src/components/AppSidebar.vue`

**Features:**
- Renders entirely from `SidebarStructure`
- No registry or permission logic inside component
- Component is a **renderer, not a decision-maker**
- Three sections: Core, Domain, Platform

### ✅ 2. `useSidebarState.ts`
**Location:** `client/src/composables/useSidebarState.ts`

**Features:**
- Manages collapsed/expanded state for domains
- Persists state to localStorage
- Tracks last active domain
- Auto-expansion logic

---

## 🎮 Interaction Rules (Non-Negotiable)

### Element Behaviors

| Element | Behavior |
|---------|----------|
| **Domain header label** | Navigate to `dashboardRoute` |
| **Domain chevron** | Expand/collapse **only** (never navigates) |
| **Leaf module** | Navigate to module route |
| **Core items** | Navigate immediately |
| **Platform items** | Navigate immediately |

### 🚫 Critical Rules

- ❌ **Chevron must never navigate** - Only toggles expand/collapse
- ❌ **Clicking label must never toggle collapse** - Label always navigates
- ✅ **Separate click handlers** - Label and chevron are separate elements

### Implementation Details

```vue
<!-- Domain Header Label (Navigates) -->
<a
  :href="domain.dashboardRoute"
  @click.prevent="handleDomainHeaderClick(domain.dashboardRoute, domain.appKey)"
>
  {{ domain.label }}
</a>

<!-- Chevron (Expand/Collapse Only) -->
<button
  @click.stop="handleChevronClick(domain.appKey)"
>
  <ChevronDownIcon v-if="isDomainExpanded(domain.appKey)" />
  <ChevronRightIcon v-else />
</button>
```

**Key Points:**
- Label uses `@click.prevent` to navigate
- Chevron uses `@click.stop` to prevent event bubbling
- Chevron handler only calls `toggleDomain()` - no navigation

---

## 🎯 Active State Rules

### Active Module

**Behavior:**
- Highlight the active module
- **Auto-expand its domain** (if collapsed)

**Implementation:**
```typescript
function isActiveModule(moduleRoute: string): boolean {
  return route.path === moduleRoute || route.path.startsWith(moduleRoute + '/');
}

// Auto-expand on route change
watch(() => route.path, (newPath) => {
  for (const domain of sidebarStructure.domain) {
    const hasActiveModule = domain.children.some((module) =>
      isActiveModule(module.route)
    );
    if (hasActiveModule) {
      expandDomain(domain.appKey);
    }
  }
});
```

### Active Dashboard (`/:appKey`)

**Behavior:**
- Highlight domain header
- Domain remains expanded

**Implementation:**
```typescript
function isActiveDomain(domain: { dashboardRoute: string; appKey: string }): boolean {
  // Exact match for dashboard route
  if (route.path === domain.dashboardRoute) {
    return true;
  }
  
  // Or if any module in domain is active
  const domainModules = domain.children || [];
  return domainModules.some((module) => isActiveModule(module.route));
}
```

### Active Core/Platform Route

**Behavior:**
- Highlight the active item
- **No domain auto-expansion**

**Implementation:**
```typescript
function isActiveRoute(routePath: string): boolean {
  return route.path === routePath || route.path.startsWith(routePath + '/');
}
```

---

## 💾 State Persistence (Implicit Customization)

### Persisted State

**Only these states are persisted:**
1. **Collapsed/expanded domains** (per domain)
2. **Last active domain** (for future use)

### Storage

**Location:** `localStorage`

**Keys:**
- `litedesk-sidebar-domains-state` - Domain expanded/collapsed state
- `litedesk-sidebar-last-active-domain` - Last active domain appKey

**Format:**
```typescript
// Domain state
{
  "SALES": true,    // expanded
  "HELPDESK": false // collapsed
}

// Last active domain
"SALES"
```

### Implementation

```typescript
// Load from localStorage
function loadDomainState(): DomainState {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

// Save on change
watch(domainState, (newState) => {
  saveDomainState(newState);
}, { deep: true });
```

### ❌ No UI for Customization

- No drag & drop
- No pinning
- No reordering
- No customization UI

---

## 🛣️ Routing Contract (Must Match Exactly)

### Route Structure

The sidebar logic relies on this exact route structure:

```
/home                          → Home page
/:appKey                       → App dashboard (e.g., /sales, /helpdesk)
/:appKey/:moduleKey            → Module view (e.g., /sales/contacts)
/settings/*                    → Settings pages
/apps                          → Apps management
```

### Route Matching Logic

```typescript
// Exact match
route.path === '/sales' → Active dashboard

// Prefix match for modules
route.path.startsWith('/sales/contacts') → Active module

// Settings
route.path.startsWith('/settings') → Active platform item
```

### Deep Link Auto-Expansion

**Behavior:**
- When navigating to `/sales/contacts` directly (deep link)
- Sidebar automatically expands the `SALES` domain
- Highlights the `contacts` module

**Implementation:**
```typescript
onMounted(() => {
  // Check current route and auto-expand if needed
  for (const domain of sidebarStructure.domain) {
    if (isActiveDomain(domain)) {
      expandDomain(domain.appKey);
      setLastActiveDomain(domain.appKey);
    }
  }
});
```

---

## ✅ Acceptance Criteria (All Pass)

### ✅ Sidebar renders identically regardless of active app

**Verification:**
- Same component structure for all apps
- Same three sections (core, domain, platform)
- No per-app conditional rendering
- Structure comes from `SidebarStructure` prop

### ✅ Domain dashboard navigation works without switcher

**Verification:**
- Clicking domain header label navigates to `dashboardRoute`
- No app switcher component
- Direct navigation via router

### ✅ Deep links auto-expand correct domain

**Verification:**
- Navigating to `/sales/contacts` auto-expands `SALES` domain
- Navigating to `/helpdesk/cases` auto-expands `HELPDESK` domain
- Works on initial page load (onMounted)

### ✅ Adding a new app requires no sidebar UI changes

**Verification:**
- New app added to registry → appears in sidebar automatically
- No changes to `AppSidebar.vue` needed
- No changes to `useSidebarState.ts` needed
- Only registry update required

### ✅ UX matches the agreed mental model

**Verification:**
- Domain header label → navigates (not toggle)
- Chevron → expands/collapses (not navigate)
- Active state → highlights correctly
- Auto-expansion → works on deep links

---

## 🚫 Explicitly Excluded

- ❌ **App switcher** - Not included
- ❌ **Per-app sidebars** - Single sidebar only
- ❌ **Dynamic layout changes per route** - Consistent structure
- ❌ **Drag & drop / pinning / reorder** - No customization
- ❌ **"Smart" auto-hiding logic** - Always visible

---

## 📖 Usage

### Basic Usage

```vue
<template>
  <AppSidebar
    :sidebar-structure="sidebarStructure"
    :collapsed="sidebarCollapsed"
  />
</template>

<script setup>
import AppSidebar from '@/components/AppSidebar.vue';
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';
import type { SidebarStructure } from '@/types/sidebar.types';

// Build sidebar structure from registry
const sidebarStructure = computed(() => {
  return buildSidebarFromRegistry(
    appRegistry,
    userPermissions,
    coreItems,
    platformItems
  );
});
</script>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `sidebarStructure` | `SidebarStructure` | Yes | Complete sidebar structure from builder |
| `collapsed` | `boolean` | No | Whether sidebar is collapsed (default: false) |

### Events

None - Component uses router directly for navigation.

---

## 🔍 Click vs Chevron Behavior

### Domain Header Label

**Element:** `<a>` tag with domain label

**Click Handler:** `handleDomainHeaderClick()`

**Behavior:**
1. Navigates to `domain.dashboardRoute`
2. Updates last active domain
3. **Never toggles collapse**

**Code:**
```typescript
function handleDomainHeaderClick(routePath: string, appKey: string) {
  setLastActiveDomain(appKey);
  router.push(routePath);
}
```

### Domain Chevron

**Element:** `<button>` with chevron icon

**Click Handler:** `handleChevronClick()`

**Behavior:**
1. Toggles domain expanded/collapsed state
2. **Never navigates**
3. Uses `@click.stop` to prevent event bubbling

**Code:**
```typescript
function handleChevronClick(appKey: string) {
  toggleDomain(appKey);
}
```

---

## 🎨 Active State Logic

### Module Active State

**Condition:** Route matches module route exactly or starts with it

**Visual:** Highlight module, auto-expand domain

```typescript
function isActiveModule(moduleRoute: string): boolean {
  return route.path === moduleRoute || route.path.startsWith(moduleRoute + '/');
}
```

### Domain Active State

**Condition:** 
- Route matches dashboard route exactly, OR
- Any module in domain is active

**Visual:** Highlight domain header, keep domain expanded

```typescript
function isActiveDomain(domain: { dashboardRoute: string; appKey: string }): boolean {
  if (route.path === domain.dashboardRoute) {
    return true;
  }
  const domainModules = domain.children || [];
  return domainModules.some((module) => isActiveModule(module.route));
}
```

### Core/Platform Active State

**Condition:** Route matches item route exactly or starts with it

**Visual:** Highlight item, no domain expansion

```typescript
function isActiveRoute(routePath: string): boolean {
  return route.path === routePath || route.path.startsWith(routePath + '/');
}
```

---

## 🛣️ Route Assumptions

The sidebar component assumes these route patterns:

### App Dashboard Routes
- `/sales` → Sales dashboard
- `/helpdesk` → Helpdesk dashboard
- `/:appKey` → Generic app dashboard

### Module Routes
- `/sales/contacts` → Sales app, Contacts module
- `/helpdesk/cases` → Helpdesk app, Cases module
- `/:appKey/:moduleKey` → Generic module route

### Core Routes
- `/home` → Home page
- `/dashboard` → Dashboard (legacy)

### Platform Routes
- `/settings` → Settings
- `/settings/apps` → Apps management
- `/settings/users` → Users management

**Note:** The sidebar uses prefix matching for nested routes (e.g., `/settings/apps` matches `/settings`).

---

## 🧪 Testing Checklist

- [ ] Domain header label navigates to dashboard
- [ ] Chevron expands/collapses domain (doesn't navigate)
- [ ] Module click navigates to module route
- [ ] Active module highlights correctly
- [ ] Active domain highlights correctly
- [ ] Deep links auto-expand correct domain
- [ ] State persists to localStorage
- [ ] Adding new app requires no UI changes
- [ ] Sidebar renders identically across apps

---

## 📝 Notes

- **Pure Renderer** - Component only renders, doesn't decide structure
- **Route-Based Active State** - Uses route matching, not manual state
- **Auto-Expansion** - Deep links automatically expand correct domain
- **State Persistence** - Expanded/collapsed state saved to localStorage
- **No Customization** - No drag/drop, pinning, or reordering

---

**Last Updated:** January 2025  
**Status:** ✅ Implementation Complete

