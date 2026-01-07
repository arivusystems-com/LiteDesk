const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';
const MAX_FAILURE_COUNT = 3; // Auto-disable after 3 consecutive failures

// Initialize web-push with VAPID keys from environment
let vapidKeys = null;
let initialized = false;

function initialize() {
  if (initialized) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || process.env.CLIENT_URL || 'mailto:admin@litedesk.com';

  if (!publicKey || !privateKey) {
    console.warn('[pushService] VAPID keys not configured. Push notifications disabled.');
    initialized = false;
    return;
  }

  vapidKeys = {
    publicKey,
    privateKey
  };

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;

  if (NOTIFICATION_DEBUG) {
    console.log('[pushService] Initialized with VAPID keys');
  }
}

function debugLog(event, data) {
  if (NOTIFICATION_DEBUG) {
    console.log(`[pushService:${event}]`, JSON.stringify(data));
  }
}

/**
 * Send push notification to a subscription.
 * Auto-disables subscription if it fails repeatedly.
 */
async function sendPushNotification(subscription, payload) {
  if (!initialized) {
    initialize();
  }

  if (!initialized || !vapidKeys) {
    debugLog('NotInitialized', { subscriptionId: subscription._id });
    return { success: false, error: 'Push service not initialized' };
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
      TTL: 3600 // 1 hour
    });

    // Reset failure count on success
    if (subscription.failureCount > 0) {
      await PushSubscription.findByIdAndUpdate(subscription._id, {
        failureCount: 0,
        lastFailureAt: null
      });
    }

    debugLog('PushSent', {
      subscriptionId: String(subscription._id),
      userId: String(subscription.userId)
    });

    return { success: true };
  } catch (error) {
    // Handle specific error codes
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or not found - disable it
      await PushSubscription.findByIdAndUpdate(subscription._id, {
        disabled: true,
        failureCount: MAX_FAILURE_COUNT,
        lastFailureAt: new Date()
      });
      debugLog('SubscriptionExpired', {
        subscriptionId: String(subscription._id),
        statusCode: error.statusCode
      });
      return { success: false, error: 'Subscription expired', expired: true };
    }

    // Increment failure count
    const newFailureCount = (subscription.failureCount || 0) + 1;
    await PushSubscription.findByIdAndUpdate(subscription._id, {
      failureCount: newFailureCount,
      lastFailureAt: new Date(),
      disabled: newFailureCount >= MAX_FAILURE_COUNT
    });

    debugLog('PushFailed', {
      subscriptionId: String(subscription._id),
      error: error.message,
      failureCount: newFailureCount
    });

    return { success: false, error: error.message };
  }
}

/**
 * Get all active push subscriptions for a user and app.
 */
async function getActiveSubscriptions(userId, appKey) {
  try {
    return await PushSubscription.find({
      userId,
      appKey,
      disabled: false
    });
  } catch (error) {
    console.error('[pushService] Failed to get subscriptions:', error);
    return [];
  }
}

/**
 * Get VAPID public key for client subscription.
 */
function getPublicKey() {
  if (!initialized) {
    initialize();
  }
  return vapidKeys ? vapidKeys.publicKey : null;
}

// Initialize on module load
initialize();

module.exports = {
  sendPushNotification,
  getActiveSubscriptions,
  getPublicKey,
  initialized: () => initialized
};

