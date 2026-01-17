<template>
  <div v-if="filteredApps.length > 1" class="app-switcher">
    <Menu as="div" class="relative">
      <MenuButton
        class="flex items-center gap-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <span v-if="activeApp">{{ activeAppName }}</span>
        <span v-else>Select App</span>
        <ChevronDownIcon class="w-4 h-4" />
      </MenuButton>

      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <MenuItems
          class="absolute left-0 mt-2 w-56 origin-top-left rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50"
        >
          <div class="py-1">
            <MenuItem
              v-for="app in filteredApps"
              :key="app.appKey"
              v-slot="{ active }"
            >
              <button
                @click="handleAppSwitch(app.appKey)"
                :class="[
                  active ? 'bg-gray-100 dark:bg-gray-700' : '',
                  app.appKey === activeApp ? 'bg-blue-50 dark:bg-blue-900/20' : '',
                  'w-full text-left px-4 py-2 text-sm flex items-center gap-x-2',
                  app.appKey === activeApp
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                ]"
              >
                <span v-if="app.icon" class="text-lg">{{ app.icon }}</span>
                <span>{{ app.name }}</span>
                <CheckIcon
                  v-if="app.appKey === activeApp"
                  class="ml-auto w-5 h-5 text-blue-600 dark:text-blue-400"
                />
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>

<script setup>
/**
 * ============================================================================
 * PLATFORM UI SHELL: App Switcher Component (Phase 1A)
 * ============================================================================
 * 
 * Displays available apps and allows switching between them.
 * 
 * Rules:
 * - Fetches enabled apps from /api/ui/apps
 * - Does NOT perform permission checks (handled by backend)
 * - Does NOT show CONTROL_PLANE (platform-only, never for tenants)
 * - Switches active app via appShell store
 * 
 * ============================================================================
 */

import { computed, onMounted } from 'vue';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline';
import { useAppShellStore } from '@/stores/appShell';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';

const appShellStore = useAppShellStore();
const authStore = useAuthStore();
const router = useRouter();
const { openTab } = useTabs();

// Fetch apps directly from API (not from store which uses sidebar endpoint)
const apps = computed(() => appShellStore.availableApps);
const activeApp = computed(() => appShellStore.activeApp);

// Filter out CONTROL_PLANE - it's platform-only and must never appear for tenants
const filteredApps = computed(() => {
  return apps.value.filter(app => {
    const appKeyUpper = app.appKey?.toUpperCase();
    // Explicitly exclude CONTROL_PLANE
    return appKeyUpper !== 'CONTROL_PLANE' && appKeyUpper !== 'CONTROL PLANE';
  });
});

const activeAppName = computed(() => {
  const app = filteredApps.value.find(a => a.appKey === activeApp.value);
  return app?.name || 'Unknown';
});

const handleAppSwitch = (appKey) => {
  // Verify app is not CONTROL_PLANE
  const appKeyUpper = appKey?.toUpperCase();
  if (appKeyUpper === 'CONTROL_PLANE' || appKeyUpper === 'CONTROL PLANE') {
    console.warn('[AppSwitcher] Attempted to switch to CONTROL_PLANE - blocked');
    return;
  }
  
  // Check if user has access to this app
  if (!authStore.hasAppAccess(appKey)) {
    console.warn(`[AppSwitcher] User does not have access to app: ${appKey}`);
    alert(`You do not have access to the ${appKey} application. Please contact your administrator.`);
    return;
  }
  
  // Verify app is available for tenant
  const app = filteredApps.value.find(a => a.appKey === appKey);
  if (!app) {
    console.warn(`[AppSwitcher] App not available: ${appKey}`);
    alert(`The ${appKey} application is not available. Please contact your administrator.`);
    return;
  }
  
  // Set active app
  appShellStore.setActiveApp(appKey);
  
  // For Sales app, always navigate to dashboard first
  if (appKey === 'SALES') {
    // Always open dashboard for Sales app to ensure it's shown by default
    openTab('/dashboard', {
      title: 'Dashboard',
      closable: false // Dashboard tab should not be closable
    });
    return;
  }
  
  // For other apps, navigate to their default route
  let targetRoute = app?.defaultRoute;
  
  // Normalize old/invalid routes
  if (targetRoute === '/portal/me') {
    // Fix: /portal/me is an API endpoint, not a frontend route
    targetRoute = '/portal/dashboard';
    console.warn(`[AppSwitcher] Normalized invalid route /portal/me to /portal/dashboard`);
  }
  
  if (!targetRoute) {
    // Fallback routes if defaultRoute is not set (Phase 2D)
    const fallbackRoutes = {
      'HELPDESK': '/helpdesk/cases',
      'PROJECTS': '/projects/projects',
      'AUDIT': '/audit/dashboard',
      'PORTAL': '/portal/dashboard'
    };
    targetRoute = fallbackRoutes[appKey] || '/dashboard';
    console.warn(`[AppSwitcher] No defaultRoute for ${appKey}, using fallback: ${targetRoute}`);
  }
  
  // For other apps (Audit, Portal), use router.push as they have their own layouts
  router.push(targetRoute);
};

// Load apps from /api/ui/apps on mount if not already loaded
onMounted(async () => {
  if (apps.value.length === 0 && authStore.isAuthenticated) {
    try {
      const response = await apiClient('/ui/apps');
      if (response.success && response.data) {
        // Filter out CONTROL_PLANE before storing
        const filtered = response.data.filter(app => {
          const appKeyUpper = app.appKey?.toUpperCase();
          return appKeyUpper !== 'CONTROL_PLANE' && appKeyUpper !== 'CONTROL PLANE';
        });
        appShellStore.availableApps = filtered;
        
        // Set active app if not set
        if (!appShellStore.activeApp && filtered.length > 0) {
          appShellStore.activeApp = filtered[0].appKey;
        }
      }
    } catch (error) {
      console.error('[AppSwitcher] Error loading apps:', error);
    }
  }
});
</script>

<style scoped>
.app-switcher {
  /* Component-specific styles if needed */
}
</style>

