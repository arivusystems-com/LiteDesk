<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <!--
      ============================================================================
      INBOX SURFACE
      ============================================================================
      
      Inbox is an attention surface, not a task manager or calendar.
      - Shows only attention-worthy items requiring user action
      - Tasks and Events appear in unified list (coherent experience)
      - No filters, tabs, or pagination (v1) - keeps it calm
      - No edit forms - navigation to owning surface for actions
      
      See docs/architecture/inbox-surface-invariants.md for UX principles.
      See docs/architecture/inbox-aggregation.md for aggregation rules.
      See client/src/types/inboxItem.types.ts for type definitions.
      
      ============================================================================
    -->

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Inbox
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Things that need your attention right now
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <p class="text-sm text-red-800 dark:text-red-200">
        {{ error }}
      </p>
    </div>

    <!-- Empty State -->
    <!--
      Empty state microcopy:
      - Primary message: Positive, supportive ("You're all caught up")
      - Secondary helper: Explains Inbox behavior without urgency shaming
      - No CTAs or creation prompts (keeps it calm)
    -->
    <div v-else-if="items.length === 0" class="text-center py-16">
      <div class="max-w-md mx-auto">
        <CheckCircleIcon class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          You're all caught up
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Inbox shows tasks and events only when action is needed.
        </p>
      </div>
    </div>

    <!-- List -->
    <!--
      List layout: Calm, breathable, no card borders
      - Subtle dividers between items (very low contrast)
      - Generous vertical spacing (let whitespace do the work)
      - Consistent spacing regardless of item type
      - No card borders, no boxed sections
      - Hover uses subtle background, not borders
    -->
    <div v-else>
      <!--
        Single vertical list - no grouping tabs.
        Items are pre-sorted by backend (urgency tiers).
        UI just renders what backend provides - no client-side filtering.
        
        Visual hierarchy: Title > Attention label > Time > Context
        - Title: Strongest visual element (largest, boldest)
        - Attention label: Directly under title, smaller, muted
        - Time: Trailing/right-aligned, muted
        - Context: Tertiary text, smallest
      -->
      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="group relative py-5 px-1 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:outline-none rounded focus-within:bg-gray-50 dark:focus-within:bg-gray-700/30"
        :class="{
          'border-b border-gray-100 dark:border-gray-800': index < items.length - 1
        }"
        role="button"
        tabindex="0"
        @click="handleItemClick(item)"
        @keydown.enter="handleItemClick(item)"
        @keydown.space.prevent="handleItemClick(item)"
      >
        <div class="flex items-start gap-4">
          <!-- Checkbox (Tasks only) -->
          <!--
            Checkbox is clearly separate from row click.
            - Has its own click handler with @click.stop
            - Has its own cursor style (cursor-pointer)
            - Keyboard accessible (native checkbox behavior)
            - Focus state visible (focus:ring-2)
          -->
          <!--
            Checkbox (Tasks only)
            
            Interaction design:
            - Clicking checkbox completes task (does NOT navigate)
            - Checkbox has @click.stop to prevent row navigation
            - Checkbox uses @change for both mouse and keyboard interaction
            - Keyboard accessible (native checkbox behavior + focus ring)
            - ARIA label for screen readers
          -->
          <div
            v-if="item.kind === 'task' && item.allowComplete"
            class="flex-shrink-0 pt-0.5"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="false"
              :aria-label="`Complete task: ${item.title}`"
              class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
              @change.stop="handleTaskComplete(item)"
              @click.stop
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <!-- Title (Strongest visual element) -->
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
              {{ item.title }}
            </h3>

            <!-- Attention Label (Directly under title, smaller, muted) -->
            <!--
              Attention labels come from backend and are human-readable.
              Examples: "Overdue", "Due today", "Needs review", "Approval required"
              If overdue, use subtle danger color for attentionLabel only (not entire row).
            -->
            <p
              :class="[
                'text-sm mb-3',
                item.isOverdue
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              ]"
            >
              {{ item.attentionLabel }}
            </p>

            <!-- Metadata Row (Time + Context) -->
            <div class="flex items-center justify-between gap-4">
              <!-- Context Hint (Tertiary text, left-aligned) -->
              <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span>{{ item.sourceApp }}</span>
                <span>·</span>
                <span>{{ item.organizationLabel }}</span>
                <span v-if="item.relatedLabel" class="text-gray-400 dark:text-gray-500">
                  · {{ item.relatedLabel }}
                </span>
              </div>

              <!-- Time Indicator (Muted, trailing/right-aligned) -->
              <div v-if="item.dueAt" class="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {{ formatTime(item.dueAt, item.isOverdue) }}
              </div>
            </div>
          </div>

          <!-- Event Badge (Events only, top-right) -->
          <div v-if="item.kind === 'event'" class="flex-shrink-0">
            <BadgeCell
              :value="getEventAttentionBadgeLabel(getEventAttentionType(item))"
              :variant="getEventAttentionBadgeVariant(getEventAttentionType(item))"
            />
          </div>

          <!-- Arrow Indicator (Hidden until hover) -->
          <div class="flex-shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRightIcon class="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ============================================================================
 * INBOX SURFACE COMPONENT
 * ============================================================================
 * 
 * Renders a calm, unified attention list using InboxItem[].
 * 
 * IMPORTANT: This component does NOT filter or transform items.
 * - Backend provides ready-to-render InboxItem[]
 * - UI only handles presentation
 * - No business logic in UI
 * 
 * ============================================================================
 */

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';
import BadgeCell from '@/components/common/table/BadgeCell.vue';
import {
  CheckCircleIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline';
// Type checking: Use item.kind === 'task' for type-safe branching (discriminated union)

const router = useRouter();

// State
const loading = ref(true);
const error = ref(null);
const items = ref([]);

/**
 * Fetch inbox items from backend
 * 
 * Backend returns ready-to-render InboxItem[].
 * No client-side filtering or transformation needed.
 */
const fetchInboxItems = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient('/inbox', {
      method: 'GET'
    });

    if (response.success) {
      items.value = response.data || [];
    } else {
      // Error message: Calm, factual, not shaming
      error.value = 'Unable to load inbox items';
      items.value = [];
    }
  } catch (err) {
    console.error('[Inbox] Error fetching items:', err);
    // Error message: Calm, factual, not shaming
    error.value = 'Unable to load inbox items';
    items.value = [];
  } finally {
    loading.value = false;
  }
};

/**
 * Handle item click - navigate to owning surface
 * 
 * Uses routeTarget from InboxItem (pre-computed by backend).
 * No need to construct routes client-side.
 * 
 * IMPORTANT: This is called when clicking anywhere on the row EXCEPT the checkbox.
 * Checkbox has its own handler with @click.stop to prevent event bubbling.
 */
const handleItemClick = (item) => {
  if (item.routeTarget) {
    router.push(item.routeTarget);
  }
};

/**
 * Handle task completion
 * 
 * Tasks can be completed directly from Inbox.
 * Uses completeAction from InboxItem (pre-computed by backend).
 * 
 * IMPORTANT: This handler is separate from row click.
 * - Checkbox has @click.stop to prevent row navigation
 * - Checkbox has @keydown.stop to prevent keyboard navigation
 * - Only completes task, does not navigate
 */
const handleTaskComplete = async (item) => {
  // Type guard: Only tasks can be completed
  if (item.kind !== 'task' || !item.allowComplete) {
    return;
  }

  try {
    // If completeAction is an API endpoint, call it
    if (item.completeAction.startsWith('/api/')) {
      await apiClient(item.completeAction, {
        method: 'POST'
      });
      
      // Refresh inbox after completion
      await fetchInboxItems();
    } else {
      // If it's a route, navigate to it
      router.push(item.completeAction);
    }
  } catch (err) {
    console.error('[Inbox] Error completing task:', err);
    // Error message: Calm, factual, not shaming
    error.value = 'Unable to complete task';
  }
};

/**
 * Format time indicator
 * 
 * Shows relative time in human-readable format.
 * Examples: "in 2 hours", "in 3 days", "2 hours ago"
 * Overdue items show "overdue" (calm, factual, not shaming).
 * 
 * IMPORTANT: Keep language calm and factual.
 * Avoid urgency shaming or aggressive language.
 */
const formatTime = (dueAt, isOverdue) => {
  if (isOverdue) {
    return 'overdue';
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  if (diffHours < 0) {
    const absHours = Math.abs(diffHours);
    return `${absHours} hour${absHours !== 1 ? 's' : ''} ago`;
  }

  return 'soon';
};

/**
 * Get event attention type safely
 * 
 * Extracts eventAttentionType from InboxEventItem.
 */
const getEventAttentionType = (item) => {
  if (item.kind === 'event' && 'eventAttentionType' in item) {
    return item.eventAttentionType;
  }
  return null;
};

/**
 * Get event attention badge label
 * 
 * Maps eventAttentionType to human-readable label.
 * 
 * IMPORTANT: Labels must be human-readable, not system language.
 * Examples: "Needs Review", "Approval Required", "Starting Soon"
 * Avoid: Raw statuses, technical terms, urgency shaming.
 */
const getEventAttentionBadgeLabel = (attentionType) => {
  if (!attentionType) return 'Action Required';
  const labels = {
    'start': 'Starting Soon',
    'review': 'Needs Review',
    'corrective': 'Corrective Actions',
    'approval': 'Approval Required'
  };
  return labels[attentionType] || 'Action Required';
};

/**
 * Get event attention badge variant
 * 
 * Maps eventAttentionType to badge color variant.
 */
const getEventAttentionBadgeVariant = (attentionType) => {
  if (!attentionType) return 'default';
  const variants = {
    'start': 'info',
    'review': 'warning',
    'corrective': 'danger',
    'approval': 'primary'
  };
  return variants[attentionType] || 'default';
};

// Fetch items on mount
onMounted(() => {
  fetchInboxItems();
});
</script>

<style scoped>
/**
 * ============================================================================
 * STYLING NOTES
 * ============================================================================
 * 
 * Visual hierarchy (top to bottom):
 * 1. Title - Strongest visual element (text-lg, font-semibold)
 * 2. Attention label - Directly under title, smaller, muted (text-sm)
 *    - Overdue items: Subtle danger color (red-600) for attentionLabel only
 *    - Do NOT color entire row
 * 3. Metadata row:
 *    - Context hint (left): Tertiary text (text-xs, gray-400)
 *    - Time indicator (right): Muted, trailing (text-xs, gray-400)
 * 
 * Spacing:
 * - Generous vertical padding (py-5) between items
 * - Consistent horizontal padding (px-1) for content
 * - Consistent gaps (gap-4) between elements within items
 * - Subtle dividers (very low contrast border-b) between items
 * 
 * Interaction design:
 * - Hover: Subtle background highlight (hover:bg-gray-50 dark:hover:bg-gray-700/30)
 * - Focus: Visible ring (focus-within:ring-2 focus-within:ring-indigo-500)
 * - Cursor: Pointer for entire row (cursor-pointer)
 * - Checkbox: Separate interaction (cursor-pointer, @click.stop)
 * 
 * Accessibility:
 * - Keyboard navigation: Tab to focus, Enter/Space to activate
 * - Focus state: Visible ring (focus-within:ring-2)
 * - Checkbox: Keyboard accessible (native checkbox behavior)
 * - ARIA labels: Checkbox has aria-label for screen readers
 * 
 * Visual style: Calm, breathable layout
 * - No card borders (removed border, rounded-lg)
 * - No boxed sections (flat list design)
 * - Subtle dividers (border-gray-100 dark:border-gray-800, very low contrast)
 * - Let whitespace do the work (generous py-5 spacing)
 * - Muted metadata (reduced font size and contrast)
 * - Clear hierarchy (title → attention → time → context)
 * - Hover uses subtle background, not borders
 * - Avoid icon overload (no ClockIcon, minimal icons)
 * - Inbox feels breathable even with many items
 * 
 * Interaction rules:
 * - No hidden actions (all interactions are obvious)
 * - No secondary hover menus (single click action)
 * - Checkbox clearly separate from row click
 * - Interaction obvious at first glance
 * 
 * No dense tables, no overwhelming information.
 * Each item is scannable in under 3 seconds.
 * 
 * ============================================================================
 */
</style>
