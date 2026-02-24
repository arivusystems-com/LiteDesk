<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-transform ease-out duration-300"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform ease-in duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="show"
        @click.stop
        class="fixed right-0 w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden z-[9999] record-right-pane-drawer"
        :style="{
          top: 'var(--quickpreview-offset, 4rem)',
          height: 'calc(100vh - var(--quickpreview-offset, 4rem))'
        }"
      >
        <!-- Replicate RecordPageLayout mobile view: RecordRightPane (provider via provide()) -->
        <div v-if="!row" class="flex-1 flex items-center justify-center p-8">
          <div class="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        <div v-else class="flex-1 min-h-0 flex flex-col overflow-hidden">
          <TaskRecordPage
            v-if="moduleKey === 'tasks' && row"
            embed
            :task-id="row._id"
            class="flex-1 min-h-0 overflow-hidden"
            @close="$emit('close')"
          />
          <RecordRightPane
            v-else
            ref="recordRightPaneRef"
            class="flex-1 min-h-0"
            :title="moduleTitle"
            :record-id="row?._id"
            :show-header="true"
            :show-close-button="true"
            :tabs="fixedTabs"
            :default-tab="'summary'"
            :persistence-key="row?._id ? `quickpreview-${moduleKey}-${row._id}` : null"
            @close="$emit('close')"
            @active-tab-change="onActiveTabChange"
          >
            <template v-if="row" #tab-summary>
              <div class="record-right-pane__summary-content max-w-4xl mx-auto w-full px-6 pt-0 pb-6">
                <!-- Forms: empty state if not Active -->
                <template v-if="moduleKey === 'forms' && row?.status !== 'Active'">
                  <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div class="max-w-md mx-auto">
                      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DocumentTextIcon class="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Form Not Yet Active</h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        This form has not been used yet. Assign it via events to start collecting responses.
                      </p>
                    </div>
                  </div>
                </template>
                <!-- Other modules: GridStack dashboard -->
                <template v-else>
                  <div v-if="moduleDefinition" ref="gridStackContainer" class="grid-stack bg-gray-100/70 dark:bg-gray-900 sm:p-3 min-h-[200px]"></div>
                  <div v-else class="flex items-center justify-center py-12">
                    <div class="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                </template>
              </div>
            </template>

            <template v-if="row" #tab-details>
              <div class="px-6 py-6 space-y-6">
                <div>
                  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {{ getRecordDisplayName(row) || 'Untitled' }}
                  </h2>
                </div>
                
                <!-- Search Field -->
                <div class="relative mb-4">
                  <input
                    v-model="detailsSearch"
                    type="text"
                    placeholder="Search fields..."
                    class="block w-full rounded-md bg-white border border-gray-200 dark:bg-gray-700 dark:border-transparent px-3 py-1.5 pl-10 text-gray-900 dark:text-white text-sm outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 dark:focus:bg-gray-800 dark:outline-white/10 dark:focus:outline-indigo-500"
                  />
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <MagnifyingGlassIcon class="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <!-- Fields Grid using DynamicFormField -->
                <div class="space-y-4">
                  <div
                    v-for="fieldData in getFieldsWithDefinitions"
                    :key="fieldData.key"
                    class="flex items-start gap-3"
                  >
                    <!-- Special handling for createdBy field -->
                    <div v-if="fieldData.key?.toLowerCase() === 'createdby'" class="flex-1">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {{ fieldData.field.label || fieldData.field.key }}
                      </label>
                      <div class="flex items-center gap-2">
                        <template v-if="fieldData.value && typeof fieldData.value === 'object' && fieldData.value !== null && !Array.isArray(fieldData.value) && fieldData.value._id">
                          <div v-if="fieldData.value.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <img :src="fieldData.value.avatar" :alt="fieldData.value.name || 'User'" class="w-full h-full object-cover" />
                          </div>
                          <div v-else class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {{ getInitials(fieldData.value.name || fieldData.value.firstName + ' ' + fieldData.value.lastName || '?') }}
                          </div>
                          <span class="text-sm text-gray-900 dark:text-white">
                            {{ fieldData.value.name || `${fieldData.value.firstName || ''} ${fieldData.value.lastName || ''}`.trim() || fieldData.value.email || 'User' }}
                          </span>
                        </template>
                        <template v-else>
                          <span class="text-sm text-gray-400 dark:text-gray-500">-</span>
                        </template>
                      </div>
                    </div>
                    <!-- Regular field rendering -->
                    <div v-else class="flex-1">
                      <DynamicFormField 
                        :field="fieldData.field"
                        :value="fieldData.value"
                        @update:value="updateField(fieldData.key, $event)"
                        @blur="saveFieldOnBlur(fieldData.key)"
                        :errors="{}"
                        :dependency-state="fieldData.dependencyState"
                        :module-definition="moduleDefinition"
                        :all-module-definitions="allModuleDefinitions"
                      />
                    </div>
                  </div>
                  
                  <!-- Empty state -->
                  <div v-if="getFieldsWithDefinitions.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p v-if="detailsSearch">No fields match your search.</p>
                    <p v-else-if="!showEmptyFields">No fields with values to display.</p>
                    <p v-else>No fields available.</p>
                  </div>
                </div>
              </div>
            </template>

            <template v-if="row" #tab-updates>
              <div class="px-6 py-6 space-y-4">
                <div>
                  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {{ getRecordDisplayName(row) || 'Untitled' }}
                  </h2>
                </div>
                
                <!-- Search Field -->
                <div class="relative mb-4">
                  <input
                    v-model="activitySearchQuery"
                    type="text"
                    placeholder="Search activities..."
                    class="block w-full rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 pl-10 text-gray-900 dark:text-white text-sm outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                  />
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>

                <div v-if="activityItems.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                  No activity yet
                </div>
                <div v-else class="flow-root">
                  <ul role="list" class="-mb-8">
                    <li v-for="(activityItem, activityItemIdx) in activityItems" :key="activityItem.id">
                      <div class="relative pb-8">
                        <span v-if="activityItemIdx !== activityItems.length - 1" class="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                        <div class="relative flex items-start space-x-3">
                          <template v-if="activityItem.type === 'comment'">
                            <div class="relative">
                              <div :class="['flex size-10 items-center justify-center rounded-full ring-8 ring-white dark:ring-gray-800 outline -outline-offset-1 outline-black/5 dark:outline-white/5', getColorForName(activityItem.person.name).bg]">
                                <span :class="['text-sm font-medium', getColorForName(activityItem.person.name).text]">
                                  {{ getInitials(activityItem.person.name) }}
                                </span>
                              </div>
                              <span class="absolute -right-1 -bottom-0.5 rounded-tl bg-white dark:bg-gray-800 px-0.5 py-px">
                                <ChatBubbleLeftEllipsisIcon class="size-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                              </span>
                            </div>
                            <div class="min-w-0 flex-1">
                              <div>
                                <div class="text-sm">
                                  <span class="font-medium text-gray-900 dark:text-white">{{ activityItem.person.name }}</span>
                                </div>
                                <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ activityItem.date }}</p>
                              </div>
                              <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                <p>{{ activityItem.comment }}</p>
                              </div>
                            </div>
                          </template>
                          <template v-else-if="activityItem.type === 'assignment'">
                            <div>
                              <div class="relative px-1">
                                <div class="flex size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 ring-8 ring-white dark:ring-gray-800">
                                  <UserCircleIcon class="size-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                                </div>
                              </div>
                            </div>
                            <div class="min-w-0 flex-1 py-1.5">
                              <div>
                                <div class="text-sm">
                                  <span class="font-medium text-gray-900 dark:text-white">{{ activityItem.person.name }}</span>
                                  {{ ' ' }}
                                  <span class="text-gray-500 dark:text-gray-400">{{ activityItem.action }}</span>
                                  {{ ' ' }}
                                  <span class="font-medium text-gray-900 dark:text-white">{{ activityItem.fieldName || '' }}</span>
                                  {{ ' ' }}
                                  <span class="whitespace-nowrap text-gray-500 dark:text-gray-400">{{ activityItem.date }}</span>
                                </div>
                                <div v-if="activityItem.comment && activityItem.comment !== activityItem.action" class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                  <p>{{ activityItem.comment }}</p>
                                </div>
                              </div>
                            </div>
                          </template>
                          <template v-else-if="activityItem.type === 'tags'">
                            <div>
                              <div class="relative px-1">
                                <div class="flex size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 ring-8 ring-white dark:ring-gray-800">
                                  <TagIconSolid class="size-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                                </div>
                              </div>
                            </div>
                            <div class="min-w-0 flex-1 py-0">
                              <div class="text-sm/8 text-gray-500 dark:text-gray-400">
                                <span class="mr-0.5">
                                  <span class="font-medium text-gray-900 dark:text-white">{{ activityItem.person.name }}</span>
                                  {{ ' ' }}
                                  {{ activityItem.action }}
                                </span>
                                {{ ' ' }}
                                <span class="mr-0.5">
                                  <template v-for="(tag, tagIdx) in activityItem.tags" :key="tag.name">
                                    <span class="inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 ring-1 ring-gray-300 dark:ring-gray-600">
                                      <svg :class="[tag.color, 'size-1.5']" viewBox="0 0 6 6" aria-hidden="true">
                                        <circle cx="3" cy="3" r="3" />
                                      </svg>
                                      {{ tag.name }}
                                    </span>
                                    {{ ' ' }}
                                  </template>
                                </span>
                                <span class="whitespace-nowrap">{{ activityItem.date }}</span>
                              </div>
                            </div>
                          </template>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </template>

            <template v-if="row?.isTenant === true" #tab-tenant-details>
              <div class="px-6 py-6 space-y-6">
                <div>
                  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    {{ getRecordDisplayName(row) || 'Untitled' }}
                  </h2>
                </div>
                <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>Tenant-specific fields will be displayed here</p>
                </div>
              </div>
            </template>
          </RecordRightPane>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Transition } from 'vue';
import { 
  XMarkIcon, 
  ChevronDownIcon, 
  RectangleStackIcon, 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClockIcon,
  LinkIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  PuzzlePieceIcon,
  Squares2X2Icon,
  BellIcon,
  FunnelIcon,
  PlusIcon
} from '@heroicons/vue/24/outline';
import {
  UserIcon,
  CalendarIcon,
  TagIcon,
  FlagIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline';
import { TagIcon as TagIconSolid, ChatBubbleLeftEllipsisIcon } from '@heroicons/vue/24/solid';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/stores/auth';
import DynamicFormField from '@/components/common/DynamicFormField.vue';
import { getFieldDependencyState } from '@/utils/dependencyEvaluation';
import KeyFieldsWidget from '@/components/common/metrics/KeyFieldsWidget.vue';
import LifecycleStageWidget from '@/components/common/metrics/LifecycleStageWidget.vue';
import MetricsWidget from '@/components/common/metrics/MetricsWidget.vue';
import RelatedContactsWidget from '@/components/organizations/RelatedContactsWidget.vue';
import RelatedDealsWidget from '@/components/deals/RelatedDealsWidget.vue';
import RelatedTasksWidget from '@/components/tasks/RelatedTasksWidget.vue';
import RelatedEventsWidget from '@/components/events/RelatedEventsWidget.vue';
import RelatedOrganizationWidget from '@/components/organizations/RelatedOrganizationWidget.vue';
import FormAnalyticsWidget from '@/components/forms/widgets/FormAnalyticsWidget.vue';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { createApp, h, provide } from 'vue';
import RecordRightPane from '@/components/record-page/RecordRightPane.vue';
import TaskRecordPage from '@/pages/tasks/TaskRecordPage.vue';
import DOMPurify from 'dompurify';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  row: {
    type: Object,
    default: null
  },
  columns: {
    type: Array,
    required: true
  },
  moduleTitle: {
    type: String,
    required: true
  },
  moduleKey: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close', 'update']);

// Provide RecordPageLayout mobile context so RecordRightPane behaves as mobile view
provide('recordLayoutIsMobile', ref(true));
provide('recordLayoutSummaryTeleportReady', ref(false));

// Ref for RecordRightPane (to sync GridStack with active tab)
const recordRightPaneRef = ref(null);
// Track active tab for GridStack init/destroy (synced from RecordRightPane)
const activeTab = ref('summary');

const onActiveTabChange = (tab) => {
  activeTab.value = tab;
};

// Fixed tabs - TaskRecordPage style for tasks, generic for others
const fixedTabs = computed(() => {
  if (props.moduleKey === 'tasks') {
    return [
      { id: 'summary', name: 'Summary', icon: Squares2X2Icon },
      { id: 'activity', name: 'Activity', icon: ClockIcon },
      { id: 'related', name: 'Related Records', icon: LinkIcon },
      { id: 'integrations', name: 'Integrations', icon: PuzzlePieceIcon }
    ];
  }
  const baseTabs = [
    { id: 'summary', name: 'Summary' },
    { id: 'details', name: 'Details' },
    { id: 'updates', name: 'Updates' }
  ];
  if (props.row?.isTenant === true) {
    baseTabs.splice(2, 0, { id: 'tenant-details', name: 'Tenant' });
  }
  return baseTabs;
});

// Get icon for tab
const getTabIcon = (tabId) => {
  const iconMap = {
    'summary': RectangleStackIcon,
    'details': DocumentTextIcon,
    'updates': ClockIcon,
    'tenant-details': RectangleStackIcon
  };
  return iconMap[tabId] || RectangleStackIcon;
};

// Auth store
const authStore = useAuthStore();

// Module definition
const moduleDefinition = ref(null);
const allModuleDefinitions = ref({});

// GridStack
const gridStackContainer = ref(null);
let gridStack = null;
let isInitializing = false;
const widgetApps = new Map();

// Details tab state
const detailsSearch = ref('');
const showEmptyFields = ref(true);
const pendingFieldChanges = ref({});

// Activity logs state
const timelineUpdates = ref([]);
const activityFilterUser = ref('');
const activityFilterType = ref('');
const activitySearchQuery = ref('');
// Fetch module definition
const fetchModuleDefinition = async () => {
  try {
    const response = await apiClient.get('/modules');
    const modules = response.data || [];
    
    // Create a map of all module definitions
    const moduleMap = {};
    modules.forEach(mod => {
      moduleMap[mod.key] = mod;
    });
    allModuleDefinitions.value = moduleMap;
    
    const module = modules.find(m => m.key === props.moduleKey);
    if (module) {
      moduleDefinition.value = module;
    }
  } catch (error) {
    console.error('Error fetching module definition:', error);
  }
};

// Get activity logs API endpoint
const getActivityLogsEndpoint = (recordId) => {
  if (props.moduleKey === 'people') {
    return `/people/${recordId}/activity-logs`;
  }
  if (props.moduleKey === 'organizations') {
    return `/v2/organization/${recordId}/activity-logs`;
  }
  if (props.moduleKey === 'tasks') {
    return `/tasks/${recordId}/activity-logs`;
  }
  return null;
};

// Load activity logs
const loadActivityLogs = async () => {
  if (!props.row?._id) return;
  
  const recordId = props.row._id;
  const endpoint = getActivityLogsEndpoint(recordId);
  
  if (!endpoint) return;
  
  try {
    const response = await apiClient.get(endpoint);
    if (response.success && response.data) {
      timelineUpdates.value = response.data.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  } catch (error) {
    console.warn('Error loading activity logs:', error);
    timelineUpdates.value = [];
  }
};

// Get target module from field key
const getTargetModuleFromFieldKey = (fieldKey) => {
  if (!fieldKey) return null;
  
  const keyLower = fieldKey.toLowerCase();
  
  // Common field key to module mappings
  const mappings = {
    'organization': 'organizations',
    'organizations': 'organizations',
    'organizationid': 'organizations',
    'accountid': 'organizations',
    'account': 'organizations',
    'contact': 'people',
    'contactid': 'people',
    'contacts': 'people',
    'legacycontactid': 'people',
    'assignedto': 'users',
    'assigned_to': 'users',
    'leadowner': 'users',
    'lead_owner': 'users',
    'createdby': 'users',
    'created_by': 'users',
    'deal': 'deals',
    'dealid': 'deals',
    'deals': 'deals',
    'task': 'tasks',
    'taskid': 'tasks',
    'tasks': 'tasks',
    'event': 'events',
    'eventid': 'events',
    'events': 'events'
  };
  
  // Check exact match first
  if (mappings[keyLower]) {
    return mappings[keyLower];
  }
  
  // Check if key contains any of the mapping keys
  for (const [key, module] of Object.entries(mappings)) {
    if (keyLower.includes(key) || key.includes(keyLower)) {
      return module;
    }
  }
  
  return null;
};

// Get field dependency state
const getFieldState = (field) => {
  if (!field || !field.dependencies || !Array.isArray(field.dependencies) || field.dependencies.length === 0) {
    return {
      visible: true,
      readonly: false,
      required: field.required || false,
      allowedOptions: null
    };
  }
  const currentFormData = props.row || {};
  return getFieldDependencyState(field, currentFormData, moduleDefinition.value?.fields || []);
};

// Get fields with definitions for details tab
const getFieldsWithDefinitions = computed(() => {
  if (!props.row || !moduleDefinition.value?.fields) return [];
  
  const fieldMap = new Map();
  moduleDefinition.value.fields.forEach(field => {
    if (field.key) {
      const keyLower = field.key.toLowerCase();
      fieldMap.set(keyLower, field);
      fieldMap.set(field.key, field);
    }
  });
  
  const systemFieldKeys = ['_id', 'id', '__v', 'createdat', 'updatedat', 'organizationid', 'activitylogs'];
  
  const processed = [];
  const processedKeys = new Set();
  
  for (const fieldDef of moduleDefinition.value.fields) {
    if (!fieldDef.key) continue;
    
    const keyLower = fieldDef.key.toLowerCase();
    if (processedKeys.has(keyLower)) continue;
    processedKeys.add(keyLower);
    
    if (systemFieldKeys.includes(keyLower)) continue;
    
    // Resolve value from row - try multiple key variations
    let displayValue = undefined;
    
    // Try exact key match first
    if (fieldDef.key && props.row[fieldDef.key] !== undefined) {
      displayValue = props.row[fieldDef.key];
    }
    // Try lowercase key
    else if (keyLower && props.row[keyLower] !== undefined) {
      displayValue = props.row[keyLower];
    }
    // Try nested key (e.g., "user.name")
    else if (fieldDef.key && fieldDef.key.includes('.')) {
      displayValue = fieldDef.key.split('.').reduce((obj, k) => obj?.[k], props.row);
    }
    // Try camelCase variations
    else if (fieldDef.key) {
      // Try camelCase
      const camelKey = fieldDef.key.charAt(0).toLowerCase() + fieldDef.key.slice(1);
      if (props.row[camelKey] !== undefined) {
        displayValue = props.row[camelKey];
      }
      // Try with underscore variations
      const underscoreKey = fieldDef.key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (props.row[underscoreKey] !== undefined) {
        displayValue = props.row[underscoreKey];
      }
    }
    
    // If still undefined, explicitly set to null (not undefined)
    if (displayValue === undefined) {
      displayValue = null;
    }
    
    const depState = getFieldState(fieldDef);
    if (!depState.visible && depState.visible !== undefined) {
      continue;
    }
    
    if (!showEmptyFields.value) {
      const isEmpty = displayValue === null || 
                     displayValue === undefined || 
                     displayValue === '' || 
                     (Array.isArray(displayValue) && displayValue.length === 0);
      if (isEmpty) continue;
    }
    
    if (detailsSearch.value) {
      const searchLower = detailsSearch.value.toLowerCase();
      const fieldName = (fieldDef.label || fieldDef.key).toLowerCase();
      const fieldValue = String(displayValue || '').toLowerCase();
      
      if (!fieldName.includes(searchLower) && !fieldValue.includes(searchLower)) {
        continue;
      }
    }
    
    // Enrich lookup fields with targetModule if missing
    let enrichedField = { ...fieldDef };
    if (enrichedField.dataType === 'Lookup (Relationship)' && !enrichedField.lookupSettings?.targetModule) {
      // Derive targetModule from field key
      const targetModule = getTargetModuleFromFieldKey(enrichedField.key);
      if (targetModule) {
        enrichedField = {
          ...enrichedField,
          lookupSettings: {
            ...enrichedField.lookupSettings,
            targetModule
          }
        };
      }
    }
    
    processed.push({
      field: enrichedField,
      key: fieldDef.key,
      value: displayValue,
      dependencyState: depState
    });
  }
  
  processed.sort((a, b) => {
    const orderA = a.field.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.field.order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
  
  return processed;
});

// Format field name
const formatFieldName = (key) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
};

// Format date for display (e.g. due date)
const formatDateDisplay = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Get assigned user display name
const getAssignedToName = (assignedTo) => {
  if (!assignedTo) return '-';
  if (typeof assignedTo === 'string') return assignedTo;
  if (assignedTo.name) return assignedTo.name;
  if (assignedTo.firstName || assignedTo.lastName) return `${assignedTo.firstName || ''} ${assignedTo.lastName || ''}`.trim();
  if (assignedTo.username) return assignedTo.username;
  return '-';
};

// Sanitize description HTML for safe rendering
const ALLOWED_DESCRIPTION_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'blockquote', 'h1', 'h2', 'h3', 'code', 'pre'];
const sanitizeDescription = (html) => {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ALLOWED_DESCRIPTION_TAGS, ALLOWED_ATTR: ['href', 'target'] });
};

// Format date (relative for activity)
const formatDate = (date) => {
  if (!date) return '-';
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get initials
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 1);
};

// Get color for name
const getColorForName = (name) => {
  const colors = {
    'A': { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
    'B': { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' },
    'C': { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300' },
    'D': { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
    'E': { bg: 'bg-lime-100 dark:bg-lime-900', text: 'text-lime-700 dark:text-lime-300' },
    'F': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
    'G': { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-300' },
    'H': { bg: 'bg-teal-100 dark:bg-teal-900', text: 'text-teal-700 dark:text-teal-300' },
    'I': { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-700 dark:text-cyan-300' },
    'J': { bg: 'bg-sky-100 dark:bg-sky-900', text: 'text-sky-700 dark:text-sky-300' },
    'K': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
    'L': { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-700 dark:text-indigo-300' },
    'M': { bg: 'bg-violet-100 dark:bg-violet-900', text: 'text-violet-700 dark:text-violet-300' },
    'N': { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
    'O': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
    'P': { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-700 dark:text-pink-300' },
    'Q': { bg: 'bg-rose-100 dark:bg-rose-900', text: 'text-rose-700 dark:text-rose-300' },
    'R': { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
    'S': { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200' },
    'T': { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200' },
    'U': { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' },
    'V': { bg: 'bg-lime-100 dark:bg-lime-900', text: 'text-lime-800 dark:text-lime-200' },
    'W': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
    'X': { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-800 dark:text-emerald-200' },
    'Y': { bg: 'bg-teal-100 dark:bg-teal-900', text: 'text-teal-800 dark:text-teal-200' },
    'Z': { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-800 dark:text-cyan-200' }
  };
  const firstLetter = name ? name.trim()[0] : '?';
  return colors[firstLetter.toUpperCase()] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' };
};

// Transform activity logs into activity items
const sortedTimelineUpdates = computed(() => {
  return [...timelineUpdates.value].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
});

const activityItems = computed(() => {
  const items = sortedTimelineUpdates.value.map((update, index) => {
    const action = update.action || '';
    const lowerAction = action.toLowerCase();
    
    let type = 'comment';
    let comment = action;
    let fieldName = '';
    let tags = [];
    let actionText = '';
    
    if (lowerAction.includes('tag')) {
      type = 'tags';
      const tagMatch = action.match(/(?:added|removed)\s+tag\s+"?([^"]+)"?/i);
      if (tagMatch) {
        const tagName = tagMatch[1].replace(/^"|"$/g, '');
        const isRemoved = lowerAction.includes('removed');
        tags = [{ name: tagName, color: 'fill-indigo-500' }];
        actionText = isRemoved ? 'removed tag' : 'added tag';
      }
    } else if (lowerAction.includes('changed') || lowerAction.includes('set') || lowerAction.includes('updated')) {
      type = 'assignment';
      const setMatch = action.match(/set\s+([^"]+?)\s+to\s+"([^"]*)"/i);
      const changeMatch = action.match(/changed\s+([^"]+?)\s+from\s+"([^"]*)"\s+to\s+"([^"]*)"/i);
      
      if (setMatch) {
        fieldName = formatFieldName(setMatch[1].trim());
        actionText = 'set';
        comment = `Set ${fieldName} to "${setMatch[2]}"`;
      } else if (changeMatch) {
        fieldName = formatFieldName(changeMatch[1].trim());
        actionText = 'changed';
        comment = `Changed ${fieldName} from "${changeMatch[2] || 'empty'}" to "${changeMatch[3]}"`;
      }
    }
    
    let userName = update.user || 'System';
    if (typeof userName === 'string' && /^[0-9a-fA-F]{24}$/.test(userName)) {
      userName = 'Unknown User';
    }
    
    return {
      id: `activity-${update.timestamp?.getTime() || index}`,
      type,
      person: { name: userName, href: '#' },
      comment,
      action: actionText,
      fieldName,
      tags,
      date: formatDate(update.timestamp)
    };
  });
  
  return items.filter(item => {
    if (activityFilterUser.value && item.person.name.toLowerCase() !== activityFilterUser.value.toLowerCase()) {
      return false;
    }
    if (activityFilterType.value && item.type !== activityFilterType.value) {
      return false;
    }
    if (activitySearchQuery.value) {
      const query = activitySearchQuery.value.toLowerCase();
      const searchableText = `${item.person.name} ${item.comment} ${item.fieldName}`.toLowerCase();
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    return true;
  });
});

// Normalize value for comparison
const normalizeValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};


// Format value for activity log - never show raw ObjectIds or JSON
const formatValueForActivityLog = (value, field) => {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'object' && !Array.isArray(value)) {
    const display = value.name || value.title || value.firstName || value.first_name || value.label || value.email || value.username;
    if (display) return display;
    if (value._id) return '—';
    return '—';
  }
  if (Array.isArray(value)) {
    return value.map(v => {
      if (typeof v === 'object' && v !== null) {
        return v.name || v.title || v.label || v.firstName || v.first_name || '—';
      }
      if (typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v)) return '—';
      return String(v);
    }).join(', ');
  }
  if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) return '—';
  return String(value);
};

// Update field value (track changes, don't save yet)
const updateField = (field, value) => {
  const oldValue = props.row ? props.row[field] : null;
  
  // Normalize values for comparison
  const normalizedOldValue = normalizeValue(oldValue);
  const normalizedNewValue = normalizeValue(value);
  
  // Only proceed if value actually changed
  if (normalizedOldValue === normalizedNewValue) {
    // Clear pending change if value reverted to original
    if (pendingFieldChanges.value[field]) {
      delete pendingFieldChanges.value[field];
    }
    return;
  }
  
  // Update local state immediately for UI responsiveness
  if (props.row) {
    props.row[field] = value;
  }
  
  // Track pending change
  if (!pendingFieldChanges.value[field]) {
    pendingFieldChanges.value[field] = {
      originalValue: oldValue,
      currentValue: value
    };
  } else {
    pendingFieldChanges.value[field].currentValue = value;
  }
};

// Save field and log activity (called on blur)
const saveFieldOnBlur = async (field) => {
  const pendingChange = pendingFieldChanges.value[field];
  
  // If no pending change, nothing to save
  if (!pendingChange) {
    return;
  }
  
  const { originalValue, currentValue } = pendingChange;
  
  // Normalize values for final comparison
  const normalizedOldValue = normalizeValue(originalValue);
  const normalizedNewValue = normalizeValue(currentValue);
  
  // If values are the same, don't save
  if (normalizedOldValue === normalizedNewValue) {
    delete pendingFieldChanges.value[field];
    return;
  }
  
  // Clear pending change before saving
  delete pendingFieldChanges.value[field];
  
  // Emit update event to parent
  emit('update', {
    field,
    value: currentValue,
    onSuccess: async (updatedRecord = null) => {
      await nextTick();
      
      // Log activity
      const fieldName = formatFieldName(field);
      const oldValueFormatted = formatValueForActivityLog(originalValue, field);
      const newValueFormatted = formatValueForActivityLog(currentValue, field);
      
      // Add activity log
      await addActivityLog(`changed ${fieldName} from "${oldValueFormatted}" to "${newValueFormatted}"`);
      
      // Reload activity logs to show the new entry
      if (props.row?._id) {
        loadActivityLogs();
      }
    }
  });
};

// Get current user name for activity logs
const getCurrentUserName = () => {
  if (authStore.user) {
    const firstName = authStore.user.firstName || '';
    const lastName = authStore.user.lastName || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return authStore.user.username || authStore.user.email || 'User';
  }
  return 'System';
};

// Add activity log
const addActivityLog = async (action) => {
  if (!props.row?._id) return;
  
  const recordId = props.row._id;
  const endpoint = getActivityLogsEndpoint(recordId);
  
  if (!endpoint) return;
  
  try {
    await apiClient.post(endpoint, {
      user: getCurrentUserName(),
      action,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding activity log:', error);
  }
};

// Watch for drawer open and load data
watch(() => props.show, async (newVal) => {
  if (newVal) {
    activeTab.value = 'summary';
    await fetchModuleDefinition();
    if (props.row?._id && props.moduleKey !== 'tasks') {
      loadActivityLogs();
    }
    // Initialize GridStack when drawer opens and summary tab is active (skip for tasks - no GridStack)
    if (activeTab.value === 'summary' && moduleDefinition.value && props.moduleKey !== 'tasks') {
      await nextTick();
      initializeGridStack();
    }
  } else {
    // Destroy GridStack when drawer closes
    destroyGridStack();
    // Clear pending changes when drawer closes
    pendingFieldChanges.value = {};
  }
});

// Watch for row changes
watch(() => props.row?._id, (newId) => {
  if (newId && props.show && props.moduleKey !== 'tasks') {
    loadActivityLogs();
  }
});

// Watch for tab changes to load activity logs and initialize GridStack
watch(() => activeTab.value, async (newTab) => {
  if ((newTab === 'updates' || (props.moduleKey === 'tasks' && newTab === 'activity')) && props.row?._id && timelineUpdates.value.length === 0) {
    loadActivityLogs();
  }
  if (newTab === 'summary' && props.show && moduleDefinition.value && props.moduleKey !== 'tasks') {
    await nextTick();
    initializeGridStack();
  } else if (newTab !== 'summary') {
    destroyGridStack();
  }
});

// Calculate quick preview drawer offset dynamically
const quickPreviewOffset = ref(64); // Default fallback

// Prevent body scroll when drawer is open
const preventBodyScroll = () => {
  if (props.show) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const updateQuickPreviewOffset = () => {
  // Find the tabbar element directly by its characteristics
  // TabBar has: fixed positioning, z-30, border-b, and contains tabs
  const allFixedElements = Array.from(document.querySelectorAll('[class*="fixed"]'));
  const tabbar = allFixedElements.find(el => {
    const styles = getComputedStyle(el);
    const classes = el.className || '';
    return (
      styles.position === 'fixed' &&
      styles.zIndex === '30' &&
      (classes.includes('border-b') || classes.includes('border-gray')) &&
      el.querySelector('[class*="flex"]') // Has flex container inside
    );
  });
  
  if (tabbar) {
    const rect = tabbar.getBoundingClientRect();
    const calculatedOffset = Math.round(rect.bottom);
    if (calculatedOffset > 0) {
      quickPreviewOffset.value = calculatedOffset;
      // Set CSS variable for this component
      document.documentElement.style.setProperty('--quickpreview-offset', `${calculatedOffset}px`);
      return;
    }
  }
  
  // Fallback: try to get the tabbar offset CSS variable
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--tabbar-offset');
  if (cssVar && cssVar.trim()) {
    const value = parseInt(cssVar.trim());
    if (!isNaN(value) && value > 0) {
      quickPreviewOffset.value = value;
      document.documentElement.style.setProperty('--quickpreview-offset', `${value}px`);
      return;
    }
  }
  
  // Final fallback: calculate based on viewport
  // On mobile: header (64px) + tabbar (48px) = 112px
  // On desktop: tabbar (48px) = 48px
  const isMobile = window.innerWidth < 1024;
  const fallbackOffset = isMobile ? 112 : 48;
  quickPreviewOffset.value = fallbackOffset;
  document.documentElement.style.setProperty('--quickpreview-offset', `${fallbackOffset}px`);
};

// Reset horizontal scroll in drawer content (fixes shift after tab switch / visibility change)
const resetDrawerScrollPosition = () => {
  nextTick(() => {
    const drawer = document.querySelector('.record-right-pane-drawer');
    if (!drawer) return;
    const scrollables = drawer.querySelectorAll('.overflow-y-auto, .overflow-auto, [style*="overflow"]');
    scrollables.forEach((el) => {
      if (el.scrollLeft !== 0) {
        el.scrollLeft = 0;
      }
    });
  });
};

// Watch for changes when drawer opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    // Prevent body scroll
    preventBodyScroll();
    // Reset any horizontal scroll that may have been incorrectly restored after tab switch
    resetDrawerScrollPosition();
    setTimeout(resetDrawerScrollPosition, 50);
    
    // Multiple attempts to ensure we get the correct offset
    nextTick(() => {
      updateQuickPreviewOffset();
      // Try again after a short delay to catch any late updates
      setTimeout(() => {
        updateQuickPreviewOffset();
      }, 100);
    });
  } else {
    // Restore body scroll
    preventBodyScroll();
    // Clean up CSS variable when drawer closes
    document.documentElement.style.removeProperty('--quickpreview-offset');
  }
});

// Watch for window resize and sidebar toggle
const handleResize = () => {
  if (props.show) {
    updateQuickPreviewOffset();
  }
};

const handleSidebarToggle = () => {
  if (props.show) {
    setTimeout(() => {
      updateQuickPreviewOffset();
    }, 350); // Wait for sidebar animation to complete
  }
};

// Get layout storage key for quick preview drawer
const getLayoutStorageKey = () => {
  return `quickpreview-layout-${props.moduleKey}`;
};

// Initialize GridStack
const initializeGridStack = async () => {
  if (isInitializing) return;
  
  await nextTick();
  await nextTick(); // Extra tick to ensure v-if has rendered
  
  if (!gridStackContainer.value) {
    setTimeout(() => initializeGridStack(), 100);
    return;
  }
  
  if (gridStack) {
    destroyGridStack();
  }
  
  if (!document.contains(gridStackContainer.value)) {
    setTimeout(() => initializeGridStack(), 100);
    return;
  }

  isInitializing = true;
  
  try {
    gridStack = GridStack.init({
      column: 12,
      cellHeight: 70,
      marginRight: '0.8rem',
      marginLeft: '0rem',
      marginTop: '0rem',
      marginBottom: '0.8rem',
      animate: true,
      disableResize: true, // Disable resize in preview mode
      disableDrag: true, // Disable drag in preview mode
      resizable: { handles: 'all' },
      columnOpts: {
        breakpoints: [
          { w: 600, c: 1 },
          { w: 1024, c: 2 }
        ]
      }
    }, gridStackContainer.value);
    
    setTimeout(async () => {
      isInitializing = false;
      
      if (!gridStack) {
        setTimeout(() => initializeGridStack(), 100);
        return;
      }
      
      try {
        const existingWidgets = gridStack.getGridItems();
        
        if (existingWidgets.length === 0) {
          const savedLayout = await loadSavedLayout();
          if (savedLayout && savedLayout.length > 0) {
            loadSavedWidgets(savedLayout);
          } else {
            loadDefaultWidgets();
          }
        }
      } catch (err) {
        console.error('Error checking GridStack items:', err);
        const savedLayout = await loadSavedLayout();
        if (savedLayout && savedLayout.length > 0) {
          loadSavedWidgets(savedLayout);
        } else {
          loadDefaultWidgets();
        }
      }
    }, 150);
  } catch (err) {
    console.error('Error initializing GridStack:', err);
    isInitializing = false;
  }
};

// Destroy GridStack
const destroyGridStack = () => {
  widgetApps.forEach((widgetData) => {
    try {
      if (widgetData.app) {
        widgetData.app.unmount();
      }
    } catch (e) {
      console.error('Error unmounting widget:', e);
    }
  });
  widgetApps.clear();
  
  if (gridStack) {
    try {
      gridStack.destroy();
      gridStack = null;
    } catch (err) {
      console.error('Error destroying GridStack:', err);
    }
  }
  isInitializing = false;
};

// Load saved layout
const loadSavedLayout = async () => {
  if (!props.moduleKey) return null;
  
  try {
    const saved = localStorage.getItem(getLayoutStorageKey());
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading saved layout:', error);
  }
  return null;
};

// Load saved widgets
const loadSavedWidgets = (savedLayout) => {
  if (!gridStack) return;
  
  const validWidgetTypes = [
    'related-contacts', 'related-deals', 'related-tasks', 'related-events', 
    'related-organization', 'lifecycle-stage', 'key-fields', 'metrics',
    'form-total-responses', 'form-avg-compliance', 'form-avg-rating', 'form-response-rate'
  ];
  
  savedLayout.forEach(widgetData => {
    if (widgetData.type && validWidgetTypes.includes(widgetData.type)) {
      addWidgetToGrid(widgetData.type, widgetData.x, widgetData.y, widgetData.w, widgetData.h);
    }
  });
  
  if (gridStack) {
    setTimeout(() => {
      gridStack.compact();
      if (typeof gridStack.update === 'function') {
        gridStack.update();
      }
    }, 100);
  }
};

// Load default widgets - matches SummaryView layout
const loadDefaultWidgets = () => {
  if (!gridStack) return;
  
  const defaultWidgets = [];
  let yPosition = 0;
  
  // First row: Key Fields, Lifecycle Stage, Metrics (skip for forms)
  if (props.moduleKey !== 'forms') {
    defaultWidgets.push(
      { type: 'key-fields', x: 0, y: yPosition, w: 3, h: 4 },
      { type: 'lifecycle-stage', x: 3, y: yPosition, w: 6, h: 4 },
      { type: 'metrics', x: 9, y: yPosition, w: 3, h: 4 }
    );
    yPosition += 4;
  }
  
  if (props.moduleKey === 'organizations') {
    defaultWidgets.push(
      { type: 'related-contacts', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-deals', x: 6, y: yPosition, w: 6, h: 4 }
    );
  } else if (props.moduleKey === 'people') {
    defaultWidgets.push(
      { type: 'related-organization', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-deals', x: 6, y: yPosition, w: 6, h: 4 }
    );
    yPosition += 4;
    defaultWidgets.push(
      { type: 'related-tasks', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-events', x: 6, y: yPosition, w: 6, h: 4 }
    );
  } else if (props.moduleKey === 'deals') {
    defaultWidgets.push(
      { type: 'related-contacts', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-organization', x: 6, y: yPosition, w: 6, h: 4 }
    );
    yPosition += 4;
    defaultWidgets.push(
      { type: 'related-tasks', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-events', x: 6, y: yPosition, w: 6, h: 4 }
    );
  } else if (props.moduleKey === 'tasks') {
    defaultWidgets.push(
      { type: 'related-contacts', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-organization', x: 6, y: yPosition, w: 6, h: 4 }
    );
    yPosition += 4;
    defaultWidgets.push(
      { type: 'related-deals', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-events', x: 6, y: yPosition, w: 6, h: 4 }
    );
  } else if (props.moduleKey === 'events') {
    defaultWidgets.push(
      { type: 'related-contacts', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-organization', x: 6, y: yPosition, w: 6, h: 4 }
    );
    yPosition += 4;
    defaultWidgets.push(
      { type: 'related-deals', x: 0, y: yPosition, w: 6, h: 4 },
      { type: 'related-tasks', x: 6, y: yPosition, w: 6, h: 4 }
    );
  } else if (props.moduleKey === 'forms' && props.row?.status === 'Active') {
    defaultWidgets.push(
      { type: 'form-total-responses', x: 0, y: yPosition, w: 3, h: 3 },
      { type: 'form-avg-compliance', x: 3, y: yPosition, w: 3, h: 3 },
      { type: 'form-avg-rating', x: 6, y: yPosition, w: 3, h: 3 },
      { type: 'form-response-rate', x: 9, y: yPosition, w: 3, h: 3 }
    );
  }

  defaultWidgets.forEach(widget => {
    addWidgetToGrid(widget.type, widget.x, widget.y, widget.w, widget.h);
  });
  
  if (gridStack) {
    setTimeout(() => {
      gridStack.compact();
      if (typeof gridStack.update === 'function') {
        gridStack.update();
      }
    }, 100);
  }
};

// Add widget to GridStack
const addWidgetToGrid = (widgetType, x = 0, y = 0, w = 4, h = 3) => {
  if (!gridStack || !gridStackContainer.value) return;
  
  if ((widgetType === 'related-contacts' || widgetType === 'related-deals' || widgetType === 'related-tasks' || widgetType === 'related-events') && !props.row?._id) {
    return;
  }
  if (widgetType.startsWith('form-') && !props.row?._id) {
    return;
  }

  const widgetElement = createWidgetElement(widgetType);
  
  const itemEl = document.createElement('div');
  itemEl.className = 'grid-stack-item';
  itemEl.style.margin = '';
  itemEl.style.padding = '0';
  itemEl.setAttribute('data-widget-type', widgetType);
  itemEl.setAttribute('gs-x', x);
  itemEl.setAttribute('gs-y', y);
  itemEl.setAttribute('gs-w', w);
  itemEl.setAttribute('gs-h', h);

  const contentEl = document.createElement('div');
  contentEl.className = 'grid-stack-item-content';
  contentEl.style.padding = '0';
  contentEl.style.height = '100%';
  contentEl.style.width = '100%';
  contentEl.style.overflow = 'hidden';
  contentEl.appendChild(widgetElement);

  itemEl.appendChild(contentEl);
  gridStackContainer.value.appendChild(itemEl);
  
  const widget = gridStack.makeWidget(itemEl);
  gridStack.compact();

  return widget;
};

// Create widget DOM element
const createWidgetElement = (widgetType) => {
  const container = document.createElement('div');
  container.className = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200/70 dark:border-gray-700/70 p-3 sm:p-4';
  container.style.boxSizing = 'border-box';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'flex-start';
  container.style.justifyContent = 'flex-start';
  container.style.overflow = 'auto';
  
  let Component = null;
  const componentProps = {};
  
  if (props.moduleKey === 'organizations' && props.row?._id) {
    switch (widgetType) {
      case 'related-contacts':
        Component = RelatedContactsWidget;
        componentProps.organizationId = props.row._id;
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['people'];
        break;
      case 'related-deals':
        Component = RelatedDealsWidget;
        componentProps.accountId = props.row._id;
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['deals'];
        break;
      case 'related-tasks':
        Component = RelatedTasksWidget;
        componentProps.organizationId = props.row._id;
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['tasks'];
        break;
      case 'related-events':
        Component = RelatedEventsWidget;
        componentProps.relatedType = 'Organization';
        componentProps.relatedId = props.row._id;
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['events'];
        break;
      case 'metrics':
        Component = MetricsWidget;
        componentProps.stats = {};
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
      case 'lifecycle-stage':
        Component = LifecycleStageWidget;
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
      case 'key-fields':
        Component = KeyFieldsWidget;
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
    }
  } else if (props.row?._id) {
    switch (widgetType) {
      case 'lifecycle-stage':
        Component = LifecycleStageWidget;
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
      case 'metrics':
        Component = MetricsWidget;
        componentProps.stats = {};
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
      case 'key-fields':
        Component = KeyFieldsWidget;
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
      case 'related-contacts':
        Component = RelatedContactsWidget;
        // For people: contacts from same org; for deals/tasks/events: from linked org
        if (props.moduleKey === 'people') {
          componentProps.organizationId = props.row.organization?._id || props.row.organization || null;
        } else if (props.moduleKey === 'deals') {
          componentProps.organizationId = props.row.accountId || props.row.account?._id || null;
        } else if (props.moduleKey === 'tasks') {
          componentProps.organizationId = props.row.organizationId || props.row.organization?._id || null;
        } else if (props.moduleKey === 'events') {
          componentProps.organizationId = (props.row.relatedType === 'Organization' ? props.row.relatedId : null) || null;
        }
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['people'];
        break;
      case 'related-organization':
        Component = RelatedOrganizationWidget;
        let orgField = props.row.organization;
        if (props.moduleKey === 'deals') {
          orgField = props.row.account || (props.row.accountId ? { _id: props.row.accountId } : null);
        } else if (props.moduleKey === 'tasks') {
          orgField = props.row.organization || (props.row.organizationId ? { _id: props.row.organizationId } : null);
        } else if (props.moduleKey === 'events') {
          orgField = (props.row.relatedType === 'Organization' && props.row.relatedId) ? { _id: props.row.relatedId } : null;
        }
        if (orgField && typeof orgField === 'object' && orgField._id) {
          componentProps.organization = orgField;
        } else {
          componentProps.organization = null;
        }
        componentProps.moduleDefinition = allModuleDefinitions.value['organizations'];
        break;
      case 'related-deals':
        Component = RelatedDealsWidget;
        if (props.moduleKey === 'people') {
          componentProps.contactId = props.row._id;
        } else if (props.moduleKey === 'organizations') {
          componentProps.accountId = props.row._id;
        }
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['deals'];
        break;
      case 'related-tasks':
        Component = RelatedTasksWidget;
        if (props.moduleKey === 'people') {
          componentProps.contactId = props.row._id;
        } else if (props.moduleKey === 'organizations') {
          componentProps.organizationId = props.row._id;
        } else if (props.moduleKey === 'deals') {
          componentProps.contactId = props.row.contactId || undefined;
          componentProps.organizationId = props.row.accountId || undefined;
        } else if (props.moduleKey === 'tasks') {
          const rt = props.row.relatedTo;
          if (rt?.type === 'contact') componentProps.contactId = rt.id;
          else if (rt?.type === 'organization') componentProps.organizationId = rt.id;
        } else if (props.moduleKey === 'events') {
          if (props.row.relatedType === 'Contact') componentProps.contactId = props.row.relatedId;
          else if (props.row.relatedType === 'Organization') componentProps.organizationId = props.row.relatedId;
        }
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['tasks'];
        break;
      case 'related-events':
        Component = RelatedEventsWidget;
        const eventRelatedType = props.moduleKey === 'people' ? 'Contact' : (props.moduleKey === 'organizations' ? 'Organization' : (props.moduleKey === 'deals' ? 'Deal' : (props.moduleKey === 'tasks' ? 'Task' : (props.row.relatedType || 'Contact'))));
        componentProps.relatedType = eventRelatedType;
        componentProps.relatedId = props.row._id;
        componentProps.limit = 5;
        componentProps.moduleDefinition = allModuleDefinitions.value['events'];
        break;
    }
  } else if (props.moduleKey === 'forms' && props.row?.status === 'Active' && props.row?._id) {
    switch (widgetType) {
      case 'form-total-responses':
      case 'form-avg-compliance':
      case 'form-avg-rating':
      case 'form-response-rate':
        Component = FormAnalyticsWidget;
        componentProps.formId = props.row._id;
        componentProps.metricType = widgetType.replace('form-', '');
        break;
      case 'lifecycle-stage':
        Component = LifecycleStageWidget;
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
      case 'key-fields':
        Component = KeyFieldsWidget;
        componentProps.record = props.row;
        componentProps.recordType = props.moduleKey;
        componentProps.moduleDefinition = moduleDefinition.value;
        break;
    }
  }
  
  if (Component) {
    const wrapperComponent = {
      setup() {
        return () => h(Component, componentProps);
      }
    };
    
    const app = createApp(wrapperComponent);
    app.mount(container);
    widgetApps.set(container, { app });
  }
  
  return container;
};

// Watch for CSS variable changes
let observer = null;

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && props.show) {
    resetDrawerScrollPosition();
  }
};

onMounted(() => {
  updateQuickPreviewOffset();
  window.addEventListener('resize', handleResize);
  window.addEventListener('sidebar-toggle', handleSidebarToggle);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Watch for CSS variable changes on document root (especially --tabbar-offset)
  observer = new MutationObserver(() => {
    if (props.show) {
      updateQuickPreviewOffset();
    }
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style']
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('sidebar-toggle', handleSidebarToggle);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (observer) {
    observer.disconnect();
  }
  // Restore body scroll
  document.body.style.overflow = '';
  // Clean up CSS variable
  document.documentElement.style.removeProperty('--quickpreview-offset');
  destroyGridStack();
});

// Filter visible columns
const visibleColumns = computed(() => {
  return props.columns.filter(col => col.visible !== false);
});

// Helper functions
const columnKey = (column) => {
  if (typeof column === 'string') return column;
  return column.key ?? String(column.label ?? '');
};

const columnLabel = (column) => {
  if (typeof column === 'string') return column;
  return column.label ?? column.key ?? '';
};

const resolveValue = (row, column) => {
  const key = typeof column === 'string' ? column : column.key;
  if (!key) return '';
  
  // Handle nested keys (e.g., 'user.name')
  if (key.includes('.')) {
    return key.split('.').reduce((obj, k) => obj?.[k], row) ?? '';
  }
  
  const value = row?.[key];
  
  // Handle populated relationship fields (lookup fields)
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    if (value.name) return value.name;
    if (value.title) return value.title;
    if (value.firstName && value.lastName) return `${value.firstName} ${value.lastName}`;
    if (value.first_name && value.last_name) return `${value.first_name} ${value.last_name}`;
    if (value._id) return value;
  }
  
  return value ?? '';
};

// Get record display name
const getRecordDisplayName = (row) => {
  if (!row) return '';
  if (row.name) return row.name;
  if (row.title) return row.title;
  if (row.firstName || row.lastName) {
    return `${row.firstName || ''} ${row.lastName || ''}`.trim();
  }
  if (row.first_name || row.last_name) {
    return `${row.first_name || ''} ${row.last_name || ''}`.trim();
  }
  return '';
};

// Format field value for display
const formatFieldValue = (row, column) => {
  const value = resolveValue(row, column);
  if (value === null || value === undefined || value === '') return null;
  
  const col = typeof column === 'object' ? column : null;
  const dataType = col?.dataType;
  const isDateTime = dataType === 'Date-Time' || dataType === 'DateTime' || (typeof value === 'string' && value.includes('T'));
  
  if (value instanceof Date) {
    const d = value;
    return isDateTime
      ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(value.trim())) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return isDateTime
        ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  
  return value;
};

// Check if field is a custom field
const isCustomField = (column) => {
  if (typeof column === 'string') return false;
  // Custom fields typically have specific indicators or are not standard fields
  const standardFields = ['_id', 'id', 'name', 'title', 'first_name', 'last_name', 'firstName', 'lastName', 'email', 'phone', 'createdAt', 'updatedAt', 'created_by', 'updated_by'];
  const key = column.key || '';
  return !standardFields.includes(key.toLowerCase());
};

// Check if there are custom fields
const hasCustomFields = computed(() => {
  if (!props.row) return false;
  return visibleColumns.value.some(col => col.visible !== false && isCustomField(col));
});

// Field icon mapping
const getFieldIcon = (dataType) => {
  const iconMap = {
    'Text': DocumentTextIcon,
    'Number': DocumentTextIcon,
    'Date': CalendarIcon,
    'DateTime': CalendarIcon,
    'Picklist': TagIcon,
    'Multi-Picklist': TagIcon,
    'User': UserIcon,
    'Lookup': LinkIcon,
    'Checkbox': CheckCircleIcon,
    'URL': GlobeAltIcon,
    'Email': DocumentTextIcon,
    'Phone': DocumentTextIcon,
    'Currency': DocumentTextIcon,
    'Percent': DocumentTextIcon,
    'Status': FlagIcon,
    'Priority': FlagIcon,
    'Related': LinkIcon,
    'Parent': ArrowPathIcon
  };
  return iconMap[dataType] || DocumentTextIcon;
};
</script>

