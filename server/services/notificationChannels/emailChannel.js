const User = require('../../models/User');
const domainEvents = require('../../constants/domainEvents');
const emailProviderGateway = require('../../platform/communication/providers/emailProviderGateway');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';

function debugLog(event, data) {
  if (NOTIFICATION_DEBUG) {
    console.log(`[emailChannel:${event}]`, JSON.stringify(data));
  }
}

/**
 * Email channel implementation.
 * Handles regular notifications and digest notifications.
 * Sends via the system channel (OCI Email Delivery by default), not tenant CRM/Resend settings.
 * Requires ENABLE_EMAIL_NOTIFICATIONS=true and SYSTEM_EMAIL_* / OCI configured on the server.
 */
async function send({ notification }) {
  try {
    // Global kill switch
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
      return { success: false, skipped: true, reason: 'email_notifications_disabled' };
    }

    const orgId = notification.organizationId;

    // R0: system notifications use SYSTEM_EMAIL_* / OCI, not tenant CRM SMTP integration.
    if (!emailProviderGateway.isSystemConfigured()) {
      debugLog('Skipped', { reason: 'system_email_not_configured' });
      return { success: false, skipped: true, reason: 'not_configured' };
    }

    // Get user email
    const user = await User.findById(notification.userId).select('email firstName lastName');
    if (!user || !user.email) {
      console.warn('[emailChannel] User not found or no email:', notification.userId);
      return { success: false, skipped: true, reason: 'no_email' };
    }

    // Render email content based on event type
    let subject, text, html;

    if (notification.eventType === domainEvents.DIGEST_DAILY || 
        notification.eventType === domainEvents.DIGEST_WEEKLY) {
      // Digest email
      const digestContent = renderDigestEmail(notification, user);
      subject = digestContent.subject;
      text = digestContent.text;
      html = digestContent.html;
    } else {
      // Regular notification email
      const regularContent = renderRegularEmail(notification, user);
      subject = regularContent.subject;
      text = regularContent.text;
      html = regularContent.html;
    }

    const result = await emailProviderGateway.sendSystemEmail({
      organizationId: orgId,
      to: user.email,
      subject,
      text,
      html,
      replyTo: process.env.SYSTEM_EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO
    });

    debugLog('EmailSent', {
      notificationId: String(notification._id),
      userId: String(notification.userId),
      eventType: notification.eventType,
      success: result.success
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, messageId: result.messageId };
  } catch (err) {
    // Never throw - email failures should not affect users
    console.error('[emailChannel] Failed to send email:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Render digest email content.
 */
function renderDigestEmail(notification, user) {
  const userName = user.firstName || user.email.split('@')[0];
  const isWeekly = notification.eventType === domainEvents.DIGEST_WEEKLY;
  const period = isWeekly ? 'weekly' : 'daily';
  
  const subject = notification.title || `Your ${period} summary`;
  
  // Simple text-based email (no branding yet)
  const text = `Hi ${userName},\n\n${notification.body}\n\nOpen Arivu to review.\n\n${getAppDeepLink(notification.appKey)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">${subject}</h2>
      <p>Hi ${userName},</p>
      <p>${notification.body}</p>
      <p style="margin-top: 30px;">
        <a href="${getAppDeepLink(notification.appKey)}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Open Arivu</a>
      </p>
    </body>
    </html>
  `;
  
  return { subject, text, html };
}

/**
 * Render regular notification email content.
 */
function renderRegularEmail(notification, user) {
  const userName = user.firstName || user.email.split('@')[0];
  const subject = notification.title || 'Notification from Arivu';
  
  const text = `Hi ${userName},\n\n${notification.body}\n\n${getAppDeepLink(notification.appKey)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">${subject}</h2>
      <p>Hi ${userName},</p>
      <p>${notification.body}</p>
      <p style="margin-top: 30px;">
        <a href="${getAppDeepLink(notification.appKey)}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View in Arivu</a>
      </p>
    </body>
    </html>
  `;
  
  return { subject, text, html };
}

/**
 * Get deep link URL for app.
 */
function getAppDeepLink(appKey) {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  
  switch (appKey) {
    case 'CRM':
      return `${baseUrl}/dashboard`;
    case 'AUDIT':
      return `${baseUrl}/audit/dashboard`;
    case 'PORTAL':
      return `${baseUrl}/portal/actions`;
    default:
      return baseUrl;
  }
}

module.exports = { send };

