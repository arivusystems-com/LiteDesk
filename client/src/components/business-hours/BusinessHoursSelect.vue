<template>
  <div>
    <label
      v-if="label"
      :for="id"
      class="block text-xs text-gray-500 dark:text-gray-400 mb-1"
    >
      {{ label }}
    </label>
    <HeadlessSelect
      :id="id"
      :model-value="modelValue"
      :options="options"
      :placeholder="placeholder"
      :allow-empty="allowEmpty"
      :empty-label="emptyLabel"
      :empty-value="emptyValue"
      :disabled="disabled"
      :button-class="selectButtonClass"
      options-class="z-50"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup>
import HeadlessSelect from '@/components/ui/HeadlessSelect.vue';

defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  id: { type: String, default: undefined },
  placeholder: { type: String, default: 'Select…' },
  allowEmpty: { type: Boolean, default: false },
  emptyLabel: { type: String, default: 'None' },
  emptyValue: { type: [String, Number, null], default: null },
  disabled: { type: Boolean, default: false }
});

defineEmits(['update:modelValue']);

const selectButtonClass =
  '!rounded-lg !bg-white dark:!bg-gray-700 !px-3 !py-2 text-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:!ring-2 focus:!ring-indigo-500 dark:focus:!bg-gray-700';
</script>
