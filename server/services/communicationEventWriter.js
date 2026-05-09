const CommunicationEvent = require('../models/CommunicationEvent');

async function appendCommunicationEvent({
  organizationId,
  communicationId = null,
  eventType,
  source = 'communications-api',
  webhookEventId = '',
  idempotencyKeyHash = '',
  payload = {}
}) {
  if (!organizationId || !eventType) return null;
  try {
    return await CommunicationEvent.create({
      organizationId,
      communicationId,
      eventType,
      source,
      webhookEventId: webhookEventId || undefined,
      idempotencyKeyHash: idempotencyKeyHash || undefined,
      payload
    });
  } catch (error) {
    console.error('[communicationEventWriter] Failed to append event:', error.message);
    return null;
  }
}

module.exports = {
  appendCommunicationEvent
};
