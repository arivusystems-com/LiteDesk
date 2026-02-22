<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button @click="goBack" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
    <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ appDisplayName }} Settings</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure {{ appDisplayName }} app-specific settings and options</p>
        </div>
      </div>
    </div>

    <!-- Sales App Section (only if Sales is installed and selected) -->
    <div v-if="hasSalesAccess && isSalesApp" class="space-y-4">
      <!-- Settings Options Grid -->
      <div v-if="!activeSalesTab || activeSalesTab === 'options'" class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configuration Options</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose a category to configure</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="option in salesOptions"
            :key="option.id"
            @click="navigateToOption(option.id)"
            class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer group"
          >
            <div class="flex items-start gap-4">
              <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors flex-shrink-0">
                <component :is="option.icon" class="w-6 h-6" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
                  {{ option.name }}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {{ option.description }}
                </p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Configure</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Sales Sub-tabs (when an option is selected) -->
      <div v-else class="space-y-4">
        <div class="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ getOptionName(activeSalesTab) }}</h3>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ getOptionDescription(activeSalesTab) }}</p>
        </div>

      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8">
          <button
              @click="activeSalesTab = 'options'"
              :class="[
                activeSalesTab === 'options'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
              ]"
            >
              ← Back to Options
            </button>
            <button
              v-for="tab in getTabsForOption(activeSalesTab)"
            :key="tab.id"
            @click="activeSalesTab = tab.id"
            :class="[
              activeSalesTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- Sales Tab Content -->
      <div>
        <component :is="currentSalesTabComponent" />
        </div>
      </div>
    </div>

    <!-- Other Apps Options (when app is selected but not Sales) -->
    <div v-else-if="selectedApp && !isSalesApp" class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configuration Options</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Available settings for {{ appDisplayName }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="option in getAppOptions(selectedApp)"
          :key="option.id"
          class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer group"
          :class="{ 'opacity-50 cursor-not-allowed': !option.available }"
        >
          <div class="flex items-start gap-4">
            <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors flex-shrink-0">
              <component :is="option.icon" class="w-6 h-6" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
                {{ option.name }}
                <span v-if="!option.available" class="ml-2 text-xs text-gray-500 dark:text-gray-400">(Coming Soon)</span>
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ option.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State (app not found or not supported) -->
    <div v-else class="text-center py-12">
      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {{ selectedApp ? `${capitalizeFirst(selectedApp)} Settings` : 'App Settings' }}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        <span v-if="selectedApp && !hasSalesAccess">
          {{ capitalizeFirst(selectedApp) }} app is not enabled or you don't have access to configure it.
        </span>
        <span v-else>
          No app selected or app settings are not available.
        </span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import SalesSchema from './SalesSchema.vue';
import SalesPipelines from './SalesPipelines.vue';
import SalesPlaybooks from './SalesPlaybooks.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const activeSalesTab = ref('options'); // Start with options view

// Icon components
const SchemaIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
]);


const PipelineIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
]);

const PlaybookIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
]);

const SettingsIcon = () => h('svg', { class: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
]);

// Get app from query parameter
const selectedApp = computed(() => {
  return route.query.app || 'sales';
});

const hasSalesAccess = computed(() => {
  return authStore.hasAppAccess('SALES');
});

// Check if the selected app matches the current app
const isSalesApp = computed(() => {
  return selectedApp.value.toLowerCase() === 'sales';
});

const appDisplayName = computed(() => {
  const appNames = {
    'sales': 'Sales',
    'helpdesk': 'Helpdesk',
    'projects': 'Projects',
    'portal': 'Portal',
    'audit': 'Audit',
    'lms': 'LMS'
  };
  return appNames[selectedApp.value.toLowerCase()] || capitalizeFirst(selectedApp.value);
});

// Sales app options (Sales-owned configuration only)
const salesOptions = [
  {
    id: 'pipelines',
    name: 'Pipelines & Stages',
    description: 'Configure sales pipelines, deal stages, and workflow automation',
    icon: PipelineIcon,
    available: true
  },
  {
    id: 'schema',
    name: 'Deal Schema',
    description: 'Configure custom fields and data structure for Deals',
    icon: SchemaIcon,
    available: true
  },
  {
    id: 'playbooks',
    name: 'Playbooks',
    description: 'Set up sales playbooks, templates, and process automation',
    icon: PlaybookIcon,
    available: true
  }
];

const salesTabs = [
  { id: 'pipelines', name: 'Pipelines & Stages', component: SalesPipelines },
  { id: 'schema', name: 'Deal Schema', component: SalesSchema },
  { id: 'playbooks', name: 'Playbooks', component: SalesPlaybooks }
];

const currentSalesTabComponent = computed(() => {
  if (activeSalesTab.value === 'options') return null;
  const tab = salesTabs.find(t => t.id === activeSalesTab.value);
  return tab?.component || null;
});

const navigateToOption = (optionId) => {
  activeSalesTab.value = optionId;
};

const getOptionName = (optionId) => {
  const option = salesOptions.find(o => o.id === optionId);
  return option?.name || 'Settings';
};

const getOptionDescription = (optionId) => {
  const option = salesOptions.find(o => o.id === optionId);
  return option?.description || '';
};

const getTabsForOption = (optionId) => {
  // For now, each option maps to a single tab
  // In the future, options could have multiple sub-tabs
  return salesTabs.filter(tab => tab.id === optionId);
};

// Get options for other apps
const getAppOptions = (app) => {
  const appLower = app.toLowerCase();
  
  const commonOptions = [
    {
      id: 'schema',
      name: 'Schema',
      description: 'Configure custom fields, modules, and data structure',
      icon: SchemaIcon,
      available: false
    },
    {
      id: 'settings',
      name: 'General Settings',
      description: 'Configure general app settings and preferences',
      icon: SettingsIcon,
      available: false
    }
  ];

  // App-specific options
  const appSpecificOptions = {
    'helpdesk': [
      {
        id: 'tickets',
        name: 'Ticket Settings',
        description: 'Configure ticket types, priorities, and SLA rules',
        icon: SettingsIcon,
        available: false
      },
      {
        id: 'automation',
        name: 'Automation Rules',
        description: 'Set up automated ticket routing and responses',
        icon: SettingsIcon,
        available: false
      }
    ],
    'projects': [
      {
        id: 'templates',
        name: 'Project Templates',
        description: 'Create and manage project templates',
        icon: SettingsIcon,
        available: false
      },
      {
        id: 'workflows',
        name: 'Workflows',
        description: 'Configure project workflows and approval processes',
        icon: SettingsIcon,
        available: false
      }
    ],
    'portal': [
      {
        id: 'branding',
        name: 'Branding',
        description: 'Customize portal appearance and branding',
        icon: SettingsIcon,
        available: false
      },
      {
        id: 'access',
        name: 'Access Control',
        description: 'Manage portal access and permissions',
        icon: SettingsIcon,
        available: false
      }
    ],
    'audit': [
      {
        id: 'checklists',
        name: 'Audit Checklists',
        description: 'Configure audit checklists and templates',
        icon: SettingsIcon,
        available: false
      },
      {
        id: 'compliance',
        name: 'Compliance Rules',
        description: 'Set up compliance rules and requirements',
        icon: SettingsIcon,
        available: false
      }
    ],
    'lms': [
      {
        id: 'courses',
        name: 'Course Settings',
        description: 'Configure course structure and settings',
        icon: SettingsIcon,
        available: false
      },
      {
        id: 'certifications',
        name: 'Certifications',
        description: 'Manage certification programs and requirements',
        icon: SettingsIcon,
        available: false
      }
    ]
  };

  return [...commonOptions, ...(appSpecificOptions[appLower] || [])];
};

const goBack = () => {
  // Go back to application detail
  const appKey = selectedApp.value.toUpperCase();
  router.push({ path: '/settings', query: { tab: 'applications', appKey: appKey } });
};

// Helper function to capitalize first letter
const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Watch for app changes in query
watch(() => route.query.app, (newApp) => {
  if (newApp) {
    // Reset to options view when switching apps
    activeSalesTab.value = 'options';
  }
});

// Watch for config query parameter to navigate directly to a config option
watch(() => route.query.config, (configId) => {
  if (configId && isSalesApp.value && activeSalesTab.value === 'options') {
    // Check if the config ID exists in salesOptions
    const configExists = salesOptions.some(opt => opt.id === configId);
    if (configExists) {
      activeSalesTab.value = configId;
    }
  }
}, { immediate: true });
</script>
