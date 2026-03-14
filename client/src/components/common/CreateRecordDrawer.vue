<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog class="relative z-50" @close="handleDialogClose">
      <!-- Background overlay -->
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500/75 dark:bg-black/75" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <TransitionChild 
              as="template" 
              enter="transform transition ease-in-out duration-300 sm:duration-300" 
              enter-from="translate-x-full" 
              enter-to="translate-x-0" 
              leave="transform transition ease-in-out duration-300 sm:duration-300" 
              leave-from="translate-x-0" 
              leave-to="translate-x-full"
            >
              <div class="pointer-events-auto h-full flex">
                <DialogPanel
                  :class="[
                    'flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl max-w-[95vw] transition-[width] duration-200 ease-out',
                    fullMode ? 'w-[60rem]' : 'w-[30rem]'
                  ]"
                >
                <form @submit.prevent="handleSubmit" class="relative flex h-full flex-col divide-y divide-gray-200 dark:divide-gray-700">
                  <!-- Header: fixed at top -->
                  <div class="bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6 flex-shrink-0">
                    <div class="flex items-center justify-between">
                      <DialogTitle class="text-base font-semibold text-white">{{ computedTitle }}</DialogTitle>
                      <button
                        type="button"
                        class="relative rounded-md text-indigo-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                        @click="closeDrawer"
                      >
                        <span class="absolute -inset-2.5" />
                        <span class="sr-only">Close panel</span>
                        <XMarkIcon class="size-6" aria-hidden="true" />
                      </button>
                    </div>
                    <p class="mt-1 text-sm text-indigo-300">{{ computedDescription }}</p>
                  </div>

                  <!-- Body: scrollable -->
                  <div class="h-0 flex-1 overflow-y-auto">
                    <div class="px-4 sm:px-6 py-6 space-y-6">
                          <!-- General Error Message -->
                          <div v-if="errors._general" class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                            <div class="flex">
                              <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                              </div>
                              <div class="ml-3">
                                <p class="text-sm text-red-800 dark:text-red-200">{{ errors._general }}</p>
                              </div>
                            </div>
                          </div>
                          <!-- Loading when fetching Quick Create config from Settings -->
                          <div v-if="effectiveQuickCreateMode && moduleOverrideLoading && !moduleOverrideFromSettings" class="flex justify-center py-12">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                          </div>
                          <!-- Dynamic Form: moduleOverride from Settings when drawer opens so Quick Create fields match Settings -->
                          <DynamicForm
                            v-else
                            :moduleKey="moduleKey"
                            :moduleOverride="effectiveModuleOverrideForDrawer"
                            :formData="formData"
                            :errors="errors"
                            :excludeFields="effectiveExcludeFields"
                            :lockedFields="lockedFields"
                            :showAllFields="isEditing || fullMode || !effectiveQuickCreateMode"
                            :quickCreateMode="effectiveQuickCreateMode"
                            :useQuickCreateOrder="(useQuickCreateOrder || effectiveQuickCreateMode) && !fullMode"
                            :singleColumn="true"
                            :quickCreateFirstWhenExpanded="effectiveQuickCreateMode"
                            @update:formData="updateFormData"
                            @ready="onFormReady"
                          />
                          <!-- Deal relationship editor (People + Organizations) -->
                          <div v-if="moduleKey === 'deals'" class="pt-6 border-t border-gray-200 dark:border-gray-700">
                            <DealRelationshipEditor
                              ref="relationshipEditorRef"
                              v-model="dealRelationships"
                              :people="dealPeopleList"
                              :organizations="dealOrgList"
                              :read-only="false"
                            />
                          </div>
                    </div>
                  </div>

                  <!-- Footer: left toggle + right actions (same as edit drawer) -->
                  <div class="flex shrink-0 flex items-center justify-between gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <button
                      v-if="showFullModeToggle"
                      type="button"
                      class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 cursor-pointer"
                      @click="toggleFullMode"
                    >
                      {{ fullMode ? 'Back to quick create' : 'Show all fields' }}
                    </button>
                    <span v-else />
                    <div class="flex gap-3">
                      <button
                        type="button"
                        class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        @click="closeDrawer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        :disabled="saving"
                        class="inline-flex justify-center rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Save') }}
                      </button>
                    </div>
                  </div>
                </form>
              </DialogPanel>
              </div>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import DynamicForm from './DynamicForm.vue';
import DealRelationshipEditor from '@/components/deals/DealRelationshipEditor.vue';
import apiClient from '@/utils/apiClient';
import { getFieldDisplayLabel } from '@/utils/fieldDisplay';
import { getFieldDependencyState } from '@/utils/dependencyEvaluation';
import { useAuthStore } from '@/stores/auth';
import { isAuditEventType } from '@/utils/eventUtils';
import { useTabs } from '@/composables/useTabs';
import { getTaskSystemFields } from '@/platform/fields/taskFieldModel';
import { getGlobalSystemFieldKeys, normalizeFieldKeyForSystemMatch } from '@/platform/fields/fieldCapabilityEngine';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  moduleKey: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: null // Will be computed from moduleKey and record
  },
  description: {
    type: String,
    default: null // Will be computed from moduleKey and record
  },
  initialData: {
    type: Object,
    default: () => ({})
  },
  record: {
    type: Object,
    default: null // If provided, this is edit mode
  },
  excludeFields: {
    type: Array,
    default: () => [] // Fields to exclude from the form (e.g., app-specific fields)
  },
  // When true, Deal create/edit uses role-based relationship editor; contactId/accountId excluded
  useDealRelationshipEditor: {
    type: Boolean,
    default: true
  },
  lockedFields: {
    type: Array,
    default: () => [] // Fields that should be readonly/locked (e.g., ['accountId'])
  },
  quickCreateMode: {
    type: Boolean,
    default: false // If true, only show fields configured in quickCreate settings
  },
  useQuickCreateOrder: {
    type: Boolean,
    default: false // If true, use quickCreate array order even in edit mode
  }
});

const emit = defineEmits(['close', 'saved']);

const authStore = useAuthStore();
const { openTab, activeTab } = useTabs();
const isEditing = computed(() => !!props.record);
const fullMode = ref(false);

// Two modes: Quick Create Mode (only quick create fields) | Full Form Mode (all fields from config except system)
// Show toggle only when in quick create mode (limited fields)
const showFullModeToggle = computed(() => effectiveQuickCreateMode.value && !isEditing.value);

function toggleFullMode() {
  fullMode.value = !fullMode.value;
}

// Quick Create Mode: show only fields from Settings → Quick Create
// Full Form Mode: show all fields from module config (except system) in config order
const effectiveQuickCreateMode = computed(() => {
  if (isEditing.value) return false;
  if (props.quickCreateMode) return true;
  // Default to Quick Create Mode for these modules (drawer follows Settings)
  const useQuickCreateByDefault = ['organizations', 'tasks', 'items', 'deals'];
  return useQuickCreateByDefault.includes(props.moduleKey?.toLowerCase());
});

// Module name mapping for titles
const moduleNameMap = {
  'people': 'Contact',
  'organizations': 'Organization',
  'deals': 'Deal',
  'tasks': 'Task',
  'events': 'Event',
  'users': 'User'
};

const computedTitle = computed(() => {
  if (props.title) return props.title;
  const moduleName = moduleNameMap[props.moduleKey] || props.moduleKey;
  return isEditing.value ? `Edit ${moduleName}` : `New ${moduleName}`;
});

const computedDescription = computed(() => {
  if (props.description) return props.description;
  const moduleName = moduleNameMap[props.moduleKey] || props.moduleKey;
  return isEditing.value 
    ? `Update the ${moduleName.toLowerCase()} information below.`
    : `Fill in the information below to create a new ${moduleName.toLowerCase()}.`;
});

const effectiveExcludeFields = computed(() => {
  const base = props.excludeFields || [];
  // RULE: Global system fields (trash: deletedAt, deletedBy, deletionReason) never show in create/edit
  const globalSystem = getGlobalSystemFieldKeys();
  if (props.moduleKey === 'deals' && props.useDealRelationshipEditor) {
    return [...base, ...globalSystem, 'contactId', 'accountId'];
  }
  if (props.moduleKey === 'tasks') {
    const taskSystemFields = (getTaskSystemFields() || []).map((k) => String(k).toLowerCase());
    // Exclude only system fields; relatedTo and subtasks stay in DynamicForm so they appear in config order (like edit drawer)
    return [...base, ...globalSystem, 'relatedToType', 'relatedToId', ...taskSystemFields];
  }
  return [...base, ...globalSystem];
});


// Fetch module (including Quick Create from Settings) when drawer opens
async function fetchModuleForDrawer() {
  if (!props.moduleKey) return;
  moduleOverrideLoading.value = true;
  moduleOverrideFromSettings.value = null;
  try {
    const data = await apiClient.get('/modules');
    if (!data?.data || !Array.isArray(data.data)) return;
    const keyLower = (props.moduleKey || '').toLowerCase().trim();
    const mod = data.data.find((m) => (m.key || '').toLowerCase().trim() === keyLower);
    if (mod) {
      if (!mod.quickCreate) mod.quickCreate = [];
      if (!mod.quickCreateLayout) mod.quickCreateLayout = { version: 1, rows: [] };
      moduleOverrideFromSettings.value = mod;
    }
  } catch (e) {
    console.warn('[CreateRecordDrawer] Failed to fetch module for quick create:', e);
  } finally {
    moduleOverrideLoading.value = false;
  }
}

const formData = ref({ ...props.initialData });
const errors = ref({});
const saving = ref(false);
const moduleDefinition = ref(null);
const initialSnapshot = ref({});
// Module definition fetched when drawer opens so Quick Create fields come from Settings
const moduleOverrideFromSettings = ref(null);
const moduleOverrideLoading = ref(false);

// For deals: stage options must come from the selected pipeline only (not default pipeline).
// Return a stable reference when pipeline and module are unchanged to avoid recursive updates
// (DynamicForm re-applies on override change -> ready -> initializeForm -> formData -> computed -> loop).
const dealOverrideCache = { mod: null, pipelineKey: undefined, result: null };
const effectiveModuleOverrideForDrawer = computed(() => {
  const mod = moduleOverrideFromSettings.value;
  if (!mod || props.moduleKey?.toLowerCase() !== 'deals') return mod;
  const pipelineSettings = mod.pipelineSettings;
  const pipelineKey = formData.value?.pipeline;
  if (!Array.isArray(pipelineSettings) || pipelineSettings.length === 0) return mod;
  // Return cached override when module and pipeline key are unchanged
  if (dealOverrideCache.mod === mod && dealOverrideCache.pipelineKey === pipelineKey && dealOverrideCache.result)
    return dealOverrideCache.result;
  const pipeline = pipelineKey
    ? pipelineSettings.find((p) => String(p?.key ?? '').trim() === String(pipelineKey).trim())
    : null;
  const stages = pipeline?.stages ?? [];
  const stageOptions = stages.map((s) => {
    const name = (s?.name ?? '').trim();
    return name ? { value: name, label: name, color: (s.color && /^#[0-9A-Fa-f]{6}$/.test(String(s.color).trim())) ? String(s.color).trim() : null } : null;
  }).filter(Boolean);
  const fields = (mod.fields || []).map((f) => {
    if ((f?.key || '').toString().toLowerCase() !== 'stage') return f;
    return { ...f, options: stageOptions };
  });
  const result = { ...mod, fields };
  dealOverrideCache.mod = mod;
  dealOverrideCache.pipelineKey = pipelineKey;
  dealOverrideCache.result = result;
  return result;
});

// Deal relationship editor state (when moduleKey=deals)
const relationshipEditorRef = ref(null);
const dealRelationships = ref({ dealPeople: [], dealOrganizations: [] });
const dealPeopleList = ref([]);
const dealOrgList = ref([]);

// Keys that may be auto-populated by components (not user edits)
const ignoredDirtyKeys = new Set(['assignedTo']);

// Deep equality check with ability to ignore specific keys
const deepEqual = (a, b, path = []) => {
  if (a === b) return true;
  // Handle Date objects
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], path.concat(String(i)))) return false;
    }
    return true;
  }
  // Handle objects
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      // Ignore known auto-populated keys
      if (ignoredDirtyKeys.has(key)) continue;
      if (!deepEqual(a[key], b[key], path.concat(key))) return false;
    }
    return true;
  }
  // Fallback for primitives/mismatch types
  return false;
};

// Determine if any field value actually changed from initial snapshot
const isDirty = computed(() => {
  return !deepEqual(formData.value || {}, initialSnapshot.value || {});
});

const closeDrawer = () => {
  if (!saving.value) {
    fullMode.value = false;
    emit('close');
    // Reset form after closing
    setTimeout(() => {
      formData.value = {};
      errors.value = {};
      if (props.moduleKey === 'deals') {
        dealRelationships.value = { dealPeople: [], dealOrganizations: [] };
      }
    }, 300);
  }
};

// Handle dialog close (triggered by Esc or backdrop click)
const handleDialogClose = () => {
  // Allow closing if module not initialized yet (opening state) or form is clean
  if (moduleDefinition.value && isDirty.value) {
    return; // Prevent closing if form has changes
  }
  closeDrawer();
};

const updateFormData = (data) => {
  formData.value = { ...data };
};

function normalizedTaskRelatedTo(val) {
  if (!val || typeof val !== 'object') return { type: 'none', id: null };
  const id = val.id != null && typeof val.id === 'object' && val.id._id != null ? val.id._id : (val.id ?? null);
  return { type: val.type || 'none', id };
}

const initializeForm = (module) => {
  if (!module) return;
  
  const initialForm = {};
  const fields = module.fields || [];
  
  // Set defaults from field definitions
  for (const field of fields) {
    if (field.defaultValue !== null && field.defaultValue !== undefined) {
      initialForm[field.key] = field.defaultValue;
    } else {
      // Set empty defaults based on type
      if (field.dataType === 'Multi-Picklist' || field.key === 'tags') {
        initialForm[field.key] = [];
      } else if (field.dataType === 'Checkbox') {
        initialForm[field.key] = false;
      } else {
        initialForm[field.key] = '';
      }
    }
  }
  
  // If editing, merge with existing record data
  if (props.record) {
    const recordData = { ...props.record };
    
    // Handle populated relationships - convert objects to IDs
    Object.keys(recordData).forEach(key => {
      const value = recordData[key];
      if (value && typeof value === 'object' && !Array.isArray(value) && value._id) {
        recordData[key] = value._id;
      }
    });
    
    // Ensure Multi-Picklist fields are arrays
    for (const field of fields) {
      if (field.dataType === 'Multi-Picklist') {
        const value = recordData[field.key];
        if (value !== null && value !== undefined && !Array.isArray(value)) {
          recordData[field.key] = [value].filter(Boolean);
        } else if (!value) {
          recordData[field.key] = [];
        }
      }
    }
    
    // Merge record data with form defaults
    formData.value = { ...initialForm, ...recordData };
  } else {
    // For new records, merge with initialData if provided
    if (Object.keys(props.initialData).length > 0) {
      formData.value = { ...initialForm, ...props.initialData };
    } else {
      formData.value = initialForm;
    }
  }
  if (props.moduleKey === 'tasks') {
    formData.value.relatedTo = normalizedTaskRelatedTo(formData.value?.relatedTo);
    if (!Array.isArray(formData.value.subtasks)) {
      formData.value.subtasks = [];
    }
  }

};

const onFormReady = (module) => {
  if (!module) return;
  // Only initialize form on first load (when we don't have a module yet). For deals, the override
  // is updated when pipeline changes (to show the right stage options); re-initializing would reset
  // the user's pipeline selection.
  const isFirstLoad = !moduleDefinition.value;
  moduleDefinition.value = module;
  if (isFirstLoad) {
    initializeForm(module);
    initialSnapshot.value = JSON.parse(JSON.stringify(formData.value || {}));
  }
};

// Watch for record changes to re-initialize form when editing
watch(() => props.record, () => {
  if (moduleDefinition.value && props.record) {
    initializeForm(moduleDefinition.value);
  }
  if (props.moduleKey === 'deals' && props.record) {
    const r = props.record;
    dealRelationships.value = {
      dealPeople: Array.isArray(r.dealPeople) ? r.dealPeople.map((p) => ({ ...p })) : [],
      dealOrganizations: Array.isArray(r.dealOrganizations) ? r.dealOrganizations.map((o) => ({ ...o })) : []
    };
  }
}, { deep: true });

// When drawer opens: fetch module so Quick Create fields come from Settings
watch(() => [props.isOpen, props.moduleKey], ([open, key]) => {
  if (open && key) {
    fetchModuleForDrawer();
  } else {
    moduleOverrideFromSettings.value = null;
    dealOverrideCache.mod = null;
    dealOverrideCache.pipelineKey = undefined;
    dealOverrideCache.result = null;
  }
}, { immediate: true });

// Fetch people and organizations when opening deal form
watch(() => [props.isOpen, props.moduleKey], async ([open, key]) => {
  if (!open || key !== 'deals') return;
  dealRelationships.value = { dealPeople: [], dealOrganizations: [] };
  if (props.record) {
    const r = props.record;
    dealRelationships.value = {
      dealPeople: Array.isArray(r.dealPeople) ? r.dealPeople.map((p) => ({ ...p })) : [],
      dealOrganizations: Array.isArray(r.dealOrganizations) ? r.dealOrganizations.map((o) => ({ ...o })) : []
    };
  }
  try {
    const [peopleRes, orgRes] = await Promise.all([
      apiClient.get('/people', { params: { limit: 200 } }),
      apiClient.get('/v2/organization', { params: { limit: 200 } })
    ]);
    dealPeopleList.value = Array.isArray(peopleRes?.data) ? peopleRes.data : [];
    dealOrgList.value = Array.isArray(orgRes?.data) ? orgRes.data : [];
  } catch (e) {
    console.warn('[CreateRecordDrawer] Failed to fetch people/organizations for deal relationships:', e);
    dealPeopleList.value = [];
    dealOrgList.value = [];
  }
}, { immediate: true });

// Deals: when a pipeline is selected, auto-select the first stage in that pipeline
watch(() => formData.value?.pipeline, (newPipelineKey) => {
  if (props.moduleKey?.toLowerCase() !== 'deals' || !newPipelineKey) return;
  const mod = moduleOverrideFromSettings.value;
  if (!mod?.pipelineSettings?.length) return;
  const pipeline = mod.pipelineSettings.find(
    (p) => String(p?.key ?? '').trim() === String(newPipelineKey).trim()
  );
  if (!pipeline?.stages?.length) return;
  const first = pipeline.stages[0];
  const firstStageName = (first?.name ?? '').trim() || 'New';
  const prob = first?.probability ?? 0;
  if (formData.value?.stage !== firstStageName || formData.value?.probability !== prob) {
    formData.value = { ...formData.value, stage: firstStageName, probability: prob };
  }
});

// Deals: when the stage is selected, set probability from the pipeline's stage config
watch(() => formData.value?.stage, (newStage) => {
  if (props.moduleKey?.toLowerCase() !== 'deals' || !newStage || !formData.value?.pipeline) return;
  const mod = moduleOverrideFromSettings.value;
  if (!mod?.pipelineSettings?.length) return;
  const pipeline = mod.pipelineSettings.find(
    (p) => String(p?.key ?? '').trim() === String(formData.value.pipeline).trim()
  );
  if (!pipeline?.stages?.length) return;
  const stageName = String(newStage).trim();
  const stageConfig = pipeline.stages.find((s) => (s?.name ?? '').trim() === stageName);
  if (stageConfig == null) return;
  const prob = typeof stageConfig.probability === 'number' ? stageConfig.probability : (stageConfig.probability ?? 0);
  if (formData.value?.probability !== prob) {
    formData.value = { ...formData.value, probability: prob };
  }
});

// Watch for form data changes and clear errors for fields that are now valid
watch(() => formData.value, (newFormData, oldFormData) => {
  if (!moduleDefinition.value || !oldFormData) return;
  
  // Check which fields have changed
  const changedFields = new Set();
  for (const key in newFormData) {
    if (newFormData[key] !== oldFormData[key]) {
      changedFields.add(key);
    }
  }
  
  // For each changed field that has an error, check if it's now valid
  for (const fieldKey of changedFields) {
    if (errors.value[fieldKey]) {
      const value = newFormData[fieldKey];
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     (Array.isArray(value) && value.length === 0);
      
      // If field is no longer empty and has an error, clear it
      // This handles both client-side validation errors and backend validation errors
      if (!isEmpty) {
        delete errors.value[fieldKey];
      }
    }
  }
}, { deep: true });

const handleSubmit = async () => {
  console.log('[CreateRecordDrawer] 🚀 handleSubmit called', {
    moduleKey: props.moduleKey,
    isEditing: isEditing.value,
    formDataKeys: Object.keys(formData.value)
  });
  
  errors.value = {};
  saving.value = true;

  try {
    // Client-side validation (like ContactFormModal)
    if (moduleDefinition.value?.fields) {
      // System fields that are auto-set by backend (status only for Events; Tasks status can be required)
      // RULE: Global system fields (trash: deletedAt, deletedBy, deletionReason) never show in create/edit
      const systemFieldKeys = [
        'organizationid',
        'createdby',
        'createdat',
        'updatedat',
        '_id',
        '__v',
        'activitylogs',
        ...getGlobalSystemFieldKeys(),
        ...(props.moduleKey === 'events' ? ['status'] : [])
      ];
      
      const allFields = moduleDefinition.value.fields || [];

      // Get effective required fields (dependency-driven), excluding system fields
      const requiredFields = allFields.filter(f => {
        const keyNorm = normalizeFieldKeyForSystemMatch(f.key);
        if (!f.key || systemFieldKeys.includes(keyNorm)) return false;
        const depState = getFieldDependencyState(f, formData.value, allFields);
        // Only validate when visible and required
        return depState.required === true && depState.visible !== false;
      });
      
      // Validate each required field
      for (const field of requiredFields) {
        const value = formData.value[field.key];
        const isEmpty = value === null || 
                       value === undefined || 
                       value === '' || 
                       (Array.isArray(value) && value.length === 0);
        
        if (isEmpty) {
          errors.value[field.key] = `${getFieldDisplayLabel(field) || field.key} is required`;
        }
      }
      
      // If validation fails, stop here
      if (Object.keys(errors.value).length > 0) {
        console.log('[CreateRecordDrawer] ❌ Validation failed:', errors.value);
        saving.value = false;
        return;
      }
    }

    // Deal relationship validation (one primary contact, one active customer org)
    if (props.moduleKey === 'deals' && props.useDealRelationshipEditor && relationshipEditorRef.value) {
      const relValid = relationshipEditorRef.value.validate();
      if (!relValid) {
        saving.value = false;
        return;
      }
    }
    
    console.log('[CreateRecordDrawer] ✅ Validation passed, proceeding with submission...');
    
    // ARCHITECTURE NOTE: In Quick Create mode, only send fields that are in quickCreate configuration
    // This ensures the API only receives fields configured in Settings → Core Modules → Tasks → Quick Create
    // See: docs/architecture/task-settings.md Section 3.5
    let submitData = { ...formData.value };
    
    if (effectiveQuickCreateMode.value && moduleDefinition.value?.quickCreate) {
      const quickCreateKeys = new Set(
        (moduleDefinition.value.quickCreate || []).map(k => k?.toLowerCase().trim()).filter(Boolean)
      );
      
      // Fields that are always required by the API (even if not in quickCreate)
      // These are API-level requirements, not user-facing fields
      const apiRequiredFields = new Set([
        'type',           // Required by Scheduling API (task/event)
        'entitytype',     // Required by Scheduling API
        'entityid',       // Required by Scheduling API
        'ownerpersonid',  // May be set from assignedTo mapping
        'assignedto'      // Required by Task API - auto-assigned to current user
      ]);
      
      // Filter submitData to only include fields in quickCreate configuration + API required fields
      const filteredData = {};
      for (const [key, value] of Object.entries(submitData)) {
        const keyLower = key.toLowerCase();
        // Include if in quickCreate OR if it's an API-required field
        if (quickCreateKeys.has(keyLower) || apiRequiredFields.has(keyLower)) {
          filteredData[key] = value;
        }
      }
      
      console.log('[CreateRecordDrawer] 🔍 Quick Create mode - filtering fields:', {
        before: Object.keys(submitData),
        after: Object.keys(filteredData),
        quickCreateKeys: Array.from(quickCreateKeys),
        apiRequiredFields: Array.from(apiRequiredFields),
        filteredOut: Object.keys(submitData).filter(k => {
          const keyLower = k.toLowerCase();
          return !quickCreateKeys.has(keyLower) && !apiRequiredFields.has(keyLower);
        })
      });
      
      submitData = filteredData;
    }
    
    // Debug: Log formData for events before cleaning
    if (props.moduleKey === 'events') {
      console.log('[CreateRecordDrawer] formData.value before cleaning:', {
        linkedFormId: formData.value.linkedFormId,
        relatedToId: formData.value.relatedToId,
        eventType: formData.value.eventType,
        allKeys: Object.keys(formData.value)
      });
    }
    
    // Convert kebab-case field keys to camelCase for events module
    // Backend expects camelCase (linkedFormId, relatedToId) but form might use kebab-case (linked-form-id, related-to-id)
    if (props.moduleKey === 'events') {
      // Map of kebab-case to camelCase for event fields
      const keyMappings = {
        'linked-form-id': 'linkedFormId',
        'related-to-id': 'relatedToId',
        'event-owner-id': 'eventOwnerId',
        'auditor-id': 'auditorId',
        'reviewer-id': 'reviewerId',
        'corrective-owner-id': 'correctiveOwnerId',
        'allow-self-review': 'allowSelfReview',
        'start-date-time': 'startDateTime',
        'end-date-time': 'endDateTime'
      };

      // Also normalize lowercased keys that can come from saved module definitions (defensive)
      const lowercaseMappings = {
        eventownerid: 'eventOwnerId',
        auditorid: 'auditorId',
        reviewerid: 'reviewerId',
        correctiveownerid: 'correctiveOwnerId',
        allowselfreview: 'allowSelfReview',
        linkedformid: 'linkedFormId',
        relatedtoid: 'relatedToId',
        startdatetime: 'startDateTime',
        enddatetime: 'endDateTime'
      };
      
      // Convert kebab-case keys to camelCase
      for (const [kebabKey, camelKey] of Object.entries(keyMappings)) {
        if (submitData[kebabKey] !== undefined) {
          // If camelCase version doesn't exist or is empty, use kebab-case value
          if (!submitData[camelKey] || submitData[camelKey] === '') {
            submitData[camelKey] = submitData[kebabKey];
          }
          // Remove kebab-case version
          delete submitData[kebabKey];
        }
      }

      // Convert lowercase keys to camelCase equivalents
      for (const [lowerKey, camelKey] of Object.entries(lowercaseMappings)) {
        if (submitData[lowerKey] !== undefined) {
          if (submitData[camelKey] === undefined || submitData[camelKey] === '') {
            submitData[camelKey] = submitData[lowerKey];
          }
          delete submitData[lowerKey];
        }
      }
      
    }
    
    // Strip system-controlled fields
    delete submitData.createdBy;
    delete submitData.organizationId;
    delete submitData.organizationid;
    delete submitData.createdAt;
    delete submitData.updatedAt;
    delete submitData._id;
    delete submitData.__v;
    
    // Strip status field for events (system-controlled)
    if (props.moduleKey === 'events') {
      if (submitData.status !== undefined) {
        console.log('[CreateRecordDrawer] ⚠️ Stripping status field from event payload:', submitData.status);
        delete submitData.status;
      }
      
      // ARCHITECTURE NOTE: Prevent audit event creation through generic event creation interfaces.
      // Audit events require complex configuration (roles, forms, geo) and must be created
      // through Audit application flows, not generic event creation interfaces.
      // See: docs/architecture/event-settings.md Section 7 (Quick Create Rules)
      if (submitData.eventType && isAuditEventType(submitData.eventType)) {
        errors.value._general = `Audit events (${submitData.eventType}) can only be created through the Audit application. Please use the Audit module to create audit events.`;
        saving.value = false;
        return;
      }
    }
    
    // Handle nested object conflicts (e.g., 'settings' and 'settings.primaryColor')
    // Remove parent keys if nested dot-notation keys exist to avoid Mongoose conflicts
    const keysToRemove = [];
    const nestedKeys = Object.keys(submitData).filter(key => key.includes('.'));
    
    // For each nested key (e.g., 'settings.primaryColor'), check if parent exists
    for (const nestedKey of nestedKeys) {
      const parentKey = nestedKey.split('.')[0];
      if (submitData[parentKey] && typeof submitData[parentKey] === 'object') {
        // Parent object exists and we have nested keys - remove parent to avoid conflict
        if (!keysToRemove.includes(parentKey)) {
          keysToRemove.push(parentKey);
        }
      }
    }
    
    // Remove conflicting parent keys
    for (const key of keysToRemove) {
      delete submitData[key];
    }
    
    // Handle organization field - ensure it's an ObjectId string, not an object
    if (submitData.organization && typeof submitData.organization === 'object') {
      submitData.organization = submitData.organization._id || submitData.organization;
    }
    
    // Convert empty strings to null for optional fields
    // Preserve organization, linkedFormId, and relatedToId if they're explicitly set (even if empty string)
    // These fields should be sent as null rather than being deleted
    const preservedFields = ['organization', 'linkedFormId', 'relatedToId'];
    for (const key in submitData) {
      if (submitData[key] === '' && !preservedFields.includes(key)) {
        submitData[key] = null;
      }
    }
    
    // For preserved fields, convert empty strings to null but keep them in the payload
    for (const field of preservedFields) {
      if (submitData[field] === '') {
        submitData[field] = null;
      }
    }
    
    // Log the submit data for events to debug linkedFormId/relatedToId
    if (props.moduleKey === 'events') {
      console.log('[CreateRecordDrawer] Submitting event data:', {
        linkedFormId: submitData.linkedFormId,
        relatedToId: submitData.relatedToId,
        eventType: submitData.eventType,
        allKeys: Object.keys(submitData)
      });
    }
    
    // Remove slug field for CRM organizations (not needed - only tenants use slugs)
    // The backend pre-save hook only generates slugs for tenant organizations
    if (props.moduleKey === 'organizations') {
      delete submitData.slug;
    }

    // Deal role-based relationships: use dealPeople/dealOrganizations, remove legacy contactId/accountId
    if (props.moduleKey === 'deals' && props.useDealRelationshipEditor) {
      delete submitData.contactId;
      delete submitData.accountId;
      const norm = (id) => (id && typeof id === 'object' && id._id) ? id._id : id;
      const people = (dealRelationships.value?.dealPeople || []).map((p) => ({
        personId: norm(p.personId),
        role: p.role,
        isPrimary: !!p.isPrimary,
        isActive: p.isActive !== false,
        addedAt: p.addedAt || new Date(),
        addedBy: p.addedBy || null
      }));
      const orgs = (dealRelationships.value?.dealOrganizations || []).map((o) => ({
        organizationId: norm(o.organizationId),
        role: o.role,
        isPrimary: !!o.isPrimary,
        isActive: o.isActive !== false,
        addedAt: o.addedAt || new Date(),
        addedBy: o.addedBy || null
      }));
      submitData.dealPeople = people;
      submitData.dealOrganizations = orgs;
    }
    
    // Determine API endpoint based on module key
    // Note: apiClient already prepends /api, so we don't include it here
    let endpoint = '';
    const moduleEndpointMap = {
      'people': '/people',
      'organizations': '/v2/organization',
      'deals': '/deals',
      'tasks': '/tasks',
      'events': '/events',
      'users': '/users'
    };
    
    endpoint = moduleEndpointMap[props.moduleKey] || `/${props.moduleKey}`;
    
    // Remove legacyOrganizationId if it's null to avoid unique index conflicts
    if (props.moduleKey === 'organizations' && (submitData.legacyOrganizationId === null || submitData.legacyOrganizationId === undefined)) {
      delete submitData.legacyOrganizationId;
    }
    
    // For tasks, ensure default status, normalized relatedTo, and strip system fields
    if (props.moduleKey === 'tasks') {
      const taskSystemKeys = new Set((getTaskSystemFields() || []).map((k) => String(k).toLowerCase()));
      Object.keys(submitData).forEach((key) => {
        if (taskSystemKeys.has(key.toLowerCase())) delete submitData[key];
      });
      if (!submitData.status) submitData.status = 'todo';
      const rt = normalizedTaskRelatedTo(formData.value?.relatedTo);
      submitData.relatedTo = rt.type === 'none' ? { type: 'none', id: null } : { type: rt.type, id: rt.id || null };
      delete submitData.relatedToType;
      delete submitData.relatedToId;
    }
    
    // For events using Scheduling API, inject required fields
    if (props.moduleKey === 'events' && endpoint === '/scheduling') {
      submitData.type = 'event';
      
      // For standalone events (no entityType/entityId provided), use Organization as default entity
      if (!submitData.entityType || !submitData.entityId) {
        const organizationId = authStore.user?.organizationId;
        if (organizationId) {
          submitData.entityType = 'Organization';
          submitData.entityId = organizationId;
        }
      }
      
      // Map startDateTime to startDate (Scheduling uses startDate for events)
      if (submitData.startDateTime && !submitData.startDate) {
        submitData.startDate = submitData.startDateTime;
        delete submitData.startDateTime;
      }
      
      // Map endDateTime to dueDate (Scheduling uses dueDate as end date for events)
      if (submitData.endDateTime && !submitData.dueDate) {
        submitData.dueDate = submitData.endDateTime;
        delete submitData.endDateTime;
      }
      
      // Map assignedTo to ownerPersonId if needed
      if (submitData.assignedTo && !submitData.ownerPersonId) {
        submitData.ownerPersonId = submitData.assignedTo;
      }
      // Remove assignedTo as Scheduling API doesn't use it
      delete submitData.assignedTo;
    }
    
    console.log('[CreateRecordDrawer] 📤 Making API call:', {
      method: isEditing.value ? 'PUT' : 'POST',
      endpoint: isEditing.value ? `${endpoint}/${props.record._id}` : endpoint,
      payloadKeys: Object.keys(submitData)
    });
    
    let response;
    if (isEditing.value && props.record?._id) {
      // Update existing record
      response = await apiClient.put(`${endpoint}/${props.record._id}`, submitData);
    } else {
      // Create new record
      response = await apiClient.post(endpoint, submitData);
    }
    
    console.log('[CreateRecordDrawer] 📥 API response:', {
      success: response.success,
      hasData: !!response.data,
      errors: response.errors,
      message: response.message
    });
    
    if (response.success || response.data) {
      console.log('[CreateRecordDrawer] ✅ Success! Closing drawer...');
      saving.value = false; // Reset saving state before closing
      
      const savedRecord = response.data || response;
      
      // Always open the saved record in a new tab
      if (savedRecord) {
        const recordId = savedRecord._id || savedRecord.id || savedRecord.eventId;
        
        if (recordId) {
          // Get record title/name based on module type
          let recordTitle = '';
          const moduleTitleMap = {
            'people': () => {
              const firstName = savedRecord.first_name || '';
              const lastName = savedRecord.last_name || '';
              return firstName || lastName ? `${firstName} ${lastName}`.trim() : savedRecord.email || 'Contact';
            },
            'organizations': () => savedRecord.name || 'Organization',
            'deals': () => savedRecord.name || 'Deal',
            'tasks': () => savedRecord.title || 'Task',
            'events': () => savedRecord.eventName || savedRecord.title || 'Event',
            'users': () => savedRecord.firstName && savedRecord.lastName 
              ? `${savedRecord.firstName} ${savedRecord.lastName}`.trim()
              : savedRecord.email || savedRecord.username || 'User'
          };
          
          const getTitle = moduleTitleMap[props.moduleKey];
          if (getTitle) {
            recordTitle = getTitle();
          } else {
            recordTitle = savedRecord.name || savedRecord.title || moduleNameMap[props.moduleKey] || 'Record';
          }
          
          // Get record path based on module
          const modulePathMap = {
            'people': `/people/${recordId}`,
            'organizations': `/organizations/${recordId}`,
            'deals': `/deals/${recordId}`,
            'tasks': `/tasks/${recordId}`,
            'events': `/events/${recordId}`,
            'users': `/users/${recordId}`
          };
          
          const recordPath = modulePathMap[props.moduleKey] || `/${props.moduleKey}/${recordId}`;
          
          // Get icon based on module
          const moduleIconMap = {
            'people': 'users',
            'organizations': 'building',
            'deals': 'briefcase',
            'tasks': 'check',
            'events': '📅',
            'users': 'user'
          };
          
          const icon = moduleIconMap[props.moduleKey] || 'document';
          
          // Check if we're already viewing this record
          const currentPath = activeTab.value?.path || '';
          const isAlreadyViewing = currentPath === recordPath || currentPath.includes(`/${recordId}`);
          
          // Open tab with the saved record (always for new records, or if not already viewing for edits)
          if (!isEditing.value || !isAlreadyViewing) {
            openTab(recordPath, {
              title: recordTitle,
              icon: icon,
              insertAdjacent: true
            });
          }
        }
      }
      
      // Dispatch global event to refresh calendar/list views for events
      if (props.moduleKey === 'events' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('litedesk:event-created', {
          detail: { event: savedRecord }
        }));
      }
      
      // Dispatch global event to refresh list views for all modules
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('litedesk:record-created', {
          detail: { moduleKey: props.moduleKey, record: savedRecord }
        }));
      }
      
      emit('saved', savedRecord);
      closeDrawer();
    } else {
      console.log('[CreateRecordDrawer] ❌ Failed:', response);
      errors.value = response.errors || { _general: response.message || `Failed to ${isEditing.value ? 'update' : 'create'} record` };
      saving.value = false;
    }
  } catch (error) {
    console.error('Error creating record:', error);
    console.error('Error response data:', error.response?.data);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Reset errors
    errors.value = {};
    
    // Handle validation errors from API
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // Check for field-specific errors (preferred format)
      if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors) && Object.keys(errorData.errors).length > 0) {
        // Set field-specific errors
        errors.value = { ...errorData.errors };
        
        // Don't show general message if we have field-specific errors
        // Field errors will be shown next to each field via DynamicFormField
      } 
      // Check for error field first (it's usually more specific than generic message)
      // Some APIs use 'error' instead of 'message', and it often contains the actual error
      else if (errorData.error) {
        // Check if error message contains validation info that we can parse
        if (errorData.error.includes('validation failed')) {
          const validationErrors = {};
          
          // Parse error message like "People validation failed: type: Path `type` is required."
          // Pattern: "field: Path `field` is required."
          const requiredPattern = /(\w+):\s*Path\s+`(\w+)`\s+is\s+required\.?/gi;
          let match;
          while ((match = requiredPattern.exec(errorData.error)) !== null) {
            const fieldName = match[1] || match[2];
            validationErrors[fieldName] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
          }
          
          // Pattern: "field: error message" (general format)
          if (Object.keys(validationErrors).length === 0) {
            const parts = errorData.error.split(/validation failed:\s*/i);
            if (parts.length > 1) {
              const errorPart = parts[1];
              const fieldMatches = errorPart.match(/(\w+):\s*(.+?)(?:,|$)/g);
              if (fieldMatches) {
                fieldMatches.forEach(fieldMatch => {
                  const fieldParts = fieldMatch.match(/(\w+):\s*(.+)/);
                  if (fieldParts) {
                    const fieldName = fieldParts[1];
                    let errorMsg = fieldParts[2].trim();
                    // Clean up common Mongoose error phrases
                    errorMsg = errorMsg.replace(/^Path\s+`\w+`\s+/, '');
                    errorMsg = errorMsg.replace(/\.$/, '');
                    validationErrors[fieldName] = errorMsg;
                  }
                });
              }
            }
          }
          
          if (Object.keys(validationErrors).length > 0) {
            errors.value = validationErrors;
          } else {
            errors.value._general = errorData.error;
          }
        } else {
          errors.value._general = errorData.error;
        }
      }
      // Check for message in error data (if error field wasn't present)
      else if (errorData.message) {
        // Show the message, but prefer it over generic "Error creating record"
        // If it's "Validation failed. Please check the fields below." that's good
        if (errorData.message.includes('Validation failed') || errorData.message.includes('check the fields')) {
          errors.value._general = errorData.message;
        } else if (errorData.message !== 'Error creating record.' && errorData.message !== 'Error updating record.') {
          errors.value._general = errorData.message;
        } else {
          // If it's the generic message, show helpful message
          errors.value._general = 'Please fill in all required fields and try again.';
        }
      }
      // Fallback - try to parse the error message for validation hints
      else {
        const errorMsg = error.message || '';
        // If error message mentions validation or required fields, show helpful message
        if (errorMsg.toLowerCase().includes('validation') || errorMsg.toLowerCase().includes('required')) {
          errors.value._general = 'Please fill in all required fields and try again.';
        } else {
          errors.value._general = `Failed to ${isEditing.value ? 'update' : 'create'} record. Please check your input.`;
        }
      }
    } else {
      // Generic error message if no response data
      const errorMsg = error.message || '';
      if (errorMsg.toLowerCase().includes('validation') || errorMsg.toLowerCase().includes('required')) {
        errors.value._general = 'Please fill in all required fields and try again.';
      } else {
        errors.value._general = errorMsg || `Failed to ${isEditing.value ? 'update' : 'create'} record. Please try again.`;
      }
    }
    
    // If we still don't have any errors set, set a default
    if (Object.keys(errors.value).length === 0) {
      errors.value._general = 'Please fill in all required fields and try again.';
    }
  } finally {
    saving.value = false;
  }
};

// Reset form when drawer opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    fullMode.value = false;
    errors.value = {};
    // Capture an initial snapshot immediately on open to avoid race with module load
    initialSnapshot.value = JSON.parse(JSON.stringify(formData.value || {}));
    // Form will be initialized by onFormReady when module loads
  } else {
    // Reset when closed
    setTimeout(() => {
      formData.value = {};
      errors.value = {};
    }, 300);
  }
});
</script>
