<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="mx-auto sm:px-6 lg:px-4 py-6 h-screen box-border flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage your account and organization settings</p>
        </div>
        <!-- User Menu (mode + sign out) -->
        <Menu as="div" class="relative">
          <MenuButton class="flex items-center gap-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <img 
              class="w-8 h-8 rounded-full ring-2 ring-white/10 dark:ring-white/10"
              :src="authStore.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'"
              alt="User avatar"
            />
            <span class="hidden sm:block text-sm font-medium text-gray-900 dark:text-white">{{ authStore.user?.username || 'User' }}</span>
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
              class="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl py-1 bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10"
            >
              <template v-for="(item, index) in userMenuItems" :key="index">
                <hr v-if="item.divider" class="my-1 border-gray-200 dark:border-gray-700" />
                <MenuItem v-slot="{ active }">
                  <button
                    @click="item.action()"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors duration-150',
                      active ? 'bg-gray-100 dark:bg-gray-700' : '',
                      item.isLogout ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
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

      <!-- Vertical Tabs Layout with collapsible left rail -->
      <div class="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6">
        <!-- Left: Vertical Nav (collapsible like main nav) -->
        <aside
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
          :class="[
            'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-none transition-all duration-300',
            shouldShowExpanded ? 'lg:w-64' : 'lg:w-20',
            'w-full h-full overflow-y-auto'
          ]"
        >
          <!-- Header with collapse/expand button -->
          <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-white/10 min-h-[3rem]">
            <transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 w-0" enter-to-class="opacity-100 w-auto" leave-active-class="transition-all duration-300" leave-from-class="opacity-100 w-auto" leave-to-class="opacity-0 w-0">
              <h2 v-if="shouldShowExpanded" class="text-sm font-semibold text-gray-900 dark:text-white truncate">Settings</h2>
            </transition>
          </div>

          <nav class="p-2">
            <ul class="space-y-1">
              <!-- Overview / Landing Page Option -->
              <li>
                <button
                  @click="activeTab = null; router.push('/settings')"
                  :title="!shouldShowExpanded ? 'Overview' : ''"
                  :class="[
                    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    !activeTab
                      ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  ]"
                >
                  <div class="flex items-center justify-center w-5">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 max-w-0" enter-to-class="opacity-100 max-w-xs" leave-active-class="transition-all duration-300 ease-in" leave-from-class="opacity-100 max-w-xs" leave-to-class="opacity-0 max-w-0">
                    <span v-if="shouldShowExpanded" class="truncate">Overview</span>
                  </transition>
                </button>
              </li>
              <li v-for="tab in tabs" :key="tab.id">
                <button
                  @click="activeTab = tab.id"
                  :title="!shouldShowExpanded ? tab.name : ''"
                  :class="[
                    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    activeTab === tab.id
                      ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  ]"
                >
                  <div class="flex items-center justify-center w-5">
                    <component :is="tab.icon" class="w-5 h-5" />
                  </div>
                  <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 max-w-0" enter-to-class="opacity-100 max-w-xs" leave-active-class="transition-all duration-300 ease-in" leave-from-class="opacity-100 max-w-xs" leave-to-class="opacity-0 max-w-0">
                    <span v-if="shouldShowExpanded" class="truncate">{{ tab.name }}</span>
                  </transition>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <!-- Right: Content -->
        <section class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 min-w-0 h-full overflow-y-auto">
          <SettingsLandingPage v-if="!activeTab || activeTab === 'landing'" />
          <CoreModuleDetail v-else-if="activeTab === 'core-modules' && route.query.moduleKey" />
          <ApplicationDetail v-else-if="activeTab === 'applications' && route.query.appKey && !route.query.app" />
          <AppsSettings v-else-if="activeTab === 'applications' && route.query.app" />
          <SubscriptionDetail v-else-if="activeTab === 'subscriptions' && route.query.appKey" />
          <component v-else :is="currentTabComponent" />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h, watch, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useColorMode } from '@/composables/useColorMode';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import PlatformSettings from '@/components/settings/PlatformSettings.vue';
import OrganizationSettings from '@/components/settings/OrganizationSettings.vue';
import SecuritySettings from '@/components/settings/SecuritySettings.vue';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings.vue';
import UsersAccessSettings from '@/components/settings/UsersAccessSettings.vue';
import AppsSettings from '@/components/settings/AppsSettings.vue';
import SettingsLandingPage from '@/components/settings/SettingsLandingPage.vue';
import CoreModulesList from '@/components/settings/CoreModulesList.vue';
import CoreModuleDetail from '@/components/settings/CoreModuleDetail.vue';
import ApplicationsList from '@/components/settings/ApplicationsList.vue';
import ApplicationDetail from '@/components/settings/ApplicationDetail.vue';
import SubscriptionsList from '@/components/settings/SubscriptionsList.vue';
import SubscriptionDetail from '@/components/settings/SubscriptionDetail.vue';

const authStore = useAuthStore();
const { colorMode, toggleColorMode } = useColorMode();

const SETTINGS_TAB_KEY = 'litedesk-settings-active-tab';
const route = useRoute();
const router = useRouter();
const activeTab = ref(route.query.tab || null);

// Collapsible left rail behavior (mirrors main nav)
const isCollapsed = ref(localStorage.getItem('litedesk-settings-collapsed') === 'true');
const isHovering = ref(false);
const shouldShowExpanded = computed(() => !isCollapsed.value || isHovering.value);
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};
const handleMouseEnter = () => { if (isCollapsed.value) isHovering.value = true; };
const handleMouseLeave = () => { isHovering.value = false; };
watch(isCollapsed, (v) => localStorage.setItem('litedesk-settings-collapsed', v.toString()));

// Icon components as functions
const UsersIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
  })
]);

const PlatformIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
  })
]);

const SecurityIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
  })
]);

const CRMIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
  }),
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  })
]);

const GroupsIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
  })
]);

const AppsIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
  })
]);

const BellIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
  })
]);

const tabs = computed(() => {
  return [
            { id: 'organization', name: 'Organization', icon: PlatformIcon, component: OrganizationSettings },
    { id: 'users-access', name: 'Users & Access', icon: UsersIcon, component: UsersAccessSettings },
    { id: 'core-modules', name: 'Core Modules', icon: CoreModulesIcon, component: CoreModulesList },
            { id: 'applications', name: 'Applications', icon: AppsIcon, component: ApplicationsList },
            { id: 'subscriptions', name: 'Subscriptions', icon: SubscriptionsIcon, component: SubscriptionsList },
            { id: 'security', name: 'Security', icon: SecurityIcon, component: SecuritySettings },
    { id: 'integrations', name: 'Integrations', icon: IntegrationsIcon, component: IntegrationsSettings }
  ];
});

const SubscriptionsIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
  })
]);

const IntegrationsIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
  })
]);

const CoreModulesIcon = () => h('svg', {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'
  })
]);
// User dropdown actions
const toggleColorModeFromMenu = () => {
  const newMode = colorMode.value === 'light' ? 'dark' : 'light';
  toggleColorMode(newMode);
};

const handleLogout = () => {
  authStore.logout();
  router.push('/');
  authStore.error = null;
};

const userMenuItems = computed(() => [
  { name: `Mode: ${colorMode.value === 'light' ? '🌙 Light' : '☀️ Dark'}`, action: toggleColorModeFromMenu, isModeToggle: true },
  { name: 'Sign out', action: handleLogout, divider: true, isLogout: true },
]);

const currentTabComponent = computed(() => {
  if (!activeTab.value) return null;
  
  // Handle detail views
  if (activeTab.value === 'core-modules' && route.query.moduleKey) {
    return CoreModuleDetail;
  }
  if (activeTab.value === 'applications' && route.query.appKey && !route.query.app) {
    return ApplicationDetail;
  }
  if (activeTab.value === 'subscriptions' && route.query.appKey) {
    return SubscriptionDetail;
  }
  
  const tab = tabs.value.find(t => t.id === activeTab.value);
  return tab?.component || null;
});

// Sync tab with URL (?tab=roles)
const syncTabFromRoute = () => {
  const q = route.query.tab;
  if (typeof q === 'string') {
    const exists = tabs.value.some(t => t.id === q);
    if (exists) activeTab.value = q;
  }
};
syncTabFromRoute();

watch(() => route.query.tab, () => {
  syncTabFromRoute();
});

watch(activeTab, (val) => {
  const current = route.query.tab;
  if (current !== val) {
    router.replace({ query: { ...route.query, tab: val } });
  }
});

// Restore last active tab and persist changes
const restoreInitialTab = () => {
  // If there's a tab in the URL query, use it
  if (route.query.tab) {
  const validIds = new Set(tabs.value.map(t => t.id));
    if (validIds.has(route.query.tab)) {
      activeTab.value = route.query.tab;
      return;
    }
  }
  
  // Otherwise, show landing page (no tab selected)
  activeTab.value = null;
};

restoreInitialTab();

watch(activeTab, (v) => {
  if (v) {
  localStorage.setItem(SETTINGS_TAB_KEY, v);
  }
});

// If available tabs change due to permission changes, keep the closest valid tab
watch(tabs, (list) => {
  if (activeTab.value) {
  const validIds = new Set(list.map(t => t.id));
  if (!validIds.has(activeTab.value)) {
      activeTab.value = null; // Show landing page if tab is invalid
    }
  }
});
</script>
