import { ref } from 'vue';

const notifications = ref([]);

// Global function to show notification that persists across component unmounts
// This ensures notifications work even when called from components that are about to unmount
let globalSuccessFn = null;

export function setGlobalNotificationFn(fn) {
  globalSuccessFn = fn;
}

export function showGlobalNotification(message, duration = 5000) {
  if (globalSuccessFn) {
    console.log('📢 showGlobalNotification: Using registered function');
    globalSuccessFn(message, duration);
  } else {
    // Fallback: directly add to notifications array
    console.log('📢 showGlobalNotification: No registered function, using fallback');
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type: 'success',
      duration
    };
    notifications.value.push(notification);
    console.log('📢 showGlobalNotification: Notification added directly, total:', notifications.value.length);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        const index = notifications.value.findIndex(n => n.id === id);
        if (index > -1) {
          notifications.value.splice(index, 1);
        }
      }, duration);
    }
  }
}

export function useNotifications() {
  const remove = (id) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  const show = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration
    };

    notifications.value.push(notification);
    console.log('📢 Notification added:', notification, 'Total notifications:', notifications.value.length);
    console.log('📢 Notifications array:', JSON.parse(JSON.stringify(notifications.value)));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  };

  const success = (message, duration = 3000) => {
    console.log('📢 useNotifications.success called with:', message);
    const result = show(message, 'success', duration);
    console.log('📢 useNotifications.success returned:', result);
    return result;
  };

  const error = (message, duration = 4000) => {
    return show(message, 'error', duration);
  };

  const warning = (message, duration = 3500) => {
    return show(message, 'warning', duration);
  };

  const info = (message, duration = 3000) => {
    return show(message, 'info', duration);
  };

  return {
    notifications,
    show,
    remove,
    success,
    error,
    warning,
    info
  };
}

