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

const inboundEmailQueueService = require('../services/inboundEmailQueueService');
const inboundProcessingQueue = require('../platform/communication/queues/inboundProcessingQueue');
const { appendCommunicationEvent } = require('../services/communicationEventWriter');
const {
  InboundDispatchError
} = require('../platform/communication/inbound/inboundDispatcher');

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
