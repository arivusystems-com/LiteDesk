'use strict';

const { syncMailboxesForEmailAddress } = require('../services/gmailPushSyncService');

function verifyPushWebhookAuth(req) {
  const secret = String(process.env.GMAIL_PUSH_WEBHOOK_SECRET || '').trim();
  if (!secret) return true;

  const auth = String(req.headers.authorization || '');
  if (auth === `Bearer ${secret}`) return true;
  const headerToken = String(req.headers['x-gmail-push-token'] || '').trim();
  return headerToken === secret;
}

/**
 * Google Pub/Sub subscription verification (optional).
 * GET /api/webhooks/gmail/push?token=...
 */
exports.verifyGmailPushSubscription = (req, res) => {
  const verifyToken = String(process.env.GMAIL_PUBSUB_VERIFY_TOKEN || '').trim();
  if (verifyToken && String(req.query.token || '') === verifyToken) {
    return res.status(200).send(req.query.challenge || 'ok');
  }
  if (!verifyToken) {
    return res.status(200).send('ok');
  }
  return res.status(403).send('Forbidden');
};

/**
 * POST /api/webhooks/gmail/push
 * Pub/Sub push body: { message: { data: base64, ... }, subscription }
 */
exports.handleGmailPush = async (req, res) => {
  if (!verifyPushWebhookAuth(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const message = req.body?.message;
    if (!message?.data) {
      return res.status(400).json({ success: false, message: 'Invalid Pub/Sub payload' });
    }

    const decoded = Buffer.from(String(message.data), 'base64').toString('utf8');
    let payload;
    try {
      payload = JSON.parse(decoded);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid Pub/Sub message data' });
    }

    const emailAddress = payload.emailAddress || payload.email_address;
    const historyId = payload.historyId || payload.history_id;

    const result = await syncMailboxesForEmailAddress(emailAddress, historyId);

    return res.status(200).json({
      success: true,
      data: {
        emailAddress: emailAddress || null,
        mailboxesSynced: result.mailboxesSynced,
        errorCount: result.errors.length
      }
    });
  } catch (err) {
    console.error('[gmailPushWebhook] error:', err.message);
    return res.status(500).json({ success: false, message: 'Push handler failed' });
  }
};
