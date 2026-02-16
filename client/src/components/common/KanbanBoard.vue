<template>
  <div class="kanban-board bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden">
    <div class="overflow-x-auto pb-6">
      <!-- Group control (optional) -->
      <div v-if="$slots['group-control']" class="flex items-center gap-3 mb-5">
        <slot name="group-control" :stages="stages" />
      </div>

      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="text-gray-500 dark:text-gray-400">{{ loadingLabel }}</div>
      </div>
      <div v-else class="flex gap-5 items-start">
        <div
          v-for="(stage, idx) in stages"
          :key="stage"
          class="kanban-column flex-none rounded-xl flex flex-col shadow-sm border border-gray-100 dark:border-gray-700/80 overflow-hidden"
          :style="{ ...getColumnBgStyle(stage), width: columnWidthPx, minWidth: columnWidthPx, maxWidth: columnWidthPx }"
          :class="!getStageColor(stage) && 'bg-white dark:bg-gray-800/80'"
          :data-stage="stage"
          :data-stage-index="idx"
        >
          <!-- Pill-shaped column header (uses picklist color when available) -->
          <div
            class="px-4 py-3 flex items-center justify-between gap-2 shrink-0"
            :style="getStageColor(stage) ? { backgroundColor: getStageColor(stage) } : {}"
            :class="!getStageColor(stage) && 'bg-gray-100 dark:bg-gray-700/80'"
          >
            <slot
              name="column-header"
              :stage="stage"
              :count="(columnLists[stage] || []).length"
              :stats="getColumnStats ? getColumnStats(stage) : undefined"
              :stage-color="getStageColor(stage)"
              :is-first="idx === 0"
              :is-last="idx === stages.length - 1"
            >
              <div
                :class="[
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-full min-w-0',
                  getStageColor(stage) ? 'bg-white/20 text-white' : 'bg-white/80 dark:bg-gray-600/80 text-gray-700 dark:text-gray-200'
                ]"
              >
                <span class="font-semibold text-sm truncate">{{ stage }}</span>
                <span
                  :class="[
                    'flex-shrink-0 text-xs font-bold tabular-nums',
                    getStageColor(stage) ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'
                  ]"
                >
                  {{ (columnLists[stage] || []).length }}
                </span>
              </div>
            </slot>
          </div>

          <!-- Droppable list (grows with content, scrolls when tall) -->
          <div
            class="p-3 overflow-y-auto flex flex-col max-h-[calc(100vh-380px)]"
            :style="getColumnBgStyle(stage)"
            :class="!getStageColor(stage) && 'bg-white dark:bg-gray-800/50'"
          >
            <draggable
              :list="columnLists[stage]"
              :item-key="itemIdKey"
              :group="{ name: groupName, pull: true, put: true }"
              class="kanban-column-list flex flex-col gap-3"
              ghost-class="kanban-ghost"
              drag-class="kanban-drag"
              chosen-class="kanban-chosen"
              @change="(evt) => onListChange(evt, stage)"
            >
              <template #item="{ element }">
                <div
                  class="kanban-card min-w-0 bg-white dark:bg-gray-900 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700/80 cursor-grab hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 active:cursor-grabbing"
                  :data-id="element[itemIdKey]"
                  @click="(e) => $emit('card-click', { item: element, event: e })"
                >
                  <slot name="card" :item="element" :stage="stage">
                    {{ element[itemIdKey] }}
                  </slot>
                </div>
              </template>
              <template #footer>
                <div v-if="(columnLists[stage] || []).length === 0 && !$slots['add-item']" class="flex-1 flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 pointer-events-none">
                  <slot name="empty" :stage="stage">
                    <p class="text-sm">No items</p>
                  </slot>
                </div>
                <div v-if="$slots['add-item']" class="shrink-0">
                  <slot name="add-item" :stage="stage" :count="(columnLists[stage] || []).length" :is-empty="(columnLists[stage] || []).length === 0" :stage-color="getStageColor(stage)" />
                </div>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  /** Full list of items (records) */
  items: { type: Array, default: () => [] },
  /** Ordered list of stage/column ids (e.g. ['Qualification', 'Proposal', ...]) */
  stages: { type: Array, required: true },
  /** Field on each item that holds the stage (e.g. 'stage', 'status') */
  stageKey: { type: String, required: true },
  /** Field on each item for unique id (e.g. '_id') */
  itemIdKey: { type: String, default: '_id' },
  loading: { type: Boolean, default: false },
  loadingLabel: { type: String, default: 'Loading...' },
  /** Optional: return stats for column header (e.g. { value: 12345 }) */
  getColumnStats: { type: Function, default: null },
  /** Unique group name when multiple boards on page */
  groupName: { type: String, default: 'kanban' },
  /** Optional: (stage) => color string (hex) or null. When provided, column header uses this background color from picklist. */
  getStageColor: { type: Function, default: () => null },
  /** Card size from Customize Kanban: 'small' | 'medium' | 'large' */
  cardSize: { type: String, default: 'medium' },
});

const emit = defineEmits(['update', 'card-click']);

// Card size controls column width only (not card padding). Default: medium.
const columnWidthPx = computed(() => {
  const s = props.cardSize || 'medium';
  if (s === 'small') return '280px';
  if (s === 'large') return '360px';
  return '320px'; // medium
});

function getStageColor(stage) {
  return props.getStageColor ? props.getStageColor(stage) : null;
}

function hexToRgba(hex, alpha) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getColumnBgStyle(stage) {
  const color = getStageColor(stage);
  if (!color) return {};
  return { backgroundColor: hexToRgba(color, 0.03) };
}

// Per-column arrays; mutated by draggable. Synced from props.items.
function syncFromItems() {
  const stages = props.stages || [];
  const items = props.items || [];
  const stageKey = props.stageKey;
  const next = {};
  for (const s of stages) {
    next[s] = items.filter((i) => i[stageKey] === s).slice();
  }
  return next;
}

const columnLists = ref(syncFromItems());

onMounted(() => {
  columnLists.value = syncFromItems();
});
// Sync when items reference or stages/stageKey change (not on deep item changes, so drag doesn’t overwrite lists)
watch(
  () => [props.items, props.stages, props.stageKey],
  () => { columnLists.value = syncFromItems(); },
  { deep: false }
);

function onListChange(evt, stage) {
  if (evt.added) {
    const item = evt.added.element;
    const newIndex = evt.added.newIndex;
    const previousStage = item[props.stageKey];
    item[props.stageKey] = stage;
    emit('update', {
      item,
      previousStage,
      newStage: stage,
      newIndex,
      previousIndex: evt.removed?.oldIndex,
    });
  } else if (evt.moved) {
    const item = evt.moved.element;
    emit('update', {
      item,
      previousStage: stage,
      newStage: stage,
      newIndex: evt.moved.newIndex,
      previousIndex: evt.moved.oldIndex,
    });
  }
}
</script>

<style scoped>
.kanban-ghost {
  opacity: 0.5;
  background: rgb(219 234 254); /* blue-100 */
  transform: rotate(1deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
:global(.dark) .kanban-ghost {
  background: rgb(30 58 138); /* blue-900 */
}
.kanban-drag {
  opacity: 1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.kanban-chosen {
  cursor: grabbing;
}
</style>
