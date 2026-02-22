<template>
  <div class="w-full max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <button
        @click="$router.back()"
        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>

    <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">
      {{ isEdit ? 'Edit Business Flow' : 'Create Business Flow' }}
    </h1>

    <!-- Form -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <!-- Flow Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Flow Name <span class="text-red-500">*</span>
        </label>
        <input
          v-model="formData.name"
          type="text"
          placeholder="e.g., Lead to Deal Conversion Flow"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          v-model="formData.description"
          rows="3"
          placeholder="Describe how these processes work together..."
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
        ></textarea>
      </div>

      <!-- App -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          App <span class="text-red-500">*</span>
        </label>
        <select
          v-model="formData.appKey"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
        >
          <option value="">Select App</option>
          <option value="SALES">SALES</option>
          <option value="AUDIT">AUDIT</option>
          <option value="PORTAL">PORTAL</option>
        </select>
      </div>

      <!-- Process Selector -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Processes <span class="text-red-500">*</span>
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Select multiple processes to visualize together. Order is inferred automatically.
        </p>

        <!-- Loading -->
        <div v-if="loadingProcesses" class="text-sm text-gray-500 dark:text-gray-400">
          Loading processes...
        </div>

        <!-- Process List -->
        <div v-else class="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div
            v-for="process in availableProcesses"
            :key="process._id"
            class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <input
              :id="`process-${process._id}`"
              type="checkbox"
              :value="process._id"
              v-model="formData.processIds"
              class="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label :for="`process-${process._id}`" class="flex-1 cursor-pointer">
              <div class="font-medium text-gray-900 dark:text-white">{{ process.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ getTriggerSummary(process) }}
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    process.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : process.status === 'draft'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  ]"
                >
                  {{ process.status === 'active' ? 'Active' : process.status === 'draft' ? 'Draft' : 'Archived' }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ process.appKey }}</span>
              </div>
            </label>
          </div>

          <div v-if="availableProcesses.length === 0" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No processes found for this app. Create processes first.
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="$router.back()"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleSave"
          :disabled="!isValid || processing"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ processing ? 'Saving...' : isEdit ? 'Update' : 'Create' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import apiClient from '@/utils/apiClient';
import { useNotifications } from '@/composables/useNotifications';

const router = useRouter();
const route = useRoute();
const { success: showSuccess, error: showError } = useNotifications();

const isEdit = computed(() => route.name === 'control-flows-edit');
const flowId = computed(() => route.params.id);

const formData = ref({
  name: '',
  description: '',
  appKey: '',
  processIds: []
});

const availableProcesses = ref([]);
const loadingProcesses = ref(true);
const processing = ref(false);

const isValid = computed(() => {
  return formData.value.name.trim() &&
         formData.value.appKey &&
         formData.value.processIds.length > 0;
});

const loadProcesses = async (appKey) => {
  loadingProcesses.value = true;
  try {
    const params = appKey ? { appKey } : {};
    const response = await apiClient.get('/admin/processes', { params });
    availableProcesses.value = response.data || [];
  } catch (err) {
    console.error('Error loading processes:', err);
    availableProcesses.value = [];
  } finally {
    loadingProcesses.value = false;
  }
};

const loadFlow = async () => {
  if (!isEdit.value) return;
  try {
    const response = await apiClient.get(`/admin/business-flows/${flowId.value}`);
    const flow = response.data;
    formData.value = {
      name: flow.name || '',
      description: flow.description || '',
      appKey: flow.appKey || '',
      processIds: (flow.processIds || []).map(p => p._id || p)
    };
    await loadProcesses(flow.appKey);
  } catch (err) {
    showError(err.message || 'Failed to load business flow');
    router.back();
  }
};

const getTriggerSummary = (process) => {
  const trigger = process.trigger || {};
  if (trigger.type === 'domain_event') {
    const eventType = trigger.eventType || '';
    if (eventType === 'record.created') return 'Runs when a record is created';
    if (eventType === 'record.updated') return 'Runs when a record is updated';
    if (eventType === 'status.changed') return 'Runs when status changes';
    if (eventType === 'stage.changed') return 'Runs when stage changes';
    return `Runs on ${eventType}`;
  }
  return 'Manual trigger';
};

const handleSave = async () => {
  if (!isValid.value || processing.value) return;
  processing.value = true;
  try {
    const payload = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim() || null,
      appKey: formData.value.appKey,
      processIds: formData.value.processIds
    };

    let response;
    if (isEdit.value) {
      response = await apiClient.put(`/admin/business-flows/${flowId.value}`, payload);
    } else {
      response = await apiClient.post('/admin/business-flows', payload);
    }

    if (response.success) {
      showSuccess(isEdit.value ? 'Business flow updated' : 'Business flow created');
      router.push(`/control/flows/${response.data._id}`);
    } else {
      showError(response.message || 'Failed to save');
    }
  } catch (err) {
    showError(err.message || 'Failed to save');
  } finally {
    processing.value = false;
  }
};

// Watch appKey to reload processes
watch(() => formData.value.appKey, (newAppKey) => {
  if (newAppKey) {
    loadProcesses(newAppKey);
  }
});

onMounted(async () => {
  document.title = isEdit.value ? 'Edit Business Flow | LiteDesk' : 'Create Business Flow | LiteDesk';
  if (isEdit.value) {
    await loadFlow();
  } else {
    await loadProcesses();
  }
});
</script>
