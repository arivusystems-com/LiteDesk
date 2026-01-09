# Debug Steps: Dynamic Sidebar Not Loading

## 🚨 Quick Diagnosis

Since you're seeing "❌ Using fallback", let's diagnose step by step:

---

## Step 1: Run This Debug Script

Copy this into your browser console:

```javascript
(async () => {
  console.log('🔍 Debugging Dynamic Sidebar...\n');
  
  // Check auth
  const { useAuthStore } = await import('/src/stores/auth.js');
  const authStore = useAuthStore();
  console.log('1. Authentication:');
  console.log('   ✅ Authenticated:', authStore.isAuthenticated);
  console.log('   📧 User:', authStore.user?.email || 'None');
  console.log('   🏢 Org ID:', authStore.user?.organizationId || 'None');
  console.log('   🔑 Token:', authStore.user?.token ? '✅ Exists' : '❌ Missing');
  console.log('');
  
  // Check store
  const { useAppShellStore } = await import('/src/stores/appShell.js');
  const store = useAppShellStore();
  console.log('2. App Shell Store:');
  console.log('   📦 isLoaded:', store.isLoaded);
  console.log('   ⏳ loading:', store.loading);
  console.log('   ❌ error:', store.error || 'None');
  console.log('   📱 apps:', store.availableApps.length);
  console.log('   📋 modules:', store.sidebarModules.length);
  console.log('   🕐 lastLoaded:', store.lastLoaded || 'Never');
  console.log('');
  
  // Test API directly
  if (authStore.user?.token) {
    console.log('3. Testing API directly...');
    try {
      const res = await fetch('/api/ui/sidebar', {
        headers: { 
          'Authorization': `Bearer ${authStore.user.token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('   📡 Status:', res.status, res.statusText);
      const data = await res.json();
      console.log('   ✅ Success:', data.success);
      if (data.success) {
        console.log('   📱 Apps:', data.data?.apps?.length || 0);
        console.log('   📋 Modules:', data.data?.apps?.[0]?.modules?.length || 0);
        console.log('   📊 Response:', data);
      } else {
        console.log('   ❌ Error:', data.message);
      }
    } catch (err) {
      console.log('   ❌ Fetch error:', err.message);
    }
  } else {
    console.log('3. ⚠️  Skipping API test (no token)');
  }
  console.log('');
  
  // Try manual load
  console.log('4. Attempting manual load...');
  try {
    await store.loadUIMetadata();
    console.log('   ✅ Load completed');
    console.log('   📦 isLoaded:', store.isLoaded);
    console.log('   📱 apps:', store.availableApps.length);
    console.log('   ❌ error:', store.error || 'None');
  } catch (err) {
    console.log('   ❌ Load failed:', err.message);
  }
})();
```

**Share the output** - this will tell us exactly what's wrong!

---

## Common Issues Based on Output

### If "Token: ❌ Missing"
**Problem:** User not properly authenticated  
**Fix:** Log out and log back in

### If "error: [some message]"
**Problem:** API call failed  
**Fix:** Check the error message - it will tell you what's wrong

### If "Status: 401"
**Problem:** Authentication failed  
**Fix:** Token expired or invalid - re-login

### If "Status: 500"
**Problem:** Server error  
**Fix:** Check server logs for details

### If "Apps: 0" but Status 200
**Problem:** Organization not configured  
**Fix:** Run bootstrap script:
```bash
cd server
node scripts/bootstrapOrganizationsForUI.js
```

### If "lastLoaded: Never"
**Problem:** Load never triggered  
**Fix:** Check if App.vue mounted hook ran

---

## Quick Fixes

### Fix 1: Force Reload
```javascript
const { useAppShellStore } = await import('/src/stores/appShell.js')
const store = useAppShellStore()
store.clear()
await store.loadUIMetadata()
console.log('Reloaded:', store.isLoaded, 'Apps:', store.availableApps.length)
```

### Fix 2: Check Organization
```bash
cd server
node scripts/testUIComposition.js
```

### Fix 3: Verify User's Organization
```javascript
// In console
const { useAuthStore } = await import('/src/stores/auth.js')
const authStore = useAuthStore()
console.log('Org ID:', authStore.user?.organizationId)
// Then check if this org exists and has enabledApps
```

---

**Run the debug script above and share the output!** 🔍

