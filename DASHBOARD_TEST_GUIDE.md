# Dashboard Testing Guide

**Date:** January 2025  
**Component:** `AppDashboard.vue`  
**Route:** `/dashboard`

---

## 🧪 Testing Checklist

### 1. **Basic Loading**
- [ ] Navigate to `/dashboard` after login
- [ ] Loading spinner appears initially
- [ ] Dashboard loads without errors
- [ ] No console errors

### 2. **Dashboard Structure**
- [ ] Header displays app title (should be "Sales" or app label)
- [ ] Description appears (if configured)
- [ ] Actions appear in header (if configured)
- [ ] KPIs display in grid (if configured)
- [ ] Module links appear as cards (if configured)
- [ ] Widgets display (if configured)

### 3. **Empty States**
- [ ] If no modules enabled → Shows "App not configured yet"
- [ ] If no permissions → Shows "You do not have access"
- [ ] Empty state has correct title and description
- [ ] Primary action button works (if provided)

### 4. **Permissions**
- [ ] Only shows actions user has permission for
- [ ] Only shows KPIs user has permission for
- [ ] Only shows modules user has permission for
- [ ] Only shows widgets user has permission for

### 5. **Navigation**
- [ ] Clicking module links navigates correctly
- [ ] Clicking actions navigates correctly
- [ ] Links open in tabs (if using tab system)

---

## 🔍 Debug Steps

### Step 1: Check Browser Console

Open browser DevTools (F12) and check for:

1. **AppDashboard logs:**
   ```
   [AppDashboard] Building dashboard for app: SALES
   [AppDashboard] Registry: {...}
   [AppDashboard] App in registry: {...}
   [AppDashboard] Dashboard definition: {...}
   ```

2. **Errors:**
   - `App SALES not found in registry` → App not in registry
   - `Failed to fetch apps` → API issue
   - `Cannot read property 'dashboard'` → Registry structure issue

### Step 2: Check Network Tab

Verify these API calls succeed:

1. **GET `/api/ui/apps`**
   - Should return array of apps
   - Should include `SALES` app
   - Response should have `appKey`, `name`, `modules`, etc.

2. **GET `/api/ui/apps/SALES/modules`**
   - Should return array of modules
   - Should include modules like `people`, `deals`, etc.

### Step 3: Check Vue DevTools

1. **Component State:**
   - `loading` should be `false` after load
   - `dashboardDefinition` should have structure
   - `appKey` prop should be `'SALES'`

2. **Computed Values:**
   - Check if computed properties are working

### Step 4: Check Registry Structure

In browser console, run:
```javascript
// Check app registry
const registry = await fetch('/api/ui/apps').then(r => r.json());
console.log('Apps:', registry);

// Check SALES app
const salesApp = registry.data.find(a => a.appKey === 'SALES');
console.log('SALES app:', salesApp);

// Check modules
const modules = await fetch('/api/ui/apps/SALES/modules').then(r => r.json());
console.log('SALES modules:', modules);
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "App SALES not found in registry"

**Symptoms:**
- Console shows: `App SALES not found in registry`
- Dashboard shows "Dashboard Not Found"

**Possible Causes:**
1. App registry doesn't include SALES
2. App key mismatch (case sensitivity)
3. API not returning apps

**Fix:**
- Check `/api/ui/apps` response
- Verify app key is exactly `'SALES'` (uppercase)
- Check if SALES app is enabled for organization

### Issue 2: Empty Dashboard

**Symptoms:**
- Dashboard loads but shows empty state
- No modules, KPIs, or actions

**Possible Causes:**
1. No dashboard configuration in registry
2. User has no permissions
3. Modules not configured

**Fix:**
- Check if `app.dashboard` exists in registry
- Check user permissions
- Verify modules are configured

### Issue 3: KPIs Show 0

**Symptoms:**
- KPIs display but all show 0
- No actual values

**Expected:**
- This is normal! KPI values need to be fetched from API
- TODO: Implement `/api/dashboard/:appKey/kpis` endpoint

### Issue 4: Module Links Don't Work

**Symptoms:**
- Clicking module cards doesn't navigate

**Fix:**
- Check if `handleAction` is called
- Verify routes exist
- Check if tab system is working

---

## 📊 Expected Dashboard Structure

For SALES app, you should see:

### Header
- Title: "Sales" (or from registry)
- Description: (if configured)
- Actions: "Create Contact", "Import Data", etc. (if configured)

### KPIs (if configured)
- Total Contacts
- New This Week
- Conversion Rate
- Active Deals
- etc.

### Module Links
- People (`/people`)
- Organizations (`/organizations`)
- Deals (`/deals`)
- Tasks (`/tasks`)
- Events (`/events`)
- etc.

### Widgets (if configured)
- Recent Activity
- Insights
- Alerts
- etc.

---

## ✅ Success Criteria

Dashboard is working correctly if:

1. ✅ Loads without errors
2. ✅ Shows app title and description
3. ✅ Displays module links (filtered by permissions)
4. ✅ Empty states work correctly
5. ✅ Navigation works
6. ✅ Permissions are respected

---

## 🚨 Known Limitations

1. **KPI Values:** Currently show 0 (placeholder)
   - Need to implement `/api/dashboard/:appKey/kpis` endpoint
   - TODO: Add KPI value fetching

2. **Widget Renderers:** Widgets show placeholder
   - TODO: Implement widget renderers based on type
   - Activity, Insights, Alerts, Chart widgets

3. **Dashboard Configuration:** May not be in registry yet
   - Dashboard config needs to be added to app registry
   - Actions, KPIs, widgets need to be configured

---

## 📝 Test Results Template

```
Date: __________
Tester: __________

✅ Basic Loading: [ ] Pass [ ] Fail
✅ Dashboard Structure: [ ] Pass [ ] Fail
✅ Empty States: [ ] Pass [ ] Fail
✅ Permissions: [ ] Pass [ ] Fail
✅ Navigation: [ ] Pass [ ] Fail

Issues Found:
1. ________________________________
2. ________________________________
3. ________________________________

Console Errors:
___________________________________
___________________________________

Network Issues:
___________________________________
___________________________________

Overall Status: [ ] Working [ ] Needs Fixes
```

---

**Next Steps After Testing:**
- If working: Continue to Phase 3 (Lists)
- If issues: Fix bugs and retest
- If missing features: Add dashboard configuration to registry

