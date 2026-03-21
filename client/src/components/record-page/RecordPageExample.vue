<template>
  <RecordPageLayout>
    <template #header>
      <RecordHeader
        title="Placeholder record"
        subtitle="ID-001"
      >
        <template #metaActions>
          <button type="button" class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Follow">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button type="button" class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Tag">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </button>
          <button type="button" class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Copy URL">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </template>
        <template #statusControl>
          <span class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Active</span>
        </template>
        <template #primaryAction>
          <button type="button" class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            Edit
          </button>
        </template>
        <template #actionsMenu>
          <div class="relative">
            <button
              type="button"
              class="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="More actions"
              @click="showActionsMenu = !showActionsMenu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <div
              v-if="showActionsMenu"
              class="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-xl py-1 bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 z-50"
            >
              <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                Duplicate
              </button>
              <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                Export
              </button>
              <hr class="my-1 border-gray-200 dark:border-gray-700" />
              <button class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                Delete
              </button>
            </div>
          </div>
        </template>
      </RecordHeader>
    </template>

    <template #left>
      <RecordStateSection
        heading="Key fields"
        :fields="exampleKeyFields"
        :field-values="exampleKeyFieldValues"
        :signals="['Signal A', 'Signal B']"
        next-action-hint="Next: Review and approve."
      />
      <RecordFieldsSection :groups="fieldGroups">
        <template #group-primary>
          <div class="text-sm text-gray-600 dark:text-gray-400">Field 1: placeholder</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Field 2: placeholder</div>
        </template>
        <template #group-secondary>
          <div class="text-sm text-gray-600 dark:text-gray-400">Field 3: placeholder</div>
        </template>
      </RecordFieldsSection>
      <RelatedRecordsSection :groups="relatedGroups">
        <template #group-deals>
          <a href="#" class="text-sm text-gray-700 dark:text-gray-300 hover:underline block">Deal A</a>
          <a href="#" class="text-sm text-gray-700 dark:text-gray-300 hover:underline block">Deal B</a>
        </template>
        <template #group-tasks>
          <a href="#" class="text-sm text-gray-700 dark:text-gray-300 hover:underline block">Task 1</a>
        </template>
      </RelatedRecordsSection>
    </template>

    <template #right>
      <RecordContextPanel
        :tabs="contextTabs"
        default-tab="comments"
      >
        <template #tab-comments>
          <div class="p-4">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Comments</h3>
            <div class="space-y-3">
              <div class="text-sm text-gray-600 dark:text-gray-400 italic">No comments yet.</div>
            </div>
          </div>
        </template>
        <template #tab-timeline>
          <div class="p-4">
            <RecordActivityTimeline
              :events="placeholderEvents"
              :allow-comments="true"
              :allow-attachments="true"
            >
              <template #event="{ event }">
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ event.type }}</span>
                <span v-if="event.createdAt" class="ml-2 text-xs text-gray-500">{{ event.createdAt }}</span>
              </template>
            </RecordActivityTimeline>
          </div>
        </template>
        <template #tab-related>
          <div class="p-4">
            <RelatedRecordsSection :groups="relatedGroups">
              <template #group-deals>
                <a href="#" class="text-sm text-gray-700 dark:text-gray-300 hover:underline block">Deal A</a>
                <a href="#" class="text-sm text-gray-700 dark:text-gray-300 hover:underline block">Deal B</a>
              </template>
              <template #group-tasks>
                <a href="#" class="text-sm text-gray-700 dark:text-gray-300 hover:underline block">Task 1</a>
              </template>
            </RelatedRecordsSection>
          </div>
        </template>
        <template #tab-integrations>
          <div class="p-4">
            <div class="text-sm text-gray-600 dark:text-gray-400 italic">No integrations configured.</div>
          </div>
        </template>
      </RecordContextPanel>
    </template>
  </RecordPageLayout>
</template>

<script setup>
/**
 * Example usage of record-page primitives with placeholder content only.
 * DO NOT add Task-specific or business logic here.
 */
import { ref } from 'vue';
import {
  RecordPageLayout,
  RecordHeader,
  RecordStateSection,
  RecordFieldsSection,
  RecordActivityTimeline,
  RelatedRecordsSection,
  RecordContextPanel
} from './index';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  LinkIcon,
  PuzzlePieceIcon
} from '@heroicons/vue/24/outline';

const fieldGroups = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' }
];

const relatedGroups = [
  { key: 'deals', label: 'Deals', count: 2 },
  { key: 'tasks', label: 'Tasks', count: 1 }
];

const showActionsMenu = ref(false);

const placeholderEvents = [
  { id: '1', type: 'comment', createdAt: '2025-01-28' },
  { id: '2', type: 'system', createdAt: '2025-01-27' }
];

const contextTabs = [
  {
    key: 'comments',
    label: 'Comments',
    icon: ChatBubbleLeftRightIcon
  },
  {
    key: 'timeline',
    label: 'Timeline',
    icon: ClockIcon
  },
  {
    key: 'related',
    label: 'Related Records',
    icon: LinkIcon
  },
  {
    key: 'integrations',
    label: 'Integrations',
    icon: PuzzlePieceIcon
  }
];

// Standardized key fields example (same contract as adapters)
const exampleKeyFields = [
  { key: 'status', label: 'Status', column: 'left' },
  { key: 'owner', label: 'Assignees', column: 'left' },
  { key: 'startDate', label: 'Start date', column: 'left' },
  { key: 'dueDate', label: 'Due date', column: 'right' },
  { key: 'priority', label: 'Priority', column: 'right' }
];
const exampleKeyFieldValues = {
  status: 'Open',
  owner: 'Placeholder User',
  startDate: '—',
  dueDate: '—',
  priority: 'Normal'
};
</script>
