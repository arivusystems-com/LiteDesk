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
    
    // Handle legacy boolean format: convert to object format
    // Get existing channel value, or use defaults if event doesn't exist
    let channelValue;
    if (appPrefs[eventType]) {
      channelValue = appPrefs[eventType][channel];
    } else {
      // Event doesn't exist yet - will be created below
      channelValue = undefined;
    }
    
    let current;
    if (typeof channelValue === 'boolean') {
      // Legacy format: boolean value means enabled, and it's available
      current = { enabled: channelValue, available: true };
    } else if (typeof channelValue === 'object' && channelValue !== null) {
      // New format: object with enabled and available
      current = channelValue;
    } else {
      // Default: not enabled but available
      current = { enabled: false, available: true };
    }

    // If channel is not available, don't allow toggling
    // Exception: For push, whatsapp, and sms, if channelData doesn't exist yet (undefined),
    // allow toggling - the UI layer (handleChannelGlobalToggle) determines availability
    const optionalChannels = ['push', 'whatsapp', 'sms'];
    if (current.available === false && channelValue !== undefined) {
      // Channel exists and is explicitly unavailable - don't allow toggling
      return false;
    }
    // If channel doesn't exist (undefined) or is available, allow toggling

    // Apply optimistic update by creating completely new object structure
    // This ensures Vue's reactivity system detects the change
    const updatedApps = {};
    
    // Helper to normalize channel value (handle legacy boolean format)
    const normalizeChannel = (val) => {
      if (typeof val === 'boolean') {
        return { enabled: val, available: true };
      }
      if (typeof val === 'object' && val !== null) {
        return val;
      }
      return { enabled: false, available: true };
    };
    
    // Copy all apps, updating only the current app
    // Create new objects at every level to ensure Vue reactivity
    const allAppKeys = new Set([...Object.keys(apps), appKey]); // Ensure current appKey is included
    
    allAppKeys.forEach(key => {
      if (key === appKey) {
        // Create new object for the current app with updated event
        const updatedAppPrefs = {};
        
        // Copy all existing events, creating new objects for each
        Object.keys(appPrefs).forEach(evtType => {
          if (evtType === eventType) {
            const existingInApp = normalizeChannel(appPrefs[evtType].inApp);
            const existingEmail = normalizeChannel(appPrefs[evtType].email);
            
            // Update the specific event with new channel value
            // For push/whatsapp/sms: preserve existing availability if it exists
            const channelToUpdate = normalizeChannel(appPrefs[evtType][channel]);
            const updatedChannel = {
              ...channelToUpdate,
              enabled
              // Preserve availability from channelToUpdate (normalized value)
            };
            
            updatedAppPrefs[evtType] = {
              inApp: { ...existingInApp },
              email: { ...existingEmail },
              push: channel === 'push' ? updatedChannel : { ...(appPrefs[evtType].push || { enabled: false, available: false }) },
              whatsapp: channel === 'whatsapp' ? updatedChannel : { ...(appPrefs[evtType].whatsapp || { enabled: false, available: false }) },
              sms: channel === 'sms' ? updatedChannel : { ...(appPrefs[evtType].sms || { enabled: false, available: false }) },
              ...(channel !== 'push' && channel !== 'whatsapp' && channel !== 'sms' ? { [channel]: updatedChannel } : {})
            };
          } else {
            // Copy other events with new objects to ensure reactivity
            // Normalize channel values when copying (handle legacy boolean format)
            const existingInApp = normalizeChannel(appPrefs[evtType].inApp);
            const existingEmail = normalizeChannel(appPrefs[evtType].email);
            
            updatedAppPrefs[evtType] = {
              inApp: { ...existingInApp },
              email: { ...existingEmail },
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
    
    // Verify the event was created correctly
    const rawEvent = rawPreferences.value.apps[appKey]?.[eventType];
    
    console.log('[notificationPreferences] Optimistic update applied:', {
      appKey,
      eventType,
      channel,
      enabled,
      rawEventExists: !!rawEvent,
      rawEventChannel: rawEvent?.[channel],
      currentValue: rawPreferences.value.apps[appKey]?.[eventType]?.[channel],
      hasApp: !!rawPreferences.value.apps[appKey],
      hasEvent: !!rawPreferences.value.apps[appKey]?.[eventType],
      appPrefsAfter: testEvent,
      appPrefsKeys: Object.keys(testAppPrefs || {}),
      inAppEnabled: testEvent?.inApp?.enabled,
      emailEnabled: testEvent?.email?.enabled,
      updatedAppsKeys: Object.keys(updatedApps),
      updatedAppPrefsKeys: Object.keys(updatedApps[appKey] || {})
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
      // Get current state for this event from the optimistic update state (rawPreferences.value already has the update)
      const apps = rawPreferences.value.apps || {};
      const appPrefs = apps[appKey] || {};
      const currentEvent = appPrefs[eventType];
      
      // Helper to extract boolean enabled value from channel (handles both object and boolean formats)
      const getEnabledBoolean = (channelData, isTargetChannel) => {
        if (isTargetChannel) return enabled;
        if (typeof channelData === 'boolean') return channelData;
        if (typeof channelData === 'object' && channelData !== null) return !!channelData.enabled;
        return false; // Default to false if not found
      };
      
      // Phase 14: Build payload with full channel structure
      // Backend expects booleans for inApp/email in legacy format
      const inAppValue = getEnabledBoolean(currentEvent?.inApp, channel === 'inApp');
      const emailValue = getEnabledBoolean(currentEvent?.email, channel === 'email');
      
      const payload = {
        appKey,
        events: {
          [eventType]: {
            inApp: inAppValue,
            email: emailValue,
            push: channel === 'push' ? { enabled, available: currentEvent?.push?.available !== false } : (currentEvent?.push || { enabled: false, available: false }),
            whatsapp: channel === 'whatsapp' ? { enabled, available: currentEvent?.whatsapp?.available !== false } : (currentEvent?.whatsapp || { enabled: false, available: false }),
            sms: channel === 'sms' ? { enabled, available: currentEvent?.sms?.available !== false } : (currentEvent?.sms || { enabled: false, available: false })
          }
        }
      };

      console.log('[notificationPreferences] updatePreference API payload:', {
        eventType,
        channel,
        enabled,
        currentEvent: currentEvent ? { 
          inApp: currentEvent.inApp, 
          email: currentEvent.email,
          inAppType: typeof currentEvent.inApp,
          emailType: typeof currentEvent.email
        } : null,
        computedValues: {
          inAppValue,
          emailValue,
          inAppFromCurrent: getEnabledBoolean(currentEvent?.inApp, false),
          emailFromCurrent: getEnabledBoolean(currentEvent?.email, false)
        },
        payloadEvent: payload.events[eventType],
        fullPayload: JSON.stringify(payload, null, 2)
      });

      const data = await apiClient.put('/notification-preferences', payload);
      
      const digestEventFromResponse = data?.events?.[eventType];
      console.log('[notificationPreferences] updatePreference API response:', {
        eventType,
        responseEvents: data?.events ? Object.keys(data.events) : [],
        digestEventRaw: digestEventFromResponse,
        inAppValue: digestEventFromResponse?.inApp,
        inAppType: typeof digestEventFromResponse?.inApp,
        emailValue: digestEventFromResponse?.email,
        emailType: typeof digestEventFromResponse?.email
      });
      
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
        
        // Merge with existing preferences instead of replacing completely
        // This preserves other events that weren't in the API response
        const existingApps = rawPreferences.value?.apps || {};
        const existingAppPrefs = existingApps[appKey] || {};
        
        // Merge transformed events with existing events
        const mergedAppPrefs = {
          ...existingAppPrefs,
          ...transformed.apps[appKey]
        };
        
        rawPreferences.value = {
          ...rawPreferences.value,
          apps: {
            ...existingApps,
            [appKey]: mergedAppPrefs
          }
        };
        
        const mergedDigestEvent = mergedAppPrefs[eventType];
        console.log('[notificationPreferences] updatePreference merged preferences:', {
          eventType,
          digestEventRaw: mergedDigestEvent,
          inAppEnabled: mergedDigestEvent?.inApp?.enabled,
          inAppValue: mergedDigestEvent?.inApp,
          emailEnabled: mergedDigestEvent?.email?.enabled,
          emailValue: mergedDigestEvent?.email
        });
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


