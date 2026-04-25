import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authRegistry';

const notifications = ref([]);
const unreadCount = ref(0);

// Request notification permission
const requestPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Show browser notification
const showNotification = (title, options = {}) => {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  }
};

// Create event notification
const notifyEvent = (event, type, message) => {
  const notification = {
    id: Date.now() + Math.random(),
    eventId: event.eventId || event._id,
    eventName: event.eventName || event.title,
    type,
    message,
    timestamp: new Date().toISOString(),
    read: false
  };
  
  notifications.value.unshift(notification);
  unreadCount.value++;
  
  // Save to localStorage
  saveNotifications();
  
  // Show browser notification
  showNotification(notification.eventName, {
    body: message,
    tag: `event-${notification.eventId}`
  });
  
  return notification;
};

// Mark notification as read
const markAsRead = (notificationId) => {
  const notification = notifications.value.find(n => n.id === notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    saveNotifications();
  }
};

// Mark all as read
const markAllAsRead = () => {
  notifications.value.forEach(n => {
    if (!n.read) {
      n.read = true;
    }
  });
  unreadCount.value = 0;
  saveNotifications();
};

// Clear notifications
const clearNotifications = () => {
  notifications.value = [];
  unreadCount.value = 0;
  saveNotifications();
};

// Save notifications to localStorage
const saveNotifications = () => {
  try {
    const authStore = useAuthStore();
    const userId = authStore.user?._id;
    if (userId) {
      localStorage.setItem(`eventNotifications_${userId}`, JSON.stringify(notifications.value));
      localStorage.setItem(`eventNotificationsUnread_${userId}`, unreadCount.value.toString());
    }
  } catch (error) {
    console.error('Error saving notifications:', error);
  }
};

// Load notifications from localStorage
const loadNotifications = () => {
  try {
    const authStore = useAuthStore();
    const userId = authStore.user?._id;
    if (userId) {
      const stored = localStorage.getItem(`eventNotifications_${userId}`);
      const storedUnread = localStorage.getItem(`eventNotificationsUnread_${userId}`);
      
      if (stored) {
        notifications.value = JSON.parse(stored);
      }
      if (storedUnread) {
        unreadCount.value = parseInt(storedUnread, 10) || 0;
      }
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
};

// Notification types
const NotificationTypes = {
  EVENT_ASSIGNED: 'assigned',
  EVENT_STARTED: 'started',
  EVENT_CHECK_IN: 'check_in',
  EVENT_CHECK_OUT: 'check_out',
  AUDIT_SUBMITTED: 'audit_submitted',
  AUDIT_NEEDS_REVIEW: 'audit_needs_review',
  CORRECTIVE_ACTION: 'corrective_action',
  EVENT_COMPLETED: 'completed',
  EVENT_REMINDER: 'reminder'
};

// Notification messages
const getNotificationMessage = (type, event) => {
  const messages = {
    [NotificationTypes.EVENT_ASSIGNED]: `You have been assigned to event: ${event.eventName}`,
    [NotificationTypes.EVENT_STARTED]: `Event "${event.eventName}" has been started`,
    [NotificationTypes.EVENT_CHECK_IN]: `Check-in completed for "${event.eventName}"`,
    [NotificationTypes.EVENT_CHECK_OUT]: `Check-out completed for "${event.eventName}"`,
    [NotificationTypes.AUDIT_SUBMITTED]: `Audit submitted for "${event.eventName}"`,
    [NotificationTypes.AUDIT_NEEDS_REVIEW]: `Audit "${event.eventName}" needs your review`,
    [NotificationTypes.CORRECTIVE_ACTION]: `Corrective action required for "${event.eventName}"`,
    [NotificationTypes.EVENT_COMPLETED]: `Event "${event.eventName}" has been completed`,
    [NotificationTypes.EVENT_REMINDER]: `Reminder: "${event.eventName}" starts soon`
  };
  
  return messages[type] || `Update for "${event.eventName}"`;
};

export function useEventNotifications() {
  onMounted(() => {
    requestPermission();
    loadNotifications();
  });
  
  return {
    notifications,
    unreadCount,
    notifyEvent,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    NotificationTypes,
    getNotificationMessage
  };
}

