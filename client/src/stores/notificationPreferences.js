import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient';
import { useNotificationStore } from './notifications';

/**
 * Notification preferences store
 *
 * Uses existing backend APIs:
 * - GET  /api/notification-preferences
 * - PUT  /api/notification-preferences
 *
 * The backend:
 * - Handles per-user, per-app scoping
 * - Bootstraps default values
 * - Merges preference payloads safely
 *
 * This store is intentionally UI-only: it does not invent new
 * event types or backend semantics. It just reads and writes
 * the preference map provided by the server.
 */
export const useNotificationPreferencesStore = defineStore('notificationPreferences', () => {
  const rawPreferences = ref(null); // Whatever shape backend returns
  const loading = ref(false);
  const error = ref(null);
  const saving = ref(false);
  const lastSavedAt = ref(null);

  // Used to rollback optimistic changes on error
  let lastSnapshot = null;

  const notificationStore = useNotificationStore();

  const currentAppKey = computed(() => notificationStore.currentAppKey());

  const appPreferences = computed(() => {
    if (!rawPreferences.value) return {};
    const appKey = currentAppKey.value;
    const apps = rawPreferences.value.apps || rawPreferences.value.app || {};
    return apps[appKey] || {};
  });

  const hasLoaded = computed(() => !!rawPreferences.value);

  async function fetchPreferences() {
    loading.value = true;
    error.value = null;
    try {
      const appKey = currentAppKey.value;
      if (!appKey) {
        throw new Error('Cannot determine app context');
      }
      
      // Backend expects appKey as query parameter and returns { appKey, events: {...} }
      const data = await apiClient.get('/notification-preferences', {
        params: { appKey }
      });
      
      // Transform backend format { appKey, events: {...} } to frontend format { apps: { [appKey]: {...} } }
      // Backend events format: { [eventType]: { inApp: boolean, email: boolean } }
      // Frontend expects: { apps: { [appKey]: { [eventType]: { inApp: { enabled, available }, email: { enabled, available } } } } }
      const transformed = {
        apps: {
          [appKey]: {}
        }
      };
      
      if (data && data.events) {
        Object.entries(data.events).forEach(([eventType, channels]) => {
          // Phase 14: Handle both legacy boolean format and new structure format
          transformed.apps[appKey][eventType] = {
            inApp: {
              enabled: typeof channels.inApp === 'boolean' ? channels.inApp : (channels.inApp?.enabled || false),
              available: typeof channels.inApp === 'boolean' ? true : (channels.inApp?.available !== false)
            },
            email: {
              enabled: typeof channels.email === 'boolean' ? channels.email : (channels.email?.enabled || false),
              available: typeof channels.email === 'boolean' ? true : (channels.email?.available !== false)
            },
            push: {
              enabled: channels.push?.enabled || false,
              available: channels.push?.available !== false
            },
            whatsapp: {
              enabled: channels.whatsapp?.enabled || false,
              available: channels.whatsapp?.available !== false
            },
            sms: {
              enabled: channels.sms?.enabled || false,
              available: channels.sms?.available !== false
            }
          };
        });
      }
      
      rawPreferences.value = transformed;
      lastSnapshot = JSON.parse(JSON.stringify(rawPreferences.value));
    } catch (e) {
      console.error('[notificationPreferences] fetchPreferences error:', e);
      error.value = e.message || 'Failed to load notification preferences';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Apply optimistic update immediately (for instant UI feedback)
   */
  function applyOptimisticUpdate({ eventType, channel, enabled }) {
    if (!eventType || !channel) return;
    if (!rawPreferences.value) return;

    const appKey = currentAppKey.value;

    // Ensure app container exists locally
    if (!rawPreferences.value.apps) {
      rawPreferences.value.apps = {};
    }
    const apps = rawPreferences.value.apps;
    if (!apps[appKey]) {
      apps[appKey] = {};
    }

    const appPrefs = apps[appKey];
    if (!appPrefs[eventType]) {
      appPrefs[eventType] = {
        inApp: { enabled: false, available: true },
        email: { enabled: false, available: true },
        push: { enabled: false, available: false },
        whatsapp: { enabled: false, available: false },
        sms: { enabled: false, available: false }
      };
    }

    const current = appPrefs[eventType][channel] || { enabled: false, available: true };

    // If channel is not available, don't allow toggling
    if (current.available === false) {
      return false;
    }

    // Apply optimistic update by creating completely new object structure
    // This ensures Vue's reactivity system detects the change
    const updatedApps = {};
    
    // Copy all apps, updating only the current app
    // Create new objects at every level to ensure Vue reactivity
    Object.keys(apps).forEach(key => {
      if (key === appKey) {
        // Create new object for the current app with updated event
        const updatedAppPrefs = {};
        
        // Copy all existing events, creating new objects for each
        Object.keys(appPrefs).forEach(evtType => {
          if (evtType === eventType) {
            // Update the specific event with new channel value
            updatedAppPrefs[evtType] = {
              inApp: { ...appPrefs[evtType].inApp },
              email: { ...appPrefs[evtType].email },
              push: { ...(appPrefs[evtType].push || { enabled: false, available: false }) },
              whatsapp: { ...(appPrefs[evtType].whatsapp || { enabled: false, available: false }) },
              sms: { ...(appPrefs[evtType].sms || { enabled: false, available: false }) },
              [channel]: {
                ...(appPrefs[evtType][channel] || { enabled: false, available: false }),
                enabled
              }
            };
          } else {
            // Copy other events with new objects to ensure reactivity
            updatedAppPrefs[evtType] = {
              inApp: { ...appPrefs[evtType].inApp },
              email: { ...appPrefs[evtType].email },
              push: { ...(appPrefs[evtType].push || { enabled: false, available: false }) },
              whatsapp: { ...(appPrefs[evtType].whatsapp || { enabled: false, available: false }) },
              sms: { ...(appPrefs[evtType].sms || { enabled: false, available: false }) }
            };
          }
        });
        
        // If event doesn't exist yet, create it
        if (!updatedAppPrefs[eventType]) {
          updatedAppPrefs[eventType] = {
            inApp: { enabled: false, available: true },
            email: { enabled: false, available: true },
            push: { enabled: false, available: false },
            whatsapp: { enabled: false, available: false },
            sms: { enabled: false, available: false },
            [channel]: { enabled, available: channel === 'push' || channel === 'whatsapp' || channel === 'sms' ? false : true }
          };
        }
        
        updatedApps[key] = updatedAppPrefs;
      } else {
        // Create new object for other apps too (shallow copy is fine)
        updatedApps[key] = { ...apps[key] };
      }
    });
    
    // Reassign the entire rawPreferences to trigger reactivity
    // Create a completely new object structure to ensure Vue detects the change
    rawPreferences.value = {
      apps: updatedApps
    };

    // Force computed to re-evaluate by accessing it
    const testAppPrefs = appPreferences.value;
    const testEvent = testAppPrefs[eventType];
    
    console.log('[notificationPreferences] Optimistic update applied:', {
      appKey,
      eventType,
      channel,
      enabled,
      currentValue: rawPreferences.value.apps[appKey]?.[eventType]?.[channel],
      hasApp: !!rawPreferences.value.apps[appKey],
      hasEvent: !!rawPreferences.value.apps[appKey]?.[eventType],
      appPrefsAfter: testEvent,
      inAppEnabled: testEvent?.inApp?.enabled,
      emailEnabled: testEvent?.email?.enabled
    });

    return true;
  }

  /**
   * Update a single event/channel preference (optimistic).
   *
   * Backend expects a merge payload; we send only the relevant
   * portion of the structure and let it handle bootstrapping
   * and validation.
   *
   * @param {Object} payload
   * @param {string} payload.eventType - Event key as provided by backend
   * @param {string} payload.channel - 'inApp' | 'email' (UI names only)
   * @param {boolean} payload.enabled - New value
   */
  async function updatePreference({ eventType, channel, enabled }) {
    if (!eventType || !channel) return;
    if (!rawPreferences.value) return;

    const appKey = currentAppKey.value;

    // Snapshot for rollback (before API call)
    lastSnapshot = JSON.parse(JSON.stringify(rawPreferences.value));

    saving.value = true;
    error.value = null;

    try {
      // Backend expects: { appKey, events: { [eventType]: { inApp: boolean, email: boolean } } }
      // Get current state for this event to preserve the other channels
      const apps = rawPreferences.value.apps || {};
      const appPrefs = apps[appKey] || {};
      const currentEvent = appPrefs[eventType] || {
        inApp: { enabled: false, available: true },
        email: { enabled: false, available: true },
        push: { enabled: false, available: false },
        whatsapp: { enabled: false, available: false },
        sms: { enabled: false, available: false }
      };
      
      // Phase 14: Build payload with full channel structure
      const payload = {
        appKey,
        events: {
          [eventType]: {
            inApp: channel === 'inApp' ? enabled : (typeof currentEvent.inApp === 'object' ? currentEvent.inApp.enabled : currentEvent.inApp),
            email: channel === 'email' ? enabled : (typeof currentEvent.email === 'object' ? currentEvent.email.enabled : currentEvent.email),
            push: channel === 'push' ? { enabled, available: currentEvent.push?.available !== false } : currentEvent.push,
            whatsapp: channel === 'whatsapp' ? { enabled, available: currentEvent.whatsapp?.available !== false } : currentEvent.whatsapp,
            sms: channel === 'sms' ? { enabled, available: currentEvent.sms?.available !== false } : currentEvent.sms
          }
        }
      };

      const data = await apiClient.put('/notification-preferences', payload);
      
      // Transform backend response back to frontend format
      if (data && data.events) {
        const transformed = {
          apps: {
            [appKey]: {}
          }
        };
        
        Object.entries(data.events).forEach(([evtType, channels]) => {
          // Phase 14: Handle both legacy boolean format and new structure format
          transformed.apps[appKey][evtType] = {
            inApp: {
              enabled: typeof channels.inApp === 'boolean' ? channels.inApp : (channels.inApp?.enabled || false),
              available: typeof channels.inApp === 'boolean' ? true : (channels.inApp?.available !== false)
            },
            email: {
              enabled: typeof channels.email === 'boolean' ? channels.email : (channels.email?.enabled || false),
              available: typeof channels.email === 'boolean' ? true : (channels.email?.available !== false)
            },
            push: {
              enabled: channels.push?.enabled || false,
              available: channels.push?.available !== false
            },
            whatsapp: {
              enabled: channels.whatsapp?.enabled || false,
              available: channels.whatsapp?.available !== false
            },
            sms: {
              enabled: channels.sms?.enabled || false,
              available: channels.sms?.available !== false
            }
          };
        });
        
        rawPreferences.value = transformed;
      }
      
      lastSnapshot = JSON.parse(JSON.stringify(rawPreferences.value));
      lastSavedAt.value = new Date().toISOString();
    } catch (e) {
      console.error('[notificationPreferences] updatePreference error, rolling back:', e);
      // Rollback optimistic changes
      if (lastSnapshot) {
        rawPreferences.value = JSON.parse(JSON.stringify(lastSnapshot));
      }
      error.value = e.message || 'Failed to save notification preferences';
    } finally {
      saving.value = false;
    }
  }

  return {
    rawPreferences,
    appPreferences,
    loading,
    saving,
    error,
    lastSavedAt,
    hasLoaded,
    fetchPreferences,
    updatePreference,
    applyOptimisticUpdate
  };
});


