<template>
  <div
    @click="$emit('select')"
    class="group relative bg-white dark:bg-gray-800 border-2 rounded-lg p-4 cursor-pointer transition-all"
    :class="
      isSelected
        ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-900'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    "
  >
    <!-- Lock Icon for Mandatory Blocks -->
    <div v-if="block.mandatory || block.locked" class="absolute top-2 left-2">
      <div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded" title="Core block - cannot be removed or hidden">
        <LockClosedIcon class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>
    </div>

    <!-- Block Actions -->
    <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        v-if="index > 0 && !isCoreBlockRestricted('up')"
        @click.stop="$emit('move-up')"
        class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="Move up"
      >
        <ChevronUpIcon class="w-4 h-4" />
      </button>
      <button
        v-if="index < maxIndex && !isCoreBlockRestricted('down')"
        @click.stop="$emit('move-down')"
        class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="Move down"
      >
        <ChevronDownIcon class="w-4 h-4" />
      </button>
      <button
        v-if="!block.mandatory"
        @click.stop="$emit('delete')"
        class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
        title="Delete"
      >
        <TrashIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Block Content Preview -->
    <div class="pr-20">
      <!-- Heading Block -->
      <div v-if="block.type === 'heading'" class="space-y-1">
        <component
          :is="`h${block.level || 1}`"
          class="font-bold text-gray-900 dark:text-white"
          :class="{
            'text-2xl': block.level === 1,
            'text-xl': block.level === 2,
            'text-lg': block.level === 3
          }"
        >
          {{ block.content || 'Heading' }}
        </component>
      </div>

      <!-- Text Block -->
      <div v-else-if="block.type === 'text'" class="text-gray-700 dark:text-gray-300">
        {{ block.content || 'Enter text here...' }}
      </div>

      <!-- Divider Block -->
      <div v-else-if="block.type === 'divider'" class="border-t border-gray-300 dark:border-gray-600 my-2"></div>

      <!-- Report Identity Block (Core) -->
      <div v-else-if="block.type === 'report_identity'" class="space-y-2">
        <div class="flex items-center gap-2">
          <DocumentCheckIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Report Identity</span>
          <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">(Core)</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          <span v-if="block.config?.showAuditId">Audit ID: RSP-001</span>
          <span v-if="block.config?.showDates" class="ml-2">Dates: Jan 1, 2024</span>
          <span v-if="block.config?.showRound" class="ml-2">Round: 1st Round 2024</span>
        </div>
      </div>

      <!-- Overall Performance Block (Core) -->
      <div v-else-if="block.type === 'overall_performance'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ChartBarIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Overall Performance</span>
          <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">(Core)</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          <span v-if="block.config?.showScore">Score: 85%</span>
          <span v-if="block.config?.showRating" class="ml-2">Rating: ⭐⭐⭐</span>
          <span v-if="block.config?.showBenchmark" class="ml-2">Benchmark: 80%</span>
        </div>
      </div>

      <!-- Section Breakdown Block (Core) -->
      <div v-else-if="block.type === 'section_breakdown'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ClipboardDocumentListIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Section Performance Breakdown</span>
          <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">(Core)</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Shows compliance scores by section
          <span v-if="block.config?.showPassFailCounts"> with pass/fail counts</span>
        </div>
      </div>

      <!-- Audit Summary Block (Legacy) -->
      <div v-else-if="block.type === 'audit_summary'" class="space-y-2">
        <div class="flex items-center gap-2">
          <DocumentCheckIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Audit Summary</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          <span v-if="block.showOverallScore">Overall Score: 85%</span>
          <span v-if="block.showResult" class="ml-2">Result: Pass</span>
        </div>
      </div>

      <!-- Overall Score Block -->
      <div v-else-if="block.type === 'overall_score'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ChartBarIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Overall Score</span>
        </div>
        <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">85%</div>
      </div>

      <!-- Section Results Block -->
      <div v-else-if="block.type === 'section_results'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ClipboardDocumentListIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Section Results</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Shows compliance by section</div>
      </div>

      <!-- Failed Questions Block -->
      <div v-else-if="block.type === 'failed_questions'" class="space-y-2">
        <div class="flex items-center gap-2">
          <XCircleIcon class="w-5 h-5 text-red-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Failed Questions</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Lists questions that did not meet requirements</div>
      </div>

      <!-- Evidence Gallery Block -->
      <div v-else-if="block.type === 'evidence_gallery'" class="space-y-2">
        <div class="flex items-center gap-2">
          <PhotoIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Evidence Gallery</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Displays submitted evidence files</div>
      </div>

      <!-- Corrective Actions Block -->
      <div v-else-if="block.type === 'corrective_actions'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ArrowPathIcon class="w-5 h-5 text-blue-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Corrective Actions</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Shows issues from previous audits with status</div>
      </div>

      <!-- Comparison Block -->
      <div v-else-if="block.type === 'comparison'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ArrowTrendingUpIcon class="w-5 h-5 text-blue-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Current vs Previous</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Compares current audit with previous</div>
      </div>

      <!-- Trend Block -->
      <div v-else-if="block.type === 'trend'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ChartBarIcon class="w-5 h-5 text-blue-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Audit Trends</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Shows trends across last audits</div>
      </div>

      <!-- Narrative Summary Block (INSIGHTS) -->
      <div v-else-if="block.type === 'narrative_summary'" class="space-y-2">
        <div class="flex items-center gap-2">
          <DocumentTextIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Narrative Summary</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Executive summary with key findings
          <span v-if="block.config?.includeScoreContext"> (includes score context)</span>
          <span v-if="block.config?.includeTopAreas"> (mentions top areas)</span>
        </div>
      </div>

      <!-- Top & Bottom Areas Block (INSIGHTS) -->
      <div v-else-if="block.type === 'top_bottom_areas'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ChartBarIcon class="w-5 h-5 text-indigo-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Top & Bottom Areas</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Top {{ block.config?.topCount || 5 }} and bottom {{ block.config?.bottomCount || 5 }} scoring sections
          <span v-if="block.config?.layout"> ({{ block.config.layout }} layout)</span>
        </div>
      </div>

      <!-- Non-Compliance Summary Block (INSIGHTS) -->
      <div v-else-if="block.type === 'non_compliance_summary'" class="space-y-2">
        <div class="flex items-center gap-2">
          <XCircleIcon class="w-5 h-5 text-red-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Non-Compliance Summary</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Compliance issues by {{ block.config?.showByDepartment ? 'department' : 'category' }}
          <span v-if="block.config?.showPreviousComparison"> (with previous comparison)</span>
        </div>
      </div>

      <!-- Performance Trends Block (TRENDS) -->
      <div v-else-if="block.type === 'performance_trends'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ArrowTrendingUpIcon class="w-5 h-5 text-blue-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Performance Trends</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Last {{ block.config?.periodCount || 5 }} audits trend
          <span v-if="block.config?.chartType"> ({{ block.config.chartType }} chart)</span>
          <span v-if="block.config?.metrics"> - metrics: {{ block.config.metrics.join(', ') }}</span>
        </div>
      </div>

      <!-- Detailed Findings Block (DETAILS) -->
      <div v-else-if="block.type === 'detailed_findings'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ClipboardDocumentListIcon class="w-5 h-5 text-purple-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Detailed Findings</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Complete question-by-question results
          <span v-if="block.config?.showOnlyFailed"> (failed only)</span>
          <span v-if="block.config?.showEvidence"> (with evidence)</span>
          <span v-if="block.config?.showComments"> (with comments)</span>
        </div>
      </div>

      <!-- Action Items Summary Block (DETAILS) -->
      <div v-else-if="block.type === 'action_items_summary'" class="space-y-2">
        <div class="flex items-center gap-2">
          <ArrowPathIcon class="w-5 h-5 text-purple-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Action Items Summary</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Corrective actions and status
          <span v-if="block.config?.showStatus"> (with status)</span>
          <span v-if="block.config?.showDates"> (with dates)</span>
          <span v-if="block.config?.showFromPreviousAudits"> (includes previous audits)</span>
        </div>
      </div>

      <!-- Chart Blocks -->
      <div v-else-if="['line_chart', 'bar_chart', 'pie_chart'].includes(block.type)" class="space-y-2">
        <div class="flex items-center gap-2">
          <ChartBarIcon v-if="block.type === 'line_chart' || block.type === 'bar_chart'" class="w-5 h-5 text-green-500" />
          <ChartPieIcon v-else class="w-5 h-5 text-green-500" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ block.title || block.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Metric: {{ block.metric || 'N/A' }}
        </div>
      </div>

      <!-- Unknown Block Type -->
      <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
        Unknown block type: {{ block.type }}
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  LockClosedIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ChartPieIcon,
  PhotoIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  block: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  maxIndex: {
    type: Number,
    required: true
  }
});

defineEmits(['select', 'delete', 'move-up', 'move-down']);

// Check if core block movement is restricted
const isCoreBlockRestricted = (direction) => {
  if (!props.block.mandatory) return false;
  
  // Core blocks (first 3) cannot move out of their positions
  if (direction === 'up' && props.index < 3) {
    return true; // Cannot move up if in first 3 positions
  }
  if (direction === 'down' && props.index < 2) {
    return true; // Cannot move down if in first 2 positions (would move out of core range)
  }
  
  return false;
};
</script>

