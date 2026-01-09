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

    <!-- Desktop Sidebar - Phase 2D: Use shared SidebarRenderer -->
    <aside 
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      :class="[
        'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40',
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700',
        'transition-all duration-300 ease-in-out',
        shouldShowExpanded ? 'lg:w-64' : 'lg:w-20'
      ]"
    >
      <!-- Logo Section -->
      <div class="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700">
        <transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 w-0"
          enter-to-class="opacity-100 w-auto"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 w-auto"
          leave-to-class="opacity-0 w-0"
        >
          <img 
            v-if="shouldShowExpanded"
            class="h-8 w-auto transition-all duration-300" 
            :src="logoSrc" 
            alt="LiteDesk Logo" 
          />
        </transition>
        
        <!-- Collapse/Expand Button -->
        <button
          @click="toggleSidebar"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-white transition-all duration-300 flex-shrink-0"
          :class="{ 'mx-auto': !shouldShowExpanded }"
        >
          <ChevronLeftIcon v-if="shouldShowExpanded" class="w-5 h-5 transition-transform duration-300" />
          <ChevronRightIcon v-else class="w-5 h-5 transition-transform duration-300" />
        </button>
      </div>
      
      <!-- App Switcher -->
      <div v-if="useDynamicUI && shouldShowExpanded" class="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
        <AppSwitcher />
      </div>
      
      <!-- Navigation - Phase 2D: Use SidebarRenderer -->
      <SidebarRenderer 
        v-if="useDynamicUI"
        :should-show-expanded="shouldShowExpanded"
      />
      <nav v-else class="flex-1 px-4 py-4 space-y-1">
        <!-- Fallback to hardcoded navigation if dynamic UI not available -->
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors"
          :class="[
            $route.path === item.href || $route.path.startsWith(item.href + '/')
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="item.name === 'Dashboard'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {{ item.name }}
        </router-link>
      </nav>
      
      <!-- Profile Section at Bottom (Desktop) -->
      <div class="border-t border-gray-200 dark:border-gray-700 p-4">
        <Menu as="div" class="relative">
          <MenuButton
            class="w-full flex items-center rounded-lg py-2.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
          >
            <img
              class="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 flex-shrink-0"
              :src="authStore.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'"
              :alt="authStore.user?.username || 'User'"
            />
            <div class="flex-1 ml-3 text-left overflow-hidden">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ authStore.user?.username || 'User' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ authStore.userRole || 'Auditor' }}</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
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
              class="absolute bottom-full mb-2 w-48 rounded-lg shadow-xl py-1 bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 left-0 z-50"
            >
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
      </div>
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
        <!-- Phase 2D: Use SidebarRenderer for mobile drawer -->
        <SidebarRenderer 
          v-if="useDynamicUI"
          :should-show-expanded="true"
        />
        <nav v-else class="px-4 py-4 space-y-1">
          <!-- Fallback to hardcoded navigation -->
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            @click="drawerOpen = false"
            class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors"
            :class="[
              $route.path === item.href || $route.path.startsWith(item.href + '/')
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="item.name === 'Dashboard'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {{ item.name }}
          </router-link>
        </nav>
      </div>
    </div>

    <!-- Main Content - Phase 2D: Dynamic margin based on sidebar state -->
    <main 
      :class="[
        'flex-1 transition-all duration-300',
        shouldShowExpanded ? 'lg:pl-64' : 'lg:pl-20'
      ]"
    >
      <div class="min-h-screen">
        <RouterView />
      </div>
    </main>

    <!-- Sync Drawer (Mobile) -->
    <SyncDrawer v-model="syncDrawerOpen" />

    <!-- Notification Sheet (mobile) -->
    <NotificationSheet
      :open="notificationSheetOpen"
      app-key="AUDIT"
      :mark-all-disabled="false"
      @close="notificationSheetOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { useAuthStore } from '@/stores/auth';
import { useAppShellStore } from '@/stores/appShell';
import { useColorMode } from '@/composables/useColorMode';
import SyncDrawer from '@/components/audit/SyncDrawer.vue';
import { getPendingCount } from '@/services/offlineQueue.js';
import NotificationBell from '@/components/notifications/NotificationBell.vue';
import NotificationSheet from '@/components/notifications/NotificationSheet.vue';
import AppSwitcher from '@/components/AppSwitcher.vue';
import SidebarRenderer from '@/components/SidebarRenderer.vue';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appShellStore = useAppShellStore();
const { colorMode, toggleColorMode } = useColorMode();

const drawerOpen = ref(false);
const syncDrawerOpen = ref(false);
const pendingCount = ref(0);
const notificationSheetOpen = ref(false);

// Phase 2D: Sidebar state (same as Nav.vue)
const isCollapsed = ref(
  localStorage.getItem('litedesk-sidebar-collapsed') === 'true'
);
const isHovering = ref(false);

// Computed to determine if sidebar should show expanded
const shouldShowExpanded = computed(() => {
  return !isCollapsed.value || isHovering.value;
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('litedesk-sidebar-collapsed', isCollapsed.value.toString());
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

// Phase 2D: Check if dynamic UI is available
const useDynamicUI = computed(() => appShellStore.isLoaded && appShellStore.availableApps.length > 0);

onMounted(async () => {
  // Phase 2D: Load UI metadata if not already loaded (App.vue also does this, but safe to check)
  if (!appShellStore.isLoaded && authStore.isAuthenticated) {
    await appShellStore.loadUIMetadata();
  }
  
  // Load pending count
  updatePendingCount();
  const interval = setInterval(updatePendingCount, 5000);
  onBeforeUnmount(() => clearInterval(interval));
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

// Phase 2D: Logo source (same as Nav.vue)
const logoSrc = computed(() => {
  if (colorMode.value === 'dark' || (colorMode.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    return '/public/assets/nurtura_logo_white.svg';
  } else {
    return '/public/assets/nurtura_logo_plain.svg';
  }
});

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

onMounted(() => {
  updatePendingCount();
  const interval = setInterval(updatePendingCount, 5000);
  onBeforeUnmount(() => clearInterval(interval));
});

// Navigation items
const navigation = [
  {
    name: 'Dashboard',
    href: '/audit/dashboard'
  },
  {
    name: 'My Audits',
    href: '/audit/audits'
  },
  {
    name: 'Settings',
    href: '/audit/settings/notifications'
  }
];
</script>

