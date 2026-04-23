<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useAppShellStore } from '@/stores/appShell';
import { usePermissionSync } from '@/composables/usePermissionSync';
import { configureTabsStorage, resetTabsState, useTabs } from '@/composables/useTabs';
import { useColorMode } from '@/composables/useColorMode';
import { useNotifications } from '@/composables/useNotifications';
import LandingPage from '@/views/LandingPage.vue'
import Dashboard from '@/views/Dashboard.vue'
import Nav from '@/components/Nav.vue';
import TabBar from '@/components/TabBar.vue';
import PlatformShell from '@/components/PlatformShell.vue';
import NotificationContainer from '@/components/NotificationContainer.vue';
import NotificationSheet from '@/components/notifications/NotificationSheet.vue';
import GlobalSurfacesProvider from '@/components/global/GlobalSurfacesProvider.vue';
import { initializeDynamicRoutes } from '@/router';
import { useSidebarState } from '@/composables/useSidebarState';

const authStore = useAuthStore();
const appShellStore = useAppShellStore();
const router = useRouter();
const route = useRoute();
const { initTabs, setupRouteWatcher } = useTabs();
const { warning } = useNotifications();
const { lastActiveAppId } = useSidebarState();

// Store cleanup function for route watcher (popstate listener)
let cleanupRouteWatcher = null;

// Initialize color mode
const { colorMode } = useColorMode();

// Check authentication status to conditionally show the navigation bar
const isAuthenticated = computed(() => authStore.isAuthenticated);
// Hide shell only for auth routes and routes with explicit hideShell meta
// Platform routes (/platform/*) should show the shell
const hideShell = computed(() => {
  // Check route meta first
  if (route.meta.hideShell) return true;
  // Hide for auth routes only
  if (route.path.startsWith('/login') || route.path.startsWith('/auth/')) return true;
  // Hide for audit routes (they use AuditLayout)
  if (route.path.startsWith('/audit/')) return true;
  // Portal routes now use standard PlatformShell layout
  // Platform routes show the shell
  return false;
});
const isPublicRoute = computed(() => route.meta.requiresAuth === false);

const DEFAULT_CONTENT_OFFSET = 0;
const EXTRA_OFFSET_LIGHT = '2rem';
const EXTRA_OFFSET_LARGE = '2rem';
const contentWrapperRef = ref(null);
const tableStickyOffset = ref(`calc(${DEFAULT_CONTENT_OFFSET}px + ${EXTRA_OFFSET_LIGHT})`);
const salesNotificationSheetOpen = ref(false);

const handleSalesOpenNotifications = () => {
  if (!authStore.isAuthenticated) return;
  if (window.innerWidth < 1024) {
    salesNotificationSheetOpen.value = true;
  }
};

// Sidebar collapsed state - Load from localStorage, default to false
const sidebarCollapsed = ref(
  localStorage.getItem('litedesk-sidebar-collapsed') === 'true'
);

// Save sidebar state to localStorage whenever it changes
watch(sidebarCollapsed, (newValue) => {
  localStorage.setItem('litedesk-sidebar-collapsed', newValue.toString());
  queueContentOffsetUpdate();
});

const updateContentOffset = () => {
  const el = contentWrapperRef.value;

  if (!(el instanceof HTMLElement)) {
    tableStickyOffset.value = `calc(${DEFAULT_CONTENT_OFFSET}px + ${EXTRA_OFFSET_LIGHT})`;
    return;
  }

  const rect = el.getBoundingClientRect();
  const baseOffset = Math.max(DEFAULT_CONTENT_OFFSET, Math.round(rect.top));
  const extraSpacing = window.innerWidth >= 1024 ? EXTRA_OFFSET_LARGE : EXTRA_OFFSET_LIGHT;

  tableStickyOffset.value = `calc(${baseOffset}px + ${extraSpacing})`;
};

const queueContentOffsetUpdate = () => {
  nextTick(() => {
    requestAnimationFrame(updateContentOffset);
  });
};

watch(
  () => route.fullPath,
  () => {
    queueContentOffsetUpdate();
  }
);

watch(hideShell, () => {
  queueContentOffsetUpdate();
});

const handleResize = () => {
  updateContentOffset();
};

// Cross-tab auth guard: if another tab logs in/out and changes localStorage.user,
// don't silently switch accounts in this tab.
const handleStorageEvent = (e) => {
  if (e.key !== 'user') return;
  if (!authStore.isAuthenticated || !authStore.user?._id) return;

  // User removed (logout in another tab)
  if (!e.newValue) {
    warning('You were signed out because your session changed in another tab.', 6000);
    authStore.logout();
    resetTabsState(); // Clear in-memory tabs so next login starts clean
    router.push('/');
    return;
  }

  try {
    const incoming = JSON.parse(e.newValue);
    const incomingId = incoming?._id;
    if (incomingId && String(incomingId) !== String(authStore.user._id)) {
      warning('You were signed out because you logged into a different account in another tab.', 6500);
      authStore.logout();
      resetTabsState(); // Clear in-memory tabs so next login starts clean
      router.push('/');
    }
  } catch (err) {
    console.warn('Failed to parse localStorage user in storage event:', err);
    // Safe fallback: logout rather than risk inconsistent state
    warning('You were signed out due to a session change in another tab.', 6000);
    authStore.logout();
    resetTabsState(); // Clear in-memory tabs so next login starts clean
    router.push('/');
  }
};

// Phase 2D: Detect active app from route path
const detectActiveAppFromRoute = (path) => {
  if (path.startsWith('/audit/')) return 'AUDIT';
  if (path.startsWith('/portal/')) return 'PORTAL';
  if (path.startsWith('/sales/')) return 'SALES';
  if (path.startsWith('/helpdesk/')) return 'HELPDESK';
  if (path.startsWith('/projects/')) return 'PROJECTS';
  if (path.startsWith('/dashboard/')) {
    const appKey = String(path.split('/')[2] || '').toUpperCase();
    if (appKey) return appKey;
  }
  if (path.startsWith('/dashboard') || path.startsWith('/people') || path.startsWith('/organizations') || path.startsWith('/deals') || path.startsWith('/tasks') || path.startsWith('/events') || path.startsWith('/items') || path.startsWith('/forms') || path.startsWith('/imports')) return 'SALES';
  return 'SALES'; // Default to Sales
};

// Phase 2D: Watch route changes and update activeApp
watch(() => route.path, async (newPath) => {
  if (authStore.isAuthenticated && appShellStore.isLoaded) {
    const detectedApp = detectActiveAppFromRoute(newPath);
    if (appShellStore.activeApp !== detectedApp) {
      console.log(`[App] Route changed to ${newPath}, setting activeApp to ${detectedApp}`);
      appShellStore.setActiveApp(detectedApp);
    }
    // Persist last active app lens for sidebar fallback when route is ambiguous.
    lastActiveAppId.value = detectedApp;
  }
}, { immediate: true });

// Refresh permissions on app mount (page refresh)
onMounted(async () => {
  if (authStore.isAuthenticated) {
    console.log('Auto-refreshing permissions on page load...');
    await authStore.refreshUser();
    
    // Phase 1A: Load UI metadata for dynamic composition
    if (!appShellStore.isLoaded) {
      console.log('Loading UI metadata...');
      await appShellStore.loadUIMetadata();
      
      // Phase 1A: Initialize dynamic routes after UI metadata is loaded
      console.log('Initializing dynamic routes...');
      await initializeDynamicRoutes();
    }
    
    // Phase 2D: Set initial activeApp based on current route
    const detectedApp = detectActiveAppFromRoute(route.path);
    if (detectedApp && appShellStore.activeApp !== detectedApp) {
      console.log(`[App] Initial route: ${route.path}, setting activeApp to ${detectedApp}`);
      appShellStore.setActiveApp(detectedApp);
    }

    // Only initialize tabs system for CRM routes (not audit or portal)
    // Audit and Portal have their own layouts. Settings now uses internal tabs.
    const isAuditRoute = route.path.startsWith('/audit/');
    const isPortalRoute = route.path.startsWith('/portal/');
    if (!isAuditRoute && !isPortalRoute) {
      // Configure per-instance, per-user storage key for tab persistence
      // Tabs are scoped by instanceId + userId to prevent leakage across instances/users.
      const instanceId = authStore.organization?._id || authStore.organization?.instanceId;
      const userId = authStore.user?._id;

      if (instanceId && userId) {
        configureTabsStorage({ instanceId, userId });
        // Initialize tabs system after storage is configured
        // This creates the home tab synchronously
        initTabs();
        
        // Ensure tabs are created and visible before setting up route watcher
        // Use nextTick to ensure reactive updates are processed
        await nextTick();
        
        // Log tabs state for debugging
        console.log('📊 [App] After initTabs, checking tabs state...');
        const { tabs: tabsRef } = useTabs();
        console.log('📊 [App] Tabs count:', tabsRef.value.length);
        console.log('📊 [App] Tabs:', tabsRef.value.map(t => ({ id: t.id, title: t.title, path: t.path })));

        // Setup route watcher for browser navigation (pass route from setup context)
        // Store cleanup function to remove popstate listener on unmount
        cleanupRouteWatcher = setupRouteWatcher(route);
      } else {
        console.error('[Tabs] Skipping tab initialization: missing instanceId or userId', {
          instanceId,
          userId
        });
      }
    } else {
      console.log('📋 Audit/Portal route detected, skipping tabs initialization');
    }

    // Note: We don't need a router.beforeEach guard here because:
    // 1. Tab creation is handled by click handlers (Nav.vue, DataTables, etc.)
    // 2. Page refresh will restore tabs from localStorage
    // 3. Adding a guard here creates circular loops with openTab() calling router.replace()
  }

  queueContentOffsetUpdate();
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('sales-open-notifications', handleSalesOpenNotifications);
});

watch(salesNotificationSheetOpen, (val) => {
  console.log('[App] salesNotificationSheetOpen changed:', val);
});

onBeforeUnmount(() => {
  // Cleanup route watcher (removes popstate listener)
  if (typeof cleanupRouteWatcher === 'function') {
    cleanupRouteWatcher();
  }
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('storage', handleStorageEvent);
  window.removeEventListener('sales-open-notifications', handleSalesOpenNotifications);
});

// Watch for authentication changes to initialize tabs
watch(
  () => authStore.isAuthenticated,
  async (isAuthed, wasAuthed) => {
    if (wasAuthed && !isAuthed) {
      // User logged out - clear tabs
      resetTabsState();
      // Cleanup route watcher when logging out
      if (typeof cleanupRouteWatcher === 'function') {
        cleanupRouteWatcher();
        cleanupRouteWatcher = null;
      }
    } else if (!wasAuthed && isAuthed) {
      // User just logged in - initialize tabs (same as onMounted logic)
      console.log('🔄 [App] User authenticated, initializing tabs...');
      const instanceId = authStore.organization?._id || authStore.organization?.instanceId;
      const userId = authStore.user?._id;
      
      if (instanceId && userId) {
        // Cleanup any existing route watcher before setting up a new one
        if (typeof cleanupRouteWatcher === 'function') {
          cleanupRouteWatcher();
          cleanupRouteWatcher = null;
        }
        
        // Use the same initialization logic as onMounted
        // Use 'route' from useRoute() (same as onMounted) instead of router.currentRoute.value
        const isAuditRoute = route.path.startsWith('/audit/');
        const isPortalRoute = route.path.startsWith('/portal/');
        
        if (!isAuditRoute && !isPortalRoute) {
          configureTabsStorage({ instanceId, userId });
          initTabs();
          
          // Wait for router to be ready and route to stabilize after login
          await router.isReady();
          await nextTick();
          
          // Log tabs state for debugging
          console.log('📊 [App] After login - After initTabs, checking tabs state...');
          const { tabs: tabsRef } = useTabs();
          console.log('📊 [App] After login - Tabs count:', tabsRef.value.length);
          console.log('📊 [App] After login - Tabs:', tabsRef.value.map(t => ({ id: t.id, title: t.title, path: t.path })));
          console.log('📊 [App] After login - Current route:', route.path, route.fullPath);

          // Setup route watcher for browser navigation (same as onMounted)
          // Use 'route' from useRoute() just like onMounted does
          // Store cleanup function to remove popstate listener on unmount
          console.log('🔧 [App] After login - Setting up route watcher on route:', route.path);
          cleanupRouteWatcher = setupRouteWatcher(route);
          
          if (typeof cleanupRouteWatcher === 'function') {
            console.log('✅ [App] After login - Route watcher successfully set up');
          } else {
            console.warn('⚠️ [App] After login - setupRouteWatcher did not return cleanup function');
          }
        } else {
          console.log('📋 [App] After login - Audit/Portal route detected, skipping tabs initialization');
        }
      }
    }
  },
  { immediate: false }
);

// Enable automatic permission sync every 2 minutes for real-time updates
usePermissionSync(2);
</script>

<template>
  <!-- Public routes (no shell, no auth required) -->
  <div v-if="isPublicRoute">
    <RouterView />
  </div>

  <!-- Authenticated layout -->
  <div v-else-if="isAuthenticated">
    <!-- Shell-less pages (e.g., Settings) -->
    <div v-if="hideShell" class="min-h-screen bg-gray-100/70 dark:bg-gray-900">
      <div class="flex-1 overflow-y-hidden overflow-x-hidden">
        <RouterView />
      </div>
    </div>

    <!-- Phase 1A: Platform Shell with dynamic UI composition -->
    <PlatformShell v-else />
  </div>

  <!-- Landing Page (no sidebar) -->
  <div v-else>
    <RouterView />
  </div>

  <!-- Global Notification Container -->
  <NotificationContainer />

  <!-- Sales Notification Sheet (mobile) -->
  <NotificationSheet
    :open="salesNotificationSheetOpen"
    app-key="SALES"
    :mark-all-disabled="false"
    @close="salesNotificationSheetOpen = false"
  />

  <!-- Global Surfaces Provider -->
  <!-- ARCHITECTURE NOTE: Mounted once at root level, app-agnostic -->
  <!-- Provides GlobalSearch and CommandPalette to all layouts (Sales, Audit, Portal, etc.) -->
  <GlobalSurfacesProvider />
</template>

<style>
/* Global styles - prevent horizontal scroll */
html,
body {
  overflow-x: hidden;
  max-width: 100vw;
}

body {
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {

  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
