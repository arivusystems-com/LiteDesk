<template>
  <div class="mx-auto max-w-4xl">
    <!-- Ambiguous App Context Warning -->
    <div v-if="appContextResult?.isAmbiguous && !resolvedAppKey" class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            Ambiguous App Context
          </h3>
          <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            {{ appContextResult?.reason }}
          </p>
          <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Please select an app context to create a Person:
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="candidate in appContextResult?.candidates || []"
              :key="candidate"
              @click="selectAppContext(candidate)"
              class="px-3 py-1.5 text-sm font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors"
            >
              {{ candidate }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Type Ownership Ambiguity Warning -->
    <div v-if="quickCreateResult?.requiresUserChoice" class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            Type Ownership Ambiguity
          </h3>
          <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            {{ quickCreateResult?.reason }}
          </p>
          <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Please select which app to use:
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="candidate in quickCreateResult?.candidates || []"
              :key="candidate"
              @click="selectAppForType(candidate)"
              class="px-3 py-1.5 text-sm font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors"
            >
              {{ candidate }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-400"></div>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Resolving app context...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
            Error
          </h3>
          <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Intent Selection UI -->
    <div v-else-if="!finalAppKey" class="py-12">
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Select Intent
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Choose how you want to add this person:
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          v-for="intent in availableIntents"
          :key="intent.id"
          @click="selectIntent(intent)"
          class="px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
        >
          <div class="font-medium text-gray-900 dark:text-white">
            {{ intent.label }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ intent.description }}
          </div>
        </button>
      </div>
    </div>

    <!-- Form (only render when context is resolved and unambiguous) -->
    <div v-else-if="finalAppKey && !quickCreateResult?.requiresUserChoice">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Add Person</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          You are adding this person for <span class="font-semibold text-gray-900 dark:text-white">{{ formatAppName(finalAppKey) }}</span>.
          <span v-if="selectedType"> They will be added as <span class="font-medium">{{ formatAppName(finalAppKey) }}: {{ selectedType }}</span></span>
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Validation Errors Summary -->
        <div v-if="Object.keys(validationErrors).length > 0" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="flex-1">
              <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                Validation Errors
              </h3>
              <ul class="list-disc list-inside space-y-1">
                <li v-for="(message, field) in validationErrors" :key="field" class="text-sm text-red-700 dark:text-red-300">
                  <span class="font-medium">{{ field }}:</span> {{ message }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Core Fields Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Core Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- First Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.first_name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p v-if="validationErrors.first_name" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ validationErrors.first_name }}
              </p>
            </div>

            <!-- Last Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name
              </label>
              <input
                v-model="formData.last_name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p v-if="validationErrors.last_name" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ validationErrors.last_name }}
              </p>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                v-model="formData.email"
                type="email"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p v-if="validationErrors.email" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ validationErrors.email }}
              </p>
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p v-if="validationErrors.phone" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ validationErrors.phone }}
              </p>
            </div>

            <!-- Mobile -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mobile
              </label>
              <input
                v-model="formData.mobile"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p v-if="validationErrors.mobile" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ validationErrors.mobile }}
              </p>
            </div>

            <!-- Source -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source
              </label>
              <input
                v-model="formData.source"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <p v-if="validationErrors.source" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ validationErrors.source }}
              </p>
            </div>
          </div>
        </div>

        <!-- App-Specific Fields Section (only for resolved app) -->
        <div v-if="finalAppKey === 'SALES'" class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ formatAppName(finalAppKey) }} App Fields
          </h2>
          
          <!-- Participation (Read-Only, derived from intent) -->
          <div v-if="finalAppKey && selectedType" class="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Participation</div>
                <div class="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {{ formatAppName(finalAppKey) }} — {{ selectedType }}
                </div>
              </div>
            </div>
          </div>

          <!-- Sales-specific fields (only show if type is selected) -->
          <div v-if="selectedType" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Lead Status (if type is LEAD) -->
            <div v-if="selectedType === 'LEAD'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lead Status
              </label>
              <select
                v-model="formData.lead_status"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">Select status...</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Disqualified">Disqualified</option>
                <option value="Nurturing">Nurturing</option>
                <option value="Re-Engage">Re-Engage</option>
              </select>
            </div>

            <!-- Contact Status (if type is CONTACT) -->
            <div v-if="selectedType === 'CONTACT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Status
              </label>
              <select
                v-model="formData.contact_status"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">Select status...</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="DoNotContact">Do Not Contact</option>
              </select>
            </div>

            <!-- Lead Score (if type is LEAD) -->
            <div v-if="selectedType === 'LEAD'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lead Score
              </label>
              <input
                v-model.number="formData.lead_score"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <!-- Role (if type is CONTACT) -->
            <div v-if="selectedType === 'CONTACT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                v-model="formData.role"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">Select role...</option>
                <option value="Decision Maker">Decision Maker</option>
                <option value="Influencer">Influencer</option>
                <option value="Support">Support</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            @click="$router.back()"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="submitting">Creating...</span>
            <span v-else>Create Person</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';

const route = useRoute();
const router = useRouter();

// State
const loading = ref(false);
const error = ref(null);
const appContextResult = ref(null);
const resolvedAppKey = ref(null);
const typesResult = ref(null);
const selectedType = ref(null);
const quickCreateResult = ref(null);
const finalAppKey = ref(null);
const submitting = ref(false);
const validationErrors = ref({});
const selectedIntent = ref(null);

// Form data
const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  mobile: '',
  source: '',
  // Sales app fields
  type: '',
  lead_status: '',
  lead_score: null,
  contact_status: '',
  role: ''
});

// Intent mappings (explicit, deterministic)
const intentMappings = [
  { id: 'sales-lead', label: 'Add Sales Lead', description: 'Add as a Sales Lead', appKey: 'SALES', participationType: 'LEAD' },
  { id: 'sales-contact', label: 'Add Sales Contact', description: 'Add as a Sales Contact', appKey: 'SALES', participationType: 'CONTACT' },
  { id: 'support-contact', label: 'Add Support Contact', description: 'Add as a Support Contact', appKey: 'HELPDESK', participationType: 'CONTACT' },
  { id: 'audit-member', label: 'Add Audit Member', description: 'Add as an Audit Member', appKey: 'AUDIT', participationType: 'MEMBER' },
  { id: 'portal-user', label: 'Add Portal User', description: 'Add as a Portal User', appKey: 'PORTAL', participationType: 'USER' },
  { id: 'project-member', label: 'Add Project Member', description: 'Add as a Project Member', appKey: 'PROJECTS', participationType: 'MEMBER' }
];

// Computed
const availableIntents = computed(() => {
  return intentMappings;
});

const availableTypes = computed(() => {
  if (!typesResult.value?.aggregated || !finalAppKey.value) return [];
  
  // Filter types that are available for the resolved app
  return typesResult.value.aggregated.filter(type => {
    return type.owningApps.includes(finalAppKey.value);
  });
});

// Methods
// Select intent and proceed
const selectIntent = async (intent) => {
  selectedIntent.value = intent;
  resolvedAppKey.value = intent.appKey;
  finalAppKey.value = intent.appKey;
  selectedType.value = intent.participationType;
  
  // Call resolver after intent selection (silent, with explicit appKey)
  await resolveAppContextAfterIntent(intent.appKey);
};

// Resolver is called AFTER intent selection (not on mount)
// This function is called after user selects intent
const resolveAppContextAfterIntent = async (appKey) => {
  try {
    loading.value = true;
    error.value = null;

    // Build route info with explicit appKey from intent
    const routeInfo = {
      path: `/people/create`,
      name: 'people-create',
      params: {},
      query: {},
      meta: {}
    };

    // Call resolver with explicit appKey (should resolve deterministically)
    const response = await apiClient.post('/people/resolve-context', {
      routeInfo,
      navigationIntent: {
        intent: 'create',
        targetModuleKey: 'people',
        appKey: appKey // Explicit appKey from intent selection
      }
    });

    if (response.success) {
      appContextResult.value = response.data;
      resolvedAppKey.value = appKey; // Use appKey from intent, not resolver
      await resolveTypes();
      await resolveQuickCreate();
    } else {
      error.value = response.message || 'Failed to resolve app context';
    }
  } catch (err) {
    console.error('Error resolving app context:', err);
    error.value = err.message || 'Error resolving app context';
  } finally {
    loading.value = false;
  }
};

const resolveTypes = async () => {
  try {
    const response = await apiClient.post('/people/resolve-types');

    if (response.success) {
      typesResult.value = response.data;
    }
  } catch (err) {
    console.error('Error resolving types:', err);
  }
};

const resolveQuickCreate = async () => {
  if (!resolvedAppKey.value || !appContextResult.value) return;

  try {
    const selectedTypeKey = selectedType.value || null;
    const owningApps = selectedTypeKey
      ? (typesResult.value?.aggregated.find(t => t.typeKey === selectedTypeKey)?.owningApps || [])
      : [];

    const response = await apiClient.post('/people/resolve-quick-create', {
      selectedType: selectedTypeKey,
      owningApps,
      resolvedAppContext: appContextResult.value
    });

    if (response.success) {
      quickCreateResult.value = response.data;

      // DO NOT overwrite finalAppKey - it's set from intent and should remain locked
      // quickCreateResult is only used for validation/display purposes
      if (quickCreateResult.value.requiresUserChoice) {
        // This should not happen in intent-first flow, but if it does, keep finalAppKey from intent
        // finalAppKey.value remains unchanged (set from intent)
      }
      // finalAppKey.value remains unchanged - it's set from intent
    }
  } catch (err) {
    console.error('Error resolving quick create context:', err);
    // finalAppKey.value remains unchanged - it's set from intent
  }
};

const selectAppContext = async (appKey) => {
  resolvedAppKey.value = appKey;
  await resolveTypes();
  await resolveQuickCreate();
};

const selectAppForType = (appKey) => {
  finalAppKey.value = appKey;
  quickCreateResult.value = {
    appKey,
    requiresUserChoice: false,
    reason: `User selected app: ${appKey}`,
    confidence: 'HIGH'
  };
};

const handleTypeChange = async () => {
  await resolveQuickCreate();
};

// Format app name for display
const formatAppName = (appKey) => {
  if (!appKey) return '';
  const appNames = {
    'SALES': 'Sales',
    'HELPDESK': 'Helpdesk',
    'AUDIT': 'Audit',
    'PROJECTS': 'Projects',
    'PORTAL': 'Portal',
    'LMS': 'LMS'
  };
  return appNames[appKey] || appKey;
};

// Get display name for intent
const getIntentDisplayName = (intent) => {
  if (!intent) return '';
  // Convert "Add Sales Lead" to "Sales Lead", etc.
  return intent.label.replace('Add ', '');
};

const handleSubmit = async () => {
  // Explicit intent validation - appKey is required
  if (!finalAppKey.value) {
    error.value = 'App context is required. Cannot create person without explicit app selection.';
    return;
  }

  // Explicit intent validation - type is required for app participation
  if (availableTypes.value.length > 0 && !selectedType.value) {
    error.value = `Participation type is required. Please select a type for ${formatAppName(finalAppKey.value)}.`;
    validationErrors.value = { type: 'Participation type is required' };
    return;
  }

  if (!formData.value.first_name) {
    validationErrors.value = { first_name: 'First name is required' };
    return;
  }

  try {
    submitting.value = true;
    validationErrors.value = {};
    error.value = null;

    // Clean form data: convert empty strings to null for enum fields
    const cleanedFormData = { ...formData.value };
    const enumFields = ['lead_status', 'contact_status', 'role', 'source'];
    enumFields.forEach(field => {
      if (cleanedFormData[field] === '') {
        cleanedFormData[field] = null;
      }
    });

    const response = await apiClient.post('/people/create', {
      appKey: finalAppKey.value,
      selectedType: selectedType.value,
      formData: cleanedFormData
    });

    if (response.success) {
      // Navigate to the created person's detail page
      router.push(`/people/${response.data._id}`);
    } else {
      if (response.errors) {
        validationErrors.value = response.errors;
      } else {
        error.value = response.message || 'Failed to create person';
      }
    }
  } catch (err) {
    console.error('Error creating person:', err);
    console.error('Error response:', err.response?.data);
    console.error('Validation errors:', err.response?.data?.errors);
    
    // Handle validation errors from backend
    if (err.response?.data?.errors) {
      validationErrors.value = err.response.data.errors;
      error.value = err.response.data.message || 'Validation failed. Please check the fields below.';
      console.log('Set validationErrors:', validationErrors.value);
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else {
      error.value = err.message || 'Error creating person';
    }
  } finally {
    submitting.value = false;
  }
};

// Reset state function
const resetState = () => {
  selectedIntent.value = null;
  resolvedAppKey.value = null;
  finalAppKey.value = null;
  selectedType.value = null;
  appContextResult.value = null;
  typesResult.value = null;
  quickCreateResult.value = null;
  error.value = null;
  loading.value = false;
  submitting.value = false;
  validationErrors.value = {};
  formData.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    source: '',
    type: '',
    lead_status: '',
    lead_score: null,
    contact_status: '',
    role: ''
  };
};

// Lifecycle
// Reset state when component is activated (handles keep-alive cache)
onActivated(() => {
  resetState();
});

// Watch for type changes
watch(selectedType, () => {
  resolveQuickCreate();
});
</script>

