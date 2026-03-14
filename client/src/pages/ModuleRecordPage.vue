<template>
  <div class="module-record-page-root flex-1 min-h-0 overflow-hidden flex flex-col">
    <!-- Deals and tasks use their full-featured pages; all other modules use the generic record page. -->
    <DealRecordPage v-if="adapterKey === 'deal'" />
    <TaskRecordPage v-else-if="adapterKey === 'task'" />
    <GenericRecordContent
      v-else
      :module-key="moduleKey"
      :record-id="effectiveRecordId"
      :embed="embed"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { getRecordAdapterKey } from '@/components/record-page/adapters/adapterRegistry';
import DealRecordPage from '@/pages/deals/DealRecordPage.vue';
import TaskRecordPage from '@/pages/tasks/TaskRecordPage.vue';
import GenericRecordContent from '@/components/record-page/GenericRecordContent.vue';

const props = defineProps({
  embed: { type: Boolean, default: false },
  /** When embed, pass record id explicitly; otherwise from route */
  recordId: { type: String, default: null }
});

const route = useRoute();

const moduleKey = computed(() => {
  const meta = route.meta?.moduleKey;
  if (meta) return String(meta).toLowerCase().trim();
  if (route.name === 'deal-detail') return 'deals';
  if (route.name === 'task-detail') return 'tasks';
  const fromParams = route.params?.moduleKey;
  if (fromParams) return String(fromParams).toLowerCase().trim();
  const segment = route.path.split('/').filter(Boolean)[0];
  return segment ? String(segment).toLowerCase().trim() : '';
});

const effectiveRecordId = computed(() => {
  if (props.embed && props.recordId) return props.recordId;
  return route.params?.id ?? route.params?.recordId ?? '';
});

const adapterKey = computed(() => getRecordAdapterKey(moduleKey.value));
</script>
