<template>
  <section class="record-fields-section space-y-6" aria-labelledby="record-fields-heading">
    <h2 id="record-fields-heading" class="sr-only">Record fields</h2>
    <AccordionSection
      v-if="collapsible"
      :title="accordionTitle || 'Core Fields'"
      :storage-key="storageKey"
      :default-open="defaultOpen"
      content-class=""
    >
      <template #actions>
        <!--
        Future use: Core Fields header action buttons (Search / Expand / Resize / Add)
        <div v-if="listLayout" class="record-fields-section__header-actions flex items-center gap-1 text-gray-400 dark:text-gray-500">
          <button type="button" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Search">
            <MagnifyingGlassIcon class="w-4 h-4" />
          </button>
          <button type="button" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Expand">
            <ArrowsPointingOutIcon class="w-4 h-4" />
          </button>
          <button type="button" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Resize">
            <Squares2X2Icon class="w-4 h-4" />
          </button>
          <button type="button" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Add">
            <PlusIcon class="w-4 h-4" />
          </button>
        </div>
        -->
      </template>
      <!-- List layout: single list for all groups -->
      <div
        v-if="listLayout"
        :class="[
          'record-fields-section__fields record-fields-section__fields--list flex flex-col overflow-hidden divide-y divide-gray-100 dark:divide-gray-800',
          boxed
            ? 'border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900'
            : ''
        ]"
      >
        <template v-for="(group, index) in groups" :key="group.key ?? index">
          <slot :name="slotNameForGroup(group, index)" :group="group" />
        </template>
      </div>
      <!-- Grid layout: one block per group -->
      <template v-else>
        <div
          v-for="(group, index) in groups"
          :key="group.key ?? index"
          class="record-fields-section__group"
        >
          <h3 v-if="group.label" class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{{ group.label }}</h3>
          <div class="record-fields-section__fields grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <slot :name="slotNameForGroup(group, index)" :group="group" />
          </div>
        </div>
      </template>
    </AccordionSection>
    <div v-else>
      <div
        v-if="listLayout"
        :class="[
          'record-fields-section__fields record-fields-section__fields--list flex flex-col overflow-hidden divide-y divide-gray-100 dark:divide-gray-800',
          boxed
            ? 'border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900'
            : ''
        ]"
      >
        <template v-for="(group, index) in groups" :key="group.key ?? index">
          <slot :name="slotNameForGroup(group, index)" :group="group" />
        </template>
      </div>
      <template v-else>
        <div
          v-for="(group, index) in groups"
          :key="group.key ?? index"
          class="record-fields-section__group"
        >
          <h3 v-if="group.label" class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{{ group.label }}</h3>
          <div class="record-fields-section__fields grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <slot :name="slotNameForGroup(group, index)" :group="group" />
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import AccordionSection from './AccordionSection.vue';
import {
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  Squares2X2Icon,
  PlusIcon
} from '@heroicons/vue/24/outline';

/**
 * RecordFieldsSection – grouped, inline-editable fields.
 * When listLayout is true, renders a single-column list with row dividers and header action icons (Core Fields style).
 * Field rendering is delegated to parent via slots: group-{key} or group-0, group-1, …
 */
defineProps({
  groups: {
    type: Array,
    required: true,
    validator: (g) => Array.isArray(g) && g.every((i) => i && typeof i.label === 'string')
  },
  collapsible: {
    type: Boolean,
    default: false
  },
  accordionTitle: {
    type: String,
    default: 'Core Fields'
  },
  storageKey: {
    type: String,
    default: 'record-fields-section-state'
  },
  defaultOpen: {
    type: Boolean,
    default: true
  },
  /** When true, use single-column list with dividers and header actions (Core Fields style) */
  listLayout: {
    type: Boolean,
    default: false
  },
  boxed: {
    type: Boolean,
    default: true
  }
});

function slotNameForGroup(group, index) {
  return group.key ? `group-${group.key}` : `group-${index}`;
}
</script>

<style scoped>
</style>
