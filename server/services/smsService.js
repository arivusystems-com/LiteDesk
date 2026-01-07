const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';
const ENABLE_SMS = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';

function debugLog(event, data) {
  if (NOTIFICATION_DEBUG) {
    console.log(`[smsService:${event}]`, JSON.stringify(data));
  }
}

/**
 * SMS notification service (stub implementation).
 * 
 * Phase 13: External Notification Channels
 * 
 * This is a placeholder for future SMS integration.
 * Currently logs messages when enabled via feature flag.
 * 
 * Future integration options:
 * - Twilio SMS API
 * - AWS SNS
 * - Custom gateway
 */
async function sendSMS({ to, message }) {
  if (!ENABLE_SMS) {
    debugLog('Disabled', { to, reason: 'feature_flag_off' });
    return { success: false, skipped: true, reason: 'feature_disabled' };
  }

  try {
    // Validate message length (SMS limit: 160 chars for single message)
    if (message.length > 160) {
      debugLog('MessageTooLong', {
        to,
        length: message.length,
        maxLength: 160
      });
      // Truncate message
      message = message.substring(0, 157) + '...';
    }

    // TODO: Implement actual SMS sending logic
    // Example: Twilio SMS API
    // const client = require('twilio')(accountSid, authToken);
    // const result = await client.messages.create({
    //   from: '+1234567890',
    //   to: to,
    //   body: message
    // });

    debugLog('SMSSent', {
      to,
      message: message.substring(0, 50) + '...', // Truncate for logging
      length: message.length
    });

    // Stub: return success for now
    return { success: true, messageId: `sms_stub_${Date.now()}` };
  } catch (error) {
    console.error('[smsService] Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate phone number format.
 */
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  // Basic validation: should start with + and contain digits
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}

module.exports = {
  sendSMS,
  isValidPhoneNumber,
  enabled: () => ENABLE_SMS
};

