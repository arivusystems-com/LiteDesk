<!--
================================================================================
NOTIFICATIONS UX CONTRACT — DO NOT VIOLATE
================================================================================
This file enforces the Notifications UX & Architecture Hardening Contract.

Notifications are signals, not workflows.
Actions are assistive, not authoritative.

- Notifications surface awareness; they do not own domain state.
- No domain mutation without explicit backend APIs + design review.
- Snooze is temporary, UI-only (no backend persistence; no cross-device guarantees).
- Grouping is visual-only (never permanently hides or mutates data; no persisted UI state).

See `docs/architecture/notifications-hardening.md`.
================================================================================
-->

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
              <div v-for="section in groupedSections" :key="section.label">
                <p class="px-2 mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {{ section.label }}
                </p>

                <div class="space-y-1">
                  <template v-for="entry in section.entries" :key="entry.key">
                    <!-- Ungrouped notifications (no entity OR only one in entity bucket) -->
                    <NotificationItem
                      v-if="entry.kind === 'item'"
                      :item="entry.item"
                      :app-key="appKey"
                      :show-actions="true"
                      @navigated="$emit('close')"
                      @snooze="handleSnooze"
                    />

                    <!-- Entity group -->
                    <div
                      v-else
                      class="w-full"
                    >
                      <button
                        type="button"
                        class="w-full relative flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left min-h-[44px]"
                        :aria-expanded="isGroupOpen(entry.key) ? 'true' : 'false'"
                        :aria-label="`Notification group for ${entry.entityTitle} (${entry.count})`"
                        @click="toggleGroup(entry.key)"
                      >
                        <!-- Left icon: reuse notification icon style (subtle) -->
                        <div class="mt-1 flex-shrink-0">
                          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6ZM10 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3Z" />
                            </svg>
                          </span>
                        </div>

                        <div class="flex-1 min-w-0">
                          <div class="flex items-start justify-between gap-2">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {{ entry.entityTitle }}
                            </p>
                            <div class="flex items-center gap-2 flex-shrink-0">
                              <span class="text-[11px] text-gray-400 dark:text-gray-500">
                                {{ formatRelative(entry.latest.createdAt) }}
                              </span>
                              <span
                                class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gray-200 dark:bg-gray-800 text-[11px] font-semibold text-gray-700 dark:text-gray-200"
                                :aria-label="`${entry.count} notifications`"
                              >
                                {{ entry.count }}
                              </span>
                            </div>
                          </div>
                          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                            {{ entry.summaryText }}
                          </p>
                        </div>

                        <!-- Group action: mark all as read (unread only), subtle and non-blocking -->
                        <button
                          v-if="entry.unreadCount > 0"
                          type="button"
                          class="absolute right-2 bottom-2 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] min-w-[28px]"
                          :aria-label="`Mark all ${entry.count} notifications as read`"
                          title="Mark all as read"
                          @click.stop.prevent="markGroupAllRead(entry)"
                        >
                          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 0-1.408-1.42L8 11.293 4.707 8a1 1 0 0 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l8-8.125Z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      </button>

                      <div
                        v-if="isGroupOpen(entry.key)"
                        class="mt-1 space-y-1"
                      >
                        <NotificationItem
                          v-for="n in entry.expandedItems"
                          :key="n.id"
                          :item="n"
                          :app-key="appKey"
                          :show-actions="true"
                          @navigated="$emit('close')"
                          @snooze="handleSnooze"
                        />
                      </div>
                    </div>
                  </template>
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
          <footer class="px-4 py-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <router-link
              to="/settings?tab=notifications&notificationPage=overview"
              class="block text-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              @click="$emit('close')"
            >
              Notification settings
            </router-link>
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

function handleSnooze(payload) {
  // Smart Snooze v1 is UI-only and localStorage-based (device-only).
  // Payload: { id, until, label }
  store.snoozeNotification(payload);
}

// Snoozed notifications are hidden from the list and do not contribute to grouping.
const items = computed(() => store.items.filter(n => !store.isSnoozed(n.id)));
const hasUnread = computed(() => store.hasUnread);
const loading = computed(() => store.loading);
const canLoadMore = computed(() => !!store.nextCursor && !loading.value);
const showOfflineBanner = computed(() => props.appKey === 'AUDIT' && isOffline.value);

// Track when drawer opened to show "New" divider
const openedAt = ref(null);
const openEntityGroups = ref(new Set()); // non-persistent, resets when drawer closes

// SSE stream connection
let streamDisconnect = null;

function formatRelative(date) {
  return store.formatRelative(date);
}

function formatEntityType(type) {
  if (!type) return 'Notification';
  return String(type)
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function getEntityKey(n) {
  const t = n?.entity?.type;
  const id = n?.entity?.id;
  if (!t || !id) return null;
  return `${String(t)}:${String(id)}`;
}

function buildSectionEntries(list) {
  const entries = [];
  const groupsByKey = new Map(); // key -> { key, latest, items }

  for (const n of list) {
    const key = getEntityKey(n);
    if (!key) {
      entries.push({ kind: 'item', key: `item:${n.id}`, item: n });
      continue;
    }

    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        key,
        latest: n, // first occurrence is newest
        items: [n]
      };
      groupsByKey.set(key, group);
      entries.push({ kind: 'group', key, _groupRef: group });
    } else {
      group.items.push(n);
    }
  }

  // Finalize placeholders: only create a group row if there are multiple notifications for the entity.
  return entries.map((e) => {
    if (e.kind === 'item') return e;
    const g = e._groupRef;
    if (!g || g.items.length <= 1) {
      const single = g?.items?.[0];
      return { kind: 'item', key: `item:${single.id}`, item: single };
    }

    const latest = g.latest;
    const entityTitle =
      latest?.entity?.title ||
      latest?.entity?.name ||
      formatEntityType(latest?.entity?.type);

    const expandedItems = [...g.items].reverse(); // chronological (oldest → newest)
    const unreadCount = g.items.filter(x => !x.readAt).length;

    return {
      kind: 'group',
      key: g.key,
      entityTitle,
      latest,
      summaryText: latest?.title || latest?.body || 'Notification',
      count: g.items.length,
      unreadCount,
      expandedItems
    };
  });
}

const groupedSections = computed(() => {
  const now = new Date();
  const today = [];
  const earlier = [];

  for (const n of items.value) {
    const created = new Date(n.createdAt);
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) today.push(n);
    else earlier.push(n);
  }

  return [
    { label: 'Today', entries: buildSectionEntries(today) },
    { label: 'Earlier', entries: buildSectionEntries(earlier) }
  ].filter(s => s.entries.length);
});

function isGroupOpen(key) {
  return openEntityGroups.value.has(key);
}

function toggleGroup(key) {
  const next = new Set(openEntityGroups.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  openEntityGroups.value = next;
}

async function markGroupAllRead(entry) {
  if (!entry?.expandedItems?.length) return;
  // Use existing per-notification markRead logic (no new API)
  for (const n of entry.expandedItems) {
    if (!n.readAt) {
      await store.markRead(n.id);
    }
  }
}

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
      openEntityGroups.value = new Set(); // reset (non-persistent)
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
      openEntityGroups.value = new Set(); // reset (non-persistent)
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


