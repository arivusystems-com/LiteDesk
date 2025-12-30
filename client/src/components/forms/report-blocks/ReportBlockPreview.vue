<template>
  <div class="space-y-1">
    <!-- Heading Block -->
    <div v-if="block.type === 'heading'">
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
      <div class="text-xs text-gray-500 dark:text-gray-400">
        <span v-if="block.showCompliancePercentage">Shows compliance percentage by section</span>
        <span v-if="block.showFailedSections" class="ml-2">Includes failed sections</span>
      </div>
    </div>

    <!-- Failed Questions Block -->
    <div v-else-if="block.type === 'failed_questions'" class="space-y-2">
      <div class="flex items-center gap-2">
        <XCircleIcon class="w-5 h-5 text-red-500" />
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Failed Questions</span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Lists questions that did not meet requirements
        <span v-if="block.showSectionName"> (with section names)</span>
        <span v-if="block.showEvidence"> (with evidence)</span>
      </div>
    </div>

    <!-- Evidence Gallery Block -->
    <div v-else-if="block.type === 'evidence_gallery'" class="space-y-2">
      <div class="flex items-center gap-2">
        <PhotoIcon class="w-5 h-5 text-indigo-500" />
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Evidence Gallery</span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Displays submitted evidence files
        <span v-if="block.layout"> ({{ block.layout }} layout)</span>
        <span v-if="block.showThumbnails"> (with thumbnails)</span>
      </div>
    </div>

    <!-- Corrective Actions Block -->
    <div v-else-if="block.type === 'corrective_actions'" class="space-y-2">
      <div class="flex items-center gap-2">
        <ArrowPathIcon class="w-5 h-5 text-blue-500" />
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Corrective Actions</span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Shows issues from previous audits
        <span v-if="block.showStatus"> (with status)</span>
        <span v-if="block.showDates"> (with dates)</span>
      </div>
    </div>

    <!-- Comparison Block -->
    <div v-else-if="block.type === 'comparison'" class="space-y-2">
      <div class="flex items-center gap-2">
        <ArrowTrendingUpIcon class="w-5 h-5 text-blue-500" />
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Current vs Previous</span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Compares current audit with previous
        <span v-if="block.metrics"> (metrics: {{ block.metrics.join(', ') }})</span>
        <span v-if="block.period"> (period: {{ block.period }})</span>
      </div>
    </div>

    <!-- Trend Block -->
    <div v-else-if="block.type === 'trend'" class="space-y-2">
      <div class="flex items-center gap-2">
        <ChartBarIcon class="w-5 h-5 text-blue-500" />
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Audit Trends</span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Shows trends across last {{ block.periodCount || 5 }} audits
        <span v-if="block.metrics"> (metrics: {{ block.metrics.join(', ') }})</span>
      </div>
    </div>

    <!-- Chart Blocks -->
    <div v-else-if="['line_chart', 'bar_chart', 'pie_chart'].includes(block.type)" class="space-y-2">
      <div class="flex items-center gap-2">
        <ChartBarIcon v-if="block.type === 'line_chart' || block.type === 'bar_chart'" class="w-5 h-5 text-green-500" />
        <ChartPieIcon v-else class="w-5 h-5 text-green-500" />
        <span class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ block.title || block.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
        </span>
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
</template>

<script setup>
import {
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
  }
});
</script>

