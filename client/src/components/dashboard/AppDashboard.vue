<template>
  <div v-if="loading" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="text-gray-600 dark:text-gray-400 mt-4">Loading dashboard...</p>
    </div>
  </div>

  <div v-else-if="dashboardDefinition">
    <!-- Empty State (from definition) -->
    <div v-if="dashboardDefinition.emptyState" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center max-w-md">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ dashboardDefinition.emptyState.title }}
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ dashboardDefinition.emptyState.description }}
        </p>
        <button
          v-if="dashboardDefinition.emptyState.primaryAction"
          @click="handleAction(dashboardDefinition.emptyState.primaryAction.route)"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          {{ dashboardDefinition.emptyState.primaryAction.label }}
        </button>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ dashboardDefinition.title }}
          </h1>
          <p v-if="dashboardDefinition.description" class="text-lg text-gray-600 dark:text-gray-400 mt-2">
            {{ dashboardDefinition.description }}
          </p>
        </div>
        <div v-if="dashboardDefinition.actions.length > 0" class="flex gap-3 mt-4 sm:mt-0">
          <button
            v-for="action in dashboardDefinition.actions"
            :key="action.key"
            @click="handleAction(action.route)"
            :class="[
              'px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2',
              action.variant === 'primary'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : action.variant === 'secondary'
                ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600'
            ]"
          >
            <span v-if="action.icon">{{ action.icon }}</span>
            {{ action.label }}
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div v-if="dashboardDefinition.kpis.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="kpi in dashboardDefinition.kpis"
          :key="kpi.key"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ kpi.label }}</p>
            <span v-if="kpi.icon" class="text-2xl">{{ kpi.icon }}</span>
          </div>
          <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ formatKPIValue(kpi.value) }}</p>
          <div v-if="kpi.change" class="mt-2">
            <span
              :class="[
                'text-sm font-medium',
                kpi.change.type === 'increase'
                  ? 'text-green-600 dark:text-green-400'
                  : kpi.change.type === 'decrease'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              ]"
            >
              {{ kpi.change.type === 'increase' ? '↑' : kpi.change.type === 'decrease' ? '↓' : '→' }}
              {{ Math.abs(kpi.change.value) }}% {{ kpi.change.period }}
            </span>
          </div>
        </div>
      </div>

      <!-- Module Links -->
      <div v-if="dashboardDefinition.modules.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            v-for="module in dashboardDefinition.modules"
            :key="module.moduleKey"
            :href="module.route"
            @click.prevent="handleAction(module.route)"
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ module.label }}</h3>
              <span v-if="module.icon" class="text-2xl">{{ module.icon }}</span>
            </div>
            <p v-if="module.description" class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {{ module.description }}
            </p>
            <div v-if="module.count !== undefined" class="text-sm text-gray-500 dark:text-gray-400">
              {{ module.count }} items
            </div>
          </a>
        </div>
      </div>

      <!-- Widgets -->
      <div v-if="dashboardDefinition.widgets && dashboardDefinition.widgets.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div
          v-for="widget in dashboardDefinition.widgets"
          :key="widget.key"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">{{ widget.title }}</h3>
          <!-- Widget content would be rendered based on widget.type -->
          <div class="text-gray-600 dark:text-gray-400">
            Widget type: {{ widget.type }}
            <!-- TODO: Implement widget renderers based on type -->
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Error State -->
  <div v-else class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400">
        The dashboard for this app is not available.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import { buildDashboardFromRegistry } from '@/utils/buildDashboardFromRegistry';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';

const props = defineProps({
  appKey: {
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { openTab } = useTabs();

const loading = ref(true);
const dashboardDefinition = ref(null);
const kpiValues = ref({}); // Store actual KPI values fetched from API

// Build dashboard from registry
const buildDashboard = async () => {
  if (!authStore.user || !authStore.isAuthenticated) {
    dashboardDefinition.value = null;
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    // Fetch app registry
    const registry = await getAppRegistry();
    
    if (!authStore.user || !authStore.isAuthenticated) {
      return;
    }

    // Create permission snapshot
    const snapshot = createPermissionSnapshot(authStore.user);

    // Build dashboard definition
    const appKeyToUse = props.appKey || 'SALES';
    console.log('[AppDashboard] Building dashboard for app:', appKeyToUse);
    console.log('[AppDashboard] Registry:', registry);
    console.log('[AppDashboard] App in registry:', registry[appKeyToUse]);
    
    const definition = buildDashboardFromRegistry(
      appKeyToUse,
      registry,
      snapshot
    );
    
    console.log('[AppDashboard] Dashboard definition:', definition);
    console.log('[AppDashboard] Actions:', definition?.actions);
    console.log('[AppDashboard] KPIs:', definition?.kpis);
    console.log('[AppDashboard] Modules:', definition?.modules);
    console.log('[AppDashboard] Widgets:', definition?.widgets);
    console.log('[AppDashboard] Empty State:', definition?.emptyState);
    
    if (authStore.user && authStore.isAuthenticated) {
      dashboardDefinition.value = definition;
      
      // Fetch KPI values from API
      if (definition && definition.kpis.length > 0) {
        await fetchKPIValues(definition);
      }
    }
  } catch (error) {
    console.error('[AppDashboard] Error building dashboard:', error);
    if (authStore.isAuthenticated) {
      dashboardDefinition.value = null;
    }
  } finally {
    if (authStore.isAuthenticated) {
      loading.value = false;
    }
  }
};

// Fetch actual KPI values from API
const fetchKPIValues = async (definition) => {
  try {
    // TODO: Implement API endpoint to fetch KPI values
    // For now, use placeholder values
    const values = {};
    definition.kpis.forEach(kpi => {
      values[kpi.key] = 0; // Placeholder - should fetch from API
    });
    kpiValues.value = values;
    
    // Update dashboard definition with actual values
    if (dashboardDefinition.value) {
      dashboardDefinition.value.kpis = dashboardDefinition.value.kpis.map(kpi => ({
        ...kpi,
        value: kpiValues.value[kpi.key] ?? kpi.value
      }));
    }
  } catch (error) {
    console.error('[AppDashboard] Error fetching KPI values:', error);
  }
};

// Format KPI value for display
const formatKPIValue = (value) => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return value;
};

// Handle action clicks
const handleAction = (route) => {
  if (!route) return;
  
  // Open in tab
  openTab(route, {
    title: route.split('/').pop(),
    background: false
  });
};

// Watch for user changes
watch(() => authStore.user, () => {
  if (authStore.user && authStore.isAuthenticated) {
    buildDashboard();
  }
}, { immediate: true });

// Watch for appKey changes
watch(() => props.appKey, () => {
  if (authStore.user && authStore.isAuthenticated) {
    buildDashboard();
  }
});

// Build on mount
onMounted(() => {
  if (authStore.user && authStore.isAuthenticated) {
    buildDashboard();
  }
});
</script>

