<template>
  <Switch
    as="button"
    type="button"
    :disabled="disabled"
    :model-value="resolvedChecked"
    role="checkbox"
    :aria-checked="indeterminate ? 'mixed' : String(resolvedChecked)"
    data-headless-checkbox="true"
    :class="[
      'inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900',
      variant === 'switch' ? 'rounded-full p-0.5' : 'rounded border',
      sizeClass,
      variant === 'switch'
        ? (resolvedChecked || indeterminate ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700')
        : (resolvedChecked || indeterminate
          ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
          : 'border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-700'),
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      checkboxClass
    ]"
    @update:modelValue="handleToggle"
    @focus="(event) => emit('focus', event)"
    @blur="(event) => emit('blur', event)"
    @click="(event) => emit('click', event)"
  >
    <template v-if="variant === 'switch'">
      <span
        :class="[
          'rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform duration-200',
          switchThumbClass,
          resolvedChecked || indeterminate ? switchThumbOnClass : switchThumbOffClass
        ]"
      ></span>
    </template>
    <template v-else>
      <MinusIcon v-if="indeterminate" class="h-3 w-3" aria-hidden="true" />
      <CheckIcon v-else class="h-3 w-3" aria-hidden="true" />
    </template>
  </Switch>
</template>

<script setup>
import { computed } from 'vue';
import { Switch } from '@headlessui/vue';
import { CheckIcon, MinusIcon } from '@heroicons/vue/20/solid';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: undefined
  },
  checked: {
    type: Boolean,
    default: undefined
  },
  disabled: {
    type: Boolean,
    default: false
  },
  indeterminate: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'check'
  },
  size: {
    type: String,
    default: 'md'
  },
  checkboxClass: {
    type: [String, Array, Object],
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur', 'click']);

const resolvedChecked = computed(() => {
  if (typeof props.modelValue === 'boolean') return props.modelValue;
  if (typeof props.checked === 'boolean') return props.checked;
  return false;
});

const sizeClass = computed(() => {
  if (props.variant === 'switch') {
    if (props.size === 'sm') return 'h-4 w-8';
    if (props.size === 'lg') return 'h-7 w-12';
    return 'h-5 w-9';
  }
  if (props.size === 'sm') return 'h-3.5 w-3.5';
  if (props.size === 'lg') return 'h-5 w-5';
  return 'h-4 w-4';
});

const switchThumbClass = computed(() => {
  if (props.size === 'sm') return 'h-3 w-3';
  if (props.size === 'lg') return 'h-6 w-6';
  return 'h-4 w-4';
});

const switchThumbOnClass = computed(() => {
  if (props.size === 'sm') return 'translate-x-4';
  if (props.size === 'lg') return 'translate-x-5';
  return 'translate-x-4';
});

const switchThumbOffClass = computed(() => 'translate-x-0');

const createSyntheticChangeEvent = (checked) => {
  let defaultPrevented = false;

  return {
    type: 'change',
    bubbles: true,
    cancelable: true,
    defaultPrevented,
    target: { checked },
    currentTarget: { checked },
    stopPropagation: () => {},
    stopImmediatePropagation: () => {},
    preventDefault: () => {
      defaultPrevented = true;
    }
  };
};

const handleToggle = (nextChecked) => {
  const normalized = Boolean(nextChecked);
  emit('update:modelValue', normalized);
  emit('change', createSyntheticChangeEvent(normalized));
};
</script>
