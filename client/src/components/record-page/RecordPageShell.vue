<template>
  <div :class="containerClass">
    <slot v-if="shouldShowLoading" name="loading">
      <div class="flex items-center justify-center min-h-[200px] flex-1">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p class="text-gray-600 dark:text-gray-400 mt-4">{{ loadingMessage }}</p>
        </div>
      </div>
    </slot>

    <slot v-else-if="shouldShowError" name="error" :error="errorMessage">
      <div class="flex items-center justify-center min-h-[200px] flex-1 p-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ errorTitle }}</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">{{ errorMessage }}</p>
          <button
            type="button"
            @click="$emit('retry')"
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {{ retryLabel }}
          </button>
        </div>
      </div>
    </slot>

    <template v-else>
      <RecordPageLayout v-if="useLayout" v-bind="layoutProps">
        <template #header>
          <slot name="header" />
        </template>
        <template #left>
          <slot name="left" />
        </template>
        <template #right>
          <slot name="right" />
        </template>
      </RecordPageLayout>
      <slot v-else />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import RecordPageLayout from './RecordPageLayout.vue';

const props = defineProps({
  loading: { type: Boolean, default: false },
  showLoading: { type: Boolean, default: true },
  error: { type: [String, Object], default: null },
  loadingMessage: { type: String, default: 'Loading...' },
  errorTitle: { type: String, default: 'Error Loading Record' },
  retryLabel: { type: String, default: 'Retry' },
  useLayout: { type: Boolean, default: true },
  layoutProps: {
    type: Object,
    default: () => ({})
  },
  containerClass: {
    type: [String, Array, Object],
    default: 'flex-1 min-h-0 overflow-hidden flex flex-col'
  }
});

defineEmits(['retry']);

const shouldShowLoading = computed(() => props.loading && props.showLoading);
const shouldShowError = computed(() => !shouldShowLoading.value && Boolean(props.error));

const errorMessage = computed(() => {
  if (typeof props.error === 'string') return props.error;
  if (props.error && typeof props.error === 'object') return String(props.error.message || 'Failed to load record');
  return 'Failed to load record';
});
</script>