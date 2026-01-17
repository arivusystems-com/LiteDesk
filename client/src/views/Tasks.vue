<template>
  <div class="mx-auto">
    <!-- Entity Description -->
    <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        <strong>Tasks</strong> are shared across all apps. They can be linked to deals, tickets, audits, and other records to track work and follow-ups.
      </p>
    </div>

    <ListView
      title="Tasks"
      description="Manage your tasks and to-dos"
      module-key="tasks"
      create-label="New Task"
      search-placeholder="Search tasks..."
      :data="tasks"
      :columns="columns"
      :loading="loading"
      :statistics="statistics"
      :stats-config="[]"
      :pagination="{ currentPage: pagination.currentPage, totalPages: pagination.totalPages, totalRecords: pagination.totalTasks, limit: pagination.tasksPerPage }"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filter-config="[
        {
          key: 'status',
          label: 'All Status',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'completed', label: 'Completed' }
          ]
        },
        {
          key: 'assignedTo',
          label: 'All Assignees',
          options: [
            { value: 'me', label: 'My Tasks' }
          ]
        },
        {
          key: 'appContext',
          label: 'All Apps',
          options: [
            { value: '', label: 'All Apps' },
            { value: 'SALES', label: 'Sales' },
            { value: 'PORTAL', label: 'Portal' },
            { value: 'AUDIT', label: 'Audit' },
            { value: 'LMS', label: 'LMS' }
          ]
        }
      ]"
      table-id="tasks-table"
      row-key="_id"
      empty-title="No tasks yet"
      empty-message="Tasks appear here when you're assigned work across Sales or Helpdesk. You can also create standalone tasks to track your own work."
      @create="openCreateModal"
      @import="showImportModal = true"
      @export="exportTasks"
      @update:searchQuery="handleSearchQueryUpdate"
      @update:filters="(newFilters) => { Object.assign(filters, newFilters); fetchTasks(); }"
      @update:sort="({ sortField: key, sortOrder: order }) => { handleSort({ key, order }); }"
      @update:pagination="(p) => { pagination.currentPage = p.currentPage; pagination.tasksPerPage = p.limit || pagination.tasksPerPage; fetchTasks(); }"
      @fetch="fetchTasks"
      @row-click="openDetailModal"
      @edit="openEditModal"
      @delete="handleDelete"
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

      <!-- Custom App Context Cell with Badge -->
      <template #cell-appContext="{ value }">
        <BadgeCell 
          :value="formatAppContext(value)" 
          :variant-map="{
            'Sales': 'primary',
            'Portal': 'info',
            'Audit': 'warning',
            'LMS': 'success'
          }"
        />
      </template>

      <!-- Custom Status Cell with Badge -->
      <template #cell-status="{ value }">
        <BadgeCell 
          :value="formatStatus(value)" 
          :variant-map="{
            'Open': 'default',
            'Completed': 'success'
          }"
        />
      </template>

      <!-- Custom Assigned To Cell -->
      <template #cell-assignedTo="{ row }">
        <div v-if="row.assignedTo || row.ownerPersonId" class="flex items-center gap-2">
          <Avatar
            :user="{
              firstName: row.assignedTo?.firstName || row.ownerPersonId?.first_name,
              lastName: row.assignedTo?.lastName || row.ownerPersonId?.last_name,
              avatar: row.assignedTo?.avatar
            }"
            size="sm"
          />
          <span class="text-sm text-gray-900 dark:text-white">
            {{ row.assignedTo?.firstName || row.ownerPersonId?.first_name }} {{ row.assignedTo?.lastName || row.ownerPersonId?.last_name }}
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

    </ListView>

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
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useBulkActions } from '@/composables/useBulkActions';
import apiClient from '../utils/apiClient';
import ListView from '@/components/common/ListView.vue';
import BadgeCell from '../components/common/table/BadgeCell.vue';
import DateCell from '../components/common/table/DateCell.vue';
import CreateRecordDrawer from '@/components/common/CreateRecordDrawer.vue';
import CSVImportModal from '../components/import/CSVImportModal.vue';
import Avatar from '@/components/common/Avatar.vue';

const router = useRouter();
const authStore = useAuthStore();

// State
const tasks = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const showFormModal = ref(false);
const showDetailModal = ref(false);
const showImportModal = ref(false);
const editingTask = ref(null);
const selectedTask = ref(null);

const filters = reactive({
  status: '',
  assignedTo: '',
  appContext: '' // Default to empty = All Apps
});

const pagination = reactive({
  currentPage: 1,
  totalPages: 1,
  totalTasks: 0,
  tasksPerPage: 20
});

const sortField = ref('createdAt');
const sortOrder = ref('desc');

const statistics = reactive({
  total: 0,
  overdue: 0,
  dueToday: 0,
  byStatus: {},
  byPriority: {}
});

// Mass Actions
// Use bulk actions composable with permissions
const { bulkActions: baseMassActions } = useBulkActions('tasks');

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() !== '' || 
         (filters?.status || '') !== '' || 
         (filters?.assignedTo || '') !== '';
});

// Add custom "Mark Complete" action for tasks
const massActions = computed(() => {
  const actions = [];
  
  // Add Mark Complete action if user can edit
  if (authStore.can('tasks', 'edit')) {
    actions.push({ label: 'Mark Complete', icon: 'edit', action: 'bulk-complete', variant: 'success' });
  }
  
  // Add base actions (Delete, Export) based on permissions
  actions.push(...baseMassActions.value);
  
  return actions;
});

// Column definitions
const columns = computed(() => {
  const allColumns = [
    { key: 'title', label: 'Task', sortable: true, minWidth: '250px' },
    { key: 'appContext', label: 'App', sortable: true, minWidth: '100px' },
    { key: 'status', label: 'Status', sortable: true, minWidth: '150px' },
    { 
      key: 'assignedTo', 
      label: 'Assigned To', 
      sortable: false,  // Server doesn't support sorting by populated field
      minWidth: '180px',
      sortValue: (row) => {
        if (row.assignedTo) {
          return `${row.assignedTo.firstName || ''} ${row.assignedTo.lastName || ''}`.trim();
        }
        if (row.ownerPersonId) {
          return `${row.ownerPersonId.first_name || ''} ${row.ownerPersonId.last_name || ''}`.trim();
        }
        return '';
      }
    },
    { key: 'dueDate', label: 'Due Date', sortable: true, minWidth: '140px' }
  ];
  
  return allColumns;
});

// Helper functions for dates
const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
};

const isDueToday = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate).toDateString() === new Date().toDateString();
};

// Event handlers
const handlePageChange = (page) => {
  pagination.currentPage = page;
  fetchTasks();
};

const handleSort = ({ key, order }) => {
  const sortMap = {
    'title': 'title',
    'priority': 'priority',
    'status': 'status',
    'dueDate': 'dueDate'
  };
  
  // If key is empty, reset to default sort
  if (!key) {
    sortField.value = 'createdAt';
    sortOrder.value = 'desc';
  } else {
    sortField.value = sortMap[key] || 'createdAt';
    sortOrder.value = order;
  }
  
  fetchTasks();
};

// Fetch tasks
const fetchTasks = async () => {
  try {
    loading.value = true;
    
    // Use Scheduling API to fetch tasks
    // Aggregation: by default fetches across all apps
    // Optional appContext filter narrows to specific app
    const params = {
      type: 'task'
    };

    // Add appContext filter if selected (empty string means "All Apps")
    if (filters.appContext) {
      params.appContext = filters.appContext;
    }

    console.log('Fetching tasks with params:', params);
    const response = await apiClient.get('/scheduling', { params });
    console.log('Tasks response:', response);

    if (response && response.success) {
      // Map Scheduling items to task-like structure for UI compatibility
      const items = Array.isArray(response.data) ? response.data : [];
      console.log('Raw scheduling items:', items.length, items);
      
      tasks.value = items.map(item => {
        // Handle ownerPersonId mapping (can be object or null)
        let assignedTo = null;
        if (item.ownerPersonId) {
          if (typeof item.ownerPersonId === 'object' && item.ownerPersonId._id) {
            assignedTo = {
              firstName: item.ownerPersonId.first_name || '',
              lastName: item.ownerPersonId.last_name || '',
              _id: item.ownerPersonId._id
            };
          }
        }
        
        return {
          ...item,
          assignedTo,
          // Scheduling model doesn't have priority or tags - set defaults
          priority: null,
          tags: []
        };
      });
      
      // Note: Scheduling API returns flat list without pagination
      // Set pagination values for UI compatibility
      pagination.totalTasks = tasks.value.length;
      pagination.totalPages = 1;
      console.log('Tasks loaded:', tasks.value.length, tasks.value);
    } else {
      console.error('Response not successful:', response);
      tasks.value = [];
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    console.error('Error details:', error.message, error.stack);
    if (error.response) {
      console.error('Error response:', error.response);
    }
    tasks.value = [];
  } finally {
    loading.value = false;
  }
};

// Fetch statistics - not available for Scheduling API
const fetchStatistics = async () => {
  // Statistics endpoint not available for Scheduling API
  // Keep function for compatibility but no-op
};

// Debounced search
let searchTimeout;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.currentPage = 1;
    fetchTasks();
  }, 300);
};

// Handle search query update
const handleSearchQueryUpdate = (query) => {
  searchQuery.value = query;
  debouncedSearch();
};

// Clear filters
const clearFilters = () => {
  filters.status = '';
  filters.assignedTo = '';
  filters.appContext = '';
  searchQuery.value = '';
  pagination.currentPage = 1;
  fetchTasks();
};

// Page navigation
const changePage = (page) => {
  pagination.currentPage = page;
  fetchTasks();
};

// Toggle task status (quick complete/incomplete)
const toggleTaskStatus = async (task) => {
  try {
    // Scheduling API uses 'open' and 'completed' status values
    const newStatus = task.status === 'completed' ? 'open' : 'completed';
    await apiClient.patch(`/scheduling/${task._id}/status`, { status: newStatus });
    await fetchTasks();
    // Note: Statistics endpoint may not exist for Scheduling - skip for now
    // await fetchStatistics();
  } catch (error) {
    console.error('Error toggling task status:', error);
  }
};

// Modal handlers
const openCreateModal = () => {
  editingTask.value = null;
  showFormModal.value = true;
};

const openDetailModal = (task) => {
  selectedTask.value = task;
  showDetailModal.value = true;
};

const openEditModal = (task) => {
  editingTask.value = task;
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  editingTask.value = null;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedTask.value = null;
};

const handleTaskSave = async () => {
  closeFormModal();
  // Reset to page 1 to see the new/updated task
  pagination.currentPage = 1;
  await fetchTasks();
};

const handleEdit = (task) => {
  closeDetailModal();
  editingTask.value = task;
  showFormModal.value = true;
};

const handleDelete = async (row) => {
  const taskId = row._id || row;
  
  try {
    await apiClient.delete(`/scheduling/${taskId}`);
    closeDetailModal();
    await fetchTasks();
  } catch (error) {
    console.error('Error deleting task:', error);
  }
};

// Bulk Actions Handlers
const handleSelect = (selectedRows) => {
  console.log(`${selectedRows.length} tasks selected`);
};

const handleBulkAction = async (actionId, selectedRows) => {
  const taskIds = selectedRows.map(task => task._id);
  
  try {
    if (actionId === 'bulk-delete' || actionId === 'delete') {
      await Promise.all(taskIds.map(id => apiClient.delete(`/scheduling/${id}`)));
      await fetchTasks();
      
    } else if (actionId === 'bulk-complete') {
      if (!confirm(`Mark ${selectedRows.length} tasks as complete?`)) return;
      
      await Promise.all(taskIds.map(id => 
        apiClient.patch(`/scheduling/${id}/status`, { status: 'completed' })
      ));
      await fetchTasks();
      
    } else if (actionId === 'bulk-export' || actionId === 'export') {
      exportTasksToCSV(selectedRows);
    }
  } catch (error) {
    console.error('Error performing bulk action:', error);
    alert('Error performing bulk action. Please try again.');
  }
};

const exportTasksToCSV = (tasksToExport) => {
  const csv = [
    ['Title', 'Status', 'Due Date', 'Assigned To'].join(','),
    ...tasksToExport.map(task => {
      const owner = task.assignedTo || task.ownerPersonId;
      const ownerName = owner 
        ? `${owner.firstName || owner.first_name || ''} ${owner.lastName || owner.last_name || ''}`.trim()
        : '';
      return [
        task.title,
        task.status,
        task.dueDate || '',
        ownerName
      ].join(',');
    })
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const handleStatusChange = async () => {
  await fetchTasks();
  closeDetailModal();
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

// Column settings handled by ListView component

const handleImportComplete = () => {
  showImportModal.value = false;
  fetchTasks();
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
  // Map Scheduling status values ('open', 'completed') to display format
  const statusMap = {
    'open': 'Open',
    'completed': 'Completed'
  };
  if (statusMap[status]) {
    return statusMap[status];
  }
  // Fallback for old status values if any
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatAppContext = (appContext) => {
  // Map app context keys to display names
  const appContextMap = {
    'SALES': 'Sales',
    'PORTAL': 'Portal',
    'AUDIT': 'Audit',
    'LMS': 'LMS',
    'CONTROL_PLANE': 'Control Plane'
  };
  if (appContextMap[appContext]) {
    return appContextMap[appContext];
  }
  // Fallback: return as-is if not in map
  return appContext || 'Unknown';
};

// Initialize
onMounted(() => {
  // Load saved sort state from localStorage before fetching
  const savedSort = localStorage.getItem('datatable-tasks-table-sort');
  if (savedSort) {
    try {
      const { by, order } = JSON.parse(savedSort);
      
      // Map frontend column keys to backend sort fields
      const sortMap = {
        'title': 'title',
        'priority': 'priority',
        'status': 'status',
        'dueDate': 'dueDate'
      };
      
      // If the saved sort key is valid, use it; otherwise default to createdAt
      if (by && sortMap[by]) {
        sortField.value = sortMap[by];
        sortOrder.value = order;
        console.log('Loaded saved sort in Tasks:', { by, order, mapped: sortField.value });
      } else {
        sortField.value = 'createdAt';
        sortOrder.value = 'desc';
        console.log('Saved sort invalid or empty, using default:', { by, order });
        // Clear invalid saved sort
        localStorage.removeItem('datatable-tasks-table-sort');
      }
    } catch (e) {
      console.error('Failed to parse saved sort:', e);
      sortField.value = 'createdAt';
      sortOrder.value = 'desc';
    }
  }
  
  fetchTasks();
});
</script>

