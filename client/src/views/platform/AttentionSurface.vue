<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <!--
      Cross-app attention (tasks + events) from GET /api/inbox.
      Lives under Platform → Core modules per sidebar contract.
      See docs/architecture/inbox-surface-invariants.md
    -->

    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Attention
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Things that need your attention right now
      </p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <p class="text-sm text-red-800 dark:text-red-200">
        {{ error }}
      </p>
    </div>

    <div v-else-if="items.length === 0" class="text-center py-16">
      <div class="max-w-md mx-auto">
        <CheckCircleIcon class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          You're all caught up
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Attention shows tasks and events only when action is needed.
        </p>
      </div>
    </div>

    <div v-else>
      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="group relative py-5 px-1 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:outline-none rounded focus-within:bg-gray-50 dark:focus-within:bg-gray-700/30"
        :class="{
          'border-b border-gray-100 dark:border-gray-800': index < items.length - 1
        }"
        role="button"
        tabindex="0"
        @click="handleItemClick(item)"
        @keydown.enter="handleItemClick(item)"
        @keydown.space.prevent="handleItemClick(item)"
      >
        <div class="flex items-start gap-4">
          <div
            v-if="item.kind === 'task' && item.allowComplete"
            class="flex-shrink-0 pt-0.5"
            @click.stop
          >
            <HeadlessCheckbox
              :checked="false"
              :aria-label="`Complete task: ${item.title}`"
              checkbox-class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
              @change.stop="handleTaskComplete(item)"
              @click.stop
            />
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
              {{ item.title }}
            </h3>

            <p
              :class="[
                'text-sm mb-3',
                item.isOverdue
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              ]"
            >
              {{ item.attentionLabel }}
            </p>

            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span>{{ item.sourceApp }}</span>
                <span>·</span>
                <span>{{ item.organizationLabel }}</span>
                <span v-if="item.relatedLabel" class="text-gray-400 dark:text-gray-500">
                  · {{ item.relatedLabel }}
                </span>
              </div>

              <div v-if="item.dueAt" class="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {{ formatTime(item.dueAt, item.isOverdue) }}
              </div>
            </div>
          </div>

          <div v-if="item.kind === 'event'" class="flex-shrink-0">
            <BadgeCell
              :value="getEventAttentionBadgeLabel(getEventAttentionType(item))"
              :variant="getEventAttentionBadgeVariant(getEventAttentionType(item))"
            />
          </div>

          <div class="flex-shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRightIcon class="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';
import BadgeCell from '@/components/common/table/BadgeCell.vue';
import { CheckCircleIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';

const router = useRouter();

const loading = ref(true);
const error = ref(null);
const items = ref([]);

const fetchInboxItems = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient('/inbox', {
      method: 'GET'
    });

    if (response.success) {
      items.value = response.data || [];
    } else {
      error.value = 'Unable to load attention items';
      items.value = [];
    }
  } catch (err) {
    console.error('[Attention] Error fetching items:', err);
    error.value = 'Unable to load attention items';
    items.value = [];
  } finally {
    loading.value = false;
  }
};

const handleItemClick = (item) => {
  if (item.routeTarget) {
    router.push(item.routeTarget);
  }
};

const handleTaskComplete = async (item) => {
  if (item.kind !== 'task' || !item.allowComplete) {
    return;
  }

  try {
    if (item.completeAction.startsWith('/api/')) {
      await apiClient(item.completeAction, {
        method: 'POST'
      });
      await fetchInboxItems();
    } else {
      router.push(item.completeAction);
    }
  } catch (err) {
    console.error('[Attention] Error completing task:', err);
    error.value = 'Unable to complete task';
  }
};

const formatTime = (dueAt, isOverdue) => {
  if (isOverdue) {
    return 'overdue';
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  if (diffHours < 0) {
    const absHours = Math.abs(diffHours);
    return `${absHours} hour${absHours !== 1 ? 's' : ''} ago`;
  }

  return 'soon';
};

const getEventAttentionType = (item) => {
  if (item.kind === 'event' && 'eventAttentionType' in item) {
    return item.eventAttentionType;
  }
  return null;
};

const getEventAttentionBadgeLabel = (attentionType) => {
  if (!attentionType) return 'Action Required';
  const labels = {
    start: 'Starting Soon',
    review: 'Needs Review',
    corrective: 'Corrective Actions',
    approval: 'Approval Required'
  };
  return labels[attentionType] || 'Action Required';
};

const getEventAttentionBadgeVariant = (attentionType) => {
  if (!attentionType) return 'default';
  const variants = {
    start: 'info',
    review: 'warning',
    corrective: 'danger',
    approval: 'primary'
  };
  return variants[attentionType] || 'default';
};

onMounted(() => {
  fetchInboxItems();
});
</script>
