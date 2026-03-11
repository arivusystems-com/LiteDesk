<template>
  <div class="space-y-4">
    <!-- Block Type Display -->
    <div class="pb-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Block Type
      </p>
        <div v-if="block.mandatory || block.locked" class="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
          <LockClosedIcon class="w-4 h-4" />
          <span class="text-xs font-medium">Core Block</span>
        </div>
      </div>
      <p class="text-sm font-semibold text-gray-900 dark:text-white capitalize">
        {{ block.type.replace(/_/g, ' ') }}
      </p>
      <p v-if="block.mandatory || block.locked" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        This is a core report block. Only presentation settings can be modified.
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

    <!-- Report Identity Settings (Core) -->
    <div v-else-if="block.type === 'report_identity'" class="space-y-4">
      <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg mb-4">
        <p class="text-xs text-indigo-700 dark:text-indigo-300">
          <strong>Core Block:</strong> This block displays report identity information. Only presentation options can be configured.
        </p>
        <p class="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
          <strong>Note:</strong> Logo and colors are configured in template branding settings, not per block.
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Report Title
        </label>
        <input
          v-model="localBlock.config.reportTitle"
          @input="emitUpdate"
          type="text"
          placeholder="Audit Report"
          :disabled="block.locked && !canEditPresentation"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showAuditId"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Audit ID</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showDates"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Check-in/Check-out Dates</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showRound"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Round Number</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showAddress"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Address</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showGeneralManager"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show General Manager</span>
        </label>
      </div>
    </div>

    <!-- Overall Performance Settings (Core) -->
    <div v-else-if="block.type === 'overall_performance'" class="space-y-4">
      <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg mb-4">
        <p class="text-xs text-indigo-700 dark:text-indigo-300">
          <strong>Core Block:</strong> This block displays overall performance metrics. Only presentation options can be configured.
        </p>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showScore"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Overall Score</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showRating"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Star Rating</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showBenchmark"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Benchmark Comparison</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showScoreBreakdown"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Score Breakdown</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showClassification"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Rating Classification Table</span>
        </label>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chart Type
        </label>
        <select
          v-model="localBlock.config.chartType"
          @change="emitUpdate"
          :disabled="block.locked && !canEditPresentation"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="donut">Donut Chart</option>
          <option value="gauge">Gauge</option>
          <option value="bar">Bar Chart</option>
          <option value="none">No Chart</option>
        </select>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showPerformanceHistory"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Performance History Chart</span>
        </label>
      </div>
    </div>

    <!-- Section Breakdown Settings (Core) -->
    <div v-else-if="block.type === 'section_breakdown'" class="space-y-4">
      <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg mb-4">
        <p class="text-xs text-indigo-700 dark:text-indigo-300">
          <strong>Core Block:</strong> This block displays section-by-section performance. Only presentation options can be configured.
        </p>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showCurrentScores"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Current Audit Scores</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showPreviousScores"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Previous Audit Scores</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showChange"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Change Indicators</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showPassFailCounts"
            @change="emitUpdate"
            :disabled="block.locked && !canEditPresentation"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Pass/Fail Question Counts</span>
        </label>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort By
        </label>
        <select
          v-model="localBlock.config.sortBy"
          @change="emitUpdate"
          :disabled="block.locked && !canEditPresentation"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="default">Default Order</option>
          <option value="score">Score (High to Low)</option>
          <option value="name">Section Name</option>
          <option value="change">Change Amount</option>
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
          <HeadlessCheckbox
            v-model="localBlock.showOverallScore"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Overall Score</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showResult"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Result (Pass/Fail)</span>
        </label>
      </div>
    </div>

    <!-- Overall Score Settings -->
    <div v-else-if="block.type === 'overall_score'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showPercentage"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Percentage</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showLabel"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Label</span>
        </label>
      </div>
    </div>

    <!-- Section Results Settings -->
    <div v-else-if="block.type === 'section_results'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showCompliancePercentage"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Compliance Percentage</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showFailedSections"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Highlight Failed Sections</span>
        </label>
      </div>
    </div>

    <!-- Failed Questions Settings -->
    <div v-else-if="block.type === 'failed_questions'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showSectionName"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Section Name</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showEvidence"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
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
          <HeadlessCheckbox
            v-model="localBlock.showThumbnails"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Thumbnails</span>
        </label>
      </div>
    </div>

    <!-- Corrective Actions Settings -->
    <div v-else-if="block.type === 'corrective_actions'" class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showStatus"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Status (Fixed/Pending/Regressed)</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.showDates"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
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
            <HeadlessCheckbox
              :checked="localBlock.metrics?.includes('compliance')"
              @change="toggleMetric('compliance')"
              checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Compliance %</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <HeadlessCheckbox
              :checked="localBlock.metrics?.includes('failedPoints')"
              @change="toggleMetric('failedPoints')"
              checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
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
            <HeadlessCheckbox
              :checked="localBlock.metrics?.includes('compliance')"
              @change="toggleMetric('compliance')"
              checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
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

    <!-- Narrative Summary Settings (INSIGHTS) -->
    <div v-else-if="block.type === 'narrative_summary'" class="space-y-4">
      <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg mb-4">
        <p class="text-xs text-indigo-700 dark:text-indigo-300">
          <strong>Note:</strong> Narrative is auto-generated from response data. Only presentation options can be configured.
        </p>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.includeScoreContext"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Include Score Context</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.includeTopAreas"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Mention Top Performing Areas</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.includeBottomAreas"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Mention Areas Needing Improvement</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.includeTrends"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Include Trend Information</span>
        </label>
      </div>
    </div>

    <!-- Top & Bottom Areas Settings (INSIGHTS) -->
    <div v-else-if="block.type === 'top_bottom_areas'" class="space-y-4">
      <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg mb-4">
        <p class="text-xs text-indigo-700 dark:text-indigo-300">
          <strong>Note:</strong> Data is calculated from section scores. Only display options can be configured.
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Top Areas Count
        </label>
        <input
          v-model.number="localBlock.config.topCount"
          @input="emitUpdate"
          type="number"
          min="1"
          max="10"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Bottom Areas Count
        </label>
        <input
          v-model.number="localBlock.config.bottomCount"
          @input="emitUpdate"
          type="number"
          min="1"
          max="10"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showScores"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Score Percentages</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showChange"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Change from Previous Audit</span>
        </label>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Layout
        </label>
        <select
          v-model="localBlock.config.layout"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="side_by_side">Side by Side</option>
          <option value="stacked">Stacked</option>
          <option value="table">Table</option>
        </select>
      </div>
    </div>

    <!-- Non-Compliance Summary Settings (INSIGHTS) -->
    <div v-else-if="block.type === 'non_compliance_summary'" class="space-y-4">
      <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg mb-4">
        <p class="text-xs text-indigo-700 dark:text-indigo-300">
          <strong>Note:</strong> Data is calculated from failed questions. Only grouping and display options can be configured.
        </p>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showByDepartment"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Group by Department</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showByCategory"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Group by Category</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showPreviousComparison"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Compare with Previous Audit</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showChange"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Change Indicators</span>
        </label>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort By
        </label>
        <select
          v-model="localBlock.config.sortBy"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="count">Non-Compliance Count</option>
          <option value="department">Department Name</option>
          <option value="change">Change Amount</option>
        </select>
      </div>
    </div>

    <!-- Performance Trends Settings (TRENDS) -->
    <div v-else-if="block.type === 'performance_trends'" class="space-y-4">
      <div class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
        <p class="text-xs text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> Data is fetched from historical responses. Only chart display options can be configured.
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Number of Audits
        </label>
        <input
          v-model.number="localBlock.config.periodCount"
          @input="emitUpdate"
          type="number"
          min="3"
          max="10"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chart Type
        </label>
        <select
          v-model="localBlock.config.chartType"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="area">Area Chart</option>
        </select>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showCurrentHighlight"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Highlight Current Audit</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showAverage"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Average Trend Line</span>
        </label>
      </div>
    </div>

    <!-- Detailed Findings Settings (DETAILS) -->
    <div v-else-if="block.type === 'detailed_findings'" class="space-y-4">
      <div class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mb-4">
        <p class="text-xs text-purple-700 dark:text-purple-300">
          <strong>Note:</strong> Data comes from response details. Only filtering and column display options can be configured.
        </p>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showOnlyFailed"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Only Failed Questions</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showEvidence"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Evidence Attachments</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showComments"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Question Comments</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showScores"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Individual Question Scores</span>
        </label>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort By
        </label>
        <select
          v-model="localBlock.config.sortBy"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="section">Section</option>
          <option value="score">Score</option>
          <option value="questionId">Question ID</option>
        </select>
      </div>
    </div>

    <!-- Action Items Summary Settings (DETAILS) -->
    <div v-else-if="block.type === 'action_items_summary'" class="space-y-4">
      <div class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mb-4">
        <p class="text-xs text-purple-700 dark:text-purple-300">
          <strong>Note:</strong> Data comes from corrective actions. Only display and filtering options can be configured.
        </p>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showStatus"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Action Item Status</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showDates"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Creation/Due Dates</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showAssignee"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Assigned User</span>
        </label>
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <HeadlessCheckbox
            v-model="localBlock.config.showFromPreviousAudits"
            @change="emitUpdate"
            checkbox-class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Include Items from Previous Audits</span>
        </label>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort By
        </label>
        <select
          v-model="localBlock.config.sortBy"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="date">Date</option>
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="department">Department</option>
        </select>
      </div>
    </div>

    <!-- System-Driven Visibility Notice -->
    <div v-if="hasSystemVisibilityRule" class="pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div class="flex items-start gap-2">
          <LockClosedIcon class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
              System-Driven Visibility
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-400">
              {{ getSystemVisibilityDescription }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Conditional Visibility (for non-system blocks) -->
    <div v-else-if="supportsConditionalVisibility" class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Visibility Rule
        </label>
        <select
          v-model="localBlock.visibilityRule"
          @change="emitUpdate"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALWAYS">Always show</option>
          <option value="SHOW_IF_DATA_EXISTS">Show only if data exists</option>
          <option value="HIDE_IF_NO_COMPARISON">Hide if no comparison data</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';
import { ref, watch, computed } from 'vue';
import { LockClosedIcon } from '@heroicons/vue/24/outline';
import { hasSystemVisibilityRule as checkSystemRule, getSystemVisibilityRule } from '../../../utils/blockVisibility';

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

// Initialize localBlock with proper config structure
const initializeLocalBlock = () => {
  const block = { ...props.block };
  // Ensure config exists for blocks that use config structure
  const blocksWithConfig = [
    'report_identity', 'overall_performance', 'section_breakdown',
    'narrative_summary', 'top_bottom_areas', 'non_compliance_summary',
    'performance_trends', 'detailed_findings', 'action_items_summary'
  ];
  if (blocksWithConfig.includes(block.type)) {
    if (!block.config) {
      block.config = {};
    }
  }
  return block;
};

const localBlock = ref(initializeLocalBlock());

// For locked blocks, only presentation settings can be edited
const canEditPresentation = computed(() => {
  // Locked blocks can still edit presentation settings (show/hide checkboxes, etc.)
  return true;
});

const hasSystemVisibilityRule = computed(() => {
  return checkSystemRule(props.block.type);
});

const getSystemVisibilityDescription = computed(() => {
  const rule = getSystemVisibilityRule(props.block.type);
  const descriptions = {
    'HIDE_IF_NO_HISTORY': 'This block will only appear if historical responses exist for comparison.',
    'HIDE_IF_NO_NON_COMPLIANCE': 'This block will only appear if there are failed questions or non-compliance issues.',
    'HIDE_IF_NO_QUESTIONS': 'This block will only appear if the response contains question data.',
    'HIDE_IF_NO_ACTION_ITEMS': 'This block will only appear if corrective actions have been added.'
  };
  return descriptions[rule] || 'This block has system-driven visibility rules that cannot be overridden.';
});

const supportsConditionalVisibility = computed(() => {
  // Only show user visibility rules for blocks that don't have system rules
  return !hasSystemVisibilityRule.value && ['comparison', 'trend', 'corrective_actions'].includes(props.block.type);
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
  // Ensure config structure is preserved for blocks that use config
  const updatedBlock = { ...localBlock.value };
  const blocksWithConfig = [
    'report_identity', 'overall_performance', 'section_breakdown',
    'narrative_summary', 'top_bottom_areas', 'non_compliance_summary',
    'performance_trends', 'detailed_findings', 'action_items_summary'
  ];
  if (blocksWithConfig.includes(updatedBlock.type)) {
    if (!updatedBlock.config) {
      updatedBlock.config = {};
    }
  }
  emit('update', updatedBlock);
};

watch(() => props.block, (newBlock) => {
  const updatedBlock = { ...newBlock };
  // Ensure config exists for blocks that use config structure
  const blocksWithConfig = [
    'report_identity', 'overall_performance', 'section_breakdown',
    'narrative_summary', 'top_bottom_areas', 'non_compliance_summary',
    'performance_trends', 'detailed_findings', 'action_items_summary'
  ];
  if (blocksWithConfig.includes(updatedBlock.type)) {
    if (!updatedBlock.config) {
      updatedBlock.config = {};
    }
  }
  localBlock.value = updatedBlock;
}, { deep: true });
</script>

