const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';
const ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true';

function debugLog(event, data) {
  if (NOTIFICATION_DEBUG) {
    console.log(`[whatsappService:${event}]`, JSON.stringify(data));
  }
}

/**
 * WhatsApp notification service (stub implementation).
 * 
 * Phase 13: External Notification Channels
 * 
 * This is a placeholder for future WhatsApp integration.
 * Currently logs messages when enabled via feature flag.
 * 
 * Future integration options:
 * - Twilio WhatsApp API
 * - WhatsApp Business API
 * - Custom gateway
 */
async function sendWhatsAppMessage({ to, message, templateId = null }) {
  if (!ENABLE_WHATSAPP) {
    debugLog('Disabled', { to, reason: 'feature_flag_off' });
    return { success: false, skipped: true, reason: 'feature_disabled' };
  }

  try {
    // TODO: Implement actual WhatsApp sending logic
    // Example: Twilio WhatsApp API
    // const client = require('twilio')(accountSid, authToken);
    // const result = await client.messages.create({
    //   from: 'whatsapp:+14155238886',
    //   to: `whatsapp:${to}`,
    //   body: message
    // });

    debugLog('WhatsAppSent', {
      to,
      message: message.substring(0, 50) + '...', // Truncate for logging
      templateId
    });

    // Stub: return success for now
    return { success: true, messageId: `whatsapp_stub_${Date.now()}` };
  } catch (error) {
    console.error('[whatsappService] Failed to send WhatsApp message:', error);
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
  sendWhatsAppMessage,
  isValidPhoneNumber,
  enabled: () => ENABLE_WHATSAPP
};

