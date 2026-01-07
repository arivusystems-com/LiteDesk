/**
 * Offline State Composable
 * 
 * Manages online/offline state and provides utilities for offline mode
 */

import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const onlineListeners = [];

/**
 * Check if currently online
 */
export const useOffline = () => {
  const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine;
    onlineListeners.forEach(listener => {
      try {
        listener(isOnline.value);
      } catch (error) {
        console.error('[useOffline] Listener error:', error);
      }
    });
  };

  onMounted(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  });

  const onOnlineChange = (callback) => {
    onlineListeners.push(callback);
    return () => {
      const index = onlineListeners.indexOf(callback);
      if (index > -1) {
        onlineListeners.splice(index, 1);
      }
    };
  };

  return {
    isOnline,
    isOffline: computed(() => !isOnline.value),
    onOnlineChange
  };
};

