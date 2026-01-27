<!--
  ============================================================================
  CREATEORGANIZATIONDRAWER CONTRACT
  ============================================================================
  
  CreateOrganizationDrawer
  Creation-only drawer with Quick → Full form behavior.
  
  ARCHITECTURAL INTENT:
  - ONE creation entry point for Organizations
  - Creation happens in a drawer with two modes: Quick Create (default) and Full Form (explicit expansion)
  - Both modes are creation-only (NOT editing, NOT OrganizationSurface)
  - Quick Create unblocks flow. Full Form is intentional completion. Both are creation-only.
  
  MODE BEHAVIOR:
  - mode: 'quick' | 'full' (default: 'quick')
  - Quick mode: Settings-driven fields only (Settings → Organizations → Quick Create)
  - Full mode: Locked fields (name, types, industry, website, phone, address)
  - Form state MUST be preserved across mode switches
  - No API call on mode switch
  
  CREATION INTENT INVARIANT
  ------------------------
  Quick Create and Full Form represent different user intents.
  
  - Draft values may persist across mode switches
  - ONLY fields visible in the active mode at submit time
    are allowed to be persisted
  
  Mode at submission time is the source of truth.
  
  Reference documents:
  - docs/architecture/organization-surface-invariants.md
  - docs/architecture/module-settings-doctrine.md
  
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
              enter="transform transition ease-in-out duration-300 sm:duration-300" 
              enter-from="translate-x-full" 
              enter-to="translate-x-0" 
              leave="transform transition ease-in-out duration-300 sm:duration-300" 
              leave-from="translate-x-0" 
              leave-to="translate-x-full"
            >
              <!-- Drawer width: compact for quick, slightly wider for full -->
              <DialogPanel :class="drawerPanelClass">
                <form @submit.prevent="handleSubmit" class="relative flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
                  <!-- Fixed Header -->
                  <div class="flex-shrink-0 bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6 border-b border-indigo-600 dark:border-indigo-700">
                    <div class="flex items-center justify-between">
                      <DialogTitle class="text-base font-semibold text-white">
                        {{ isEditMode ? 'Edit organization' : (mode === 'quick' ? 'Create organization' : 'Create organization — Full form') }}
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
                      <!-- UX microcopy: Clarify what will be saved in Quick Create mode -->
                      <p v-if="mode === 'quick'" class="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Only the organization name will be saved. Use Full Form to add business details.
                      </p>
                    </div>
                  </div>

                  <!-- Scrollable Content Area -->
                  <div class="flex-1 overflow-y-auto">
                    <div class="px-4 sm:px-6 py-6">
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
                          
                          <!-- QUICK CREATE MODE: Settings-driven fields (create only) -->
                          <template v-if="mode === 'quick' && !isEditMode">
                            <!-- 
                              ARCHITECTURAL INTENT: Quick Create Mode
                              - Render ONLY fields defined in Settings → Organizations → Quick Create
                              - name MUST be required and first
                              - Fields are fully settings-driven
                              - No hard-coded optional fields here
                            -->
                            <DynamicForm
                              module-key="organizations"
                              context="platform"
                              :form-data="formData"
                              :errors="errors"
                              :exclude-fields="excludeFields"
                              :show-all-fields="false"
                              :quick-create-mode="true"
                              @update:form-data="updateFormData"
                              @ready="onFormReady"
                            />
                          </template>

                          <!-- FULL FORM MODE: Locked fields (NOT settings-driven) -->
                          <template v-else>
                            <!-- 
                              ARCHITECTURAL INTENT: Full Form Mode
                              - Fields are LOCKED, NOT settings-driven
                              - Section 1: Core Identity (name, types)
                              - Section 2: Business Details (industry, website, phone, address)
                              - Explicit exclusions: status fields, app participation, ownership, tenant, system fields
                            -->
                            
                            <!-- Section 1: Core Identity -->
                            <div class="space-y-4">
                              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Core Identity</h3>
                              
                              <!-- Name (required) -->
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Name <span class="text-red-500">*</span>
                                </label>
                                <input
                                  v-model="formData.name"
                                  type="text"
                                  required
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder="Organization name"
                                />
                                <p v-if="errors.name" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                  {{ errors.name }}
                                </p>
                              </div>

                              <!-- Types (multi-select) -->
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Types
                                </label>
                                <div class="space-y-2">
                                  <label
                                    v-for="type in organizationTypes"
                                    :key="type"
                                    class="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      :value="type"
                                      v-model="formData.types"
                                      class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                                    />
                                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ type }}</span>
                                  </label>
                                </div>
                                <p v-if="errors.types" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                  {{ errors.types }}
                                </p>
                              </div>
                            </div>

                            <!-- Subtle divider -->
                            <div class="border-t border-gray-200 dark:border-gray-700 my-6"></div>

                            <!-- Section 2: Business Details -->
                            <div class="space-y-4">
                              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Business Details</h3>
                              
                              <!-- Industry -->
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Industry
                                </label>
                                <input
                                  v-model="formData.industry"
                                  type="text"
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder="e.g., Technology, Healthcare, Manufacturing"
                                />
                                <p v-if="errors.industry" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                  {{ errors.industry }}
                                </p>
                              </div>

                              <!-- Website -->
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Website
                                </label>
                                <input
                                  v-model="formData.website"
                                  type="url"
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder="https://example.com"
                                />
                                <p v-if="errors.website" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                  {{ errors.website }}
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
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder="+1 (555) 123-4567"
                                />
                                <p v-if="errors.phone" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                  {{ errors.phone }}
                                </p>
                              </div>

                              <!-- Address -->
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Address
                                </label>
                                <textarea
                                  v-model="formData.address"
                                  rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder="Street address, city, state, zip"
                                ></textarea>
                                <p v-if="errors.address" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                  {{ errors.address }}
                                </p>
                              </div>
                            </div>
                          </template>
                      </div>
                    </div>
                  </div>

                  <!-- Fixed Footer -->
                  <div class="flex-shrink-0 flex justify-end gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <!-- Left: Mode switch button (create mode only) -->
                    <div v-if="!isEditMode" class="flex-1">
                      <button 
                        v-if="mode === 'quick'"
                        type="button" 
                        class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" 
                        @click="switchToFull"
                      >
                        Full form
                      </button>
                      <button 
                        v-else
                        type="button" 
                        class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" 
                        @click="switchToQuick"
                      >
                        Back to quick
                      </button>
                    </div>

                    <!-- Right: Cancel and Save/Create buttons (always on the right) -->
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
                        :disabled="saving || !formData.name" 
                        class="inline-flex justify-center rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {{ saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create organization') }}
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

<script setup>
import { ref, computed, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import DynamicForm from '@/components/common/DynamicForm.vue';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialData: {
    type: Object,
    default: () => ({})
  },
  autoLinkContext: {
    type: Object,
    default: null
  },
  /**
   * Edit mode: organizationId (required when editing)
   */
  organizationId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const authStore = useAuthStore();
const { openTab } = useTabs();

// ============================================================================
// CREATION MODE STATE
// ============================================================================
// 
// createMode: Tracks the current submission intent
// This must update when the user toggles Quick Create ↔ Full Form
// Mode at submission time is the source of truth for field filtering
// Type: 'quick' | 'full'
//
const createMode = ref('quick');

// Edit mode: true if organizationId is provided
const isEditMode = computed(() => !!props.organizationId);

// Mode state: 'quick' | 'full' (default: 'quick')
// ARCHITECTURAL INTENT: Quick Create unblocks flow. Full Form is intentional completion. Both are creation-only.
// NOTE: This is the UI mode. createMode tracks submission intent and must be kept in sync.
// In edit mode, always start in 'full' mode to show all editable fields
const mode = ref('quick');

// Form data (preserved across mode switches)
const formData = ref({ ...props.initialData });
const errors = ref({});
const saving = ref(false);
const moduleDefinition = ref(null);

// Organization types (locked order for Full Form mode)
const organizationTypes = ['Customer', 'Partner', 'Vendor', 'Distributor', 'Dealer'];

// ============================================================================
// AUTHORITATIVE FIELD LISTS (DO NOT INFER FROM FILLED VALUES)
// ============================================================================
//
// QUICK_CREATE_FIELDS: Must exactly match Settings → Organizations → Quick Create
// Loaded from module definition (moduleDefinition.value.quickCreate)
//
// FULL_CREATE_FIELDS: Locked list of business organization fields
// May be expanded later, but this list is authoritative
//
const QUICK_CREATE_FIELDS = computed(() => {
  if (!moduleDefinition.value || !moduleDefinition.value.quickCreate) {
    // Fallback to default if module definition not loaded yet
    return ['name'];
  }
  
  // Quick Create: Only fields from Settings → Organizations → Quick Create
  const quickCreate = moduleDefinition.value.quickCreate || [];
  return quickCreate.map((f) => {
    return typeof f === 'string' ? f : (f.key || f);
  });
});

const FULL_CREATE_FIELDS = [
  'name',
  'types',
  'industry',
  'website',
  'phone',
  'address'
];

// Computed: Helper text based on mode
const helperText = computed(() => {
  if (isEditMode.value) {
    return 'Update business organization details.';
  }
  return mode.value === 'quick'
    ? 'Add only what\'s needed now. You can complete details in the full form.'
    : 'Create a new organization with complete business information.';
});

// Computed: Drawer panel class based on mode
const drawerPanelClass = computed(() => {
  return mode.value === 'quick'
    ? 'pointer-events-auto w-screen max-w-2xl h-full'
    : 'pointer-events-auto w-screen max-w-3xl h-full';
});

// Fields to exclude from Quick Create
// ARCHITECTURAL INTENT: Only core business fields are eligible for Quick Create
// Exclude: app participation fields, system fields, tenant fields, ownership/assignment fields
const excludeFields = ref([
  'createdBy',
  'assignedTo',
  'accountManager',
  'isTenant',
  'subscription',
  'enabledApps',
  'limits',
  'security',
  'customerStatus',
  'partnerStatus',
  'vendorStatus',
  'organizationId',
  'createdAt',
  'updatedAt',
  '_id',
  '__v'
]);

/**
 * Handle form ready event from DynamicForm (Quick Create mode only)
 */
const onFormReady = (module) => {
  if (module) {
    moduleDefinition.value = module;
    console.log('[OrganizationQuickCreate] Module ready, quickCreate fields:', module.quickCreate);
    console.log('[OrganizationQuickCreate] QUICK_CREATE_FIELDS computed:', QUICK_CREATE_FIELDS.value);
  }
};

/**
 * Update form data (preserved across mode switches)
 */
const updateFormData = (newData) => {
  formData.value = { ...newData };
};

/**
 * Switch to Full Form mode
 * ARCHITECTURAL INTENT: Mode switch preserves form state. No API call happens.
 * Updates both UI mode and submission intent mode.
 */
const switchToFull = () => {
  mode.value = 'full';
  createMode.value = 'full';
  
  // Ensure formData has structure for full form fields
  // DO NOT clear existing values - preserve drafts
  if (!formData.value.types) {
    formData.value.types = [];
  }
  if (!formData.value.industry) {
    formData.value.industry = '';
  }
  if (!formData.value.website) {
    formData.value.website = '';
  }
  if (!formData.value.phone) {
    formData.value.phone = '';
  }
  if (!formData.value.address) {
    formData.value.address = '';
  }
};

/**
 * Switch to Quick Create mode
 * ARCHITECTURAL INTENT: Mode switch preserves form state. No API call happens.
 * Updates both UI mode and submission intent mode.
 * DO NOT clear form state - preserve drafts for UX.
 */
const switchToQuick = () => {
  mode.value = 'quick';
  createMode.value = 'quick';
};

/**
 * Close drawer
 */
const closeDrawer = () => {
  emit('close');
};

/**
 * Handle dialog close (from overlay click)
 */
const handleDialogClose = () => {
  closeDrawer();
};

/**
 * Build create organization payload based on current mode
 * 
 * CRITICAL LOCK: This function filters payload based on createMode at submit time.
 * Draft values may persist in memory, but ONLY fields allowed in the active mode
 * are included in the payload.
 * 
 * @param {Record<string, any>} formState - Current form state (may contain draft values)
 * @returns {Record<string, any>} Filtered payload with only allowed fields
 */
function buildCreateOrganizationPayload(formState) {
  const allowedFields = createMode.value === 'quick'
    ? QUICK_CREATE_FIELDS.value
    : FULL_CREATE_FIELDS;

  const payload = {};
  
  // Only include fields that are in the allowed list for current mode
  for (const field of allowedFields) {
    if (field in formState) {
      const value = formState[field];
      
      // Handle different value types
      if (Array.isArray(value)) {
        // Include only non-empty arrays
        if (value.length > 0) {
          payload[field] = value;
        }
      } else if (typeof value === 'string') {
        // Include only non-empty strings (trimmed)
        const trimmed = value.trim();
        if (trimmed !== '') {
          payload[field] = trimmed;
        }
      } else if (value !== null && value !== undefined) {
        // Include other non-null values (numbers, booleans, etc.)
        payload[field] = value;
      }
    }
  }
  
  return payload;
}

/**
 * Handle form submission (both modes)
 * ARCHITECTURAL INTENT: Submission logic filters payload based on createMode.
 * Always send only allowed fields for the current mode. Backend enforces isTenant = false.
 */
const handleSubmit = async () => {
  saving.value = true;
  errors.value = {};
  
  try {
    // Validate required fields
    if (!formData.value.name || formData.value.name.trim() === '') {
      errors.value.name = 'Name is required';
      saving.value = false;
      return;
    }

    let response;
    
    if (isEditMode.value) {
      // EDIT MODE: PATCH /organizations/:id
      // Payload must be shape-complete: include all editable fields
      const payload = {
        name: formData.value.name.trim(),
        types: formData.value.types || [],
        industry: formData.value.industry?.trim() || null,
        website: formData.value.website?.trim() || null,
        phone: formData.value.phone?.trim() || null,
        address: formData.value.address?.trim() || null
      };
      
      response = await apiClient.patch(`/organizations/${props.organizationId}`, payload);
    } else {
      // CREATE MODE: POST /organizations
      // CRITICAL: Build payload using filtered function based on current createMode
      // This ensures only fields allowed in the active mode are persisted
      const payload = buildCreateOrganizationPayload(formData.value);
      
      response = await apiClient.post('/organizations', payload);
    }
    
    if (response.success) {
      const org = response.data;
      
      // In edit mode, just emit saved event
      if (isEditMode.value) {
        emit('saved', org);
        closeDrawer();
        return;
      }
      
      // CREATE MODE: Handle auto-link context if provided (e.g., from People surface)
      const createdOrg = org;
      if (props.autoLinkContext) {
        if (props.autoLinkContext.personId || props.autoLinkContext.contactId) {
          const personId = props.autoLinkContext.personId || props.autoLinkContext.contactId;
          try {
            // Link the created organization to the person
            await apiClient.put(`/api/people/${personId}`, {
              organization: createdOrg._id || createdOrg.id
            });
            console.log('[OrganizationQuickCreate] Auto-linked organization to person:', personId);
            
            // Emit refresh events
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('litedesk:refresh-person', {
                detail: { personId }
              }));
              window.dispatchEvent(new CustomEvent('litedesk:refresh-organization', {
                detail: { organizationId: createdOrg._id || createdOrg.id }
              }));
            }
          } catch (linkError) {
            console.error('[OrganizationQuickCreate] Failed to auto-link organization:', linkError);
            // Don't fail the creation if linking fails
          }
        }
      } else {
        // If invoked from Command Palette: Open OrganizationSurface in new tab
        const orgId = createdOrg._id || createdOrg.id;
        if (orgId) {
          openTab(`/organizations/${orgId}`);
        }
      }
      
      emit('saved', createdOrg);
      
      // Dispatch global event to refresh list views
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('litedesk:record-created', {
          detail: { moduleKey: 'organizations', record: createdOrg }
        }));
      }
      
      closeDrawer();
    } else {
      errors.value._general = response.message || 'Failed to create organization';
    }
  } catch (error) {
    console.error('[OrganizationQuickCreate] Error creating organization:', error);
    if (error.response?.data?.errors) {
      errors.value = { ...error.response.data.errors };
    } else {
      errors.value._general = error.message || 'Failed to create organization';
    }
  } finally {
    saving.value = false;
  }
};

// Fetch organization data for edit mode
const loading = ref(false);

const fetchOrganizationData = async () => {
  if (!isEditMode.value || !props.organizationId) return;
  
  loading.value = true;
  errors.value = {};
  
  try {
    const response = await apiClient.get(`/organizations/${props.organizationId}/editable`);
    
    if (response.success && response.data) {
      const data = response.data;
      
      // Defensive check: If API returns forbidden fields, show generic error
      const forbiddenFields = ['subscription', 'limits', 'enabledApps', 'billing', 'isTenant'];
      const hasForbiddenFields = forbiddenFields.some(field => data[field] !== undefined);
      
      if (hasForbiddenFields) {
        errors.value._general = 'Invalid data received. Please contact support.';
        console.error('API returned forbidden fields:', Object.keys(data));
        return;
      }
      
      // Populate form with fetched data
      formData.value = {
        name: data.name || '',
        types: Array.isArray(data.types) ? [...data.types] : [],
        industry: data.industry || '',
        website: data.website || '',
        phone: data.phone || '',
        address: data.address || ''
      };
      
      // In edit mode, always start in full mode
      mode.value = 'full';
      createMode.value = 'full';
    } else {
      errors.value._general = response.message || 'Failed to load organization data';
    }
  } catch (err) {
    console.error('Error fetching organization data:', err);
    
    if (err.response?.status === 404) {
      errors.value._general = 'Organization not found';
    } else if (err.response?.status === 403) {
      errors.value._general = 'You do not have permission to edit this organization';
    } else if (err.response?.data?.message) {
      errors.value._general = err.response.data.message;
    } else {
      errors.value._general = err.message || 'Failed to load organization data';
    }
  } finally {
    loading.value = false;
  }
};

// Reset form and mode when drawer opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (isEditMode.value) {
      // Edit mode: fetch organization data
      fetchOrganizationData();
    } else {
      // Create mode: use initial data
      formData.value = { ...props.initialData };
      errors.value = {};
      mode.value = 'quick'; // Reset to quick mode on open
      createMode.value = 'quick'; // Reset submission intent mode
    }
  }
});
</script>
