<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Mobile Top Bar -->
    <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:hidden">
      <div class="flex items-center justify-between px-4 h-14">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Audit</h1>
        <div class="flex items-center gap-2">
          <!-- Notification bell (mobile) -->
          <NotificationBell
            class="md:hidden"
            :show-count-on-desktop="false"
            @toggle="notificationSheetOpen = true"
          />
          
          <button
            v-if="pendingCount > 0"
            @click="syncDrawerOpen = true"
            class="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Sync status"
          >
            <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">{{ pendingCount }}</span>
          </button>
          
          <!-- Profile Dropdown (Mobile) -->
          <Menu as="div" class="relative">
            <MenuButton class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <img
                class="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                :src="authStore.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'"
                :alt="authStore.user?.username || 'User'"
              />
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
                class="absolute right-0 mt-2 w-48 rounded-lg shadow-xl py-1 bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 z-50"
              >
                <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ authStore.user?.username || 'User' }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ authStore.userRole || 'Auditor' }}</p>
                </div>
                <MenuItem v-if="hasSalesAccess" v-slot="{ active }">
                  <button
                    @click="router.push('/settings')"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      active ? 'bg-gray-100 dark:bg-gray-700' : '',
                      'text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    Settings
                  </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                  <button
                    @click="toggleColorModeFromMenu"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      active ? 'bg-gray-100 dark:bg-gray-700' : '',
                      'text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    {{ colorModeLabel }}
                  </button>
                </MenuItem>
                <hr class="my-1 border-gray-200 dark:border-gray-700" />
                <MenuItem v-slot="{ active }">
                  <button
                    @click="handleLogout"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      active ? 'bg-gray-100 dark:bg-gray-700' : '',
                      'text-red-600 dark:text-red-400'
                    ]"
                  >
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
          
          <button
            @click="drawerOpen = !drawerOpen"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle menu"
          >
            <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!drawerOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Desktop Sidebar -->
    <!-- ARCHITECTURE NOTE: GlobalSearch is owned by GlobalSurfacesProvider. -->
    <!-- Sidebar search click dispatches litedesk:open-global-search custom event. -->
    <aside 
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      :class="[
        'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40',
        'transition-all duration-300 ease-in-out'
      ]"
    >
      <AppSidebar
        v-if="sidebarStructure"
        :sidebar-structure="sidebarStructure"
        :collapsed="!shouldShowExpanded"
        :on-toggle-collapse="toggleSidebar"
        :on-notifications-click="handleNotificationsClick"
      />
    </aside>

    <!-- Mobile Drawer -->
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-50 lg:hidden"
      @click="drawerOpen = false"
    >
      <div class="fixed inset-0 bg-black bg-opacity-50" />
      <div class="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl">
        <div class="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
          <button
            @click="drawerOpen = false"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="px-2 py-2">
          <AppSidebar
            v-if="sidebarStructure"
            :sidebar-structure="sidebarStructure"
            :collapsed="false"
            embedded
            :on-notifications-click="handleNotificationsClick"
          />
        </div>
      </div>
    </div>

    <!-- Main Content - Phase 2D: Dynamic margin based on sidebar state -->
    <main 
      :class="[
        'flex-1 transition-all duration-300',
        shouldShowExpanded ? 'lg:pl-[15.833rem]' : 'lg:pl-[5rem]'
      ]"
    >
      <!-- Tab Bar - Hidden on mobile, visible on tablet and up -->
      <TabBar class="hidden md:block" />
      
      <div class="min-h-screen pt-12 md:pt-14">
        <RouterView v-slot="{ Component }">
          <keep-alive :max="10">
            <component :is="Component" :key="$route.fullPath" />
          </keep-alive>
        </RouterView>
      </div>
    </main>

    <!-- Sync Drawer (Mobile) -->
    <SyncDrawer v-model="syncDrawerOpen" />

    <!-- Notification Drawer (Desktop) -->
    <NotificationDrawer
      :open="notificationDrawerOpen"
      app-key="AUDIT"
      :mark-all-disabled="false"
      @close="notificationDrawerOpen = false"
    />

    <!-- Notification Sheet (Mobile) -->
    <NotificationSheet
      :open="notificationSheetOpen"
      app-key="AUDIT"
      :mark-all-disabled="false"
      @close="notificationSheetOpen = false"
    />
  </div>
</template>

<script setup>
/**
 * ARCHITECTURE NOTE: GlobalSearch is NOT imported here.
 * 
 * GlobalSearch is owned by GlobalSurfacesProvider (mounted in App.vue).
 * This layout triggers search via custom events only (litedesk:open-global-search).
 * App layouts must NEVER own global surfaces - see GlobalSurfacesProvider.vue.
 */

import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { useAuthStore } from '@/stores/auth';
import { useAppShellStore } from '@/stores/appShell';
import { useColorMode } from '@/composables/useColorMode';
import { useSidebarState } from '@/composables/useSidebarState';
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';
import SyncDrawer from '@/components/audit/SyncDrawer.vue';
import { getPendingCount } from '@/services/offlineQueue.js';
import NotificationBell from '@/components/notifications/NotificationBell.vue';
import NotificationSheet from '@/components/notifications/NotificationSheet.vue';
import NotificationDrawer from '@/components/notifications/NotificationDrawer.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import TabBar from '@/components/TabBar.vue';
import { configureTabsStorage, useTabs } from '@/composables/useTabs';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appShellStore = useAppShellStore();
const { colorMode, toggleColorMode } = useColorMode();
const { collapsed } = useSidebarState();
const { initTabs, setupRouteWatcher } = useTabs();

const drawerOpen = ref(false);
const syncDrawerOpen = ref(false);
const pendingCount = ref(0);
const notificationSheetOpen = ref(false);
const notificationDrawerOpen = ref(false);

// Sidebar collapsed state (shared)
const isCollapsed = collapsed;
const isHovering = ref(false);

// Computed to determine if sidebar should show expanded
const shouldShowExpanded = computed(() => {
  return !isCollapsed.value || isHovering.value;
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
    detail: { collapsed: isCollapsed.value } 
  }));
};

const handleMouseEnter = () => {
  if (isCollapsed.value) {
    isHovering.value = true;
  }
};

const handleMouseLeave = () => {
  isHovering.value = false;
};

const sidebarStructure = ref(null);
const loadingSidebar = ref(false);
const pendingCountIntervalId = ref(null);

const buildSidebar = async () => {
  if (!authStore.user || !authStore.isAuthenticated) {
    sidebarStructure.value = null;
    return;
  }

  loadingSidebar.value = true;
  try {
    const registry = await getAppRegistry();
    if (!authStore.user || !authStore.isAuthenticated) return;
    const snapshot = createPermissionSnapshot(authStore.user);
    sidebarStructure.value = await buildSidebarFromRegistry(registry, snapshot);
  } catch (e) {
    console.error('[AuditLayout] Failed to build sidebar:', e);
    sidebarStructure.value = null;
  } finally {
    loadingSidebar.value = false;
  }
};

onMounted(async () => {
  // Phase 2D: Load UI metadata if not already loaded (App.vue also does this, but safe to check)
  if (!appShellStore.isLoaded && authStore.isAuthenticated) {
    await appShellStore.loadUIMetadata();
  }
  
  // Initialize tabs for audit layout
  if (authStore.isAuthenticated && authStore.user && authStore.organization) {
    const instanceId = authStore.organization?._id || authStore.organization?.instanceId;
    const userId = authStore.user?._id;
    
    if (instanceId && userId) {
      configureTabsStorage({ instanceId, userId });
      initTabs();
      setupRouteWatcher(router);
    } else {
      console.error('[AuditLayout] Skipping tab initialization: missing instanceId or userId', {
        instanceId,
        userId,
        organization: authStore.organization,
        user: authStore.user
      });
    }
  }
  
  await buildSidebar();
  
  // Load pending count
  updatePendingCount();
  pendingCountIntervalId.value = setInterval(updatePendingCount, 5000);
});

onBeforeUnmount(() => {
  if (pendingCountIntervalId.value != null) {
    clearInterval(pendingCountIntervalId.value);
    pendingCountIntervalId.value = null;
  }
});

const handleLogout = () => {
  authStore.logout();
  router.push('/');
  authStore.error = null;
};

const toggleColorModeFromMenu = () => {
  const newMode = colorMode.value === 'light' ? 'dark' : 'light';
  toggleColorMode(newMode);
};

const colorModeLabel = computed(() => {
  return colorMode.value === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
});

// Handle notifications click - desktop uses drawer, mobile uses sheet
const handleNotificationsClick = () => {
  // Check if we're on desktop (lg breakpoint and up)
  if (window.innerWidth >= 1024) {
    notificationDrawerOpen.value = true;
  } else {
    notificationSheetOpen.value = true;
  }
};

// Check if user has Sales access (for Settings link)
const hasSalesAccess = computed(() => {
  return authStore.hasAppAccess('SALES');
});

const updatePendingCount = async () => {
  try {
    pendingCount.value = await getPendingCount();
  } catch (err) {
    console.error('[AuditLayout] Error getting pending count:', err);
  }
};


</script>

