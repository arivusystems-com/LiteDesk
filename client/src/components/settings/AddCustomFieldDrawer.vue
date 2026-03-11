<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog class="relative z-50" @close="handleClose">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500/75 dark:bg-black/75" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <TransitionChild
              as="template"
              enter="transform transition ease-in-out duration-300 sm:duration-300"
              enter-from="translate-x-full"
              enter-to="translate-x-0"
              leave="transform transition ease-in-out duration-300 sm:duration-300"
              leave-from="translate-x-0"
              leave-to="translate-x-full"
            >
              <div class="pointer-events-auto h-full flex">
                <DialogPanel
                  class="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl max-w-[95vw] w-[30rem] transition-[width] duration-200 ease-out"
                >
                  <form @submit.prevent="handleSave" class="relative flex h-full flex-col divide-y divide-gray-200 dark:divide-gray-700">
                    <!-- Header: matches CreateRecordDrawer / TaskEditDrawer -->
                    <div class="bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6 flex-shrink-0">
                      <div class="flex items-center justify-between">
                        <DialogTitle class="text-base font-semibold text-white">Add Custom Field</DialogTitle>
                        <button
                          type="button"
                          class="relative rounded-md text-indigo-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                          @click="handleClose"
                        >
                          <span class="absolute -inset-2.5" />
                          <span class="sr-only">Close panel</span>
                          <XMarkIcon class="size-6" aria-hidden="true" />
                        </button>
                      </div>
                      <p class="mt-1 text-sm text-indigo-300">Define a new custom field for this module.</p>
                    </div>

                    <!-- Body: scrollable, matches record drawer -->
                    <div class="h-0 flex-1 overflow-y-auto">
                      <div class="px-4 sm:px-6 py-6 space-y-6">
                        <div class="space-y-1">
                          <label for="add-field-label" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Label</label>
                          <input
                            id="add-field-label"
                            v-model="draft.label"
                            type="text"
                            placeholder="e.g., Custom Status"
                            required
                            class="block w-full mt-2 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white text-base outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                          />
                        </div>
                        <div class="space-y-1">
                          <label for="add-field-key" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Key</label>
                          <input
                            id="add-field-key"
                            v-model="draft.key"
                            type="text"
                            placeholder="Auto-generated from label"
                            class="block w-full mt-2 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white text-base outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                          />
                          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from label. Edit to customize.</p>
                        </div>
                        <div class="space-y-1">
                          <label for="add-field-type" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Type</label>
                          <HeadlessSelect
                            id="add-field-type"
                            v-model="draft.dataType"
                            :options="fieldTypeOptions"
                          />
                        </div>
                        <div class="flex items-center gap-6 pt-2">
                          <label class="inline-flex items-center gap-2 cursor-pointer">
                            <HeadlessCheckbox
                              v-model="draft.required"
                              checkbox-class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span class="text-sm text-gray-900 dark:text-white">Required in Form</span>
                          </label>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <label class="block text-sm/6 font-medium text-gray-900 dark:text-white mb-3">Visibility</label>
                          <div class="flex flex-col gap-2">
                            <label class="inline-flex items-center gap-2 cursor-pointer">
                              <HeadlessCheckbox
                                v-model="draft.visibility.list"
                                checkbox-class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span class="text-sm text-gray-900 dark:text-white">Show in List</span>
                            </label>
                            <label class="inline-flex items-center gap-2 cursor-pointer">
                              <HeadlessCheckbox
                                v-model="draft.visibility.detail"
                                checkbox-class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span class="text-sm text-gray-900 dark:text-white">Show in Detail</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Footer: matches CreateRecordDrawer / TaskEditDrawer -->
                    <div class="flex shrink-0 flex items-center justify-between gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      <span />
                      <div class="flex gap-3">
                        <button
                          type="button"
                          class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          @click="handleClose"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          class="rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
                        >
                          Add Field
                        </button>
                      </div>
                    </div>
                  </form>
                </DialogPanel>
              </div>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';
import HeadlessSelect from '@/components/ui/HeadlessSelect.vue';

const FIELD_TYPES = [
  'Text',
  'Text-Area',
  'Rich Text',
  'Integer',
  'Decimal',
  'Currency',
  'Date',
  'Date-Time',
  'Picklist',
  'Multi-Picklist',
  'Checkbox',
  'Radio Button',
  'Email',
  'Phone',
  'URL',
  'Image',
  'Auto-Number',
  'Lookup (Relationship)',
  'Formula',
  'Rollup Summary'
];

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  moduleName: { type: String, default: '' },
  nextOrder: { type: Number, default: 0 }
});

const emit = defineEmits(['close', 'save']);

const fieldTypes = FIELD_TYPES;
const fieldTypeOptions = computed(() => fieldTypes.map((t) => ({ value: t, label: t })));

const createEmptyDraft = () => ({
  key: '',
  label: '',
  dataType: 'Text',
  required: false,
  options: [],
  defaultValue: null,
  index: false,
  visibility: { list: true, detail: true },
  order: props.nextOrder,
  owner: 'org',
  context: 'global'
});

const draft = ref(createEmptyDraft());

function labelToKey(label) {
  if (!label || typeof label !== 'string') return '';
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 80) || '';
}

watch(() => props.isOpen, (open) => {
  if (open) {
    draft.value = createEmptyDraft();
    draft.value.order = props.nextOrder;
  }
});

watch(() => draft.value.label, (label) => {
  if (props.isOpen && label) {
    draft.value.key = labelToKey(label);
  }
});

const handleClose = () => emit('close');

const handleSave = () => {
  if (!draft.value.label?.trim()) return;
  const key = draft.value.key?.trim() || labelToKey(draft.value.label);
  if (!key) return;
  emit('save', {
    ...draft.value,
    key,
    label: draft.value.label.trim()
  });
};
</script>
