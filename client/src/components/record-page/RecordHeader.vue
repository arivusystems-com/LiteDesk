<template>
  <div class="record-header">
    <!-- Top bar: Breadcrumbs and page actions -->
    <div class="record-header__top flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
      <!-- Breadcrumbs (optional prev/next navigation + slot) -->
      <div v-if="$slots.breadcrumbs || showNavigation" class="record-header__breadcrumbs flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <template v-if="showNavigation">
          <div class="mr-1 inline-flex items-center gap-1">
            <button
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 transition-colors dark:border-gray-700 dark:text-gray-400"
              :class="canPrevious ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200' : 'opacity-40 cursor-not-allowed'"
              :disabled="!canPrevious"
              :aria-label="previousLabel"
              :title="shortcutPrev ? `${previousLabel} (${shortcutPrev})` : previousLabel"
              @click="$emit('previous')"
            >
              <ArrowLeftIcon class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 transition-colors dark:border-gray-700 dark:text-gray-400"
              :class="canNext ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200' : 'opacity-40 cursor-not-allowed'"
              :disabled="!canNext"
              :aria-label="nextLabel"
              :title="shortcutNext ? `${nextLabel} (${shortcutNext})` : nextLabel"
              @click="$emit('next')"
            >
              <ArrowRightIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
        <slot name="breadcrumbs" />
      </div>
      <!-- Page actions (right side) -->
      <div class="record-header__page-actions flex items-center gap-2">
        <slot name="pageActions" />
      </div>
    </div>
    
    <!-- Header actions (status, primary action, menu) - moved to top bar -->
    <div v-if="$slots.statusControl || $slots.primaryAction || $slots.actionsMenu" class="record-header__actions flex items-center gap-2 px-6 py-2 border-b border-gray-200 dark:border-gray-700">
      <slot name="statusControl" />
      <slot name="primaryAction" />
      <slot name="actionsMenu" />
    </div>
  </div>
</template>

<script setup>
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/vue/24/outline';

/**
 * RecordHeader – identity and primary control with breadcrumbs.
 *
 * Optional header navigation (prev/next record):
 * - showNavigation: show prev/next buttons before breadcrumbs
 * - canPrevious / canNext: enable/disable buttons
 * - previousLabel / nextLabel: aria and tooltip (e.g. "Previous task")
 * - shortcutPrev / shortcutNext: keyboard shortcut hint (e.g. "⌘+Left")
 * - Emits: previous, next
 *
 * Slots:
 * - #breadcrumbs: Breadcrumb navigation (e.g., Task • abc123)
 * - #pageActions: Top-right page actions
 * - #statusControl, #primaryAction, #actionsMenu
 */
defineProps({
  title: { type: String, default: '' },
  recordType: { type: String, default: '' },
  recordId: { type: String, default: '' },
  showTypeDropdown: { type: Boolean, default: false },
  showNavigation: { type: Boolean, default: false },
  canPrevious: { type: Boolean, default: false },
  canNext: { type: Boolean, default: false },
  previousLabel: { type: String, default: 'Previous' },
  nextLabel: { type: String, default: 'Next' },
  shortcutPrev: { type: String, default: '' },
  shortcutNext: { type: String, default: '' }
});

defineEmits(['previous', 'next']);
</script>
