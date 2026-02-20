<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70"
        @click.self="close"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" @click.stop>
          <!-- Header -->
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Convert Lead to Contact</h2>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Convert this Sales Lead into a Contact
              </p>
            </div>
            <button
              @click="close"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center justify-center min-w-[40px] min-h-[40px]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6">
            <!-- Explanation Banner -->
            <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                    Converting Sales Participation
                  </p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">
                    This updates Sales participation only. Core identity fields (name, email, etc.) are not modified. Lead-specific fields will be cleared.
                  </p>
                </div>
              </div>
            </div>

            <!-- Error State -->
            <div v-if="error" class="mb-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <div class="flex-1">
                  <p class="text-sm text-danger-700 dark:text-danger-300">{{ error }}</p>
                </div>
              </div>
            </div>

            <!-- Validation Errors Summary -->
            <div v-if="Object.keys(validationErrors).length > 0" class="mb-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <div class="flex-1">
                  <h3 class="text-sm font-semibold text-danger-800 dark:text-danger-200 mb-2">
                    Validation Errors
                  </h3>
                  <ul class="list-disc list-inside space-y-2">
                    <li v-for="(message, field) in validationErrors" :key="field" class="text-sm text-danger-700 dark:text-danger-300">
                      <span class="font-medium">{{ getFieldLabel(field) }}:</span> {{ message }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <!-- State Fields Section -->
              <div v-if="visibleStateFields.length > 0">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
                  State Fields
                </h3>
                <div class="space-y-4">
                  <div v-for="fieldName in visibleStateFields" :key="fieldName">
                    <label :for="fieldName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {{ getFieldLabel(fieldName) }}
                      <span v-if="isFieldRequired(fieldName)" class="text-red-500">*</span>
                    </label>
                    <!-- Select field -->
                    <select
                      v-if="getFieldComponent(fieldName) === 'select'"
                      :id="fieldName"
                      :name="fieldName"
                      v-model="formData[fieldName]"
                      @change="clearDefaultTracking(fieldName)"
                      :required="isFieldRequired(fieldName)"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                    >
                      <option value="">Select {{ getFieldLabel(fieldName) }}...</option>
                      <option v-for="option in getFieldOptions(fieldName)" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </select>
                    <p v-if="validationErrors[fieldName]" class="mt-2 text-sm text-danger-600 dark:text-danger-400">
                      {{ validationErrors[fieldName] }}
                    </p>
                    <!-- Helper text for prefilled default values -->
                    <p v-if="isFieldPrefilledWithDefault(fieldName)" class="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                      Default value selected — you can change this.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Detail Fields Section -->
              <div v-if="detailFields.length > 0">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
                  Detail Fields
                </h3>
                <div class="space-y-4">
                  <div v-for="fieldName in detailFields" :key="fieldName">
                    <label :for="fieldName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {{ getFieldLabel(fieldName) }}
                      <span v-if="isFieldRequired(fieldName)" class="text-red-500">*</span>
                    </label>
                    <!-- Select field -->
                    <select
                      v-if="getFieldComponent(fieldName) === 'select'"
                      :id="fieldName"
                      :name="fieldName"
                      v-model="formData[fieldName]"
                      :required="isFieldRequired(fieldName)"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                    >
                      <option value="">Select {{ getFieldLabel(fieldName) }}...</option>
                      <option v-for="option in getFieldOptions(fieldName)" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </select>
                    <!-- Date input -->
                    <input
                      v-else-if="getInputType(fieldName) === 'date'"
                      :id="fieldName"
                      :name="fieldName"
                      type="date"
                      v-model="formData[fieldName]"
                      :required="isFieldRequired(fieldName)"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent cursor-pointer',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                      @click="openDatePicker"
                    />
                    <!-- Number input -->
                    <input
                      v-else-if="getInputType(fieldName) === 'number'"
                      :id="fieldName"
                      :name="fieldName"
                      type="number"
                      v-model.number="formData[fieldName]"
                      :required="isFieldRequired(fieldName)"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                    />
                    <!-- Textarea -->
                    <textarea
                      v-else-if="getFieldComponent(fieldName) === 'textarea'"
                      :id="fieldName"
                      :name="fieldName"
                      v-model="formData[fieldName]"
                      :required="isFieldRequired(fieldName)"
                      rows="3"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                    />
                    <!-- Text input -->
                    <input
                      v-else
                      :id="fieldName"
                      :name="fieldName"
                      type="text"
                      v-model="formData[fieldName]"
                      :required="isFieldRequired(fieldName)"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                    />
                    <p v-if="validationErrors[fieldName]" class="mt-2 text-sm text-danger-600 dark:text-danger-400">
                      {{ validationErrors[fieldName] }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="visibleStateFields.length === 0 && detailFields.length === 0" class="text-center py-8">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  No Contact fields available.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  @click="close"
                  class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="loading"
                  class="px-6 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg v-if="loading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ loading ? 'Converting...' : 'Convert to Contact' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { 
  PEOPLE_FIELD_METADATA, 
  getStateFields, 
  getDetailFields,
  getFieldMetadata 
} from '@/platform/fields/peopleFieldModel';
import apiClient from '@/utils/apiClient';
import { openDatePicker } from '@/utils/dateUtils';
import { assertLifecyclePermission } from '@/platform/permissions/peopleGuards';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  personId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close', 'converted']);

const loading = ref(false);
const error = ref(null);
const validationErrors = ref({});
const formData = ref({});
// Track which fields have been prefilled with defaults
const defaultPrefilledFields = ref(new Set());

// App key is always SALES for conversion
const appKey = 'SALES';
const classifierValue = 'Contact'; // Always Contact for conversion

// Get state fields for SALES app
const stateFields = computed(() => {
  return getStateFields(appKey);
});

// Get visible state fields (only Contact-relevant)
const visibleStateFields = computed(() => {
  return stateFields.value.filter(fieldName => {
    // Hide classifier field (type) - we know it's Contact, no need to show it
    if (fieldName === 'type') {
      return false;
    }
    // Only show Contact-specific state fields
    // Hide Lead-specific fields
    if (fieldName === 'lead_status') {
      return false;
    }
    // Show Contact-specific state fields
    if (fieldName === 'contact_status') {
      return true;
    }
    return false;
  });
});

// Get detail fields for SALES app
const allDetailFields = computed(() => {
  return getDetailFields(appKey);
});

// Get visible detail fields (only Contact-relevant, hide Lead-specific)
const detailFields = computed(() => {
  return allDetailFields.value.filter(fieldName => {
    // Hide Lead-specific detail fields
    if (fieldName.startsWith('lead_') || 
        fieldName.startsWith('qualification_') ||
        fieldName === 'estimated_value' ||
        fieldName === 'interest_products') {
      return false;
    }
    // Show Contact-specific detail fields
    if (fieldName === 'role' || 
        fieldName === 'birthday' || 
        fieldName === 'preferred_contact_method') {
      return true;
    }
    return false;
  });
});

// Get field label
const getFieldLabel = (fieldName) => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Check if field is required
const isFieldRequired = (fieldName) => {
  const metadata = getFieldMetadata(fieldName);
  return metadata.requiredFor?.includes(appKey) || false;
};

// Get field component type
const getFieldComponent = (fieldName) => {
  const enumFields = ['type', 'lead_status', 'contact_status', 'role', 'preferred_contact_method'];
  if (enumFields.includes(fieldName)) {
    return 'select';
  }
  const textFields = ['qualification_notes'];
  if (textFields.includes(fieldName)) {
    return 'textarea';
  }
  return 'input';
};

// Get field options for select fields
const getFieldOptions = (fieldName) => {
  const optionsMap = {
    'type': ['Lead', 'Contact'],
    'lead_status': ['New', 'Contacted', 'Qualified', 'Disqualified', 'Nurturing', 'Re-Engage'],
    'contact_status': ['Active', 'Inactive', 'DoNotContact'],
    'role': ['Decision Maker', 'Influencer', 'Support', 'Other'],
    'preferred_contact_method': ['Email', 'Phone', 'WhatsApp', 'SMS', 'None']
  };
  return optionsMap[fieldName] || [];
};

// Get input type for input fields
const getInputType = (fieldName) => {
  const dateFields = ['qualification_date', 'birthday'];
  if (dateFields.includes(fieldName)) {
    return 'date';
  }
  const numberFields = ['lead_score', 'estimated_value'];
  if (numberFields.includes(fieldName)) {
    return 'number';
  }
  return 'text';
};

/**
 * Get default value for a state field
 */
const getDefaultStateValue = (fieldName) => {
  // Only provide defaults for participation state fields
  const metadata = getFieldMetadata(fieldName);
  if (metadata.owner !== 'participation' || metadata.intent !== 'state') {
    return null;
  }
  
  // Contact-specific defaults
  if (fieldName === 'contact_status') {
    return 'Active';
  }
  
  return null;
};

/**
 * Check if a field was prefilled with a default value
 */
const isFieldPrefilledWithDefault = (fieldName) => {
  return defaultPrefilledFields.value.has(fieldName);
};

/**
 * Apply smart defaults to visible state fields
 */
const applySmartDefaults = () => {
  // Apply defaults to visible state fields
  visibleStateFields.value.forEach(fieldName => {
    // Skip classifier field (type) - it's locked to Contact
    if (fieldName === 'type') {
      return;
    }
    
    // Only apply if field has no value
    const currentValue = formData.value[fieldName];
    if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
      return;
    }
    
    // Get default value
    const defaultValue = getDefaultStateValue(fieldName);
    if (defaultValue !== null) {
      formData.value[fieldName] = defaultValue;
      defaultPrefilledFields.value.add(fieldName);
    }
  });
};

/**
 * Clear default tracking when user manually changes a prefilled field
 */
const clearDefaultTracking = (fieldName) => {
  if (defaultPrefilledFields.value.has(fieldName)) {
    defaultPrefilledFields.value.delete(fieldName);
  }
};

// Initialize form data
const initializeFormData = () => {
  formData.value = {};
  defaultPrefilledFields.value.clear();
  
  // Lock type to Contact
  formData.value.type = 'Contact';
  
  // Initialize all visible fields with empty values
  [...visibleStateFields.value, ...detailFields.value].forEach(fieldName => {
    if (!formData.value.hasOwnProperty(fieldName)) {
      if (getFieldComponent(fieldName) === 'select') {
        formData.value[fieldName] = '';
      } else if (getInputType(fieldName) === 'date') {
        formData.value[fieldName] = '';
      } else if (getInputType(fieldName) === 'number') {
        formData.value[fieldName] = '';
      } else {
        formData.value[fieldName] = '';
      }
    }
  });
  
  // Apply smart defaults after initialization
  setTimeout(() => {
    applySmartDefaults();
  }, 0);
};

// Watch for modal open/close
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    initializeFormData();
    error.value = null;
    validationErrors.value = {};
  }
});

// Close handler
const close = () => {
  if (!loading.value) {
    emit('close');
  }
};

// Handle form submission
const handleSubmit = async () => {
  // Guard: Check lifecycle permission before submitting
  assertLifecyclePermission('SALES');
  
  error.value = null;
  validationErrors.value = {};
  
  // Validate required fields - only check visible fields
  const visibleFields = [
    ...visibleStateFields.value,
    ...detailFields.value
  ];
  
  const requiredFields = visibleFields.filter(fieldName => 
    isFieldRequired(fieldName)
  );
  
  const errors = {};
  requiredFields.forEach(fieldName => {
    const value = formData.value[fieldName];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors[fieldName] = `${getFieldLabel(fieldName)} is required`;
    }
  });
  
  if (Object.keys(errors).length > 0) {
    validationErrors.value = errors;
    return;
  }
  
  // Clean form data: convert empty strings to null for enum fields
  const cleanedFormData = { ...formData.value };
  const enumFields = ['contact_status', 'role', 'preferred_contact_method'];
  enumFields.forEach(field => {
    if (cleanedFormData[field] === '') {
      cleanedFormData[field] = null;
    }
  });
  
  // Build conversion payload - only include Contact fields
  const conversionData = {
    type: 'Contact', // Always Contact
    // Include Contact-specific fields
    ...Object.fromEntries(
      Object.entries(cleanedFormData).filter(([key, value]) => {
        // Exclude Lead-specific fields
        if (key.startsWith('lead_') || 
            key.startsWith('qualification_') ||
            key === 'estimated_value' ||
            key === 'interest_products') {
          return false;
        }
        // Include only non-empty Contact fields
        return value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
      })
    )
  };
  
  loading.value = true;
  
  try {
    const response = await apiClient.post(`/people/${props.personId}/convert-lead-to-contact`, {
      formData: conversionData
    });
    
    if (response.success) {
      emit('converted', response.data);
      close();
    } else {
      if (response.errors) {
        validationErrors.value = response.errors;
        error.value = response.message || 'Validation failed. Please check the fields below.';
      } else {
        error.value = response.message || 'Failed to convert Lead to Contact';
      }
    }
  } catch (err) {
    console.error('Error converting Lead to Contact:', err);
    
    if (err.response?.data?.errors) {
      validationErrors.value = err.response.data.errors;
      error.value = err.response.data.message || 'Validation failed. Please check the fields below.';
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else {
      error.value = err.message || 'Error converting Lead to Contact';
    }
  } finally {
    loading.value = false;
  }
};
</script>

