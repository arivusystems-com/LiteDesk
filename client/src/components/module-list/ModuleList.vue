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
      :saved-views="savedViews"
      :active-saved-view-id="activeSavedViewId"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :pagination="pagination"
      :filter-config="adaptedFilters"
      :external-filters="filters"
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
      @saved-view-selected="handleSavedViewSelected"
      @saved-views-updated="handleSavedViewsUpdated"
      @stat-click="handleStatClick"
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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import { buildModuleListFromRegistry } from '@/utils/buildModuleListFromRegistry';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';
import { EmptyStateType } from '@/types/empty-state.types';
import ListView from '@/components/common/ListView.vue';
import apiClient from '@/utils/apiClient';
import { getStateFields, getFieldMetadata, getParticipationFields } from '@/platform/fields/peopleFieldModel';

/**
 * Check if a person participates in an app using state fields
 * A person participates in an app IFF at least one participation state field for that app is non-null
 * Uses getStateFields(appKey) from peopleFieldModel.ts - no hardcoded field names
 */
function participatesInApp(person, appKey) {
  if (!person || !appKey) return false;
  
  // Get all state fields for this app from metadata
  const stateFields = getStateFields(appKey);
  
  // Check if any state field has a non-null value
  return stateFields.some(fieldKey => {
    const value = person[fieldKey];
    return value !== null && value !== undefined && value !== '';
  });
}

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
const sortOrder = ref('desc'); // Default to newest first so new records appear on page 1
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  limit: 25
});
const filters = ref({});
const searchQuery = ref('');

// Saved Views for People module
const savedViews = ref([]);
const activeSavedViewId = ref(null);

// Data for People filters
const availableUsers = ref([]);
const availableOrganizations = ref([]);
const appRegistry = ref(null);

// Known app keys that can have People participation
const knownParticipationApps = ['SALES', 'HELPDESK', 'MARKETING', 'AUDIT', 'PORTAL', 'PROJECTS'];

// App display names
const appDisplayNames = {
  'SALES': 'Sales',
  'HELPDESK': 'Helpdesk',
  'MARKETING': 'Marketing',
  'AUDIT': 'Audit',
  'PORTAL': 'Portal',
  'PROJECTS': 'Projects'
};

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
    appRegistry.value = registry;
    
    if (!authStore.user || !authStore.isAuthenticated) {
      return;
    }
    
    // Fetch users and organizations for People filters
    if (props.moduleKey === 'people') {
      await fetchUsersForFilters();
      await fetchOrganizationsForFilters();
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
        // For people module, prefer 'desc' (newest first) for better UX
        // This ensures new identity-only records appear on page 1
        if (props.moduleKey === 'people' && definition.defaultSort.column === 'createdAt') {
          sortOrder.value = 'desc';
        } else {
          sortOrder.value = definition.defaultSort.order;
        }
      }
      
      // Initialize pagination from definition
      if (definition?.pagination) {
        pagination.value.limit = definition.pagination.pageSize;
      }
      
      // Fetch data after definition is built
      // Only skip if empty state is NOT_CONFIGURED (no columns)
      // Otherwise fetch data even if empty state exists (might be NO_DATA)
      // Initialize stats config for People module (identity-based stats only)
      if (props.moduleKey === 'people') {
        statsConfig.value = [
          { name: 'Total People', key: 'totalPeople', formatter: 'number' },
          { name: 'Assigned to Me', key: 'assignedToMe', formatter: 'number' },
          { name: 'Unassigned', key: 'unassigned', formatter: 'number' },
          { name: 'With Organization', key: 'withOrganization', formatter: 'number' },
          { name: 'Without Organization', key: 'withoutOrganization', formatter: 'number' }
        ];
        
        // Initialize saved views for People module (canonical system views)
        const currentUserId = authStore.user?._id;
        const systemViews = [
          {
            id: 'all',
            label: 'All People',
            filters: {}
          },
          {
            id: 'my-people',
            label: 'My People',
            filters: {
              assignedTo: currentUserId
            }
          },
          {
            id: 'unassigned',
            label: 'Unassigned',
            filters: {
              assignedTo: null
            }
          }
        ];
        
        // Load custom saved views from localStorage
        const customViewsStorageKey = `litedesk-listview-${props.moduleKey}-saved-views`;
        let customViews = [];
        try {
          const saved = localStorage.getItem(customViewsStorageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            customViews = Array.isArray(parsed) ? parsed : [];
          }
        } catch (error) {
          console.warn('[ModuleList] Failed to load custom views:', error);
        }
        
        // Merge system views with custom views
        savedViews.value = [...systemViews, ...customViews];
        
        // Always default to "All People" view on initial load
        // Don't restore saved view from localStorage on mount - user can select it manually if needed
        activeSavedViewId.value = 'all';
        filters.value = {}; // Clear all filters to show all people
      } else {
        // For other modules, use statsConfig from definition or response
        statsConfig.value = definition?.statsConfig || [];
      }
      
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

// Fetch users for People filters
const fetchUsersForFilters = async () => {
  if (props.moduleKey !== 'people') return;
  
  try {
    const response = await apiClient.get('/users/list');
    if (response.success && Array.isArray(response.data)) {
      availableUsers.value = response.data;
    } else {
      availableUsers.value = [];
    }
  } catch (error) {
    console.error('[ModuleList] Error fetching users for filters:', error);
    availableUsers.value = [];
  }
};

// Fetch organizations for People filters
const fetchOrganizationsForFilters = async () => {
  if (props.moduleKey !== 'people') return;
  
  try {
    const response = await apiClient.get('/v2/organization', { params: { limit: 1000 } });
    if (response.success && Array.isArray(response.data)) {
      availableOrganizations.value = response.data;
    } else if (response.success && response.data?.data && Array.isArray(response.data.data)) {
      availableOrganizations.value = response.data.data;
    } else {
      availableOrganizations.value = [];
    }
  } catch (error) {
    console.error('[ModuleList] Error fetching organizations for filters:', error);
    availableOrganizations.value = [];
  }
};

// Helper to get user display name
const getUserDisplayName = (user) => {
  if (!user) return '';
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }
  if (user.email) return user.email;
  if (user.username) return user.username;
  return String(user._id || user.id || 'Unknown User');
};

// Build People-specific filters
const buildPeopleFilters = () => {
  const currentUserId = authStore.user?._id;
  const currentUserIdStr = currentUserId ? String(currentUserId) : null;
  
  // Get selected participation apps (from filter state)
  const selectedApps = filters.value.participationApp || [];
  const selectedAppsArray = Array.isArray(selectedApps) ? selectedApps : (selectedApps ? [selectedApps] : []);
  
  // 1. Assigned To (Identity-level)
  const assignedToOptions = [
    { value: 'me', label: 'Me' },
    { value: 'unassigned', label: 'Unassigned' }
  ];
  
  // Add all users
  availableUsers.value.forEach(user => {
    const userIdStr = String(user._id || user.id);
    if (currentUserIdStr && userIdStr !== currentUserIdStr) {
      assignedToOptions.push({
        value: userIdStr,
        label: getUserDisplayName(user)
      });
    }
  });
  
  // 2. Participation (Human-readable: App · Role)
  // Build options like "Sales · Lead", "Sales · Contact", "Helpdesk · Contact"
  const participationOptions = [];
  if (appRegistry.value) {
    for (const appKey of knownParticipationApps) {
      if (appRegistry.value[appKey]) {
        const appDisplayName = appDisplayNames[appKey] || appKey;
        
        // Get roles from state fields for this app
        const stateFields = getStateFields(appKey);
        const roles = [];
        
        for (const fieldKey of stateFields) {
          try {
            const metadata = getFieldMetadata(fieldKey);
            // For SALES, 'type' field gives Lead/Contact
            if (fieldKey === 'type' && appKey === 'SALES') {
              roles.push('Lead');
              roles.push('Contact');
            } else if (appKey === 'HELPDESK') {
              // Helpdesk typically has Contact role
              if (roles.length === 0) {
                roles.push('Contact');
              }
            }
          } catch (error) {
            // Field not in metadata - skip
          }
        }
        
        // If no roles found, add a default option for the app
        if (roles.length === 0) {
          participationOptions.push({
            value: `${appKey}:*`,
            label: appDisplayName
          });
        } else {
          // Add each role as a separate option
          roles.forEach(role => {
            participationOptions.push({
              value: `${appKey}:${role}`,
              label: `${appDisplayName} · ${role}`
            });
          });
        }
      }
    }
  }
  
  // 3. Do Not Contact (Compliance)
  const doNotContactOptions = [
    { value: 'allowed', label: 'Allowed' },
    { value: 'doNotContact', label: 'Do Not Contact' }
  ];
  
  // Build filter array
  const peopleFilters = [
    {
      key: 'assignedTo',
      label: 'Assigned To',
      options: assignedToOptions,
      fieldPath: 'assignedTo'
    },
    {
      key: 'participation',
      label: 'Type',
      options: participationOptions,
      fieldPath: 'participation'
    },
    {
      key: 'doNotContact',
      label: 'Do Not Contact',
      options: doNotContactOptions,
      fieldPath: 'doNotContact'
    }
  ];
  
  // Filter out hidden filters
  return peopleFilters.filter(f => !f.hidden);
};

// Adapt filters from definition to ListView format
const adaptedFilters = computed(() => {
  // For People module, build custom filters
  if (props.moduleKey === 'people') {
    return buildPeopleFilters();
  }
  
  // For other modules, use filters from definition
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

// Compute identity-based statistics for People module
const computePeopleStatistics = (peopleData) => {
  if (!peopleData || !Array.isArray(peopleData)) {
    statistics.value = {
      totalPeople: 0,
      assignedToMe: 0,
      unassigned: 0,
      withOrganization: 0,
      withoutOrganization: 0
    };
    return;
  }
  
  const currentUserId = authStore.user?._id;
  const currentUserIdStr = currentUserId ? String(currentUserId) : null;
  
  // Compute stats from current page data (identity fields only)
  let assignedToMe = 0;
  let unassigned = 0;
  let withOrganization = 0;
  let withoutOrganization = 0;
  
  peopleData.forEach(person => {
    // Check assignedTo (identity field)
    const assignedTo = person.assignedTo;
    if (assignedTo) {
      // Handle both object (populated) and string (ID) formats
      const assignedToId = typeof assignedTo === 'object' 
        ? (assignedTo._id || assignedTo.id || null)
        : assignedTo;
      
      if (currentUserIdStr && assignedToId && String(assignedToId) === currentUserIdStr) {
        assignedToMe++;
      }
    } else {
      unassigned++;
    }
    
    // Check organization (identity field)
    const organization = person.organization;
    if (organization) {
      // Handle both object (populated) and string (ID) formats
      if (typeof organization === 'object') {
        // Check if object has meaningful data (not just _id)
        if (organization.name || organization._id || organization.id) {
          withOrganization++;
        } else {
          withoutOrganization++;
        }
      } else if (organization !== '' && organization !== null && organization !== undefined) {
        withOrganization++;
      } else {
        withoutOrganization++;
      }
    } else {
      withoutOrganization++;
    }
  });
  
  // Use totalRecords from pagination for total (represents full dataset, not just current page)
  const totalPeople = pagination.value.totalRecords || peopleData.length;
  
  statistics.value = {
    totalPeople,
    assignedToMe,
    unassigned,
    withOrganization,
    withoutOrganization
  };
};

// Determine when to show full-page empty state based on definition type
// NO_DATA empty states should be shown inside the table (handled by ListView/TableView)
// Only show full-page empty state for configuration/access issues
const shouldShowEmptyState = computed(() => {
  if (!listDefinition.value?.emptyState) {
    return false;
  }

  const emptyState = listDefinition.value.emptyState;
  const emptyStateType = emptyState.type;

  // NO_ACCESS or NOT_CONFIGURED: Always show full-page (regardless of data)
  if (emptyStateType === EmptyStateType.NO_ACCESS || emptyStateType === EmptyStateType.NOT_CONFIGURED) {
    return true;
  }

  // NO_DATA: Don't show full-page - let ListView/TableView handle it inside the table
  if (emptyStateType === EmptyStateType.NO_DATA) {
    return false;
  }

  // DISABLED or FIRST_TIME: Show full-page always
  if (emptyStateType === EmptyStateType.DISABLED || emptyStateType === EmptyStateType.FIRST_TIME) {
    return true;
  }

  // Default: Don't show
  return false;
});

// Fetch data from API
const fetchData = async (skipAutoSwitch = false) => {
  if (!listDefinition.value) return;
  
  dataLoading.value = true;
  try {
    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.limit,
      sortBy: sortField.value || 'createdAt',
      // Default to 'desc' (newest first) if no sort field is set
      // This ensures new records appear on page 1 by default
      sortOrder: sortField.value ? (sortOrder.value || 'desc') : 'desc'
    };

    // Map People filters to API params
    if (props.moduleKey === 'people') {
      // Assigned To filter
      // Handle both string values ('me', 'unassigned'), null, and user IDs
      const assignedToValue = filters.value.assignedTo;
      if (assignedToValue !== undefined && assignedToValue !== '') {
        if (assignedToValue === 'me') {
          params.assignedTo = authStore.user?._id || null;
        } else if (assignedToValue === 'unassigned' || assignedToValue === null) {
          // Explicitly filtering for unassigned - send null to backend
          // Handle both string 'unassigned' and null from saved views
          params.assignedTo = null;
        } else {
          // It's a user ID (from saved view or manual selection)
          params.assignedTo = assignedToValue;
        }
      }
      // If assignedTo is undefined or empty string, don't include it in params
      // This ensures we fetch all people when only participation filter is active
      
      // Organization filter (for "Without Organization" saved view)
      if (filters.value.organization !== undefined) {
        if (filters.value.organization === null || filters.value.organization === '') {
          params.organization = null;
        } else if (filters.value.organization === 'has') {
          // Has organization - backend will filter for non-null
          params.organization = 'has';
        } else {
          params.organization = filters.value.organization;
        }
      }
      
      // Participation App filter is NOT sent to backend
      // It will be applied client-side after data is fetched using participatesInApp()
      // This is because participation is derived from state fields, not a direct field
      
      // Participation Role filter (only if participationApp is selected)
      // Note: This is applied client-side along with participationApp filter
      // We don't send it to backend to avoid backend filtering issues
      // if (filters.value.participationRole && filters.value.participationApp) {
      //   params.type = filters.value.participationRole; // Backend uses 'type' for Lead/Contact
      // }
      
      // Do Not Contact filter
      if (filters.value.doNotContact) {
        if (filters.value.doNotContact === 'doNotContact') {
          params.doNotContact = true;
        } else if (filters.value.doNotContact === 'allowed') {
          params.doNotContact = false;
        }
      }
    } else {
      // For other modules, pass filters as-is
      Object.assign(params, filters.value);
    }

    // Pass appKey as query parameter for backend filtering
    // For People module, always use PLATFORM appKey to fetch ALL people (identity + participation)
    // Participation filtering happens client-side using state fields
    // This ensures we get all people records regardless of participation status
    if (props.moduleKey === 'people') {
      // Always use PLATFORM for People list to see all identities
      // Client-side filters (participation, assignedTo, etc.) handle filtering
      params.appKey = 'PLATFORM';
    } else if (props.appKey) {
      params.appKey = props.appKey;
    }

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    // Clean up params - remove null/undefined/empty values (except when explicitly needed)
    // assignedTo: null is valid when filtering for 'unassigned' or null (from saved views)
    // Only remove if it's not explicitly set in filters
    if (params.assignedTo === null && filters.value.assignedTo === undefined) {
      delete params.assignedTo;
    }
    
    // Remove other null/undefined/empty filter params
    if (params.organization === null && filters.value.organization !== null && filters.value.organization !== undefined) {
      // Only keep organization: null if it was explicitly set in filters
      // If filters.value.organization is undefined, don't send the param
      if (filters.value.organization === undefined) {
        delete params.organization;
      }
    }
    
    // Use moduleKey to determine API endpoint
    const endpoint = `/${props.moduleKey}`;
    
    // Debug: Log params being sent to API
    if (props.moduleKey === 'people') {
      console.log('[ModuleList] API request params:', JSON.stringify(params, null, 2));
      console.log('[ModuleList] Filters state:', JSON.stringify(filters.value, null, 2));
    }
    
    const response = await apiClient.get(endpoint, { params });
    
    // Debug: Log API response
    if (props.moduleKey === 'people') {
      console.log('[ModuleList] API response:', {
        success: response.success,
        dataLength: response.data?.length || 0,
        pagination: response.pagination,
        sampleData: response.data?.[0] ? {
          _id: response.data[0]._id,
          name: (response.data[0].first_name || '') + ' ' + (response.data[0].last_name || ''),
          type: response.data[0].type,
          lead_status: response.data[0].lead_status,
          contact_status: response.data[0].contact_status
        } : null
      });
    }

      if (response.success) {
      let fetchedData = response.data || [];
      
      // For People module: If we have 0 results and are filtering by "unassigned",
      // automatically switch to "All People" view to show all people instead of empty list
      // Only do this once per fetch cycle to prevent infinite loops
      if (!skipAutoSwitch && props.moduleKey === 'people' && fetchedData.length === 0 && filters.value.assignedTo === 'unassigned' && activeSavedViewId.value === 'unassigned') {
        console.log('[ModuleList] No unassigned people found, switching to "All People" view');
        activeSavedViewId.value = 'all';
        filters.value = {};
        // Re-fetch with cleared filters (skip auto-switch to prevent recursion)
        await fetchData(true);
        return;
      }
      
      // Apply participation filtering client-side (People module only)
      // Participation filter format: "SALES:Lead", "SALES:Contact", "HELPDESK:Contact", etc.
      // Or "SALES:*" for any participation in an app
      if (props.moduleKey === 'people' && filters.value.participation) {
        const participationValue = filters.value.participation;
        const participationValues = Array.isArray(participationValue) 
          ? participationValue 
          : [participationValue];
        
        if (participationValues.length > 0) {
          // Parse participation filters: "APPKEY:ROLE" or "APPKEY:*"
          const participationFilters = participationValues.map(val => {
            const [appKey, role] = String(val).split(':');
            return { appKey, role: role || '*' };
          });
          
          // Filter data to only include people matching the participation filter
          fetchedData = fetchedData.filter(person => {
            return participationFilters.some(filter => {
              const { appKey, role } = filter;
              
              // First check if person participates in the app
              const participatesInAppKey = participatesInApp(person, appKey);
              if (!participatesInAppKey) {
                return false;
              }
              
              // If role is "*", match any participation in the app
              if (role === '*') {
                return true;
              }
              
              // For specific roles, check the type field
              // For SALES: Lead/Contact maps to 'type' field
              if (appKey === 'SALES' && (role === 'Lead' || role === 'Contact')) {
                return person.type === role;
              }
              
              // For other apps/roles, default to matching participation
              return true;
            });
          });
        }
      }
      
      data.value = fetchedData;
      if (response.pagination) {
        pagination.value = {
          currentPage: response.pagination.currentPage || pagination.value.currentPage,
          totalPages: response.pagination.totalPages || 1,
          // For participation-filtered results, update totalRecords to reflect filtered count
          // But preserve original total for stats calculation
          totalRecords: props.moduleKey === 'people' && filters.value.participationApp 
            ? fetchedData.length 
            : (response.pagination.totalRecords || response.pagination[`total${props.moduleKey.charAt(0).toUpperCase() + props.moduleKey.slice(1)}`] || 0),
          limit: pagination.value.limit
        };
      }
      
      // For People module, always compute identity-based statistics from fetched data
      // (ignore API-provided statistics which may be participation-based)
      if (props.moduleKey === 'people') {
        // Compute identity-based statistics from fetched data for People module
        // Use nextTick to ensure pagination is updated first
        await nextTick();
        computePeopleStatistics(data.value);
      } else if (response.statistics) {
        // For other modules, use API-provided statistics if available
        statistics.value = response.statistics;
      }
    } else {
      data.value = [];
      // Reset statistics on error
      if (props.moduleKey === 'people') {
        statistics.value = {
          totalPeople: 0,
          assignedToMe: 0,
          unassigned: 0,
          withOrganization: 0,
          withoutOrganization: 0
        };
      }
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

// Helper function to check if filters match a saved view (with normalization)
// Shared between handleFiltersUpdate and handleStatClick
const filtersMatchView = (currentFilters, viewFilters, currentUserId) => {
  // Get filter keys for both - include null values as they are valid filter values
  const viewFilterKeys = Object.keys(viewFilters).filter(k => {
    const v = viewFilters[k];
    return v !== undefined && v !== '';
  });
  const currentFilterKeys = Object.keys(currentFilters).filter(k => {
    const v = currentFilters[k];
    return v !== undefined && v !== '';
  });
  
  // Must have same number of filters
  if (viewFilterKeys.length !== currentFilterKeys.length) {
    return false;
  }
  
  // Must have the same filter keys
  const viewKeysSet = new Set(viewFilterKeys);
  const currentKeysSet = new Set(currentFilterKeys);
  if (viewKeysSet.size !== currentKeysSet.size) {
    return false;
  }
  // Check that all keys match
  for (const key of viewKeysSet) {
    if (!currentKeysSet.has(key)) {
      return false;
    }
  }
  
  // Check if all filter values match (with normalization for assignedTo)
  return viewFilterKeys.every(key => {
    const viewValue = viewFilters[key];
    const currentValue = currentFilters[key];
    
    // Normalize assignedTo for comparison
    // 'me' should match currentUserId
    // 'unassigned' should match null
    if (key === 'assignedTo') {
      // Normalize 'me' to currentUserId for comparison
      if (currentValue === 'me' && viewValue === currentUserId) {
        return true;
      }
      // Normalize 'unassigned' to null for comparison
      if (currentValue === 'unassigned' && viewValue === null) {
        return true;
      }
      // Normalize currentUserId to 'me' for comparison (reverse)
      if (currentValue === currentUserId && viewValue === 'me') {
        return true;
      }
      // Normalize null to 'unassigned' for comparison (reverse)
      if (currentValue === null && viewValue === 'unassigned') {
        return true;
      }
    }
    
    // Handle null comparison - null is a valid filter value
    if (viewValue === null) {
      return currentValue === null;
    }
    if (currentValue === null) {
      return viewValue === null;
    }
    
    // String comparison for non-null values
    return String(viewValue) === String(currentValue);
  });
};

const handleFiltersUpdate = (newFilters) => {
  // Clean up old participation filter keys if they exist (migration from old format)
  if (props.moduleKey === 'people') {
    // Remove old participationApp and participationRole filters if new participation filter exists
    if (newFilters.participation) {
      delete newFilters.participationApp;
      delete newFilters.participationRole;
    }
  }
  
  filters.value = newFilters;
  pagination.value.currentPage = 1;
  
  // Handle saved view state for People module
  if (props.moduleKey === 'people') {
    const currentUserId = authStore.user?._id;
    
    // Check if filters are empty (all cleared)
    // Include null values - they are valid filter values (e.g., organization: null)
    const hasAnyFilters = Object.keys(newFilters).some(key => {
      const value = newFilters[key];
      return value !== undefined && value !== '';
    });
    
    if (!hasAnyFilters) {
      // Filters cleared - return to "All People" view
      activeSavedViewId.value = 'all';
    } else {
      // Check if current filters match any saved view
      // First check the active view, then check all views
      let matchedView = null;
      
      if (activeSavedViewId.value) {
        const activeView = savedViews.value.find(v => v.id === activeSavedViewId.value);
        if (activeView && filtersMatchView(newFilters, activeView.filters, currentUserId)) {
          matchedView = activeView;
        }
      }
      
      // If active view doesn't match, check all views
      if (!matchedView) {
        matchedView = savedViews.value.find(view => filtersMatchView(newFilters, view.filters, currentUserId));
      }
      
      if (matchedView) {
        activeSavedViewId.value = matchedView.id;
      } else {
        activeSavedViewId.value = null;
      }
    }
  }
  
  fetchData();
};

// Handle stat click - apply derived filters for People module
const handleStatClick = (statItem) => {
  if (props.moduleKey !== 'people') return;
  
  const currentUserId = authStore.user?._id;
  const newFilters = {};
  
  // Map stat key to filter
  switch (statItem.key) {
    case 'totalPeople':
      // Clear all filters - show all people
      break; // newFilters stays empty
      
    case 'assignedToMe':
      // Filter: assignedTo = currentUser
      // Use 'me' string so it matches the filter dropdown option
      newFilters.assignedTo = 'me';
      break;
      
    case 'unassigned':
      // Filter: assignedTo = null (unassigned)
      newFilters.assignedTo = 'unassigned';
      break;
      
    case 'withOrganization':
      // Filter: organization != null
      newFilters.organization = 'has';
      break;
      
    case 'withoutOrganization':
      // Filter: organization = null
      newFilters.organization = null;
      break;
  }
  
  // Use handleFiltersUpdate to properly sync filters with ListView
  // This ensures ListView's internal filters reactive object is updated
  // and hasFiltersApplied correctly detects the filters for the title
  handleFiltersUpdate(newFilters);
};

// Handle saved views updated (custom views changed)
const handleSavedViewsUpdated = (customViews) => {
  if (props.moduleKey !== 'people') return;
  
  // Rebuild savedViews with system views + custom views
  const currentUserId = authStore.user?._id;
  const systemViews = [
    {
      id: 'all',
      label: 'All People',
      filters: {}
    },
    {
      id: 'my-people',
      label: 'My People',
      filters: {
        assignedTo: currentUserId
      }
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      filters: {
        assignedTo: null
      }
    }
  ];
  
  savedViews.value = [...systemViews, ...customViews];
};

// Handle saved view selection
const handleSavedViewSelected = (view) => {
  if (props.moduleKey !== 'people') return;
  
  // Set active saved view (will be persisted via watch)
  activeSavedViewId.value = view?.id || null;
  
  if (!view) {
    // Clear view selection
    filters.value = {};
    pagination.value.currentPage = 1;
    fetchData();
    return;
  }
  
  // Apply view filters (only identity-based filters)
  const viewFilters = view.filters ? { ...view.filters } : {};
  const currentUserId = authStore.user?._id;
  
  // Normalize assignedTo values to match filter dropdown options
  if (viewFilters.assignedTo === currentUserId) {
    viewFilters.assignedTo = 'me';
  } else if (viewFilters.assignedTo === null || viewFilters.assignedTo === undefined) {
    viewFilters.assignedTo = 'unassigned';
  }
  
  // Clear existing filters first
  filters.value = {};
  
  // Apply saved view filters
  Object.keys(viewFilters).forEach(key => {
    filters.value[key] = viewFilters[key];
  });
  
  // If view has config (columns, sort, search), apply it
  // This will be handled by ListView via emit('update:sort') etc.
  // For now, just apply filters
  
  // Reset to first page
  pagination.value.currentPage = 1;
  
  // Trigger fetch with new filters
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

// Persist active saved view to localStorage (People module only)
watch(() => activeSavedViewId.value, (newValue) => {
  if (props.moduleKey === 'people') {
    const savedViewStorageKey = `litedesk-listview-${props.moduleKey}-active-view`;
    if (newValue) {
      localStorage.setItem(savedViewStorageKey, newValue);
    } else {
      localStorage.removeItem(savedViewStorageKey);
    }
  }
});

// Build on mount
onMounted(() => {
  if (authStore.user && authStore.isAuthenticated) {
    buildList();
  }
});
</script>

