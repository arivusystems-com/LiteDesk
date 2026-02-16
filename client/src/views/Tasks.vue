<template>
  <div class="mx-auto w-full">
    <!-- Entity Description -->
    <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        <strong>Tasks</strong> are shared across all apps. They can be linked to deals, tickets, audits, and other records to track work and follow-ups.
      </p>
    </div>

    <!-- Registry-Driven ModuleList -->
    <ModuleList
      ref="moduleListRef"
      module-key="tasks"
      app-key="PLATFORM"
      @create="openCreateModal"
      @import="showImportModal = true"
      @export="exportTasks"
      @row-click="handleRowClick"
      @bulk-action="handleBulkAction"
    >
      <!-- Custom Title Cell with checkbox -->
      <template #cell-title="{ row }">
        <div class="flex items-center gap-3">
          <input 
            type="checkbox" 
            :checked="row.status === 'completed'"
            @click.stop="toggleTaskStatus(row)"
            class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span :class="['font-semibold', row.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white']">
            {{ row.title }}
          </span>
        </div>
      </template>

      <!-- Custom Status Cell with Badge -->
      <template #cell-status="{ value }">
        <BadgeCell 
          :value="formatStatus(value)" 
          :variant-map="{
            'Todo': 'default',
            'In Progress': 'info',
            'Waiting': 'warning',
            'Completed': 'success',
            'Cancelled': 'danger'
          }"
        />
      </template>

      <!-- Custom Priority Cell with Badge -->
      <template #cell-priority="{ value }">
        <BadgeCell 
          v-if="value"
          :value="formatPriority(value)" 
          :variant-map="{
            'Low': 'default',
            'Medium': 'info',
            'High': 'warning',
            'Urgent': 'danger'
          }"
        />
        <span v-else class="text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom Assigned To Cell -->
      <template #cell-assignedTo="{ row }">
        <div v-if="row.assignedTo" class="flex items-center gap-2">
          <Avatar
            v-if="typeof row.assignedTo === 'object'"
            :user="{
              firstName: row.assignedTo.firstName || row.assignedTo.first_name,
              lastName: row.assignedTo.lastName || row.assignedTo.last_name,
              email: row.assignedTo.email,
              avatar: row.assignedTo.avatar
            }"
            size="sm"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ getUserDisplayName(row.assignedTo) }}
          </span>
        </div>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
      </template>

      <!-- Custom Due Date Cell with highlighting -->
      <template #cell-dueDate="{ row }">
        <span v-if="row.dueDate" :class="[
          'text-sm font-medium',
          isOverdue(row.dueDate) && row.status !== 'completed' ? 'text-red-600 dark:text-red-400' :
          isDueToday(row.dueDate) && row.status !== 'completed' ? 'text-yellow-600 dark:text-yellow-400' :
          'text-gray-700 dark:text-gray-300'
        ]">
          <DateCell :value="row.dueDate" format="short" />
        </span>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">No due date</span>
      </template>

      <!-- Custom Created Date Cell -->
      <template #cell-createdAt="{ value }">
        <DateCell :value="value" format="short" />
      </template>

    </ModuleList>

    <!-- Task Form Modal -->
    <CreateRecordDrawer 
      :isOpen="showFormModal"
      moduleKey="tasks"
      :record="editingTask"
      @close="closeFormModal"
      @saved="handleTaskSave"
    />

    <!-- CSV Import Modal -->
    <CSVImportModal 
      v-if="showImportModal"
      entity-type="Tasks"
      @close="showImportModal = false"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';
import ModuleList from '@/components/module-list/ModuleList.vue';
import BadgeCell from '@/components/common/table/BadgeCell.vue';
import DateCell from '@/components/common/table/DateCell.vue';
import CreateRecordDrawer from '@/components/common/CreateRecordDrawer.vue';
import CSVImportModal from '@/components/import/CSVImportModal.vue';
import Avatar from '@/components/common/Avatar.vue';

const router = useRouter();
const authStore = useAuthStore();
const { openTab } = useTabs();

// State
const moduleListRef = ref(null);
const showFormModal = ref(false);
const showImportModal = ref(false);
const editingTask = ref(null);

const refreshList = () => {
  moduleListRef.value?.refresh?.();
};

// Helper functions for dates
const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
};

const isDueToday = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate).toDateString() === new Date().toDateString();
};

// Helper function to get user display name
const getUserDisplayName = (user) => {
  if (!user) return '';
  if (typeof user === 'string') return user;
  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';
  return `${firstName} ${lastName}`.trim() || user.email || '';
};

// Toggle task status (quick complete/incomplete)
const toggleTaskStatus = async (task) => {
  try {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await apiClient.patch(`/tasks/${task._id}/status`, { status: newStatus });
    refreshList();
  } catch (error) {
    console.error('Error toggling task status:', error);
  }
};

// Modal handlers
const openCreateModal = () => {
  editingTask.value = null;
  showFormModal.value = true;
};

const handleRowClick = (row) => {
  // Navigate to task detail if route exists, otherwise emit event
  openTab(`/tasks/${row._id}`, {
    title: row.title || 'Task Detail',
    background: false
  });
};

const handleBulkAction = async (action, rows) => {
  const taskIds = rows.map(task => task._id);
  
  try {
    if (action === 'delete') {
      await Promise.all(taskIds.map(id => apiClient.delete(`/tasks/${id}`)));
      refreshList();
    } else if (action === 'export') {
      // Export functionality handled by ModuleList
    }
  } catch (error) {
    console.error('Error performing bulk action:', error);
    alert('Error performing bulk action. Please try again.');
  }
};

// Export tasks
const exportTasks = async () => {
  try {
    const response = await fetch('/api/csv/export/tasks', {
      headers: {
        'Authorization': `Bearer ${authStore.user?.token}`
      }
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting tasks:', error);
    alert('Error exporting tasks. Please try again.');
  }
};

const handleImportComplete = () => {
  showImportModal.value = false;
  refreshList();
};

const handleTaskSave = () => {
  showFormModal.value = false;
  editingTask.value = null;
  refreshList();
};

const closeFormModal = () => {
  showFormModal.value = false;
  editingTask.value = null;
};

// Utility functions
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const formatStatus = (status) => {
  // Map task status values to display format
  const statusMap = {
    'todo': 'Todo',
    'in_progress': 'In Progress',
    'waiting': 'Waiting',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  if (statusMap[status]) {
    return statusMap[status];
  }
  // Fallback: capitalize first letter
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : '-';
};

const formatPriority = (priority) => {
  // Map priority values to display format
  const priorityMap = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'urgent': 'Urgent'
  };
  return priorityMap[priority] || priority;
};
</script>

