# Phase 0D — Dynamic Sidebar Verification Guide

**How to verify the dynamic sidebar is rendering correctly**

---

## 🔍 Quick Verification Checklist

### ✅ Signs Dynamic Sidebar is Working

1. **Browser Console Logs:**
   - Look for: `"Loading UI metadata..."`
   - Look for: `"[AppShell] UI metadata loaded"`

2. **Network Tab:**
   - Request to `/api/ui/sidebar` should succeed (200 status)
   - Response should contain apps and modules array

3. **Vue DevTools:**
   - Pinia store `appShell` should have:
     - `availableApps` array (not empty)
     - `sidebarModules` array (not empty)
     - `isLoaded: true`

4. **Visual Check:**
   - Sidebar should show modules in correct order
   - Icons should match module definitions
   - Routes should work when clicked

---

## 📋 Step-by-Step Verification

### Step 1: Start the Application

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd client
npm run dev
```

**Expected:**
- Backend: `Server running on http://localhost:3000`
- Frontend: `Local: http://localhost:5173/`

---

### Step 2: Open Browser DevTools

1. Open `http://localhost:5173` in browser
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to **Console** tab
4. Go to **Network** tab (keep it open)

---

### Step 3: Login to Application

1. Login with your credentials
2. **Watch the Console tab** - you should see:

```
Loading UI metadata...
[AppShell] Loading UI metadata...
```

3. **Watch the Network tab** - you should see a request:
   - **URL:** `/api/ui/sidebar`
   - **Method:** `GET`
   - **Status:** `200 OK`

4. **Click on the request** to see response:
   ```json
   {
     "success": true,
     "data": {
       "apps": [
         {
           "appKey": "CRM",
           "name": "CRM",
           "modules": [
             {
               "moduleKey": "people",
               "label": "Person",
               "routeBase": "/people",
               ...
             },
             ...
           ]
         }
       ]
     }
   }
   ```

---

### Step 4: Check Vue DevTools (Pinia Store)

1. Install Vue DevTools browser extension (if not installed)
2. Open Vue DevTools panel
3. Go to **Pinia** tab
4. Find **`appShell`** store
5. Check the state:

**✅ Dynamic UI Working:**
```javascript
{
  availableApps: [
    {
      appKey: "CRM",
      name: "CRM",
      icon: "💼",
      defaultRoute: "/dashboard",
      ...
    }
  ],
  activeApp: "CRM",
  sidebarModules: [
    { moduleKey: "people", label: "Person", routeBase: "/people", ... },
    { moduleKey: "organizations", label: "Organization", routeBase: "/organizations", ... },
    ...
  ],
  isLoaded: true,  // ← This should be true!
  loading: false,
  error: null
}
```

**❌ Dynamic UI NOT Working (Fallback to Hardcoded):**
```javascript
{
  availableApps: [],
  activeApp: null,
  sidebarModules: [],
  isLoaded: false,  // ← This would be false
  loading: false,
  error: "..." // ← Might have error message
}
```

---

### Step 5: Visual Verification

#### Check Sidebar Content

**✅ Dynamic Sidebar (Working):**
- Modules appear in this order:
  1. Person (`/people`)
  2. Organization (`/organizations`)
  3. Deal (`/deals`)
  4. Task (`/tasks`)
  5. Event (`/events`)
  6. Item (`/items`)
  7. Form (`/forms`)
  8. Import (`/imports`)

- Icons match module definitions
- Clicking modules navigates to correct routes
- App Switcher appears (if multiple apps enabled)

**❌ Hardcoded Sidebar (Fallback):**
- Modules might be in different order
- Might include modules not in metadata
- No App Switcher visible

---

### Step 6: Test Dynamic Behavior

#### Test 1: Disable a Module

1. **In MongoDB or via API**, disable a module:
   ```javascript
   // In MongoDB shell or via script
   db.tenantmoduleconfigurations.updateOne(
     { organizationId: ObjectId("..."), moduleKey: "deals" },
     { $set: { enabled: false } }
   )
   ```

2. **Refresh the page** (or reload UI metadata)
3. **Verify:** "Deals" should disappear from sidebar

#### Test 2: Change Module Label

1. **Update TenantModuleConfiguration:**
   ```javascript
   db.tenantmoduleconfigurations.updateOne(
     { organizationId: ObjectId("..."), moduleKey: "people" },
     { $set: { labelOverride: "Contacts & People" } }
   )
   ```

2. **Refresh the page**
3. **Verify:** Sidebar should show "Contacts & People" instead of "Person"

#### Test 3: Change Sidebar Order

1. **Update TenantModuleConfiguration:**
   ```javascript
   db.tenantmoduleconfigurations.updateOne(
     { organizationId: ObjectId("..."), moduleKey: "deals" },
     { $set: { "ui.sidebarOrder": 1 } }
   )
   ```

2. **Refresh the page**
3. **Verify:** "Deals" should appear first in sidebar

---

## 🐛 Troubleshooting

### Issue: Sidebar shows hardcoded navigation

**Symptoms:**
- Console shows no "Loading UI metadata..." message
- Network tab shows no `/api/ui/sidebar` request
- Vue DevTools shows `isLoaded: false`

**Solutions:**

1. **Check if user is authenticated:**
   ```javascript
   // In browser console
   const authStore = useAuthStore()
   console.log('Authenticated:', authStore.isAuthenticated)
   console.log('User:', authStore.user)
   ```

2. **Manually trigger UI load:**
   ```javascript
   // In browser console
   const appShellStore = useAppShellStore()
   await appShellStore.loadUIMetadata()
   console.log('Loaded:', appShellStore.isLoaded)
   console.log('Apps:', appShellStore.availableApps)
   ```

3. **Check API endpoint:**
   ```bash
   # Get auth token from browser localStorage or cookies
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ui/sidebar
   ```

4. **Verify organization has enabledApps:**
   ```javascript
   // In MongoDB
   db.organizations.findOne({ _id: ObjectId("...") }, { enabledApps: 1 })
   ```

### Issue: API returns empty arrays

**Symptoms:**
- `/api/ui/sidebar` returns `{ apps: [] }`
- Console shows error

**Solutions:**

1. **Check organization enabledApps:**
   ```javascript
   // Should have at least: [{ appKey: "CRM", status: "ACTIVE" }]
   ```

2. **Verify AppDefinition exists:**
   ```bash
   cd server
   node -e "require('dotenv').config(); const mongoose = require('mongoose'); const AppDefinition = require('./models/AppDefinition'); mongoose.connect(process.env.MONGODB_URI).then(async () => { const apps = await AppDefinition.find({ appKey: 'crm' }); console.log('CRM App:', apps); process.exit(0); });"
   ```

3. **Verify TenantModuleConfiguration exists:**
   ```bash
   cd server
   node scripts/testUIComposition.js
   ```

### Issue: Modules not appearing

**Symptoms:**
- API returns modules, but sidebar is empty

**Solutions:**

1. **Check TenantModuleConfiguration enabled flag:**
   ```javascript
   // Should be: enabled: true
   ```

2. **Check ui.showInSidebar:**
   ```javascript
   // Should be: ui.showInSidebar: true
   ```

3. **Check user permissions:**
   ```javascript
   // User needs 'view' permission for module
   ```

---

## 🔬 Advanced Verification

### Check Component Source

1. **Inspect Sidebar Element:**
   - Right-click on sidebar → Inspect
   - Look for `<SidebarRenderer>` component
   - If you see `<nav>` with hardcoded items, it's using fallback

2. **Check Component Props:**
   ```javascript
   // In Vue DevTools → Components
   // Find SidebarRenderer component
   // Check props: shouldShowExpanded should be true/false
   ```

### Monitor Store Changes

```javascript
// In browser console
import { useAppShellStore } from '@/stores/appShell'
const store = useAppShellStore()

// Watch for changes
store.$subscribe((mutation, state) => {
  console.log('Store changed:', mutation.type, state)
})
```

### Force Reload UI Metadata

```javascript
// In browser console
const appShellStore = useAppShellStore()
await appShellStore.refresh()
console.log('Refreshed:', appShellStore.isLoaded)
```

---

## ✅ Success Criteria

You'll know dynamic sidebar is working when:

1. ✅ Console shows "Loading UI metadata..."
2. ✅ Network tab shows successful `/api/ui/sidebar` request
3. ✅ Vue DevTools shows `appShell.isLoaded: true`
4. ✅ Sidebar modules match database configuration
5. ✅ Disabling a module removes it from sidebar
6. ✅ Changing label updates sidebar text
7. ✅ Changing order reorders sidebar items

---

## 📊 Comparison: Dynamic vs Hardcoded

| Feature | Dynamic Sidebar | Hardcoded Sidebar |
|---------|----------------|-------------------|
| **Source** | API (`/api/ui/sidebar`) | Component code |
| **Modules** | From TenantModuleConfiguration | Hardcoded array |
| **Order** | From `sidebarOrder` metadata | Fixed in code |
| **Labels** | From `labelOverride` or ModuleDefinition | Fixed in code |
| **Visibility** | Based on `enabled` and `showInSidebar` | Based on permissions only |
| **App Switcher** | Shows when multiple apps | Never shows |

---

## 🎯 Quick Test Script

### Option 1: Use Built-in Verification Utility

Run this in browser console after login:

```javascript
// Import and run verification
import('/src/utils/verifyDynamicSidebar.js')
  .then(m => m.verifyDynamicSidebar())
  .then(result => {
    console.log('Verification Result:', result)
  })
```

### Option 2: Manual Check

```javascript
// Quick verification script
(async () => {
  const { useAppShellStore } = await import('/src/stores/appShell.js')
  const store = useAppShellStore()
  
  console.log('=== Dynamic Sidebar Verification ===')
  console.log('Is Loaded:', store.isLoaded)
  console.log('Available Apps:', store.availableApps.length)
  console.log('Sidebar Modules:', store.sidebarModules.length)
  console.log('Active App:', store.activeApp)
  
  if (store.isLoaded && store.availableApps.length > 0) {
    console.log('✅ Dynamic sidebar is WORKING!')
    console.log('Modules:', store.sidebarModules.map(m => m.label))
  } else {
    console.log('❌ Dynamic sidebar NOT working - using fallback')
  }
})()
```

### Option 3: One-Liner Check

```javascript
// In browser console (after Vue app is loaded)
const { useAppShellStore } = await import('/src/stores/appShell.js')
const store = useAppShellStore()
console.log(store.isLoaded && store.availableApps.length > 0 ? '✅ Working' : '❌ Not Working')
```

---

**Last Updated:** January 2025

