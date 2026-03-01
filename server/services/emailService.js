/**
 * Email service - sends transactional and notification emails.
 * Supports AWS SES (primary) and SMTP (fallback) via environment configuration.
 * Never throws; returns { success, messageId?, error? } for all operations.
 */

const EMAIL_PROVIDER_KEY = 'email-provider';

let sesClient = null;
let nodemailerTransport = null;

/**
 * Initialize AWS SES client if credentials are present.
 */
function getSesClient() {
  if (sesClient) return sesClient;
  const region = process.env.AWS_SES_REGION;
  const accessKey = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  if (!region || !accessKey || !secretKey) return null;
  try {
    const { SESClient } = require('@aws-sdk/client-ses');
    sesClient = new SESClient({
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
    });
    return sesClient;
  } catch (err) {
    console.error('[emailService] Failed to create SES client:', err.message);
    return null;
  }
}

/**
 * Initialize nodemailer transport if SMTP env vars are present.
 */
function getNodemailerTransport() {
  if (nodemailerTransport !== null) return nodemailerTransport;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port) {
    nodemailerTransport = false;
    return false;
  }
  try {
    const nodemailer = require('nodemailer');
    const portNum = parseInt(port, 10);
    nodemailerTransport = nodemailer.createTransport({
      host,
      port: portNum,
      secure: portNum === 465,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
    return nodemailerTransport;
  } catch (err) {
    console.error('[emailService] Failed to create SMTP transport:', err.message);
    nodemailerTransport = false;
    return false;
  }
}

/**
 * Check if email service is configured (SES or SMTP).
 * Requires EMAIL_FROM for a valid sender address.
 * @returns {boolean}
 */
function isConfigured() {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') return false;
  if (!process.env.EMAIL_FROM) return false;
  if (getSesClient()) return true;
  const transport = getNodemailerTransport();
  return !!transport;
}

/**
 * Get from address. Uses EMAIL_FROM and optionally EMAIL_FROM_NAME.
 */
function getFromAddress() {
  const from = process.env.EMAIL_FROM || 'noreply@litedesk.local';
  const name = process.env.EMAIL_FROM_NAME || 'LiteDesk';
  return name ? `"${name}" <${from}>` : from;
}

/**
 * Send an email.
 * @param {Object} opts - { to, subject, text, html?, replyTo?, attachments? [{ filename, content }] }
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendEmail(opts) {
  const { to, subject, text, html, replyTo, attachments = [] } = opts || {};
  if (!to || !subject) {
    return { success: false, error: 'Missing to or subject' };
  }

  const toList = Array.isArray(to) ? to : [to];
  if (toList.length === 0 || !toList[0]) {
    return { success: false, error: 'Missing to address' };
  }

  const from = getFromAddress();
  const replyToAddr = replyTo || process.env.EMAIL_REPLY_TO || undefined;

  const hasAttachments = attachments && attachments.length > 0;

  if (hasAttachments) {
    const transport = getNodemailerTransport();
    if (!transport) {
      return { success: false, error: 'Attachments require SMTP. Configure SMTP (e.g. Mailtrap) for attachment support.' };
    }
    try {
      const info = await transport.sendMail({
        from,
        to: toList,
        subject,
        text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
        html: html || undefined,
        replyTo: replyToAddr,
        attachments: attachments.map((a) => ({
          filename: a.filename || a.fileName || 'attachment',
          content: a.content
        }))
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[emailService] SMTP send failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  const client = getSesClient();
  if (client) {
    try {
      const { SendEmailCommand } = require('@aws-sdk/client-ses');
      const command = new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: toList },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: text || (html ? html.replace(/<[^>]+>/g, '') : ''), Charset: 'UTF-8' },
            Html: html ? { Data: html, Charset: 'UTF-8' } : undefined
          }
        },
        ReplyToAddresses: replyToAddr ? [replyToAddr] : undefined
      });
      const result = await client.send(command);
      return { success: true, messageId: result.MessageId };
    } catch (err) {
      console.error('[emailService] SES send failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  const transport = getNodemailerTransport();
  if (transport) {
    try {
      const info = await transport.sendMail({
        from,
        to: toList,
        subject,
        text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
        html: html || undefined,
        replyTo: replyToAddr
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[emailService] SMTP send failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Email service not configured' };
}

module.exports = {
  EMAIL_PROVIDER_KEY,
  isConfigured,
  sendEmail
};
