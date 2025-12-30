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
    <!-- Block Actions -->
    <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        v-if="index > 0"
        @click.stop="$emit('move-up')"
        class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="Move up"
      >
        <ChevronUpIcon class="w-4 h-4" />
      </button>
      <button
        v-if="index < maxIndex"
        @click.stop="$emit('move-down')"
        class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="Move down"
      >
        <ChevronDownIcon class="w-4 h-4" />
      </button>
      <button
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

      <!-- Audit Summary Block -->
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
  DocumentCheckIcon,
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
</script>

