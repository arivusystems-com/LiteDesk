<template>
  <div class="w-full">
    <!-- Header -->
    <header class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Processes
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Processes control how your system behaves automatically.
        </p>
      </div>
      <button
        @click="openCreateWizard"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Process
      </button>
    </header>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select
        v-model="filters.appKey"
        @change="loadProcesses"
        class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      >
        <option value="">All Apps</option>
        <option value="SALES">SALES</option>
        <option value="AUDIT">AUDIT</option>
        <option value="PORTAL">PORTAL</option>
      </select>
      <select
        v-model="filters.status"
        @change="loadProcesses"
        class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      >
        <option value="">All Status</option>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- Processes List -->
    <div v-else-if="processes.length > 0" class="space-y-3">
      <div
        v-for="process in processes"
        :key="process._id"
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ process.name }}
              </h3>
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
            </div>
            <p v-if="process.description" class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {{ process.description }}
            </p>
            <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                <span class="font-medium">App:</span> {{ process.appKey }}
              </span>
              <span>
                <span class="font-medium">Trigger:</span>
                {{ process.trigger.type === 'domain_event' ? process.trigger.eventType : 'Manual' }}
              </span>
              <span>
                <span class="font-medium">Nodes:</span> {{ process.nodes?.length || 0 }}
              </span>
              <span v-if="process.updatedAt">
                <span class="font-medium">Updated:</span>
                {{ formatDate(process.updatedAt) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="viewExecutions(process)"
              class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="View Logs"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              v-if="process.status === 'draft'"
              @click="activateProcess(process)"
              class="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Activate"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              v-else-if="process.status === 'active'"
              @click="deactivateProcess(process)"
              class="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
              title="Deactivate"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
            <button
              @click="duplicateProcess(process)"
              class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Duplicate"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              @click="editProcess(process)"
              class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Edit"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No processes</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Processes control how your system behaves automatically.
      </p>
      <button
        @click="openCreateWizard"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Process
      </button>
    </div>

    <!-- Process Creation Wizard -->
    <ProcessCreationWizard
      v-if="showWizard"
      @close="showWizard = false"
      @saved="handleProcessSaved"
    />

    <!-- Process Editor -->
    <ProcessEditor
      v-if="editingProcess"
      :process="editingProcess"
      @close="editingProcess = null"
      @saved="handleProcessSaved"
    />

    <!-- Execution Logs Modal -->
    <ProcessExecutionLogs
      v-if="viewingExecutions"
      :process="viewingExecutions"
      @close="viewingExecutions = null"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';
import ProcessCreationWizard from '@/components/admin/ProcessCreationWizard.vue';
import ProcessEditor from '@/components/admin/ProcessEditor.vue';
import ProcessExecutionLogs from '@/components/admin/ProcessExecutionLogs.vue';

const router = useRouter();

const processes = ref([]);
const loading = ref(true);
const error = ref(null);
const filters = ref({
  appKey: '',
  status: ''
});
const showWizard = ref(false);
const editingProcess = ref(null);
const viewingExecutions = ref(null);

const loadProcesses = async () => {
  loading.value = true;
  error.value = null;
  try {
    const params = {};
    if (filters.value.appKey) params.appKey = filters.value.appKey;
    if (filters.value.status) params.status = filters.value.status;

    const response = await apiClient.get('/admin/processes', { params });
    processes.value = response.data || [];
  } catch (err) {
    error.value = err.message || 'Failed to load processes';
    console.error('Error loading processes:', err);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const openCreateWizard = () => {
  showWizard.value = true;
};

const editProcess = (process) => {
  // Allow opening any process in editor
  // Editor will show read-only banner for active processes
  editingProcess.value = process;
};

const duplicateProcess = async (process) => {
  try {
    const response = await apiClient.post(`/admin/processes/${process._id}/duplicate`);
    if (response.success) {
      await loadProcesses();
      alert('Process duplicated successfully');
    }
  } catch (err) {
    alert(err.message || 'Failed to duplicate process');
  }
};

const activateProcess = async (process) => {
  try {
    const response = await apiClient.put(`/admin/processes/${process._id}/status`, { status: 'active' });
    if (response.success) {
      await loadProcesses();
      alert('Process activated successfully');
    }
  } catch (err) {
    alert(err.message || 'Failed to activate process');
  }
};

const deactivateProcess = async (process) => {
  try {
    const response = await apiClient.put(`/admin/processes/${process._id}/status`, { status: 'archived' });
    if (response.success) {
      await loadProcesses();
      alert('Process deactivated successfully');
    }
  } catch (err) {
    alert(err.message || 'Failed to deactivate process');
  }
};

const viewExecutions = (process) => {
  viewingExecutions.value = process;
};

const handleProcessSaved = async (duplicatedProcess) => {
  showWizard.value = false;
  await loadProcesses();
  
  // If a process was duplicated, open it for editing
  if (duplicatedProcess && duplicatedProcess._id) {
    // Find the newly duplicated process (it will have a new _id)
    const newProcess = processes.value.find(p => 
      p.name === duplicatedProcess.name && 
      p.status === 'draft' &&
      p._id !== editingProcess.value?._id
    );
    if (newProcess) {
      editingProcess.value = newProcess;
    } else {
      editingProcess.value = null;
    }
  } else {
    editingProcess.value = null;
  }
};

onMounted(() => {
  document.title = 'Processes | LiteDesk';
  loadProcesses();
});
</script>
