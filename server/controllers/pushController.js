const PushSubscription = require('../models/PushSubscription');
const pushService = require('../services/pushService');
const NotificationPreference = require('../models/NotificationPreference');

const APP_KEYS = ['CRM', 'AUDIT', 'PORTAL'];

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

/**
 * GET /api/push/public-key
 * Get VAPID public key for client subscription.
 */
exports.getPublicKey = async (req, res) => {
  try {
    const publicKey = pushService.getPublicKey();
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        message: 'Push notifications not configured'
      });
    }
    res.json({ success: true, publicKey });
  } catch (error) {
    console.error('[pushController] Failed to get public key:', error);
    res.status(500).json({ success: false, message: 'Failed to get public key' });
  }
};

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications.
 */
exports.subscribe = async (req, res) => {
  try {
    const appKey = normalizeAppKey(req);
    if (!appKey) {
      return res.status(400).json({ success: false, message: 'appKey is required' });
    }

    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'endpoint and keys (p256dh, auth) are required'
      });
    }

    // Check if subscription already exists
    let subscription = await PushSubscription.findOne({ endpoint });

    if (subscription) {
      // Update existing subscription
      subscription.userId = req.user._id;
      subscription.organizationId = req.user.organizationId;
      subscription.appKey = appKey;
      subscription.keys = keys;
      subscription.disabled = false;
      subscription.failureCount = 0;
      subscription.lastFailureAt = null;
      await subscription.save();
    } else {
      // Create new subscription
      subscription = new PushSubscription({
        userId: req.user._id,
        organizationId: req.user.organizationId,
        appKey,
        endpoint,
        keys
      });
      await subscription.save();
    }

    // Enable push in user preferences
    let preference = await NotificationPreference.findOne({
      userId: req.user._id,
      appKey
    });

    if (preference) {
      // Update all events to enable push
      preference.events.forEach((eventPref, eventType) => {
        if (eventPref.push) {
          eventPref.push.enabled = true;
          eventPref.push.available = true;
        } else {
          eventPref.push = { enabled: true, available: true };
        }
      });
      await preference.save();
    }

    res.json({
      success: true,
      subscriptionId: String(subscription._id)
    });
  } catch (error) {
    console.error('[pushController] Failed to subscribe:', error);
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
};

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications.
 */
exports.unsubscribe = async (req, res) => {
  try {
    const appKey = normalizeAppKey(req);
    if (!appKey) {
      return res.status(400).json({ success: false, message: 'appKey is required' });
    }

    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint is required' });
    }

    // Find and disable subscription
    const subscription = await PushSubscription.findOne({
      endpoint,
      userId: req.user._id,
      appKey
    });

    if (subscription) {
      subscription.disabled = true;
      await subscription.save();
    }

    // Disable push in user preferences
    const preference = await NotificationPreference.findOne({
      userId: req.user._id,
      appKey
    });

    if (preference) {
      preference.events.forEach((eventPref) => {
        if (eventPref.push) {
          eventPref.push.enabled = false;
        }
      });
      await preference.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[pushController] Failed to unsubscribe:', error);
    res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
  }
};

