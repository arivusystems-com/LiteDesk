<template>
  <div v-if="loading" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
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
      :view-mode="viewMode"
      :create-label="getCreateLabel()"
      :search-placeholder="`Search ${listDefinition.title.toLowerCase()}...`"
      :data="data"
      :columns="adaptedColumns"
      :loading="dataLoading"
      :statistics="statistics"
      :stats-config="statsConfig"
      :saved-views="savedViews"
      :active-saved-view-id="activeSavedViewId"
      :default-view-id="defaultViewId"
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
      @set-default-view="handleSetDefaultView"
      @saved-views-updated="handleSavedViewsUpdated"
      @stat-click="handleStatClick"
      @filter-opened="handleFilterOpened"
      @fetch="fetchData"
      @row-click="handleRowClick"
      @edit="handleEdit"
      @delete="handleDelete"
      @bulk-action="handleBulkAction"
      @kanban-settings-changed="$emit('kanban-settings-changed')"
      @stats-visibility-changed="(val) => $emit('stats-visibility-changed', val)"
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
import { ref, computed, watch, nextTick, useAttrs } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authRegistry';
import { useTabs } from '@/composables/useTabs';
import { buildModuleListFromRegistry } from '@/utils/buildModuleListFromRegistry';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';
import { EmptyStateType } from '@/types/empty-state.types';
import ListView from '@/components/common/ListView.vue';
import apiClient from '@/utils/apiClient';
import { getStateFields, getFieldMetadata, getParticipationFields } from '@/platform/fields/peopleFieldModel';
import { getParticipation } from '@/utils/getParticipation';
import { isPeopleSalesRoleFieldKey } from '@/utils/peopleParticipationUi';
import { getModuleListConfig, hasModuleListConfig, getSystemViews } from '@/platform/modules/moduleListRegistry';
import { getFiltersForModule } from '@/platform/filters/filterResolver';

/**
 * Check if a person participates in an app.
 * For SALES: use getParticipation abstraction (never person.type).
 * For other apps: use state fields from metadata.
 */
function participatesInApp(person, appKey) {
  if (!person || !appKey) return false;
  const key = String(appKey).toUpperCase();
  if (key === 'SALES' || key === 'HELPDESK') {
    return getParticipation(person, key) != null;
  }
  const stateFields = getStateFields(appKey);
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
  },
  /** When provided (e.g. 'list' | 'kanban'), ListView shows "Customize List" vs "Customize Kanban" and the appropriate drawer */
  viewMode: {
    type: String,
    default: null
  },
  /** People page context: 'ALL' = no filter; otherwise filter getParticipation(person, context) != null */
  peopleContext: {
    type: String,
    default: 'ALL',
    validator: (v) => !v || v === 'ALL' || v === 'SALES' || v === 'HELPDESK'
  }
});

const emit = defineEmits(['create', 'import', 'export', 'row-click', 'edit', 'delete', 'bulk-action', 'filters-changed', 'search-changed', 'kanban-settings-changed', 'stats-visibility-changed']);

const route = useRoute();
const router = useRouter();
const attrs = useAttrs();
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

/** People list: API/registry use sales_type; legacy layouts may still reference type */
const normalizePeopleListSortField = (key) => {
  if (props.moduleKey !== 'people' || key == null || key === '') return key;
  return String(key).trim() === 'type' ? 'sales_type' : key;
};

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  limit: 25
});
const filters = ref({});
const searchQuery = ref('');

const coerceFilterValuesToArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (value == null || value === '') return [];
  return [String(value).trim()].filter(Boolean);
};

const includesRoleMatch = (filterValues, roleValue) => {
  if (!filterValues.length) return true;
  const normalizedRole = String(roleValue || '').trim().toLowerCase();
  return filterValues.some((candidate) => String(candidate).trim().toLowerCase() === normalizedRole);
};

const isPeopleRoleFilterKey = (key) => {
  const normalized = String(key || '').trim();
  return normalized === 'type' || normalized === 'sales_type' || normalized === 'helpdesk_role';
};

// Saved Views for People module
const savedViews = ref([]);
const defaultViewId = ref(null);
const activeSavedViewId = ref(null);

// Schema-driven filter data
const moduleFieldDefinitions = ref([]);
const availableUsers = ref([]);
const availableUsersLoading = ref(false);
const availableOrganizations = ref([]);
const availableOrganizationsLoading = ref(false);
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
    
    // Fetch field definitions for schema-driven filters
    await fetchModuleFieldDefinitions();
    
    // Create permission snapshot
    const snapshot = createPermissionSnapshot(authStore.user);

    // Build list definition
    const definition = buildModuleListFromRegistry(
      props.moduleKey,
      props.appKey,
      registry,
      snapshot
    );

    if (authStore.user && authStore.isAuthenticated) {
      listDefinition.value = definition;
      
      // Initialize sort from definition
      if (definition?.defaultSort) {
        sortField.value = normalizePeopleListSortField(definition.defaultSort.column);
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
      
      // Initialize module-specific configuration from registry
      const moduleConfig = getModuleListConfig(props.moduleKey);
      const currentUserId = authStore.user?._id;
      const moduleLabel = listDefinition.value?.title || props.moduleKey.charAt(0).toUpperCase() + props.moduleKey.slice(1);
      
      // Get system views (from registry or generate defaults)
      const systemViews = getSystemViews(props.moduleKey, moduleLabel, currentUserId);
      
      // Convert system views to saved views format (with label instead of name)
      const systemViewsFormatted = systemViews.map(view => ({
        id: view.id,
        label: view.name,
        filters: view.filters
      }));
      
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
      savedViews.value = [...systemViewsFormatted, ...customViews];
      
      // Initialize stats config from registry if available
      if (moduleConfig?.statistics) {
        statsConfig.value = moduleConfig.statistics.stats;
      }
      
      // Find default view or first view
      const defaultView = systemViews.find(v => v.isDefault) || systemViews[0];
      if (defaultView) {
        // Priority: last active view (if user switched before reload) > user's default (first visit) > "All"
        const defaultViewStorageKey = `litedesk-listview-${props.moduleKey}-default-view`;
        const savedViewStorageKey = `litedesk-listview-${props.moduleKey}-active-view`;
        try {
          const userDefaultViewId = localStorage.getItem(defaultViewStorageKey);
          defaultViewId.value = userDefaultViewId || null;
          const savedActiveViewId = localStorage.getItem(savedViewStorageKey);
          const viewToLoad = (savedActiveViewId && savedViews.value.find(v => v.id === savedActiveViewId))
            ? savedActiveViewId
            : (userDefaultViewId && savedViews.value.find(v => v.id === userDefaultViewId))
              ? userDefaultViewId
              : defaultView.id;
          activeSavedViewId.value = viewToLoad;
          const savedView = savedViews.value.find(v => v.id === viewToLoad);
          if (savedView && savedView.filters) {
            const viewFilters = { ...savedView.filters };
            if (moduleConfig?.normalizeViewFilters) {
              const normalized = moduleConfig.normalizeViewFilters(viewFilters, currentUserId);
              filters.value = normalized;
            } else {
              filters.value = viewFilters;
            }
          } else {
            filters.value = {};
          }
        } catch (error) {
          console.warn('[ModuleList] Failed to load saved view:', error);
          activeSavedViewId.value = defaultView.id;
          filters.value = {};
        }
      }
      
      if (!moduleConfig) {
        // For other modules, use statsConfig from definition or response
        statsConfig.value = definition?.statsConfig || [];
      }

      // Show the list shell immediately once definition is available.
      // Data fetch runs in the background, keeping the perceived load faster.
      loading.value = false;

      if (definition && definition.emptyState?.type !== 'NOT_CONFIGURED') {
        fetchData().catch((error) => {
          console.error('[ModuleList] Initial data fetch failed:', error);
        });
      }

      return;
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

// Fetch module field definitions for schema-driven filters
const fetchModuleFieldDefinitions = async () => {
  try {
    const response = await apiClient.get(`/modules?key=${props.moduleKey}`);
    if (response.success && Array.isArray(response.data) && response.data.length > 0) {
      const module = response.data[0];
      let fields = module.fields || [];
      
      // Initialize filter metadata for People module fields if missing
      if (props.moduleKey === 'people') {
        const peopleFilterMetadata = {
          'assignedTo': {
            filterable: true,
            filterType: 'user',
            filterPriority: 1
          },
          'assigned_to': { // Also check for snake_case variant
            filterable: true,
            filterType: 'user',
            filterPriority: 1
          },
          'sales_type': {
            filterable: true,
            filterType: 'multi-select',
            filterPriority: 2
          },
          'helpdesk_role': {
            filterable: true,
            filterType: 'multi-select',
            filterPriority: 2
          },
          'do_not_contact': {
            filterable: true,
            filterType: 'boolean',
            filterPriority: 3
          },
          'doNotContact': { // Also check for camelCase variant
            filterable: true,
            filterType: 'boolean',
            filterPriority: 3
          },
          'organization': {
            filterable: true,
            filterType: 'entity',
            filterPriority: 4
          }
        };

        fields = fields.map((field) => {
          if (field.key && peopleFilterMetadata[field.key]) {
            const filterMeta = peopleFilterMetadata[field.key];
            return {
              ...field,
              filterable: filterMeta.filterable,
              filterType: field.filterType || filterMeta.filterType,
              filterPriority: field.filterPriority ?? filterMeta.filterPriority,
            };
          }
          if (field.filterable === undefined) {
            return { ...field, filterable: false };
          }
          return field;
        });
      }
      
      // Initialize filter metadata for Organizations module fields if missing
      if (props.moduleKey === 'organizations') {
        const organizationFilterMetadata = {
          'assignedTo': {
            filterable: true,
            filterType: 'user',
            filterPriority: 1
          },
          'assigned_to': { // Also check for snake_case variant
            filterable: true,
            filterType: 'user',
            filterPriority: 1
          },
          'isActive': {
            filterable: true,
            filterType: 'boolean',
            filterPriority: 2
          },
          'types': {
            filterable: true,
            filterType: 'multi-select',
            filterPriority: 3
          }
        };

        fields = fields.map((field) => {
          if (field.key && organizationFilterMetadata[field.key]) {
            const filterMeta = organizationFilterMetadata[field.key];
            return {
              ...field,
              filterable: filterMeta.filterable,
              filterType: field.filterType || filterMeta.filterType,
              filterPriority: field.filterPriority ?? filterMeta.filterPriority,
            };
          }
          if (field.filterable === undefined) {
            return { ...field, filterable: false };
          }
          return field;
        });
      }
      
      // Initialize filter metadata for Tasks module fields if missing
      if (props.moduleKey === 'tasks') {
        const tasksFilterMetadata = {
          'assignedTo': {
            filterable: true,
            filterType: 'user',
            filterPriority: 1
          },
          'assigned_to': { // Also check for snake_case variant
            filterable: true,
            filterType: 'user',
            filterPriority: 1
          },
          'status': {
            filterable: true,
            filterType: 'select',
            filterPriority: 2
          },
          'dueDate': {
            filterable: true,
            filterType: 'date',
            filterPriority: 3
          },
          'due_date': { // Also check for snake_case variant
            filterable: true,
            filterType: 'date',
            filterPriority: 3
          }
        };

        fields = fields.map((field) => {
          if (field.key && tasksFilterMetadata[field.key]) {
            const filterMeta = tasksFilterMetadata[field.key];
            return {
              ...field,
              filterable: filterMeta.filterable,
              filterType: field.filterType || filterMeta.filterType,
              filterPriority: field.filterPriority ?? filterMeta.filterPriority,
            };
          }
          if (field.filterable === undefined) {
            return { ...field, filterable: false };
          }
          return field;
        });
      }
      
      moduleFieldDefinitions.value = fields;

      const filterableFields = moduleFieldDefinitions.value.filter((f) => f.filterable === true);
      if (
        filterableFields.length === 0 &&
        (props.moduleKey === 'people' || props.moduleKey === 'organizations' || props.moduleKey === 'tasks')
      ) {
        console.warn(`[ModuleList] No filterable fields for ${props.moduleKey}`);
      }
    } else {
      moduleFieldDefinitions.value = [];
      console.warn('[ModuleList] No module found or empty response');
    }
  } catch (error) {
    console.error('[ModuleList] Error fetching module field definitions:', error);
    moduleFieldDefinitions.value = [];
  }
};

// Fetch lookup data for filter types that need it (user, entity)
const fetchUsersForFilters = async () => {
  if (availableUsersLoading.value || (Array.isArray(availableUsers.value) && availableUsers.value.length > 0)) {
    return;
  }
  availableUsersLoading.value = true;
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
  } finally {
    availableUsersLoading.value = false;
  }
};

const fetchOrganizationsForFilters = async () => {
  if (availableOrganizationsLoading.value || (Array.isArray(availableOrganizations.value) && availableOrganizations.value.length > 0)) {
    return;
  }
  availableOrganizationsLoading.value = true;
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
  } finally {
    availableOrganizationsLoading.value = false;
  }
};

const handleFilterOpened = async (filterKey) => {
  if (!filterKey) return;
  const filter = adaptedFilters.value.find((f) => f.key === filterKey);
  if (!filter) return;
  if (filter.filterType === 'user') {
    await fetchUsersForFilters();
  }
  if (filter.filterType === 'entity' && props.moduleKey === 'people') {
    await fetchOrganizationsForFilters();
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

// Note: buildSchemaFilters logic moved to adaptedFilters computed property

// Adapt filters from schema-driven field definitions
const adaptedFilters = computed(() => {
  // Use schema-driven filters if field definitions are available
  if (moduleFieldDefinitions.value.length > 0) {
    try {
      const schemaFilters = getFiltersForModule(props.moduleKey, moduleFieldDefinitions.value);

      // Enrich filters with options based on filterType
      const enrichedSchemaFilters = schemaFilters.map(filter => {
        const enrichedFilter = { ...filter };
        
        // Ensure options array exists (even if empty)
        if (!enrichedFilter.options) {
          enrichedFilter.options = [];
        }
        
        // Add options for user filter type
        if (filter.filterType === 'user') {
          const currentUserId = authStore.user?._id;
          const currentUserIdStr = currentUserId ? String(currentUserId) : null;
          
          const userOptions = [
            { value: 'me', label: 'Me' },
            { value: 'unassigned', label: 'Unassigned' }
          ];
          
          // Add all users
          if (Array.isArray(availableUsers.value)) {
            availableUsers.value.forEach(user => {
              if (user) {
                const userIdStr = String(user._id || user.id);
                if (currentUserIdStr && userIdStr !== currentUserIdStr) {
                  userOptions.push({
                    value: userIdStr,
                    label: getUserDisplayName(user)
                  });
                }
              }
            });
          }
          
          enrichedFilter.options = userOptions;
        }
        
        // Add options for entity filter type (organization lookup)
        if (filter.filterType === 'entity' && filter.key === 'organization') {
          const entityOptions = [
            { value: 'has', label: 'Has Organization' },
            { value: '', label: 'No Organization' }
          ];
          
          // Add all organizations
          if (Array.isArray(availableOrganizations.value)) {
            availableOrganizations.value.forEach(org => {
              if (org) {
                entityOptions.push({
                  value: org._id || org.id,
                  label: org.name || 'Unnamed Organization'
                });
              }
            });
          }
          
          enrichedFilter.options = entityOptions;
        }
        
        // Add options for boolean filter type
        if (filter.filterType === 'boolean') {
          if (filter.key === 'do_not_contact' || filter.key === 'doNotContact') {
            enrichedFilter.options = [
              { value: 'allowed', label: 'Allowed' },
              { value: 'doNotContact', label: 'Do Not Contact' }
            ];
          } else {
            // Generic boolean options
            enrichedFilter.options = [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' }
            ];
          }
        }
        
        // For select/multi-select, options should come from field definition
        if ((filter.filterType === 'select' || filter.filterType === 'multi-select') && !enrichedFilter.options) {
          const fieldDef = moduleFieldDefinitions.value.find(f => f.key === filter.key);
          if (fieldDef?.options) {
            enrichedFilter.options = fieldDef.options;
          } else if ((isPeopleSalesRoleFieldKey(filter.key) || filter.key === 'helpdesk_role') && props.moduleKey === 'people') {
            // Special handling for People type / virtual role filters (participation)
            const participationOptions = [];
            if (appRegistry.value) {
              for (const appKey of knownParticipationApps) {
                if (appRegistry.value[appKey]) {
                  const appDisplayName = appDisplayNames[appKey] || appKey;
                  const stateFields = getStateFields(appKey);
                  const roles = [];
                  
                  for (const fieldKey of stateFields) {
                    try {
                      const metadata = getFieldMetadata(fieldKey);
                      if (isPeopleSalesRoleFieldKey(fieldKey) && appKey === 'SALES') {
                        roles.push('Lead');
                        roles.push('Contact');
                      } else if (appKey === 'HELPDESK' && roles.length === 0) {
                        roles.push('Contact');
                      }
                    } catch (error) {
                      // Field not in metadata - skip
                    }
                  }
                  
                  if (roles.length === 0) {
                    participationOptions.push({
                      value: `${appKey}:*`,
                      label: appDisplayName
                    });
                  } else {
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
            enrichedFilter.options = participationOptions;
          }
        }
        
        // People role filter labels/options should reflect the selected app tab context.
        if (props.moduleKey === 'people' && isPeopleRoleFilterKey(enrichedFilter.key)) {
          if (props.peopleContext === 'HELPDESK') {
            // In HELPDESK tab, show role choices from helpdesk_role field when available.
            const helpdeskFieldDef = moduleFieldDefinitions.value.find((f) => f.key === 'helpdesk_role');
            const fallbackOptions = [{ value: 'Contact', label: 'Contact' }];
            enrichedFilter.key = 'helpdesk_role';
            enrichedFilter.label = 'Type';
            enrichedFilter.options =
              Array.isArray(helpdeskFieldDef?.options) && helpdeskFieldDef.options.length
                ? helpdeskFieldDef.options
                : fallbackOptions;
          } else if (props.peopleContext === 'SALES') {
            // In SALES tab, normalize to sales_type semantics.
            const salesFieldDef = moduleFieldDefinitions.value.find((f) => f.key === 'sales_type' || f.key === 'type');
            const fallbackOptions = [
              { value: 'Lead', label: 'Lead' },
              { value: 'Contact', label: 'Contact' }
            ];
            enrichedFilter.key = 'sales_type';
            enrichedFilter.label = 'Type';
            enrichedFilter.options =
              Array.isArray(salesFieldDef?.options) && salesFieldDef.options.length
                ? salesFieldDef.options
                : fallbackOptions;
          } else {
            // All Apps: keep label as "Type" while preserving canonical keys.
            if (enrichedFilter.key !== 'helpdesk_role') {
              enrichedFilter.key = 'sales_type';
            }
            enrichedFilter.label = 'Type';
          }
        }

        // Ensure filter always has a label
        if (!enrichedFilter.label) {
          enrichedFilter.label = enrichedFilter.key || 'Unknown Filter';
        }
        
        return enrichedFilter;
      });

      // De-duplicate People role filters after key normalization (legacy `type` -> `sales_type`).
      if (props.moduleKey === 'people') {
        const deduped = [];
        const seenKeys = new Set();
        for (const filter of enrichedSchemaFilters) {
          const canonicalKey = String(filter?.key || '').trim();
          if (!canonicalKey) continue;
          if (seenKeys.has(canonicalKey)) continue;
          seenKeys.add(canonicalKey);
          deduped.push(filter);
        }
        return deduped;
      }

      return enrichedSchemaFilters;
    } catch (error) {
      console.warn('[ModuleList] Error building schema filters:', error);
      console.error('[ModuleList] Filter building error details:', error);
      return [];
    }
  }
  
  // Fallback: use filters from definition (for backward compatibility)
  if (!listDefinition.value?.filters) {
    return [];
  }
  
  return listDefinition.value.filters.map(filter => ({
    key: filter.key,
    label: filter.label,
    options: filter.options || [],
    fieldPath: filter.fieldPath,
    filterType: filter.filterType || 'select'
  }));
});

// Get create label from primary actions
const getCreateLabel = () => {
  const createAction = listDefinition.value?.primaryActions?.find(a => a.type === 'create');
  return createAction?.label || `New ${listDefinition.value?.title || 'Item'}`;
};

// Statistics computation is now handled by the registry

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
const fetchData = async () => {
  if (!listDefinition.value) return;
  
  dataLoading.value = true;
  try {
    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.limit,
      sortBy: normalizePeopleListSortField(sortField.value) || 'createdAt',
      // Default to 'desc' (newest first) if no sort field is set
      // This ensures new records appear on page 1 by default
      sortOrder: sortField.value ? (sortOrder.value || 'desc') : 'desc'
    };

    // Normalize filters using registry function if available
    const moduleConfig = getModuleListConfig(props.moduleKey);
    let normalizedFilters = { ...filters.value };
    
    if (moduleConfig?.normalizeFilters) {
      normalizedFilters = moduleConfig.normalizeFilters(normalizedFilters, authStore.user?._id);
    }
    
    // Copy normalized filters to params, excluding client-side only filters
    Object.keys(normalizedFilters).forEach(key => {
      // Skip participation filters (client-side only for People)
      if (key === 'participation' || key === 'participationApp' || key === 'participationRole') {
        return;
      }
      // People role filters are applied client-side (PLATFORM appKey intentionally bypasses role filters server-side)
      if (props.moduleKey === 'people' && (key === 'sales_type' || key === 'helpdesk_role' || key === 'type')) {
        return;
      }
      
      const value = normalizedFilters[key];
      // Only include defined, non-empty values (except null which is valid for unassigned)
      if (value !== undefined && value !== '') {
        params[key] = value;
      } else if (value === null) {
        // null is a valid filter value (e.g., assignedTo: null for unassigned)
        params[key] = null;
      }
    });

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

    if (searchQuery.value && searchQuery.value.trim()) {
      params.search = searchQuery.value.trim();
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
    
    // Use API endpoint from registry, or default to /{moduleKey}
    // Audit "Finding" currently maps to moduleKey=cases, but backend list data
    // is served by the tasks endpoint under AUDIT app context.
    const isAuditFindingModule =
      String(props.moduleKey || '').toLowerCase() === 'cases' &&
      String(props.appKey || '').toUpperCase() === 'AUDIT';
    const isHelpdeskCasesModule =
      String(props.moduleKey || '').toLowerCase() === 'cases' &&
      String(props.appKey || '').toUpperCase() === 'HELPDESK';
    const endpoint = isAuditFindingModule
      ? '/audit/findings'
      : isHelpdeskCasesModule
        ? '/helpdesk/cases'
      : moduleConfig?.apiEndpoint
        ? moduleConfig.apiEndpoint.startsWith('/')
          ? moduleConfig.apiEndpoint
          : `/${moduleConfig.apiEndpoint}`
        : `/${props.moduleKey}`;
    
    const response = await apiClient.get(endpoint, { params });

    if (response.success) {
      let fetchedData = response.data || [];

      // Audit Findings currently source rows from task-shaped records.
      // Provide compatibility aliases expected by the "cases" module schema.
      if (isAuditFindingModule && Array.isArray(fetchedData)) {
        fetchedData = fetchedData.map((row) => {
          if (!row || typeof row !== 'object') return row;
          return {
            ...row,
            subject: row.subject || row.title || '',
          };
        });
      }

      // Apply people context filter client-side (People module only)
      if (props.moduleKey === 'people' && props.peopleContext && props.peopleContext !== 'ALL') {
        const ctx = props.peopleContext;
        fetchedData = fetchedData.filter(person => getParticipation(person, ctx) != null);
      }

      // Apply People role filters client-side to support PLATFORM appKey listing.
      // Legacy `type` maps to the active app context (HELPDESK tab -> helpdesk_role, otherwise SALES role).
      if (props.moduleKey === 'people') {
        const salesTypeValues = coerceFilterValuesToArray(normalizedFilters.sales_type ?? normalizedFilters.type);
        const helpdeskRoleValues = coerceFilterValuesToArray(normalizedFilters.helpdesk_role);

        // If legacy "type" is used on HELPDESK tab, treat it as a HELPDESK role filter.
        const legacyTypeOnHelpdesk = props.peopleContext === 'HELPDESK' && helpdeskRoleValues.length === 0
          ? salesTypeValues
          : [];

        fetchedData = fetchedData.filter((person) => {
          const salesRole = getParticipation(person, 'SALES')?.role ?? '';
          const helpdeskRole = getParticipation(person, 'HELPDESK')?.role ?? '';

          const matchesSales = includesRoleMatch(salesTypeValues, salesRole);
          const matchesHelpdesk = includesRoleMatch(helpdeskRoleValues, helpdeskRole);
          const matchesLegacyHelpdesk = includesRoleMatch(legacyTypeOnHelpdesk, helpdeskRole);

          if (props.peopleContext === 'HELPDESK') {
            // In HELPDESK tab, prioritize helpdesk_role semantics for type filtering.
            return matchesHelpdesk && matchesLegacyHelpdesk;
          }
          if (props.peopleContext === 'SALES') {
            return matchesSales;
          }

          // ALL apps: require both filters when both are present.
          return matchesSales && matchesHelpdesk;
        });
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
              
              // For specific roles, use getParticipation abstraction
              // For SALES: Lead/Contact maps to role from participation
              if (appKey === 'SALES' && (role === 'Lead' || role === 'Contact')) {
                return getParticipation(person, appKey)?.role === role;
              }
              
              // For other apps/roles, default to matching participation
              return true;
            });
          });
        }
      }
      
      // Force reactivity by creating a new array reference
      // This ensures Vue detects the change even if the array contents are similar
      data.value = [...fetchedData];

      // Handle pagination from response (check both pagination and meta objects)
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
      } else if (response.meta) {
        // Fallback to meta object if pagination is not present
        pagination.value = {
          currentPage: response.meta.page || pagination.value.currentPage,
          totalPages: Math.ceil((response.meta.total || 0) / (response.meta.limit || pagination.value.limit)),
          totalRecords: response.meta.total || 0,
          limit: response.meta.limit || pagination.value.limit
        };
      }

      // Compute statistics using registry function if available
      if (moduleConfig?.statistics?.computeFunction) {
        await nextTick();
        const computedStats = moduleConfig.statistics.computeFunction(data.value, authStore.user?._id);
        statistics.value = computedStats;
      } else if (response.statistics) {
        // For other modules, use API-provided statistics if available
        statistics.value = response.statistics;
      }
    } else {
      // Response was not successful
      console.warn('[ModuleList] API response not successful:', {
        success: response.success,
        response: response
      });
      data.value = [];
      // Reset statistics on error using registry
      const moduleConfig = getModuleListConfig(props.moduleKey);
      if (moduleConfig?.statistics?.computeFunction) {
        statistics.value = moduleConfig.statistics.computeFunction([], authStore.user?._id);
      } else {
        statistics.value = {};
      }
    }
  } catch (error) {
    console.error('[ModuleList] Error fetching data:', error);
    data.value = [];
    
    // Reset statistics on error using registry
    const moduleConfig = getModuleListConfig(props.moduleKey);
    if (moduleConfig?.statistics?.computeFunction) {
      statistics.value = moduleConfig.statistics.computeFunction([], authStore.user?._id);
    } else {
      statistics.value = {};
    }
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
  const normalizedRoute = String(route || '').trim().toLowerCase();
  const isCreateRoute = /\/new\/?$/.test(normalizedRoute);
  if (isCreateRoute) {
    // Create flows should stay in the current tab so the drawer opens in-place.
    router.push(route);
    return;
  }
  openTab(route, {
    title: route.split('/').pop(),
    background: false,
    insertAdjacent: true
  });
};

// Handle events
const handleSearchQueryUpdate = (query) => {
  searchQuery.value = query;
  pagination.value.currentPage = 1;
  emit('search-changed', query);
  fetchData();
};

// Helper function to check if filters match a saved view (with normalization)
// Shared between handleFiltersUpdate and handleStatClick
const filtersMatchView = (currentFilters, viewFilters, currentUserId) => {
  // Get filter keys for both - include null and boolean values as they are valid filter values
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
    
    // Handle boolean comparison - boolean values should be compared directly
    if (typeof viewValue === 'boolean' || typeof currentValue === 'boolean') {
      return viewValue === currentValue;
    }
    
    // String comparison for non-null, non-boolean values
    return String(viewValue) === String(currentValue);
  });
};

const handleFiltersUpdate = async (newFilters) => {
  // Clean up old participation filter keys if they exist (migration from old format)
  if (props.moduleKey === 'people') {
    // Remove old participationApp and participationRole filters if new participation filter exists
    if (newFilters.participation) {
      delete newFilters.participationApp;
      delete newFilters.participationRole;
    }
  }
  
  // Create a new object to ensure reactivity
  filters.value = { ...newFilters };
  pagination.value.currentPage = 1;
  
  emit('filters-changed', filters.value);
  
  // Wait for next tick to ensure filters are properly set before checking saved views
  await nextTick();
  
  // Handle saved view state for all modules (registry config or default views)
  // All modules get default system views via getSystemViews, so always handle saved view state
  const moduleConfig = getModuleListConfig(props.moduleKey);
  const currentUserId = authStore.user?._id;
  
  // Only handle saved view state if module has system views (from registry or generated)
  if (savedViews.value.length > 0) {
    
    // Check if filters are empty (all cleared)
    // Include null values - they are valid filter values (e.g., organization: null)
    // Boolean true/false are also valid filter values
    const hasAnyFilters = Object.keys(newFilters).some(key => {
      const value = newFilters[key];
      return value !== undefined && value !== '';
    });
    
    if (!hasAnyFilters) {
      // Filters cleared - return to "All" view
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
  
  // Fetch data with updated filters
  fetchData();
};

// Handle stat click - apply derived filters
const handleStatClick = (statItem) => {
  const moduleConfig = getModuleListConfig(props.moduleKey);
  if (!moduleConfig) return;
  
  const currentUserId = authStore.user?._id;
  const newFilters = {};
  
  if (props.moduleKey === 'people') {
    // Map stat key to filter for People module
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
  } else if (props.moduleKey === 'organizations') {
    // Map stat key to filter for Organizations module
    switch (statItem.key) {
      case 'totalOrganizations':
        // Clear all filters - show all organizations
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
        
      case 'activeOrganizations':
        // Filter: isActive = true
        newFilters.isActive = true;
        break;
        
      case 'trialOrganizations':
        // Filter: subscription.status = 'trial' or subscription.tier = 'trial'
        newFilters.tier = 'trial';
        break;
    }
  } else if (props.moduleKey === 'tasks') {
    // Map stat key to filter for Tasks module
    switch (statItem.key) {
      case 'totalTasks':
        // Clear all filters - show all tasks
        break; // newFilters stays empty
        
      case 'assignedToMe':
        // Filter: assignedTo = currentUser
        // Use 'me' string so it matches the filter dropdown option
        newFilters.assignedTo = 'me';
        break;
        
      case 'completed':
        // Filter: status = 'completed'
        newFilters.status = 'completed';
        break;
        
      case 'overdue':
        // Filter: overdue = true (this will be handled by the API)
        newFilters.overdue = true;
        break;
    }
  } else if (props.moduleKey === 'items') {
    // Map stat key to filter for Items module
    switch (statItem.key) {
      case 'totalItems':
        // Clear all filters - show all items
        break; // newFilters stays empty
        
      case 'activeItems':
        // Filter: status = 'Active'
        newFilters.status = 'Active';
        break;
        
      case 'products':
        // Filter: item_type = 'Product'
        newFilters.item_type = 'Product';
        break;
        
      case 'services':
        // Filter: item_type = 'Service'
        newFilters.item_type = 'Service';
        break;
        
      case 'lowStock':
        // Filter: low_stock = true
        newFilters.low_stock = true;
        break;
        
      case 'outOfStock':
        // Filter: out_of_stock = true
        newFilters.out_of_stock = true;
        break;
    }
  } else if (props.moduleKey === 'events') {
    // Map stat key to filter for Events module
    // The API expects startDateTime and endDateTime as ISO date strings
    // It will build MongoDB queries: startDateTime.$gte and startDateTime.$lte
    switch (statItem.key) {
      case 'totalEvents':
        // Clear all filters - show all events
        break; // newFilters stays empty
        
      case 'upcoming':
        // Filter: startDateTime >= now
        // API will interpret startDateTime as $gte
        newFilters.startDateTime = new Date().toISOString();
        break;
        
      case 'past':
        // Filter: startDateTime < now
        // Note: API uses endDateTime for $lte on startDateTime field
        // For "past", we need events where startDateTime < now
        // We'll use a workaround: set endDateTime to now (but this gives $lte, not $lt)
        // Better approach: let the API handle this or use a different filter
        // For now, we'll skip this stat click or handle it client-side
        // TODO: Add API support for $lt operator or handle past events differently
        break;
        
      case 'myEvents':
        // Filter: eventOwnerId = currentUser
        // Use 'me' string so it matches the filter dropdown option
        newFilters.eventOwnerId = 'me';
        break;
        
      case 'today':
        // Filter: startDateTime is today
        // API will use startDateTime for $gte and endDateTime for $lte
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        newFilters.startDateTime = today.toISOString();
        newFilters.endDateTime = tomorrow.toISOString();
        break;
        
      case 'thisWeek':
        // Filter: startDateTime is this week
        const nowWeek = new Date();
        const startOfWeek = new Date(nowWeek);
        startOfWeek.setDate(nowWeek.getDate() - nowWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        newFilters.startDateTime = startOfWeek.toISOString();
        newFilters.endDateTime = endOfWeek.toISOString();
        break;
    }
  }
  
  // Use handleFiltersUpdate to properly sync filters with ListView
  // This ensures ListView's internal filters reactive object is updated
  // and hasFiltersApplied correctly detects the filters for the title
  handleFiltersUpdate(newFilters);
};

// Handle saved views updated (custom views changed)
const handleSavedViewsUpdated = (customViews) => {
  const moduleConfig = getModuleListConfig(props.moduleKey);
  if (!moduleConfig?.systemViews) return;
  
  // Rebuild savedViews with system views + custom views
  const systemViews = moduleConfig.systemViews.map(view => ({
    id: view.id,
    label: view.name,
    filters: view.filters
  }));
  
  savedViews.value = [...systemViews, ...customViews];
};

// Handle saved view selection
const handleSavedViewSelected = (view) => {
  const moduleConfig = getModuleListConfig(props.moduleKey);
  if (!moduleConfig) {
    return;
  }
  
  // Set active saved view (will be persisted via watch)
  activeSavedViewId.value = view?.id || null;
  
  if (!view) {
    // Clear view selection - use handleFiltersUpdate to ensure proper sync
    handleFiltersUpdate({});
    return;
  }
  
  // Apply view filters
  let viewFilters = view.filters ? { ...view.filters } : {};
  const currentUserId = authStore.user?._id;
  
  // Handle special date filters for events module (upcoming/past)
  if (props.moduleKey === 'events') {
    if (view.id === 'upcoming') {
      // Upcoming: startDateTime >= now
      viewFilters = { startDateTime: new Date().toISOString() };
    } else if (view.id === 'past') {
      // Past: startDateTime < now
      // API uses endDateTime to set startDateTime.$lte
      // Subtract 1 second to ensure we get events strictly before now
      const now = new Date();
      now.setSeconds(now.getSeconds() - 1);
      viewFilters = { endDateTime: now.toISOString() };
    } else if (viewFilters._special) {
      // Remove special marker if present
      delete viewFilters._special;
    }
  }
  
  // Normalize filters using registry function if available
  const normalizedFilters = moduleConfig.normalizeViewFilters
    ? moduleConfig.normalizeViewFilters(viewFilters, currentUserId)
    : viewFilters;
  
  // Use handleFiltersUpdate to properly sync filters with ListView and trigger fetch
  handleFiltersUpdate(normalizedFilters);
};

const handleSetDefaultView = (viewId) => {
  if (!viewId || !hasModuleListConfig(props.moduleKey)) return;
  const defaultViewStorageKey = `litedesk-listview-${props.moduleKey}-default-view`;
  try {
    localStorage.setItem(defaultViewStorageKey, viewId);
    defaultViewId.value = viewId;
  } catch (error) {
    console.warn('[ModuleList] Failed to save default view:', error);
  }
};

const handleSortUpdate = ({ sortField: key, sortOrder: order }) => {
  sortField.value = normalizePeopleListSortField(key);
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
    let route = viewAction.route.replace(':id', row._id);
    const mod = (props.moduleKey || '').toLowerCase();
    const ak = props.appKey && String(props.appKey).trim();
    if (ak && (mod === 'people' || mod === 'organizations')) {
      const sep = route.includes('?') ? '&' : '?';
      route = `${route}${sep}appKey=${encodeURIComponent(ak)}`;
    }
    openTab(route, {
      title: row.name || row.title || row.first_name || 'Detail',
      background: false,
      insertAdjacent: true
    });
  } else {
    emit('row-click', row);
  }
};

const handleEdit = (row) => {
  // For tasks, always emit 'edit' so parent can open the edit drawer
  if (props.moduleKey === 'tasks') {
    emit('edit', row);
    return;
  }
  const editAction = listDefinition.value?.rowActions?.find(a => a.type === 'edit');
  if (editAction?.route) {
    const route = editAction.route.replace(':id', row._id);
    openTab(route, {
      title: `Edit ${row.name || row.title || 'Item'}`,
      background: false,
      insertAdjacent: true
    });
  } else {
    emit('edit', row);
  }
};

const handleDelete = async (row) => {
  if (attrs.onDelete) {
    emit('delete', row);
    return;
  }

  const rowId = row?._id || row?.id || row;
  if (!rowId || !props.moduleKey) return;

  try {
    const isHelpdeskCasesModule =
      String(props.moduleKey || '').toLowerCase() === 'cases' &&
      String(props.appKey || '').toUpperCase() === 'HELPDESK';
    const deleteBase = isHelpdeskCasesModule ? '/helpdesk/cases' : `/${props.moduleKey}`;
    await apiClient.delete(`${deleteBase}/${rowId}`);
    await fetchData();
  } catch (error) {
    console.error(`[ModuleList] Failed to delete ${props.moduleKey} record:`, error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Delete failed';
    alert(errorMessage);
  }
};

const handleBulkAction = (action, rows) => {
  emit('bulk-action', action, rows);
};

// Only rebuild when login state or user identity changes — not on every reactive touch of authStore.user
watch(
  () => (authStore.isAuthenticated ? (authStore.user?._id ?? '') : ''),
  (userId) => {
    if (userId && authStore.user && authStore.isAuthenticated) {
      buildList();
    }
  },
  { immediate: true }
);

// Watch for moduleKey/appKey changes
watch(() => [props.moduleKey, props.appKey], () => {
  if (authStore.user && authStore.isAuthenticated) {
    buildList();
  }
});

// Persist active saved view to localStorage (modules with registry config)
watch(() => activeSavedViewId.value, (newValue) => {
  if (hasModuleListConfig(props.moduleKey)) {
    const savedViewStorageKey = `litedesk-listview-${props.moduleKey}-active-view`;
    if (newValue) {
      localStorage.setItem(savedViewStorageKey, newValue);
    } else {
      localStorage.removeItem(savedViewStorageKey);
    }
  }
});

// Initial build is handled by auth user watcher (immediate: true) — no duplicate buildList() on mount

// Expose methods and data for parent components
defineExpose({
  refresh: fetchData,
  filters: filters,
  searchQuery: searchQuery,
  getFilters: () => filters.value,
  getSearchQuery: () => searchQuery.value,
  getCurrentRows: () => (Array.isArray(data.value) ? data.value : [])
});
</script>

