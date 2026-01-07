/**
 * IndexedDB Abstraction for Audit App Offline Support
 * 
 * Stores:
 * - audit_assignments: Read cache of audit assignments
 * - audit_details: Read cache of audit details and form schemas
 * - audit_timeline: Read cache of timeline entries
 * - offline_actions: Write buffer for queued actions
 * 
 * Rules:
 * - Read caches are read-only (updated by sync)
 * - offline_actions is append-only
 * - All data scoped per organization
 * - Clear all on logout
 */

const DB_NAME = 'audit_app_db';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Initialize IndexedDB
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[IndexedDB] Database opened successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store: audit_assignments
      if (!db.objectStoreNames.contains('audit_assignments')) {
        const assignmentsStore = db.createObjectStore('audit_assignments', { keyPath: 'eventId' });
        assignmentsStore.createIndex('dueAt', 'dueAt', { unique: false });
        assignmentsStore.createIndex('auditState', 'auditState', { unique: false });
        assignmentsStore.createIndex('lastSyncedAt', 'lastSyncedAt', { unique: false });
      }

      // Store: audit_details
      if (!db.objectStoreNames.contains('audit_details')) {
        const detailsStore = db.createObjectStore('audit_details', { keyPath: 'eventId' });
        detailsStore.createIndex('lastSyncedAt', 'lastSyncedAt', { unique: false });
      }

      // Store: audit_timeline
      if (!db.objectStoreNames.contains('audit_timeline')) {
        const timelineStore = db.createObjectStore('audit_timeline', { keyPath: 'eventId' });
        timelineStore.createIndex('lastSyncedAt', 'lastSyncedAt', { unique: false });
      }

      // Store: offline_actions
      if (!db.objectStoreNames.contains('offline_actions')) {
        const actionsStore = db.createObjectStore('offline_actions', { keyPath: 'id', autoIncrement: true });
        actionsStore.createIndex('eventId', 'eventId', { unique: false });
        actionsStore.createIndex('type', 'type', { unique: false });
        actionsStore.createIndex('status', 'status', { unique: false });
        actionsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      console.log('[IndexedDB] Database schema created');
    };
  });
};

/**
 * Get database instance
 */
const getDB = async () => {
  if (!dbInstance) {
    await initDB();
  }
  return dbInstance;
};

/**
 * Clear all data (called on logout)
 */
export const clearAllData = async () => {
  try {
    const db = await getDB();
    const stores = ['audit_assignments', 'audit_details', 'audit_timeline', 'offline_actions'];
    
    await Promise.all(
      stores.map((storeName) => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const clearRequest = store.clear();
          
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(clearRequest.error);
        });
      })
    );
    
    console.log('[IndexedDB] All data cleared');
  } catch (error) {
    console.error('[IndexedDB] Error clearing data:', error);
    throw error;
  }
};

// ============================================================================
// AUDIT ASSIGNMENTS (Read Cache)
// ============================================================================

export const saveAssignments = async (assignments) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['audit_assignments'], 'readwrite');
    const store = transaction.objectStore('audit_assignments');

    await Promise.all(
      assignments.map((assignment) => {
        return new Promise((resolve, reject) => {
          const data = {
            eventId: assignment.eventId,
            assignmentId: assignment.assignmentId,
            auditType: assignment.auditType,
            auditState: assignment.auditState,
            scheduledAt: assignment.scheduledAt,
            dueAt: assignment.dueAt,
            status: assignment.status,
            lastSyncedAt: new Date().toISOString()
          };
          const request = store.put(data);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );

    console.log(`[IndexedDB] Saved ${assignments.length} assignments`);
  } catch (error) {
    console.error('[IndexedDB] Error saving assignments:', error);
    throw error;
  }
};

export const getAssignments = async () => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['audit_assignments'], 'readonly');
    const store = transaction.objectStore('audit_assignments');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting assignments:', error);
    return [];
  }
};

// ============================================================================
// AUDIT DETAILS (Read Cache)
// ============================================================================

export const saveAuditDetail = async (eventId, detail) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['audit_details'], 'readwrite');
    const store = transaction.objectStore('audit_details');

    return new Promise((resolve, reject) => {
      const data = {
        eventId,
        assignment: detail.assignment,
        event: detail.event,
        executionContext: detail.executionContext,
        lastSyncedAt: new Date().toISOString()
      };
      const request = store.put(data);
      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved audit detail for ${eventId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving audit detail:', error);
    throw error;
  }
};

export const getAuditDetail = async (eventId) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['audit_details'], 'readonly');
    const store = transaction.objectStore('audit_details');

    return new Promise((resolve, reject) => {
      const request = store.get(eventId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting audit detail:', error);
    return null;
  }
};

// ============================================================================
// AUDIT TIMELINE (Read Cache)
// ============================================================================

export const saveTimeline = async (eventId, timeline) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['audit_timeline'], 'readwrite');
    const store = transaction.objectStore('audit_timeline');

    return new Promise((resolve, reject) => {
      const data = {
        eventId,
        entries: timeline,
        lastSyncedAt: new Date().toISOString()
      };
      const request = store.put(data);
      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved timeline for ${eventId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving timeline:', error);
    throw error;
  }
};

export const getTimeline = async (eventId) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['audit_timeline'], 'readonly');
    const store = transaction.objectStore('audit_timeline');

    return new Promise((resolve, reject) => {
      const request = store.get(eventId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.entries : []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting timeline:', error);
    return [];
  }
};

// ============================================================================
// OFFLINE ACTIONS (Write Buffer)
// ============================================================================

export const saveOfflineAction = async (action) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['offline_actions'], 'readwrite');
    const store = transaction.objectStore('offline_actions');

    return new Promise((resolve, reject) => {
      const data = {
        type: action.type, // 'CHECK_IN' | 'SUBMIT'
        eventId: action.eventId,
        payload: action.payload,
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date().toISOString()
      };
      const request = store.add(data);
      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved offline action: ${action.type} for ${action.eventId}`);
        resolve(request.result); // Returns the auto-generated ID
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving offline action:', error);
    throw error;
  }
};

export const getPendingActions = async () => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['offline_actions'], 'readonly');
    const store = transaction.objectStore('offline_actions');
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll('PENDING');
      request.onsuccess = () => {
        // Sort by createdAt (FIFO)
        const actions = (request.result || []).sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        resolve(actions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting pending actions:', error);
    return [];
  }
};

export const getAllActions = async () => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['offline_actions'], 'readonly');
    const store = transaction.objectStore('offline_actions');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting all actions:', error);
    return [];
  }
};

export const updateActionStatus = async (id, status, errorMessage = null) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['offline_actions'], 'readwrite');
    const store = transaction.objectStore('offline_actions');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (!action) {
          reject(new Error('Action not found'));
          return;
        }

        action.status = status;
        if (status === 'FAILED') {
          action.retryCount = (action.retryCount || 0) + 1;
          action.errorMessage = errorMessage;
        } else if (status === 'SYNCED') {
          action.syncedAt = new Date().toISOString();
        }

        const updateRequest = store.put(action);
        updateRequest.onsuccess = () => {
          console.log(`[IndexedDB] Updated action ${id} to status ${status}`);
          resolve();
        };
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error updating action status:', error);
    throw error;
  }
};

export const deleteAction = async (id) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['offline_actions'], 'readwrite');
    const store = transaction.objectStore('offline_actions');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log(`[IndexedDB] Deleted action ${id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error deleting action:', error);
    throw error;
  }
};

