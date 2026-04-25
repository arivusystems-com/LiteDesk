<template>
  <div class="w-full">
    <!-- Section Header -->
    <div class="flex items-center gap-2 mb-4">
      <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
        How this app works
      </h3>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </div>

    <!-- No Flows (Improved empty state) -->
    <div v-else-if="flows.length === 0" class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
        No Business Flows yet.
      </p>
      <p class="text-xs text-gray-500 dark:text-gray-500 mb-3">
        Import a template from Control to see how this app works.
      </p>
      <button
        v-if="isAdmin"
        @click="goToBusinessFlows"
        class="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
      >
        Go to Business Flows →
      </button>
    </div>

    <!-- Flow List -->
    <div v-else class="space-y-3">
      <div
        v-for="flow in flows"
        :key="flow.id"
        @click="viewFlow(flow)"
        class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ flow.name }}
              </h4>
              <span
                v-if="flow.hasActiveProcesses"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              >
                Active
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {{ flow.description }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {{ flow.processCount }} process{{ flow.processCount !== 1 ? 'es' : '' }}
            </p>
          </div>
          <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authRegistry';
import apiClient from '@/utils/apiClient';

const props = defineProps({
  appKey: {
    type: String,
    required: true
  }
});

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref(null);
const flows = ref([]);

const isAdmin = computed(() => {
  return authStore.user?.role === 'admin' || authStore.user?.role === 'platform_admin';
});

const loadFlows = async () => {
  if (!props.appKey) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get('/automation/app-flows', {
      params: { appKey: props.appKey }
    });

    if (response.success) {
      flows.value = response.data?.flows || [];
    } else {
      error.value = response.message || 'Failed to load flows';
    }
  } catch (err) {
    error.value = err.message || 'Failed to load flows';
    console.error('Error loading app flows:', err);
  } finally {
    loading.value = false;
  }
};

const viewFlow = (flow) => {
  router.push(`/control/flows/${flow.id}`);
};

const goToBusinessFlows = () => {
  router.push('/control/flows');
};

onMounted(() => {
  loadFlows();
});

watch(() => props.appKey, () => {
  loadFlows();
});
</script>
