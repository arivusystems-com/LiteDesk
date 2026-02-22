<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pipelines & Stages</h3>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure sales pipelines and their stages</p>
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
          <button @click="addPipeline" class="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm hover:shadow">
            Add
          </button>
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
            <div class="flex items-center gap-2 mt-3">
              <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="radio"
                  name="default-pipeline"
                  class="text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                  :checked="pipeline.isDefault"
                  @change.stop="setDefaultPipeline(pipeline.key)"
                />
                Default
              </label>
              <div class="ml-auto flex items-center gap-1">
                <button
                  class="p-1 rounded text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                  :disabled="index === 0"
                  :class="{ 'opacity-40 cursor-not-allowed': index === 0 }"
                  @click.stop="movePipeline(pipeline.key, -1)"
                  title="Move up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M10 4a.75.75 0 01.53.22l4.5 4.5a.75.75 0 11-1.06 1.06L10 5.81 6.03 9.78a.75.75 0 11-1.06-1.06l4.5-4.5A.75.75 0 0110 4z" clip-rule="evenodd" />
                    <path d="M5.25 15.25a.75.75 0 01.75-.75h8a.75.75 0 010 1.5h-8a.75.75 0 01-.75-.75z" />
                  </svg>
                </button>
                <button
                  class="p-1 rounded text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                  :disabled="index === pipelineSettings.length - 1"
                  :class="{ 'opacity-40 cursor-not-allowed': index === pipelineSettings.length - 1 }"
                  @click.stop="movePipeline(pipeline.key, 1)"
                  title="Move down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M10 16a.75.75 0 01-.53-.22l-4.5-4.5a.75.75 0 011.06-1.06L10 14.19l3.97-3.97a.75.75 0 111.06 1.06l-4.5 4.5A.75.75 0 0110 16z" clip-rule="evenodd" />
                    <path d="M5.25 4.75a.75.75 0 01.75-.75h8a.75.75 0 010 1.5h-8a.75.75 0 01-.75-.75z" />
                  </svg>
                </button>
                <button
                  class="p-1 rounded text-red-500 hover:text-red-600 transition-colors"
                  @click.stop="removePipeline(pipeline.key)"
                  title="Remove pipeline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M8.75 3a.75.75 0 00-.75.75V5H5.5a.75.75 0 000 1.5h.538l.599 9.27A1.75 1.75 0 008.382 17.5h3.236a1.75 1.75 0 001.745-1.73l.599-9.27h.538a.75.75 0 000-1.5H12v-1.25A.75.75 0 0011.25 3h-2.5zM9.5 6.5v7a.75.75 0 001.5 0v-7a.75.75 0 00-1.5 0zm-2 0v7a.75.75 0 001.5 0v-7a.75.75 0 00-1.5 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div v-if="!pipelineSettings.length" class="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No pipelines yet.
          </div>
        </div>
      </aside>
      <section class="flex-1 min-w-0 bg-white dark:bg-gray-900/60 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
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
            @click="savePipelines"
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
            <span>{{ isSaving ? 'Saving…' : 'Save Pipelines' }}</span>
          </button>
        </div>
        <div v-if="currentPipeline" class="p-4 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Pipeline Name</label>
              <input v-model="currentPipeline.name" class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-sm" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
              <div class="flex items-center gap-3">
                <input type="color" v-model="currentPipeline.color" class="w-14 h-10 border border-gray-300 dark:border-gray-600 rounded focus:outline-none" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Used for visual indicators in the UI.</span>
              </div>
            </div>
            <div class="md:col-span-2 flex items-center gap-3">
              <span v-if="currentPipeline.isDefault" class="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">Default pipeline</span>
              <button
                v-else
                @click="setDefaultPipeline(currentPipeline.key)"
                class="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                Set as default
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3">
            <div>
              <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Stages</h4>
              <p class="text-xs text-gray-500 dark:text-gray-400">Configure the stages available in this pipeline.</p>
            </div>
            <div class="flex items-center gap-2">
              <button @click="addStageToPipeline(currentPipeline)" class="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm hover:shadow">
                Add Stage
              </button>
            </div>
          </div>

          <div class="pr-1 space-y-3 pb-16">
            <div
              v-for="(stage, stageIndex) in currentPipeline.stages"
              :key="stage.key || stageIndex"
              class="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/50 p-4 transition-shadow"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">Stage {{ stageIndex + 1 }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    class="p-1 rounded text-red-500 hover:text-red-600 transition-colors"
                    @click="removeStageFromPipeline(currentPipeline, stageIndex)"
                    title="Remove stage"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                      <path fill-rule="evenodd" d="M8.75 3a.75.75 0 00-.75.75V5H5.5a.75.75 0 000 1.5h.538l.599 9.27A1.75 1.75 0 008.382 17.5h3.236a1.75 1.75 0 001.745-1.73l.599-9.27h.538a.75.75 0 000-1.5H12v-1.25A.75.75 0 0011.25 3h-2.5zM9.5 6.5v7a.75.75 0 001.5 0v-7a.75.75 0 00-1.5 0zm-2 0v7a.75.75 0 001.5 0v-7a.75.75 0 00-1.5 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Stage Name</label>
                  <input v-model="stage.name" class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-sm" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Probability (%)</label>
                  <input type="number" min="0" max="100" v-model.number="stage.probability" @change="clampStageProbability(stage)" @blur="clampStageProbability(stage)" class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-sm" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select v-model="stage.status" @change="onStageStatusChange(stage)" class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-sm">
                    <option v-for="option in pipelineStageStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          <div class="text-center space-y-3">
            <p>No pipeline selected.</p>
            <button @click="addPipeline" class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Create Pipeline</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/utils/apiClient';

const authStore = useAuthStore();
const loading = ref(true);
const error = ref('');
const dealsModule = ref(null);
const pipelineSettings = ref([]);
const selectedPipelineKey = ref('');
const isSaving = ref(false);
const originalSnapshot = ref('');

const DEFAULT_PIPELINE_COLOR = '#2563EB';
const DEFAULT_STAGE_DEFINITIONS = [
  { name: 'Qualification', probability: 25, status: 'open' },
  { name: 'Proposal', probability: 50, status: 'open' },
  { name: 'Negotiation', probability: 70, status: 'open' },
  { name: 'Contract Sent', probability: 85, status: 'open' },
  { name: 'Closed Won', probability: 100, status: 'won' },
  { name: 'Closed Lost', probability: 0, status: 'lost' }
];

const pipelineStageStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won (Closed)' },
  { value: 'lost', label: 'Lost (Closed)' },
  { value: 'stalled', label: 'Stalled' }
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
  const source = Array.isArray(settings) && settings.length ? settings : getDefaultPipelineSettingsLocal();
  const normalized = source.map((pipeline, pipelineIndex) => {
    const name = (pipeline.name || `Pipeline ${pipelineIndex + 1}`).trim();
    let key = pipeline.key ? slugify(pipeline.key) : slugify(name);
    if (!key) key = `pipeline-${pipelineIndex + 1}`;
    const color = pipeline.color || DEFAULT_PIPELINE_COLOR;
    const stagesSource = Array.isArray(pipeline.stages) && pipeline.stages.length ? pipeline.stages : DEFAULT_STAGE_DEFINITIONS;
    const stages = stagesSource.map((stage, stageIndex) => {
      const stageName = (stage.name || DEFAULT_STAGE_DEFINITIONS[stageIndex]?.name || `Stage ${stageIndex + 1}`).trim();
      let stageKeyRaw = stage.key ? slugify(stage.key) : slugify(`${key}-${stageName}`);
      if (!stageKeyRaw) stageKeyRaw = `${key}-stage-${stageIndex + 1}`;
      const status = ['open', 'won', 'lost', 'stalled'].includes(stage.status) ? stage.status : (DEFAULT_STAGE_DEFINITIONS[stageIndex]?.status || 'open');
      let probability = typeof stage.probability === 'number' ? stage.probability : (DEFAULT_STAGE_DEFINITIONS[stageIndex]?.probability ?? 0);
      if (status === 'won') probability = 100;
      if (status === 'lost') probability = 0;
      probability = Math.min(100, Math.max(0, Number(probability) || 0));
      return {
        key: stageKeyRaw,
        name: stageName,
        description: stage.description || '',
        probability,
        status,
        order: stageIndex,
        isClosedWon: status === 'won',
        isClosedLost: status === 'lost',
        playbook: stage.playbook || { enabled: false, actions: [], mode: 'sequential', exitCriteria: { type: 'manual' }, notes: '' }
      };
    });
    return {
      key,
      name,
      description: pipeline.description || '',
      color,
      isDefault: pipeline.isDefault === true,
      order: pipelineIndex,
      stages
    };
  });

  if (!normalized.length) {
    return normalizePipelineSettings(getDefaultPipelineSettingsLocal());
  }

  const seenKeys = new Set();
  normalized.forEach((pipeline, index) => {
    const baseKey = pipeline.key;
    while (seenKeys.has(pipeline.key)) {
      pipeline.key = `${baseKey}-${index}`;
    }
    seenKeys.add(pipeline.key);
    pipeline.order = index;
  });

  let defaultFound = false;
  normalized.forEach((pipeline, index) => {
    if (pipeline.isDefault && !defaultFound) {
      defaultFound = true;
    } else if (pipeline.isDefault && defaultFound) {
      pipeline.isDefault = false;
    }
    pipeline.order = index;
  });
  if (!defaultFound && normalized.length) {
    normalized[0].isDefault = true;
  }

  return normalized;
}

function getDefaultPipelineSettingsLocal() {
  return [createDefaultPipeline('Default Pipeline', { isDefault: true })];
}

function createDefaultPipeline(name = 'Default Pipeline', { isDefault = false } = {}) {
  const pipelineKey = slugify(name) || `pipeline-${Date.now()}`;
  const stages = DEFAULT_STAGE_DEFINITIONS.map((def, index) => {
    const status = ['open', 'won', 'lost', 'stalled'].includes(def.status) ? def.status : 'open';
    let probability = typeof def.probability === 'number' ? def.probability : 0;
    if (status === 'won') probability = 100;
    if (status === 'lost') probability = 0;
    probability = Math.min(100, Math.max(0, Number(probability) || 0));
    const key = slugify(`${pipelineKey}-${def.name}-${index}`) || `${pipelineKey}-stage-${index + 1}`;
    return {
      key,
      name: def.name,
      description: '',
      probability,
      status,
      order: index,
      isClosedWon: status === 'won',
      isClosedLost: status === 'lost',
      playbook: { enabled: false, actions: [], mode: 'sequential', exitCriteria: { type: 'manual' }, notes: '' }
    };
  });
  return {
    key: pipelineKey,
    name,
    description: '',
    color: DEFAULT_PIPELINE_COLOR,
    isDefault,
    order: 0,
    stages
  };
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
      error.value = data.message || 'Failed to load pipelines';
    }
  } catch (err) {
    console.error('Error fetching deals module:', err);
    error.value = err.message || 'Failed to load pipelines';
  } finally {
    loading.value = false;
  }
}

async function savePipelines() {
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
      alert(data.message || 'Failed to save pipelines');
      return;
    }
    await fetchDealsModule();
    alert('Pipelines saved successfully');
  } catch (e) {
    console.error('Save pipelines failed', e);
    alert('Failed to save: ' + (e.message || 'Unknown error'));
  } finally {
    isSaving.value = false;
  }
}

function refreshPipelineOrders() {
  pipelineSettings.value.forEach((pipeline, index) => {
    pipeline.order = index;
    pipeline.stages.forEach((stage, stageIndex) => {
      stage.order = stageIndex;
    });
  });
}

function addPipeline() {
  const count = pipelineSettings.value.length;
  const name = count === 0 ? 'Default Pipeline' : `Pipeline ${count + 1}`;
  const isDefault = count === 0 && !pipelineSettings.value.some(p => p.isDefault);
  const pipeline = createDefaultPipeline(name, { isDefault });
  pipeline.order = count;
  pipelineSettings.value.push(pipeline);
  selectedPipelineKey.value = pipeline.key;
  refreshPipelineOrders();
}

function removePipeline(pipelineKey) {
  if (pipelineSettings.value.length <= 1) {
    alert('At least one pipeline is required.');
    return;
  }
  const index = pipelineSettings.value.findIndex(p => p.key === pipelineKey);
  if (index === -1) return;
  const [removed] = pipelineSettings.value.splice(index, 1);
  if (removed?.isDefault && pipelineSettings.value.length) {
    pipelineSettings.value[0].isDefault = true;
  }
  refreshPipelineOrders();
  if (selectedPipelineKey.value === pipelineKey) {
    selectedPipelineKey.value = pipelineSettings.value[0]?.key || '';
  }
}

function movePipeline(pipelineKey, direction) {
  const index = pipelineSettings.value.findIndex(p => p.key === pipelineKey);
  if (index === -1) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= pipelineSettings.value.length) return;
  const [pipeline] = pipelineSettings.value.splice(index, 1);
  pipelineSettings.value.splice(newIndex, 0, pipeline);
  refreshPipelineOrders();
}

function setDefaultPipeline(pipelineKey) {
  pipelineSettings.value.forEach(p => {
    p.isDefault = (p.key === pipelineKey);
  });
}

function addStageToPipeline(pipeline) {
  if (!pipeline) return;
  const stageIndex = pipeline.stages.length;
  const baseDef = { name: `Stage ${stageIndex + 1}`, probability: 0, status: 'open' };
  const status = 'open';
  const probability = 0;
  const key = slugify(`${pipeline.key}-${baseDef.name}-${stageIndex}`) || `${pipeline.key}-stage-${stageIndex + 1}`;
  const newStage = {
    key,
    name: baseDef.name,
    description: '',
    probability,
    status,
    order: stageIndex,
    isClosedWon: false,
    isClosedLost: false,
    playbook: { enabled: false, actions: [], mode: 'sequential', exitCriteria: { type: 'manual' }, notes: '' }
  };
  pipeline.stages.push(newStage);
  pipeline.stages.forEach((stage, idx) => (stage.order = idx));
}

function removeStageFromPipeline(pipeline, stageIndex) {
  if (!pipeline) return;
  if (pipeline.stages.length <= 1) {
    alert('A pipeline must contain at least one stage.');
    return;
  }
  pipeline.stages.splice(stageIndex, 1);
  pipeline.stages.forEach((stage, idx) => (stage.order = idx));
}

function clampStageProbability(stage) {
  if (stage.status === 'won') {
    stage.probability = 100;
  } else if (stage.status === 'lost') {
    stage.probability = 0;
  } else {
    stage.probability = Math.min(100, Math.max(0, Number(stage.probability) || 0));
  }
}

function onStageStatusChange(stage) {
  if (stage.status === 'won') {
    stage.probability = 100;
    stage.isClosedWon = true;
    stage.isClosedLost = false;
  } else if (stage.status === 'lost') {
    stage.probability = 0;
    stage.isClosedWon = false;
    stage.isClosedLost = true;
  } else {
    stage.isClosedWon = false;
    stage.isClosedLost = false;
  }
}

onMounted(() => {
  fetchDealsModule();
});
</script>

