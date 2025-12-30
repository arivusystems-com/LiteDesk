import { ref, onMounted, onUnmounted } from 'vue';
import apiClient from '@/utils/apiClient';

const isOnline = ref(navigator.onLine);
const pendingActions = ref([]);

// Listen for online/offline events
const handleOnline = () => {
  isOnline.value = true;
  syncPendingActions();
};

const handleOffline = () => {
  isOnline.value = false;
};

// Load pending actions from localStorage
const loadPendingActions = () => {
  try {
    const stored = localStorage.getItem('eventPendingActions');
    if (stored) {
      pendingActions.value = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading pending actions:', error);
  }
};

// Save pending actions to localStorage
const savePendingActions = () => {
  try {
    localStorage.setItem('eventPendingActions', JSON.stringify(pendingActions.value));
  } catch (error) {
    console.error('Error saving pending actions:', error);
  }
};

// Add action to pending queue
const queueAction = (action) => {
  const actionWithId = {
    ...action,
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString()
  };
  
  pendingActions.value.push(actionWithId);
  savePendingActions();
  
  // Try to execute immediately if online
  if (isOnline.value) {
    executeAction(actionWithId);
  }
  
  return actionWithId.id;
};

// Execute a single action
const executeAction = async (action) => {
  try {
    let response;
    
    switch (action.type) {
      case 'checkIn':
        response = await apiClient.post(`/events/${action.eventId}/check-in`, action.data);
        break;
      case 'checkOut':
        response = await apiClient.post(`/events/${action.eventId}/check-out`, action.data);
        break;
      case 'startEvent':
        response = await apiClient.post(`/events/${action.eventId}/start`, action.data);
        break;
      case 'submitAudit':
        response = await apiClient.post(`/events/${action.eventId}/submit-audit`, action.data);
        break;
      case 'createOrder':
        response = await apiClient.post(`/events/${action.eventId}/orders`, action.data);
        break;
      case 'completeEvent':
        response = await apiClient.post(`/events/${action.eventId}/complete`, action.data);
        break;
      default:
        console.warn('Unknown action type:', action.type);
        return;
    }
    
    if (response.success) {
      // Remove from pending
      pendingActions.value = pendingActions.value.filter(a => a.id !== action.id);
      savePendingActions();
      
      return { success: true, data: response.data };
    } else {
      throw new Error(response.message || 'Action failed');
    }
  } catch (error) {
    console.error('Error executing action:', error);
    // Keep in pending queue for retry
    return { success: false, error: error.message };
  }
};

// Sync all pending actions
const syncPendingActions = async () => {
  if (!isOnline.value || pendingActions.value.length === 0) return;
  
  const actions = [...pendingActions.value];
  const results = [];
  
  for (const action of actions) {
    const result = await executeAction(action);
    results.push({ action, result });
    
    // Small delay between actions
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};

// Cache event data for offline access
const cacheEvent = (event) => {
  try {
    const cacheKey = `event_${event.eventId || event._id}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      ...event,
      cachedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error caching event:', error);
  }
};

// Get cached event
const getCachedEvent = (eventId) => {
  try {
    const cacheKey = `event_${eventId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Error getting cached event:', error);
  }
  return null;
};

// Clear old cache entries (older than 7 days)
const clearOldCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    keys.forEach(key => {
      if (key.startsWith('event_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.cachedAt) {
            const cachedTime = new Date(data.cachedAt).getTime();
            if (now - cachedTime > sevenDays) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing old cache:', error);
  }
};

export function useEventOffline() {
  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadPendingActions();
    clearOldCache();
    
    // Try to sync on mount if online
    if (isOnline.value) {
      syncPendingActions();
    }
  });
  
  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });
  
  return {
    isOnline,
    pendingActions,
    queueAction,
    syncPendingActions,
    cacheEvent,
    getCachedEvent
  };
}

