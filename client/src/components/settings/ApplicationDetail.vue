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
        <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ application?.name || 'Application Detail' }}</h2>
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
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
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
      <!-- Description -->
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ application.description }}
        </p>
      </div>

      <!-- Dependencies Section -->
      <div class="space-y-6">
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
              class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-brand-500 dark:hover:border-brand-400 transition-all cursor-pointer group"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
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
                  <p class="text-xs text-brand-600 dark:text-brand-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view module details →
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
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-brand-500 dark:hover:border-brand-400 transition-all cursor-pointer group"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
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
                  <p class="text-xs text-brand-600 dark:text-brand-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view module details →
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

      <!-- App-Specific Settings Link -->
      <div v-if="application.status === 'ENABLED' || application.status === 'TRIAL'" class="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div class="flex-1">
            <h3 class="text-base font-semibold text-brand-800 dark:text-brand-300">App-Specific Settings</h3>
            <p class="mt-1 text-sm text-brand-700 dark:text-brand-400">
              Configure {{ application.name }}-specific settings, modules, and preferences.
            </p>
            <button
              @click="goToAppSettings"
              class="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 bg-white dark:bg-gray-800 border border-brand-300 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <span>Open {{ application.name }} Settings</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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

const goToAppSettings = () => {
  // Navigate to app-specific settings (AppsSettings with the app selected)
  // Map appKey to the app name used in AppsSettings
  const appMap = {
    'SALES': 'sales',
    'HELPDESK': 'helpdesk',
    'PROJECTS': 'projects',
    'PORTAL': 'portal',
    'AUDIT': 'audit',
    'LMS': 'lms'
  };
  const appName = appMap[appKey.value] || appKey.value.toLowerCase();
  // Navigate to AppsSettings with the app parameter
  router.push({ 
    path: '/settings', 
    query: { 
      tab: 'applications', 
      app: appName 
    } 
  });
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

