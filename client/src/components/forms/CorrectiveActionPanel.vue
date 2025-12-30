<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <!-- Header (always visible, clickable when collapsed) -->
    <button
      @click="isExpanded = !isExpanded"
      class="w-full p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Corrective Actions</h2>
        <svg
          class="w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- Content Area -->
    <div v-show="isExpanded" class="p-6">
      <!-- Success State: No Failed Questions -->
      <div v-if="failedQuestions.length === 0" class="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <svg class="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm font-medium text-green-800 dark:text-green-300">
          All questions passed. No corrective actions required.
        </p>
      </div>

      <!-- Failed Questions with Corrective Actions -->
      <div v-else class="space-y-4">
        <div
          v-for="(question, index) in failedQuestions"
          :key="question.questionId"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <!-- Question Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {{ question.questionText }}
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400">
                Answer: {{ formatAnswer(question.answer) }}
              </p>
            </div>
            <BadgeCell 
              value="Fail" 
              :variant-map="{ 'Fail': 'danger' }" 
            />
          </div>

          <!-- Existing Corrective Actions (grouped by question) -->
          <div v-if="getCorrectiveAction(question.questionId)" class="mb-4 space-y-3">
            <div class="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <!-- Action Title -->
              <div class="mb-3">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Action</h4>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  {{ getCorrectiveAction(question.questionId).managerAction?.comment || 'No description provided' }}
                </p>
              </div>

              <!-- Action Details Grid -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <!-- Assigned User -->
                <div>
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned To</p>
                  <p class="text-sm text-gray-900 dark:text-white">
                    {{ getAssignedUserName(question.questionId) || 'Unassigned' }}
                  </p>
                </div>

                <!-- Status -->
                <div>
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
                  <BadgeCell
                    :value="mapStatus(getCorrectiveAction(question.questionId).managerAction?.status)"
                    :variant-map="{
                      'Open': 'default',
                      'In Progress': 'warning',
                      'Completed': 'success'
                    }"
                  />
                </div>

                <!-- Due Date (placeholder for future) -->
                <div>
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                  <p class="text-sm text-gray-900 dark:text-white">
                    {{ formatDate(getCorrectiveAction(question.questionId).managerAction?.addedAt) || 'Not set' }}
                  </p>
                </div>
              </div>

              <!-- Proof Files -->
              <div v-if="getCorrectiveAction(question.questionId).managerAction?.proof?.length" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Proof Files</p>
                <div class="flex flex-wrap gap-2">
                  <a
                    v-for="(proof, pIndex) in getCorrectiveAction(question.questionId).managerAction.proof"
                    :key="pIndex"
                    :href="proof"
                    target="_blank"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 bg-brand-50 dark:bg-brand-900/20 rounded hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {{ proof.split('/').pop() }}
                  </a>
                </div>
              </div>
            </div>

            <!-- Edit Button -->
            <button
              v-if="editingQuestionId !== question.questionId"
              @click="startEdit(question.questionId)"
              class="px-3 py-1.5 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded transition-colors"
            >
              Edit Corrective Action
            </button>
          </div>

          <!-- Add/Edit Corrective Action Form (inline) -->
          <div v-if="!getCorrectiveAction(question.questionId) || editingQuestionId === question.questionId" class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Action Title <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="getCorrectiveActionData(question.questionId).comment"
                rows="3"
                placeholder="Describe the corrective action to be taken..."
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="getCorrectiveActionData(question.questionId).status"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                >
                  <option value="Pending">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Proof (Optional)
              </label>
              <input
                type="file"
                @change="handleFileUpload($event, question.questionId)"
                multiple
                class="w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400"
              />
              <div v-if="getCorrectiveActionData(question.questionId).proofFiles.length" class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="(file, fIndex) in getCorrectiveActionData(question.questionId).proofFiles"
                  :key="fIndex"
                  class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {{ file.name }}
                  <button
                    @click="removeProofFile(question.questionId, fIndex)"
                    class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    type="button"
                  >
                    ×
                  </button>
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="saveCorrectiveAction(question.questionId)"
                :disabled="saving || !getCorrectiveActionData(question.questionId).comment.trim()"
                class="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ saving ? 'Saving...' : (getCorrectiveAction(question.questionId) ? 'Update' : 'Add') }} Corrective Action
              </button>
              <button
                v-if="editingQuestionId === question.questionId"
                @click="cancelEdit"
                class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import apiClient from '@/utils/apiClient';
import BadgeCell from '@/components/common/table/BadgeCell.vue';

const props = defineProps({
  response: {
    type: Object,
    required: true
  },
  form: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['updated']);

// State
const saving = ref(false);
const editingQuestionId = ref(null);
const correctiveActions = ref({});
const isExpanded = ref(false); // Collapsed by default

// Computed
const failedQuestions = computed(() => {
  if (!props.response || !props.response.responseDetails || !props.form) return [];
  
  return props.response.responseDetails
    .filter(rd => rd.passFail === 'Fail')
    .map(rd => {
      // Find question in form structure
      let question = null;
      for (const section of props.form.sections || []) {
        for (const subsection of section.subsections || []) {
          const q = subsection.questions?.find(q => q.questionId === rd.questionId);
          if (q) {
            question = { ...q, answer: rd.answer };
            break;
          }
        }
        if (question) break;
      }
      return question;
    })
    .filter(q => q !== null);
});

// Watch failed questions and expand if they exist
watch(failedQuestions, (newVal) => {
  // Expand if there are failed questions, collapse if none
  isExpanded.value = newVal.length > 0;
}, { immediate: true });

// Methods
const getCorrectiveAction = (questionId) => {
  if (!props.response || !props.response.correctiveActions) return null;
  return props.response.correctiveActions.find(ca => ca.questionId === questionId) || null;
};

const getCorrectiveActionData = (questionId) => {
  // Initialize if not exists
  if (!correctiveActions.value[questionId]) {
    const existing = getCorrectiveAction(questionId);
    correctiveActions.value[questionId] = {
      comment: existing?.managerAction?.comment || '',
      status: existing?.managerAction?.status || 'Pending',
      proofFiles: []
    };
  }
  return correctiveActions.value[questionId];
};

const formatAnswer = (answer) => {
  if (answer === null || answer === undefined) return 'No answer';
  if (Array.isArray(answer)) return answer.join(', ');
  return String(answer);
};

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const mapStatus = (status) => {
  const statusMap = {
    'Pending': 'Open',
    'In Progress': 'In Progress',
    'Resolved': 'Completed'
  };
  return statusMap[status] || status;
};

const getAssignedUserName = (questionId) => {
  const action = getCorrectiveAction(questionId);
  if (!action || !action.managerAction?.addedBy) return null;
  
  const user = action.managerAction.addedBy;
  if (typeof user === 'object') {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
  }
  return null;
};

const startEdit = (questionId) => {
  editingQuestionId.value = questionId;
  getCorrectiveActionData(questionId);
};

const cancelEdit = () => {
  editingQuestionId.value = null;
};

const handleFileUpload = (event, questionId) => {
  const files = Array.from(event.target.files);
  const actionData = getCorrectiveActionData(questionId);
  actionData.proofFiles.push(...files);
};

const removeProofFile = (questionId, fileIndex) => {
  const actionData = getCorrectiveActionData(questionId);
  if (actionData && actionData.proofFiles) {
    actionData.proofFiles.splice(fileIndex, 1);
  }
};

const saveCorrectiveAction = async (questionId) => {
  const actionData = getCorrectiveActionData(questionId);
  
  if (!actionData.comment.trim()) {
    alert('Please provide an action title/description');
    return;
  }

  saving.value = true;
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('questionId', questionId);
    formData.append('comment', actionData.comment);
    formData.append('status', actionData.status);
    
    // Append proof files
    if (actionData.proofFiles && actionData.proofFiles.length > 0) {
      actionData.proofFiles.forEach((file) => {
        formData.append('proof', file);
      });
    }

    // Use fetch for FormData (apiClient might not handle it properly)
    const authStore = JSON.parse(localStorage.getItem('auth') || '{}');
    const token = authStore.user?.token;
    
    const response = await fetch(`/api/forms/${props.form._id}/responses/${props.response._id}/corrective-action`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      editingQuestionId.value = null;
      // Clear proof files after successful upload
      correctiveActions.value[questionId].proofFiles = [];
      // Emit updated event - this will trigger response status recalculation via backend
      emit('updated');
    } else {
      throw new Error(result.message || 'Failed to save corrective action');
    }
  } catch (error) {
    console.error('Error saving corrective action:', error);
    alert('Failed to save corrective action. Please try again.');
  } finally {
    saving.value = false;
  }
};

// Lifecycle
onMounted(() => {
  // Expand if there are failed questions
  isExpanded.value = failedQuestions.value.length > 0;
});
</script>
