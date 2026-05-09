const {
  SUPPORTED_MODULES,
  normalizeSendEmailPayload
} = require('../domain/sendEmailContract');
const emailProviderGateway = require('../providers/emailProviderGateway');
const emailDispatchQueue = require('../queues/emailDispatchQueue');

function validateOutboundEmailPayload(payload) {
  return normalizeSendEmailPayload(payload);
}

async function canSendEmailNow(context = {}) {
  return emailProviderGateway.isConfigured(context);
}

function getSupportedModules() {
  return Array.from(SUPPORTED_MODULES);
}

function enqueueOutboundEmail(communicationId) {
  return emailDispatchQueue.enqueueCommunicationSend(communicationId);
}

module.exports = {
  validateOutboundEmailPayload,
  canSendEmailNow,
  getSupportedModules,
  enqueueOutboundEmail
};
