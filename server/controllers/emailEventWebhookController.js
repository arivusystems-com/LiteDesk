/**
 * Generic Email Event Webhook Controller (Phase 2)
 *
 * POST /api/webhooks/email/events
 * Accepts provider-agnostic event payloads and maps them to Communication status.
 */

const Communication = require('../models/Communication');
const CommunicationEvent = require('../models/CommunicationEvent');
const { appendCommunicationEvent } = require('../services/communicationEventWriter');
const { suppressAddress, normalizeEmailList } = require('../services/emailSuppressionService');
const { getCommunicationConfigForOrganization } = require('../platform/communication/config/communicationConfigService');

const EVENT_STATUS_MAP = Object.freeze({
  delivered: 'delivered',
  delivery: 'delivered',
  open: 'opened',
  opened: 'opened',
  bounce: 'bounced',
  bounced: 'bounced',
  complaint: 'complained',
  complained: 'complained'
});

function resolveMessageId(payload = {}) {
  return (
    payload.messageId ||
    payload.message_id ||
    payload.externalMessageId ||
    payload.emailId ||
    payload.email_id ||
    payload?.data?.messageId ||
    payload?.data?.message_id ||
    payload?.data?.email_id ||
    payload?.mail?.messageId ||
    null
  );
}

function resolveEventType(payload = {}) {
  const raw =
    payload.eventType ||
    payload.event_type ||
    payload.type ||
    payload.notificationType ||
    payload?.data?.type ||
    null;
  return raw ? String(raw).toLowerCase() : '';
}

function resolveWebhookEventId(payload = {}) {
  return (
    payload.eventId ||
    payload.event_id ||
    payload.id ||
    payload?.data?.id ||
    null
  );
}

function resolveRecipientEmails(payload = {}) {
  return normalizeEmailList([
    payload.email,
    payload.recipient,
    payload.to,
    payload?.data?.email,
    payload?.data?.recipient,
    ...(Array.isArray(payload.recipients) ? payload.recipients : []),
    ...(Array.isArray(payload.toAddresses) ? payload.toAddresses : [])
  ]);
}

function isWebhookAuthorized(req) {
  const configuredToken = String(process.env.EMAIL_EVENTS_WEBHOOK_TOKEN || '').trim();
  if (!configuredToken) return true;
  const headerToken = String(
    req.headers['x-webhook-token'] ||
    req.headers['x-provider-token'] ||
    ''
  ).trim();
  return headerToken && headerToken === configuredToken;
}

exports.handleProviderEvents = async (req, res) => {
  try {
    if (!isWebhookAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized webhook request' });
    }
    const payload = req.body || {};
    const messageId = resolveMessageId(payload);
    const eventType = resolveEventType(payload);
    const webhookEventId = resolveWebhookEventId(payload);
    const newStatus = EVENT_STATUS_MAP[eventType];
    if (!messageId || !newStatus) {
      return res.status(200).json({
        success: true,
        message: 'Ignored - missing supported event/messageId'
      });
    }

    if (webhookEventId) {
      const existing = await CommunicationEvent.findOne({
        source: `webhook:${String(payload.provider || 'generic').toLowerCase()}`,
        webhookEventId: String(webhookEventId)
      }).select('_id').lean();
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Duplicate webhook ignored'
        });
      }
    }

    const communication = await Communication.findOneAndUpdate(
      { externalMessageId: messageId },
      {
        $set: {
          status: newStatus,
          'metadata.webhook': {
            provider: String(payload.provider || 'generic').toLowerCase(),
            eventType,
            receivedAt: new Date().toISOString()
          }
        }
      },
      { new: true }
    );

    if (!communication) {
      return res.status(200).json({
        success: true,
        message: 'No matching communication for message id'
      });
    }

    await appendCommunicationEvent({
      organizationId: communication.organizationId,
      communicationId: communication._id,
      eventType: newStatus,
      source: `webhook:${String(payload.provider || 'generic').toLowerCase()}`,
      webhookEventId: webhookEventId ? String(webhookEventId) : '',
      payload: {
        webhookEventType: eventType,
        mappedStatus: newStatus,
        messageId
      }
    });

    if (newStatus === 'bounced' || newStatus === 'complained') {
      const communicationConfig = await getCommunicationConfigForOrganization(communication.organizationId);
      const suppressionPolicy = communicationConfig?.outboundEmail?.suppression || {};
      const shouldSuppress =
        (newStatus === 'bounced' && suppressionPolicy.autoSuppressOnBounce !== false) ||
        (newStatus === 'complained' && suppressionPolicy.autoSuppressOnComplaint !== false);
      if (!shouldSuppress) {
        return res.json({
          success: true,
          updated: communication._id,
          status: newStatus
        });
      }
      const recipients = resolveRecipientEmails(payload);
      for (const email of recipients) {
        await suppressAddress({
          organizationId: communication.organizationId,
          email,
          reason: newStatus,
          source: `webhook:${String(payload.provider || 'generic').toLowerCase()}`,
          metadata: {
            webhookEventType: eventType,
            messageId
          },
          eventAt: new Date()
        });
      }
    }

    return res.json({
      success: true,
      updated: communication._id,
      status: newStatus
    });
  } catch (error) {
    console.error('[emailEventWebhook] handleProviderEvents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};
