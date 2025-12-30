<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Response Template</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Design how the final response report looks after form submission. This step only controls presentation, not logic.
        </p>
      </div>
      
      <!-- Template Selection & Actions (Right Side) -->
      <div class="flex items-center gap-3">
        <!-- Template Dropdown -->
        <div class="relative">
          <select
            v-model="activeTemplateId"
            class="px-4 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer min-w-[200px]"
          >
            <option
              v-for="template in templates"
              :key="template.id"
              :value="template.id"
            >
              {{ template.name }}{{ template.isDefault ? ' (Default)' : '' }}
            </option>
          </select>
        </div>
        
        <!-- Template Actions -->
        <div class="flex items-center gap-2">
          <button
            @click="startEditTemplateName(activeTemplateId, activeTemplate.name)"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Rename template"
          >
            <PencilIcon class="w-4 h-4" />
          </button>
          <button
            @click="duplicateActiveTemplate"
            class="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title="Duplicate template"
          >
            <DocumentDuplicateIcon class="w-4 h-4" />
          </button>
          <button
            v-if="!activeTemplate.isDefault"
            @click="deleteTemplate(activeTemplateId)"
            class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete template"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Inline Edit Template Name (shown below header when editing) -->
    <div v-if="editingTemplateId === activeTemplateId && activeTemplate" class="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Rename:</span>
      <input
        v-model="editingTemplateName"
        @blur="saveTemplateName(activeTemplateId)"
        @keyup.enter="saveTemplateName(activeTemplateId)"
        @keyup.esc="cancelEditTemplateName"
        class="flex-1 px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        :ref="el => { if (el && editingTemplateId === activeTemplateId) templateNameInput = el; }"
        placeholder="Template name"
      />
    </div>

    <!-- Report Designer -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <div class="flex h-[calc(100vh-var(--tabbar-offset)-400px)] min-h-[600px]">
        <!-- Left: Block Library -->
        <div class="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto p-4">
          <h5 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Block Library</h5>
          
          <!-- Content Blocks -->
          <div class="mb-6">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Content</p>
            <div class="space-y-2">
              <div
                v-for="block in contentBlocks"
                :key="block.type"
                draggable="true"
                @dragstart="(e) => handleDragStart(e, block)"
                class="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
              >
                <div class="flex items-center gap-2">
                  <component :is="block.icon" class="w-5 h-5 text-gray-400" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ block.name }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ block.description }}</p>
              </div>
            </div>
          </div>

          <!-- Data Blocks -->
          <div class="mb-6">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Data (Auto-Bound)</p>
            <div class="space-y-2">
              <div
                v-for="block in dataBlocks"
                :key="block.type"
                draggable="true"
                @dragstart="(e) => handleDragStart(e, block)"
                class="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
              >
                <div class="flex items-center gap-2">
                  <component :is="block.icon" class="w-5 h-5 text-indigo-500" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ block.name }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ block.description }}</p>
              </div>
            </div>
          </div>

          <!-- Comparison & Trend Blocks -->
          <div class="mb-6">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Comparison & Trends</p>
            <div class="space-y-2">
              <div
                v-for="block in comparisonBlocks"
                :key="block.type"
                draggable="true"
                @dragstart="(e) => handleDragStart(e, block)"
                class="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
              >
                <div class="flex items-center gap-2">
                  <component :is="block.icon" class="w-5 h-5 text-blue-500" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ block.name }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ block.description }}</p>
              </div>
            </div>
          </div>

          <!-- Visualization Blocks -->
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Visualizations</p>
            <div class="space-y-2">
              <div
                v-for="block in visualizationBlocks"
                :key="block.type"
                draggable="true"
                @dragstart="(e) => handleDragStart(e, block)"
                class="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
              >
                <div class="flex items-center gap-2">
                  <component :is="block.icon" class="w-5 h-5 text-green-500" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ block.name }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ block.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Center: Report Canvas -->
        <div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
          <div
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent
            class="min-h-full bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed transition-colors"
            :class="
              isDragging
                ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-700'
            "
          >
            <div v-if="activeTemplate.blocks.length === 0" class="flex items-center justify-center h-full min-h-[400px]">
              <div class="text-center">
                <DocumentTextIcon class="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <p class="text-sm text-gray-500 dark:text-gray-400">Drag blocks here to build your report</p>
              </div>
            </div>
            <div v-else class="space-y-4 p-6">
              <ReportBlock
                v-for="(block, index) in activeTemplate.blocks"
                :key="block.id"
                :block="block"
                :index="index"
                :is-selected="selectedBlockIndex === index"
                :max-index="activeTemplate.blocks.length - 1"
                @select="selectBlock(index)"
                @delete="deleteBlock(index)"
                @move-up="moveBlockUp(index)"
                @move-down="moveBlockDown(index)"
              />
            </div>
          </div>
        </div>

        <!-- Right: Block Settings -->
        <div class="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto p-4">
          <h5 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Block Settings</h5>
          
          <div v-if="selectedBlockIndex === null" class="text-center py-8">
            <Cog6ToothIcon class="w-10 h-10 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
            <p class="text-sm text-gray-500 dark:text-gray-400">Select a block to configure</p>
          </div>
          
          <BlockSettings
            v-else
            :block="selectedBlock"
            :metrics-enabled="metricsEnabled"
            @update="updateBlockSettings"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import {
  DocumentTextIcon,
  TrashIcon,
  Cog6ToothIcon,
  Bars3Icon,
  ChartBarIcon,
  ChartPieIcon,
  PhotoIcon,
  DocumentCheckIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  PencilIcon,
  DocumentDuplicateIcon
} from '@heroicons/vue/24/outline';
import ReportBlock from './report-blocks/ReportBlock.vue';
import BlockSettings from './report-blocks/BlockSettings.vue';

const props = defineProps({
  form: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update']);

// Generate a unique ID for blocks/templates
const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Initialize templates from form data or create default
const initializeTemplates = () => {
  const formData = props.form || {};
  const existingTemplate = formData.responseTemplate || {};
  
  // If templates exist, use them
  if (existingTemplate.templates && Array.isArray(existingTemplate.templates) && existingTemplate.templates.length > 0) {
    return {
      templates: existingTemplate.templates,
      activeTemplateId: existingTemplate.activeTemplateId || existingTemplate.templates[0].id
    };
  }
  
  // Otherwise create default template
  const defaultTemplate = {
    id: 'default',
    name: 'Default Template',
    isDefault: true,
    blocks: [
      {
        id: generateId(),
        type: 'heading',
        content: 'Audit Report',
        level: 1
      },
      {
        id: generateId(),
        type: 'audit_summary',
        showOverallScore: true,
        showResult: true
      },
      {
        id: generateId(),
        type: 'section_results',
        showCompliancePercentage: true
      }
    ]
  };
  
  return {
    templates: [defaultTemplate],
    activeTemplateId: 'default'
  };
};

const { templates: initialTemplates, activeTemplateId: initialActiveId } = initializeTemplates();
const templates = ref(initialTemplates);
const activeTemplateId = ref(initialActiveId);
const selectedBlockIndex = ref(null);
const isDragging = ref(false);
const editingTemplateId = ref(null);
const editingTemplateName = ref('');
let templateNameInput = null;

// Get metrics enabled from Step 3
const metricsEnabled = computed(() => {
  const outcomes = props.form?.outcomesAndRules || {};
  return outcomes.reportingMetrics || {
    overallCompliance: true,
    sectionWiseCompliance: true,
    evidenceCompletion: false,
    averageRating: false
  };
});

// Active template
const activeTemplate = computed(() => {
  return templates.value.find(t => t.id === activeTemplateId.value) || templates.value[0];
});

// Selected block
const selectedBlock = computed(() => {
  if (selectedBlockIndex.value === null) return null;
  return activeTemplate.value.blocks[selectedBlockIndex.value];
});

// Block definitions for library
const contentBlocks = [
  {
    type: 'heading',
    name: 'Heading',
    description: 'Add a heading',
    icon: Bars3Icon
  },
  {
    type: 'text',
    name: 'Text',
    description: 'Add text content',
    icon: DocumentTextIcon
  },
  {
    type: 'divider',
    name: 'Divider',
    description: 'Horizontal line',
    icon: Bars3Icon
  }
];

const dataBlocks = [
  {
    type: 'audit_summary',
    name: 'Audit Summary',
    description: 'Overall score and result',
    icon: DocumentCheckIcon
  },
  {
    type: 'overall_score',
    name: 'Overall Score',
    description: 'Overall compliance score',
    icon: ChartBarIcon
  },
  {
    type: 'section_results',
    name: 'Section Results',
    description: 'Results by section',
    icon: ClipboardDocumentListIcon
  },
  {
    type: 'failed_questions',
    name: 'Failed Questions',
    description: 'List of failed questions',
    icon: XCircleIcon
  },
  {
    type: 'evidence_gallery',
    name: 'Evidence Gallery',
    description: 'Submitted evidence files',
    icon: PhotoIcon
  },
  {
    type: 'corrective_actions',
    name: 'Corrective Actions',
    description: 'Issues and status tracking',
    icon: ArrowPathIcon
  }
];

const comparisonBlocks = [
  {
    type: 'comparison',
    name: 'Current vs Previous',
    description: 'Compare with last audit',
    icon: ArrowTrendingUpIcon
  },
  {
    type: 'trend',
    name: 'Audit Trends',
    description: 'Last 3-5 audits trend',
    icon: ChartBarIcon
  }
];

const visualizationBlocks = [
  {
    type: 'line_chart',
    name: 'Line Chart',
    description: 'Line chart visualization',
    icon: ChartBarIcon
  },
  {
    type: 'bar_chart',
    name: 'Bar Chart',
    description: 'Bar chart visualization',
    icon: ChartBarIcon
  },
  {
    type: 'pie_chart',
    name: 'Pie Chart',
    description: 'Pie chart visualization',
    icon: ChartPieIcon
  }
];

// Drag and drop handlers
const handleDragStart = (e, block) => {
  isDragging.value = true;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify(block));
};

const handleDrop = (e) => {
  isDragging.value = false;
  e.preventDefault();
  
  try {
    const blockData = JSON.parse(e.dataTransfer.getData('application/json'));
    addBlock(blockData);
  } catch (error) {
    console.error('Error parsing block data:', error);
  }
};

// Block management
const addBlock = (blockDefinition) => {
  const newBlock = {
    id: generateId(),
    type: blockDefinition.type,
    ...getDefaultBlockConfig(blockDefinition.type)
  };
  
  const template = activeTemplate.value;
  if (selectedBlockIndex.value !== null) {
    template.blocks.splice(selectedBlockIndex.value + 1, 0, newBlock);
  } else {
    template.blocks.push(newBlock);
  }
  
  selectedBlockIndex.value = template.blocks.findIndex(b => b.id === newBlock.id);
  emitUpdate();
};

const getDefaultBlockConfig = (type) => {
  const configs = {
    heading: { content: 'Heading', level: 1 },
    text: { content: 'Enter text here...' },
    divider: {},
    audit_summary: { showOverallScore: true, showResult: true },
    overall_score: { showPercentage: true, showLabel: true },
    section_results: { showCompliancePercentage: true, showFailedSections: true },
    failed_questions: { showSectionName: true, showEvidence: true },
    evidence_gallery: { layout: 'grid', showThumbnails: true },
    corrective_actions: { showStatus: true, showDates: true },
    comparison: { metrics: ['compliance', 'failedPoints'], period: 'previous' },
    trend: { metrics: ['compliance'], periodCount: 5 },
    line_chart: { metric: 'overallCompliance', title: 'Trend Over Time' },
    bar_chart: { metric: 'sectionWiseCompliance', title: 'Section Comparison' },
    pie_chart: { metric: 'overallCompliance', title: 'Distribution' }
  };
  return configs[type] || {};
};

const deleteBlock = (index) => {
  activeTemplate.value.blocks.splice(index, 1);
  if (selectedBlockIndex.value === index) {
    selectedBlockIndex.value = null;
  } else if (selectedBlockIndex.value > index) {
    selectedBlockIndex.value--;
  }
  emitUpdate();
};

const selectBlock = (index) => {
  selectedBlockIndex.value = index;
};

const moveBlockUp = (index) => {
  if (index > 0) {
    const blocks = activeTemplate.value.blocks;
    [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
    selectedBlockIndex.value = index - 1;
    emitUpdate();
  }
};

const moveBlockDown = (index) => {
  const blocks = activeTemplate.value.blocks;
  if (index < blocks.length - 1) {
    [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
    selectedBlockIndex.value = index + 1;
    emitUpdate();
  }
};

const updateBlockSettings = (updatedBlock) => {
  if (selectedBlockIndex.value !== null) {
    activeTemplate.value.blocks[selectedBlockIndex.value] = {
      ...activeTemplate.value.blocks[selectedBlockIndex.value],
      ...updatedBlock
    };
    emitUpdate();
  }
};

// Template management
const duplicateActiveTemplate = () => {
  const active = activeTemplate.value;
  const newTemplate = {
    id: generateId(),
    name: `${active.name} (Copy)`,
    isDefault: false,
    blocks: JSON.parse(JSON.stringify(active.blocks))
  };
  templates.value.push(newTemplate);
  activeTemplateId.value = newTemplate.id;
  emitUpdate();
};

const startEditTemplateName = (id, name) => {
  editingTemplateId.value = id;
  editingTemplateName.value = name;
  nextTick(() => {
    const input = templateNameInput.value;
    if (input) {
      if (Array.isArray(input) && input[0]) {
        input[0].focus();
        input[0].select();
      } else if (input.focus) {
        input.focus();
        input.select();
      }
    }
  });
};

const saveTemplateName = (id) => {
  const template = templates.value.find(t => t.id === id);
  if (template && editingTemplateName.value.trim()) {
    template.name = editingTemplateName.value.trim();
    editingTemplateId.value = null;
    editingTemplateName.value = '';
    emitUpdate();
  }
};

const cancelEditTemplateName = () => {
  editingTemplateId.value = null;
  editingTemplateName.value = '';
};

const deleteTemplate = (id) => {
  if (templates.value.length <= 1) {
    alert('Cannot delete the last template');
    return;
  }
  
  const template = templates.value.find(t => t.id === id);
  if (template && template.isDefault) {
    alert('Cannot delete the default template');
    return;
  }
  
  if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
    const index = templates.value.findIndex(t => t.id === id);
    templates.value.splice(index, 1);
    
    if (activeTemplateId.value === id) {
      activeTemplateId.value = templates.value[0].id;
    }
    emitUpdate();
  }
};

// Watch active template changes
watch(() => activeTemplateId.value, () => {
  selectedBlockIndex.value = null;
  emitUpdate();
});

// Emit updates to parent
const emitUpdate = () => {
  emit('update', {
    ...props.form,
    responseTemplate: {
      templates: templates.value,
      activeTemplateId: activeTemplateId.value
    }
  });
};

// Initialize on mount
watch(() => props.form?._id, () => {
  const { templates: newTemplates, activeTemplateId: newActiveId } = initializeTemplates();
  templates.value = newTemplates;
  activeTemplateId.value = newActiveId;
  selectedBlockIndex.value = null;
}, { immediate: true });
</script>

