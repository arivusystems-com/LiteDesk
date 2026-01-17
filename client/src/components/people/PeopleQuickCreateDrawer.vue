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
              <DialogPanel class="pointer-events-auto w-screen max-w-2xl">
                <form @submit.prevent="handleSubmit" class="relative flex h-full flex-col divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 shadow-xl">
                  <div class="h-0 flex-1 overflow-y-auto">
                    <div class="bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6">
                      <div class="flex items-center justify-between">
                        <DialogTitle class="text-base font-semibold text-white">Quick Create Contact</DialogTitle>
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
                        <p class="text-sm text-indigo-300">Create a new contact with core identity information.</p>
                      </div>
                    </div>
                    <div class="flex flex-1 flex-col justify-between">
                      <div class="divide-y divide-gray-200 dark:divide-gray-700 px-4 sm:px-6">
                        <div class="space-y-6 pt-6 pb-5">
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
                          
                          <!-- Dynamic Form - Only shows creation-eligible fields -->
                          <DynamicForm
                            moduleKey="people"
                            :formData="formData"
                            :errors="errors"
                            :excludeFields="excludeFields"
                            :showAllFields="false"
                            :quickCreateMode="true"
                            @update:formData="updateFormData"
                            @ready="onFormReady"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex shrink-0 justify-end gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
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
                      {{ saving ? 'Saving...' : 'Save' }}
                    </button>
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

<script setup>
import { ref, computed, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import DynamicForm from '@/components/common/DynamicForm.vue';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import { getFieldMetadata, getCoreIdentityFields } from '@/platform/fields/peopleFieldModel';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'saved']);

const authStore = useAuthStore();
const { openTab } = useTabs();
const formData = ref({});
const errors = ref({});
const saving = ref(false);
const moduleDefinition = ref(null);
const eligibleFieldKeys = ref(new Set()); // Set of field keys eligible for Quick Create
const excludeFields = ref([]); // Fields to exclude from DynamicForm

/**
 * Normalize field key to match peopleFieldModel format
 * Handles snake_case <-> camelCase conversion
 */
function normalizeFieldKey(fieldKey) {
  if (!fieldKey) return null;
  
  // Try direct match first
  try {
    getFieldMetadata(fieldKey);
    return fieldKey;
  } catch {
    // Try snake_case to camelCase (first_name -> firstName)
    if (fieldKey.includes('_')) {
      const camelCase = fieldKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      try {
        getFieldMetadata(camelCase);
        return camelCase;
      } catch {
        // Try with first letter lowercase if it was uppercase
        const camelCaseLower = camelCase.charAt(0).toLowerCase() + camelCase.slice(1);
        try {
          getFieldMetadata(camelCaseLower);
          return camelCaseLower;
        } catch {
          // Not found
        }
      }
    }
    
    // Try camelCase to snake_case (firstName -> first_name)
    if (/[A-Z]/.test(fieldKey)) {
      const snakeCase = fieldKey.replace(/([A-Z])/g, '_$1').toLowerCase();
      try {
        getFieldMetadata(snakeCase);
        return snakeCase;
      } catch {
        // Not found
      }
    }
  }
  
  return null;
}

/**
 * Determine if a field is eligible for Quick Create
 * 
 * Includes ONLY:
 * - Core identity fields (owner === 'core', intent === 'identity', editable === true)
 * - System fields with allowOnCreate (owner === 'system', editable === true, allowOnCreate === true)
 * 
 * Explicitly EXCLUDES:
 * - Participation fields (owner === 'participation')
 * - System fields without allowOnCreate
 */
function isFieldEligibleForQuickCreate(fieldKey) {
  if (!fieldKey) return false;
  
  // Normalize key first
  const normalizedKey = normalizeFieldKey(fieldKey);
  if (!normalizedKey) {
    console.warn(`[PeopleQuickCreate] Field "${fieldKey}" not found in metadata, excluding from Quick Create`);
    return false;
  }
  
  try {
    const metadata = getFieldMetadata(normalizedKey);
    
    // Core identity fields
    const isCoreIdentity = (
      metadata.owner === 'core' &&
      metadata.intent === 'identity' &&
      metadata.editable === true
    );
    
    // System fields with allowOnCreate
    const isAllowedSystemField = (
      metadata.owner === 'system' &&
      metadata.editable === true &&
      metadata.allowOnCreate === true
    );
    
    return isCoreIdentity || isAllowedSystemField;
  } catch (err) {
    // Field not found in metadata - exclude it
    console.warn(`[PeopleQuickCreate] Field "${fieldKey}" (normalized: "${normalizedKey}") not found in metadata, excluding from Quick Create`);
    return false;
  }
}

/**
 * Initialize eligible fields and exclusion list
 */
function initializeEligibleFields(module) {
  if (!module || !module.fields) return;
  
  const eligible = new Set();
  const exclude = [];
  
  // Process all fields from module definition
  for (const field of module.fields) {
    if (!field.key) continue;
    
    // Normalize field key to match peopleFieldModel format
    const normalizedKey = normalizeFieldKey(field.key);
    
    if (!normalizedKey) {
      // Field not found in metadata - exclude it
      exclude.push(field.key);
      continue;
    }
    
    // Check if field is eligible using peopleFieldModel
    if (isFieldEligibleForQuickCreate(normalizedKey)) {
      // Store both original and normalized keys for lookup
      eligible.add(field.key); // Use original key for form data
      eligible.add(normalizedKey); // Use normalized key for metadata checks
    } else {
      // Exclude participation fields and non-eligible system fields
      exclude.push(field.key);
    }
  }
  
  eligibleFieldKeys.value = eligible;
  excludeFields.value = exclude;
  
  console.log('[PeopleQuickCreate] Eligible fields initialized:', {
    eligible: Array.from(eligible),
    excluded: exclude,
    totalFields: module.fields.length
  });
}

const closeDrawer = () => {
  if (!saving.value) {
    emit('close');
    // Reset form after closing
    setTimeout(() => {
      formData.value = {};
      errors.value = {};
    }, 300);
  }
};

const handleDialogClose = () => {
  closeDrawer();
};

const updateFormData = (data) => {
  formData.value = { ...data };
};

const onFormReady = (module) => {
  moduleDefinition.value = module;
  initializeEligibleFields(module);
  
  // Initialize form with empty defaults for eligible fields only
  const initialForm = {};
  if (module && module.fields) {
    for (const field of module.fields) {
      if (eligibleFieldKeys.value.has(field.key)) {
        if (field.defaultValue !== null && field.defaultValue !== undefined) {
          initialForm[field.key] = field.defaultValue;
        } else {
          if (field.dataType === 'Multi-Picklist' || field.key === 'tags') {
            initialForm[field.key] = [];
          } else if (field.dataType === 'Checkbox') {
            initialForm[field.key] = false;
          } else {
            initialForm[field.key] = '';
          }
        }
      }
    }
  }
  formData.value = { ...initialForm };
};

// Watch for form data changes and clear errors for fields that are now valid
watch(() => formData.value, (newFormData, oldFormData) => {
  if (!moduleDefinition.value || !oldFormData) return;
  
  const changedFields = new Set();
  for (const key in newFormData) {
    if (newFormData[key] !== oldFormData[key]) {
      changedFields.add(key);
    }
  }
  
  for (const fieldKey of changedFields) {
    if (errors.value[fieldKey]) {
      const value = newFormData[fieldKey];
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     (Array.isArray(value) && value.length === 0);
      
      if (!isEmpty) {
        delete errors.value[fieldKey];
      }
    }
  }
}, { deep: true });

/**
 * Validate ONLY creation-eligible fields
 * 
 * Rules:
 * - Only validate fields in eligibleFieldKeys
 * - Enforce "Required in Form" from Settings (field.required)
 * - Ignore requiredFor completely
 * - Do NOT validate hidden fields
 * - Do NOT validate participation fields
 */
function validateEligibleFields() {
  errors.value = {};
  
  if (!moduleDefinition.value || !moduleDefinition.value.fields) {
    return;
  }
  
  // Guardrail: Fail fast if participation fields are being validated
  const participationFields = [];
  for (const field of moduleDefinition.value.fields) {
    if (!field.key) continue;
    const normalizedKey = normalizeFieldKey(field.key);
    if (!normalizedKey) continue;
    
    try {
      const metadata = getFieldMetadata(normalizedKey);
      if (metadata.owner === 'participation') {
        participationFields.push(field.key);
      }
    } catch (err) {
      // Field not in metadata - skip
    }
  }
  
  if (participationFields.length > 0 && Object.keys(formData.value).some(key => participationFields.includes(key))) {
    const errorMsg = `[DEV ERROR] Participation fields detected in Quick Create validation: ${participationFields.join(', ')}. Quick Create must only validate creation-eligible fields.`;
    console.error(errorMsg);
    errors.value._general = 'Validation error: Invalid field configuration. Please contact support.';
    return;
  }
  
  // Validate only eligible fields
  for (const field of moduleDefinition.value.fields) {
    if (!field.key) continue;
    
    // Skip if not eligible
    if (!eligibleFieldKeys.value.has(field.key)) {
      continue;
    }
    
    // Skip if field is hidden (not in formData)
    if (!(field.key in formData.value)) {
      continue;
    }
    
    // Validate required fields (from Settings "Required in Form")
    if (field.required === true) {
      const value = formData.value[field.key];
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        errors.value[field.key] = `${field.label || field.key} is required`;
      }
    }
  }
}

/**
 * Submit ONLY eligible fields
 * 
 * Contract:
 * - Include only creation-eligible fields
 * - Include assignedTo if allowOnCreate === true
 * - Do NOT include participation fields
 * - Create Person identity only
 */
function prepareSubmissionData() {
  const submitData = {};
  
  // Include only eligible fields
  for (const fieldKey of eligibleFieldKeys.value) {
    if (fieldKey in formData.value) {
      const value = formData.value[fieldKey];
      // Only include non-empty values (or empty if required)
      if (value !== null && value !== undefined && value !== '') {
        submitData[fieldKey] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        submitData[fieldKey] = value;
      } else if (value === false || value === 0) {
        // Include false and 0 values
        submitData[fieldKey] = value;
      }
    }
  }
  
  // Guardrail: Ensure assignedTo is included if it's eligible
  if (eligibleFieldKeys.value.has('assignedTo') && formData.value.assignedTo) {
    submitData.assignedTo = formData.value.assignedTo;
  }
  
  // Guardrail: Fail fast if participation fields are in submission
  const participationKeys = Object.keys(submitData).filter(key => {
    const normalizedKey = normalizeFieldKey(key);
    if (!normalizedKey) return false;
    
    try {
      const metadata = getFieldMetadata(normalizedKey);
      return metadata.owner === 'participation';
    } catch {
      return false;
    }
  });
  
  if (participationKeys.length > 0) {
    const errorMsg = `[DEV ERROR] Participation fields detected in Quick Create submission: ${participationKeys.join(', ')}. Quick Create must only submit creation-eligible fields.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  return submitData;
}

const handleSubmit = async () => {
  console.log('[PeopleQuickCreate] 🚀 handleSubmit called', {
    formDataKeys: Object.keys(formData.value),
    eligibleFields: Array.from(eligibleFieldKeys.value)
  });
  
  errors.value = {};
  saving.value = true;

  try {
    // Step 1: Validate ONLY creation-eligible fields
    validateEligibleFields();
    
    // If validation fails, stop here
    if (Object.keys(errors.value).length > 0) {
      console.log('[PeopleQuickCreate] ❌ Validation failed:', errors.value);
      saving.value = false;
      return;
    }
    
    console.log('[PeopleQuickCreate] ✅ Validation passed, preparing submission...');
    
    // Step 2: Prepare submission data (only eligible fields)
    const submitData = prepareSubmissionData();
    
    console.log('[PeopleQuickCreate] 📤 Submitting data:', {
      keys: Object.keys(submitData),
      data: submitData
    });
    
    // Step 3: Submit to API
    const response = await apiClient.post('/people', submitData);
    
    if (response.success) {
      console.log('[PeopleQuickCreate] ✅ Person created successfully');
      const createdPerson = response.data;
      
      // Step 4: Open the newly created record in a new tab
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
          params: { name: title }
        });
      }
      
      emit('saved', createdPerson);
      closeDrawer();
    } else {
      // Handle API validation errors
      if (response.errors) {
        errors.value = { ...errors.value, ...response.errors };
      } else {
        errors.value._general = response.message || 'Failed to create contact';
      }
    }
  } catch (error) {
    console.error('[PeopleQuickCreate] ❌ Error creating person:', error);
    
    // Handle validation errors from API
    if (error.response?.data?.errors) {
      errors.value = { ...errors.value, ...error.response.data.errors };
    } else if (error.response?.data?.message) {
      errors.value._general = error.response.data.message;
    } else {
      errors.value._general = error.message || 'Failed to create contact';
    }
  } finally {
    saving.value = false;
  }
};
</script>

