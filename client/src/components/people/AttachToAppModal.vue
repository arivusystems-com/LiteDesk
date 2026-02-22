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
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Attach to App</h2>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Add this person to {{ formatAppName(appKey) }}
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
                    Adding Participation
                  </p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">
                    You are adding this person to {{ formatAppName(appKey) }}{{ participationTypeDisplay ? ` as ${participationTypeDisplay}` : '' }}. This will only set participation fields for this app. Core identity fields (name, email, etc.) are not modified.
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
                    <!-- Hide classifier field if prefilled from participationType -->
                    <template v-if="isClassifierField(fieldName) && isClassifierPrefilled(fieldName)">
                      <!-- Show as read-only summary instead of input -->
                      <div class="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div class="flex items-center gap-2">
                          <svg class="w-4 h-4 text-success-600 dark:text-success-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                          <div>
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ getFieldLabel(fieldName) }}</div>
                            <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ formData[fieldName] }}</div>
                          </div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
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
                      :min="fieldName === 'lead_score' ? 0 : undefined"
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
                    </template>
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
                      @change="clearDefaultTracking(fieldName)"
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
                      @input="clearDefaultTracking(fieldName)"
                      @click="openDatePicker"
                      :required="isFieldRequired(fieldName)"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                    />
                    <!-- Number input -->
                    <input
                      v-else-if="getInputType(fieldName) === 'number'"
                      :id="fieldName"
                      :name="fieldName"
                      type="number"
                      v-model.number="formData[fieldName]"
                      @input="clearDefaultTracking(fieldName)"
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
                      @input="clearDefaultTracking(fieldName)"
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
                      @input="clearDefaultTracking(fieldName)"
                      :required="isFieldRequired(fieldName)"
                      :class="[
                        'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                        validationErrors[fieldName] ? 'border-red-500 dark:border-red-500' : ''
                      ]"
                    />
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

              <!-- Empty State -->
              <div v-if="visibleStateFields.length === 0 && detailFields.length === 0" class="text-center py-8">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  No participation fields available for {{ formatAppName(appKey) }}{{ controllingStateValue ? ` (${controllingStateValue})` : '' }}.
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
                  class="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg v-if="loading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ loading ? 'Attaching...' : 'Attach' }}</span>
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
  getStateFields, 
  getDetailFields,
  getFieldMetadata 
} from '@/platform/fields/peopleFieldModel';
import apiClient from '@/utils/apiClient';
import { openDatePicker } from '@/utils/dateUtils';
import { assertAttachPermission } from '@/platform/permissions/peopleGuards';

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
  participationType: {
    type: String,
    default: null // e.g., 'LEAD', 'CONTACT'
  }
});

const emit = defineEmits(['close', 'attached']);

const loading = ref(false);
const error = ref(null);
const validationErrors = ref({});
const formData = ref({});
// Track which fields have been prefilled with defaults (for UX helper text)
const defaultPrefilledFields = ref(new Set());

// Get participation fields for the app
const participationFields = computed(() => {
  return Object.entries(PEOPLE_FIELD_METADATA)
    .filter(([fieldName, metadata]) => 
      metadata.owner === 'participation' && 
      metadata.fieldScope === props.appKey
    )
    .map(([fieldName]) => fieldName);
});

// Get state fields for the app
const stateFields = computed(() => {
  return getStateFields(props.appKey);
});

/**
 * Get visible state fields based on controlling state
 */
const visibleStateFields = computed(() => {
  return stateFields.value.filter(fieldName => isStateFieldVisible(fieldName));
});

// Get detail fields for the app
const allDetailFields = computed(() => {
  return getDetailFields(props.appKey);
});

/**
 * Identify the controlling state field (the classifier field)
 * This is the state field that determines which detail fields are visible
 */
const controllingStateField = computed(() => {
  const stateFieldsList = stateFields.value;
  // Find the state field that acts as classifier (typically the first one or the one that represents participation type)
  // For SALES, this is 'type' (Lead/Contact)
  // We identify it by checking if it's the classifier field
  const classifierFieldName = getClassifierField(props.appKey);
  if (classifierFieldName && stateFieldsList.includes(classifierFieldName)) {
    return classifierFieldName;
  }
  // Fallback: return first state field if no classifier found
  return stateFieldsList.length > 0 ? stateFieldsList[0] : null;
});

/**
 * Get the current value of the controlling state field
 */
const controllingStateValue = computed(() => {
  if (!controllingStateField.value) return null;
  return formData.value[controllingStateField.value] || null;
});

/**
 * Visibility rules mapping per app
 * Uses pattern-based detection to avoid hardcoding field names
 * This is declarative and extensible for future apps
 */
const getVisibilityRules = (appKey) => {
  // For SALES app: Lead vs Contact
  if (appKey === 'SALES') {
    return {
      // When type === 'Lead': show Lead-specific detail fields
      'Lead': {
        // Pattern-based: fields starting with 'lead_' or 'qualification_' or specific Lead-related fields
        showPatterns: [
          (fieldName) => fieldName.startsWith('lead_'),
          (fieldName) => fieldName.startsWith('qualification_'),
          (fieldName) => fieldName === 'estimated_value',
          (fieldName) => fieldName === 'interest_products'
        ],
        // Hide Contact-specific detail fields
        hidePatterns: [
          (fieldName) => fieldName === 'role',
          (fieldName) => fieldName === 'birthday',
          (fieldName) => fieldName === 'preferred_contact_method'
        ],
        // State field visibility rules
        stateFieldShowPatterns: [
          (fieldName) => fieldName === 'lead_status'
        ],
        stateFieldHidePatterns: [
          (fieldName) => fieldName === 'contact_status'
        ]
      },
      // When type === 'Contact': show Contact-specific detail fields
      'Contact': {
        showPatterns: [
          (fieldName) => fieldName === 'role',
          (fieldName) => fieldName === 'birthday',
          (fieldName) => fieldName === 'preferred_contact_method'
        ],
        // Hide Lead-specific detail fields
        hidePatterns: [
          (fieldName) => fieldName.startsWith('lead_'),
          (fieldName) => fieldName.startsWith('qualification_'),
          (fieldName) => fieldName === 'estimated_value',
          (fieldName) => fieldName === 'interest_products'
        ],
        // State field visibility rules
        stateFieldShowPatterns: [
          (fieldName) => fieldName === 'contact_status'
        ],
        stateFieldHidePatterns: [
          (fieldName) => fieldName === 'lead_status'
        ]
      }
    };
  }
  // Future apps can add their rules here
  return {};
};

/**
 * Check if a state field should be visible based on controlling state
 */
const isStateFieldVisible = (fieldName) => {
  // Classifier field is always visible
  if (isClassifierField(fieldName)) {
    return true;
  }
  
  // If no controlling state field, show all state fields
  if (!controllingStateField.value || !controllingStateValue.value) {
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
  
  // Check if field matches any hide pattern for state fields
  if (rule.stateFieldHidePatterns && rule.stateFieldHidePatterns.some(pattern => pattern(fieldName))) {
    return false;
  }
  
  // Check if field matches any show pattern for state fields
  if (rule.stateFieldShowPatterns && rule.stateFieldShowPatterns.some(pattern => pattern(fieldName))) {
    return true;
  }
  
  // If show patterns exist but field doesn't match any, hide it (strict mode)
  // This ensures only relevant state fields are shown
  if (rule.stateFieldShowPatterns && rule.stateFieldShowPatterns.length > 0) {
    return false;
  }
  
  // Default: show the field if no explicit rule
  return true;
};

/**
 * Check if a detail field should be visible based on controlling state
 */
const isDetailFieldVisible = (fieldName) => {
  // If no controlling state field, show all detail fields
  if (!controllingStateField.value || !controllingStateValue.value) {
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
  // This ensures only relevant fields are shown
  if (rule.showPatterns && rule.showPatterns.length > 0) {
    return false;
  }
  
  // Default: show the field if no explicit rule
  return true;
};

/**
 * Get visible detail fields based on controlling state
 */
const detailFields = computed(() => {
  return allDetailFields.value.filter(fieldName => isDetailFieldVisible(fieldName));
});

/**
 * Get all visible participation fields (visible state + visible detail fields)
 * This is used for payload sanitization
 */
const visibleParticipationFields = computed(() => {
  return [
    ...visibleStateFields.value, // Only visible state fields
    ...detailFields.value // Only visible detail fields
  ];
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

// Check if field is required
const isFieldRequired = (fieldName) => {
  const metadata = getFieldMetadata(fieldName);
  return metadata.requiredFor?.includes(props.appKey) || false;
};

// Identify the classifier state field (primary participation type field)
// This is the field that represents the participation intent selected earlier
const getClassifierField = (appKey) => {
  // Map app keys to their classifier field names
  const classifierFields = {
    'SALES': 'type', // Lead/Contact
    // Future apps can add their classifier fields here
    // 'HELPDESK': 'contact_type',
    // 'AUDIT': 'member_type',
  };
  return classifierFields[appKey] || null;
};

// Check if a field is the classifier field
const isClassifierField = (fieldName) => {
  const classifierField = getClassifierField(props.appKey);
  return classifierField === fieldName;
};

// Check if classifier field is prefilled from participationType
const isClassifierPrefilled = (fieldName) => {
  if (!isClassifierField(fieldName)) return false;
  if (!props.participationType) return false;
  // Check if formData has the field set from participationType
  return formData.value[fieldName] && formData.value[fieldName] !== '';
};

// Get display text for participation type
const participationTypeDisplay = computed(() => {
  if (!props.participationType) return null;
  // Convert 'LEAD' -> 'Lead', 'CONTACT' -> 'Contact', etc.
  return props.participationType.charAt(0) + props.participationType.slice(1).toLowerCase();
});

// Get field component type
const getFieldComponent = (fieldName) => {
  // Determine component type based on field name and metadata
  // Most participation fields are enums (selects) or simple types
  
  // Enum fields (selects)
  const enumFields = ['type', 'lead_status', 'contact_status', 'role', 'preferred_contact_method'];
  if (enumFields.includes(fieldName)) {
    return 'select';
  }
  
  // Text fields (textarea)
  const textFields = ['qualification_notes'];
  if (textFields.includes(fieldName)) {
    return 'textarea';
  }
  
  // Array fields (interest_products) - handle as text input for now
  // Can be enhanced later to support multi-select
  
  // Default to input
  return 'input';
};

// Get field options for select fields
const getFieldOptions = (fieldName) => {
  // Return enum options based on field name
  // These match the schema definitions in People.js
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
 * Get default value for a state field based on app context and classifier value
 * Returns null if no safe default exists
 * 
 * @param {string} fieldName - The field name
 * @param {string} appKey - The app key (e.g., 'SALES')
 * @param {string} classifierValue - The current classifier value (e.g., 'Lead', 'Contact')
 * @returns {string|null} - The default value or null
 */
const getDefaultStateValue = (fieldName, appKey, classifierValue) => {
  // Only provide defaults for participation state fields
  const metadata = getFieldMetadata(fieldName);
  if (metadata.owner !== 'participation' || metadata.intent !== 'state') {
    return null;
  }
  
  // SALES app defaults
  if (appKey === 'SALES') {
    // Lead-specific defaults
    if (classifierValue === 'Lead') {
      if (fieldName === 'lead_status') {
        return 'New';
      }
    }
    
    // Contact-specific defaults
    if (classifierValue === 'Contact') {
      if (fieldName === 'contact_status') {
        return 'Active';
      }
    }
  }
  
  // Future apps can add their defaults here
  // Example:
  // if (appKey === 'HELPDESK') {
  //   if (classifierValue === 'Customer' && fieldName === 'ticket_status') {
  //     return 'Open';
  //   }
  // }
  
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
 * Only applies defaults when:
 * - Field becomes visible
 * - Field has no existing value
 * - Default exists for the field
 */
const applySmartDefaults = () => {
  const classifierValue = controllingStateValue.value;
  if (!classifierValue) {
    // No classifier value yet, can't apply defaults
    return;
  }
  
  // Apply defaults to visible state fields
  visibleStateFields.value.forEach(fieldName => {
    // Skip classifier field (it's already set)
    if (isClassifierField(fieldName)) {
      return;
    }
    
    // Only apply if field has no value
    const currentValue = formData.value[fieldName];
    if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
      // Field already has a value, don't override
      return;
    }
    
    // Get default value
    const defaultValue = getDefaultStateValue(fieldName, props.appKey, classifierValue);
    if (defaultValue !== null) {
      // Apply default
      formData.value[fieldName] = defaultValue;
      // Track that this field was prefilled with a default
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
  // Clear default tracking when initializing
  defaultPrefilledFields.value.clear();
  
  // Prefill classifier field from participationType if provided
  const classifierField = getClassifierField(props.appKey);
  if (props.participationType && classifierField && participationFields.value.includes(classifierField)) {
    // Convert participationType to field value format
    // 'LEAD' -> 'Lead', 'CONTACT' -> 'Contact', etc.
    const normalizedValue = props.participationType.charAt(0) + props.participationType.slice(1).toLowerCase();
    formData.value[classifierField] = normalizedValue;
  }
  
  // Initialize all participation fields with empty values
  participationFields.value.forEach(fieldName => {
    if (!formData.value.hasOwnProperty(fieldName)) {
      // Initialize based on field type
      if (getFieldComponent(fieldName) === 'select') {
        formData.value[fieldName] = '';
      } else if (getInputType(fieldName) === 'number') {
        formData.value[fieldName] = '';
      } else if (fieldName === 'interest_products') {
        // Array field - initialize as empty array
        formData.value[fieldName] = [];
      } else {
        formData.value[fieldName] = '';
      }
    }
  });
  
  // Apply smart defaults after initialization
  // Use setTimeout to ensure computed properties are updated
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

// Watch for appKey changes
watch(() => props.appKey, () => {
  if (props.isOpen) {
    initializeFormData();
  }
});

// Watch for participationType changes
watch(() => props.participationType, () => {
  if (props.isOpen) {
    const classifierField = getClassifierField(props.appKey);
    if (classifierField && props.participationType) {
      const normalizedValue = props.participationType.charAt(0) + props.participationType.slice(1).toLowerCase();
      formData.value[classifierField] = normalizedValue;
      // Apply smart defaults after classifier is set
      setTimeout(() => {
        applySmartDefaults();
      }, 0);
    }
  }
});

// Watch for classifier value changes (when user changes type)
watch(controllingStateValue, (newValue, oldValue) => {
  if (props.isOpen && newValue && newValue !== oldValue) {
    // Classifier changed, apply smart defaults for newly visible fields
    setTimeout(() => {
      applySmartDefaults();
    }, 0);
  }
});

// Watch for visible state fields changes (when fields become visible)
watch(visibleStateFields, (newFields, oldFields) => {
  if (props.isOpen && newFields.length > 0) {
    // Check if any new fields became visible
    const newVisibleFields = newFields.filter(field => !oldFields || !oldFields.includes(field));
    if (newVisibleFields.length > 0) {
      // New fields became visible, apply defaults
      setTimeout(() => {
        applySmartDefaults();
      }, 0);
    }
  }
}, { deep: true });

// Close handler
const close = () => {
  if (!loading.value) {
    emit('close');
  }
};

// Handle form submission
const handleSubmit = async () => {
  // Guard: Check permission before submitting
  assertAttachPermission(props.appKey);
  
  error.value = null;
  validationErrors.value = {};
  
  // Validate required fields - only check visible fields
  const visibleFields = [
    ...visibleStateFields.value, // Only visible state fields
    ...detailFields.value // Only visible detail fields
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
  const enumFields = ['lead_status', 'contact_status', 'role', 'preferred_contact_method'];
  enumFields.forEach(field => {
    if (cleanedFormData[field] === '') {
      cleanedFormData[field] = null;
    }
  });
  
  // Sanitize payload: Only include VISIBLE participation fields
  // Hidden fields may exist in formData but must NOT be submitted
  const participationData = {};
  const classifierField = getClassifierField(props.appKey);
  
  // Only iterate over visible fields
  visibleParticipationFields.value.forEach(fieldName => {
    const value = cleanedFormData[fieldName];
    // Always include classifier field if it exists (even if prefilled)
    if (fieldName === classifierField && value) {
      participationData[fieldName] = value;
    } else if (value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
      participationData[fieldName] = value;
    }
  });
  
  // Defensive guardrail: Ensure no hidden fields are included
  // This catches regressions where hidden fields might accidentally be included
  if (process.env.NODE_ENV === 'development') {
    const allParticipationFieldNames = participationFields.value;
    const hiddenFields = allParticipationFieldNames.filter(fieldName => 
      !visibleParticipationFields.value.includes(fieldName)
    );
    
    const hiddenFieldsInPayload = hiddenFields.filter(fieldName => 
      participationData.hasOwnProperty(fieldName)
    );
    
    if (hiddenFieldsInPayload.length > 0) {
      const errorMessage = `Hidden participation field(s) were included in submission: ${hiddenFieldsInPayload.join(', ')}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
  
  loading.value = true;
  
  try {
    const participationType = props.participationType || 
      (participationData.type === 'Lead' ? 'LEAD' : 
       participationData.type === 'Contact' ? 'CONTACT' : null);
    
    const response = await apiClient.post(`/people/${props.personId}/attach`, {
      appKey: props.appKey,
      participationType: participationType,
      formData: participationData
    });
    
    if (response.success) {
      emit('attached', response.data);
      close();
    } else {
      if (response.errors) {
        validationErrors.value = response.errors;
        error.value = response.message || 'Validation failed. Please check the fields below.';
      } else {
        error.value = response.message || 'Failed to attach app participation';
      }
    }
  } catch (err) {
    console.error('Error attaching app participation:', err);
    
    if (err.response?.data?.errors) {
      validationErrors.value = err.response.data.errors;
      error.value = err.response.data.message || 'Validation failed. Please check the fields below.';
    } else if (err.response?.data?.message) {
      const errorMessage = err.response.data.message;
      // Preserve backend message for participation exists errors (includes conversion guidance)
      if (err.response.data.code === 'PARTICIPATION_EXISTS' || errorMessage.includes('already participates')) {
        error.value = errorMessage; // Use backend message which includes conversion guidance
      } else {
        error.value = errorMessage;
      }
    } else {
      error.value = err.message || 'Error attaching app participation';
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (props.isOpen) {
    initializeFormData();
  }
});
</script>

