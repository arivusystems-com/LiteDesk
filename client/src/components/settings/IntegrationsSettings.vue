<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Connect external tools to enhance your workspace. All integrations are optional and can be turned off at any time.
      </p>
    </div>

    <!-- Info Banner -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-sm font-semibold text-blue-800 dark:text-blue-300">Optional, Safe Integrations</h3>
          <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
            Integrations are optional and do not change your core data. Disabling an integration stops new data from flowing but does not delete existing business records.
          </p>
        </div>
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
          {{ error.message || 'Failed to load integrations' }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Catalog / List -->
      <div class="lg:col-span-1 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Available Integrations</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ integrations.length }} integrations</span>
        </div>
        <div class="space-y-3">
          <button
            v-for="integration in integrations"
            :key="integration.key"
            @click="selectIntegration(integration)"
            :class="[
              'w-full text-left p-4 rounded-lg border transition-all flex items-start gap-3',
              selectedIntegration && selectedIntegration.key === integration.key
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-sm'
            ]"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ integration.name }}
                </h4>
                <span
                  v-if="integration.scope === 'platform'"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                >
                  Platform-wide
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  App-specific
                </span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ integration.description }}
              </p>
              <div class="mt-2 flex items-center gap-2">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                    integration.enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  ]"
                >
                  {{ integration.enabled ? 'Enabled' : 'Disabled' }}
                </span>
                <span
                  v-if="integration.recommended"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                >
                  Recommended
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Detail View -->
      <div class="lg:col-span-2">
        <div v-if="!selectedIntegration" class="h-full flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-800/40">
          <div class="text-center">
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">Select an integration to view details</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">You can safely explore integrations without enabling them.</p>
          </div>
        </div>
        <div v-else class="space-y-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ selectedIntegration.name }}</h3>
                <span
                  v-if="selectedIntegration.scope === 'platform'"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                >
                  Platform-wide
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  App-specific
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                {{ selectedIntegration.description }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                  selectedIntegration.enabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                ]"
              >
                {{ selectedIntegration.enabled ? 'Enabled' : 'Disabled' }}
              </span>
              <button
                v-if="selectedIntegration.enabled"
                type="button"
                @click="confirmDisable"
                :disabled="actionLoading"
                class="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable Integration
              </button>
              <button
                v-else
                type="button"
                @click="confirmEnable"
                :disabled="actionLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enable Integration
              </button>
            </div>
          </div>

          <!-- Scope & Apps -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Scope</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                <span v-if="selectedIntegration.scope === 'platform'">
                  This integration is platform-wide and can be used across all applications.
                </span>
                <span v-else>
                  This integration is app-specific and only affects the applications listed.
                </span>
              </p>
              <div v-if="selectedIntegration.apps && selectedIntegration.apps.length" class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="appKey in selectedIntegration.apps"
                  :key="appKey"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {{ appKey }}
                </span>
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Connection Status</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {{ selectedIntegration.enabled ? 'New activity will continue to flow through this integration.' : 'New activity will no longer flow through this integration.' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Existing records in your CRM, helpdesk, or other tools are not deleted when disabling this integration.
              </p>
            </div>
          </div>

          <!-- Data Sharing -->
          <div class="bg-white dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">What data is shared</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {{ selectedIntegration.dataSharedSummary }}
            </p>
            <p v-if="selectedIntegration.dataSharedDetails" class="text-xs text-gray-500 dark:text-gray-400">
              {{ selectedIntegration.dataSharedDetails }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '@/utils/apiClient';

const integrations = ref([]);
const selectedIntegration = ref(null);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(false);

const fetchIntegrations = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await apiClient('/settings/integrations', { method: 'GET' });
    if (data && data.success && data.integrations) {
      integrations.value = data.integrations;
      if (!selectedIntegration.value && integrations.value.length > 0) {
        selectedIntegration.value = integrations.value[0];
        await fetchIntegrationDetail(selectedIntegration.value.key);
      }
    } else {
      integrations.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch integrations:', err);
    error.value = err;
  } finally {
    loading.value = false;
  }
};

const fetchIntegrationDetail = async (key) => {
  try {
    const data = await apiClient(`/settings/integrations/${key}`, { method: 'GET' });
    if (data && data.success && data.integration) {
      selectedIntegration.value = data.integration;
      // Update list entry to keep states in sync
      const idx = integrations.value.findIndex((i) => i.key === key);
      if (idx !== -1) {
        integrations.value[idx] = {
          ...integrations.value[idx],
          enabled: data.integration.enabled,
          status: data.integration.status
        };
      }
    }
  } catch (err) {
    console.error('Failed to fetch integration detail:', err);
  }
};

const selectIntegration = async (integration) => {
  selectedIntegration.value = integration;
  await fetchIntegrationDetail(integration.key);
};

const confirmEnable = async () => {
  if (!selectedIntegration.value) return;
  const ok = confirm(
    'Enable this integration? This will start sending and receiving data as described. You can disable it at any time.'
  );
  if (!ok) return;
  await enableIntegration(selectedIntegration.value.key);
};

const confirmDisable = async () => {
  if (!selectedIntegration.value) return;
  const ok = confirm(
    'Disable this integration? New data will stop flowing, but existing records in your tools will not be deleted.'
  );
  if (!ok) return;
  await disableIntegration(selectedIntegration.value.key);
};

const enableIntegration = async (key) => {
  actionLoading.value = true;
  try {
    const data = await apiClient(`/settings/integrations/${key}/enable`, { method: 'POST' });
    if (data && data.success) {
      await fetchIntegrations();
      await fetchIntegrationDetail(key);
    } else {
      alert(data.message || 'Failed to enable integration');
    }
  } catch (err) {
    console.error('Failed to enable integration:', err);
    alert('Failed to enable integration');
  } finally {
    actionLoading.value = false;
  }
};

const disableIntegration = async (key) => {
  actionLoading.value = true;
  try {
    const data = await apiClient(`/settings/integrations/${key}/disable`, { method: 'POST' });
    if (data && data.success) {
      await fetchIntegrations();
      await fetchIntegrationDetail(key);
    } else {
      alert(data.message || 'Failed to disable integration');
    }
  } catch (err) {
    console.error('Failed to disable integration:', err);
    alert('Failed to disable integration');
  } finally {
    actionLoading.value = false;
  }
};

onMounted(() => {
  fetchIntegrations();
});
</script>
