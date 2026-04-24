<template>
  <div class="space-y-6">
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-sm font-semibold text-blue-800 dark:text-blue-300">Case-Centric Execution Settings</h3>
          <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
            Configure SLA commitments, business hours, channel defaults, assignment, escalations, and notifications for Helpdesk cases.
          </p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
    </div>

    <form v-else class="space-y-6" @submit.prevent="saveSettings">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Enabled Case Types</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label v-for="type in caseTypes" :key="type" class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              v-model="form.caseTypes.enabled"
              :value="type"
              type="checkbox"
              class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>{{ type }}</span>
          </label>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Priority SLA Targets (Minutes)</h3>
        <div class="space-y-3">
          <div
            v-for="priority in priorities"
            :key="priority"
            class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center"
          >
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ priority }}</div>
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">First response</label>
              <input
                v-model.number="form.slaPriorityTargets[priority].firstResponseMinutes"
                min="1"
                type="number"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Resolution</label>
              <input
                v-model.number="form.slaPriorityTargets[priority].resolutionMinutes"
                min="1"
                type="number"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Business Hours</h3>
        <div class="space-y-4">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="form.businessHours.enabled" type="checkbox" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span>Use business hours for SLA calculations</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Timezone</label>
              <input
                v-model.trim="form.businessHours.timezone"
                type="text"
                placeholder="UTC"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
              <input
                v-model="form.businessHours.startTime"
                type="time"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
              <input
                v-model="form.businessHours.endTime"
                type="time"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="day in weekDays"
              :key="day.value"
              class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input
                v-model="form.businessHours.workingDays"
                :value="day.value"
                type="checkbox"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>{{ day.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notifications</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label v-for="(label, key) in notificationLabels" :key="key" class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="form.notifications[key]" type="checkbox" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span>{{ label }}</span>
          </label>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Advanced Rules (JSON)</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Use JSON for advanced routing, escalation, and channel defaults. This maps directly to the Helpdesk execution engine.
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          Case assignment (groups, routing, schedules) is configured in
          <button
            type="button"
            class="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            @click="goAssignmentRulesHub"
          >
            Settings → Automation
          </button>
          . When automation assigns a case owner, assignees are notified like manual assignment, subject to your notification preferences and the toggles in the Notifications section above.
        </p>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">SLA policies</label>
            <textarea v-model="jsonEditors.slaPolicies" rows="6" class="w-full px-3 py-2 font-mono text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea>
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Escalation rules</label>
            <textarea v-model="jsonEditors.escalationRules" rows="6" class="w-full px-3 py-2 font-mono text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea>
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Channel rules</label>
            <textarea v-model="jsonEditors.channelRules" rows="6" class="w-full px-3 py-2 font-mono text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea>
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Default SLA policy key</label>
            <input
              v-model.trim="form.defaultSlaPolicyKey"
              type="text"
              placeholder="default-policy"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div v-if="saveError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-sm text-red-700 dark:text-red-300">{{ saveError }}</p>
      </div>
      <div v-if="saveSuccess" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p class="text-sm text-green-700 dark:text-green-300">Helpdesk execution settings saved.</p>
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          @click="resetForm"
        >
          Reset
        </button>
        <button
          type="submit"
          :disabled="saving || !hasChanges"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';

const router = useRouter();

function goAssignmentRulesHub() {
  router.push({
    path: '/settings',
    query: { tab: 'automation', assignmentApp: 'HELPDESK', assignmentModule: 'cases' }
  });
}

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const saveError = ref('');
const saveSuccess = ref(false);
const originalSnapshot = ref('');

const caseTypes = ['Support Ticket', 'Complaint', 'Service Request', 'Warranty Claim', 'Internal Case'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const weekDays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

const notificationLabels = {
  notifyOnCreated: 'Notify on case creation',
  notifyOnAssigned: 'Notify on assignment',
  notifyOnSlaWarning: 'Notify when SLA nears breach',
  notifyOnSlaBreach: 'Notify on SLA breach'
};

const form = ref({
  caseTypes: { enabled: [...caseTypes] },
  slaPriorityTargets: {},
  businessHours: {
    enabled: false,
    timezone: 'UTC',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00'
  },
  notifications: {
    notifyOnCreated: true,
    notifyOnAssigned: true,
    notifyOnSlaWarning: true,
    notifyOnSlaBreach: true
  },
  defaultSlaPolicyKey: ''
});

const jsonEditors = ref({
  slaPolicies: '[]',
  escalationRules: '[]',
  channelRules: '{}'
});

const hasChanges = computed(() => {
  const current = JSON.stringify({
    form: form.value,
    jsonEditors: jsonEditors.value
  });
  return current !== originalSnapshot.value;
});

function updateSnapshot() {
  originalSnapshot.value = JSON.stringify({
    form: form.value,
    jsonEditors: jsonEditors.value
  });
}

function applySettingsToForm(settings) {
  form.value.caseTypes = settings.caseTypes || { enabled: [...caseTypes] };
  form.value.slaPriorityTargets = settings.slaPriorityTargets || {};
  form.value.businessHours = settings.businessHours || form.value.businessHours;
  form.value.notifications = settings.notifications || form.value.notifications;
  form.value.defaultSlaPolicyKey = settings.defaultSlaPolicyKey || '';
  jsonEditors.value = {
    slaPolicies: JSON.stringify(settings.slaPolicies || [], null, 2),
    escalationRules: JSON.stringify(settings.escalationRules || [], null, 2),
    channelRules: JSON.stringify(settings.channelRules || {}, null, 2)
  };
}

function ensurePriorityTargets() {
  for (const priority of priorities) {
    if (!form.value.slaPriorityTargets[priority]) {
      form.value.slaPriorityTargets[priority] = { firstResponseMinutes: 240, resolutionMinutes: 2880 };
    }
  }
}

async function fetchSettings() {
  loading.value = true;
  error.value = '';
  try {
    const response = await apiClient('/settings/applications/helpdesk/execution-settings', { method: 'GET' });
    if (!response?.success || !response?.settings) {
      throw new Error('Invalid response while loading helpdesk execution settings');
    }
    applySettingsToForm(response.settings);
    ensurePriorityTargets();
    updateSnapshot();
  } catch (err) {
    console.error('Failed to load helpdesk execution settings:', err);
    error.value = err?.message || 'Failed to load Helpdesk execution settings';
  } finally {
    loading.value = false;
  }
}

function parseJsonEditor(value, label) {
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`${label} is not valid JSON`);
  }
}

function buildPayload() {
  return {
    settings: {
      caseTypes: form.value.caseTypes,
      slaPriorityTargets: form.value.slaPriorityTargets,
      businessHours: form.value.businessHours,
      notifications: form.value.notifications,
      defaultSlaPolicyKey: form.value.defaultSlaPolicyKey || null,
      slaPolicies: parseJsonEditor(jsonEditors.value.slaPolicies, 'SLA policies'),
      escalationRules: parseJsonEditor(jsonEditors.value.escalationRules, 'Escalation rules'),
      channelRules: parseJsonEditor(jsonEditors.value.channelRules, 'Channel rules')
    }
  };
}

async function saveSettings() {
  saveError.value = '';
  saveSuccess.value = false;
  saving.value = true;
  try {
    const payload = buildPayload();
    const response = await apiClient('/settings/applications/helpdesk/execution-settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!response?.success || !response?.settings) {
      throw new Error('Unexpected response while saving settings');
    }
    applySettingsToForm(response.settings);
    ensurePriorityTargets();
    updateSnapshot();
    saveSuccess.value = true;
  } catch (err) {
    console.error('Failed to save helpdesk execution settings:', err);
    saveError.value = err?.message || 'Failed to save helpdesk execution settings';
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  fetchSettings();
}

onMounted(() => {
  fetchSettings();
});
</script>
