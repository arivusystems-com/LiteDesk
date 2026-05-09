/**
 * ============================================================================
 * SES Webhook Controller (Phase 4)
 * ============================================================================
 *
 * Handles SNS notifications from AWS SES for delivery, bounce, complaint.
 * SNS posts JSON: Type (SubscriptionConfirmation | Notification), Message, etc.
 * For Notification, Message is a JSON string of the SES event.
 *
 * See docs/IN_PRODUCT_EMAIL_PLAN.md Phase 4.
 * AWS: https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html
 *
 * ============================================================================
 */

const https = require('https');
const Communication = require('../models/Communication');
const CommunicationEvent = require('../models/CommunicationEvent');
const { appendCommunicationEvent } = require('../services/communicationEventWriter');
const { suppressAddress } = require('../services/emailSuppressionService');
const { getCommunicationConfigForOrganization } = require('../platform/communication/config/communicationConfigService');

const STATUS_MAP = {
  Bounce: 'bounced',
  Complaint: 'complained',
  Delivery: 'delivered',
  Open: 'opened'
};

/**
 * POST /api/webhooks/email/ses-events
 * Receives SNS notifications (SES delivery/bounce/complaint).
 * No auth - SNS posts from AWS IPs; optionally verify SNS signature.
 */
exports.handleSesEvents = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const type = body.Type || body.type;
    if (type === 'SubscriptionConfirmation') {
      const subscribeUrl = body.SubscribeURL || body.SubscribeUrl;
      if (subscribeUrl && subscribeUrl.startsWith('https://sns.') && subscribeUrl.includes('amazonaws.com')) {
        await new Promise((resolve, reject) => {
          https.get(subscribeUrl, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => resolve());
          }).on('error', reject);
        });
        return res.json({ success: true, message: 'Subscription confirmed' });
      }
      return res.status(400).json({ success: false, message: 'Invalid SubscribeURL' });
    }

    if (type === 'Notification' || type === 'notification') {
      const messageRaw = body.Message || body.message;
      if (!messageRaw) {
        return res.status(400).json({ success: false, message: 'Missing Message' });
      }
      let sesEvent;
      try {
        sesEvent = typeof messageRaw === 'string' ? JSON.parse(messageRaw) : messageRaw;
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid Message JSON' });
      }

      const notificationType = sesEvent.notificationType || sesEvent.eventType;
      const mail = sesEvent.mail;
      if (!notificationType || !mail?.messageId) {
        return res.status(200).json({ success: true, message: 'Ignored - no mail.messageId' });
      }

      const newStatus = STATUS_MAP[notificationType];
      if (!newStatus) {
        return res.status(200).json({ success: true, message: `Ignored notificationType: ${notificationType}` });
      }

      const webhookEventId = String(
        body.MessageId ||
        body.messageId ||
        `${mail.messageId}:${notificationType}:${sesEvent?.mail?.timestamp || ''}`
      );
      const existing = await CommunicationEvent.findOne({
        source: 'webhook:ses',
        webhookEventId
      }).select('_id').lean();
      if (existing) {
        return res.status(200).json({ success: true, message: 'Duplicate SES webhook ignored' });
      }

      const result = await Communication.findOneAndUpdate(
        { externalMessageId: mail.messageId },
        {
          $set: {
            status: newStatus,
            'metadata.webhook': {
              provider: 'ses',
              eventType: notificationType,
              receivedAt: new Date().toISOString()
            }
          }
        },
        { new: true }
      );

      if (!result) {
        console.warn('[sesWebhook] No Communication found for externalMessageId:', mail.messageId);
        return res.status(200).json({ success: true, message: 'No matching Communication (may be from different source)' });
      }

      await appendCommunicationEvent({
        organizationId: result.organizationId,
        communicationId: result._id,
        eventType: newStatus,
        source: 'webhook:ses',
        webhookEventId,
        payload: {
          messageId: mail.messageId,
          notificationType
        }
      });

      if (newStatus === 'bounced' || newStatus === 'complained') {
        const communicationConfig = await getCommunicationConfigForOrganization(result.organizationId);
        const suppressionPolicy = communicationConfig?.outboundEmail?.suppression || {};
        const shouldSuppress =
          (newStatus === 'bounced' && suppressionPolicy.autoSuppressOnBounce !== false) ||
          (newStatus === 'complained' && suppressionPolicy.autoSuppressOnComplaint !== false);
        if (!shouldSuppress) {
          return res.json({ success: true, updated: result._id, status: newStatus });
        }

        const bounced = Array.isArray(sesEvent?.bounce?.bouncedRecipients)
          ? sesEvent.bounce.bouncedRecipients
          : [];
        const complained = Array.isArray(sesEvent?.complaint?.complainedRecipients)
          ? sesEvent.complaint.complainedRecipients
          : [];
        const recipients = [...bounced, ...complained]
          .map((r) => String(r?.emailAddress || '').trim().toLowerCase())
          .filter(Boolean);

        for (const email of recipients) {
          await suppressAddress({
            organizationId: result.organizationId,
            email,
            reason: newStatus,
            source: 'webhook:ses',
            metadata: {
              messageId: mail.messageId,
              notificationType
            },
            eventAt: new Date(mail?.timestamp || Date.now())
          });
        }
      }

      return res.json({ success: true, updated: result._id, status: newStatus });
    }

    return res.status(200).json({ success: true, message: `Unhandled type: ${type}` });
  } catch (err) {
    console.error('[sesWebhook] handleSesEvents error:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed', error: err.message });
  }
};
