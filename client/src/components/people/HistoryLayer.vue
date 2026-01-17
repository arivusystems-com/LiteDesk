<!--
  ============================================================================
  HISTORYLAYER CONTRACT
  ============================================================================
  
  HistoryLayer is for verification only:
  - Displays immutable audit stream (Activity Timeline)
  - No prioritization logic (all activities shown equally)
  - No signals or alerts (use MomentumLayer for that)
  - Collapsed by default (user expands to view)
  - No primary actions (view-only)
  
  Purpose: Answer "What happened?" through verification, not action.
  
  GUARDRAILS:
  - Do NOT add signal derivation or alert logic
  - Do NOT add prioritization or filtering
  - Do NOT add primary action buttons
  - Do NOT add status change controls
  - Keep collapsed by default (expand on demand)
  
  Note: ActivityTimeline component handles its own loading and error states.
  ============================================================================
-->

<template>
  <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">History</span>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Activity Timeline
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Complete chronological history — what happened, when, and in which app
          </p>
        </div>
        
        <!-- Quick Actions Menu -->
        <SecondaryActionMenu
          :actions="quickActions"
          @action="handleQuickAction"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="px-6 py-4">
      <ActivityTimeline
        entityType="Person"
        :entityId="personId"
        :appKey="appKey"
      />
    </div>
  </div>
</template>

<script setup>
import ActivityTimeline from '@/components/ActivityTimeline.vue';
import SecondaryActionMenu from '@/components/ui/SecondaryActionMenu.vue';
import { computed } from 'vue';

const props = defineProps({
  personId: {
    type: String,
    required: true
  },
  appContext: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['create-task', 'schedule-meeting', 'add-note']);

const appKey = computed(() => {
  return props.appContext?.appKey || 'SALES';
});

// Quick Actions for HistoryLayer
const quickActions = computed(() => {
  return [
    {
      label: 'Create task',
      icon: null,
      handler: () => emit('create-task', props.personId),
      disabled: false
    },
    {
      label: 'Schedule meeting',
      icon: null,
      handler: () => emit('schedule-meeting', props.personId),
      disabled: false
    },
    {
      label: 'Add note',
      icon: null,
      handler: () => emit('add-note', props.personId),
      disabled: false
    }
  ];
});

const handleQuickAction = (action) => {
  // Action handler is already called by SecondaryActionMenu
};
</script>

