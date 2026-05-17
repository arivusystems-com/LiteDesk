const emailQueueService = require('../../../services/emailQueueService');

function enqueueCommunicationSend(communicationId, organizationId) {
  return emailQueueService.enqueueSend(communicationId, organizationId);
}

function isQueueAvailable() {
  return emailQueueService.isQueueAvailable();
}

module.exports = {
  enqueueCommunicationSend,
  isQueueAvailable
};
