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
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Edit {{ formatAppName(appKey) }} Details</h2>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Update participation details for this person
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
            <!-- Explanation Banner (non-dismissible) -->
            <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                    Editing Participation Details
                  </p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">
                    You're editing this person's {{ formatAppName(appKey) }} details, not their identity or lifecycle.
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
              <!-- Lifecycle Control (Type): Primary Control for SALES -->
              <div v-if="appKey === 'SALES'" class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <label class="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Type <span class="text-red-600">*</span>
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">(Primary control)</span>
                </label>
                <select
                  v-model="formData.type"
                  required
                  class="w-full px-4 py-3 border-2 border-indigo-500 dark:border-indigo-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer font-medium"
                >
                  <option value="">Select type...</option>
                  <option value="Lead">Lead</option>
                  <option value="Contact">Contact</option>
                </select>
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Changing type updates status automatically
                </p>
              </div>
              
              <!-- Detail Fields Section -->
              <div v-if="visibleDetailFields.length > 0">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
                  Detail Fields
                </h3>
                <div class="space-y-4">
                  <div v-for="fieldName in visibleDetailFields" :key="fieldName">
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
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
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
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer',
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
                      :min="fieldName === 'lead_score' || fieldName === 'estimated_value' ? 0 : undefined"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
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
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
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
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
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
              <div v-if="visibleDetailFields.length === 0" class="text-center py-8">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  No detail fields available for {{ formatAppName(appKey) }}{{ controllingStateValue ? ` (${controllingStateValue})` : '' }}.
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
                  :disabled="loading || visibleDetailFields.length === 0"
                  class="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg v-if="loading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ loading ? 'Saving...' : 'Save Changes' }}</span>
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
import { ref, computed, watch, onMounted } from 'vue';
import { 
  PEOPLE_FIELD_METADATA, 
  getDetailFields,
  getFieldMetadata 
} from '@/platform/fields/peopleFieldModel';
import apiClient from '@/utils/apiClient';
import { openDatePicker } from '@/utils/dateUtils';
import { assertEditParticipationPermission } from '@/platform/permissions/peopleGuards';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  personId: {
    type: String,
    required: true
  },
  appKey: {
    type: String,
    required: true
  },
  // Existing participation data (from profileData.apps[appKey])
  participationData: {
    type: Object,
    default: () => ({ fields: {} })
  }
});

const emit = defineEmits(['close', 'updated']);

const loading = ref(false);
const error = ref(null);
const validationErrors = ref({});
const formData = ref({});

// Get detail fields for the app (ONLY detail fields, not state fields)
const allDetailFields = computed(() => {
  return getDetailFields(props.appKey);
});

/**
 * Get the controlling state value from existing participation data
 * This determines which detail fields are visible
 */
const controllingStateValue = computed(() => {
  const fields = props.participationData?.fields || {};
  // For SALES, the controlling state is the 'type' field (Lead/Contact)
  if (props.appKey === 'SALES') {
    return fields.type || null;
  }
  // For other apps, check for a type/status field
  return fields.type || fields.status || null;
});

/**
 * Visibility rules mapping per app
 * Reuses the same logic from AttachToAppModal
 */
const getVisibilityRules = (appKey) => {
  // For SALES app: Lead vs Contact
  if (appKey === 'SALES') {
    return {
      // When type === 'Lead': show Lead-specific detail fields
      'Lead': {
        showPatterns: [
          (fieldName) => fieldName.startsWith('lead_'),
          (fieldName) => fieldName.startsWith('qualification_'),
          (fieldName) => fieldName === 'estimated_value',
          (fieldName) => fieldName === 'interest_products'
        ],
        hidePatterns: [
          (fieldName) => fieldName === 'role',
          (fieldName) => fieldName === 'birthday',
          (fieldName) => fieldName === 'preferred_contact_method'
        ]
      },
      // When type === 'Contact': show Contact-specific detail fields
      'Contact': {
        showPatterns: [
          (fieldName) => fieldName === 'role',
          (fieldName) => fieldName === 'birthday',
          (fieldName) => fieldName === 'preferred_contact_method'
        ],
        hidePatterns: [
          (fieldName) => fieldName.startsWith('lead_'),
          (fieldName) => fieldName.startsWith('qualification_'),
          (fieldName) => fieldName === 'estimated_value',
          (fieldName) => fieldName === 'interest_products'
        ]
      }
    };
  }
  // Future apps can add their rules here
  return {};
};

/**
 * Check if a detail field should be visible based on controlling state
 */
const isDetailFieldVisible = (fieldName) => {
  // If no controlling state value, show all detail fields
  if (!controllingStateValue.value) {
    return true;
  }
  
  // Get visibility rules for current app
  const rules = getVisibilityRules(props.appKey);
  const stateValue = controllingStateValue.value;
  
  // If no rules for this state value, show the field (default behavior)
  if (!rules[stateValue]) {
    return true;
  }
  
  const rule = rules[stateValue];
  
  // Check if field matches any hide pattern
  if (rule.hidePatterns && rule.hidePatterns.some(pattern => pattern(fieldName))) {
    return false;
  }
  
  // Check if field matches any show pattern
  if (rule.showPatterns && rule.showPatterns.some(pattern => pattern(fieldName))) {
    return true;
  }
  
  // If show patterns exist but field doesn't match any, hide it (strict mode)
  if (rule.showPatterns && rule.showPatterns.length > 0) {
    return false;
  }
  
  // Default: show the field if no explicit rule
  return true;
};

/**
 * Get visible detail fields based on controlling state
 */
const visibleDetailFields = computed(() => {
  return allDetailFields.value.filter(fieldName => {
    // Only include fields that are:
    // 1. Detail fields (already filtered by getDetailFields)
    // 2. Visible based on controlling state
    // 3. Editable (from metadata)
    const metadata = getFieldMetadata(fieldName);
    return metadata.editable && isDetailFieldVisible(fieldName);
  });
});

// Format app name
const formatAppName = (appKey) => {
  const appNames = {
    'SALES': 'Sales',
    'HELPDESK': 'Helpdesk',
    'AUDIT': 'Audit',
    'PORTAL': 'Portal',
    'PROJECTS': 'Projects'
  };
  return appNames[appKey] || appKey;
};

// Get field label
const getFieldLabel = (fieldName) => {
  // Convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Check if field is required (only for visible fields in form)
const isFieldRequired = (fieldName) => {
  const metadata = getFieldMetadata(fieldName);
  // Only enforce requiredFor if field is visible and has requiredFor
  if (metadata.requiredFor && metadata.requiredFor.includes(props.appKey)) {
    return true;
  }
  return false;
};

// Get field component type
const getFieldComponent = (fieldName) => {
  // For now, use simple heuristics
  // In future, this could come from field metadata
  const metadata = getFieldMetadata(fieldName);
  
  // Check field name patterns
  if (fieldName.includes('notes') || fieldName.includes('description')) {
    return 'textarea';
  }
  
  // Check for picklist-like fields (could be enhanced with metadata)
  if (fieldName === 'role' || fieldName === 'preferred_contact_method') {
    return 'select';
  }
  
  return 'input';
};

// Get input type
const getInputType = (fieldName) => {
  if (fieldName.includes('date') || fieldName === 'birthday' || fieldName === 'qualification_date') {
    return 'date';
  }
  if (fieldName.includes('score') || fieldName.includes('value') || fieldName.includes('amount')) {
    return 'number';
  }
  return 'text';
};

// Get field options (for select fields)
// These match the schema definitions in People.js
const getFieldOptions = (fieldName) => {
  const optionsMap = {
    'role': ['Decision Maker', 'Influencer', 'Support', 'Other'],
    'preferred_contact_method': ['Email', 'Phone', 'WhatsApp', 'SMS', 'None']
  };
  
  return optionsMap[fieldName] || [];
};

// Initialize form data from existing participation
const initializeFormData = () => {
  formData.value = {};
  const existingFields = props.participationData?.fields || {};
  
  // Always include type field for SALES (primary control)
  if (appKey === 'SALES' && existingFields.type) {
    formData.value.type = existingFields.type;
  }
  
  // Pre-fill only visible detail fields
  visibleDetailFields.value.forEach(fieldName => {
    if (existingFields.hasOwnProperty(fieldName)) {
      formData.value[fieldName] = existingFields[fieldName];
    }
  });
};

// Watch for modal open/participation data changes
watch([() => props.isOpen, () => props.participationData], () => {
  if (props.isOpen) {
    initializeFormData();
    error.value = null;
    validationErrors.value = {};
  }
}, { immediate: false, deep: true });

// Validate form
const validateForm = () => {
  validationErrors.value = {};
  let isValid = true;
  
  // Validate only visible detail fields
  visibleDetailFields.value.forEach(fieldName => {
    const value = formData.value[fieldName];
    const metadata = getFieldMetadata(fieldName);
    
    // Check required fields
    if (isFieldRequired(fieldName)) {
      if (value === null || value === undefined || value === '') {
        validationErrors.value[fieldName] = `${getFieldLabel(fieldName)} is required`;
        isValid = false;
      }
    }
    
    // Add more validation rules as needed
  });
  
  return isValid;
};

/**
 * Sanitize payload - CRITICAL: Only include visible detail fields
 * Development guard: Throw error if invalid fields detected
 */
const sanitizePayload = () => {
  const payload = {};
  
  // Get all state fields to exclude them
  const stateFields = Object.entries(PEOPLE_FIELD_METADATA)
    .filter(([_, metadata]) => 
      metadata.owner === 'participation' && 
      metadata.fieldScope === props.appKey &&
      metadata.intent === 'state'
    )
    .map(([fieldName]) => fieldName);
  
  // Get all core/system fields to exclude them
  const coreFields = Object.entries(PEOPLE_FIELD_METADATA)
    .filter(([_, metadata]) => 
      metadata.owner === 'core' || metadata.owner === 'system'
    )
    .map(([fieldName]) => fieldName);
  
  // Only include visible detail fields
  visibleDetailFields.value.forEach(fieldName => {
    // Development guard: Check for invalid fields
    if (stateFields.includes(fieldName)) {
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`CRITICAL: Attempted to include state field "${fieldName}" in edit payload`);
      }
      return; // Skip in production
    }
    
    if (coreFields.includes(fieldName)) {
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`CRITICAL: Attempted to include core/system field "${fieldName}" in edit payload`);
      }
      return; // Skip in production
    }
    
    // Include field value (even if empty/null - let backend handle it)
    payload[fieldName] = formData.value[fieldName];
  });
  
  return payload;
};

// Handle form submission
const handleSubmit = async () => {
  // Guard: Check permission before submitting
  assertEditParticipationPermission(props.appKey);
  
  if (!validateForm()) {
    return;
  }
  
  loading.value = true;
  error.value = null;
  validationErrors.value = {};
  
  try {
    // Sanitize payload (only visible detail fields)
    const sanitizedPayload = sanitizePayload();
    
    // Call update-app-fields endpoint
    const response = await apiClient.put(`/people/${props.personId}/update-app-fields`, {
      appKey: props.appKey,
      formData: sanitizedPayload
    });
    
    if (response.success) {
      emit('updated', response.data);
      close();
    } else {
      error.value = response.message || 'Failed to update participation details';
      
      // Handle validation errors from backend
      if (response.errors) {
        validationErrors.value = response.errors;
      }
    }
  } catch (err) {
    console.error('Error updating participation details:', err);
    error.value = err.message || 'Failed to update participation details';
    
    // Handle validation errors
    if (err.response?.data?.errors) {
      validationErrors.value = err.response.data.errors;
    }
  } finally {
    loading.value = false;
  }
};

// Close modal
const close = () => {
  emit('close');
};
</script>

