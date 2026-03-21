<template>
  <section v-if="fields.length" class="details-section space-y-2">
    <h3 v-if="!hideHeader" class="text-base font-semibold text-gray-900 dark:text-white">Details</h3>
    <div class="border-y border-x-0 border-gray-200/70 dark:border-gray-700/70 divide-y divide-gray-200/70 dark:divide-gray-700/70">
      <template
        v-for="field in visibleFields"
        :key="field.key"
      >
        <!-- Related record link + optional inline listbox: hover → primary; click value → open record. Inline edit via dropdown, never edit drawer. -->
        <div
          v-if="field.recordPath && typeof context.openTab === 'function'"
          class="flex items-center gap-3 py-2 px-4 min-h-[2rem]"
        >
          <span class="flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true">
            <component :is="getFieldIcon(field)" class="w-4 h-4" />
          </span>
          <span class="text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[12rem]">{{ field.label }}</span>

          <Listbox
            v-if="field.options?.length && field.canEdit && typeof field.onSave === 'function'"
            as="div"
            :model-value="getRecordPathFieldSelectedId(field)"
            @update:model-value="(v) => field.onSave(v)"
            class="flex-1 min-w-0"
          >
            <div class="relative w-full">
              <ListboxButton
                class="flex items-center gap-2 w-full min-h-8 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 transition-colors focus:outline-none focus:ring-0"
              >
                <span
                  v-if="field.displayValue"
                  class="text-sm min-w-0 flex-1 truncate text-gray-900 dark:text-white transition-colors hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <span
                    role="button"
                    tabindex="0"
                    class="text-sm inline cursor-pointer"
                    @click.stop="(e) => { if (field.recordPath && context.openTab) { e.stopPropagation(); context.openTab(field.recordPath, { background: false, insertAdjacent: true }); } }"
                  >
                    {{ field.displayValue }}
                  </span>
                </span>
                <span
                  v-else
                  class="text-sm min-w-0 flex-1 truncate text-record-empty"
                >
                  Select an option
                </span>
              </ListboxButton>
              <Transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <ListboxOptions
                  class="absolute z-10 mt-1 max-h-60 w-full min-w-[160px] overflow-auto rounded-lg bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
                >
                  <ListboxOption :value="null" v-slot="{ active }">
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                      <span :class="['block truncate', active ? '' : 'text-record-empty']">Select an option</span>
                    </li>
                  </ListboxOption>
                  <ListboxOption
                    v-for="opt in (field.options || [])"
                    :key="opt.value"
                    :value="opt.value"
                    v-slot="{ active, selected }"
                  >
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                      <span :class="['block truncate', selected ? 'font-medium' : 'font-normal']">{{ opt.label }}</span>
                      <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                      </span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>

          <!-- recordPath + onEdit (e.g. task Related to): click value → open record; click elsewhere → inline editor (popover) -->
          <button
            v-else-if="field.canOpenEditor && typeof field.onEdit === 'function'"
            type="button"
            class="flex-1 min-w-0 text-left text-sm text-gray-900 dark:text-white rounded px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            @click="handleFieldEdit(field, $event)"
          >
            <span
              v-if="field.displayValue"
              class="block min-w-0 truncate transition-colors hover:text-primary-600 dark:hover:text-primary-400"
            >
              <span
                role="button"
                tabindex="0"
                class="inline cursor-pointer"
                @click.stop="(e) => { if (field.recordPath && context.openTab) { e.stopPropagation(); context.openTab(field.recordPath, { background: false, insertAdjacent: true }); } }"
              >
                {{ field.displayValue }}
              </span>
            </span>
            <span v-else class="text-record-empty">Click to link record</span>
          </button>

          <div
            v-else
            class="flex-1 min-w-0 text-left text-sm text-gray-900 dark:text-white rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          >
            <span
              v-if="field.displayValue"
              class="block min-w-0 truncate transition-colors hover:text-primary-600 dark:hover:text-primary-400"
            >
              <span
                role="button"
                tabindex="0"
                class="inline cursor-pointer"
                @click="(e) => { if (field.recordPath && context.openTab) { e.stopPropagation(); context.openTab(field.recordPath, { background: false, insertAdjacent: true }); } }"
              >
                {{ field.displayValue }}
              </span>
            </span>
            <span v-else class="text-record-empty">—</span>
          </div>
        </div>

        <div
          v-else-if="field.canOpenEditor && typeof field.onEdit === 'function'"
          class="flex items-center gap-3 py-2 px-4 min-h-[2rem]"
        >
          <span class="flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true">
            <component :is="getFieldIcon(field)" class="w-4 h-4" />
          </span>
          <span class="text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[12rem]">{{ field.label }}</span>
          <button
            type="button"
            class="flex-1 min-w-0 text-left text-sm text-gray-900 dark:text-white rounded px-2 py-1 -mx-2 -my-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            @click="handleFieldEdit(field, $event)"
          >
            <template v-if="field.key === 'tags' && Array.isArray(field.value) && field.value.length > 0">
              <div class="flex flex-wrap gap-1.5 text-left">
                <span
                  v-for="(tag, index) in field.value"
                  :key="`${tag}-${index}`"
                  :class="['inline-block text-xs px-2 py-0.5 rounded', (field.getTagChipClass ? field.getTagChipClass(tag) : null) || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200']"
                >
                  {{ typeof tag === 'object' ? (tag.name || tag.label || tag) : tag }}
                </span>
              </div>
            </template>
            <template v-else-if="field.key === 'tags'">
              <span class="text-record-empty">—</span>
            </template>
            <template v-else>
              <span v-if="field.displayValue" class="truncate">{{ field.displayValue }}</span>
              <span v-else class="text-record-empty">—</span>
            </template>
          </button>
        </div>

        <EditableLabeledValue
          v-else
          :label="field.label"
          :value="field.value"
          :type="field.type || 'text'"
          :prefix-icon="field.prefixIcon || null"
          :can-edit="field.canEdit === true"
          :options="Array.isArray(field.options) ? field.options : []"
          :min="field.min"
          :step="field.step"
          :multiline="field.multiline === true"
          :rows="field.rows"
          :format-value="() => field.displayValue"
          :get-tag-chip-class="field.getTagChipClass"
          layout="row"
          @save="handleFieldSave(field, $event)"
        />
      </template>
    </div>
    <div v-if="showExpandCollapse" class="pt-1">
      <button
        type="button"
        class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        @click="expanded ? collapse() : expand()"
      >
        {{ expanded ? 'View less' : `View all (${fields.length})` }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import {
  CurrencyDollarIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  TagIcon,
  UserIcon,
  LinkIcon,
  CheckIcon
} from '@heroicons/vue/24/outline';
import EditableLabeledValue from '@/components/record-page/EditableLabeledValue.vue';
import { shouldHideDetailField } from '@/components/record-page/fieldVisibilityGuards';

function getRecordPathFieldSelectedId(field) {
  const v = field?.value;
  if (v == null || v === '') return null;
  if (Array.isArray(v)) {
    const first = v[0];
    if (first == null || first === '') return null;
    if (typeof first === 'object') return first._id ?? first.id ?? first.value ?? null;
    return first;
  }
  if (typeof v === 'object') return v._id ?? v.id ?? null;
  return v;
}

const props = defineProps({
  record: { type: Object, default: null },
  adapter: { type: Object, default: () => ({}) },
  context: {
    type: Object,
    default: () => ({ module: '' })
  }
});

const fields = computed(() => {
  const value = props.adapter?.getDetailFields?.(props.record, props.context);
  const list = Array.isArray(value) ? value : [];
  const moduleKey = (props.context?.moduleKey || props.context?.module || '').toString().toLowerCase().trim();
  return list.filter((field) => !shouldHideDetailField(field, moduleKey, { enforceRegistryKnown: false }));
});

const hideHeader = computed(() => props.context?.hideHeader === true);

const DEFAULT_VISIBLE_FIELDS = 5;
const isSectionExpanded = computed(() => (props.context?.expandedLeftSection || '').toString().trim() === 'details');
const expanded = ref(isSectionExpanded.value);

// When the detail section is expanded (e.g. user clicked "Expand"), show all fields
watch(isSectionExpanded, (expandedMode) => {
  if (expandedMode) expanded.value = true;
}, { immediate: false });

const visibleFields = computed(() => {
  const list = fields.value;
  if (expanded.value || list.length <= DEFAULT_VISIBLE_FIELDS) return list;
  return list.slice(0, DEFAULT_VISIBLE_FIELDS);
});

const showExpandCollapse = computed(() => fields.value.length > DEFAULT_VISIBLE_FIELDS);

function expand() {
  expanded.value = true;
  props.adapter?.viewAllDetails?.(props.record, props.context);
}

function collapse() {
  expanded.value = false;
}

const getFieldIcon = (field) => {
  if (field?.prefixIcon) return field.prefixIcon;

  const key = String(field?.key || '').toLowerCase();
  if (key === 'relatedto') return LinkIcon;
  if (key === 'tags') return TagIcon;

  const map = {
    number: CurrencyDollarIcon,
    date: CalendarDaysIcon,
    text: DocumentTextIcon,
    select: TagIcon,
    user: UserIcon,
    entity: UserIcon
  };
  const type = String(field?.type || 'text').toLowerCase();
  return map[type] || DocumentTextIcon;
};

const handleFieldSave = (field, value) => {
  if (typeof field?.onSave === 'function') {
    field.onSave(value);
  }
};

const handleFieldEdit = (field, event) => {
  if (typeof field?.onEdit === 'function') {
    field.onEdit(event);
  }
};

</script>

<style scoped>
.details-section :deep(.text-record-empty) {
  color: var(--color-neutral-300) !important;
}

:global(.dark) .details-section :deep(.text-record-empty) {
  color: var(--color-neutral-600) !important;
}
</style>
