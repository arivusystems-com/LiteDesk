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
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">App Management</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Enable or disable apps for your organization. Manage seat usage and app access.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-sm text-red-800 dark:text-red-300">{{ error }}</p>
    </div>

    <!-- App List -->
    <div v-else class="space-y-4">
      <div
        v-for="app in allApps"
        :key="app.appKey"
        class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800"
      >
        <div class="flex items-start justify-between">
          <!-- App Info -->
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ getAppDisplayName(app.appKey) }}
              </h3>
              <!-- Status Badge -->
              <span
                :class="[
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStatusBadgeClass(app.status)
                ]"
              >
                {{ getStatusDisplay(app.status) }}
              </span>
            </div>

            <!-- App Description -->
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {{ getAppDescription(app.appKey) }}
            </p>

            <!-- Seat Usage Info (for PER_USER apps) -->
            <div v-if="app.seatInfo && app.seatInfo.limit !== null" class="mb-4">
              <div class="flex items-center gap-2 text-sm">
                <span class="text-gray-600 dark:text-gray-400">Seat Usage:</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ app.seatInfo.used }}/{{ app.seatInfo.limit }}
                </span>
                <span
                  :class="[
                    'text-xs px-2 py-0.5 rounded',
                    app.seatInfo.available === 0
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  ]"
                >
                  {{ app.seatInfo.available === null ? 'Unlimited' : `${app.seatInfo.available} available` }}
                </span>
              </div>
            </div>

            <!-- Billing Warning for SUSPENDED apps -->
            <div
              v-if="app.status === 'SUSPENDED'"
              class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
            >
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    App Suspended
                  </p>
                  <p class="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    This app has been suspended. Users will not be able to access it. Contact support to reactivate.
                  </p>
                </div>
              </div>
            </div>

            <!-- Cannot Enable Reason -->
            <div
              v-if="app.status === 'DISABLED' && app.seatInfo && !app.seatInfo.canAdd && app.seatInfo.reason"
              class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p class="text-sm text-red-800 dark:text-red-300">
                <strong>Cannot enable:</strong> {{ app.seatInfo.reason }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 ml-4">
            <!-- Enable Button -->
            <button
              v-if="app.status === 'DISABLED' || app.status === 'SUSPENDED'"
              @click="handleEnable(app)"
              :disabled="processing === app.appKey || (app.seatInfo && !app.seatInfo.canAdd)"
              class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span v-if="processing === app.appKey">Enabling...</span>
              <span v-else>Enable</span>
            </button>

            <!-- Disable Button (hidden for Sales) -->
            <button
              v-if="app.status === 'ACTIVE' && app.appKey !== 'SALES'"
              @click="handleDisable(app)"
              :disabled="processing === app.appKey"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span v-if="processing === app.appKey">Disabling...</span>
              <span v-else>Disable</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="allApps.length === 0" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400">No apps available</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';

const router = useRouter();

const loading = ref(true);
const error = ref('');
const organization = ref(null);
const capabilities = ref([]);
const processing = ref(null);

// App display names
const appDisplayNames = {
  SALES: 'SALES',
  AUDIT: 'Audit',
  PORTAL: 'Portal'
};

// App descriptions
const appDescriptions = {
  SALES: 'Sales - Manage contacts, pipeline entities, and customer interactions.',
  AUDIT: 'Audit & Compliance - Conduct audits, track findings, and manage corrective actions.',
  PORTAL: 'Customer Portal - Provide external users access to their information and services.'
};

// All apps from registry (hardcoded to match appRegistry)
const allAppKeys = ['SALES', 'AUDIT', 'PORTAL'];

// Computed: All apps with status and seat info
const allApps = computed(() => {
  const apps = [];
  const enabledAppsMap = {};
  const capabilitiesMap = {};

  // Build map of enabled apps from organization
  if (organization.value?.enabledApps) {
    for (const enabledApp of organization.value.enabledApps) {
      const appKey = typeof enabledApp === 'object' ? enabledApp.appKey : enabledApp;
      const status = typeof enabledApp === 'object' ? enabledApp.status : 'ACTIVE';
      enabledAppsMap[appKey] = status;
    }
  }

  // Build map of capabilities (seat info)
  for (const cap of capabilities.value) {
    capabilitiesMap[cap.appKey] = cap;
  }

  // Create app entries for all apps in registry
  for (const appKey of allAppKeys) {
    const status = enabledAppsMap[appKey] || 'DISABLED';
    const cap = capabilitiesMap[appKey];
    
    apps.push({
      appKey: appKey,
      status: status,
      roles: cap?.roles || [],
      userTypesAllowed: cap?.userTypesAllowed || [],
      seatInfo: cap?.seatInfo || null
    });
  }

  return apps;
});

onMounted(async () => {
  await Promise.all([fetchOrganization(), fetchCapabilities()]);
});

const fetchOrganization = async () => {
  try {
    const response = await apiClient.get('/organization');
    if (response.success) {
      organization.value = response.data;
    }
  } catch (err) {
    console.error('Error fetching organization:', err);
    error.value = 'Failed to load organization data';
  }
};

const fetchCapabilities = async () => {
  try {
    const response = await apiClient.get('/users/add-capabilities');
    if (response.success) {
      capabilities.value = response.data.apps || [];
    }
  } catch (err) {
    console.error('Error fetching capabilities:', err);
    // Don't set error here, just log it
  } finally {
    loading.value = false;
  }
};

const getAppDisplayName = (appKey) => {
  return appDisplayNames[appKey] || appKey;
};

const getAppDescription = (appKey) => {
  return appDescriptions[appKey] || 'No description available.';
};

const getStatusDisplay = (status) => {
  const statusMap = {
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    DISABLED: 'Disabled'
  };
  return statusMap[status] || status;
};

const getStatusBadgeClass = (status) => {
  const classMap = {
    ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    SUSPENDED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    DISABLED: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
  };
  return classMap[status] || classMap.DISABLED;
};

const handleEnable = async (app) => {
  if (!confirm(`Enable ${getAppDisplayName(app.appKey)}? Users will be able to access this app.`)) {
    return;
  }

  processing.value = app.appKey;
  error.value = '';

  try {
    const response = await apiClient.post('/organization/apps/enable', {
      appKey: app.appKey
    });

    if (response.success) {
      // Refresh organization data
      await fetchOrganization();
      // Refresh capabilities to get updated seat info
      await fetchCapabilities();
    } else {
      error.value = response.message || 'Failed to enable app';
    }
  } catch (err) {
    console.error('Error enabling app:', err);
    error.value = err.message || 'Failed to enable app';
    if (err.response?.data?.message) {
      error.value = err.response.data.message;
    }
  } finally {
    processing.value = null;
  }
};

const handleDisable = async (app) => {
  if (!confirm(`Disable ${getAppDisplayName(app.appKey)}? Users will lose access to this app. This action can be reversed by enabling the app again.`)) {
    return;
  }

  processing.value = app.appKey;
  error.value = '';

  try {
    const response = await apiClient.post('/organization/apps/disable', {
      appKey: app.appKey
    });

    if (response.success) {
      // Refresh organization data
      await fetchOrganization();
      // Refresh capabilities to get updated seat info
      await fetchCapabilities();
    } else {
      error.value = response.message || 'Failed to disable app';
    }
  } catch (err) {
    console.error('Error disabling app:', err);
    error.value = err.message || 'Failed to disable app';
    if (err.response?.data?.message) {
      error.value = err.response.data.message;
    }
  } finally {
    processing.value = null;
  }
};

const goBack = () => {
  router.push({ path: '/settings', query: { tab: 'applications' } });
};
</script>

