const inboundEmailQueueService = require('../../../services/inboundEmailQueueService');

function enqueueInboundMessage({ rawMimeBase64, headerOrganizationId = null }) {
  return inboundEmailQueueService.enqueueInbound({ rawMimeBase64, headerOrganizationId });
}

function isQueueAvailable() {
  return inboundEmailQueueService.isQueueAvailable();
}

module.exports = {
  enqueueInboundMessage,
  isQueueAvailable
};
