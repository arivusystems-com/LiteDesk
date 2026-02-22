<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Execution Logs</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ process?.name }}
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- List View -->
        <div v-if="!selectedExecution" class="p-6">
          <!-- Loading -->
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="executions.length === 0" class="text-center py-12">
            <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No executions yet</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              This process hasn't run yet.
            </p>
          </div>

          <!-- Executions List -->
          <div v-else class="space-y-3">
            <div
              v-for="execution in executions"
              :key="execution._id"
              @click="viewExecutionDetails(execution)"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow bg-white dark:bg-gray-800"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        execution.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : execution.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      ]"
                    >
                      {{ execution.status === 'completed' ? 'Completed' : execution.status === 'failed' ? 'Failed' : 'Running' }}
                    </span>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(execution.startedAt) }}
                    </span>
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>
                      <span class="font-medium">Trigger:</span>
                      {{ getTriggerLabel(execution) }}
                    </div>
                    <div v-if="execution.entityType && execution.entityId">
                      <span class="font-medium">Entity:</span>
                      {{ execution.entityType }} ({{ execution.entityId }})
                    </div>
                    <div v-if="execution.completedAt && execution.startedAt">
                      <span class="font-medium">Duration:</span>
                      {{ getDuration(execution.startedAt, execution.completedAt) }}
                    </div>
                  </div>
                </div>
                <button
                  @click.stop="viewExecutionDetails(execution)"
                  class="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail View (Timeline) -->
        <div v-else class="p-6">
          <div class="mb-4">
            <button
              @click="selectedExecution = null"
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to List
            </button>
          </div>

          <!-- Timeline -->
          <div class="space-y-4">
            <!-- Process Started -->
            <TimelineItem
              type="start"
              :status="'completed'"
              title="Process Started"
              :timestamp="selectedExecution.startedAt"
            >
              <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>
                  <span class="font-medium">Trigger:</span>
                  {{ getTriggerLabel(selectedExecution) }}
                </div>
                <div v-if="selectedExecution.triggeredBy">
                  <span class="font-medium">Triggered by:</span>
                  User ({{ selectedExecution.triggeredBy }})
                </div>
                <div v-if="selectedExecution.entityType && selectedExecution.entityId">
                  <span class="font-medium">Entity:</span>
                  {{ selectedExecution.entityType }} ({{ selectedExecution.entityId }})
                </div>
              </div>
            </TimelineItem>

            <!-- Rules Evaluated (reconstructed from process) -->
            <template v-for="(node, index) in processNodes" :key="node.id">
              <TimelineItem
                v-if="node.type === 'condition'"
                type="condition"
                :status="getNodeStatus(node, index)"
                :title="`Rule Evaluated`"
                :timestamp="null"
              >
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <div class="font-medium mb-1">Condition:</div>
                  <div>{{ getConditionSummary(node) }}</div>
                  <div class="mt-2 text-xs">
                    Result: <span :class="getNodeStatus(node, index) === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'">
                      {{ getNodeStatus(node, index) === 'completed' ? 'Passed' : 'Skipped' }}
                    </span>
                  </div>
                </div>
              </TimelineItem>

              <TimelineItem
                v-if="node.type === 'field_rule'"
                type="behavior"
                :status="getNodeStatus(node, index)"
                title="Behavior Proposed"
                :timestamp="null"
              >
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <div class="font-medium mb-1">Field Rule:</div>
                  <div>{{ getFieldRuleSummary(node) }}</div>
                </div>
              </TimelineItem>

              <TimelineItem
                v-if="node.type === 'ownership_rule'"
                type="behavior"
                :status="getNodeStatus(node, index)"
                title="Behavior Proposed"
                :timestamp="null"
              >
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <div class="font-medium mb-1">Ownership Rule:</div>
                  <div>{{ getOwnershipRuleSummary(node) }}</div>
                </div>
              </TimelineItem>

              <TimelineItem
                v-if="node.type === 'status_guard'"
                type="behavior"
                :status="getNodeStatus(node, index)"
                title="Behavior Proposed"
                :timestamp="null"
              >
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <div class="font-medium mb-1">Status Guard:</div>
                  <div>{{ getStatusGuardSummary(node) }}</div>
                </div>
              </TimelineItem>

              <TimelineItem
                v-if="node.type === 'action'"
                type="action"
                :status="getNodeStatus(node, index)"
                title="Action Executed"
                :timestamp="null"
              >
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <div class="font-medium mb-1">{{ getActionTypeLabel(node) }}:</div>
                  <div>{{ getActionSummary(node) }}</div>
                  <div class="mt-2 text-xs">
                    Result: <span :class="getNodeStatus(node, index) === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ getNodeStatus(node, index) === 'completed' ? 'Success' : 'Failed' }}
                    </span>
                  </div>
                </div>
              </TimelineItem>
            </template>

            <!-- Process Completed / Failed -->
            <TimelineItem
              :type="selectedExecution.status === 'completed' ? 'success' : 'error'"
              :status="selectedExecution.status === 'completed' ? 'completed' : 'failed'"
              :title="selectedExecution.status === 'completed' ? 'Process Completed' : 'Process Failed'"
              :timestamp="selectedExecution.completedAt || selectedExecution.startedAt"
            >
              <div v-if="selectedExecution.status === 'failed'" class="text-sm text-red-600 dark:text-red-400">
                <div class="font-medium mb-1">Error:</div>
                <div>{{ selectedExecution.error || 'Unknown error' }}</div>
              </div>
              <div v-else class="text-sm text-gray-600 dark:text-gray-400">
                Process completed successfully
              </div>
            </TimelineItem>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import apiClient from '@/utils/apiClient';
import TimelineItem from '@/components/admin/process/TimelineItem.vue';

const props = defineProps({
  process: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close']);

const executions = ref([]);
const loading = ref(true);
const selectedExecution = ref(null);

const processNodes = computed(() => {
  if (!props.process?.nodes) return [];
  // Sort nodes by execution order (simplified - would need edge traversal in real implementation)
  return props.process.nodes.filter(n => n.type !== 'trigger' && n.type !== 'end');
});

const loadExecutions = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get(`/admin/processes/${props.process._id}/executions`);
    executions.value = response.data || [];
  } catch (err) {
    console.error('Error loading executions:', err);
  } finally {
    loading.value = false;
  }
};

const viewExecutionDetails = (execution) => {
  selectedExecution.value = execution;
};

const getTriggerLabel = (execution) => {
  if (execution.eventId) {
    return 'Domain Event';
  }
  return 'Manual Trigger';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
};

const getDuration = (start, end) => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diffMs = endMs - startMs;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const getNodeStatus = (node, index) => {
  // Simplified: assume nodes executed if execution completed
  // In real implementation, would check execution logs
  if (selectedExecution.value?.status === 'completed') {
    return 'completed';
  }
  if (selectedExecution.value?.status === 'failed') {
    // Check if failure happened before this node
    const failedNodeId = selectedExecution.value.currentNodeId;
    if (failedNodeId && node.id === failedNodeId) {
      return 'failed';
    }
    return 'skipped';
  }
  return 'pending';
};

const getConditionSummary = (node) => {
  const config = node.config || {};
  if (config.field && config.operator) {
    const fieldName = config.field.replace(/^(event\.|dataBag\.)/, '');
    const operatorLabel = {
      equals: '=',
      not_equals: '≠',
      greater_than: '>',
      less_than: '<',
      contains: 'contains'
    }[config.operator] || config.operator;
    return `${fieldName} ${operatorLabel} ${config.value}`;
  }
  return 'Condition check';
};

const getFieldRuleSummary = (node) => {
  const config = node.config || {};
  if (config.rule === 'mandatory') {
    return `Make "${config.fieldKey}" mandatory`;
  } else if (config.rule === 'default') {
    return `Set "${config.fieldKey}" default to "${config.value}"`;
  } else if (config.rule === 'visibility') {
    return `${config.value ? 'Show' : 'Hide'} field "${config.fieldKey}"`;
  }
  return 'Field rule applied';
};

const getOwnershipRuleSummary = (node) => {
  const config = node.config || {};
  return `Assign ownership to ${config.target} (${config.assignment})`;
};

const getStatusGuardSummary = (node) => {
  const config = node.config || {};
  const transition = config.allowedTransitions?.[0] || '';
  return `Control ${config.field} transition: ${transition}`;
};

const getActionTypeLabel = (node) => {
  const config = node.config || {};
  const labels = {
    create_task: 'Create Task',
    notify_user: 'Send Notification',
    start_process: 'Start Process'
  };
  return labels[config.actionType] || 'Action';
};

const getActionSummary = (node) => {
  const config = node.config || {};
  if (config.actionType === 'create_task') {
    return `"${config.params?.title || 'Untitled'}"`;
  } else if (config.actionType === 'notify_user') {
    return `To: ${config.params?.recipient || 'user'}`;
  } else if (config.actionType === 'start_process') {
    return `Process: ${config.params?.processId || 'Unknown'}`;
  }
  return 'Action executed';
};

onMounted(() => {
  loadExecutions();
});
</script>
