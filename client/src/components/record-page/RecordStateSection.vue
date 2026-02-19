<template>
  <section class="record-state-section mb-8 mt-4" aria-labelledby="record-state-heading">
    <h2 id="record-state-heading" class="sr-only">{{ heading }}</h2>
    <div v-if="hasConfiguredFields" class="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-2">
      <div class="space-y-1">
        <div
          v-for="field in leftFields"
          :key="field.key"
          class="record-state-section__row flex items-center gap-x-6"
        >
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="field.icon"
              :is="field.icon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ field.label }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot :name="field.slotKey || field.key">
              <span
                v-if="getFieldValue(field) != null && getFieldValue(field) !== ''"
                class="block w-full text-sm text-gray-900 dark:text-white"
              >
                {{ getFieldValue(field) }}
              </span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
      </div>

      <div class="space-y-1">
        <div
          v-for="field in rightFields"
          :key="field.key"
          class="record-state-section__row flex items-center gap-x-6"
        >
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="field.icon"
              :is="field.icon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ field.label }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot :name="field.slotKey || field.key">
              <span
                v-if="getFieldValue(field) != null && getFieldValue(field) !== ''"
                class="block w-full text-sm text-gray-900 dark:text-white"
              >
                {{ getFieldValue(field) }}
              </span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="enableLegacyFallback" class="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-2">
      <div class="space-y-2">
        <div class="record-state-section__row flex items-center gap-x-6">
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="statusIcon"
              :is="statusIcon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Status</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot name="status">
              <span v-if="status != null && status !== ''" class="block w-full text-sm text-gray-900 dark:text-white">{{ status }}</span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
        <div class="record-state-section__row flex items-center gap-x-6">
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="dateIcon"
              :is="dateIcon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Start date</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot name="startDate">
              <span v-if="startDate != null && startDate !== ''" class="block w-full text-sm text-gray-900 dark:text-white">{{ startDate }}</span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
        <div class="record-state-section__row flex items-center gap-x-6">
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="dateIcon"
              :is="dateIcon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Due date</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot name="dueDate">
              <span v-if="dueDate != null && dueDate !== ''" class="block w-full text-sm text-gray-900 dark:text-white">{{ dueDate }}</span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
        <div class="record-state-section__row flex items-center gap-x-6">
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="timeIcon"
              :is="timeIcon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Time estimate</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot name="timeEstimate">
              <span v-if="timeEstimate != null && timeEstimate !== ''" class="block w-full text-sm text-gray-900 dark:text-white">{{ timeEstimate }}</span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="record-state-section__row flex items-center gap-x-6">
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="ownerIcon"
              :is="ownerIcon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Assignees</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot name="owner">
              <span v-if="owner != null && owner !== ''" class="block w-full text-sm text-gray-900 dark:text-white">{{ owner }}</span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
        <div class="record-state-section__row flex items-center gap-x-6">
          <div class="flex items-center gap-2 min-w-[140px]">
            <component
              v-if="priorityIcon"
              :is="priorityIcon"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Priority</span>
          </div>
          <div class="flex-1 min-w-0">
            <slot name="priority">
              <span v-if="priority != null && priority !== ''" class="block w-full text-sm text-gray-900 dark:text-white">{{ priority }}</span>
              <span v-else class="block w-full text-sm text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Signals and hints below the grid -->
    <div v-if="signals && signals.length > 0" class="record-state-section__signals flex flex-wrap gap-1.5 mt-4">
      <span
        v-for="(signal, i) in signals"
        :key="i"
        class="inline-block text-xs text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700"
      >
        {{ signal }}
      </span>
    </div>
    <div v-if="nextActionHint != null && nextActionHint !== ''" class="record-state-section__hint text-sm text-gray-600 dark:text-gray-300 italic mt-2">
      {{ nextActionHint }}
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

/**
 * RecordStateSection – current state and signals in two-column layout.
 * Matches reference design with icons, labels, and values.
 * Read-first. Not a card. Clean, intuitive layout.
 */
const props = defineProps({
  heading: { type: String, default: 'Record state' },
  fields: { type: Array, default: () => [] },
  fieldValues: { type: Object, default: () => ({}) },
  enableLegacyFallback: { type: Boolean, default: true },
  status: { type: String, default: null },
  owner: { type: String, default: null },
  startDate: { type: String, default: null },
  dueDate: { type: String, default: null },
  priority: { type: String, default: null },
  timeEstimate: { type: String, default: null },
  signals: { type: Array, default: () => [] },
  nextActionHint: { type: String, default: null },
  statusIcon: { type: [Object, Function], default: null },
  dateIcon: { type: [Object, Function], default: null },
  timeIcon: { type: [Object, Function], default: null },
  ownerIcon: { type: [Object, Function], default: null },
  priorityIcon: { type: [Object, Function], default: null }
});

const hasConfiguredFields = computed(() => Array.isArray(props.fields) && props.fields.length > 0);

const leftFields = computed(() => {
  if (!hasConfiguredFields.value) return [];
  const explicitlyLeft = props.fields.filter(field => field?.column === 'left');
  if (explicitlyLeft.length > 0) return explicitlyLeft;
  return props.fields.filter((_, index) => index % 2 === 0);
});

const rightFields = computed(() => {
  if (!hasConfiguredFields.value) return [];
  const explicitlyRight = props.fields.filter(field => field?.column === 'right');
  if (explicitlyRight.length > 0) return explicitlyRight;
  return props.fields.filter((_, index) => index % 2 === 1);
});

const getFieldValue = (field) => {
  if (!field) return null;
  const valueKey = field.valueKey || field.key;
  const raw = props.fieldValues?.[valueKey] ?? null;
  if (raw == null || raw === '') return raw;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(raw.trim())) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const isDateTime = raw.includes('T');
      return isDateTime
        ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return raw;
};
</script>

<style scoped>
.record-state-section__row {
  min-height: 2.5rem;
}
</style>
