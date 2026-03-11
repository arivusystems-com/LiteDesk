<template>
  <section v-if="fields.length" class="space-y-2">
    <h3 v-if="!hideHeader" class="text-base font-semibold text-gray-900 dark:text-white">Details</h3>
    <div class="border-y border-x-0 border-gray-200/70 dark:border-gray-700/70 divide-y divide-gray-200/70 dark:divide-gray-700/70">
      <template
        v-for="field in fields"
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
            class="flex-1 min-w-0 relative"
          >
            <div class="relative w-full">
              <ListboxButton
                class="flex items-center gap-2 w-full min-h-8 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1 transition-colors focus:outline-none focus:ring-0"
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
                  class="text-sm min-w-0 flex-1 truncate text-gray-400 dark:text-gray-500"
                >
                  Empty
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
                      <span class="block truncate">Empty</span>
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
            <span v-else class="text-gray-400 dark:text-gray-500">Click to link record</span>
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
            <span v-else class="text-gray-100 dark:text-gray-600">—</span>
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
                  :class="['inline-block text-xs px-2 py-0.5 rounded', (field.getTagChipClass ? field.getTagChipClass(typeof tag === 'object' ? (tag.name || tag.label || '') : tag) : null) || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200']"
                >
                  {{ typeof tag === 'object' ? (tag.name || tag.label || tag) : tag }}
                </span>
              </div>
            </template>
            <template v-else-if="field.key === 'tags'">
              <span class="text-gray-300 dark:text-gray-600">—</span>
            </template>
            <template v-else>
              <span v-if="field.displayValue" class="truncate">{{ field.displayValue }}</span>
              <span v-else class="text-gray-300 dark:text-gray-600">—</span>
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
    <div v-if="shouldShowViewAll" class="pt-1">
      <button
        type="button"
        class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        @click="viewAll"
      >
        View all ({{ detailFieldCount }})
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
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

function getRecordPathFieldSelectedId(field) {
  const v = field?.value;
  if (v == null || v === '') return null;
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
  return Array.isArray(value) ? value : [];
});

const hideHeader = computed(() => props.context?.hideHeader === true);
const shouldShowViewAll = computed(() => props.adapter?.shouldShowDetailsViewAll?.(props.record, props.context) === true);
const detailFieldCount = computed(() => props.adapter?.getDetailFieldCount?.(props.record, props.context) || fields.value.length);

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

const viewAll = () => {
  props.adapter?.viewAllDetails?.(props.record, props.context);
};
</script>
