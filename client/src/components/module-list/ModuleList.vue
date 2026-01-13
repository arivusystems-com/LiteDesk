<template>
  <div v-if="loading" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      <p class="text-gray-600 dark:text-gray-400 mt-4">Loading list...</p>
    </div>
  </div>

  <div v-else-if="listDefinition">
    <!-- Empty State (from definition) -->
    <div v-if="shouldShowEmptyState" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center max-w-md">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ listDefinition.emptyState.title }}
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ listDefinition.emptyState.description }}
        </p>
        <button
          v-if="listDefinition.emptyState.primaryAction"
          @click="handleAction(listDefinition.emptyState.primaryAction.route)"
          class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
        >
          {{ listDefinition.emptyState.primaryAction.label }}
        </button>
      </div>
    </div>

    <!-- List View -->
    <ListView
      v-else
      :title="listDefinition.title"
      :description="listDefinition.description"
      :module-key="listDefinition.moduleKey"
      :create-label="getCreateLabel()"
      :search-placeholder="`Search ${listDefinition.title.toLowerCase()}...`"
      :data="data"
      :columns="adaptedColumns"
      :loading="dataLoading"
      :statistics="statistics"
      :stats-config="statsConfig"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :pagination="pagination"
      :filter-config="adaptedFilters"
      :table-id="`${listDefinition.moduleKey}-table`"
      row-key="_id"
      :empty-title="listDefinition.emptyState?.title || `No ${listDefinition.title.toLowerCase()} yet`"
      :empty-message="listDefinition.emptyState?.description || `${listDefinition.title} will appear here as you add them.`"
      @create="handleCreate"
      @import="handleImport"
      @export="handleExport"
      @update:searchQuery="handleSearchQueryUpdate"
      @update:filters="handleFiltersUpdate"
      @update:sort="handleSortUpdate"
      @update:pagination="handlePaginationUpdate"
      @fetch="fetchData"
      @row-click="handleRowClick"
      @edit="handleEdit"
      @delete="handleDelete"
      @bulk-action="handleBulkAction"
    >
      <!-- Pass through all slots for custom cell rendering -->
      <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps" />
      </template>
    </ListView>
  </div>

  <!-- Error State -->
  <div v-else class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">List Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400">
        The list for this module is not available.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import { buildModuleListFromRegistry } from '@/utils/buildModuleListFromRegistry';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';
import { EmptyStateType } from '@/types/empty-state.types';
import ListView from '@/components/common/ListView.vue';
import apiClient from '@/utils/apiClient';

const props = defineProps({
  moduleKey: {
    type: String,
    required: true
  },
  appKey: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['create', 'import', 'export', 'row-click', 'edit', 'delete', 'bulk-action']);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { openTab } = useTabs();

const loading = ref(true);
const dataLoading = ref(false);
const listDefinition = ref(null);
const data = ref([]);
const statistics = ref({});
const statsConfig = ref([]);
const sortField = ref('');
const sortOrder = ref('asc');
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  limit: 25
});
const filters = ref({});
const searchQuery = ref('');

// Build list from registry
const buildList = async () => {
  if (!authStore.user || !authStore.isAuthenticated) {
    listDefinition.value = null;
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    // Fetch app registry
    const registry = await getAppRegistry();
    
    if (!authStore.user || !authStore.isAuthenticated) {
      return;
    }

    // Create permission snapshot
    const snapshot = createPermissionSnapshot(authStore.user);

    // Build list definition
    const definition = buildModuleListFromRegistry(
      props.moduleKey,
      props.appKey,
      registry,
      snapshot
    );
    
    console.log('[ModuleList] Building list for module:', props.moduleKey);
    console.log('[ModuleList] List definition:', definition);
    console.log('[ModuleList] Columns:', definition?.columns);
    console.log('[ModuleList] Primary Actions:', definition?.primaryActions);
    console.log('[ModuleList] Empty State:', definition?.emptyState);
    
    if (authStore.user && authStore.isAuthenticated) {
      listDefinition.value = definition;
      
      // Initialize sort from definition
      if (definition?.defaultSort) {
        sortField.value = definition.defaultSort.column;
        sortOrder.value = definition.defaultSort.order;
      }
      
      // Initialize pagination from definition
      if (definition?.pagination) {
        pagination.value.limit = definition.pagination.pageSize;
      }
      
      // Fetch data after definition is built
      // Only skip if empty state is NOT_CONFIGURED (no columns)
      // Otherwise fetch data even if empty state exists (might be NO_DATA)
      if (definition && definition.emptyState?.type !== 'NOT_CONFIGURED') {
        await fetchData();
      }
    }
  } catch (error) {
    console.error('[ModuleList] Error building list:', error);
    if (authStore.isAuthenticated) {
      listDefinition.value = null;
    }
  } finally {
    if (authStore.isAuthenticated) {
      loading.value = false;
    }
  }
};

// Adapt columns from definition to ListView format
const adaptedColumns = computed(() => {
  if (!listDefinition.value?.columns) return [];
  
  return listDefinition.value.columns.map(col => ({
    key: col.key,
    label: col.label,
    sortable: col.sortable ?? false,
    sortKey: col.fieldPath || col.key,
    dataType: col.dataType
  }));
});

// Adapt filters from definition to ListView format
const adaptedFilters = computed(() => {
  if (!listDefinition.value?.filters) return [];
  
  return listDefinition.value.filters.map(filter => ({
    key: filter.key,
    label: filter.label,
    options: filter.options || [],
    fieldPath: filter.fieldPath
  }));
});

// Get create label from primary actions
const getCreateLabel = () => {
  const createAction = listDefinition.value?.primaryActions?.find(a => a.type === 'create');
  return createAction?.label || `New ${listDefinition.value?.title || 'Item'}`;
};

// Determine when to show empty state based on definition type (not inline data check)
const shouldShowEmptyState = computed(() => {
  if (!listDefinition.value?.emptyState) {
    return false;
  }

  const emptyState = listDefinition.value.emptyState;
  const emptyStateType = emptyState.type;

  // NO_ACCESS or NOT_CONFIGURED: Always show (regardless of data)
  if (emptyStateType === EmptyStateType.NO_ACCESS || emptyStateType === EmptyStateType.NOT_CONFIGURED) {
    return true;
  }

  // NO_DATA: Show only when data is empty
  if (emptyStateType === EmptyStateType.NO_DATA) {
    return !data.value || data.value.length === 0;
  }

  // DISABLED or FIRST_TIME: Show always
  if (emptyStateType === EmptyStateType.DISABLED || emptyStateType === EmptyStateType.FIRST_TIME) {
    return true;
  }

  // Default: Don't show
  return false;
});

// Fetch data from API
const fetchData = async () => {
  if (!listDefinition.value) return;
  
  dataLoading.value = true;
  try {
    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.limit,
      sortBy: sortField.value || 'createdAt',
      sortOrder: sortOrder.value || 'desc',
      ...filters.value
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    // Use moduleKey to determine API endpoint
    const endpoint = `/${props.moduleKey}`;
    const response = await apiClient.get(endpoint, { params });

    if (response.success) {
      data.value = response.data || [];
      if (response.pagination) {
        pagination.value = {
          currentPage: response.pagination.currentPage || pagination.value.currentPage,
          totalPages: response.pagination.totalPages || 1,
          totalRecords: response.pagination.totalRecords || response.pagination[`total${props.moduleKey.charAt(0).toUpperCase() + props.moduleKey.slice(1)}`] || 0,
          limit: pagination.value.limit
        };
      }
      if (response.statistics) {
        statistics.value = response.statistics;
      }
    } else {
      data.value = [];
    }
  } catch (error) {
    console.error('[ModuleList] Error fetching data:', error);
    data.value = [];
  } finally {
    dataLoading.value = false;
  }
};

// Handle actions
const handleCreate = () => {
  // Always emit 'create' event to let parent component handle it (e.g., open drawer)
  // Don't navigate to create routes - create actions should use drawers/modals
  emit('create');
};

const handleImport = () => {
  const importAction = listDefinition.value?.primaryActions?.find(a => a.type === 'import');
  if (importAction?.route) {
    handleAction(importAction.route);
  } else {
    emit('import');
  }
};

const handleExport = () => {
  const exportAction = listDefinition.value?.primaryActions?.find(a => a.type === 'export');
  if (exportAction?.route) {
    handleAction(exportAction.route);
  } else {
    emit('export');
  }
};

const handleAction = (route) => {
  if (!route) return;
  openTab(route, {
    title: route.split('/').pop(),
    background: false
  });
};

// Handle events
const handleSearchQueryUpdate = (query) => {
  searchQuery.value = query;
  pagination.value.currentPage = 1;
  fetchData();
};

const handleFiltersUpdate = (newFilters) => {
  filters.value = newFilters;
  pagination.value.currentPage = 1;
  fetchData();
};

const handleSortUpdate = ({ sortField: key, sortOrder: order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchData();
};

const handlePaginationUpdate = (p) => {
  pagination.value.currentPage = p.currentPage;
  if (p.limit) {
    pagination.value.limit = p.limit;
  }
  fetchData();
};

const handleRowClick = (row) => {
  const viewAction = listDefinition.value?.rowActions?.find(a => a.type === 'view');
  if (viewAction?.route) {
    const route = viewAction.route.replace(':id', row._id);
    openTab(route, {
      title: row.name || row.title || row.first_name || 'Detail',
      background: false
    });
  } else {
    emit('row-click', row);
  }
};

const handleEdit = (row) => {
  const editAction = listDefinition.value?.rowActions?.find(a => a.type === 'edit');
  if (editAction?.route) {
    const route = editAction.route.replace(':id', row._id);
    openTab(route, {
      title: `Edit ${row.name || row.title || 'Item'}`,
      background: false
    });
  } else {
    emit('edit', row);
  }
};

const handleDelete = (row) => {
  emit('delete', row);
};

const handleBulkAction = (action, rows) => {
  emit('bulk-action', action, rows);
};

// Watch for user changes
watch(() => authStore.user, () => {
  if (authStore.user && authStore.isAuthenticated) {
    buildList();
  }
}, { immediate: true });

// Watch for moduleKey/appKey changes
watch(() => [props.moduleKey, props.appKey], () => {
  if (authStore.user && authStore.isAuthenticated) {
    buildList();
  }
});

// Build on mount
onMounted(() => {
  if (authStore.user && authStore.isAuthenticated) {
    buildList();
  }
});
</script>

