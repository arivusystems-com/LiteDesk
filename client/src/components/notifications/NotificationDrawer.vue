<template>
  <Teleport to="body">
    <transition name="notification-drawer">
      <div
        v-if="open"
        class="fixed inset-0 z-[9990] flex justify-end"
        @keydown.esc.prevent="$emit('close')"
      >
        <!-- Backdrop -->
        <div
          class="flex-1 bg-black/40"
          @click="$emit('close')"
          aria-hidden="true"
        ></div>

        <!-- Drawer -->
        <aside
          class="w-full sm:w-[360px] md:w-[380px] lg:w-[400px] bg-white dark:bg-gray-900 shadow-xl flex flex-col max-h-screen"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
        >
          <!-- Header -->
          <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">
              Notifications
            </h2>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 min-h-[32px] px-2"
                :disabled="!hasUnread || markAllDisabled"
                @click="handleMarkAllRead"
                aria-label="Mark all notifications as read"
              >
                Mark all as read
              </button>
              <button
                type="button"
                class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[32px] min-w-[32px]"
                aria-label="Close notifications"
                @click="$emit('close')"
              >
                <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <!-- Offline banner (optional for audit app) -->
          <div v-if="showOfflineBanner" class="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700">
            <p class="text-xs text-amber-800 dark:text-amber-200">
              Offline — notifications may be outdated.
            </p>
          </div>

          <!-- Body -->
          <section class="flex-1 overflow-y-auto px-2 py-2 space-y-4">
            <template v-if="items.length">
              <div v-for="group in groupedItems" :key="group.label">
                <p class="px-2 mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {{ group.label }}
                </p>
                <div class="space-y-1">
                  <NotificationItem
                    v-for="n in group.items"
                    :key="n.id"
                    :item="n"
                    :app-key="appKey"
                    @navigated="$emit('close')"
                  />
                </div>
              </div>
              <div v-if="canLoadMore" class="mt-2 px-2">
                <button
                  type="button"
                  class="w-full text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline py-2"
                  @click="loadMore"
                  :disabled="loading"
                >
                  {{ loading ? 'Loading…' : 'Load more' }}
                </button>
              </div>
            </template>
            <template v-else>
              <div class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No notifications yet.
              </div>
            </template>
          </section>

          <!-- Footer -->
          <footer class="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              class="w-full inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[40px]"
              @click="$emit('close')"
            >
              Close
            </button>
          </footer>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, watch, onBeforeUnmount, ref } from 'vue';
import { useNotificationStore } from '@/stores/notifications';
import { useOffline } from '@/composables/useOffline';
import { connectNotificationStream } from '@/composables/useNotificationStream';
import { useAuthStore } from '@/stores/auth';
import NotificationItem from './NotificationItem.vue';

const props = defineProps({
  open: {
    type: Boolean,
    required: true
  },
  appKey: {
    type: String,
    required: true
  },
  markAllDisabled: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close']);

const store = useNotificationStore();
const authStore = useAuthStore();
const { isOffline, isOnline } = useOffline();

const items = computed(() => store.items);
const hasUnread = computed(() => store.hasUnread);
const loading = computed(() => store.loading);
const canLoadMore = computed(() => !!store.nextCursor && !loading.value);
const showOfflineBanner = computed(() => props.appKey === 'AUDIT' && isOffline.value);

// Track when drawer opened to show "New" divider
const openedAt = ref(null);

// SSE stream connection
let streamDisconnect = null;

const groupedItems = computed(() => {
  const groups = {
    New: [],
    Today: [],
    Yesterday: [],
    Earlier: []
  };
  const now = new Date();

  for (const n of items.value) {
    const created = new Date(n.createdAt);
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Show as "New" if arrived after drawer opened
    if (openedAt.value && created > openedAt.value) {
      groups.New.push(n);
    } else if (diffDays === 0) {
      groups.Today.push(n);
    } else if (diffDays === 1) {
      groups.Yesterday.push(n);
    } else {
      groups.Earlier.push(n);
    }
  }

  return [
    { label: 'New', items: groups.New },
    { label: 'Today', items: groups.Today },
    { label: 'Yesterday', items: groups.Yesterday },
    { label: 'Earlier', items: groups.Earlier }
  ].filter(g => g.items.length);
});

async function loadInitial() {
  await store.fetchNotifications({ unreadOnly: false, limit: 20 });
}

async function loadMore() {
  if (!store.nextCursor) return;
  await store.fetchNotifications({ cursor: store.nextCursor, unreadOnly: false, limit: 20 });
}

async function handleMarkAllRead() {
  if (showOfflineBanner.value) return;
  await store.markAllRead();
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      openedAt.value = new Date();
      await loadInitial();
      
      // Connect SSE stream when drawer opens
      if (!isOffline.value) {
        streamDisconnect = connectNotificationStream(
          props.appKey,
          (notification) => {
            store.handleIncomingNotification(notification);
          },
          {
            isOnline: isOnline.value,
            authStore
          }
        );
      }
    } else {
      // Disconnect SSE stream when drawer closes
      if (streamDisconnect) {
        streamDisconnect();
        streamDisconnect = null;
      }
      openedAt.value = null;
    }
  }
);

onBeforeUnmount(() => {
  if (streamDisconnect) {
    streamDisconnect();
  }
});
</script>

<style>
.notification-drawer-enter-active,
.notification-drawer-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.notification-drawer-enter-from,
.notification-drawer-leave-to {
  opacity: 0;
}

.notification-drawer-enter-from aside,
.notification-drawer-leave-to aside {
  transform: translateX(100%);
}
</style>


