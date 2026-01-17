# Quick Guide: Verify Dynamic Sidebar

## 🚀 30-Second Verification

### Step 1: Open Browser Console
Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

### Step 2: Run This Command

```javascript
// Copy-paste this into console:
const { useAppShellStore } = await import('/src/stores/appShell.js')
const store = useAppShellStore()
console.log(store.isLoaded && store.availableApps.length > 0 ? '✅ Dynamic sidebar WORKING' : '❌ Using fallback')
console.log('Apps:', store.availableApps.length, '| Modules:', store.sidebarModules.length)
```

### Step 3: Check Result

**✅ If you see:**
```
✅ Dynamic sidebar WORKING
Apps: 1 | Modules: 8
```
→ **Dynamic sidebar is working!**

**❌ If you see:**
```
❌ Using fallback
Apps: 0 | Modules: 0
```
→ **Using hardcoded navigation (fallback)**

---

## 🔍 Detailed Verification

### Check 1: Browser Console Logs

After login, look for:
```
Loading UI metadata...
```

### Check 2: Network Tab

1. Open **Network** tab in DevTools
2. Look for request: `GET /api/ui/sidebar`
3. Status should be: `200 OK`
4. Response should contain apps and modules

### Check 3: Vue DevTools

1. Open **Vue DevTools** extension
2. Go to **Pinia** tab
3. Find **`appShell`** store
4. Check:
   - `isLoaded: true` ✅
   - `availableApps: [...]` (not empty) ✅
   - `sidebarModules: [...]` (not empty) ✅

---

## 🎯 Visual Indicators

### Dynamic Sidebar (Working)
- ✅ Modules in correct order (People, Organizations, Deals, Tasks, Events, Items, Forms, Imports)
- ✅ App Switcher visible (if multiple apps enabled)
- ✅ Icons match module definitions

### Hardcoded Sidebar (Fallback)
- ⚠️ Modules might be in different order
- ⚠️ No App Switcher
- ⚠️ Might include modules not in metadata

---

## 🐛 Quick Fixes

### If Dynamic Sidebar Not Working:

```javascript
// In browser console - manually load UI metadata
const { useAppShellStore } = await import('/src/stores/appShell.js')
const store = useAppShellStore()
await store.loadUIMetadata()
console.log('Loaded:', store.isLoaded)
```

### Check API Endpoint:

```javascript
// Get auth token from localStorage
const token = JSON.parse(localStorage.getItem('user'))?.token

// Test API
fetch('/api/ui/sidebar', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('API Response:', data))
```

---

## 📊 Expected Values

When working correctly, you should see:

- **Apps:** 1 (CRM)
- **Modules:** 8 (People, Organizations, Deals, Tasks, Events, Items, Forms, Imports)
- **Routes:** 24 (8 modules × 3 route types)

---

**That's it!** If all checks pass, dynamic sidebar is working! 🎉

