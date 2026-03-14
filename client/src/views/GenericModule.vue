<template>
  <div class="mx-auto w-full">
    <!-- List: use ModuleList with moduleKey from route -->
    <ModuleList
      v-if="routeType === 'list' && moduleKey"
      ref="moduleListRef"
      :module-key="moduleKey"
      app-key="SALES"
      view-mode="list"
      @create="handleCreate"
      @row-click="handleRowClick"
    />
    <!-- Detail: use standard ModuleRecordPage (same UI as deals/tasks) -->
    <ModuleRecordPage
      v-else-if="routeType === 'detail' && moduleKey"
    />
    <!-- Create: redirect to list for now; could add generic create form later -->
    <div v-else-if="routeType === 'create' && moduleKey" class="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <p class="text-gray-600 dark:text-gray-400 mb-4">Create form for {{ moduleKey }} is not yet available.</p>
      <button
        type="button"
        @click="goToList"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
      >
        Back to list
      </button>
    </div>
    <div v-else class="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">
      Unknown module or route.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ModuleList from '@/components/module-list/ModuleList.vue';
import ModuleRecordPage from '@/pages/ModuleRecordPage.vue';

const route = useRoute();
const router = useRouter();

const moduleKey = computed(() => (route.meta?.moduleKey || '').toLowerCase());
const routeType = computed(() => route.meta?.routeType || 'list');

function handleCreate() {
  if (moduleKey.value) {
    router.push(`/${moduleKey.value}/new`);
  }
}

function handleRowClick({ row }) {
  if (row?._id && moduleKey.value) {
    router.push(`/${moduleKey.value}/${row._id}`);
  }
}

function handleRecordUpdated() {
  // No-op when using ModuleRecordPage; it handles navigation internally
}

function handleRecordDeleted() {
  router.push(`/${moduleKey.value}`);
}

function goToList() {
  if (moduleKey.value) {
    router.push(`/${moduleKey.value}`);
  }
}
</script>
