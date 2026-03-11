<template>
  <Listbox
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    as="div"
    class="relative"
  >
    <ListboxButton
      :id="id"
      :disabled="disabled"
      :class="[
        'relative block w-full cursor-default rounded-lg border py-2 pl-3 pr-10 text-left text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-sm',
        'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white',
        'placeholder:text-gray-500 dark:placeholder:text-gray-500',
        disabled && 'cursor-not-allowed opacity-60'
      ]"
    >
      <span :class="['block truncate', !selectedLabel && 'text-gray-500 dark:text-gray-400']">
        {{ selectedLabel || placeholder }}
      </span>
      <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clip-rule="evenodd" />
        </svg>
      </span>
    </ListboxButton>
    <Transition
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <ListboxOptions
        class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
      >
        <ListboxOption
          v-if="allowEmpty"
          :value="emptyValue"
          v-slot="{ active }"
        >
          <li :class="['relative cursor-default select-none py-2 pl-3 pr-9', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
            <span class="block truncate">{{ emptyLabel }}</span>
          </li>
        </ListboxOption>
        <ListboxOption
          v-for="opt in options"
          :key="String(opt.value)"
          :value="opt.value"
          v-slot="{ active, selected }"
        >
          <li :class="['relative cursor-default select-none py-2 pl-3 pr-9', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
            <span :class="['block truncate', selected ? 'font-semibold' : 'font-normal']">{{ opt.label }}</span>
            <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
              </svg>
            </span>
          </li>
        </ListboxOption>
      </ListboxOptions>
    </Transition>
  </Listbox>
</template>

<script setup>
import { computed } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  /** Options: { value: string|number, label: string }[] */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
  allowEmpty: { type: Boolean, default: false },
  emptyLabel: { type: String, default: '—' },
  emptyValue: { type: [String, Number], default: '' },
  id: { type: String, default: undefined },
  disabled: { type: Boolean, default: false }
});

defineEmits(['update:modelValue']);

const selectedLabel = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
    return props.allowEmpty ? props.emptyLabel : '';
  }
  const opt = props.options.find((o) => o.value === props.modelValue);
  return opt ? opt.label : '';
});
</script>
