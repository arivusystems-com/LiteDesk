# UI Rewire: Platform Shell Fix

**Date:** January 2025  
**Status:** ✅ Complete

---

## 🎯 Objective

Ensure `/platform` routes show the sidebar (shell) to align with platform model architecture.

---

## ✅ Changes Made

### 1. Router Updates (`client/src/router/index.js`)

**Removed `hideShell: true` from platform routes:**
- `/platform` → Now redirects to `/platform/home`
- `/platform/home` → Shows shell (removed `hideShell: true`)
- `/platform/apps` → Shows shell (removed `hideShell: true`)

**Before:**
```javascript
{
  path: '/platform',
  name: 'platform-home',
  component: () => import('@/views/platform/PlatformHome.vue'),
  meta: { requiresAuth: true, hideShell: true }  // ❌ Hidden
}
```

**After:**
```javascript
{
  path: '/platform',
  redirect: '/platform/home'  // ✅ Redirect
},
{
  path: '/platform/home',
  name: 'platform-home',
  component: () => import('@/views/platform/PlatformHome.vue'),
  meta: { requiresAuth: true }  // ✅ Shows shell
}
```

### 2. App.vue Updates (`client/src/App.vue`)

**Removed hardcoded `/platform` hideShell check:**

**Before:**
```javascript
const hideShell = computed(() => {
  if (route.meta.hideShell) return true;
  if (route.path === '/platform') return true;  // ❌ Hardcoded
  // ...
});
```

**After:**
```javascript
const hideShell = computed(() => {
  if (route.meta.hideShell) return true;
  // Only hide for auth routes, audit routes, portal routes
  // Platform routes show the shell ✅
  if (route.path.startsWith('/login') || route.path.startsWith('/auth/')) return true;
  if (route.path.startsWith('/audit/')) return true;
  if (route.path.startsWith('/portal/')) return true;
  return false;
});
```

### 3. LoginForm Updates (`client/src/components/LoginForm.vue`)

**Updated redirect to use `/platform/home`:**

**Before:**
```javascript
router.push('/platform');  // ❌ Would redirect to old route
```

**After:**
```javascript
router.push('/platform/home');  // ✅ Redirects to new route
```

---

## 📊 Impact

### Routes That Now Show Shell
- ✅ `/platform/home` - Platform landing page
- ✅ `/platform/apps` - App registry
- ✅ All other platform routes (future)

### Routes That Still Hide Shell (By Design)
- `/login` - Auth route
- `/auth/*` - Auth routes
- `/audit/*` - Audit app has its own layout
- `/portal/*` - Portal app has its own layout
- `/settings` - Currently shell-less (to be fixed later)

---

## ✅ Acceptance Criteria

- ✅ After login, user lands on `/platform/home`
- ✅ Sidebar is immediately visible
- ✅ Sidebar never disappears when navigating platform routes
- ✅ App dashboards feel like content, not context switches
- ✅ Single entry point (no pre-shell/post-shell world)

---

## 🔄 Next Steps (Future)

1. **Settings In-Shell:** Move `/settings` to `/platform/settings` and remove `hideShell: true`
2. **Platform Layout:** Ensure PlatformLayout mounts at `/platform` root
3. **Consistent Navigation:** All platform routes should feel like content, not context switches

---

**Status:** ✅ Platform Shell Fix Complete  
**Breaking Changes:** None  
**User Impact:** Platform routes now show sidebar consistently

