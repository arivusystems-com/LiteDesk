<template>
  <button
    type="button"
    class="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    :aria-label="ariaLabel"
    @click.stop.prevent="handleClick"
  >
    <svg
      class="w-6 h-6 text-gray-600 dark:text-gray-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>

    <!-- Red dot (all viewports) -->
    <span
      v-if="hasUnread"
      class="absolute top-1 right-1 block w-2 h-2 rounded-full bg-red-500"
      aria-hidden="true"
    ></span>

    <!-- Numeric badge (desktop only) -->
    <span
      v-if="hasUnread && showCountOnDesktop"
      class="hidden md:flex items-center justify-center absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-semibold text-white px-1"
      aria-hidden="true"
    >
      {{ displayCount }}
    </span>
  </button>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useNotificationStore } from '@/stores/notifications';
import { useNotificationStream } from '@/composables/useNotificationStream';
import { useOffline } from '@/composables/useOffline';

const props = defineProps({
  showCountOnDesktop: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['toggle']);

const store = useNotificationStore();
const { isOnline } = useOffline();

// Get current app key for SSE connection
const currentAppKey = () => {
  const path = window.location.pathname || '';
  if (path.startsWith('/audit/')) return 'AUDIT';
  if (path.startsWith('/portal/')) return 'PORTAL';
  return 'SALES';
};

const hasUnread = computed(() => store.hasUnread);
const displayCount = computed(() => {
  if (store.unreadCount > 9) return '9+';
  return store.unreadCount;
});

const ariaLabel = computed(() =>
  hasUnread.value ? 'Notifications, unread items present' : 'Notifications'
);

let streamDisconnect = null;

onMounted(() => {
  console.log('[NotificationBell] Component mounted');
  // Lightweight preview so we only know if there is at least one unread
  store.fetchUnreadPreview();
  
  // Connect SSE stream for real-time bell updates (only when online)
  if (isOnline.value) {
    const appKey = currentAppKey();
    const stream = useNotificationStream(appKey, (notification) => {
      // Update unread count when new notification arrives
      store.handleIncomingNotification(notification);
    });
    streamDisconnect = stream.disconnect;
  }
});

onBeforeUnmount(() => {
  if (streamDisconnect) {
    streamDisconnect();
  }
});

function handleClick(e) {
  console.log('[NotificationBell] toggle clicked', e);
  e.preventDefault();
  e.stopPropagation();
  emit('toggle');
}
</script>


