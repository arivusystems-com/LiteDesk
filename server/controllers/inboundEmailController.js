/**
 * ============================================================================
 * Inbound Email Controller (Phase 3)
 * ============================================================================
 *
 * Webhook: POST /api/webhooks/email/inbound
 *
 * The controller does the minimum amount of work needed to safely accept the
 * payload: validate the body, persist it as a base64 buffer in the inbound
 * Bull job, and ACK 202. The platform inbound dispatcher (parser + thread
 * resolver + persistence) runs out-of-band on the inbound worker. When Redis
 * is not available we fall back to synchronous processing so dev environments
 * keep working.
 *
 * Failures (parse / route / persist) are written to InboundDeadLetter for
 * inspection and replay via the diagnostics endpoints.
 *
 * ============================================================================
 */

const crypto = require('crypto');
const inboundEmailQueueService = require('../services/inboundEmailQueueService');
const inboundProcessingQueue = require('../platform/communication/queues/inboundProcessingQueue');
const { appendCommunicationEvent } = require('../services/communicationEventWriter');
const {
  InboundDispatchError
} = require('../platform/communication/inbound/inboundDispatcher');

/**
 * Optional shared-secret gate for POST /api/webhooks/email/inbound.
 * Omit EMAIL_INBOUND_WEBHOOK_SECRET to keep legacy open receiver behavior (e.g. local dev).
 */
function inboundWebhookSecretMatches(req) {
  const secret = String(process.env.EMAIL_INBOUND_WEBHOOK_SECRET || '').trim();
  if (!secret) return true;

  let provided = '';
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string') {
    const m = authHeader.match(/^\s*Bearer\s+(\S+)/i);
    if (m) provided = String(m[1] || '').trim();
  }
  if (!provided) {
    provided = String(req.headers['x-email-inbound-webhook-token'] || '').trim();
  }
  if (!provided) return false;

  try {
    const a = Buffer.from(secret, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (_e) {
    return false;
  }
}

function extractRawMimeBuffer(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (req.body?.rawMime) {
    return Buffer.from(
      req.body.rawMime,
      typeof req.body.rawMime === 'string' ? 'base64' : undefined
    );
  }
  return null;
}

/**
 * POST /api/webhooks/email/inbound
 * Body: raw MIME (Content-Type: message/rfc822) or JSON { rawMime: "<base64>" }
 */
exports.handleInbound = async (req, res) => {
  if (!inboundWebhookSecretMatches(req)) {
    return res.status(401).json({
      success: false,
      message: 'Inbound webhook authentication failed'
    });
  }

  let rawBuffer;
  try {
    rawBuffer = extractRawMimeBuffer(req);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `Invalid raw MIME body: ${err.message}`
    });
  }

  if (!rawBuffer || !Buffer.isBuffer(rawBuffer) || rawBuffer.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing raw MIME body. Send as Content-Type: message/rfc822 or JSON { rawMime: "<base64>" }'
    });
  }

  const headerOrganizationId =
    req.headers['x-arivu-organization-id'] ||
    req.headers['x-organization-id'] ||
    null;

  const rawMimeBase64 = rawBuffer.toString('base64');

  if (headerOrganizationId) {
    await appendCommunicationEvent({
      organizationId: headerOrganizationId,
      eventType: 'inbound_received',
      source: 'inbound-webhook',
      payload: {
        rawSize: rawBuffer.length,
        hasOrganizationHeader: true
      }
    });
  }

  if (inboundProcessingQueue.isQueueAvailable()) {
    const queued = inboundProcessingQueue.enqueueInboundMessage({
      rawMimeBase64,
      headerOrganizationId
    });
    if (queued) {
      if (headerOrganizationId) {
        await appendCommunicationEvent({
          organizationId: headerOrganizationId,
          eventType: 'inbound_queued',
          source: 'inbound-webhook',
          payload: { queue: 'communication:email:inbound' }
        });
      }
      return res.status(202).json({ success: true, queued: true });
    }
  }

  // Sync fallback (no Redis or enqueue failed) — process inline.
  try {
    const result = await inboundEmailQueueService.processInboundJob({
      rawMimeBase64,
      headerOrganizationId,
      source: 'inbound-webhook-sync'
    });
    return res.status(200).json({
      success: true,
      data: {
        communicationId: result.communicationId,
        relatedTo: result.relatedTo,
        threadStrategy: result.threadStrategy,
        ...(result.helpdesk && { helpdesk: result.helpdesk })
      }
    });
  } catch (err) {
    const status = err instanceof InboundDispatchError && err.stage === 'route' ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: 'Failed to process inbound email',
      stage: err instanceof InboundDispatchError ? err.stage : 'unknown',
      error: err.message
    });
  }
};
