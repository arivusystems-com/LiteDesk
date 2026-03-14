<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <button
      @click="goBack"
      class="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-4"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>Back to Applications</span>
    </button>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Application Icon -->
        <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ application?.name || 'Application Detail' }}</h2>
          <p v-if="application?.description" class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ application.description }}</p>
        </div>
      </div>
      <!-- Status Badge -->
      <div v-if="application" class="flex items-center gap-2">
        <span
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
            getStatusBadgeClass(application.status)
          ]"
        >
          <svg
            v-if="application.status === 'ENABLED'"
            class="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else-if="application.status === 'TRIAL'"
            class="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ getStatusLabel(application.status) }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-800 dark:text-red-300">
          {{ error.message || 'Failed to load application details' }}
        </p>
      </div>
    </div>

    <!-- Application Details -->
    <div v-else-if="application" class="space-y-6">
      <!-- SECTION B: Configure Sales (Primary Actions) -->
      <div v-if="(application.status === 'ENABLED' || application.status === 'TRIAL') && isSalesApp" class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Configure Sales</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage Sales-owned configuration and settings
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            v-for="config in salesConfigOptions"
            :key="config.id"
            @click="navigateToSalesConfig(config.id)"
            class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer group text-left"
          >
            <div class="flex items-start gap-4">
              <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors flex-shrink-0">
                <component :is="config.icon" class="w-6 h-6" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
                  {{ config.name }}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {{ config.description }}
                </p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Configure</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- SECTION A: Dependencies (Informational - Read-Only) -->
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Dependencies</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Core modules that {{ application.name }} uses. These are configured in Core Modules settings.
          </p>
        </div>

        <!-- Required Dependencies -->
        <div v-if="application.dependencies?.required && application.dependencies.required.length > 0">
          <div class="flex items-center gap-2 mb-3">
            <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Required Dependencies
            </h4>
            <span class="text-xs text-gray-500 dark:text-gray-500">
              ({{ application.dependencies.required.length }} {{ application.dependencies.required.length === 1 ? 'module' : 'modules' }})
            </span>
          </div>
          <div class="space-y-3">
            <div
              v-for="dep in application.dependencies.required"
              :key="dep.moduleKey"
              @click="viewModuleDetail(dep.moduleKey)"
              class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer group"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {{ dep.moduleName }}
                    </h4>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Required
                    </span>
                  </div>
                  <p v-if="dep.description" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ dep.description }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Read-only • View details →
                  </p>
                </div>
                <!-- Locked Status -->
                <span
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  title="This dependency is required and cannot be disabled"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Optional Dependencies -->
        <div v-if="application.dependencies?.optional && application.dependencies.optional.length > 0">
          <div class="flex items-center gap-2 mb-3">
            <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Optional Dependencies
            </h4>
            <span class="text-xs text-gray-500 dark:text-gray-500">
              ({{ application.dependencies.optional.length }} {{ application.dependencies.optional.length === 1 ? 'module' : 'modules' }})
            </span>
          </div>
          <div class="space-y-3">
            <div
              v-for="dep in application.dependencies.optional"
              :key="dep.moduleKey"
              @click="viewModuleDetail(dep.moduleKey)"
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer group"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {{ dep.moduleName }}
                    </h4>
                    <span
                      v-if="dep.enabled"
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Enabled
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    >
                      Disabled
                    </span>
                  </div>
                  <p v-if="dep.description" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ dep.description }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Read-only • View details →
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Dependencies Message -->
        <div v-if="(!application.dependencies?.required || application.dependencies.required.length === 0) && (!application.dependencies?.optional || application.dependencies.optional.length === 0)" class="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            This application has no dependencies on core modules.
          </p>
        </div>
      </div>

      <!-- SECTION C: Shared Platform Entities (Redirect Only) -->
      <div v-if="isSalesApp" class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Shared Platform Entities</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Core modules configured in Core Modules settings. These are shared across all applications.
          </p>
        </div>
        <div class="space-y-3">
          <div
            v-for="entity in sharedCoreEntities"
            :key="entity.moduleKey"
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                    {{ entity.name }}
                  </h4>
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    Core Module
                  </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {{ entity.description }}
                </p>
                <button
                  @click="viewModuleDetail(entity.moduleKey)"
                  class="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  <span>Open {{ entity.name }} Settings</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';

const route = useRoute();
const router = useRouter();

const application = ref(null);
const loading = ref(true);
const error = ref(null);

const appKey = computed(() => {
  return route.query.appKey || route.params.appKey;
});

const isSalesApp = computed(() => {
  return appKey.value === 'SALES';
});

// Icon components for Sales configuration options
const PipelineIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
]);

const SchemaIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
]);

const AutomationIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 10V3L4 14h7v7l9-11h-7z' })
]);

const PlaybookIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
]);

const PermissionsIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' })
]);

// Sales-owned configuration options – Sales Modules first
const salesConfigOptions = [
  {
    id: 'schema',
    name: 'Sales Modules',
    description: 'Configure Sales app modules, custom fields, and data structure',
    icon: SchemaIcon
  },
  {
    id: 'pipelines',
    name: 'Pipelines & Stages',
    description: 'Configure sales pipelines, deal stages, and workflow automation',
    icon: PipelineIcon
  },
  {
    id: 'automations',
    name: 'Automations',
    description: 'Set up automated workflows and triggers for Sales',
    icon: AutomationIcon
  },
  {
    id: 'playbooks',
    name: 'Playbooks',
    description: 'Create and manage sales playbooks and process templates',
    icon: PlaybookIcon
  },
  {
    id: 'permissions',
    name: 'Permissions',
    description: 'Manage Sales app permissions and access controls',
    icon: PermissionsIcon
  }
];

// Shared Core entities that Sales uses
const sharedCoreEntities = [
  {
    moduleKey: 'PEOPLE',
    name: 'People',
    description: 'Core module for managing people and contacts. Configure fields, layouts, relationships, and quick create settings.'
  },
  {
    moduleKey: 'ORGANIZATIONS',
    name: 'Organizations',
    description: 'Core module for managing organizations and companies. Configure fields, layouts, and relationships.'
  }
];

const navigateToSalesConfig = (configId) => {
  // Navigate to Sales settings with the specific config tab
  router.push({ 
    path: '/settings', 
    query: { 
      tab: 'applications', 
      app: 'sales',
      config: configId
    } 
  });
};

const fetchApplication = async () => {
  if (!appKey.value) {
    error.value = new Error('Application key is required');
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const data = await apiClient(`/settings/applications/${appKey.value}`, {
      method: 'GET'
    });

    if (data && data.success && data.appKey) {
      application.value = data;
    } else {
      error.value = new Error('Invalid response from server');
      application.value = null;
    }
  } catch (err) {
    console.error('Failed to fetch application:', err);
    error.value = err;
    application.value = null;
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/settings?tab=applications');
};


const viewModuleDetail = (moduleKey) => {
  // Navigate to Core Module detail page
  router.push({ 
    path: '/settings', 
    query: { 
      tab: 'core-modules', 
      moduleKey: moduleKey 
    } 
  });
};

const getStatusLabel = (status) => {
  const labels = {
    'ENABLED': 'Enabled',
    'DISABLED': 'Disabled',
    'TRIAL': 'Trial',
    'SUSPENDED': 'Suspended',
    'INCLUDED': 'Included'
  };
  return labels[status] || status;
};

const getStatusBadgeClass = (status) => {
  const classes = {
    'ENABLED': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'DISABLED': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    'TRIAL': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    'SUSPENDED': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    'INCLUDED': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
  };
  return classes[status] || classes['DISABLED'];
};

onMounted(() => {
  fetchApplication();
});
</script>

