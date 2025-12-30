<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="close">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl z-10">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              {{ isEditing ? 'Edit Event' : 'Create New Event' }}
            </h2>
            <button @click="close" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
          <!-- Basic Information -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Basic Information</h3>
            
            <!-- Event Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.eventName"
                type="text"
                required
                maxlength="255"
                placeholder="Enter event name"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                v-model="form.notes"
                rows="3"
                maxlength="5000"
                placeholder="Add notes or description..."
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              ></textarea>
            </div>

            <!-- Event Type and Status -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type <span class="text-red-500">*</span></label>
                <select
                  v-model="form.eventType"
                  @change="onEventTypeChange"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Meeting / Appointment">Meeting / Appointment</option>
                  <option value="Internal Audit">Internal Audit</option>
                  <option value="External Audit — Single Org">External Audit — Single Org</option>
                  <option value="External Audit Beat">External Audit Beat</option>
                  <option value="Field Sales Beat">Field Sales Beat</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status <span class="text-red-500">*</span></label>
                <select
                  v-model="form.status"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="STARTED">Started</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="PENDING_CORRECTIVE">Pending Corrective</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <!-- Event Owner -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Owner <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.eventOwnerId"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select user...</option>
                <option v-for="user in users" :key="user._id" :value="user._id">
                  {{ user.firstName }} {{ user.lastName }} {{ user._id === currentUser._id ? '(Me)' : '' }}
                </option>
              </select>
            </div>
          </div>

          <!-- Date & Time -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Date & Time</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <!-- Start Date Time -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date & Time <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.startDateTime"
                  type="datetime-local"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <!-- End Date Time -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date & Time <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.endDateTime"
                  type="datetime-local"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <!-- Location -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Location</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location (Address or URL)</label>
              <input
                v-model="form.location"
                type="text"
                maxlength="1024"
                placeholder="Physical address or meeting URL"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- Recurrence -->
          <div v-if="showRecurrence" class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Recurrence</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurrence Pattern</label>
              <select
                v-model="form.recurrence"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option :value="null">None</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <!-- Visibility -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Visibility</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibility</label>
              <select
                v-model="form.visibility"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="Internal">Internal</option>
                <option value="Partner">Partner</option>
                <option value="Public">Public</option>
              </select>
            </div>
          </div>

          <!-- Event Type Specific Fields -->
          <div v-if="showEventTypeFields" :key="`event-type-${form.eventType}`" class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Event Configuration</h3>
            
            <!-- GEO Required Toggle -->
            <div v-if="showGeoToggle" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">GEO Required</label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ geoRequiredDescription }}
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.geoRequired"
                  :disabled="!canToggleGeo"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            <div v-else-if="geoRequiredForced" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p class="text-sm text-blue-800 dark:text-blue-300">
                <strong>GEO Required:</strong> Always enabled for {{ form.eventType }}
              </p>
          </div>
            
            <!-- Linked Organization (for Audit events) -->
            <div v-if="requiresLinkedOrg" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Linked Organization <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="form.relatedToId"
                  @change="fetchOrganizations"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Organization...</option>
                  <option v-for="org in organizations" :key="org._id" :value="org._id">
                    {{ org.name }}
                  </option>
                </select>
              </div>
              </div>

            <!-- Audit Form Selection -->
            <div v-if="requiresAuditForm" :key="`audit-form-${form.eventType}-${auditForms.length}`" class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Audit Form <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="form.linkedFormId"
                  :required="linkedFormIdDependencyState.required"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Form...</option>
                  <option v-if="auditForms.length === 0 && !loadingForms" value="" disabled>
                    No forms available (create a form first)
                  </option>
                  <option v-for="formItem in auditForms" :key="formItem._id" :value="formItem._id">
                    {{ formItem.name }} {{ formItem.status === 'Ready' ? '(Ready - will activate)' : formItem.status === 'Active' ? '(Active)' : '' }}
                  </option>
                </select>
                <p v-if="requiresAuditForm && auditForms.length === 0 && !loadingForms" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Create an audit form first in the Forms module
                </p>
              </div>
            </div>

            <!-- Multi-Org Route (External Audit Beat, Field Sales Beat) -->
            <div v-if="isMultiOrgRoute" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization List <span class="text-red-500">*</span>
                </label>
                <div class="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  <div v-for="(org, index) in form.orgList" :key="index" class="flex items-center gap-2">
                    <input
                      type="number"
                      v-model.number="org.sequence"
                      min="1"
                      placeholder="Sequence"
                      class="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <select
                      v-model="org.organizationId"
                      class="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Select Org...</option>
                      <option v-for="orgOption in organizations" :key="orgOption._id" :value="orgOption._id">
                        {{ orgOption.name }}
                      </option>
                    </select>
                    <button
                      type="button"
                      @click="removeOrgFromList(index)"
                      class="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                <button
                  type="button"
                    @click="addOrgToList"
                    class="w-full px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700"
                >
                    + Add Organization
                </button>
                </div>
              </div>
              
              <!-- Background Tracking (External Audit Beat) -->
              <div v-if="form.eventType === 'External Audit Beat'" class="flex items-center gap-2">
                <input
                  type="checkbox"
                  v-model="form.backgroundTracking"
                  class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label class="text-sm text-gray-700 dark:text-gray-300">Enable Background Tracking</label>
              </div>
            </div>
            
            <!-- Min Visit Duration -->
            <div v-if="showMinVisitDuration" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Visit Duration (minutes)
                </label>
                <input
                  type="number"
                  v-model.number="form.minVisitDuration"
                  min="1"
                  placeholder="e.g., 30"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <!-- Field Sales Specific -->
            <div v-if="form.eventType === 'Field Sales Beat'" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Allowed Actions</label>
                <div class="space-y-2">
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      v-model="form.allowedActions.orders"
                      class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">Orders</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      v-model="form.allowedActions.payments"
                      class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">Payments</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      v-model="form.allowedActions.feedback"
                      class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">Feedback</span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- Partner Visibility (External Audit) -->
            <div v-if="form.eventType === 'External Audit — Single Org'" class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="form.partnerVisibility"
                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label class="text-sm text-gray-700 dark:text-gray-300">Partner Visibility (for guest auditor)</label>
            </div>
          </div>


          <!-- Attachments -->
          <div v-if="showAttachments" class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Attachments</h3>
            <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <p class="text-sm text-gray-500 dark:text-gray-400">File upload functionality to be implemented</p>
            </div>
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
              :disabled="saving"
              class="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="saving" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ saving ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import apiClient from '@/utils/apiClient';
import dateUtils from '@/utils/dateUtils';
import { getFieldDependencyState } from '@/utils/dependencyEvaluation';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  event: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user || {});

const saving = ref(false);
const users = ref([]);
const organizations = ref([]);
const auditForms = ref([]);
const loadingForms = ref(false);
const eventsModuleDefinition = ref(null);

const colorOptions = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316'  // Orange
];

const form = ref({
  eventName: '',
  notes: '',
  eventType: 'Meeting / Appointment',
  status: 'PLANNED',
  eventOwnerId: '',
  startDateTime: '',
  endDateTime: '',
  location: '',
  recurrence: null,
  relatedToId: '',
  linkedFormId: '',
  geoRequired: false,
  geoLocation: {
    latitude: null,
    longitude: null,
    radius: 100
  },
  orgList: [],
  minVisitDuration: null,
  backgroundTracking: false,
  minTimePerStop: null,
  partnerVisibility: false,
  allowedActions: {
    orders: true,
    payments: false,
    feedback: true
  },
  visibility: 'Internal'
});

const isEditing = computed(() => !!props.event?._id);

// Computed properties for dynamic field visibility
const showEventTypeFields = computed(() => {
  // Show fields for all event types except basic Meeting/Appointment
  // This ensures audit form field appears for audit types
  return form.value.eventType !== 'Meeting / Appointment';
});

const showGeoToggle = computed(() => {
  return form.value.eventType === 'Meeting / Appointment' || 
         form.value.eventType === 'External Audit — Single Org' || 
         form.value.eventType === 'Field Sales Beat';
});

const geoRequiredForced = computed(() => {
  return form.value.eventType === 'Internal Audit' || 
         form.value.eventType === 'External Audit Beat';
});

const canToggleGeo = computed(() => {
  // Admin permission check would go here
  // For now, allow toggling for applicable types
  return showGeoToggle.value;
});

const geoRequiredDescription = computed(() => {
  if (form.value.eventType === 'Meeting / Appointment') {
    return 'Optional: Enable location tracking for this meeting';
  } else if (form.value.eventType === 'External Audit — Single Org') {
    return 'Default: ON. Admin can disable if needed';
  } else if (form.value.eventType === 'Field Sales Beat') {
    return 'Default: ON. Some companies allow non-geo orders';
  }
  return '';
});

const requiresLinkedOrg = computed(() => {
  return ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(form.value.eventType);
});

// Get linkedFormId field definition from module
const linkedFormIdField = computed(() => {
  if (!eventsModuleDefinition.value?.fields) return null;
  return eventsModuleDefinition.value.fields.find(f => f.key === 'linkedFormId');
});

// Evaluate dependency state for linkedFormId field
const linkedFormIdDependencyState = computed(() => {
  const field = linkedFormIdField.value;
  if (!field) {
    // Fallback: if module definition not loaded, use hardcoded logic
    const eventType = form.value.eventType;
    const isAuditType = 
      eventType === 'Internal Audit' ||
      eventType === 'External Audit — Single Org' ||
      eventType === 'External Audit Beat';
    return { visible: isAuditType };
  }
  
  // Use dependency evaluation system
  return getFieldDependencyState(
    field,
    form.value,
    eventsModuleDefinition.value?.fields || []
  );
});

// Computed property for visibility (using dependency system)
const requiresAuditForm = computed(() => {
  return linkedFormIdDependencyState.value.visible !== false;
});

const isMultiOrgRoute = computed(() => {
  return ['External Audit Beat', 'Field Sales Beat'].includes(form.value.eventType);
});

const showMinVisitDuration = computed(() => {
  return form.value.geoRequired && (
    form.value.eventType === 'Internal Audit' || 
    form.value.eventType === 'External Audit Beat'
  );
});

const showRecurrence = computed(() => {
  return true; // Universal field, always show
});

const showAttachments = computed(() => {
  return true; // Universal field, always show
});

// Watch eventType to fetch forms when it changes
watch(() => form.value.eventType, (newEventType, oldEventType) => {
  if (requiresAuditForm.value) {
    fetchForms();
  } else {
    // Clear linked form if event type no longer requires audit form
    if (oldEventType && !requiresAuditForm.value) {
      form.value.linkedFormId = '';
    }
  }
}, { immediate: false });

// Fetch Events module definition to get field dependencies
const fetchEventsModuleDefinition = async () => {
  try {
    const response = await apiClient.get('/modules');
    if (response.success) {
      const eventsModule = response.data.find(m => m.key === 'events');
      if (eventsModule) {
        eventsModuleDefinition.value = eventsModule;
        console.log('✅ Events module definition loaded:', {
          fieldsCount: eventsModule.fields?.length || 0,
          linkedFormIdField: linkedFormIdField.value
        });
      }
    }
  } catch (error) {
    console.error('Error fetching Events module definition:', error);
  }
};

// Fetch users when component mounts
onMounted(() => {
  fetchUsers();
  fetchOrganizations();
  fetchEventsModuleDefinition();
  // Forms will be fetched by the watch or when modal opens
});

// Methods for dynamic fields
const onEventTypeChange = () => {
  // Reset GEO based on event type rules
  if (form.value.eventType === 'Internal Audit' || form.value.eventType === 'External Audit Beat') {
    form.value.geoRequired = true; // Always ON
  } else if (form.value.eventType === 'External Audit — Single Org' || form.value.eventType === 'Field Sales Beat') {
    form.value.geoRequired = true; // Default ON
  } else if (form.value.eventType === 'Meeting / Appointment') {
    form.value.geoRequired = false; // Default OFF
  }
  
  // Reset orgList for multi-org routes
  if (isMultiOrgRoute.value) {
    if (form.value.orgList.length === 0) {
      form.value.orgList = [{ sequence: 1, organizationId: '', status: 'PENDING' }];
    }
  } else {
    form.value.orgList = [];
  }
  
  // Fetch forms if needed
  if (requiresAuditForm.value) {
    fetchForms();
  }
  
  // Clear linked form if not needed
  if (!requiresAuditForm.value) {
    form.value.linkedFormId = '';
  }
};

const addOrgToList = () => {
  const nextSequence = form.value.orgList.length > 0 
    ? Math.max(...form.value.orgList.map(o => o.sequence || 0)) + 1
    : 1;
  form.value.orgList.push({
    sequence: nextSequence,
    organizationId: '',
    status: 'PENDING'
  });
};

const removeOrgFromList = (index) => {
  form.value.orgList.splice(index, 1);
  // Re-sequence remaining orgs
  form.value.orgList.forEach((org, idx) => {
    org.sequence = idx + 1;
  });
};

const fetchOrganizations = async () => {
  try {
    const response = await apiClient.get('/organization');
    if (response.success) {
      organizations.value = response.data || [];
    }
  } catch (error) {
    console.error('Error fetching organizations:', error);
  }
};

const fetchForms = async () => {
  loadingForms.value = true;
  try {
    // Fetch both Ready and Active forms
    // When a Ready form is linked to an event, it automatically becomes Active
    const response = await apiClient.get('/forms', { params: { limit: 100 } });
    if (response.success) {
      const allForms = response.data || [];
      
      // Filter to show only Ready and Active forms
      const readyAndActiveForms = allForms.filter(form => 
        form.status === 'Ready' || form.status === 'Active'
      );
      
      // Further filter to show audit-related forms if formType exists
      auditForms.value = readyAndActiveForms.filter(form => {
        // If formType exists, prefer Audit types; otherwise include all Ready/Active forms
        return !form.formType || 
               form.formType === 'Audit' || 
               form.formType.toLowerCase().includes('audit');
      });
      
      // If no audit-type forms found, show all Ready/Active forms as fallback
      if (auditForms.value.length === 0 && readyAndActiveForms.length > 0) {
        auditForms.value = readyAndActiveForms;
      }
      
      // Sort: Active forms first, then Ready forms
      auditForms.value.sort((a, b) => {
        if (a.status === 'Active' && b.status === 'Ready') return -1;
        if (a.status === 'Ready' && b.status === 'Active') return 1;
        return 0;
      });
    }
  } catch (error) {
    console.error('Error fetching forms:', error);
    auditForms.value = [];
  } finally {
    loadingForms.value = false;
  }
};

// Watch for prop changes
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // Ensure users are loaded
    if (users.value.length === 0) {
      fetchUsers();
    }
  }
  if (newVal && props.event?._id) {
    // Edit mode - populate form with event data
    form.value = {
      eventName: props.event.eventName || '',
      notes: props.event.notes || '',
      eventType: props.event.eventType || 'Meeting / Appointment',
      status: props.event.status || 'PLANNED',
      eventOwnerId: props.event.eventOwnerId?._id || props.event.eventOwnerId || currentUser.value._id || '',
      startDateTime: formatDateForInput(props.event.startDateTime),
      endDateTime: formatDateForInput(props.event.endDateTime),
      location: props.event.location || '',
      recurrence: props.event.recurrence || null,
      relatedToId: props.event.relatedToId || '',
      linkedFormId: props.event.linkedFormId || '',
      geoRequired: props.event.geoRequired || false,
      geoLocation: props.event.geoLocation || { latitude: null, longitude: null, radius: 100 },
      orgList: props.event.orgList || [],
      minVisitDuration: props.event.minVisitDuration || null,
      backgroundTracking: props.event.backgroundTracking || false,
      minTimePerStop: props.event.minTimePerStop || null,
      partnerVisibility: props.event.partnerVisibility || false,
      allowedActions: props.event.allowedActions || { orders: true, payments: false, feedback: true },
      visibility: props.event.visibility || 'Internal',
      attachments: props.event.attachments || []
    };
    
    // Fetch organizations if needed
    if (requiresLinkedOrg.value || isMultiOrgRoute.value) {
      fetchOrganizations();
    }
    
    // Fetch forms if needed - use nextTick to ensure form is fully populated
    nextTick(() => {
      if (requiresAuditForm.value) {
        fetchForms();
      }
    });
  } else if (newVal) {
    // Create mode - reset form
    resetForm();
  }
});


const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const resetForm = () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  form.value = {
    eventName: '',
    notes: '',
    eventType: 'Meeting / Appointment',
    status: 'PLANNED',
    eventOwnerId: currentUser.value._id || '',
    startDateTime: formatDateForInput(now),
    endDateTime: formatDateForInput(oneHourLater),
    location: '',
    recurrence: null,
    relatedToId: '',
    linkedFormId: '',
    geoRequired: false,
    geoLocation: {
      latitude: null,
      longitude: null,
      radius: 100
    },
    orgList: [],
    minVisitDuration: null,
    backgroundTracking: false,
    minTimePerStop: null,
    partnerVisibility: false,
    allowedActions: {
      orders: true,
      payments: false,
      feedback: true
    },
    visibility: 'Internal',
    attachments: []
  };
};


const fetchUsers = async () => {
  try {
    const response = await apiClient.get('/users');
    if (response.success) {
      users.value = response.data || [];
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};


const handleSubmit = async () => {
  saving.value = true;
  
  try {
    const payload = {
      eventName: form.value.eventName,
      notes: form.value.notes || '',
      eventType: form.value.eventType,
      status: form.value.status,
      eventOwnerId: form.value.eventOwnerId || currentUser.value._id,
      startDateTime: new Date(form.value.startDateTime).toISOString(),
      endDateTime: new Date(form.value.endDateTime).toISOString(),
      location: form.value.location || '',
      recurrence: form.value.recurrence || null,
      visibility: form.value.visibility || 'Internal'
    };
    
    // Add linked organization if selected
    if (form.value.relatedToId) {
      payload.relatedToId = form.value.relatedToId;
    }
    
    // Add linked form if provided (convert empty string to null)
    if (form.value.linkedFormId && form.value.linkedFormId.trim() !== '') {
      payload.linkedFormId = form.value.linkedFormId;
    } else {
      // Explicitly set to null if empty to ensure it's cleared
      payload.linkedFormId = null;
    }
    
    console.log('[EventFormModal] Submitting event with linkedFormId:', payload.linkedFormId, 'form.value.linkedFormId:', form.value.linkedFormId);
    
    // Add GEO and event-type specific fields
    payload.geoRequired = form.value.geoRequired || false;
    if (form.value.geoLocation && form.value.geoLocation.latitude) {
      payload.geoLocation = form.value.geoLocation;
    }
    
    // Add multi-org fields
    if (isMultiOrgRoute.value && form.value.orgList.length > 0) {
      payload.orgList = form.value.orgList.map(org => ({
        organizationId: org.organizationId,
        sequence: org.sequence,
        status: 'PENDING'
      }));
      payload.isMultiOrg = true;
    }
    
    // Add audit-specific fields
    if (requiresAuditForm.value) {
      if (form.value.minVisitDuration) {
        payload.minVisitDuration = form.value.minVisitDuration;
      }
      if (form.value.eventType === 'External Audit Beat') {
        payload.backgroundTracking = form.value.backgroundTracking;
      }
      if (form.value.eventType === 'External Audit — Single Org') {
        payload.partnerVisibility = form.value.partnerVisibility;
      }
    }
    
    // Add field sales specific fields
    if (form.value.eventType === 'Field Sales Beat') {
      payload.allowedActions = form.value.allowedActions;
      if (form.value.minTimePerStop) {
        payload.minTimePerStop = form.value.minTimePerStop;
      }
    }
    
    // Add visibility
    payload.visibility = form.value.visibility || 'Internal';
    
    let response;
    if (isEditing.value) {
      // Support both _id and eventId
      const eventId = props.event.eventId || props.event._id;
      response = await apiClient.put(`/events/${eventId}`, payload);
    } else {
      response = await apiClient.post('/events', payload);
    }
    
    console.log('Event save response:', response);
    
    if (response.success) {
      emit('saved', response.data);
      close();
    } else {
      console.error('Event save failed:', response);
      let errorMessage = response.error || 'Failed to save event';
      if (response.validationErrors) {
        errorMessage += '\nValidation errors:\n' + response.validationErrors.map(e => `- ${e.field}: ${e.message}`).join('\n');
      }
      alert(errorMessage);
    }
  } catch (error) {
    console.error('Error saving event - Full error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      response: error.response,
      validationErrors: error.validationErrors
    });
    
    let errorMessage = 'Failed to save event: ' + (error.message || 'Unknown error');
    
    // Add validation errors if present
    if (error.validationErrors && error.validationErrors.length > 0) {
      errorMessage += '\n\nValidation Errors:\n';
      errorMessage += error.validationErrors.map(e => `• ${e.field}: ${e.message}`).join('\n');
    }
    
    // Add server error details if present
    if (error.response && error.response.error && error.response.error !== error.message) {
      errorMessage += '\n\nDetails: ' + error.response.error;
    }
    
    alert(errorMessage);
  } finally {
    saving.value = false;
  }
};

const close = () => {
  emit('close');
  setTimeout(resetForm, 300); // Reset after transition
};
</script>


