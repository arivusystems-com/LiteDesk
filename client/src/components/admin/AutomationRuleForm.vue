<template>
  <TransitionRoot as="template" :show="true">
    <Dialog class="relative z-50" @close="$emit('close')">
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
              <DialogPanel class="pointer-events-auto w-screen max-w-3xl">
                <form @submit.prevent="handleSubmit" class="relative flex h-full flex-col divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 shadow-xl">
                  <div class="h-0 flex-1 overflow-y-auto">
                    <div class="bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6">
                      <div class="flex items-center justify-between">
                        <DialogTitle class="text-base font-semibold text-white">
                          {{ isEditing ? 'Edit Automation Rule' : 'New Automation Rule' }}
                        </DialogTitle>
                        <button
                          type="button"
                          class="relative rounded-md text-indigo-200 hover:text-white"
                          @click="$emit('close')"
                        >
                          <XMarkIcon class="size-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div class="px-4 sm:px-6 py-6 space-y-6">
                      <!-- Validation Error -->
                      <div v-if="validationError" class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                        <p class="text-sm text-red-800 dark:text-red-200">{{ validationError }}</p>
                      </div>

                      <!-- Basic Info -->
                      <section>
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                        <div class="space-y-4">
                          <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Name <span class="text-red-500">*</span>
                            </label>
                            <input
                              v-model="form.name"
                              type="text"
                              required
                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              placeholder="e.g., Create task when deal is won"
                            />
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description
                            </label>
                            <textarea
                              v-model="form.description"
                              rows="2"
                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              placeholder="Optional description"
                            />
                          </div>
                          <div class="grid grid-cols-2 gap-4">
                            <div>
                              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                App <span class="text-red-500">*</span>
                              </label>
                              <select
                                v-model="form.appKey"
                                required
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                <option value="SALES">SALES</option>
                                <option value="AUDIT">AUDIT</option>
                                <option value="PORTAL">PORTAL</option>
                              </select>
                            </div>
                            <div>
                              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Entity Type
                              </label>
                              <select
                                v-model="form.entityType"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                <option value="">Any</option>
                                <option value="people">People</option>
                                <option value="organization">Organization</option>
                                <option value="deal">Deal</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label class="flex items-center gap-2">
                              <HeadlessCheckbox
                                v-model="form.enabled"
                                checkbox-class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span class="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                            </label>
                          </div>
                        </div>
                      </section>

                      <!-- Trigger -->
                      <section class="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Trigger</h3>
                        <div class="space-y-4">
                          <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Event Type <span class="text-red-500">*</span>
                            </label>
                            <select
                              v-model="form.trigger.eventType"
                              required
                              @change="onEventTypeChange"
                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              <option value="">Select event...</option>
                              <option v-for="et in eventTypes" :key="et.value" :value="et.value">
                                {{ et.label }}
                              </option>
                            </select>
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Condition (Optional)
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Add conditions to match specific state values (e.g., stage = "Closed Won")
                            </p>
                            <div class="space-y-2">
                              <div
                                v-for="(cond, idx) in conditionEntries"
                                :key="idx"
                                class="flex items-center gap-2"
                              >
                                <select
                                  v-model="cond.key"
                                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                  <option value="">Select field...</option>
                                  <option value="currentState.sales_type">Current SALES role</option>
                                  <option value="previousState.sales_type">Previous SALES role</option>
                                  <option value="currentState.stage">Current Stage</option>
                                  <option value="currentState.pipeline">Current Pipeline</option>
                                  <option value="previousState.stage">Previous Stage</option>
                                </select>
                                <span class="text-gray-500">=</span>
                                <input
                                  v-model="cond.value"
                                  type="text"
                                  placeholder="Value"
                                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <button
                                  type="button"
                                  @click="removeCondition(idx)"
                                  class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              <button
                                type="button"
                                @click="addCondition"
                                class="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                              >
                                + Add Condition
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>

                      <!-- Action -->
                      <section class="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Action</h3>
                        <div class="space-y-4">
                          <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Action Type <span class="text-red-500">*</span>
                            </label>
                            <select
                              v-model="form.action.type"
                              required
                              @change="onActionTypeChange"
                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              <option value="">Select action...</option>
                              <option value="create_task">Create Task</option>
                              <option value="notify_user">Notify User</option>
                            </select>
                          </div>

                          <!-- create_task params -->
                          <div v-if="form.action.type === 'create_task'" class="space-y-4 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
                            <div>
                              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Task Title <span class="text-red-500">*</span>
                              </label>
                              <input
                                v-model="form.action.params.title"
                                type="text"
                                required
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                placeholder="e.g., Follow up: deal won"
                              />
                            </div>
                            <div>
                              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                              </label>
                              <textarea
                                v-model="form.action.params.description"
                                rows="2"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Due In (Days)
                                </label>
                                <input
                                  v-model.number="form.action.params.dueInDays"
                                  type="number"
                                  min="0"
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Assign To
                                </label>
                                <select
                                  v-model="form.action.params.assignee"
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                  <option value="triggeredBy">User who triggered</option>
                                  <option value="owner">Record owner</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Related Entity
                              </label>
                              <div class="grid grid-cols-2 gap-4">
                                <select
                                  v-model="form.action.params.relatedEntity.entityType"
                                  class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                  <option value="">None</option>
                                  <option value="people">People</option>
                                  <option value="organization">Organization</option>
                                  <option value="deal">Deal</option>
                                </select>
                                <input
                                  v-model="form.action.params.relatedEntity.entityId"
                                  type="text"
                                  placeholder="ID or '__trigger__'"
                                  class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                              </div>
                              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Use "__trigger__" to link to the event entity
                              </p>
                            </div>
                          </div>

                          <!-- notify_user params -->
                          <div v-if="form.action.type === 'notify_user'" class="space-y-4 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
                            <div>
                              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Message <span class="text-red-500">*</span>
                              </label>
                              <textarea
                                v-model="form.action.params.message"
                                required
                                rows="3"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                placeholder="Notification message"
                              />
                            </div>
                            <div>
                              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Recipient
                              </label>
                              <select
                                v-model="form.action.params.recipient"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                <option value="triggeredBy">User who triggered</option>
                                <option value="owner">Record owner</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                  <div class="flex shrink-0 justify-end gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      @click="$emit('close')"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      @click="previewRule"
                      class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Preview
                    </button>
                    <button
                      type="submit"
                      :disabled="saving"
                      class="inline-flex justify-center rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50"
                    >
                      {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
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
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';
import { ref, computed, watch, onMounted } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import apiClient from '@/utils/apiClient';

const props = defineProps({
  rule: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const isEditing = computed(() => !!props.rule);
const saving = ref(false);
const validationError = ref(null);
const eventTypes = ref([]);

const form = ref({
  name: '',
  description: '',
  appKey: 'SALES',
  entityType: '',
  enabled: true,
  trigger: {
    eventType: '',
    condition: null
  },
  action: {
    type: '',
    params: {}
  }
});

const conditionEntries = ref([]);

function addCondition() {
  conditionEntries.value.push({ key: '', value: '' });
}

function removeCondition(idx) {
  conditionEntries.value.splice(idx, 1);
}

function onEventTypeChange() {
  // Reset conditions when event type changes
  conditionEntries.value = [];
}

function onActionTypeChange() {
  // Reset params when action type changes
  if (form.value.action.type === 'create_task') {
    form.value.action.params = {
      title: '',
      description: '',
      dueInDays: null,
      assignee: 'triggeredBy',
      relatedEntity: { entityType: '', entityId: '' }
    };
  } else if (form.value.action.type === 'notify_user') {
    form.value.action.params = {
      message: '',
      recipient: 'triggeredBy'
    };
  }
}

function buildCondition() {
  if (conditionEntries.value.length === 0) return null;
  const cond = {};
  for (const entry of conditionEntries.value) {
    if (entry.key && entry.value) {
      cond[entry.key] = entry.value;
    }
  }
  return Object.keys(cond).length > 0 ? cond : null;
}

function buildFormData() {
  return {
    ...form.value,
    trigger: {
      eventType: form.value.trigger.eventType,
      condition: buildCondition()
    }
  };
}

async function previewRule() {
  const data = buildFormData();
  try {
    const res = await apiClient.post('/admin/automation-rules/preview', { rule: data });
    alert(`Preview: ${res.data.data.plan.length} action(s) would be planned`);
    // Could emit preview event to show in a modal
  } catch (err) {
    validationError.value = err.response?.data?.message || 'Preview failed';
  }
}

async function handleSubmit() {
  validationError.value = null;
  saving.value = true;
  try {
    const data = buildFormData();
    if (isEditing.value) {
      await apiClient.put(`/admin/automation-rules/${props.rule._id}`, data);
    } else {
      await apiClient.post('/admin/automation-rules', data);
    }
    emit('saved');
  } catch (err) {
    validationError.value = err.response?.data?.message || 'Failed to save rule';
  } finally {
    saving.value = false;
  }
}

async function loadEventTypes() {
  try {
    const res = await apiClient.get('/admin/automation-rules/metadata/event-types');
    eventTypes.value = res.data.data || [];
  } catch (err) {
    console.error('Failed to load event types:', err);
  }
}

function initializeForm() {
  if (props.rule) {
    form.value = {
      name: props.rule.name || '',
      description: props.rule.description || '',
      appKey: props.rule.appKey || 'SALES',
      entityType: props.rule.entityType || '',
      enabled: props.rule.enabled !== false,
      trigger: {
        eventType: props.rule.trigger?.eventType || '',
        condition: props.rule.trigger?.condition || null
      },
      action: {
        type: props.rule.action?.type || '',
        params: props.rule.action?.params || {}
      }
    };
    // Parse condition into entries
    if (form.value.trigger.condition) {
      conditionEntries.value = Object.entries(form.value.trigger.condition).map(([key, value]) => ({
        key,
        value: String(value)
      }));
    }
    // Initialize action params if needed
    if (form.value.action.type === 'create_task' && !form.value.action.params.title) {
      form.value.action.params = {
        title: '',
        description: '',
        dueInDays: null,
        assignee: 'triggeredBy',
        relatedEntity: { entityType: '', entityId: '' }
      };
    } else if (form.value.action.type === 'notify_user' && !form.value.action.params.message) {
      form.value.action.params = {
        message: '',
        recipient: 'triggeredBy'
      };
    }
  } else {
    onActionTypeChange(); // Initialize empty params
  }
}

onMounted(() => {
  loadEventTypes();
  initializeForm();
});

watch(() => props.rule, initializeForm, { immediate: true });
</script>
