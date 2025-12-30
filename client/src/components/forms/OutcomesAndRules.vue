<template>
  <div class="space-y-8">
    <!-- Step 3 Header -->
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Outcomes & Rules</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Define how audit results are evaluated and what outcome data is exposed after submission.
      </p>
    </div>

    <!-- 1. Audit Result Rules (PRIMARY) -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
      <div class="mb-4">
        <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Audit Result Rules
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Choose how the final audit result is determined.
        </p>
      </div>

      <div class="space-y-4">
        <label class="flex items-start gap-3 cursor-pointer group">
          <input
            type="radio"
            :value="'any_section_fails'"
            v-model="localOutcomes.auditResultRule"
            class="mt-1 w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:ring-2"
          />
          <div class="flex-1">
            <span class="block text-sm font-medium text-gray-900 dark:text-white">
              Audit fails if any section fails
            </span>
            <span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">
              Recommended default. The audit fails if any section does not meet its pass threshold.
            </span>
          </div>
        </label>

        <label class="flex items-start gap-3 cursor-pointer group">
          <input
            type="radio"
            :value="'overall_score_only'"
            v-model="localOutcomes.auditResultRule"
            class="mt-1 w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:ring-2"
          />
          <div class="flex-1">
            <span class="block text-sm font-medium text-gray-900 dark:text-white">
              Audit result based only on overall score
            </span>
            <span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">
              The audit result is determined solely by the overall compliance percentage, regardless of individual section results.
            </span>
          </div>
        </label>
      </div>

      <!-- Overall Score Calculation (Read-only) -->
      <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Overall Score Calculation:</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {{ scoringFormulaDisplay }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
          This formula is calculated from section and subsection scoring configured in previous steps.
        </p>
      </div>
    </div>

    <!-- 2. Reporting Metrics -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
      <div class="mb-4">
        <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Reporting Metrics
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Select which result metrics will be available for reports, dashboards, and exports.
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Presentation and layout are configured in the Response Template step.
        </p>
      </div>

      <div class="space-y-3">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="localOutcomes.reportingMetrics.overallCompliance"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Overall Compliance %
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Overall compliance percentage across all sections
            </p>
          </div>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="localOutcomes.reportingMetrics.sectionWiseCompliance"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Section-wise Compliance
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Individual compliance percentage for each section
            </p>
          </div>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="localOutcomes.reportingMetrics.evidenceCompletion"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Evidence Completion %
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Percentage of required evidence items that have been provided
            </p>
          </div>
        </label>

        <label 
          v-if="hasRatingQuestions"
          class="flex items-center gap-3 cursor-pointer"
        >
          <input
            type="checkbox"
            v-model="localOutcomes.reportingMetrics.averageRating"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Average Rating
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Average rating score from all rating-type questions
            </p>
          </div>
        </label>
      </div>
    </div>

    <!-- 3. Post-Submission Signals (Events) -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
      <div class="mb-4">
        <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Post-Submission Signals
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Define which events are emitted when an audit is submitted. These events will be consumed by automation rules.
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
          User assignments and notifications are configured separately in automation workflows.
        </p>
      </div>

      <div class="space-y-3">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="localOutcomes.postSubmissionSignals.emitOnAuditFail"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Emit event when audit fails
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Trigger an event when the overall audit result is a failure
            </p>
          </div>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="localOutcomes.postSubmissionSignals.emitOnSectionFail"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Emit event when a section fails
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Trigger an event when any individual section does not meet its pass threshold
            </p>
          </div>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="localOutcomes.postSubmissionSignals.emitOnCriticalQuestionFail"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Emit event when a critical question fails
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Trigger an event when any question marked as critical fails
            </p>
          </div>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="localOutcomes.postSubmissionSignals.emitOnMissingEvidence"
            class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Emit event when required evidence is missing
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Trigger an event when required file attachments or evidence are not provided
            </p>
          </div>
        </label>
      </div>
    </div>

    <!-- 4. Governance (Read-Only) -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30">
      <div class="mb-4">
        <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Governance
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Form metadata and version information.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Form Type
          </label>
          <input
            :value="formType"
            type="text"
            disabled
            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Form Version
          </label>
          <input
            :value="formVersion"
            type="text"
            disabled
            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';

const props = defineProps({
  form: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update']);

// Initialize outcomes structure with defaults
const initializeOutcomes = () => {
  const formData = props.form || {};
  const existingOutcomes = formData.outcomesAndRules || {};
  
  return {
    auditResultRule: existingOutcomes.auditResultRule || 'any_section_fails',
    reportingMetrics: {
      overallCompliance: existingOutcomes.reportingMetrics?.overallCompliance ?? true,
      sectionWiseCompliance: existingOutcomes.reportingMetrics?.sectionWiseCompliance ?? true,
      evidenceCompletion: existingOutcomes.reportingMetrics?.evidenceCompletion ?? false,
      averageRating: existingOutcomes.reportingMetrics?.averageRating ?? false
    },
    postSubmissionSignals: {
      emitOnAuditFail: existingOutcomes.postSubmissionSignals?.emitOnAuditFail ?? false,
      emitOnSectionFail: existingOutcomes.postSubmissionSignals?.emitOnSectionFail ?? false,
      emitOnCriticalQuestionFail: existingOutcomes.postSubmissionSignals?.emitOnCriticalQuestionFail ?? false,
      emitOnMissingEvidence: existingOutcomes.postSubmissionSignals?.emitOnMissingEvidence ?? false
    }
  };
};

const localOutcomes = ref(initializeOutcomes());
let isSyncing = false;
let lastEmittedValue = null;
let lastFormId = null;

// Check if form has rating questions
const hasRatingQuestions = computed(() => {
  const sections = props.form?.sections || [];
  for (const section of sections) {
    // Check section-level questions
    const sectionQuestions = section.questions || [];
    if (sectionQuestions.some(q => q.type === 'Rating')) {
      return true;
    }
    
    // Check subsection-level questions
    const subsections = section.subsections || [];
    for (const subsection of subsections) {
      const subsectionQuestions = subsection.questions || [];
      if (subsectionQuestions.some(q => q.type === 'Rating')) {
        return true;
      }
    }
  }
  return false;
});

// Display scoring formula (read-only)
const scoringFormulaDisplay = computed(() => {
  const formula = props.form?.scoringFormula || '(Passed / Total) × 100';
  return formula;
});

// Form type and version (read-only)
const formType = computed(() => {
  return props.form?.formType || 'Audit';
});

const formVersion = computed(() => {
  return props.form?.formVersion || 1;
});

// Sync when form ID changes (new form loaded)
watch(() => props.form?._id, (newId) => {
  if (newId && newId !== lastFormId) {
    lastFormId = newId;
    isSyncing = true;
    localOutcomes.value = initializeOutcomes();
    lastEmittedValue = null;
    setTimeout(() => { isSyncing = false; }, 100);
  }
}, { immediate: true });

// Watch localOutcomes and emit updates
watch(() => localOutcomes.value, (newValue) => {
  if (!isSyncing) {
    const serialized = JSON.stringify(newValue);
    if (serialized !== lastEmittedValue) {
      lastEmittedValue = serialized;
      emit('update', {
        ...props.form,
        outcomesAndRules: JSON.parse(serialized)
      });
    }
  }
}, { deep: true });

// Initialize on mount
onMounted(() => {
  localOutcomes.value = initializeOutcomes();
});
</script>

