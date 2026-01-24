<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Core Modules</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Shared platform capabilities used across all applications
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-800 dark:text-red-300">
          {{ error.message || 'Failed to load core modules' }}
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && !error && modules.length === 0" class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
      <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Core Modules</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">No core modules found in the registry.</p>
    </div>

    <!-- Modules List -->
    <div v-else class="space-y-4">
      <div
        v-for="module in modules"
        :key="module.moduleKey"
        @click="viewModuleDetail(module.moduleKey)"
        class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-brand-500 dark:hover:border-brand-400 transition-all cursor-pointer"
      >
        <!-- Module Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <!-- Module Icon -->
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>

            <!-- Module Name -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ module.name }}
              </h3>
              <p v-if="module.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ module.description }}
              </p>
            </div>
          </div>

          <!-- Badges -->
          <div class="flex items-center gap-2">
            <!-- Ownership Badge -->
            <span
              v-if="module.platformOwned"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Core
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
            >
              App
            </span>

            <!-- Shared Badge -->
            <span
              v-if="module.applications && module.applications.length > 1"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Shared
            </span>

            <!-- Locked Indicator -->
            <span
              v-if="module.applications && module.applications.some(app => app.required && !app.canToggle)"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
              title="Some applications require this module and cannot be disabled"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Locked
            </span>
          </div>
        </div>

        <!-- Consuming Applications -->
        <div v-if="module.applications && module.applications.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Used by {{ module.applications.length }} {{ module.applications.length === 1 ? 'application' : 'applications' }}
          </h4>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="app in module.applications"
              :key="app.appKey"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
            >
              <!-- App Name -->
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ app.appName }}
              </span>

              <!-- Required Indicator -->
              <span
                v-if="app.required"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                title="This application requires this module"
              >
                Required
              </span>

              <!-- Enabled/Disabled Indicator -->
              <span
                v-if="app.enabled !== undefined"
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                  app.enabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                ]"
              >
                {{ app.enabled ? 'Enabled' : 'Disabled' }}
              </span>

              <!-- Lock Icon for Required Apps -->
              <svg
                v-if="app.required && !app.canToggle"
                class="w-4 h-4 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                title="This application cannot be disabled"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <!-- Usage Descriptions -->
          <div v-if="module.applications.some(app => app.usage)" class="mt-3 space-y-2">
            <div
              v-for="app in module.applications.filter(app => app.usage)"
              :key="`usage-${app.appKey}`"
              class="text-sm text-gray-600 dark:text-gray-400"
            >
              <span class="font-medium text-gray-900 dark:text-white">{{ app.appName }}:</span>
              {{ app.usage }}
            </div>
          </div>
        </div>

        <!-- No Applications Message -->
        <div v-else class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400 italic">
            Not currently used by any applications
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';

const router = useRouter();

const modules = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchCoreModules = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await apiClient('/settings/core-modules', {
      method: 'GET'
    });

    if (data && data.modules) {
      // Sort modules by order property (modules without order go to the end)
      modules.value = data.modules.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
      });
    } else {
      modules.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch core modules:', err);
    error.value = err;
    modules.value = [];
  } finally {
    loading.value = false;
  }
};

const viewModuleDetail = (moduleKey) => {
  router.push(`/settings?tab=core-modules&moduleKey=${moduleKey}`);
};

onMounted(() => {
  fetchCoreModules();
});
</script>

