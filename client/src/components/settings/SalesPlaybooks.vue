<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Playbooks</h3>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure playbooks for each pipeline stage</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-sm text-red-800 dark:text-red-300">{{ error }}</p>
    </div>

    <div v-else class="h-full flex flex-col lg:flex-row gap-4">
      <aside class="w-full lg:w-80 flex-none bg-white dark:bg-gray-900/60 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div class="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div class="text-sm font-semibold text-gray-800 dark:text-gray-200">Pipelines</div>
        </div>
        <div class="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800">
          <div
            v-for="(pipeline, index) in pipelineSettings"
            :key="pipeline.key || index"
            :class="[
              'p-4 cursor-pointer transition-colors',
              selectedPipelineKey === pipeline.key
                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-white/5'
            ]"
            @click="selectedPipelineKey = pipeline.key"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="w-2.5 h-2.5 rounded-full border border-white shadow" :style="{ backgroundColor: pipeline.color || DEFAULT_PIPELINE_COLOR }"></span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ pipeline.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ pipeline.stages?.length || 0 }} stage{{ (pipeline.stages?.length || 0) === 1 ? '' : 's' }}</p>
                </div>
              </div>
              <span v-if="pipeline.isDefault" class="text-xs font-medium text-indigo-600 dark:text-indigo-300">Default</span>
            </div>
          </div>
          <div v-if="!pipelineSettings.length" class="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No pipelines yet. Configure pipelines first in the Pipelines & Stages tab.
          </div>
        </div>
      </aside>
      <section class="flex-1 min-w-0 bg-white dark:bg-gray-900/60 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div class="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {{ currentPipeline?.name || 'Select a pipeline' }}
            </p>
            <p v-if="currentPipeline" class="text-xs text-gray-500 dark:text-gray-400">
              {{ currentPipeline.stages?.length || 0 }} stage{{ (currentPipeline.stages?.length || 0) === 1 ? '' : 's' }} ·
              {{ currentPipeline.isDefault ? 'Default pipeline' : 'Custom pipeline' }}
            </p>
          </div>
          <button
            v-if="isDirty"
            @click="savePlaybooks"
            :disabled="isSaving"
            class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors"
            :class="[
              isSaving
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
            ]"
          >
            <svg v-if="isSaving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isSaving ? 'Saving…' : 'Save Playbooks' }}</span>
          </button>
        </div>
        <div v-if="currentPipeline" class="flex-1 flex flex-col gap-6 p-4 overflow-hidden">
          <div>
            <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Stage Playbooks</h4>
            <p class="text-xs text-gray-500 dark:text-gray-400">Define guidance and automation for each stage in this pipeline.</p>
          </div>
          <div class="flex-1 overflow-x-auto pb-6">
            <div class="flex items-start gap-4 min-w-full">
              <div
                v-for="(stage, stageIndex) in currentPipeline.stages"
                :key="stage.key || stageIndex"
                class="w-[28rem] flex-shrink-0"
              >
                <div class="h-full flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 shadow-sm">
                  <div class="p-4 border-b border-gray-200 dark:border-white/10 space-y-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {{ stage.name || `Stage ${stageIndex + 1}` }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          Probability: {{ stage.probability ?? 0 }}% · Status: {{ stage.status || 'open' }}
                        </p>
                      </div>
                      <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer flex-shrink-0">
                        <HeadlessCheckbox
                          v-model="stage.playbook.enabled"
                          @change="handlePlaybookToggle(stage)"
                          checkbox-class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Enable</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      @click="toggleStageSettings(stage.key)"
                    >
                      <svg
                        :class="[
                          'w-4 h-4 transition-transform duration-200',
                          isStageSettingsOpen(stage) ? 'rotate-180' : ''
                        ]"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span>Stage settings</span>
                    </button>
                    <transition name="fade">
                      <div
                        v-if="isStageSettingsOpen(stage)"
                        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 p-4 space-y-4"
                      >
                        <div class="grid grid-cols-1 gap-3">
                          <div>
                            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Playbook Mode</label>
                            <select v-model="stage.playbook.mode" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-sm">
                              <option v-for="option in PLAYBOOK_MODE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
                            </select>
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Exit Criteria</label>
                            <select v-model="stage.playbook.exitCriteria.type" @change="onPlaybookExitCriteriaChange(stage)" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-sm">
                              <option v-for="option in PLAYBOOK_EXIT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
                            </select>
                          </div>
                          <div>
                            <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                              <HeadlessCheckbox v-model="stage.playbook.autoAdvance" @change="onPlaybookAutoAdvanceChange(stage)" checkbox-class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                              Auto-move to next stage when criteria met
                            </label>
                            <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Automatically progress when conditions are satisfied.</p>
                          </div>
                          <div v-if="stage.playbook.autoAdvance">
                            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Next Stage</label>
                            <select v-model="stage.playbook.exitCriteria.nextStageKey" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-sm">
                              <option value="">Select stage...</option>
                              <option v-for="option in getNextStageOptions(currentPipeline, stage)" :key="option.value" :value="option.value">{{ option.label }}</option>
                            </select>
                          </div>
                          <div v-if="stage.playbook.exitCriteria.type === 'custom'">
                            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Custom Trigger Description</label>
                            <textarea v-model="stage.playbook.exitCriteria.customDescription" rows="2" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-sm" placeholder="Describe the conditions that should move this deal to the next stage"></textarea>
                          </div>
                          <div>
                            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Internal Notes (optional)</label>
                            <textarea v-model="stage.playbook.notes" rows="2" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-sm" placeholder="Provide additional guidance for your team"></textarea>
                          </div>
                        </div>
                      </div>
                    </transition>
                  </div>
                  <div class="flex-1 flex flex-col gap-4 p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <h6 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Activities</h6>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Add and orchestrate the work your team completes in this stage.</p>
                      </div>
                      <button
                        class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm hover:shadow"
                        @click="addPlaybookAction(stage)"
                        :disabled="!stage.playbook.enabled"
                        :class="!stage.playbook.enabled ? 'opacity-50 cursor-not-allowed' : ''"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Activity
                      </button>
                    </div>
                    <div v-if="!stage.playbook.enabled" class="flex-1 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 p-4 text-xs text-gray-500 dark:text-gray-400">
                      Enable this playbook to manage activities for the stage.
                    </div>
                    <div v-else class="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
                      <div v-if="!stage.playbook.actions.length" class="flex-1 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                        No activities yet. Click "Add Activity" to build a guided checklist.
                      </div>
                      <div v-else class="space-y-3">
                        <div
                          v-for="(action, actionIndex) in stage.playbook.actions"
                          :key="action.key || actionIndex"
                          class="group border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900/70 p-4 shadow-sm"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                              <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {{ action.title || `Action ${actionIndex + 1}` }}
                              </p>
                              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ getPlaybookActionTypeLabel(action.actionType) }}
                                <span v-if="action.dueInDays !== null && action.dueInDays !== undefined" class="ml-1">• Due in {{ action.dueInDays }} day{{ action.dueInDays === 1 ? '' : 's' }}</span>
                              </p>
                            </div>
                            <button
                              class="p-1 rounded text-red-500 hover:text-red-600 transition-colors"
                              @click="removePlaybookAction(stage, actionIndex)"
                              title="Remove activity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                <path fill-rule="evenodd" d="M8.75 3a.75.75 0 00-.75.75V5H5.5a.75.75 0 000 1.5h.538l.599 9.27A1.75 1.75 0 008.382 17.5h3.236a1.75 1.75 0 001.745-1.73l.599-9.27h.538a.75.75 0 000-1.5H12v-1.25A.75.75 0 0011.25 3h-2.5zM9.5 6.5v7a.75.75 0 001.5 0v-7a.75.75 0 00-1.5 0zm-2 0v7a.75.75 0 001.5 0v-7a.75.75 0 00-1.5 0z" clip-rule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                            <span v-if="action.required" class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Required</span>
                            <span v-if="action.autoCreate" class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Auto-create</span>
                            <span class="truncate">
                              Assigned to {{ getPlaybookAssignmentLabel(action.assignment?.type) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center p-6 text-sm text-gray-500 dark:text-gray-400">
          Select a pipeline on the left to configure playbooks.
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authRegistry';
import apiClient from '@/utils/apiClient';

const authStore = useAuthStore();
const loading = ref(true);
const error = ref('');
const dealsModule = ref(null);
const pipelineSettings = ref([]);
const selectedPipelineKey = ref('');
const isSaving = ref(false);
const originalSnapshot = ref('');
const stageSettingsExpanded = ref({});

const DEFAULT_PIPELINE_COLOR = '#2563EB';

const PLAYBOOK_MODE_OPTIONS = [
  { value: 'sequential', label: 'Sequential (one at a time)' },
  { value: 'parallel', label: 'Parallel (all at once)' }
];

const PLAYBOOK_EXIT_OPTIONS = [
  { value: 'manual', label: 'Manual (user decides)' },
  { value: 'all_actions_completed', label: 'All actions completed' },
  { value: 'custom', label: 'Custom conditions' }
];

const PLAYBOOK_ACTION_TYPES = [
  { value: 'task', label: 'Task' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'event', label: 'Event' }
];

const PLAYBOOK_ASSIGNMENT_OPTIONS = [
  { value: 'deal_owner', label: 'Deal Owner' },
  { value: 'contact_owner', label: 'Contact Owner' },
  { value: 'specific_user', label: 'Specific User' },
  { value: 'team', label: 'Team' }
];

const currentPipeline = computed(() => {
  if (!pipelineSettings.value.length) return null;
  if (selectedPipelineKey.value) {
    return pipelineSettings.value.find(p => p.key === selectedPipelineKey.value) || pipelineSettings.value[0] || null;
  }
  return pipelineSettings.value[0] || null;
});

const isDirty = computed(() => {
  if (!originalSnapshot.value) return false;
  return JSON.stringify(normalizePipelineSettings(pipelineSettings.value)) !== originalSnapshot.value;
});

function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizePipelineSettings(settings = []) {
  if (!Array.isArray(settings) || !settings.length) return [];
  return settings.map((pipeline) => {
    const stages = Array.isArray(pipeline.stages) ? pipeline.stages : [];
    return {
      ...pipeline,
      stages: stages.map((stage) => {
        if (!stage.playbook) {
          stage.playbook = {
            enabled: false,
            actions: [],
            mode: 'sequential',
            exitCriteria: { type: 'manual', customDescription: '', nextStageKey: '' },
            notes: ''
          };
        }
        if (!stage.playbook.exitCriteria) {
          stage.playbook.exitCriteria = { type: 'manual', customDescription: '', nextStageKey: '' };
        }
        if (!Array.isArray(stage.playbook.actions)) {
          stage.playbook.actions = [];
        }
        return stage;
      })
    };
  });
}

async function fetchDealsModule() {
  loading.value = true;
  error.value = '';
  try {
    const data = await apiClient.get('/modules');
    if (data.success) {
      const deals = data.data.find(m => m.key === 'deals');
      if (!deals) {
        error.value = 'Deals module not found. Please ensure the Sales app is properly configured.';
        return;
      }
      dealsModule.value = deals;
      const raw = Array.isArray(deals.pipelineSettings) ? JSON.parse(JSON.stringify(deals.pipelineSettings)) : [];
      pipelineSettings.value = normalizePipelineSettings(raw);
      if (pipelineSettings.value.length) {
        selectedPipelineKey.value = pipelineSettings.value[0].key;
      }
      originalSnapshot.value = JSON.stringify(normalizePipelineSettings(pipelineSettings.value));
    } else {
      error.value = data.message || 'Failed to load playbooks';
    }
  } catch (err) {
    console.error('Error fetching deals module:', err);
    error.value = err.message || 'Failed to load playbooks';
  } finally {
    loading.value = false;
  }
}

async function savePlaybooks() {
  if (!dealsModule.value || isSaving.value) return;
  isSaving.value = true;
  try {
    const normalized = normalizePipelineSettings(pipelineSettings.value);
    const url = dealsModule.value.type === 'system' ? `/api/modules/system/${dealsModule.value.key}` : `/api/modules/${dealsModule.value._id}`;
    const payload = { pipelineSettings: normalized };
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authStore.user?.token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to save playbooks');
      return;
    }
    await fetchDealsModule();
    alert('Playbooks saved successfully');
  } catch (e) {
    console.error('Save playbooks failed', e);
    alert('Failed to save: ' + (e.message || 'Unknown error'));
  } finally {
    isSaving.value = false;
  }
}

function handlePlaybookToggle(stage) {
  if (!stage.playbook) {
    stage.playbook = {
      enabled: false,
      actions: [],
      mode: 'sequential',
      exitCriteria: { type: 'manual', customDescription: '', nextStageKey: '' },
      notes: ''
    };
  }
  if (!stage.playbook.enabled) {
    stage.playbook.autoAdvance = false;
    stage.playbook.exitCriteria.nextStageKey = '';
  }
}

function onPlaybookExitCriteriaChange(stage) {
  if (!stage.playbook) return;
  if (stage.playbook.exitCriteria.type === 'manual') {
    stage.playbook.autoAdvance = false;
    stage.playbook.exitCriteria.nextStageKey = '';
  }
}

function onPlaybookAutoAdvanceChange(stage) {
  if (!stage.playbook) return;
  if (!stage.playbook.autoAdvance) {
    stage.playbook.exitCriteria.nextStageKey = '';
  } else if (stage.playbook.exitCriteria.type === 'manual') {
    stage.playbook.exitCriteria.type = 'all_actions_completed';
  }
}

function getNextStageOptions(pipeline, currentStage) {
  if (!pipeline || !currentStage) return [];
  return pipeline.stages
    .filter(stage => stage.key !== currentStage.key)
    .map(stage => ({ value: stage.key, label: stage.name }));
}

function isStageSettingsOpen(stage) {
  if (!stage) return false;
  return !!stageSettingsExpanded.value[stage.key];
}

function toggleStageSettings(stageKey) {
  if (!stageKey) return;
  stageSettingsExpanded.value = {
    ...stageSettingsExpanded.value,
    [stageKey]: !stageSettingsExpanded.value[stageKey]
  };
}

function addPlaybookAction(stage) {
  if (!stage.playbook) {
    stage.playbook = {
      enabled: true,
      actions: [],
      mode: 'sequential',
      exitCriteria: { type: 'manual', customDescription: '', nextStageKey: '' },
      notes: ''
    };
  }
  const index = stage.playbook.actions.length;
  const title = `Action ${index + 1}`;
  let key = slugify(`${stage.key}-${title}-${Date.now()}`);
  const existingKeys = new Set(stage.playbook.actions.map(action => action.key));
  while (existingKeys.has(key)) {
    key = `${key}-${Math.floor(Math.random() * 1000)}`;
  }
  stage.playbook.actions.push({
    key,
    title,
    description: '',
    actionType: 'task',
    dueInDays: 0,
    assignment: {
      type: 'deal_owner',
      targetId: null,
      targetType: '',
      targetName: ''
    },
    required: true,
    dependencies: [],
    autoCreate: true,
    trigger: { type: 'stage_entry' },
    alerts: [],
    resources: [],
    metadata: {}
  });
}

function removePlaybookAction(stage, actionIndex) {
  if (!stage.playbook || !Array.isArray(stage.playbook.actions)) return;
  if (actionIndex < 0 || actionIndex >= stage.playbook.actions.length) return;
  stage.playbook.actions.splice(actionIndex, 1);
}

function getPlaybookActionTypeLabel(actionType) {
  const option = PLAYBOOK_ACTION_TYPES.find(opt => opt.value === actionType);
  return option ? option.label : 'Task';
}

function getPlaybookAssignmentLabel(assignmentType) {
  const option = PLAYBOOK_ASSIGNMENT_OPTIONS.find(opt => opt.value === assignmentType);
  return option ? option.label : 'Deal Owner';
}

onMounted(() => {
  fetchDealsModule();
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

