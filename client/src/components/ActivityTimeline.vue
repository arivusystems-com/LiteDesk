<template>
  <div class="activity-timeline">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-400"></div>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading activities...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
            Error Loading Activities
          </h3>
          <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Blocked State (Ambiguous App Context) -->
    <div v-else-if="blocked" class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            Cannot Load Activities
          </h3>
          <p class="text-sm text-yellow-700 dark:text-yellow-300">
            {{ blockedReason || 'App context is ambiguous. Cannot determine which activities to show.' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Activities List -->
    <div v-else-if="activities && activities.length > 0" class="space-y-4">
      <div
        v-for="(activity, index) in activities"
        :key="activity.id || index"
        class="flex items-start gap-3"
      >
        <!-- Timeline Line -->
        <div class="flex-shrink-0 flex flex-col items-center">
          <div class="w-2 h-2 rounded-full bg-brand-500 mt-1.5"></div>
          <div v-if="index < activities.length - 1" class="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1 min-h-[3rem]"></div>
        </div>

        <!-- Activity Content -->
        <div class="flex-1 min-w-0 pb-4">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 dark:text-white">
                <span class="font-medium">{{ activity.actor || 'System' }}</span>
                <span class="text-gray-600 dark:text-gray-400"> {{ formatAction(activity) }}</span>
              </p>
              <div class="mt-1 flex items-center gap-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(activity.createdAt) }}
                </p>
                <!-- App Context Badge -->
                <span 
                  v-if="getAppContext(activity)" 
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                >
                  {{ formatAppName(getAppContext(activity)) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && !error && !blocked" class="text-center py-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 italic">
        No activities found for this {{ entityType }}.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '@/utils/apiClient';
import { getHistoryDisplayText, getHistoryAppContext } from './people/historyEventMapping';

const props = defineProps({
  entityType: {
    type: String,
    required: true,
    default: 'Person'
  },
  entityId: {
    type: String,
    required: true
  },
  appKey: {
    type: String,
    default: null
  }
});

const route = useRoute();

// State
const loading = ref(true);
const error = ref(null);
const activities = ref([]);
const blocked = ref(false);
const blockedReason = ref(null);
const appContext = ref(null);

// Methods
const loadActivities = async () => {
  try {
    loading.value = true;
    error.value = null;
    blocked.value = false;
    blockedReason.value = null;

    if (!props.entityId) {
      throw new Error('Entity ID is required');
    }

    // Build route info for app context resolution
    const routeInfo = {
      path: route.path,
      name: route.name,
      params: route.params,
      query: route.query,
      meta: route.meta
    };

    // Load activities from API
    const response = await apiClient.get(`/activity/${props.entityType}/${props.entityId}`, {
      params: {
        routePath: route.path,
        routeName: route.name,
        appKey: props.appKey || route.query.appKey || null
      }
    });

    if (response.success && response.data) {
      activities.value = response.data.activities || [];
      appContext.value = response.data.appContext;
      
      // Check if activities were blocked
      if (response.data.blocked) {
        blocked.value = true;
        blockedReason.value = response.data.reason || 'App context is ambiguous. Cannot determine which activities to show.';
      }
    } else {
      throw new Error('Failed to load activities');
    }
  } catch (err) {
    console.error('Error loading activities:', err);
    error.value = err.message || 'Failed to load activities';
  } finally {
    loading.value = false;
  }
};

const formatAction = (activity) => {
  if (!activity) return 'performed an action';
  
  const action = activity.action || '';
  const metadata = activity.metadata || {};
  const appContext = activity.appContext;
  
  // Use canonical event mapping
  return getHistoryDisplayText(action, metadata, appContext);
};

// Get app context for activity
const getAppContext = (activity) => {
  return getHistoryAppContext(activity?.action, activity?.appContext);
};

// Format app name for display
const formatAppName = (appKey) => {
  if (!appKey) return '';
  
  const appNames = {
    'SALES': 'Sales',
    'MARKETING': 'Marketing',
    'HELPDESK': 'Helpdesk',
    'AUDIT': 'Audit',
    'PORTAL': 'Portal',
    'PROJECTS': 'Projects',
    'LMS': 'LMS',
    'Core': 'Core'
  };
  
  return appNames[appKey.toUpperCase()] || appKey;
};

const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  try {
    const date = new Date(dateValue);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (e) {
    return String(dateValue);
  }
};

// Watch for prop changes
watch(() => props.entityId, () => {
  if (props.entityId) {
    loadActivities();
  }
});

watch(() => props.appKey, () => {
  if (props.entityId) {
    loadActivities();
  }
});

// Lifecycle
onMounted(() => {
  if (props.entityId) {
    loadActivities();
  }
});
</script>

<style scoped>
.activity-timeline {
  /* Component-specific styles if needed */
}
</style>

