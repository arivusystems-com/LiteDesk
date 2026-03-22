<!--
  ============================================================================
  ARCHITECTURAL INVARIANT: PEOPLE QUICK CREATE DRAWER
  ============================================================================
  
  CONFIG-DRIVEN + CONTEXT-AWARE:
  - Quick create fields: getPeopleQuickCreateFields(module) — Settings → People → Quick Create
  - context: 'ALL' | 'SALES' | 'HELPDESK' — determines UI and submission
  
  ALL CONTEXTS: Quick create fields always visible (identity creation)
  
  APP CONTEXT (when context !== 'ALL'):
  - Divider: "{AppName} Information"
  - Type (required): usePeopleTypes(context), auto-select first
  - Dependent fields: getAppFields(context, role) — role-specific participation fields
  - UX hint: "This person will be added to {AppName} as {SelectedType}"
  - Submission: POST /people/create { quickCreate fields, appKey, role }
  
  CONSTRAINTS: No hardcoded SALES, no hardcoded core fields, no submit without role in app context.
  
  ============================================================================
-->

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
              <DialogPanel :class="drawerPanelClass">
                <form @submit.prevent="handleSubmit" class="relative flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
                  <!-- Fixed Header -->
                  <div class="flex-shrink-0 bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6 border-b border-indigo-600 dark:border-indigo-700">
                    <div class="flex items-center justify-between">
                      <DialogTitle class="text-base font-semibold text-white">
                        Create Person
                      </DialogTitle>
                      <div class="ml-3 flex h-7 items-center">
                        <button 
                          type="button" 
                          class="relative rounded-md text-indigo-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" 
                          @click="closeDrawer"
                        >
                          <span class="absolute -inset-2.5"></span>
                          <span class="sr-only">Close panel</span>
                          <XMarkIcon class="size-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                      <div class="mt-1">
                        <p class="text-sm text-indigo-300">
                          {{ helperText }}
                        </p>
                        <!-- App context hint: "This person will be added to Sales as [Lead]" -->
                        <p v-if="appContextHint" class="text-xs text-indigo-200 dark:text-indigo-300 mt-2">
                          {{ appContextHint }}
                        </p>
                        <p v-else-if="!appKey" class="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          Creates identity only. No app participation.
                        </p>
                      </div>
                  </div>

                  <!-- Scrollable Content Area -->
                  <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    <div class="px-4 sm:px-6 py-6 pb-48">
                      <div class="space-y-6">
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
                        
                        <!-- STEP 1: Core fields (always visible) -->
                        <div v-if="peopleModuleLoading" class="flex justify-center py-12">
                          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                        <template v-else-if="peopleModuleOverride">
                          <!-- Quick create fields (configurable via Settings → People → Quick Create) -->
                          <DynamicForm
                            moduleKey="people"
                            :formData="formData"
                            :errors="errors"
                            :quickCreateMode="true"
                            :showAllFields="false"
                            :fieldsOverride="quickCreateFieldsOverride"
                            :moduleOverride="peopleModuleOverride"
                            context="platform"
                            @update:formData="updateFormData"
                            @ready="onFormReady"
                          />

                          <!-- App section (generic, no hardcoded apps) -->
                          <AppSection
                            v-if="appKey"
                            :app-key="appKey"
                            v-model="appForm"
                            :module-override="peopleModuleOverride"
                            :errors="errors"
                          />
                        </template>
                        <p v-else class="text-sm text-amber-600 dark:text-amber-400">
                          Could not load People module. Please try again.
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Fixed Footer -->
                  <div class="flex-shrink-0 flex justify-end gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
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
                        :disabled="saving || submitDisabled" 
                        class="inline-flex justify-center rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {{ saving ? 'Saving...' : 'Save' }}
                      </button>
                    </div>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
// Type declaration for process.env (used in DEV-ONLY guards)
declare const process: {
  env: {
    NODE_ENV: string;
  };
};

import { ref, computed, watch, toRef, type PropType } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import DynamicForm from '@/components/common/DynamicForm.vue';
import AppSection from '@/components/people/AppSection.vue';
import apiClient from '@/utils/apiClient';
import { useTabs } from '@/composables/useTabs';
import { useCreationContext } from '@/utils/creationContext';
import { getPeopleQuickCreateFields, getAppFields } from '@/platform/fields/peopleFieldModel';
import { getAppLabel } from '@/utils/getRoleDisplay';
import { usePeopleTypes } from '@/composables/usePeopleTypes';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  /**
   * Creation context app key (OPTIONAL)
   * When 'SALES': create→attach flow with type selection.
   * When 'HELPDESK': create→attach for Helpdesk.
   * When null/undefined: identity-only POST /people.
   */
  /**
   * null = explicit global (no AppSection on People "All People", ignoring shell active app).
   * undefined (omit prop) = infer from route + activeApp on /people.
   */
  contextAppKey: {
    type: String as PropType<string | null | undefined>,
    required: false,
    default: undefined
  }
});

const emit = defineEmits(['close', 'saved']);

const { openTab } = useTabs();

// Creation context: appKey is null for global, 'SALES'|'HELPDESK' for app-specific
const { appKey } = useCreationContext(toRef(props, 'contextAppKey'));

const { typeDefs: peopleTypeDefs } = usePeopleTypes(appKey);

// App form state (participation type + dependent fields) — used by AppSection
const appForm = ref<Record<string, any>>({ participationType: null });

// People module fetched with context=platform when drawer opens (ensures Settings Quick Create always used)
const peopleModuleOverride = ref<any>(null);
const peopleModuleLoading = ref(false);

// Fetch people module from quick-create endpoint (single source: Settings → People → Quick Create).
watch(() => props.isOpen, async (open) => {
  if (!open) {
    peopleModuleOverride.value = null;
    peopleModuleLoading.value = false;
    appForm.value = { participationType: null };
    return;
  }
  peopleModuleLoading.value = true;
  peopleModuleOverride.value = null;
  try {
    const res = await apiClient.get('/modules/people/quick-create');
    if (res?.success && res?.data) {
      const mod = res.data;
      if (!mod.quickCreate) mod.quickCreate = [];
      if (!mod.quickCreateLayout) mod.quickCreateLayout = { version: 1, rows: [] };
      peopleModuleOverride.value = mod;
    }
  } catch (e) {
    console.error('[PeopleQuickCreateDrawer] Failed to fetch people module:', e);
  } finally {
    peopleModuleLoading.value = false;
  }
}, { immediate: true });

// Form state
const formData = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const saving = ref(false);
const moduleDefinition = ref<any>(null);

// Quick create fields from config (Settings → People → Quick Create)
const quickCreateFieldsOverride = computed(() =>
  getPeopleQuickCreateFields(peopleModuleOverride.value)
);

// App-dependent fields for validation/payload (when in app context)
const appDependentFields = computed(() => {
  if (!appKey.value || !appForm.value?.participationType) return [];
  return getAppFields(appKey.value, appForm.value.participationType, peopleTypeDefs.value);
});

// UX hint: "This person will be added to {AppName} as {Role}"
const appContextHint = computed(() => {
  if (appKey.value && appForm.value?.participationType) {
    return `This person will be added to ${getAppLabel(appKey.value)} as ${appForm.value.participationType}`;
  }
  return null;
});

// Prevent submit when app context but no role selected
const submitDisabled = computed(() =>
  !!appKey.value && !appForm.value?.participationType
);

// Helper text
const helperText = computed(() => {
  if (!appKey.value) {
    return 'Create a new person with identity information.';
  }
  return 'Create a new person with identity and app participation.';
});

// Drawer panel class
const drawerPanelClass = 'pointer-events-auto w-screen max-w-2xl h-full';

/**
 * Validate quick create + app fields (required in form from module)
 */
function validateForm() {
  errors.value = {};
  if (!moduleDefinition.value?.fields) return;

  const moduleFields = moduleDefinition.value.fields as any[];
  const qcFields = quickCreateFieldsOverride.value;
  const appFields = appDependentFields.value;

  for (const field of moduleFields) {
    if (!field.key) continue;
    const isQcField = qcFields.includes(field.key);
    const isAppField = appFields.includes(field.key);
    if (!isQcField && !isAppField) continue;

    const source = isQcField ? formData.value : appForm.value;
    if (field.required === true && field.key in source) {
      const value = source[field.key];
      const isEmpty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        (errors.value as Record<string, string>)[field.key] = `${field.label || field.key} is required`;
      }
    }
  }
  if (appKey.value && !appForm.value?.participationType) {
    (errors.value as Record<string, string>).participationType = 'Type is required';
  }
}

const closeDrawer = () => {
  if (!saving.value) {
    emit('close');
    // Reset form after closing
    setTimeout(() => {
      formData.value = {};
      appForm.value = { participationType: null };
      errors.value = {};
    }, 300);
  }
};

const handleDialogClose = () => {
  closeDrawer();
};

const updateFormData = (data: Record<string, any>) => {
  formData.value = { ...data };
};

const onFormReady = (module: any) => {
  moduleDefinition.value = module;
  const allFieldKeys = [...quickCreateFieldsOverride.value];
  const initialForm: Record<string, any> = {};
  if (module?.fields) {
    for (const field of module.fields) {
      if (allFieldKeys.includes(field.key)) {
        if (field.defaultValue !== null && field.defaultValue !== undefined) {
          initialForm[field.key] = field.defaultValue;
        } else if (field.dataType === 'Multi-Picklist' || field.key === 'tags') {
          initialForm[field.key] = [];
        } else if (field.dataType === 'Checkbox') {
          initialForm[field.key] = false;
        } else {
          initialForm[field.key] = '';
        }
      }
    }
  }
  formData.value = { ...initialForm };
};

watch(formData, (newVal, oldVal) => {
  if (!oldVal) return;
  for (const key in newVal) {
    if (newVal[key] !== oldVal[key] && errors.value[key]) {
      const v = newVal[key];
      if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) {
        delete errors.value[key];
      }
    }
  }
}, { deep: true });

watch(appForm, (newVal, oldVal) => {
  if (!oldVal) return;
  for (const key in newVal) {
    if (newVal[key] !== oldVal[key] && errors.value[key]) {
      const v = newVal[key];
      if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) {
        delete errors.value[key];
      }
    }
  }
}, { deep: true });

/**
 * Build payload: context ALL → quick create only; context app → quick create + app fields
 */
function buildCreatePersonPayload(): Record<string, any> {
  const payload: Record<string, any> = {};
  const qcFields = quickCreateFieldsOverride.value;
  const appFields = appDependentFields.value;

  for (const field of qcFields) {
    if (field in formData.value) {
      const value = formData.value[field];
      if (Array.isArray(value)) {
        if (value.length > 0) payload[field] = value;
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') payload[field] = trimmed;
      } else if (value !== null && value !== undefined) {
        payload[field] = value;
      }
    }
  }

  for (const field of appFields) {
    if (field in appForm.value) {
      const value = appForm.value[field];
      if (Array.isArray(value)) {
        if (value.length > 0) payload[field] = value;
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') payload[field] = trimmed;
      } else if (value !== null && value !== undefined) {
        payload[field] = value;
      }
    }
  }

  return payload;
}

/**
 * Handle form submission (context-driven)
 * ALL: POST /people (core fields only)
 * SALES/HELPDESK: POST /people/create (quick create fields + app fields, appKey + role)
 */
const handleSubmit = async () => {
  errors.value = {};
  saving.value = true;

  try {
    validateForm();
    if (Object.keys(errors.value).length > 0) {
      saving.value = false;
      return;
    }

    const payload = buildCreatePersonPayload();

    let response;
    if (!appKey.value) {
      response = await apiClient.post('/people', payload);
    } else {
      const requestBody = {
        appKey: appKey.value,
        role: appForm.value.participationType,
        formData: payload
      };
      response = await apiClient.post('/people/create', requestBody);
    }
      
      if (response.success) {
        console.log('[PeopleQuickCreate] ✅ Person created successfully');
        const createdPerson = response.data;
        
        // Open the newly created record in a new tab
        const personId = createdPerson._id || createdPerson.id;
        if (personId) {
          const firstName = createdPerson.first_name || '';
          const lastName = createdPerson.last_name || '';
          const title = firstName || lastName 
            ? `${firstName} ${lastName}`.trim() 
            : 'Person Detail';
          
          openTab(`/people/${personId}`, {
            title,
            icon: 'users',
            params: { name: title },
            insertAdjacent: true
          });
        }
        
        emit('saved', createdPerson);
        
        // Dispatch global event to refresh list views
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('litedesk:record-created', {
            detail: { moduleKey: 'people', record: createdPerson }
          }));
        }
        
        saving.value = false; // Reset saving state before closing
        closeDrawer();
      } else {
        if (response.errors) {
          errors.value = { ...errors.value, ...response.errors };
        } else {
          errors.value._general = response.message || 'Failed to create contact';
        }
        saving.value = false;
      }
    
  } catch (error: unknown) {
    const err = error as any;
    console.error('[PeopleQuickCreate] ❌ Error creating person:', error);
    console.error('[PeopleQuickCreate] Error details:', {
      message: err?.message,
      error: error,
      response: err?.response?.data,
      responseData: err?.response?.data,
      status: err?.response?.status,
      statusText: err?.response?.statusText,
      fullError: JSON.stringify(error, null, 2)
    });
    
    // If we have a response with error details, show them
    if (err?.response?.data?.error) {
      console.error('[PeopleQuickCreate] Server error message:', err.response.data.error);
    }
    
    // Handle validation errors from API
    if (err?.response?.data?.errors) {
      errors.value = { ...errors.value, ...err.response.data.errors };
    } else if (err?.response?.data?.message) {
      (errors.value as Record<string, string>)._general = err.response.data.message;
    } else if (err?.response?.data?.error) {
      // Backend might return error in 'error' field
      (errors.value as Record<string, string>)._general = err.response.data.error;
    } else {
      (errors.value as Record<string, string>)._general = err?.message || 'Failed to create contact';
    }
  } finally {
    saving.value = false;
  }
};

// Reset form when drawer opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    formData.value = {};
    errors.value = {};
    appForm.value = { participationType: null };
  }
});
</script>

