# AppSidebar Quick Reference

**Quick guide for understanding and using the AppSidebar component.**

---

## 🎯 Core Principles

1. **Pure Renderer** - Component only renders `SidebarStructure`, doesn't decide structure
2. **Route-Based Active State** - Uses route matching, not manual state
3. **Separate Click Handlers** - Label navigates, chevron expands/collapses

---

## 🖱️ Click Behaviors

### Domain Header Label
- **Action:** Navigate to `dashboardRoute`
- **Handler:** `handleDomainHeaderClick()`
- **Never:** Toggles collapse

### Domain Chevron
- **Action:** Expand/collapse domain
- **Handler:** `handleChevronClick()`
- **Never:** Navigates

### Module Link
- **Action:** Navigate to module route
- **Handler:** `handleModuleClick()`
- **Side Effect:** Auto-expands domain if collapsed

### Core/Platform Item
- **Action:** Navigate immediately
- **Handler:** `handleCoreClick()` / `handlePlatformClick()`

---

## 🎨 Active State Logic

### Module Active
- **Condition:** `route.path === module.route || route.path.startsWith(module.route + '/')`
- **Visual:** Highlight module
- **Behavior:** Auto-expand domain

### Domain Active
- **Condition:** Dashboard route matches OR any module in domain is active
- **Visual:** Highlight domain header
- **Behavior:** Domain remains expanded

### Core/Platform Active
- **Condition:** Route matches item route
- **Visual:** Highlight item
- **Behavior:** No domain expansion

---

## 🛣️ Route Assumptions

```
/home                    → Home
/:appKey                 → App dashboard (e.g., /sales)
/:appKey/:moduleKey      → Module view (e.g., /sales/contacts)
/settings/*              → Settings pages
/apps                    → Apps management
```

---

## 💾 State Persistence

**Storage:** `localStorage`

**Keys:**
- `litedesk-sidebar-domains-state` - `{ "SALES": true, "HELPDESK": false }`
- `litedesk-sidebar-last-active-domain` - `"SALES"`

**Auto-Save:** On any domain state change

---

## 📝 Usage Example

```vue
<template>
  <AppSidebar
    :sidebar-structure="sidebarStructure"
    :collapsed="false"
  />
</template>

<script setup>
import AppSidebar from '@/components/AppSidebar.vue';
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';

const sidebarStructure = computed(() => {
  return buildSidebarFromRegistry(
    appRegistry,
    userPermissions
  );
});
</script>
```

---

## ✅ Checklist

- [x] Domain header label navigates (not toggle)
- [x] Chevron expands/collapses (not navigate)
- [x] Active module highlights correctly
- [x] Deep links auto-expand domain
- [x] State persists to localStorage
- [x] No app switcher
- [x] No customization UI

---

**Last Updated:** January 2025

