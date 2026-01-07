/**
 * Audit Sync Engine
 * 
 * Handles synchronization of offline actions when back online.
 * 
 * Rules:
 * - No auto background sync
 * - User must trigger sync explicitly
 * - Stop on first failure
 * - CRM errors surfaced verbatim
 * - State mismatch aborts sync
 */

import { listPendingActions, markSynced, markFailed } from './offlineQueue.js';
import apiClient from '@/utils/apiClient.js';

let isSyncing = false;
let syncCallbacks = [];

/**
 * Check if currently syncing
 */
export const isSyncInProgress = () => isSyncing;

/**
 * Register sync status callback
 */
export const onSyncStatusChange = (callback) => {
  syncCallbacks.push(callback);
  return () => {
    syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
  };
};

const notifySyncStatus = (status, data = {}) => {
  syncCallbacks.forEach(cb => {
    try {
      cb(status, data);
    } catch (error) {
      console.error('[SyncEngine] Callback error:', error);
    }
  });
};

/**
 * Execute a single action
 */
const executeAction = async (action) => {
  const { type, eventId, payload } = action;

  try {
    let response;

    switch (type) {
      case 'CHECK_IN':
        response = await apiClient.post(`/audit/execute/${eventId}/check-in`, payload);
        break;
      
      case 'SUBMIT':
        response = await apiClient.post(`/audit/execute/${eventId}/submit`, payload);
        break;
      
      default:
        throw new Error(`Unknown action type: ${type}`);
    }

    if (response.success) {
      await markSynced(action.id);
      return { success: true, action };
    } else {
      throw new Error(response.message || 'Action failed');
    }
  } catch (error) {
    // Check for specific error conditions
    if (error.status === 409) {
      // Conflict - audit state changed
      throw new Error('Audit state has changed. Please refresh and try again.');
    }
    if (error.status === 403) {
      // Forbidden - ownership changed
      throw new Error('You no longer have access to this audit.');
    }
    
    await markFailed(action.id, error.message || 'Sync failed');
    throw error;
  }
};

/**
 * Sync all pending actions
 * 
 * @param {object} options
 * @param {function} options.onProgress - Progress callback (current, total, action)
 * @returns {Promise<object>} Sync result
 */
export const syncPendingActions = async (options = {}) => {
  if (isSyncing) {
    throw new Error('Sync already in progress');
  }

  // Check online status
  if (!navigator.onLine) {
    throw new Error('You are offline. Please check your connection.');
  }

  isSyncing = true;
  notifySyncStatus('started');

  try {
    const pendingActions = await listPendingActions();
    
    if (pendingActions.length === 0) {
      isSyncing = false;
      notifySyncStatus('completed', { synced: 0, failed: 0, total: 0 });
      return {
        success: true,
        synced: 0,
        failed: 0,
        total: 0,
        errors: []
      };
    }

    notifySyncStatus('progress', { current: 0, total: pendingActions.length });

    const results = {
      synced: 0,
      failed: 0,
      total: pendingActions.length,
      errors: []
    };

    // Execute actions in FIFO order
    for (let i = 0; i < pendingActions.length; i++) {
      const action = pendingActions[i];
      
      notifySyncStatus('progress', { 
        current: i + 1, 
        total: pendingActions.length,
        action 
      });

      if (options.onProgress) {
        options.onProgress(i + 1, pendingActions.length, action);
      }

      try {
        await executeAction(action);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          action,
          error: error.message || 'Unknown error'
        });

        // Stop on first failure (as per requirements)
        console.error('[SyncEngine] Stopping sync due to error:', error);
        break;
      }
    }

    isSyncing = false;
    notifySyncStatus('completed', results);

    return {
      success: results.failed === 0,
      ...results
    };
  } catch (error) {
    isSyncing = false;
    notifySyncStatus('error', { error: error.message });
    throw error;
  }
};

/**
 * Check if there are pending actions
 */
export const hasPendingActions = async () => {
  const pending = await listPendingActions();
  return pending.length > 0;
};

