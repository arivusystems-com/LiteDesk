<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Applications</h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage the business applications available to your organization
        </p>
      </div>
      <button
        @click="viewAppManagement"
        class="px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors border border-brand-200 dark:border-brand-800"
      >
        Enable/Disable Apps
      </button>
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
          {{ error.message || 'Failed to load applications' }}
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && !error && applications.length === 0" class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
      <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Applications</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">No applications found.</p>
    </div>

    <!-- Applications List -->
    <div v-else class="space-y-4">
      <div
        v-for="app in applications"
        :key="app.appKey"
        @click="viewApplicationDetail(app.appKey)"
        class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-brand-500 dark:hover:border-brand-400 transition-all cursor-pointer group"
      >
        <!-- Application Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <!-- Application Icon -->
            <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>

            <!-- Application Name and Description -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ app.name }}
              </h3>
              <p v-if="app.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ app.description }}
              </p>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                getStatusBadgeClass(app.status)
              ]"
            >
              <svg
                v-if="app.status === 'ENABLED'"
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg
                v-else-if="app.status === 'TRIAL'"
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else-if="app.status === 'DISABLED'"
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {{ getStatusLabel(app.status) }}
            </span>
          </div>
        </div>

        <!-- Dependencies -->
        <div v-if="app.dependencies && app.dependencies.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Core Dependencies
          </h4>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="dep in app.dependencies"
              :key="dep.moduleKey"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {{ dep.moduleName }}
            </div>
          </div>
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
const applications = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchApplications = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await apiClient('/settings/applications', {
      method: 'GET'
    });

    if (data && data.applications) {
      applications.value = data.applications;
    } else {
      applications.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch applications:', err);
    error.value = err;
    applications.value = [];
  } finally {
    loading.value = false;
  }
};

const viewApplicationDetail = (appKey) => {
  router.push({ path: '/settings', query: { tab: 'applications', appKey: appKey } });
};

const viewAppManagement = () => {
  router.push({ path: '/settings', query: { tab: 'applications', view: 'management' } });
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
  fetchApplications();
});
</script>

