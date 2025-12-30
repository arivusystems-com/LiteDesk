<template>
  <div class="space-y-4">
    <!-- Block Type Display -->
    <div class="pb-4 border-b border-gray-200 dark:border-gray-700">
      <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        Block Type
      </p>
      <p class="text-sm font-semibold text-gray-900 dark:text-white capitalize">
        {{ block.type.replace(/_/g, ' ') }}
      </p>
    </div>

    <!-- Heading Settings -->
    <div v-if="block.type === 'heading'" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Heading Text
        </label>
        <input
          v-model="localBlock.content"
          @input="emitUpdate"
          type="text"
          placeholder="Enter heading text"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Level
        </label>
        <select
          v-model="localBlock.level"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option :value="1">Level 1 (Largest)</option>
          <option :value="2">Level 2</option>
          <option :value="3">Level 3 (Smallest)</option>
        </select>
      </div>
    </div>

    <!-- Text Settings -->
    <div v-else-if="block.type === 'text'" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Text Content
        </label>
        <textarea
          v-model="localBlock.content"
          @input="emitUpdate"
          rows="4"
          placeholder="Enter text content"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        ></textarea>
      </div>
    </div>

    <!-- Audit Summary Settings -->
    <div v-else-if="block.type === 'audit_summary'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showOverallScore"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Overall Score</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showResult"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Result (Pass/Fail)</span>
        </label>
      </div>
    </div>

    <!-- Overall Score Settings -->
    <div v-else-if="block.type === 'overall_score'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showPercentage"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Percentage</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showLabel"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Label</span>
        </label>
      </div>
    </div>

    <!-- Section Results Settings -->
    <div v-else-if="block.type === 'section_results'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showCompliancePercentage"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Compliance Percentage</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showFailedSections"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Highlight Failed Sections</span>
        </label>
      </div>
    </div>

    <!-- Failed Questions Settings -->
    <div v-else-if="block.type === 'failed_questions'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showSectionName"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Section Name</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showEvidence"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Evidence Status</span>
        </label>
      </div>
    </div>

    <!-- Evidence Gallery Settings -->
    <div v-else-if="block.type === 'evidence_gallery'" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Layout
        </label>
        <select
          v-model="localBlock.layout"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showThumbnails"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Thumbnails</span>
        </label>
      </div>
    </div>

    <!-- Corrective Actions Settings -->
    <div v-else-if="block.type === 'corrective_actions'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showStatus"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Status (Fixed/Pending/Regressed)</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="localBlock.showDates"
            @change="emitUpdate"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Dates</span>
        </label>
      </div>
    </div>

    <!-- Comparison Block Settings -->
    <div v-else-if="block.type === 'comparison'" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Comparison Period
        </label>
        <select
          v-model="localBlock.period"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="previous">Previous Audit</option>
          <option value="last_3">Last 3 Audits</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Metrics to Compare
        </label>
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="localBlock.metrics?.includes('compliance')"
              @change="toggleMetric('compliance')"
              class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Compliance %</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="localBlock.metrics?.includes('failedPoints')"
              @change="toggleMetric('failedPoints')"
              class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Failed Points</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Trend Block Settings -->
    <div v-else-if="block.type === 'trend'" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Number of Audits
        </label>
        <input
          v-model.number="localBlock.periodCount"
          @input="emitUpdate"
          type="number"
          min="3"
          max="10"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Metrics
        </label>
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="localBlock.metrics?.includes('compliance')"
              @change="toggleMetric('compliance')"
              class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Compliance %</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Chart Block Settings -->
    <div v-else-if="['line_chart', 'bar_chart', 'pie_chart'].includes(block.type)" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chart Title
        </label>
        <input
          v-model="localBlock.title"
          @input="emitUpdate"
          type="text"
          placeholder="Enter chart title"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Data Source (Metric)
        </label>
        <select
          v-model="localBlock.metric"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select metric...</option>
          <option v-if="metricsEnabled.overallCompliance" value="overallCompliance">Overall Compliance</option>
          <option v-if="metricsEnabled.sectionWiseCompliance" value="sectionWiseCompliance">Section-wise Compliance</option>
          <option v-if="metricsEnabled.evidenceCompletion" value="evidenceCompletion">Evidence Completion</option>
          <option v-if="metricsEnabled.averageRating" value="averageRating">Average Rating</option>
        </select>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Only metrics enabled in Step 3 are available
        </p>
      </div>
    </div>

    <!-- Conditional Visibility -->
    <div v-if="supportsConditionalVisibility" class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Visibility Rule
        </label>
        <select
          v-model="localBlock.visibilityRule"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Always show</option>
          <option value="show_if_data_exists">Show only if data exists</option>
          <option value="hide_if_no_comparison">Hide if no comparison data</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  block: {
    type: Object,
    required: true
  },
  metricsEnabled: {
    type: Object,
    default: () => ({
      overallCompliance: true,
      sectionWiseCompliance: true,
      evidenceCompletion: false,
      averageRating: false
    })
  }
});

const emit = defineEmits(['update']);

const localBlock = ref({ ...props.block });

const supportsConditionalVisibility = computed(() => {
  return ['comparison', 'trend', 'corrective_actions'].includes(props.block.type);
});

const toggleMetric = (metric) => {
  if (!localBlock.value.metrics) {
    localBlock.value.metrics = [];
  }
  const index = localBlock.value.metrics.indexOf(metric);
  if (index > -1) {
    localBlock.value.metrics.splice(index, 1);
  } else {
    localBlock.value.metrics.push(metric);
  }
  emitUpdate();
};

const emitUpdate = () => {
  emit('update', { ...localBlock.value });
};

watch(() => props.block, (newBlock) => {
  localBlock.value = { ...newBlock };
}, { deep: true });
</script>

