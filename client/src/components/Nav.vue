<script setup>
import { useRouter, useRoute } from 'vue-router';
import { useTabs } from '@/composables/useTabs';
import { useAuthStore } from '@/stores/auth';
import { useAppShellStore } from '@/stores/appShell';
import NotificationBell from '@/components/notifications/NotificationBell.vue';
import NotificationDrawer from '@/components/notifications/NotificationDrawer.vue';
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';
import { useColorMode } from '@/composables/useColorMode';
import AppSidebar from '@/components/AppSidebar.vue';
import { initializeDynamicRoutes } from '@/router';
import { Dialog, DialogPanel, TransitionChild, TransitionRoot, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { 
  Bars3Icon, 
  BellIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

// Define props and emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const router = useRouter();
const route = useRoute();
const { openTab } = useTabs();
const showDrawer = ref(false);
const isCollapsed = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const sidebarOpen = ref(false);
const isHovering = ref(false);

// Computed to determine if sidebar should show expanded
const shouldShowExpanded = computed(() => {
  return !isCollapsed.value || isHovering.value;
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  
  // Dispatch custom event so TabBar can react to sidebar state change
  window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
    detail: { collapsed: isCollapsed.value } 
  }));
};

const toggleMobileMenu = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const handleMouseEnter = () => {
  if (isCollapsed.value) {
    isHovering.value = true;
  }
};

const handleMouseLeave = () => {
  isHovering.value = false;
};

// Close mobile menu when route changes
watch(() => route.path, () => {
  sidebarOpen.value = false;
});

// ============================================================================
// PLATFORM UI: Sidebar from Registry (Phase 1A - Full Cutover)
// ============================================================================
// 
// Removed:
// - AppSwitcher component
// - Per-app navigation logic
// - Hardcoded module lists
// - Inline permission checks
//
// Replaced with:
// - buildSidebarFromRegistry(registry, permissionSnapshot)
// - SidebarStructure rendering
// ============================================================================

// Initialize stores first (before any functions that use them)
const { colorMode, toggleColorMode, clearStoredMode } = useColorMode();
const authStore = useAuthStore();

// ARCHITECTURE NOTE: GlobalSearch is now handled by GlobalSurfacesProvider in App.vue
// This component can dispatch 'litedesk:open-global-search' event to open search if needed

// App registry and sidebar structure
const appRegistry = ref({});
const sidebarStructure = ref(null);
const loadingSidebar = ref(false);

// Build sidebar from registry
const buildSidebar = async () => {
  if (!authStore.user || !authStore.isAuthenticated) {
    sidebarStructure.value = null;
    return;
  }
  
  loadingSidebar.value = true;
  try {
    // Fetch app registry
    const registry = await getAppRegistry();
    
    // Check if component is still mounted and user is still authenticated
    if (!authStore.user || !authStore.isAuthenticated) {
      return;
    }
    
    appRegistry.value = registry;
    
    // Create permission snapshot
    const snapshot = createPermissionSnapshot(authStore.user);
    
    // Build locked SidebarStructure (single source of truth)
    const structure = await buildSidebarFromRegistry(registry, snapshot);
    
    // Double-check before setting (component might have unmounted)
    if (authStore.user && authStore.isAuthenticated) {
      sidebarStructure.value = structure;
    }
  } catch (error) {
    console.error('[Nav] Error building sidebar:', error);
    // Only set to null if still authenticated (might have logged out)
    if (authStore.isAuthenticated) {
      sidebarStructure.value = null;
    }
  } finally {
    if (authStore.isAuthenticated) {
      loadingSidebar.value = false;
    }
  }
};

// Watch for user changes to rebuild sidebar
watch(() => authStore.user, (newUser) => {
  if (newUser && authStore.isAuthenticated) {
    buildSidebar();
  } else {
    sidebarStructure.value = null;
  }
}, { immediate: true });

// Watch for authentication changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated && authStore.user) {
    buildSidebar();
  } else {
    sidebarStructure.value = null;
  }
});

// Global search handlers
// ARCHITECTURE NOTE: GlobalSearch keyboard shortcuts and event listeners
// are now handled by GlobalSurfacesProvider in App.vue
// This component can dispatch custom events if needed for UI triggers

// Refresh sidebar and dynamic routes when modules change (e.g. Settings → Module details, or new custom module)
const onCoreModulesUpdated = async () => {
  if (authStore.user && authStore.isAuthenticated) {
    buildSidebar();
    try {
      await initializeDynamicRoutes();
    } catch (e) {
      console.warn('[Nav] Failed to refresh dynamic routes:', e);
    }
  }
};

const handleNotificationClick = () => {
  const width = window.innerWidth || 0;
  if (width >= 1024) {
    // lg+: in-app drawer (tablet top bar shares this path only when viewport ≥1024)
    showDrawer.value = true;
  } else {
    // Below lg breakpoint: bottom sheet (App.vue)
    window.dispatchEvent(new CustomEvent('sales-open-notifications'));
  }
};

onMounted(() => {
  if (authStore.user && authStore.isAuthenticated) {
    buildSidebar();
  }
  window.addEventListener('litedesk:core-modules-updated', onCoreModulesUpdated);
  window.addEventListener('litedesk:open-notifications-panel', handleNotificationClick);
});

onUnmounted(() => {
  window.removeEventListener('litedesk:core-modules-updated', onCoreModulesUpdated);
  window.removeEventListener('litedesk:open-notifications-panel', handleNotificationClick);
});

// User info and handlers (avatar + menu parity with TabBar)
const userName = computed(() => authStore.user?.username || 'User');
const userVertical = computed(() => authStore.user?.vertical || 'N/A');
const workspaceName = computed(() => authStore.organization?.name || `${userName.value}'s Space`);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=128&h=128&q=80';

const workspaceAvatar = computed(() => authStore.user?.avatar || DEFAULT_AVATAR);

const isAdmin = computed(() => authStore.isAdminLike || authStore.isPlatformAdmin);

/** Same compact bell treatment as TabBar (mobile / tablet top bar). */
const shellTopBarBellClass =
  '!min-h-9 !min-w-9 !p-1.5 rounded-md !border-0 !bg-transparent shadow-none hover:!bg-gray-100 dark:hover:!bg-gray-700 [&_svg]:!w-6 [&_svg]:!h-6';

const handleLogout = () => {
  authStore.logout();
  router.push('/');
  authStore.error = null;
};

const toggleColorModeFromMenu = () => {
  toggleColorMode(colorMode.value === 'light' ? 'dark' : 'light');
};

// Menu items for the user dropdown (match TabBar account menu)
const userMenuItems = computed(() => {
  const items = [{ name: 'Your Profile', action: () => router.push('/profile') }];

  if (isAdmin.value) {
    items.push({ name: 'Control Panel', action: () => router.push('/control') });
  }

  items.push({ name: 'Settings', action: () => openTab('/settings', { title: 'Settings' }) });

  if (authStore.can('settings', 'view')) {
    items.push({ name: 'Trash', action: () => router.push('/trash') });
  }

  items.push(
    {
      name: colorMode.value === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode',
      action: toggleColorModeFromMenu,
    },
    { name: 'Sign out', action: handleLogout, divider: true, isLogout: true }
  );

  return items;
});

const logoSrc = computed(() => {
    // If colorMode is 'dark' or 'system' (and system is dark), use the light-colored logo
    if (colorMode.value === 'dark' || (colorMode.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        // IMPORTANT: Update this path to your actual logo file for dark backgrounds
        return '/public/assets/nurtura_logo_white.svg'; 
    } else {
        // Use the dark-colored logo for light backgrounds
        // IMPORTANT: Update this path to your actual logo file for light backgrounds
        return '/public/assets/nurtura_logo_plain.svg'; 
    }
});
</script>

<template>
  <div>
    <!-- Keep NotificationBell mounted (store + realtime), but render notifications row in sidebar list -->
    <div class="hidden">
      <NotificationBell />
    </div>

    <!-- Mobile sidebar -->
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild as="template" enter="transition-opacity ease-linear duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="transition-opacity ease-linear duration-300" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-900/80 dark:bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild as="template" enter="transition ease-in-out duration-300 transform" enter-from="-translate-x-full" enter-to="translate-x-0" leave="transition ease-in-out duration-300 transform" leave-from="translate-x-0" leave-to="-translate-x-full">
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild as="template" enter="ease-in-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in-out duration-300" leave-from="opacity-100" leave-to="opacity-0">
                <div class="absolute top-0 left-full flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="size-6 text-white dark:text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>

              <!-- Mobile Sidebar component -->
              <div class="relative flex grow flex-col overflow-y-auto bg-white dark:bg-gray-900 ring ring-gray-200 dark:ring-white/10 before:pointer-events-none before:absolute before:inset-0 before:bg-gray-50 dark:before:bg-black/10">
                <div class="relative flex grow">
                  <AppSidebar
                    v-if="sidebarStructure"
                    :sidebar-structure="sidebarStructure"
                    :collapsed="false"
                    :on-toggle-collapse="toggleSidebar"
                    embedded
                  />

                  <!-- Loading State -->
                  <div v-if="loadingSidebar" class="px-2 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </div>

                  <!-- Empty State -->
                  <div v-if="!loadingSidebar && !sidebarStructure" class="px-2 py-4 text-center text-sm text-gray-500">
                    No navigation available
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Desktop Sidebar Container with expand/collapse functionality -->
    <div 
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      :class="[
        'fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out',
        // AppSidebar owns the visual container (Figma-accurate).
        'bg-transparent border-0 flex flex-col',
        // Desktop
        'hidden lg:flex',
        // Width based on expanded state (click or hover)
        // Responsive: 15.833rem (190px) expanded, 4rem collapsed (matches AppSidebar w-[4rem])
        shouldShowExpanded ? 'lg:w-[15.833rem]' : 'lg:w-[4rem]',
        // Z-index only (shadow handled by AppSidebar)
        'z-50'
      ]"
    >
      <!-- Navigation Links - Rendered by AppSidebar (locked SidebarStructure) -->
      <div class="flex-1 overflow-y-auto">
        <AppSidebar
          v-if="sidebarStructure"
          :sidebar-structure="sidebarStructure"
          :collapsed="!shouldShowExpanded"
          :on-toggle-collapse="toggleSidebar"
          embedded
        />

        <!-- Loading State -->
        <div v-if="loadingSidebar" class="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>

        <!-- Empty State -->
        <div v-if="!loadingSidebar && !sidebarStructure" class="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No navigation available
        </div>
      </div>

    </div>

    <!-- Mobile top bar -->
    <div class="fixed top-0 left-0 right-0 z-50 flex items-center gap-x-6 bg-white dark:bg-gray-900 px-4 py-3 h-16 after:pointer-events-none after:absolute after:inset-0 after:border-b after:border-gray-200 dark:after:border-white/10 dark:after:bg-black/10 sm:px-6 lg:hidden">
      <button type="button" class="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white lg:hidden" @click="sidebarOpen = true">
        <span class="sr-only">Open sidebar</span>
        <Bars3Icon class="size-6 text-gray-900 dark:text-gray-400" aria-hidden="true" />
      </button>
      <div class="flex-1 text-sm/6 font-semibold text-gray-900 dark:text-white">Dashboard</div>
      <div
        v-if="authStore.user"
        class="flex items-center gap-3 pl-2 sm:pl-3"
      >
        <NotificationBell
          :connect-stream="false"
          :show-count-on-desktop="true"
          :class="shellTopBarBellClass"
          @toggle="handleNotificationClick"
        />

        <Menu as="div" class="relative">
          <MenuButton
            class="rounded-full overflow-hidden w-8 h-8 flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-600 hover:ring-gray-300 dark:hover:ring-gray-500 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <img :src="workspaceAvatar" alt="" class="w-full h-full object-cover" />
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
              class="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 z-50"
            >
              <template v-for="(item, index) in userMenuItems" :key="index">
                <hr v-if="item.divider" class="my-1 border-gray-200 dark:border-gray-700" />
                <MenuItem v-slot="{ active }">
                  <button
                    @click="item.action()"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors duration-150',
                      active ? 'bg-gray-100 dark:bg-gray-700' : '',
                      item.isLogout
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    {{ item.name }}
                  </button>
                </MenuItem>
              </template>
            </MenuItems>
          </transition>
        </Menu>
      </div>
    </div>
  </div>
  <NotificationDrawer
    :open="showDrawer"
    app-key="SALES"
    @close="showDrawer = false"
  />
  
  <!-- ARCHITECTURE NOTE: GlobalSearch is rendered by GlobalSurfacesProvider in App.vue -->
  <!-- This ensures it's available across all layouts (Sales, Audit, Portal, etc.) -->
</template>