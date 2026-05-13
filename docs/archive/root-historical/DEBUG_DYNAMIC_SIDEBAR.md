# Debug: Dynamic Sidebar Not Loading

## 🔍 Step-by-Step Debugging

### Step 1: Check Authentication

Run in console:
```javascript
const { useAuthStore } = await import('/src/stores/auth.js')
const authStore = useAuthStore()
console.log('Authenticated:', authStore.isAuthenticated)
console.log('User:', authStore.user)
console.log('Organization ID:', authStore.user?.organizationId)
```

**Expected:**
- `Authenticated: true`
- `User:` should have email, organizationId, token
- `Organization ID:` should be a valid ObjectId

**If not authenticated:** Login first!

---

### Step 2: Check Store State

Run in console:
```javascript
const { useAppShellStore } = await import('/src/stores/appShell.js')
const store = useAppShellStore()
console.log('Store State:', {
  isLoaded: store.isLoaded,
  loading: store.loading,
  error: store.error,
  availableApps: store.availableApps.length,
  sidebarModules: store.sidebarModules.length,
  lastLoaded: store.lastLoaded
})
```

**Check:**
- `error:` - If there's an error message, that's the issue!
- `loading:` - Should be `false` after page load
- `lastLoaded:` - Should be a Date if loaded successfully

---

### Step 3: Manually Trigger Load

Run in console:
```javascript
const { useAppShellStore } = await import('/src/stores/appShell.js')
const store = useAppShellStore()
console.log('Attempting to load UI metadata...')
await store.loadUIMetadata()
console.log('After load:', {
  isLoaded: store.isLoaded,
  error: store.error,
  apps: store.availableApps.length
})
```

**Watch for:**
- Any error messages in console
- Network request to `/api/ui/sidebar`
- Whether `isLoaded` becomes `true`

---

### Step 4: Check API Endpoint Directly

Run in console:
```javascript
// Get auth token
const user = JSON.parse(localStorage.getItem('user'))
const token = user?.token

if (!token) {
  console.error('❌ No auth token found!')
} else {
  console.log('Testing API endpoint...')
  fetch('/api/ui/sidebar', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(r => {
      console.log('Response status:', r.status)
      return r.json()
    })
    .then(data => {
      console.log('API Response:', data)
      if (data.success) {
        console.log('✅ API working! Apps:', data.data.apps.length)
      } else {
        console.error('❌ API error:', data.message)
      }
    })
    .catch(err => {
      console.error('❌ Fetch error:', err)
    })
}
```

**Check response:**
- Status `200` = API working
- Status `401` = Not authenticated
- Status `500` = Server error
- `data.success: true` = API returned data
- `data.data.apps` = Should have apps array

---

### Step 5: Check Network Tab

1. Open DevTools → Network tab
2. Filter by: `sidebar`
3. Look for `/api/ui/sidebar` request
4. Check:
   - **Status:** Should be `200`
   - **Request Headers:** Should have `Authorization: Bearer ...`
   - **Response:** Should have JSON with apps/modules

**If request is missing:**
- UI metadata load might not have been triggered
- Check if `App.vue` mounted hook ran

**If request failed:**
- Check error message in Network tab
- Check server logs

---

### Step 6: Check Server Logs

Look at server console for:
- `[UIComposition] Error getting sidebar:` - Service error
- `[AppShell] Error loading UI metadata:` - Frontend error
- Any MongoDB connection errors

---

## 🐛 Common Issues & Fixes

### Issue 1: "No auth token found"

**Fix:**
```javascript
// Make sure you're logged in
// Check localStorage
console.log('User in localStorage:', localStorage.getItem('user'))
```

### Issue 2: API returns 401 Unauthorized

**Fix:**
- Token might be expired
- Try logging out and logging back in
- Check server logs for auth errors

### Issue 3: API returns empty arrays

**Fix:**
- Organization might not have `enabledApps` set
- Run: `node scripts/bootstrapOrganizationsForUI.js`
- Check organization in MongoDB

### Issue 4: "Organization not found"

**Fix:**
- User's `organizationId` might be invalid
- Check: `authStore.user.organizationId`
- Verify organization exists in database

### Issue 5: Store never loads

**Fix:**
- Check if `App.vue` mounted hook runs
- Check if `auth.js` login hook runs
- Manually trigger: `await appShellStore.loadUIMetadata()`

---

## 🔧 Quick Fixes

### Fix 1: Force Reload UI Metadata

```javascript
const { useAppShellStore } = await import('/src/stores/appShell.js')
const store = useAppShellStore()
store.clear() // Clear old state
await store.loadUIMetadata() // Reload
console.log('Reloaded:', store.isLoaded)
```

### Fix 2: Check Component Render

```javascript
// Check if SidebarRenderer is being used
document.querySelector('nav')?.getAttribute('class')
// Should see SidebarRenderer component in Vue DevTools
```

### Fix 3: Verify Organization Setup

```bash
cd server
node scripts/testUIComposition.js
```

This will show if organization is configured correctly.

---

## 📋 Debug Checklist

Run through these checks:

- [ ] User is authenticated (`authStore.isAuthenticated === true`)
- [ ] User has `organizationId` (`authStore.user.organizationId` exists)
- [ ] Auth token exists (`localStorage.getItem('user')` has token)
- [ ] API endpoint accessible (`GET /api/ui/sidebar` returns 200)
- [ ] Organization has `enabledApps` set
- [ ] TenantModuleConfiguration records exist
- [ ] AppDefinition records exist (CRM app)
- [ ] ModuleDefinition records exist (CRM modules)
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## 🎯 Most Likely Causes

1. **Organization not configured** - Run bootstrap script
2. **Auth token missing/expired** - Re-login
3. **API endpoint error** - Check server logs
4. **Store not loading** - Check App.vue mounted hook

---

Run the checks above and share the results!

