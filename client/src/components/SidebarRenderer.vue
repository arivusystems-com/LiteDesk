<template>
  <nav class="flex-1 overflow-y-auto py-4 px-2">
    <div class="space-y-1">
      <a
        v-for="module in visibleModules"
        :key="module.moduleKey"
        :href="module.routeBase"
        @click.prevent="handleModuleClick(module, $event)"
        @auxclick.prevent="handleModuleClick(module, $event)"
        :class="[
          'flex items-center rounded-lg transition-colors duration-200',
          'hover:bg-gray-100 dark:hover:bg-white/5',
          isActive(module)
            ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-semibold'
            : 'text-gray-600 dark:text-gray-400',
          shouldShowExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5'
        ]"
        :title="!shouldShowExpanded ? module.label : ''"
      >
        <!-- Icon container with fixed width to prevent shifting -->
        <div :class="['flex items-center justify-center flex-shrink-0', shouldShowExpanded ? 'w-6' : 'w-full']">
          <component 
            v-if="module.iconComponent" 
            :is="module.iconComponent" 
            class="w-6 h-6"
          />
          <span v-else-if="module.icon" class="text-lg">{{ module.icon }}</span>
          <DefaultIcon v-else class="w-6 h-6" />
        </div>
        
        <!-- Label with smooth transition -->
        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-w-0"
          enter-to-class="opacity-100 max-w-xs"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="opacity-100 max-w-xs"
          leave-to-class="opacity-0 max-w-0"
        >
          <span 
            v-if="shouldShowExpanded" 
            class="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            {{ module.label }}
          </span>
        </transition>
      </a>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppShellStore } from '@/stores/appShell';
import { useTabs } from '@/composables/useTabs';
import { 
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  CalendarIcon,
  CubeIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  shouldShowExpanded: {
    type: Boolean,
    default: true
  }
});

const route = useRoute();
const router = useRouter();
const appShellStore = useAppShellStore();
const { openTab } = useTabs();

// Icon mapping for known modules
const iconMap = {
  dashboard: HomeIcon,
  people: UsersIcon,
  contacts: UsersIcon,
  organizations: BuildingOfficeIcon,
  deals: BriefcaseIcon,
  tasks: CheckCircleIcon,
  events: CalendarIcon,
  items: CubeIcon,
  forms: ClipboardDocumentIcon,
  imports: ArrowDownTrayIcon
};

// Default icon component
const DefaultIcon = HomeIcon;

/**
 * ============================================================================
 * PLATFORM UI SHELL: Sidebar Renderer Component (Phase 1A)
 * ============================================================================
 * 
 * Renders sidebar using /api/ui/sidebar metadata.
 * 
 * Rules:
 * - Groups modules per active app
 * - Respects ordering, icons, labels from metadata
 * - No hardcoded modules
 * - No permission checks (handled by backend)
 * 
 * ============================================================================
 */

// Get visible modules from app shell store
const visibleModules = computed(() => {
  const modules = appShellStore.sidebarModules || [];
  
  // Map modules to include icon components and ensure proper ordering
  const mapped = modules.map(module => ({
    ...module,
    iconComponent: iconMap[module.moduleKey] || null
  }));
  
  // Sort by sidebarOrder from metadata (already sorted by backend, but ensure here too)
  return mapped.sort((a, b) => {
    const orderA = a.sidebarOrder ?? 0;
    const orderB = b.sidebarOrder ?? 0;
    return orderA - orderB;
  });
});

// Check if a module is currently active
const isActive = (module) => {
  return route.path.startsWith(module.routeBase);
};

// Handle module click - open in tab
const handleModuleClick = (module, event) => {
  // Check if user wants to open in background
  const openInBackground = event && (
    event.button === 1 || // Middle mouse button
    event.metaKey ||      // Cmd on Mac
    event.ctrlKey         // Ctrl on Windows/Linux
  );
  
  openTab(module.routeBase, {
    title: module.label,
    background: openInBackground
  });
};
</script>

<style scoped>
/* Component-specific styles if needed */
</style>

