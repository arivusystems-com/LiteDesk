<template>
  <div class="record-header">
    <!-- Top bar: Breadcrumbs and page actions -->
    <div class="record-header__top flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
      <!-- Breadcrumbs -->
      <div v-if="$slots.breadcrumbs" class="record-header__breadcrumbs flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
import { ChevronDownIcon } from '@heroicons/vue/24/outline';

/**
 * RecordHeader – identity and primary control with breadcrumbs.
 * 
 * Slots:
 * - #breadcrumbs: Breadcrumb navigation (e.g., Team Space / Projects / Project 1)
 * - #pageActions: Top-right page actions (tag, copy URL, ellipsis, star, checkmark, close on mobile)
 * - #recordType: Record type badge with dropdown (e.g., "Task" with ID)
 * - #title: Record title (large, prominent)
 * - #statusControl: Status dropdown/badge
 * - #primaryAction: Primary action button
 * - #actionsMenu: Overflow menu (Duplicate, Delete, etc.)
 * 
 * Layout:
 * Top bar: Breadcrumbs | Page Actions
 * Main: Record Type Badge + ID | Title | Status + Actions
 * 
 * Rules:
 * - Clean, intuitive layout matching reference design
 * - All behavior controlled by parent via slots
 * - No business logic, no hardcoded actions
 */
defineProps({
  title: { type: String, default: '' },
  recordType: { type: String, default: '' },
  recordId: { type: String, default: '' },
  showTypeDropdown: { type: Boolean, default: false }
});
</script>
