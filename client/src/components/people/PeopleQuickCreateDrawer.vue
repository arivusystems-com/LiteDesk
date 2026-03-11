<!--
  ============================================================================
  ARCHITECTURAL INVARIANT: PEOPLE QUICK CREATE DRAWER
  ============================================================================
  
  WHAT THIS SURFACE IS:
  - The SINGLE AUTHORITY for creating people records
  - Supports two modes: Quick Create (intent-agnostic) and Full Form (intent-gated)
  - Quick Create: Core identity fields only, no app participation
  - Full Form: Core + app participation fields, requires intent selection
  
  WHAT THIS SURFACE MUST NEVER DO:
  - MUST NOT send participation data in Quick Create mode
  - MUST NOT submit formData directly in Full Form mode (uses intent-authoritative payload)
  - MUST NOT allow Full Form submission without intent
  - MUST NOT mix Quick Create and Full Form submission logic
  
  INVARIANT LOCKS:
  - Full form submission ALWAYS requires intent (blocking gate)
  - Quick mode NEVER sends participation data (payload filter)
  - Full mode NEVER submits formData directly (builds intent-authoritative payload)
  
  ============================================================================
  PEOPLE CREATION FLOW ARCHITECTURE
  ============================================================================
  
  Quick Create and Full Form are progressive modes within the SAME drawer.
  
  QUICK CREATE MODE:
  - Intent-agnostic (no intent required)
  - Shows ONLY core identity fields (Settings → People → Quick Create)
  - Save creates Person with core fields only (no app participation)
  
  FULL FORM MODE:
  - Progressive disclosure:
    1. Core Identity fields (pre-filled from Quick Create)
    2. Intent Selection (mandatory, cannot proceed without it)
    3. App Participation fields (appear ONLY after intent selection)
  - Intent is selected within Full Form, not before
  - Once intent is selected, it is locked and cannot be changed
  
  INTENT RULES:
  - Intent is NOT part of Quick Create (stays minimal and intent-agnostic)
  - Intent is REQUIRED in Full Form before app fields appear
  - Intent determines which app fields are shown
  - Intent cannot be changed after selection
  
  MODE RULES:
  - Draft values persist across mode switches (Quick Create ↔ Full Form)
  - Switching back to Quick Create discards app fields and intent
  - ONLY fields visible in the active mode at submit time are persisted
  - Quick Create saves core fields only (ignores any app fields/intent)
  - Full Form saves core + app fields + intent
  
  Settings → People → Quick Create is the source of truth for Quick Create fields.
  Intent context (selected in Full Form) determines app participation fields.
  
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
                        {{ mode === 'quick' ? 'Create Contact' : 'Create Contact — Full Form' }}
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
                        <!-- Intent indicator (read-only, shows locked intent in Full Form) -->
                        <div v-if="mode === 'full' && intent" class="mt-2 flex items-center gap-2">
                          <span class="text-xs font-medium text-indigo-200">
                            Creating: {{ intent.intentLabel }}
                          </span>
                          <span 
                            v-for="appKey in intent.participatingApps" 
                            :key="appKey"
                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-600/50 text-indigo-100"
                          >
                            {{ formatAppName(appKey) }}
                          </span>
                        </div>
                        <!-- UX microcopy: Clarify what will be saved in Quick Create mode -->
                        <p v-if="mode === 'quick'" class="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          Only the selected quick create fields will be saved. Use Full Form to add more details.
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
                        
                        <!-- QUICK CREATE MODE: Settings-driven fields -->
                        <template v-if="mode === 'quick'">
                          <!-- 
                            ARCHITECTURAL INTENT: Quick Create Mode
                            - Render ONLY fields defined in Settings → People → Quick Create
                            - Drawer fetches people module with context=platform when open, passes as moduleOverride
                            - Ensures correct quickCreate config regardless of route/app context
                          -->
                          <div v-if="peopleModuleLoading" class="flex justify-center py-12">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                          </div>
                          <template v-else-if="peopleModuleOverride">
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
                          </template>
                          <p v-else class="text-sm text-amber-600 dark:text-amber-400">
                            Could not load People module. Please try again.
                          </p>
                        </template>

                        <!-- FULL FORM MODE: Intent-gated progressive disclosure -->
                        <template v-else>
                          <!-- 
                            ============================================================================
                            INTENT-GATED FULL FORM
                            ============================================================================
                            
                            Full Form MUST NOT render any fields until intent is selected.
                            Intent determines:
                              - App participation
                              - Field visibility
                            
                            This is intentional and must not be bypassed.
                            
                            Flow:
                            1. Intent Selection (blocking step - no fields render until selected)
                            2. Core Information (renders after intent selection, ordered by Settings → People → Quick Create)
                            3. App Participation Fields (renders after intent selection, based on intent)
                            
                            State Management:
                            - Quick Create uses formData (separate state)
                            - Full Form uses fullFormData (separate state)
                            - Switching modes does NOT auto-carry hidden fields
                            - Only visible fields at submit time are persisted
                            
                            ============================================================================
                          -->
                          
                          <!-- STEP 1: Intent Selection (BLOCKING GATE) -->
                          <!-- NO fields render until intent is selected -->
                          <template v-if="!getCurrentIntent()">
                            <div class="space-y-4">
                              <div>
                                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                  How will this person be used?
                                </h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                  Select how this person will be used to continue. This determines which fields will be available.
                                </p>
                                
                                <!-- Intent selector (radio cards) -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <button
                                    v-for="intentMapping in availableIntents"
                                    :key="intentMapping.id"
                                    type="button"
                                    @click="selectIntent(intentMapping)"
                                    class="px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                                  >
                                    <div class="flex items-start gap-3">
                                      <div class="flex-shrink-0 mt-0.5">
                                        <div 
                                          :class="[
                                            'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                            getCurrentIntent()?.intentKey === intentMapping.id
                                              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-400'
                                              : 'border-gray-300 dark:border-gray-600'
                                          ]"
                                        >
                                          <div 
                                            v-if="getCurrentIntent()?.intentKey === intentMapping.id"
                                            class="w-2 h-2 rounded-full bg-white"
                                          ></div>
                                        </div>
                                      </div>
                                      <div class="flex-1">
                                        <div class="font-medium text-gray-900 dark:text-white">
                                          {{ intentMapping.label }}
                                        </div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {{ intentMapping.description }}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </template>

                          <!-- STEP 2 & 3: Core Information + App Participation Fields (after intent selection) -->
                          <template v-else>
                            <!-- STEP 3: Render sections explicitly -->
                            <!-- Core Information fields render first -->
                            <!-- Intent-scoped App fields render as separate sections below -->
                            <div v-for="section in fullFormSections" :key="section.key" class="mb-6">
                              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                {{ section.label }}
                              </h3>
                              
                              <!-- Participation indicator for app sections -->
                              <div 
                                v-if="section.key !== 'core'" 
                                class="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg mb-4"
                              >
                                <div class="flex items-center gap-2">
                                  <svg class="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                  </svg>
                                  <div>
                                    <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Participation</div>
                                    <div class="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                      {{ section.label }}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <!-- Description for core section -->
                              <p 
                                v-if="section.key === 'core'" 
                                class="text-xs text-gray-500 dark:text-gray-400 mb-4"
                              >
                                Basic identity information. Fields are ordered according to Settings → People → Quick Create.
                              </p>

                              <DynamicForm
                                moduleKey="people"
                                :formData="fullFormData"
                                :errors="errors"
                                :fieldsOverride="section.fields"
                                :quickCreateMode="false"
                                :showAllFields="false"
                                @update:formData="(val: Record<string, any>) => Object.assign(fullFormData, val)"
                                @ready="onFormReady"
                              />
                            </div>
                            
                            <!-- Show message if intent selected but no sections (should not happen) -->
                            <p
                              v-if="getCurrentIntent() && fullFormSections.length === 0"
                              class="text-sm text-gray-500 dark:text-gray-400 italic"
                            >
                              This intent does not activate any fields.
                            </p>
                          </template>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- Fixed Footer -->
                  <div class="flex-shrink-0 flex justify-between gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <!-- Left: Mode switch button -->
                    <button 
                      v-if="mode === 'quick'"
                      type="button" 
                      class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" 
                      @click="switchToFull"
                    >
                      Full Form
                    </button>
                    <button 
                      v-else
                      type="button" 
                      class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" 
                      @click="switchToQuick"
                    >
                      Back to Quick Create
                    </button>

                    <!-- Right: Cancel and Create buttons -->
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
                        :disabled="saving || (mode === 'full' && !intent)" 
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

import { ref, computed, watch, reactive } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import DynamicForm from '@/components/common/DynamicForm.vue';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import { getFieldMetadata, getCoreIdentityFields } from '@/platform/fields/peopleFieldModel';
import type { CreatePersonIntentContext, FieldKey, AppKey } from '@/types/personCreation.types';
import { buildIntentContext, DEFAULT_INTENT_MAPPINGS, getAppsForIntent, type IntentMapping } from '@/utils/personCreationUtils';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  /**
   * Intent context (OPTIONAL)
   * 
   * ARCHITECTURAL INTENT: Intent is NOT required for Quick Create.
   * - Quick Create works without intent (intent-agnostic)
   * - Full Form requires intent selection within the drawer
   * - Intent can be provided as prop (e.g., from command palette with specific intent)
   * - If not provided, user selects intent in Full Form mode
   */
  intentContext: {
    type: Object as () => CreatePersonIntentContext | null,
    required: false,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const authStore = useAuthStore();
const { openTab } = useTabs();

// ============================================================================
// DRAWER STATE MODEL
// ============================================================================
//
// mode: 'quick' | 'full' - Current data-entry mode
//   - 'quick': Quick Create mode (intent-agnostic, core fields only)
//   - 'full': Full Form mode (requires intent selection, then shows app fields)
//
// intent: null | CreatePersonIntentContext - Selected intent (if any)
//   - null in Quick Create mode
//   - null initially in Full Form mode (user must select)
//   - Set to intent context after user selects intent in Full Form
//   - Once set, cannot be changed (locked)
//
// STEP 1: Introduce explicit form mode
const mode = ref<'quick' | 'full'>('quick');
const formMode = ref<'quick' | 'full'>('quick');

// Sync formMode with mode
watch(mode, (newMode) => {
  formMode.value = newMode;
}, { immediate: true });
const intent = ref<CreatePersonIntentContext | null>(props.intentContext || null);

// People module fetched with context=platform when drawer opens (ensures Settings Quick Create always used)
const peopleModuleOverride = ref<any>(null);
const peopleModuleLoading = ref(false);

// Fetch people module from quick-create endpoint (single source: Settings → People → Quick Create).
watch(() => props.isOpen, async (open) => {
  if (!open) {
    peopleModuleOverride.value = null;
    peopleModuleLoading.value = false;
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

// Sync intent from props if provided
watch(() => props.intentContext, (newIntent) => {
  if (newIntent && !intent.value) {
    intent.value = newIntent;
  }
}, { immediate: true });

// Form data (separate state for Quick Create and Full Form)
// ARCHITECTURAL INTENT: Quick Create and Full Form maintain separate form state
// This prevents data leakage between modes
const formData = ref<Record<string, any>>({}); // Quick Create form state
const fullFormData = reactive<Record<string, any>>({}); // Full Form form state - shared reactive object for all DynamicForm instances
const errors = ref<Record<string, string>>({});
const saving = ref(false);
const moduleDefinition = ref<any>(null);
const eligibleFieldKeys = ref<Set<string>>(new Set()); // Set of field keys eligible for Quick Create
const excludeFields = ref<string[]>([]); // Fields to exclude from DynamicForm

// Computed: Fields to exclude in Full Form mode (intent-gated)
// ARCHITECTURAL INTENT: In Full Form, exclude all fields NOT in the intent's field list
const fullFormExcludeFields = computed(() => {
  if (mode.value !== 'full' || !intent.value) {
    return excludeFields.value; // Use default excludes if not in Full Form or no intent
  }
  
  // Get all fields from module definition
  if (!moduleDefinition.value || !moduleDefinition.value.fields) {
    return excludeFields.value;
  }
  
  const allFieldKeys = (moduleDefinition.value.fields as any[]).map((f: any) => f.key).filter(Boolean) as string[];
  const allowedFieldKeys = FULL_CREATE_FIELDS.value; // Fields allowed by intent
  
  // Exclude all fields NOT in the allowed list
  const fieldsToExclude = allFieldKeys.filter((fieldKey: string) => !allowedFieldKeys.includes(fieldKey));
  
  // Combine with default excludes
  return [...excludeFields.value, ...fieldsToExclude];
});

// ============================================================================
// PARTICIPATION FIELDS (UNCONDITIONAL LOADING)
// ============================================================================
//
// STEP 3: Load participation fields unconditionally
// This must NOT depend on intent - fields are loaded from module definition
//
/**
 * All participation fields from module definition
 * 
 * ARCHITECTURAL INTENT: Load ALL participation fields unconditionally.
 * This ensures field metadata is always available for filtering.
 */
const allParticipationFields = computed(() => {
  if (!moduleDefinition.value || !moduleDefinition.value.fields) {
    return [];
  }
  
  const allFields = (moduleDefinition.value.fields as any[]) || [];
  const participationFields: Array<{ key: string; appKey?: AppKey }> = [];
  
  for (const field of allFields) {
    if (!field.key) continue;
    
    try {
      const normalized = normalizeFieldKey(field.key);
      if (!normalized) continue;
      
      const metadata = getFieldMetadata(normalized);
      
      // Include fields with owner === 'participation'
      if (metadata.owner === 'participation') {
        // Normalize appKey to uppercase (canonical form)
        const appKey = (metadata.fieldScope || '').toUpperCase() as AppKey;
        participationFields.push({
          key: field.key,
          appKey
        });
      }
    } catch (err) {
      // Field not in metadata - skip
      continue;
    }
  }
  
  console.log('[PeopleQuickCreateDrawer] allParticipationFields loaded:', {
    count: participationFields.length,
    fields: participationFields.map(f => ({ key: f.key, appKey: f.appKey }))
  });
  
  return participationFields;
});

// ============================================================================
// VISIBLE APP FIELDS (FILTERED AT RENDER TIME)
// ============================================================================
//
// STEP 4: Filter ONLY at render time
//
/**
 * Visible app fields filtered by participating apps
 * 
 * ARCHITECTURAL INTENT: Filter participation fields based on selected intent.
 * Only fields belonging to apps in participatingApps are shown.
 */
const visibleAppFields = computed(() => {
  // DEFENSIVE GUARD: Never render app fields without intent
  if (!intent.value || participatingApps.value.length === 0) {
    console.log('[PeopleQuickCreateDrawer] visibleAppFields: No intent or participatingApps', {
      hasIntent: !!intent.value,
      participatingApps: participatingApps.value
    });
    return [];
  }
  
  // Filter participation fields by participating apps
  // STEP 4: Filter ONLY at render time based on participatingApps
  const filtered = allParticipationFields.value.filter(field => {
    if (!field.appKey) return false;
    // Normalize both sides to uppercase for canonical matching
    const fieldAppKeyUpper = field.appKey.toUpperCase() as AppKey;
    const participatingAppsUpper = participatingApps.value.map(a => a.toUpperCase() as AppKey);
    return participatingAppsUpper.includes(fieldAppKeyUpper);
  });
  
  console.log('[PeopleQuickCreateDrawer] visibleAppFields computed:', {
    intent: intent.value?.intentKey,
    participatingApps: participatingApps.value,
    allParticipationFieldsCount: allParticipationFields.value.length,
    visibleFieldsCount: filtered.length,
    visibleFields: filtered.map(f => f.key)
  });
  
  return filtered.map(f => f.key);
});

// STEP 5: Remove exclusion filtering for full form
// Filtering belongs ONLY to quick create
// Full form uses fieldsOverride to explicitly specify which fields to show
// (appParticipationExcludeFields removed - no longer needed)

/**
 * Normalize field key to match peopleFieldModel format
 * Handles snake_case <-> camelCase conversion
 */
function normalizeFieldKey(fieldKey: string | null | undefined): string | null {
  if (!fieldKey) return null;
  
  // Try direct match first
  try {
    getFieldMetadata(fieldKey);
    return fieldKey;
  } catch {
    // Try snake_case to camelCase (first_name -> firstName)
    if (fieldKey.includes('_')) {
      const camelCase = fieldKey.replace(/_([a-z])/g, (_g: string, letter: string) => letter.toUpperCase());
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
function isFieldEligibleForQuickCreate(fieldKey: string | null | undefined): boolean {
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
function initializeEligibleFields(module: any) {
  if (!module || !module.fields) return;
  
  const eligible = new Set<string>();
  const exclude: string[] = [];
  
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

// ============================================================================
// AUTHORITATIVE FIELD LISTS (DERIVED FROM MODE AND INTENT)
// ============================================================================
//
// Field derivation rules:
// - Quick Create: Core identity fields only (Settings → People → Quick Create)
// - Full Form + no intent: Core identity fields only
// - Full Form + intent: Core identity + app fields from intent
//
// CRITICAL: Fields are derived from mode and intent, NOT from filled values.
//
const QUICK_CREATE_FIELDS = computed(() => {
  if (!moduleDefinition.value || !moduleDefinition.value.quickCreate) {
    return [];
  }
  
  // Quick Create: Only core identity fields from Settings
  return (moduleDefinition.value.quickCreate as any[]).map((f: any) => {
    return typeof f === 'string' ? f : (f.key || f);
  });
});

// Use only Settings → People → Quick Create; no client-side default.
const quickCreateFieldsOverride = computed(() => {
  const mod = peopleModuleOverride.value;
  if (!mod?.quickCreate?.length) return null;
  return (mod.quickCreate as any[]).map((f: any) => (typeof f === 'string' ? f : (f?.key ?? f)));
});

// STEP 2: Core intent fields for full form (core identity fields)
const coreIntentFields = computed(() => {
  return QUICK_CREATE_FIELDS.value;
});

// STEP 2: Build sectioned field model in PeopleQuickCreateDrawer
// Full form must be intent-scoped, not app-scoped
// Fields are organized into sections: Core Information and App Participation
const fullFormSections = computed(() => {
  if (!intent.value) return [];
  
  // Get excluded fields from intent (structural fields like 'type')
  const excluded = new Set(intent.value.excludedFields || []);
  
  // Core Information section
  const coreSection = {
    key: 'core',
    label: 'Core Information',
    fields: (intent.value.coreFields || []).filter(f => !excluded.has(f))
  };
  
  // App Participation sections (one per participating app)
  const appSections = (intent.value?.participatingApps || []).map((appKey: AppKey) => {
    const appFields = ((intent.value?.appFields?.[appKey] as FieldKey[]) || [])
      .filter((f: FieldKey) => !excluded.has(f));
    
    return {
      key: appKey,
      label: `${formatAppName(appKey)} — ${intent.value?.participationType || ''}`,
      fields: appFields
    };
  });
  
  const result = [coreSection, ...appSections].filter(section => section.fields.length > 0);
  
  // STEP 4: Add invariant (lock correctness)
  console.assert(
    !result.some(s => s.fields.includes('type')),
    '[PeopleQuickCreateDrawer] Structural fields must not render in creation forms',
    {
      sections: result.map(s => ({ key: s.key, fields: s.fields })),
      excludedFields: Array.from(excluded),
      intent: intent.value.intentKey
    }
  );
  
  console.log('[PeopleQuickCreateDrawer] fullFormSections computed:', {
    intent: intent.value?.intentKey,
    sections: result.map(s => ({ key: s.key, label: s.label, fieldCount: s.fields.length })),
    excludedFields: Array.from(excluded)
  });
  
  return result;
});

const FULL_CREATE_FIELDS = computed(() => {
  // Start with core identity fields
  const coreFields = QUICK_CREATE_FIELDS.value;
  
  // DEFENSIVE CHECK: If no intent selected in Full Form, return only core fields
  // This ensures app fields NEVER render without intent
  if (!intent.value) {
    return coreFields;
  }
  
  // DEFENSIVE CHECK: Ensure intent has required structure
  if (!intent.value.participatingApps || !Array.isArray(intent.value.participatingApps)) {
    console.warn('[PeopleQuickCreateDrawer] Intent missing participatingApps, returning core fields only');
    return coreFields;
  }
  
  // Add app-specific fields from intent context
  // Only include fields for apps in intent.participatingApps
  const appFieldsFromIntent: FieldKey[] = [];
  
  for (const appKey of intent.value.participatingApps) {
    if (intent.value.appFields && intent.value.appFields[appKey]) {
      appFieldsFromIntent.push(...intent.value.appFields[appKey]);
    }
  }
  
  // Combine core fields with app fields
  const allFields = Array.from(new Set([...coreFields, ...appFieldsFromIntent]));
  
  console.log('[PeopleQuickCreateDrawer] FULL_CREATE_FIELDS computed:', {
    coreFields,
    appFieldsFromIntent,
    allFields,
    intent: intent.value.intentKey
  });
  
  // Filter to only include fields that exist in module definition and are editable
  if (!moduleDefinition.value || !moduleDefinition.value.fields) {
    return allFields; // Return fields even if module not loaded yet
  }
  
  const moduleFieldKeys = new Set((moduleDefinition.value.fields as any[]).map((f: any) => f.key));
  
  const filteredFields = allFields.filter((fieldKey: string) => {
    // Must exist in module definition
    if (!moduleFieldKeys.has(fieldKey)) {
      return false;
    }
    
    // Get field definition
    const field = (moduleDefinition.value?.fields as any[])?.find((f: any) => f.key === fieldKey);
    if (!field) return false;
    
    // Exclude read-only fields
    if (field.readOnly === true) {
      return false;
    }
    
    // Exclude system fields
    const systemFieldKeys = [
      'organizationid', 'createdat', 'updatedat', '_id', '__v', 'createdby',
      'eventid', 'createdtime', 'modifiedby', 'modifiedtime', 'audithistory', 'status'
    ];
    if (systemFieldKeys.includes(fieldKey.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  console.log('[PeopleQuickCreateDrawer] FULL_CREATE_FIELDS filtered:', filteredFields);
  
  return filteredFields;
});

// Available intents for selection
const availableIntents = computed(() => {
  return DEFAULT_INTENT_MAPPINGS;
});

// Helper function for template access to intent (fixes TypeScript template checking)
const getCurrentIntent = (): CreatePersonIntentContext | null => intent.value;

// ============================================================================
// PARTICIPATING APPS (DERIVED FROM INTENT)
// ============================================================================
//
// ARCHITECTURAL INTENT: Participating apps are derived from the selected intent.
// This uses the same intent → app mapping used in command palette creation.
//
// CRITICAL: App participation fields are gated on participatingApps.length > 0
//
/**
 * Get participating apps for the current intent
 * 
 * STEP 2: Assert intent → apps resolution
 * 
 * This computed value resolves participating apps from the selected intent.
 * It uses the same intent → app mapping used in command palette creation.
 * 
 * @returns Array of app keys (e.g., ['SALES'], ['HELPDESK']) - ALWAYS UPPERCASE
 */
const participatingApps = computed(() => {
  if (!intent.value) {
    console.log('[PeopleQuickCreateDrawer] participatingApps: No intent selected');
    return [];
  }
  const apps = getAppsForIntent(intent.value);
  // Assert: ensure we always return an array of uppercase app keys
  const normalized = Array.isArray(apps) ? apps.map(a => a.toUpperCase() as AppKey) : [];
  console.log('[PeopleQuickCreateDrawer] participatingApps computed:', {
    intent: intent.value?.intentKey,
    apps,
    normalized,
    nonEmpty: normalized.length > 0
  });
  return normalized;
});

// Computed: Helper text based on mode
const helperText = computed(() => {
  return mode.value === 'quick'
    ? 'Create a new contact with core identity information.'
    : intent.value
      ? 'Create a new contact with complete information.'
      : 'Create a new contact with complete information. Select how this person will be used to continue.';
});

// Format app name for display
const formatAppName = (appKey: string) => {
  if (!appKey) return '';
  const appNames: Record<string, string> = {
    'SALES': 'Sales',
    'HELPDESK': 'Helpdesk',
    'AUDIT': 'Audit',
    'PROJECTS': 'Projects',
    'PORTAL': 'Portal',
    'LMS': 'LMS'
  };
  return appNames[appKey] || appKey;
};

/**
 * Select intent in Full Form mode
 * 
 * ARCHITECTURAL INTENT: Intent is selected within Full Form.
 * Once selected, it is locked and cannot be changed.
 * Core Information and App Participation fields appear after intent selection.
 * 
 * This is a blocking step - no fields render until intent is selected.
 */
const selectIntent = async (intentMapping: IntentMapping) => {
  // Get core fields from module definition (quickCreate fields)
  const coreFields = QUICK_CREATE_FIELDS.value;
  
  // Build base intent context from mapping with actual core fields
  const baseContext = buildIntentContext(intentMapping, coreFields);
  
  // Derive app fields from module definition based on intent
  // This ensures app fields are populated from the actual module configuration
  const appFields = deriveAppFieldsFromIntent(intentMapping, baseContext);
  
  // STEP 1: Define excluded fields (structural fields that should not render)
  // 'type' is excluded because participation type is shown via badge, not field
  const excludedFields: FieldKey[] = ['type'];
  
  // Build complete intent context with app fields and excluded fields
  intent.value = {
    ...baseContext,
    coreFields, // Use actual quickCreate fields from module
    appFields: {
      [intentMapping.appKey]: appFields
    },
    excludedFields
  };
  
  // Initialize fullFormData with all fields from sections (with empty defaults)
  // This ensures fields are present in fullFormData even if not touched
  const allSectionFields: string[] = [];
  if (intent.value.coreFields) {
    allSectionFields.push(...intent.value.coreFields);
  }
  if (intent.value?.appFields && intent.value.appFields[intentMapping.appKey]) {
    const appFieldsArray = intent.value.appFields[intentMapping.appKey] as FieldKey[];
    if (Array.isArray(appFieldsArray)) {
      allSectionFields.push(...appFieldsArray);
    }
  }
  
  // Initialize fullFormData with empty values for all section fields
  for (const field of allSectionFields) {
    if (!excludedFields.includes(field) && !(field in fullFormData)) {
      (fullFormData as Record<string, any>)[field] = '';
    }
  }
  
  console.log('[PeopleQuickCreateDrawer] Intent selected:', intent.value);
  console.log('[PeopleQuickCreateDrawer] App fields derived:', appFields);
  console.log('[PeopleQuickCreateDrawer] Initialized fullFormData with fields:', {
    fields: Object.keys(fullFormData),
    fieldCount: Object.keys(fullFormData).length,
    coreFields: intent.value.coreFields,
    appFields: intent.value.appFields[intentMapping.appKey]
  });
  console.log('[PeopleQuickCreateDrawer] Core Information and App Participation fields will now render');
};

/**
 * Derive app-specific fields from intent and module definition
 * 
 * ARCHITECTURAL INTENT: App fields are derived from:
 * - Intent's app key (e.g., 'SALES')
 * - Intent's participation type (e.g., 'LEAD', 'CONTACT')
 * - Module definition fields (from Settings)
 * 
 * Only fields that belong to the intent's app and are relevant to the participation type are included.
 */
function deriveAppFieldsFromIntent(intentMapping: IntentMapping, baseContext: CreatePersonIntentContext): FieldKey[] {
  if (!moduleDefinition.value || !moduleDefinition.value.fields) {
    console.warn('[PeopleQuickCreateDrawer] Module definition not loaded, returning empty app fields');
    return [];
  }
  
  const appKey = intentMapping.appKey;
  const participationType = intentMapping.participationType;
  
  // Get all fields from module definition
  const allFields = moduleDefinition.value.fields;
  
  // Filter to app-specific fields based on field metadata
  const appFields: FieldKey[] = [];
  
  // Define app-specific field mappings by intent
  // These are the fields that should appear for each intent (using actual field keys from module)
  const intentFieldMappings: Record<string, string[]> = {
    'sales-lead': ['type', 'lead_status', 'lead_score', 'lead_owner', 'interest_products', 
                   'qualification_date', 'qualification_notes', 'estimated_value'],
    'sales-contact': ['type', 'contact_status', 'role', 'birthday', 'preferred_contact_method'],
    'support-contact': [], // Helpdesk app fields (if any)
    'audit-member': [], // Audit app fields (if any)
    'portal-user': [], // Portal app fields (if any)
    'project-member': [] // Projects app fields (if any)
  };
  
  // Get expected field names for this intent
  const expectedFieldNames = intentFieldMappings[intentMapping.id] || [];
  
  // Create a map of all fields by their normalized keys for lookup
  const fieldMapByNormalizedKey = new Map<string, typeof allFields[0]>();
  for (const field of allFields) {
    if (!field.key) continue;
    const normalized = normalizeFieldKey(field.key);
    if (normalized) {
      fieldMapByNormalizedKey.set(normalized.toLowerCase(), field);
      // Also map by original key
      fieldMapByNormalizedKey.set(field.key.toLowerCase(), field);
    }
  }
  
  // First, add fields from the expected list
  for (const expectedFieldName of expectedFieldNames) {
    const field = fieldMapByNormalizedKey.get(expectedFieldName.toLowerCase());
    if (field && !field.readOnly && !appFields.includes(field.key)) {
      appFields.push(field.key);
    }
  }
  
  // Also check all fields by metadata for app-specific fields
  for (const field of allFields) {
    if (!field.key || appFields.includes(field.key)) continue;
    
    const normalizedKey = normalizeFieldKey(field.key);
    if (!normalizedKey) continue;
    
    try {
      const metadata = getFieldMetadata(normalizedKey);
      
      // Include participation fields for this app
      if (metadata.owner === 'participation' && metadata.fieldScope === appKey) {
        // For Sales, filter by participation type
        if (appKey === 'SALES') {
          if (participationType === 'LEAD') {
            // Include lead-specific fields
            const leadFields = ['lead_status', 'lead_score', 'lead_owner', 'interest_products', 
                               'qualification_date', 'qualification_notes', 'estimated_value', 'type'];
            if (leadFields.includes(normalizedKey)) {
              if (!field.readOnly) {
                appFields.push(field.key);
              }
            }
          } else if (participationType === 'CONTACT') {
            // Include contact-specific fields
            const contactFields = ['contact_status', 'role', 'birthday', 'preferred_contact_method', 'type'];
            if (contactFields.includes(normalizedKey)) {
              if (!field.readOnly) {
                appFields.push(field.key);
              }
            }
          }
        } else {
          // For other apps, include all participation fields for that app
          if (!field.readOnly) {
            appFields.push(field.key);
          }
        }
      }
    } catch (err) {
      // Field not in metadata - skip
      continue;
    }
  }
  
  // Verify all derived app fields exist in module definition
  const moduleFieldKeysSet = new Set(allFields.map((f: any) => f.key?.toLowerCase()).filter(Boolean) as string[]);
  const verifiedAppFields = appFields.filter((fieldKey: string) => {
    const fieldKeyLower = fieldKey?.toLowerCase();
    const normalized = normalizeFieldKey(fieldKey);
    const normalizedLower = normalized?.toLowerCase();
    
    const exists = moduleFieldKeysSet.has(fieldKeyLower) || 
                   (normalizedLower && moduleFieldKeysSet.has(normalizedLower));
    
    if (!exists) {
      console.warn(`[PeopleQuickCreateDrawer] App field "${fieldKey}" not found in module definition`, {
        fieldKey,
        normalized,
        moduleFieldKeys: Array.from(moduleFieldKeysSet)
      });
    }
    
    return exists;
  });
  
  if (verifiedAppFields.length !== appFields.length) {
    console.warn('[PeopleQuickCreateDrawer] Some app fields were filtered out:', {
      original: appFields,
      verified: verifiedAppFields,
      filtered: appFields.filter(f => !verifiedAppFields.includes(f))
    });
  }
  
  console.log('[PeopleQuickCreateDrawer] Derived app fields:', {
    intent: intentMapping.id,
    appKey,
    participationType,
    appFields,
    verifiedAppFields,
    allModuleFieldKeys: allFields.map((f: any) => f.key)
  });
  
  return verifiedAppFields;
}

// Computed: Drawer panel class based on mode
const drawerPanelClass = computed(() => {
  return mode.value === 'quick'
    ? 'pointer-events-auto w-screen max-w-2xl h-full'
    : 'pointer-events-auto w-screen max-w-3xl h-full';
});

/**
 * Switch to Full Form mode
 * ARCHITECTURAL INTENT: Full Form starts with intent selection (no fields render).
 * State is kept separate - Quick Create state is NOT carried over.
 * Intent starts as null and must be selected before any fields render.
 * 
 * CRITICAL: No fields render until intent is selected. This is intentional.
 */
const switchToFull = () => {
  mode.value = 'full';
  formMode.value = 'full'; // STEP 1: Update form mode
  // Reset intent - user must select in Full Form (blocking step)
  intent.value = null;
  
  // Initialize fullFormData with core fields from Quick Create (if any)
  // This allows user to see their Quick Create data when fields render after intent selection,
  // but state remains separate to prevent data leakage
  const coreFieldKeys = QUICK_CREATE_FIELDS.value;
  
  // Clear existing fullFormData and populate with Quick Create data
  Object.keys(fullFormData).forEach((key: string) => delete (fullFormData as Record<string, any>)[key]);
  
  for (const key of coreFieldKeys) {
    if (key in formData.value) {
      (fullFormData as Record<string, any>)[key] = (formData.value as Record<string, any>)[key];
    }
  }
  
  console.log('[PeopleQuickCreateDrawer] Switched to Full Form, intent reset, separate state initialized');
  console.log('[PeopleQuickCreateDrawer] No fields will render until intent is selected');
};

/**
 * Switch to Quick Create mode
 * ARCHITECTURAL INTENT: Mode switch discards Full Form state (app fields and intent).
 * Only core identity fields from Quick Create are preserved.
 * This ensures Quick Create saves only core fields and never leaks app data.
 */
const switchToQuick = () => {
  mode.value = 'quick';
  formMode.value = 'quick'; // STEP 1: Update form mode
  
  // Discard Full Form state completely
  intent.value = null;
  // Clear fullFormData (reactive object)
  Object.keys(fullFormData).forEach(key => delete fullFormData[key]);
  
  // Quick Create formData remains unchanged (already contains only core fields)
  // No need to filter - formData is already Quick Create state
  
  console.log('[PeopleQuickCreateDrawer] Switched to Quick Create, discarded Full Form state (intent + app fields)');
};

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

const updateFormData = (data: Record<string, any>) => {
  formData.value = { ...data };
};

const updateFullFormData = (data: Record<string, any>) => {
  // Merge updates into shared reactive object
  // This ensures all DynamicForm instances share the same state
  Object.assign(fullFormData, data);
};

const onFormReady = (module: any) => {
  moduleDefinition.value = module;
  initializeEligibleFields(module);
  
  // Initialize Quick Create form with empty defaults for eligible fields only
  // ARCHITECTURAL INTENT: Only initialize formData (Quick Create state)
  // fullFormData is initialized separately when switching to Full Form
  if (mode.value === 'quick') {
    const initialForm: Record<string, any> = {};
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
  }
};

// Watch for form data changes and clear errors for fields that are now valid
// Watch both formData (Quick Create) and fullFormData (Full Form)
watch(() => [formData.value, fullFormData], ([newQuickData, newFullData], [oldQuickData, oldFullData]) => {
  if (!moduleDefinition.value) return;
  
  // Determine which form state is active
  const activeFormData = mode.value === 'quick' ? newQuickData : newFullData;
  const oldFormData = mode.value === 'quick' ? oldQuickData : oldFullData;
  
  if (!oldFormData) return;
  
  const changedFields = new Set<string>();
  for (const key in activeFormData) {
    if ((activeFormData as Record<string, any>)[key] !== (oldFormData as Record<string, any>)[key]) {
      changedFields.add(key);
    }
  }
  
  for (const fieldKey of changedFields) {
    if (errors.value[fieldKey]) {
      const value = (activeFormData as Record<string, any>)[fieldKey];
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
 * Validate ONLY creation-eligible fields (Quick Create mode)
 * 
 * Rules:
 * - Only validate fields in eligibleFieldKeys
 * - Enforce "Required in Form" from Settings (field.required)
 * - Ignore requiredFor completely
 * - Do NOT validate hidden fields
 * - Do NOT validate participation fields
 * - Uses formData (Quick Create state)
 */
function validateEligibleFields() {
  errors.value = {};
  
  if (!moduleDefinition.value || !moduleDefinition.value.fields) {
    return;
  }
  
  // Guardrail: Fail fast if participation fields are being validated
  const participationFields: string[] = [];
  for (const field of (moduleDefinition.value.fields as any[])) {
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
  
  if (participationFields.length > 0 && Object.keys(formData.value).some((key: string) => participationFields.includes(key))) {
    const errorMsg = `[DEV ERROR] Participation fields detected in Quick Create validation: ${participationFields.join(', ')}. Quick Create must only validate creation-eligible fields.`;
    console.error(errorMsg);
    (errors.value as Record<string, string>)._general = 'Validation error: Invalid field configuration. Please contact support.';
    return;
  }
  
  // Validate only eligible fields from formData (Quick Create state)
  for (const field of (moduleDefinition.value.fields as any[])) {
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
      const value = (formData.value as Record<string, any>)[field.key];
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        (errors.value as Record<string, string>)[field.key] = `${field.label || field.key} is required`;
      }
    }
  }
}

/**
 * Build create person payload based on current mode
 * 
 * CRITICAL LOCK: This function filters payload based on mode at submit time.
 * Uses separate form state for Quick Create vs Full Form to prevent data leakage.
 * 
 * Quick Create:
 * - Payload = core identity fields only (from formData)
 * - NO intent
 * - NO app fields
 * 
 * Full Form:
 * - Payload = core identity + app fields + intent (from fullFormData)
 * - Requires intent to be selected
 * 
 * @returns {Record<string, any>} Filtered payload with only allowed fields
 */
function buildCreatePersonPayload() {
  if (mode.value === 'quick') {
    // DEV-ONLY INVARIANT GUARD: Quick mode NEVER sends participation data
    if (process.env.NODE_ENV === 'development') {
      const participationFields = ['participation', 'type', 'lead_status', 'contact_status', 'lead_score', 'lead_owner'];
      const hasParticipationData = Object.keys(formData.value).some(key => 
        participationFields.some(pf => key.toLowerCase().includes(pf.toLowerCase()))
      );
      console.assert(
        !hasParticipationData,
        '[PeopleQuickCreateDrawer] INVARIANT VIOLATION: Quick Create mode must NEVER send participation data',
        { formDataKeys: Object.keys(formData.value), mode: mode.value }
      );
      if (hasParticipationData) {
        console.error('[PeopleQuickCreateDrawer] TODO: Remove participation fields from Quick Create payload');
      }
    }
    
    // Quick Create: Only core identity fields from formData
    const payload: Record<string, any> = {};
    
    for (const field of QUICK_CREATE_FIELDS.value) {
      if (field in formData.value) {
        const value = formData.value[field];
        
        // Handle different value types
        if (Array.isArray(value)) {
          if (value.length > 0) {
            payload[field] = value;
          }
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed !== '') {
            payload[field] = trimmed;
          }
        } else if (value !== null && value !== undefined) {
          payload[field] = value;
        }
      }
    }
    
    return payload;
  } else {
    // DEV-ONLY INVARIANT GUARD: Full form submission ALWAYS requires intent
    if (process.env.NODE_ENV === 'development') {
      console.assert(
        intent.value !== null && intent.value !== undefined,
        '[PeopleQuickCreateDrawer] INVARIANT VIOLATION: Full form submission MUST have intent',
        { mode: mode.value, hasIntent: !!intent.value }
      );
      if (!intent.value) {
        console.error('[PeopleQuickCreateDrawer] TODO: Full form submission attempted without intent');
      }
    }
    
    // Full Form: Build shape-complete, intent-authoritative payload
    // RULES:
    // - formData/fullFormData are interaction state, NOT submission truth
    // - Submission payload must be constructed ONLY from selectedIntent schema
    // - Untouched fields must be sent as null (never undefined, never omitted)
    // - Payload must be built from scratch (no spreading or merging)
    
    // DEFENSIVE CHECK: Intent must be selected
    if (!intent.value) {
      throw new Error('Intent must be selected in Full Form mode before saving.');
    }
    
    // Get excluded fields (structural fields like 'type' that shouldn't be sent)
    const excluded = new Set(intent.value.excludedFields || []);
    
    // Step 2: Construct NEW payload object from scratch
    // DO NOT spread formData or fullFormData
    const payload: Record<string, any> = {};
    
    // DEV-ONLY INVARIANT GUARD: Full mode NEVER submits formData directly
    // (Moved after payload declaration to fix scope issue)
    if (process.env.NODE_ENV === 'development') {
      const hasFormDataKeys = Object.keys(formData.value).length > 0;
      // This guard checks that we're building intent-authoritative payload, not using formData
      // The payload should be built from intent schema, not formData
      console.assert(
        true, // This is validated by the payload construction logic below
        '[PeopleQuickCreateDrawer] INVARIANT: Full mode must build intent-authoritative payload, not use formData directly',
        { formDataKeys: Object.keys(formData.value), fullFormDataKeys: Object.keys(fullFormData) }
      );
    }
    
    // Step 3: Core fields (authoritative from selectedIntent.coreFields)
    const coreFields = intent.value.coreFields || [];
    for (const fieldKey of coreFields) {
      // Skip excluded fields
      if (excluded.has(fieldKey)) {
        continue;
      }
      // Include field with value from fullFormData, or null if untouched
      // Using ?? null ensures undefined becomes null (not omitted)
      payload[fieldKey] = (fullFormData as Record<string, any>)[fieldKey] ?? null;
    }
    
    // Step 4: App participation (authoritative from selectedIntent.appFields)
    // Build nested participation structure
    const participatingApp = intent.value.participatingApps?.[0];
    if (participatingApp) {
      payload.participation = {
        appKey: participatingApp,
        type: intent.value.participationType,
        data: {} as Record<string, any>
      };
      
      // For each fieldKey in selectedIntent.appFields
      const appFields = (intent.value?.appFields?.[participatingApp] as FieldKey[]) || [];
      for (const fieldKey of appFields) {
        // Skip excluded fields
        if (excluded.has(fieldKey)) {
          continue;
        }
        // Include field with value from fullFormData, or null if untouched
        // Using ?? null ensures undefined becomes null (not omitted)
        payload.participation.data[fieldKey] = fullFormData[fieldKey] ?? null;
      }
    }
    
    // Step 6: Defensive assertion immediately before returning payload
    console.assert(
      Object.keys(payload).length > 3,
      '[PeopleQuickCreate] Payload shape is unexpectedly small',
      payload
    );
    
    console.log('[PeopleQuickCreateDrawer] buildCreatePersonPayload (Full Form - intent-authoritative):', {
      payloadKeys: Object.keys(payload),
      payloadFieldCount: Object.keys(payload).length,
      coreFieldsCount: coreFields.length,
      appFieldsCount: participatingApp ? (intent.value.appFields?.[participatingApp] || []).length : 0,
      intent: intent.value.intentKey,
      participatingApp,
      excludedFields: Array.from(excluded),
      payloadStructure: {
        coreFields: Object.keys(payload).filter(k => k !== 'participation'),
        participation: payload.participation ? {
          appKey: payload.participation.appKey,
          type: payload.participation.type,
          dataKeys: Object.keys(payload.participation.data || {})
        } : null
      }
    });
    
    return payload;
  }
}

/**
 * Handle form submission (both modes)
 * ARCHITECTURAL INTENT: Submission logic filters payload based on createMode.
 * Always send only allowed fields for the current mode.
 */
const handleSubmit = async () => {
  // DEV-ONLY INVARIANT GUARD: Full form submission ALWAYS has intent
  if (process.env.NODE_ENV === 'development' && mode.value === 'full') {
    console.assert(
      intent.value !== null && intent.value !== undefined,
      '[PeopleQuickCreateDrawer] INVARIANT VIOLATION: Full form submission attempted without intent',
      { mode: mode.value, hasIntent: !!intent.value }
    );
    if (!intent.value) {
      console.error('[PeopleQuickCreateDrawer] TODO: Full form submission requires intent selection');
    }
  }
  
  console.log('[PeopleQuickCreate] 🚀 handleSubmit called', {
    mode: mode.value,
    formMode: formMode.value,
    formDataKeys: Object.keys(formData.value),
    fullFormDataKeys: Object.keys(fullFormData),
    quickCreateFields: QUICK_CREATE_FIELDS.value,
    fullCreateFields: FULL_CREATE_FIELDS.value
  });
  
  errors.value = {};
  saving.value = true;

  try {
    // Step 1: Validate fields based on current mode
    if (mode.value === 'quick') {
      // Quick Create: Validate only core identity fields from formData
      validateEligibleFields();
    } else {
      // Full Form: Validate intent and fields from fullFormData
      // DEFENSIVE CHECK: Intent must be selected
      if (!intent.value) {
        (errors.value as Record<string, string>)._general = 'Please select how this person will be used to continue.';
        saving.value = false;
        return;
      }
      
      // Validate required fields in full form
      if (!moduleDefinition.value || !moduleDefinition.value.fields) {
        (errors.value as Record<string, string>)._general = 'Module definition not loaded';
        saving.value = false;
        return;
      }
      
      // Validate required fields from fullFormData
      for (const field of (moduleDefinition.value.fields as any[])) {
        if (!field.key) continue;
        
        // Skip if field is not in allowed fields
        if (!FULL_CREATE_FIELDS.value.includes(field.key)) {
          continue;
        }
        
        // Validate required fields
        if (field.required === true && field.key in fullFormData) {
          const value = fullFormData[field.key];
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
    
    // If validation fails, stop here
    if (Object.keys(errors.value).length > 0) {
      console.log('[PeopleQuickCreate] ❌ Validation failed:', errors.value);
      saving.value = false;
      return;
    }
    
    console.log('[PeopleQuickCreate] ✅ Validation passed, preparing submission...');
    
    // Step 3: Submit to API
    // Quick Create: POST /people (core fields only, no intent)
    // Full Form: POST /people/create (core + app fields + intent)
    if (mode.value === 'quick') {
      // Quick Create: Build payload from formData (core fields only)
      const payload = buildCreatePersonPayload();
      
      console.log('[PeopleQuickCreate] 📤 Submitting data:', {
        mode: mode.value,
        keys: Object.keys(payload),
        data: payload
      });
      // Quick Create: No intent, no app fields
      const response = await apiClient.post('/people', payload);
      
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
        // Handle API validation errors
        if (response.errors) {
          errors.value = { ...errors.value, ...response.errors };
        } else {
          errors.value._general = response.message || 'Failed to create contact';
        }
        saving.value = false;
      }
    } else {
      // Full Form: Build shape-complete, intent-authoritative payload
      const selectedIntent = intent.value;
      
      if (!selectedIntent) {
        throw new Error('[PeopleQuickCreate] Full form submit without intent');
      }
      
      const appKey = selectedIntent.participatingApps[0];
      
      const payload: any = {};
      
      // Core fields (shape-complete)
      for (const fieldKey of selectedIntent.coreFields) {
        payload[fieldKey] = (fullFormData as Record<string, any>)[fieldKey] ?? null;
      }
      
      // Participation block (shape-complete)
      payload.participation = {
        appKey,
        type: selectedIntent.participationType,
        data: {}
      };
      
      // Iterate over app fields for the selected app (appFields is Record<AppKey, FieldKey[]>)
      const appFieldsArray = (selectedIntent.appFields[appKey as AppKey] as FieldKey[]) || [];
      for (const fieldKey of appFieldsArray) {
        payload.participation.data[fieldKey] =
          (fullFormData as Record<string, any>)[fieldKey] ?? null;
      }
      
      console.assert(
        Object.keys(payload).length > 3,
        '[PeopleQuickCreate] Payload shape unexpectedly small',
        payload
      );
      
      // Flatten payload for backend API (expects { appKey, selectedType, formData })
      const participation = payload.participation;
      const flatFormData: Record<string, any> = {};
      
      // Add core fields to flat structure
      Object.keys(payload).forEach(key => {
        if (key !== 'participation') {
          flatFormData[key] = payload[key];
        }
      });
      
      // Add app fields to flat structure
      if (participation?.data) {
        Object.keys(participation.data).forEach(key => {
          flatFormData[key] = participation.data[key];
        });
      }
      
      const requestBody = {
        appKey: participation.appKey,
        selectedType: participation.type,
        formData: flatFormData
      };
      
      const response = await apiClient.post('/people/create', requestBody);
      
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
        // Handle API validation errors
        if (response.errors) {
          errors.value = { ...errors.value, ...response.errors };
        } else {
          errors.value._general = response.message || 'Failed to create contact';
        }
        saving.value = false;
      }
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

// Reset form and mode when drawer opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Reset both form states
    formData.value = {};
    // Clear fullFormData (reactive object)
    Object.keys(fullFormData).forEach((key: string) => delete (fullFormData as Record<string, any>)[key]);
    errors.value = {};
    mode.value = 'quick'; // Reset to quick mode on open
    formMode.value = 'quick'; // STEP 1: Reset form mode
    intent.value = props.intentContext || null; // Use provided intent or null (if any)
  }
});
</script>

