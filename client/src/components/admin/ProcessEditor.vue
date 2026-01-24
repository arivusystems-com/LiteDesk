<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="handleClose">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div class="flex-1">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ process?.name }}</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ process?.description || 'No description' }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span
            :class="[
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
              process?.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : process?.status === 'draft'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            ]"
          >
            {{ process?.status === 'active' ? 'Active' : process?.status === 'draft' ? 'Draft' : 'Archived' }}
          </span>
          <button
            @click="handleClose"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Active Process Banner -->
      <div v-if="process?.status === 'active'" class="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              This process is active. Duplicate it to make changes.
            </p>
          </div>
          <button
            @click="duplicateAndEdit"
            class="px-4 py-2 text-sm font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
          >
            Duplicate & Edit
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="flex px-6" aria-label="Tabs">
          <button
            @click="activeTab = 'rules'"
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'rules'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
          >
            Rules
          </button>
          <button
            @click="activeTab = 'flow'"
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'flow'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
          >
            View Flow
          </button>
        </nav>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Rules Tab -->
        <div v-if="activeTab === 'rules'" class="p-6">
          <!-- Execution Context Info -->
          <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  This process runs automatically when conditions are met.
                </p>
                <div class="mt-2 flex items-center gap-4">
                  <button
                    @click="viewExecutions"
                    class="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View execution logs
                  </button>
                  <button
                    @click="testProcess"
                    class="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Test process
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Rule Cards -->
          <div class="space-y-4">
            <div
              v-for="(rule, index) in ruleCards"
              :key="rule.id"
              class="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-5 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <!-- WHEN -->
                  <div v-if="rule.when" class="mb-3">
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">When</span>
                    <p class="text-sm text-gray-900 dark:text-white mt-1">{{ rule.when }}</p>
                  </div>

                  <!-- IF -->
                  <div v-if="rule.if" class="mb-3">
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">If</span>
                    <p class="text-sm text-gray-900 dark:text-white mt-1">{{ rule.if }}</p>
                  </div>

                  <!-- THEN -->
                  <div>
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Then</span>
                    <ul class="mt-1 space-y-1">
                      <li v-for="(action, idx) in rule.then" :key="idx" class="text-sm text-gray-900 dark:text-white">
                        • {{ action }}
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Actions (Draft only) -->
                <div v-if="isEditable" class="flex items-center gap-2 shrink-0">
                  <button
                    @click="editRule(rule, index)"
                    class="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="index > 0"
                    @click="moveRule(index, 'up')"
                    class="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                    title="Move Up"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    v-if="index < ruleCards.length - 1"
                    @click="moveRule(index, 'down')"
                    class="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                    title="Move Down"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    @click="deleteRule(index)"
                    class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Add Rule Button (Draft only) -->
            <button
              v-if="isEditable"
              @click="showAddRuleMenu = true"
              class="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-brand-600 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <svg class="w-6 h-6 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Add another rule</span>
            </button>
          </div>
        </div>

        <!-- Flow Tab (Read-only) -->
        <div v-if="activeTab === 'flow'" class="p-6">
          <div class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              Flow visualization - To be implemented
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-500">
              This will show a read-only flow diagram of the process execution order.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div v-if="isEditable" class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          @click="handleClose"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <div class="flex items-center gap-3">
          <button
            @click="saveProcess"
            :disabled="saving"
            class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="saving">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </div>

      <!-- Add Rule Menu -->
      <div
        v-if="showAddRuleMenu"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50"
        @click.self="showAddRuleMenu = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Rule</h3>
          <div class="space-y-3">
            <button
              @click="addRule('field_rule')"
              class="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-600 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <div class="font-medium text-gray-900 dark:text-white">Control field behavior</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">Make fields mandatory, set defaults, or control visibility</div>
            </button>
            <button
              @click="addRule('ownership_rule')"
              class="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-600 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <div class="font-medium text-gray-900 dark:text-white">Control ownership & assignment</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">Assign or reassign record ownership</div>
            </button>
            <button
              @click="addRule('status_guard')"
              class="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-600 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <div class="font-medium text-gray-900 dark:text-white">Control status / stage transitions</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">Allow or block status changes</div>
            </button>
            <button
              @click="addRule('action')"
              class="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-600 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <div class="font-medium text-gray-900 dark:text-white">Run actions</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">Create tasks, send notifications, or other automated actions</div>
            </button>
          </div>
          <div class="mt-4 flex justify-end">
            <button
              @click="showAddRuleMenu = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Rule Side Panel -->
      <RuleEditPanel
        v-if="editingRule"
        :rule="editingRule"
        :process="process"
        @close="editingRule = null"
        @save="handleRuleSaved"
      />

      <!-- Process Test Modal -->
      <ProcessTestModal
        v-if="showTestModal"
        :process="processData"
        @close="showTestModal = false"
      />

      <!-- Execution Logs Modal -->
      <ProcessExecutionLogs
        v-if="showExecutionLogs"
        :process="processData"
        @close="showExecutionLogs = false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';
import RuleEditPanel from '@/components/admin/process/RuleEditPanel.vue';
import ProcessTestModal from '@/components/admin/ProcessTestModal.vue';
import ProcessExecutionLogs from '@/components/admin/ProcessExecutionLogs.vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';

const props = defineProps({
  process: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'saved']);

const router = useRouter();
const activeTab = ref('rules');
const saving = ref(false);
const error = ref(null);
const showAddRuleMenu = ref(false);
const editingRule = ref(null);
const showTestModal = ref(false);
const showExecutionLogs = ref(false);
const processData = ref(JSON.parse(JSON.stringify(props.process)));

const isEditable = computed(() => {
  return processData.value.status === 'draft';
});

// Convert Process nodes to human-readable rule cards
const ruleCards = computed(() => {
  const cards = [];
  const nodes = processData.value.nodes || [];
  const edges = processData.value.edges || [];
  
  // Build node map
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Find start node
  let currentNodeId = null;
  if (processData.value.trigger.type === 'domain_event') {
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (triggerNode) currentNodeId = triggerNode.id;
  } else {
    // Manual trigger - find first node
    currentNodeId = nodes[0]?.id || null;
  }

    // Build WHEN text (from trigger)
    const whenText = processData.value.trigger.type === 'manual'
      ? 'Manual trigger'
      : getEventTypeLabel(processData.value.trigger.eventType);

    // Get entity type from first node that has it, or default
    const getEntityType = () => {
      const fieldRuleNode = nodes.find(n => n.type === 'field_rule');
      if (fieldRuleNode?.config?.entityType) return fieldRuleNode.config.entityType;
      const ownershipNode = nodes.find(n => n.type === 'ownership_rule');
      if (ownershipNode?.config?.entityType) return ownershipNode.config.entityType;
      const statusGuardNode = nodes.find(n => n.type === 'status_guard');
      if (statusGuardNode?.config?.entityType) return statusGuardNode.config.entityType;
      return 'deal'; // Default
    };

    const entityType = getEntityType();

  // Traverse nodes and build cards
  const visited = new Set();
  let cardIndex = 0;

  while (currentNodeId && !visited.has(currentNodeId)) {
    visited.add(currentNodeId);
    const node = nodeMap.get(currentNodeId);
    if (!node) break;

    // Skip trigger and end nodes for card display
    if (node.type === 'trigger' || node.type === 'end') {
      // Move to next node
      const nextEdge = edges.find(e => e.fromNodeId === currentNodeId);
      currentNodeId = nextEdge?.toNodeId || null;
      continue;
    }

    const card = {
      id: node.id,
      index: cardIndex++,
      nodeType: node.type,
      when: cardIndex === 1 ? whenText : null, // Only show WHEN on first card
      if: null,
      then: []
    };

    // Build IF text (from condition node)
    if (node.type === 'condition') {
      const condition = node.config.condition || node.config;
      if (typeof condition === 'object') {
        if (condition.field && condition.operator) {
          const fieldName = condition.field.replace(/^(event\.|dataBag\.)/, '');
          card.if = `${fieldName} ${getOperatorLabel(condition.operator)} ${condition.value}`;
        } else if (condition.expression) {
          // Handle expression-based conditions
          card.if = condition.expression;
        }
      }
    }

    // Build THEN text based on node type
    if (node.type === 'field_rule') {
      const config = node.config;
      if (config.rule === 'mandatory') {
        card.then.push(`Make "${config.fieldKey}" mandatory`);
      } else if (config.rule === 'default') {
        card.then.push(`Set "${config.fieldKey}" default to "${config.value}"`);
      } else if (config.rule === 'visibility') {
        card.then.push(`${config.value ? 'Show' : 'Hide'} field "${config.fieldKey}"`);
      }
    } else if (node.type === 'ownership_rule') {
      const config = node.config;
      card.then.push(`Assign ownership to ${config.target} (${config.assignment})`);
    } else if (node.type === 'status_guard') {
      const config = node.config;
      const transition = config.allowedTransitions?.[0] || '';
      if (transition) {
        card.then.push(`Control ${config.field} transition: ${transition}`);
      }
    } else if (node.type === 'action') {
      const config = node.config;
      if (config.actionType === 'create_task') {
        card.then.push(`Create task: "${config.params?.title || 'Untitled'}"`);
      } else if (config.actionType === 'notify_user') {
        card.then.push(`Notify ${config.params?.recipient === 'owner' ? 'owner' : 'user'}`);
      } else if (config.actionType === 'start_process') {
        card.then.push(`Start process: ${config.params?.processId || 'Unknown'}`);
      }
    }

    // If no THEN actions and no IF condition, skip this card
    if (card.then.length === 0 && !card.if && node.type !== 'condition') {
      const nextEdge = edges.find(e => e.fromNodeId === currentNodeId);
      currentNodeId = nextEdge?.toNodeId || null;
      continue;
    }

    cards.push(card);

    // Move to next node
    const nextEdge = edges.find(e => e.fromNodeId === currentNodeId);
    currentNodeId = nextEdge?.toNodeId || null;
  }

  return cards;
});

const getEventTypeLabel = (eventType) => {
  const labels = {
    'people.lifecycle.changed': 'When a Person\'s lifecycle changes',
    'people.type.changed': 'When a Person\'s type changes',
    'organization.lifecycle.changed': 'When an Organization\'s lifecycle changes',
    'organization.type.changed': 'When an Organization\'s type changes',
    'deal.stage.changed': 'When a Deal\'s stage changes',
    'deal.pipeline.changed': 'When a Deal\'s pipeline changes',
    'deal.deal.won': 'When a Deal is won',
    'deal.deal.lost': 'When a Deal is lost'
  };
  return labels[eventType] || eventType;
};

const getOperatorLabel = (op) => {
  const labels = {
    equals: '=',
    not_equals: '≠',
    greater_than: '>',
    less_than: '<',
    contains: 'contains'
  };
  return labels[op] || op;
};

const editRule = (rule, index) => {
  // Find the corresponding node
  const node = processData.value.nodes.find(n => n.id === rule.id);
  if (node) {
    editingRule.value = {
      ...rule,
      node: node,
      index: index
    };
  }
};

const addRule = (ruleType) => {
  showAddRuleMenu = false;
  // Create a new rule node
  const newNodeId = `rule_${Date.now()}`;
  const newNode = {
    id: newNodeId,
    type: ruleType,
    config: getDefaultConfig(ruleType)
  };

  // Add node to process
  processData.value.nodes.push(newNode);

  // Add edge from last node to new node
  const lastNode = processData.value.nodes[processData.value.nodes.length - 2];
  if (lastNode) {
    processData.value.edges.push({
      fromNodeId: lastNode.id,
      toNodeId: newNodeId
    });
  }

  // Open edit panel
  editingRule.value = {
    id: newNodeId,
    index: ruleCards.value.length,
    nodeType: ruleType,
    node: newNode
  };
};

const getDefaultConfig = (ruleType) => {
  // Get entity type from existing nodes
  const getEntityType = () => {
    const fieldRuleNode = processData.value.nodes.find(n => n.type === 'field_rule');
    if (fieldRuleNode?.config?.entityType) return fieldRuleNode.config.entityType;
    const ownershipNode = processData.value.nodes.find(n => n.type === 'ownership_rule');
    if (ownershipNode?.config?.entityType) return ownershipNode.config.entityType;
    const statusGuardNode = processData.value.nodes.find(n => n.type === 'status_guard');
    if (statusGuardNode?.config?.entityType) return statusGuardNode.config.entityType;
    return 'deal'; // Default
  };

  const entityType = getEntityType();

  switch (ruleType) {
    case 'field_rule':
      return {
        entityType: entityType,
        fieldKey: '',
        rule: 'mandatory',
        value: ''
      };
    case 'ownership_rule':
      return {
        entityType: entityType,
        assignment: 'owner',
        target: ''
      };
    case 'status_guard':
      return {
        entityType: entityType,
        field: 'stage',
        allowedTransitions: []
      };
    case 'action':
      return {
        actionType: '',
        params: {}
      };
    default:
      return {};
  }
};

const moveRule = (index, direction) => {
  // This would require reordering nodes and edges
  // For now, show a message that this needs implementation
  alert('Rule reordering will be implemented in the next iteration');
};

const deleteRule = (index) => {
  if (!confirm('Are you sure you want to delete this rule?')) return;
  
  const rule = ruleCards.value[index];
  if (rule) {
    // Remove node and associated edges
    processData.value.nodes = processData.value.nodes.filter(n => n.id !== rule.id);
    processData.value.edges = processData.value.edges.filter(e => 
      e.fromNodeId !== rule.id && e.toNodeId !== rule.id
    );
  }
};

const handleRuleSaved = (updatedRule) => {
  // Update the node in processData
  const nodeIndex = processData.value.nodes.findIndex(n => n.id === updatedRule.id);
  if (nodeIndex !== -1) {
    processData.value.nodes[nodeIndex] = updatedRule.node;
  }
  editingRule.value = null;
};

const saveProcess = async () => {
  saving.value = true;
  error.value = null;

  try {
    const response = await apiClient.put(`/admin/processes/${processData.value._id}`, {
      name: processData.value.name,
      description: processData.value.description,
      nodes: processData.value.nodes,
      edges: processData.value.edges
    });

    if (response.success) {
      emit('saved', response.data);
      emit('close');
    } else {
      error.value = response.message || 'Failed to save process';
    }
  } catch (err) {
    error.value = err.message || 'Failed to save process';
    console.error('Error saving process:', err);
  } finally {
    saving.value = false;
  }
};

const duplicateAndEdit = async () => {
  try {
    const response = await apiClient.post(`/admin/processes/${processData.value._id}/duplicate`);
    if (response.success) {
      // Close current editor and reload processes list
      emit('close');
      // The parent component will handle opening the duplicated process
      emit('saved', response.data);
    }
  } catch (err) {
    alert(err.message || 'Failed to duplicate process');
  }
};

const viewExecutions = () => {
  // Emit event to parent to show execution logs
  showExecutionLogs.value = true;
};

const testProcess = () => {
  // Emit event to parent to show test modal
  showTestModal.value = true;
};

const handleClose = () => {
  if (isEditable.value && hasChanges()) {
    if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
  }
  emit('close');
};

const hasChanges = () => {
  // Simple check - compare JSON strings
  return JSON.stringify(processData.value) !== JSON.stringify(props.process);
};
</script>
