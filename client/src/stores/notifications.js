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

  const currentAppKey = () => {
    // Derive from route or allowed apps; keep simple for now:
    const path = window.location.pathname || '';
    if (path.startsWith('/audit/')) return 'AUDIT';
    if (path.startsWith('/portal/')) return 'PORTAL';
    return 'CRM';
  };

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
    try {
      const res = await fetch(buildQuery({ unreadOnly: true, limit: 1 }), {
        headers: buildHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      
      // Use unreadCount from API if available (more accurate)
      if (data.unreadCount !== undefined && data.unreadCount !== null) {
        unreadCount.value = data.unreadCount;
      } else {
        // Fallback: fetch actual unread notifications to count them
        // Only use this if API doesn't provide count
        const fullRes = await fetch(buildQuery({ unreadOnly: true, limit: 100 }), {
          headers: buildHeaders()
        });
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          unreadCount.value = (fullData.items || []).length;
        } else {
          // Last resort: use preview data length
          const list = data.items || [];
          unreadCount.value = list.length > 0 ? 1 : 0;
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
      unreadCount.value = items.value.filter(n => !n.readAt).length;
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
      if (unreadCount.value > 0) unreadCount.value -= 1;
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
        unreadCount.value += 1;
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
    unreadCount.value = items.value.filter(n => !n.readAt).length;

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
    currentAppKey
  };
});


