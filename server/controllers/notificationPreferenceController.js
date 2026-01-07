const domainEvents = require('../constants/domainEvents');
const NotificationPreference = require('../models/NotificationPreference');
const { ensureDefaultPreferences, buildDefaultMap } = require('../services/notificationPreferenceBootstrap');

const APP_KEYS = ['CRM', 'AUDIT', 'PORTAL'];
const ALL_EVENTS = Object.values(domainEvents);

function normalizeAppKey(req) {
  const fromQuery = req.query.appKey;
  const fromBody = req.body?.appKey;
  const fromContext = req.appContext?.appKey;
  const appKey = fromQuery || fromBody || fromContext;
  if (!appKey || !APP_KEYS.includes(appKey)) {
    return null;
  }
  return appKey;
}

// GET /api/notification-preferences
exports.getPreferences = async (req, res) => {
  const appKey = normalizeAppKey(req);
  if (!appKey) {
    return res.status(400).json({ success: false, message: 'appKey is required' });
  }

  try {
    await ensureDefaultPreferences(req.user._id, appKey);
    const pref = await NotificationPreference.findOne({ userId: req.user._id, appKey });

    if (!pref) {
      // Should be bootstrapped, but return defaults if not
      return res.json({ appKey, events: buildDefaultMap(appKey) });
    }

    const eventsObj = {};
    pref.events.forEach((value, key) => {
      eventsObj[key] = value;
    });

    return res.json({ appKey, events: eventsObj });
  } catch (err) {
    console.error('[notificationPreferenceController:getPreferences] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
  }
};

// PUT /api/notification-preferences
exports.updatePreferences = async (req, res) => {
  const appKey = normalizeAppKey(req);
  if (!appKey) {
    return res.status(400).json({ success: false, message: 'appKey is required' });
  }

  const incomingEvents = req.body?.events || {};
  const updates = {};

  // Validate incoming event types and channels
  // Phase 14: Extended to support push, whatsapp, sms channels
  Object.keys(incomingEvents).forEach(eventType => {
    if (!ALL_EVENTS.includes(eventType)) {
      return; // skip unknown event types
    }
    const entry = incomingEvents[eventType] || {};
    const next = {};
    
    // Legacy boolean format support (backward compatible)
    if (typeof entry.inApp === 'boolean') next.inApp = entry.inApp;
    if (typeof entry.email === 'boolean') next.email = entry.email;
    
    // New channel structure support (Phase 13/14)
    if (entry.push && typeof entry.push.enabled === 'boolean') {
      next.push = { enabled: entry.push.enabled, available: entry.push.available !== false };
    }
    if (entry.whatsapp && typeof entry.whatsapp.enabled === 'boolean') {
      next.whatsapp = { enabled: entry.whatsapp.enabled, available: entry.whatsapp.available !== false };
    }
    if (entry.sms && typeof entry.sms.enabled === 'boolean') {
      next.sms = { enabled: entry.sms.enabled, available: entry.sms.available !== false };
    }
    
    // Only apply if at least one known channel provided
    if (Object.keys(next).length > 0) {
      updates[eventType] = next;
    }
  });

  try {
    let pref = await ensureDefaultPreferences(req.user._id, appKey);
    if (!pref) {
      pref = await NotificationPreference.findOne({ userId: req.user._id, appKey });
    }

    if (!pref) {
      // If still missing, create from defaults
      pref = new NotificationPreference({
        userId: req.user._id,
        appKey,
        events: buildDefaultMap(appKey)
      });
    }

    Object.entries(updates).forEach(([eventType, value]) => {
      const existing = pref.events.get(eventType) || {
        inApp: false,
        email: false,
        push: { enabled: false, available: false },
        whatsapp: { enabled: false, available: false },
        sms: { enabled: false, available: false }
      };
      
      // Merge channel updates, preserving structure
      const merged = { ...existing };
      
      // Handle legacy boolean format
      if (typeof value.inApp === 'boolean') merged.inApp = value.inApp;
      if (typeof value.email === 'boolean') merged.email = value.email;
      
      // Handle new channel structure
      if (value.push) merged.push = { ...existing.push, ...value.push };
      if (value.whatsapp) merged.whatsapp = { ...existing.whatsapp, ...value.whatsapp };
      if (value.sms) merged.sms = { ...existing.sms, ...value.sms };
      
      pref.events.set(eventType, merged);
    });

    await pref.save();

    const eventsObj = {};
    pref.events.forEach((value, key) => {
      eventsObj[key] = value;
    });

    return res.json({ appKey, events: eventsObj });
  } catch (err) {
    console.error('[notificationPreferenceController:updatePreferences] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update preferences' });
  }
};

