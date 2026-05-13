# Sidebar Content: What Should Appear

**Date:** January 2025  
**Based on:** Platform Contracts & App Registry

---

## 📋 Sidebar Structure (Three Sections)

The sidebar is built from `buildSidebarFromRegistry()` and has exactly **three sections**:

### 1. **Core Section** (Currently Empty)
- **Purpose:** Global, non-collapsible items available across all apps
- **Current State:** Empty (no coreItems passed to builder)
- **Could Include:**
  - Dashboard (if you want a global dashboard)
  - Search
  - Recent items
- **Note:** Currently not populated, so this section won't appear

### 2. **Domain Section** (Apps with Modules) ✅
- **Purpose:** Application domains with their modules
- **Structure:** 
  - Domain header (clickable → navigates to app dashboard)
  - Modules as children (nested under domain)

**What Should Appear:**
Based on your app registry (from `/api/ui/apps`), you should see:

#### **SALES App** (if enabled and user has access)
- **Domain Header:** "Sales" (clickable → `/dashboard` or `/sales`)
  - **Modules:**
    - People (`/people`) - if user has `people.view` or `contacts.view`
    - Organizations (`/organizations`) - if user has `organizations.view`
    - Deals (`/deals`) - if user has `deals.view`
    - Tasks (`/tasks`) - if user has `tasks.view`
    - Events (`/events`) - if user has `events.view`
    - Items (`/items`) - if user has `items.view`
    - Forms (`/forms`) - if user has `forms.view`
    - Imports (`/imports`) - if user has `imports.view`

#### **HELPDESK App** (if enabled and user has access)
- **Domain Header:** "Helpdesk" (clickable → `/helpdesk`)
  - **Modules:**
    - Cases (`/helpdesk/cases`) - if user has `cases.view`
    - Tasks (`/helpdesk/tasks`) - if user has `tasks.view`
    - People (`/helpdesk/people`) - if user has `people.view`

#### **PROJECTS App** (if enabled and user has access)
- **Domain Header:** "Projects" (clickable → `/projects`)
  - **Modules:**
    - Projects (`/projects/projects`) - if user has `projects.view`
    - Tasks (`/projects/tasks`) - if user has `tasks.view`
    - Events (`/projects/events`) - if user has `events.view`

#### **AUDIT App** (if enabled and user has access)
- **Domain Header:** "Audit" (clickable → `/audit/dashboard`)
  - **Modules:**
    - Assignments (`/audit/assignments`) - if user has `audit.assignments.view`
    - Cases (`/audit/cases`) - if user has `cases.view`
    - Tasks (`/audit/tasks`) - if user has `tasks.view`

#### **PORTAL App** (if enabled and user has access)
- **Domain Header:** "Portal" (clickable → `/portal/dashboard`)
  - **Modules:**
    - Profile (`/portal/profile`) - if user has `portal.profile.view`
    - Orders (`/portal/orders`) - if user has `portal.orders.view`

### 3. **Platform Section** (Governance) ✅
- **Purpose:** System administration and governance
- **Default Items:**
  1. **Settings** (`/settings`) - if user has `settings.view`
  2. **Apps** (`/settings/apps`) - if user has `apps.view`
  3. **Users** (`/settings/users`) - if user has `users.view`

---

## 🔍 How to Verify What Should Appear

### Step 1: Check App Registry
```javascript
// In browser console after login:
// The sidebar fetches from /api/ui/apps
// Check what apps are returned
```

### Step 2: Check User Permissions
```javascript
// Check user's permissions
authStore.user.permissions
// Should have structure like:
// {
//   contacts: { view: true, create: false, ... },
//   deals: { view: true, ... },
//   ...
// }
```

### Step 3: Check Sidebar Structure
```javascript
// In Nav.vue component, check:
sidebarStructure.value
// Should have:
// {
//   core: [],
//   domain: [
//     {
//       appKey: 'SALES',
//       label: 'Sales',
//       dashboardRoute: '/dashboard',
//       children: [
//         { moduleKey: 'people', label: 'People', route: '/people', ... },
//         ...
//       ]
//     },
//     ...
//   ],
//   platform: [
//     { key: 'settings', label: 'Settings', route: '/settings', ... },
//     ...
//   ]
// }
```

---

## ✅ Expected Sidebar Content (Example)

For a typical Sales user with full permissions:

```
┌─────────────────────────┐
│  Logo                   │
├─────────────────────────┤
│                         │
│  SALES                  │ ← Domain Header (clickable)
│    ├─ People            │
│    ├─ Organizations     │
│    ├─ Deals             │
│    ├─ Tasks             │
│    ├─ Events            │
│    ├─ Items             │
│    ├─ Forms             │
│    └─ Imports           │
│                         │
│  ─────────────────────  │
│                         │
│  Settings               │ ← Platform Section
│  Apps                   │
│  Users                  │
│                         │
├─────────────────────────┤
│  🔔 Notifications        │
│  👤 User Menu           │
└─────────────────────────┘
```

---

## 🚨 Common Issues

### Issue 1: Empty Sidebar
**Possible Causes:**
- App registry not loading (`/api/ui/apps` failing)
- User has no permissions
- No apps enabled for organization
- Modules not configured

**Check:**
```javascript
// In console:
console.log('App Registry:', appRegistry.value);
console.log('Sidebar Structure:', sidebarStructure.value);
console.log('User Permissions:', authStore.user?.permissions);
```

### Issue 2: Only Platform Section Visible
**Possible Causes:**
- User has no app access
- Apps not enabled for organization
- Permission snapshot has no permissions

**Check:**
```javascript
// Check if apps are enabled:
authStore.user?.organization?.enabledApps
// Should be: ['SALES', 'HELPDESK', ...]

// Check user app access:
authStore.user?.allowedApps
// Should be: ['SALES', 'HELPDESK', ...]
```

### Issue 3: Modules Missing
**Possible Causes:**
- User lacks module permissions
- Modules not configured in app registry
- Module fetch failing (`/api/ui/apps/{appKey}/modules`)

**Check:**
```javascript
// Check module permissions:
authStore.can('people', 'view')  // Should return true/false
authStore.can('deals', 'view')
```

---

## 📊 Current Implementation Status

### ✅ What's Working
- Sidebar structure built from registry
- Permission filtering
- Domain section (apps with modules)
- Platform section (Settings, Apps, Users)

### ⚠️ What's Missing
- **Core Section:** Currently empty (no coreItems passed)
- **Icon Mapping:** All items show HomeIcon (need icon resolution)
- **Domain Expansion:** Domains always expanded (no collapse state)

---

## 🔧 How to Debug

### 1. Check Browser Console
Look for:
- `[getAppRegistry]` logs
- `[Nav] Error building sidebar` errors
- `[AppShell]` logs about apps/modules

### 2. Check Network Tab
Verify these API calls succeed:
- `GET /api/ui/apps` - Should return array of apps
- `GET /api/ui/apps/{appKey}/modules` - Should return modules for each app

### 3. Check Sidebar Structure
Add temporary console.log in Nav.vue:
```javascript
watch(sidebarStructure, (newVal) => {
  console.log('Sidebar Structure:', newVal);
}, { deep: true });
```

---

## 📝 Summary

**What Should Be in Sidebar:**

1. **Domain Section:**
   - All enabled apps (SALES, HELPDESK, PROJECTS, AUDIT, PORTAL)
   - Each app shows as a clickable header
   - Modules nested under each app (filtered by permissions)

2. **Platform Section:**
   - Settings (`/settings`)
   - Apps (`/settings/apps`)
   - Users (`/settings/users`)

3. **Core Section:**
   - Currently empty (not configured)

**If sidebar is empty or missing items:**
- Check app registry API response
- Check user permissions
- Check module configuration
- Check browser console for errors

---

**Status:** ✅ Sidebar structure defined  
**Next Steps:** Verify API responses and permission snapshots

