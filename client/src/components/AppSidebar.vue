<template>
  <nav
    class="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-white/10"
    :class="[
      collapsed ? 'w-20' : 'w-64',
      'transition-all duration-300 ease-in-out'
    ]"
  >
    <!-- Core Section -->
    <div v-if="sidebarStructure.core.length > 0" class="px-2 py-4 border-b border-gray-200 dark:border-white/10">
      <div class="space-y-1">
        <a
          v-for="item in sidebarStructure.core"
          :key="item.key"
          :href="item.route"
          @click.prevent="handleCoreClick(item.route)"
          :class="[
            'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
            isActiveRoute(item.route)
              ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
            collapsed ? 'justify-center' : ''
          ]"
          :title="collapsed ? item.label : ''"
        >
          <component
            v-if="getIconComponent(item.icon)"
            :is="getIconComponent(item.icon)"
            class="w-5 h-5 flex-shrink-0"
          />
          <span v-if="!collapsed" class="ml-3">{{ item.label }}</span>
        </a>
      </div>
    </div>

    <!-- Entities Section -->
    <div v-if="sidebarStructure.entities.length > 0" class="px-2 py-4 border-b border-gray-200 dark:border-white/10">
      <div class="space-y-1">
        <a
          v-for="item in sidebarStructure.entities"
          :key="item.key"
          :href="item.route"
          @click.prevent="handleEntityClick(item.route)"
          :class="[
            'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
            isActiveRoute(item.route)
              ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
            collapsed ? 'justify-center' : ''
          ]"
          :title="collapsed ? item.label : ''"
        >
          <component
            v-if="getIconComponent(item.icon)"
            :is="getIconComponent(item.icon)"
            class="w-5 h-5 flex-shrink-0"
          />
          <span v-if="!collapsed" class="ml-3">{{ item.label }}</span>
        </a>
      </div>
    </div>

    <!-- Apps Section (Domain Workflows) -->
    <div v-if="sidebarStructure.apps.length > 0" class="flex-1 overflow-y-auto px-2 py-4">
      <div class="space-y-1">
        <div
          v-for="app in sidebarStructure.apps"
          :key="app.appKey"
          class="space-y-1"
        >
          <!-- App Header -->
          <div class="flex items-center">
            <!-- App Header Label (Navigates to Dashboard) -->
            <a
              :href="app.dashboardRoute"
              @click.prevent="handleAppHeaderClick(app.dashboardRoute, app.appKey)"
              :class="[
                'flex-1 flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200',
                isActiveApp(app)
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
                collapsed ? 'justify-center' : ''
              ]"
              :title="collapsed ? app.label : ''"
            >
              <component
                v-if="getIconComponent(app.icon)"
                :is="getIconComponent(app.icon)"
                class="w-5 h-5 flex-shrink-0"
              />
              <span v-if="!collapsed" class="ml-3">{{ app.label }}</span>
            </a>

            <!-- Chevron (Expand/Collapse Only - Never Navigates) -->
            <button
              v-if="app.children.length > 0 && !collapsed"
              @click.stop="handleChevronClick(app.appKey)"
              class="ml-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              :title="isAppExpanded(app.appKey) ? 'Collapse' : 'Expand'"
            >
              <ChevronDownIcon
                v-if="isAppExpanded(app.appKey)"
                class="w-4 h-4"
              />
              <ChevronRightIcon
                v-else
                class="w-4 h-4"
              />
            </button>
          </div>

          <!-- App Modules (Children) -->
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-96"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 max-h-96"
            leave-to-class="opacity-0 max-h-0"
          >
            <div
              v-if="isAppExpanded(app.appKey) && app.children.length > 0"
              class="ml-4 space-y-1 border-l border-gray-200 dark:border-white/10 pl-3"
            >
              <a
                v-for="module in app.children"
                :key="module.moduleKey"
                :href="module.route"
                @click.prevent="handleModuleClick(module.route)"
                :class="[
                  'flex items-center rounded-lg px-3 py-2 text-sm transition-colors duration-200',
                  isActiveModule(module.route)
                    ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                ]"
              >
                <component
                  v-if="getIconComponent(module.icon)"
                  :is="getIconComponent(module.icon)"
                  class="w-4 h-4 flex-shrink-0"
                />
                <span class="ml-2">{{ module.label }}</span>
              </a>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Platform Section -->
    <div v-if="sidebarStructure.platform.length > 0" class="px-2 py-4 border-t border-gray-200 dark:border-white/10">
      <div class="space-y-1">
        <a
          v-for="item in sidebarStructure.platform"
          :key="item.key"
          :href="item.route"
          @click.prevent="handlePlatformClick(item.route)"
          :class="[
            'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
            isActiveRoute(item.route)
              ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
            collapsed ? 'justify-center' : ''
          ]"
          :title="collapsed ? item.label : ''"
        >
          <component
            v-if="getIconComponent(item.icon)"
            :is="getIconComponent(item.icon)"
            class="w-5 h-5 flex-shrink-0"
          />
          <span v-if="!collapsed" class="ml-3">{{ item.label }}</span>
        </a>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
/**
 * ============================================================================
 * PLATFORM SIDEBAR: Main Component
 * ============================================================================
 * 
 * Renders sidebar entirely from SidebarStructure.
 * No registry or permission logic inside component.
 * Component is a renderer, not a decision-maker.
 * 
 * Interaction Rules:
 * - Domain header label → Navigate to dashboardRoute
 * - Domain chevron → Expand/collapse only (never navigates)
 * - Leaf module → Navigate to module route
 * - Core items → Navigate immediately
 * - Platform items → Navigate immediately
 * 
 * Active State Rules:
 * - Active module → Highlight module, auto-expand its domain
 * - Active dashboard (/:appKey) → Highlight domain header, domain expanded
 * - Active core/platform route → No domain auto-expansion
 * 
 * Route Assumptions:
 * - /home
 * - /:appKey → App dashboard
 * - /:appKey/:moduleKey → Module view
 * - /settings/*
 * - /apps
 * 
 * ============================================================================
 */

import { computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSidebarState, setLastActiveDomain } from '@/composables/useSidebarState';
import type { SidebarStructure } from '@/types/sidebar.types';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  CalendarIcon,
  CogIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CubeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline';

// Props
const props = defineProps<{
  sidebarStructure: SidebarStructure;
  collapsed?: boolean;
}>();

// Router
const route = useRoute();
const router = useRouter();

// Sidebar state management
const appKeys = computed(() => props.sidebarStructure.apps.map((a) => a.appKey));
const { isDomainExpanded: isAppExpanded, toggleDomain: toggleApp, expandDomain: expandApp } = useSidebarState(appKeys.value);

// Icon mapping
const iconMap: Record<string, any> = {
  home: HomeIcon,
  users: UsersIcon,
  'building-office': BuildingOfficeIcon,
  briefcase: BriefcaseIcon,
  'check-circle': CheckCircleIcon,
  calendar: CalendarIcon,
  cog: CogIcon,
  squares: Squares2X2Icon,
  'clipboard-document': ClipboardDocumentIcon,
  cube: CubeIcon,
  'arrow-down-tray': ArrowDownTrayIcon,
};

/**
 * Get icon component from icon identifier
 */
function getIconComponent(icon?: string) {
  if (!icon) return null;
  return iconMap[icon] || null;
}

/**
 * Check if a route is currently active
 */
function isActiveRoute(routePath: string): boolean {
  return route.path === routePath || route.path.startsWith(routePath + '/');
}

/**
 * Check if a module route is active
 */
function isActiveModule(moduleRoute: string): boolean {
  return isActiveRoute(moduleRoute);
}

/**
 * Check if an app is active (dashboard route matches)
 */
function isActiveApp(app: { dashboardRoute: string; appKey: string }): boolean {
  // Check if we're on the dashboard route exactly
  if (route.path === app.dashboardRoute) {
    return true;
  }
  
  // Check if we're on a module route within this app
  // Route structure: /:appKey/:moduleKey or /moduleKey (legacy)
  const pathParts = route.path.split('/').filter(Boolean);
  
  // Check if any module in this app is active
  const appModules = props.sidebarStructure.apps
    .find((a) => a.appKey === app.appKey)
    ?.children || [];
  
  return appModules.some((module) => isActiveModule(module.route));
}

/**
 * Handle core item click - navigate immediately
 */
function handleCoreClick(routePath: string) {
  router.push(routePath);
}

/**
 * Handle entity click - navigate immediately
 */
function handleEntityClick(routePath: string) {
  router.push(routePath);
}

/**
 * Handle app header click - navigate to dashboard
 * Also updates last active app for state persistence
 */
function handleAppHeaderClick(routePath: string, appKey: string) {
  setLastActiveDomain(appKey);
  router.push(routePath);
}

/**
 * Handle chevron click - expand/collapse only (never navigates)
 */
function handleChevronClick(appKey: string) {
  toggleApp(appKey);
}

/**
 * Handle module click - navigate to module route
 * Auto-expand app if collapsed
 */
function handleModuleClick(routePath: string) {
  // Find which app this module belongs to
  const app = props.sidebarStructure.apps.find((a) =>
    a.children.some((m) => m.route === routePath)
  );
  
  if (app) {
    // Auto-expand app if collapsed
    if (!isAppExpanded(app.appKey)) {
      expandApp(app.appKey);
    }
    setLastActiveDomain(app.appKey);
  }
  
  router.push(routePath);
}

/**
 * Handle platform item click - navigate immediately
 */
function handlePlatformClick(routePath: string) {
  router.push(routePath);
}

/**
 * Auto-expand app when active module is detected
 */
watch(
  () => route.path,
  (newPath) => {
    // Find active app based on route
    for (const app of props.sidebarStructure.apps) {
      // Check if route matches dashboard
      if (newPath === app.dashboardRoute) {
        expandApp(app.appKey);
        setLastActiveDomain(app.appKey);
        return;
      }
      
      // Check if route matches any module in this app
      const hasActiveModule = app.children.some((module) =>
        isActiveModule(module.route)
      );
      
      if (hasActiveModule) {
        expandApp(app.appKey);
        setLastActiveDomain(app.appKey);
        return;
      }
    }
  },
  { immediate: true }
);

/**
 * On mount: Auto-expand app if we're on an active route
 */
onMounted(() => {
  // Check current route and auto-expand if needed
  for (const app of props.sidebarStructure.apps) {
    if (isActiveApp(app)) {
      expandApp(app.appKey);
      setLastActiveDomain(app.appKey);
    }
  }
});
</script>

<style scoped>
/* Component-specific styles */
</style>

