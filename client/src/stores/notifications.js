import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';
import dateUtils from '@/utils/dateUtils';

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const nextCursor = ref(null);
  const authStore = useAuthStore();

  const hasUnread = computed(() => unreadCount.value > 0);

  /**
   * Smart Snooze v1 (UI-only)
   * - localStorage-based (device-only, not cross-device)
   * - no backend/API changes
   * - snoozed notifications are hidden from UI lists and excluded from unread badge
   */
  const snoozesByApp = ref({}); // { [appKey]: { [id]: { until: number, wasUnread: boolean, label: string } } }
  const snoozeTimers = new Map(); // key: `${appKey}:${id}` -> timeout

  const currentAppKey = () => {
    // Derive from route or allowed apps; keep simple for now:
    const path = window.location.pathname || '';
    if (path.startsWith('/audit/')) return 'AUDIT';
    if (path.startsWith('/portal/')) return 'PORTAL';
    return 'SALES';
  };

  function snoozeStorageKey() {
    const userId = authStore.user?._id || authStore.user?.id || 'anon';
    return `notification_snooze_v1:${userId}`;
  }

  function loadSnoozesFromStorage() {
    try {
      const raw = localStorage.getItem(snoozeStorageKey());
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object') {
        snoozesByApp.value = {};
        return;
      }

      // Prune expired entries
      const now = Date.now();
      const cleaned = {};
      Object.entries(parsed).forEach(([appKey, map]) => {
        if (!map || typeof map !== 'object') return;
        const next = {};
        Object.entries(map).forEach(([id, entry]) => {
          const until = entry?.until;
          if (typeof until === 'number' && until > now) {
            next[id] = {
              until,
              wasUnread: !!entry.wasUnread,
              label: String(entry.label || '')
            };
          }
        });
        if (Object.keys(next).length) cleaned[appKey] = next;
      });
      snoozesByApp.value = cleaned;

      // Schedule unsnooze timers for all loaded entries
      Object.entries(cleaned).forEach(([appKey, map]) => {
        Object.entries(map || {}).forEach(([id, entry]) => {
          if (typeof entry?.until === 'number') {
            scheduleUnsnooze(appKey, id, entry.until);
          }
        });
      });
    } catch (e) {
      console.warn('[notifications] Failed to load snoozes from storage:', e);
      snoozesByApp.value = {};
    }
  }

  function persistSnoozesToStorage() {
    try {
      localStorage.setItem(snoozeStorageKey(), JSON.stringify(snoozesByApp.value || {}));
    } catch (e) {
      // Never block UI for storage failures
      console.warn('[notifications] Failed to persist snoozes to storage:', e);
    }
  }

  function getSnoozeMap(appKey) {
    const root = snoozesByApp.value || {};
    const map = root[appKey];
    return map && typeof map === 'object' ? map : {};
  }

  function isSnoozed(id, appKey = currentAppKey()) {
    if (!id) return false;
    const entry = getSnoozeMap(appKey)[id];
    return typeof entry?.until === 'number' && entry.until > Date.now();
  }

  function getSnoozedUntil(id, appKey = currentAppKey()) {
    const entry = getSnoozeMap(appKey)[id];
    return typeof entry?.until === 'number' ? entry.until : null;
  }

  function scheduleUnsnooze(appKey, id, until) {
    const key = `${appKey}:${id}`;
    const existing = snoozeTimers.get(key);
    if (existing) clearTimeout(existing);
    const delay = Math.max(0, until - Date.now());
    const t = setTimeout(() => {
      snoozeTimers.delete(key);
      // Remove entry
      const current = snoozesByApp.value || {};
      const map = { ...(current[appKey] || {}) };
      const entry = map[id];
      delete map[id];
      snoozesByApp.value = { ...current, [appKey]: map };
      persistSnoozesToStorage();

      // If it was unread when snoozed and is still unread, re-add to unread badge
      const item = items.value.find(n => n.id === id);
      const stillUnread = item && !item.readAt;
      if (entry?.wasUnread && stillUnread) {
        unreadCount.value += 1;
      }
    }, delay);
    snoozeTimers.set(key, t);
  }

  function snoozeNotification({ id, until, label }) {
    if (!id || typeof until !== 'number') return;
    const appKey = currentAppKey();
    if (!Object.keys(snoozesByApp.value || {}).length) {
      loadSnoozesFromStorage();
    }

    const existingUntil = getSnoozedUntil(id, appKey);
    if (existingUntil && existingUntil > Date.now()) {
      // Already snoozed; update to latest selection
    }

    const item = items.value.find(n => n.id === id);
    const wasUnread = !!(item && !item.readAt);

    // Update unread badge immediately (snoozed notifications do not count)
    if (wasUnread && !isSnoozed(id, appKey) && unreadCount.value > 0) {
      unreadCount.value -= 1;
    }

    const root = snoozesByApp.value || {};
    const map = { ...(root[appKey] || {}) };
    map[id] = { until, wasUnread, label: String(label || '') };
    snoozesByApp.value = { ...root, [appKey]: map };
    persistSnoozesToStorage();
    scheduleUnsnooze(appKey, id, until);
  }

  function syncSnoozeUnreadFlags(appKey = currentAppKey()) {
    const root = snoozesByApp.value || {};
    const map = root[appKey];
    if (!map || typeof map !== 'object') return;
    let changed = false;
    const next = { ...map };
    Object.entries(next).forEach(([id, entry]) => {
      const item = items.value.find(n => n.id === id);
      if (item && item.readAt && entry?.wasUnread) {
        next[id] = { ...entry, wasUnread: false };
        changed = true;
      }
    });
    if (changed) {
      snoozesByApp.value = { ...root, [appKey]: next };
      persistSnoozesToStorage();
    }
  }

  const buildQuery = (params = {}) => {
    const search = new URLSearchParams();
    search.set('appKey', currentAppKey());
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    return `/api/notifications?${search.toString()}`;
  };

  const buildHeaders = (extra = {}) => {
    const headers = {
      Accept: 'application/json',
      ...extra
    };
    const token = authStore.user?.token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  async function fetchUnreadPreview() {
    // Skip if not authenticated
    if (!authStore.isAuthenticated) return;
    // Ensure snoozes loaded (affects unread badge)
    if (!Object.keys(snoozesByApp.value || {}).length) {
      loadSnoozesFromStorage();
    }
    try {
      const res = await fetch(buildQuery({ unreadOnly: true, limit: 1 }), {
        headers: buildHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      
      // Use unreadCount from API if available (more accurate)
      if (data.unreadCount !== undefined && data.unreadCount !== null) {
        const appKey = currentAppKey();
        const snoozedUnread = Object.values(getSnoozeMap(appKey)).filter(e => e?.wasUnread).length;
        unreadCount.value = Math.max(0, data.unreadCount - snoozedUnread);
      } else {
        // Fallback: fetch actual unread notifications to count them
        // Only use this if API doesn't provide count
        const fullRes = await fetch(buildQuery({ unreadOnly: true, limit: 100 }), {
          headers: buildHeaders()
        });
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          const appKey = currentAppKey();
          const list = fullData.items || [];
          unreadCount.value = list.filter(n => !isSnoozed(n.id, appKey)).length;
        } else {
          // Last resort: use preview data length
          const list = data.items || [];
          const appKey = currentAppKey();
          unreadCount.value = list.some(n => !isSnoozed(n.id, appKey)) ? 1 : 0;
        }
      }
    } catch (err) {
      console.error('[notifications] fetchUnreadPreview error:', err);
    }
  }

  async function fetchNotifications(options = {}) {
    if (!authStore.isAuthenticated) return;
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    if (!Object.keys(snoozesByApp.value || {}).length) {
      loadSnoozesFromStorage();
    }

    const params = {
      unreadOnly: options.unreadOnly ? 'true' : undefined,
      limit: options.limit || 20,
      cursor: options.cursor || null
    };

    try {
      const res = await fetch(buildQuery(params), {
        headers: buildHeaders()
      });
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      const incoming = data.items || [];

      if (!options.cursor) {
        items.value = incoming;
      } else {
        items.value = [...items.value, ...incoming];
      }

      nextCursor.value = data.nextCursor || null;
      const appKey = currentAppKey();
      syncSnoozeUnreadFlags(appKey);
      unreadCount.value = items.value.filter(n => !n.readAt && !isSnoozed(n.id, appKey)).length;
    } catch (err) {
      console.error('[notifications] fetchNotifications error:', err);
      error.value = err.message || 'Failed to load notifications';
    } finally {
      loading.value = false;
    }
  }

  async function markRead(id) {
    if (!id) return;
    if (!authStore.isAuthenticated) return;
    // Optimistic update
    const target = items.value.find(n => n.id === id);
    const wasUnread = target && !target.readAt;
    if (target && !target.readAt) {
      target.readAt = new Date().toISOString();
      // Snoozed notifications are already excluded from unread badge
      if (!isSnoozed(id) && unreadCount.value > 0) unreadCount.value -= 1;
    }

    try {
      const res = await fetch(`/api/notifications/${id}/read?appKey=${currentAppKey()}`, {
        method: 'POST',
        headers: buildHeaders()
      });
      if (!res.ok) throw new Error('Failed to mark read');
    } catch (err) {
      console.error('[notifications] markRead error:', err);
      if (wasUnread && target) {
        // Rollback optimistic change if needed
        target.readAt = null;
        if (!isSnoozed(id)) unreadCount.value += 1;
      }
    }
  }

  async function markAllRead() {
    if (!hasUnread.value) return;
    if (!authStore.isAuthenticated) return;
    const appKey = currentAppKey();

    // Optimistic update
    const previous = items.value.map(n => ({ id: n.id, readAt: n.readAt }));
    items.value.forEach(n => {
      if (!n.readAt) n.readAt = new Date().toISOString();
    });
    const previousUnread = unreadCount.value;
    unreadCount.value = 0;

    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ appKey })
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    } catch (err) {
      console.error('[notifications] markAllRead error:', err);
      // Roll back optimistic update
      previous.forEach(old => {
        const current = items.value.find(n => n.id === old.id);
        if (current) current.readAt = old.readAt || null;
      });
      unreadCount.value = previousUnread;
    }
  }

  function resetState() {
    items.value = [];
    unreadCount.value = 0;
    nextCursor.value = null;
    error.value = null;
  }

  function formatRelative(date) {
    return dateUtils.fromNow(date);
  }

  /**
   * Handle incoming notification from SSE stream.
   * Deduplicates by id, prepends to list, updates unread count.
   * 
   * @param {Object} notification - Notification payload from SSE
   */
  function handleIncomingNotification(notification) {
    if (!notification || !notification.id) {
      console.warn('[notifications] Invalid incoming notification:', notification);
      return;
    }

    // Deduplicate - check if already exists
    const existingIndex = items.value.findIndex(n => n.id === notification.id);
    if (existingIndex >= 0) {
      // Already exists, skip
      return;
    }

    // Prepend to list (newest first)
    items.value.unshift({
      id: notification.id,
      eventType: notification.eventType,
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      entity: notification.entity,
      readAt: null, // New notifications are unread
      createdAt: notification.createdAt
    });

    // Update unread count
    const appKey = currentAppKey();
    unreadCount.value = items.value.filter(n => !n.readAt && !isSnoozed(n.id, appKey)).length;

    console.log(`[notifications] Incoming notification: ${notification.id} (${notification.title})`);
  }

  return {
    items,
    unreadCount,
    hasUnread,
    loading,
    error,
    nextCursor,
    fetchUnreadPreview,
    fetchNotifications,
    markRead,
    markAllRead,
    resetState,
    formatRelative,
    handleIncomingNotification,
    currentAppKey,
    // Snooze v1
    isSnoozed,
    getSnoozedUntil,
    snoozeNotification
  };
});


