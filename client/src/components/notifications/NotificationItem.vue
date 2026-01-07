<template>
  <button
    type="button"
    class="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left min-h-[44px]"
    @click="handleClick"
    :aria-label="item.title"
  >
    <!-- Icon -->
    <div class="mt-1 flex-shrink-0">
      <span
        class="inline-flex items-center justify-center w-8 h-8 rounded-full"
        :class="iconBgClass"
      >
        <component :is="iconComponent" class="w-4 h-4" :class="iconColorClass" />
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p
        class="text-sm"
        :class="item.readAt ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'"
      >
        {{ item.title }}
      </p>
      <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
        {{ entityLabel }}
      </p>
      <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
        {{ relativeTime }}
      </p>
      <p
        v-if="unavailable"
        class="mt-1 text-xs text-amber-600 dark:text-amber-400"
      >
        This item is no longer available.
      </p>
    </div>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notifications';
import { getNotificationRoute, validateRoute } from '@/utils/notificationRouteMap';
import {
  BellAlertIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/solid';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  appKey: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['navigated']);

const router = useRouter();
const store = useNotificationStore();
const unavailable = ref(false);

const relativeTime = computed(() => store.formatRelative(props.item.createdAt));

const iconComponent = computed(() => {
  if (props.item.priority === 'HIGH') return BellAlertIcon;
  if (props.item.priority === 'LOW') return InformationCircleIcon;
  return CheckCircleIcon;
});

const iconBgClass = computed(() => {
  if (props.item.priority === 'HIGH') return 'bg-red-100 dark:bg-red-900/40';
  if (props.item.priority === 'LOW') return 'bg-blue-100 dark:bg-blue-900/40';
  return 'bg-green-100 dark:bg-green-900/40';
});

const iconColorClass = computed(() => {
  if (props.item.priority === 'HIGH') return 'text-red-600 dark:text-red-400';
  if (props.item.priority === 'LOW') return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
});

const entityLabel = computed(() => {
  if (!props.item.entity || !props.item.entity.type) return 'Notification';
  return props.item.entity.type;
});

async function handleClick() {
  // Optimistically mark as read
  await store.markRead(props.item.id);

  // Get route from centralized map
  const route = getNotificationRoute(props.appKey, props.item.entity);
  
  if (!route) {
    console.warn('[NotificationItem] No route available for:', {
      appKey: props.appKey,
      entity: props.item.entity
    });
    unavailable.value = true;
    return;
  }

  // Validate route exists before navigating
  if (!validateRoute(router, route)) {
    console.warn('[NotificationItem] Route validation failed:', route);
    unavailable.value = true;
    return;
  }

  try {
    await router.push(route);
    emit('navigated');
  } catch (err) {
    console.error('[NotificationItem] Navigation error:', err);
    unavailable.value = true;
  }
}
</script>


