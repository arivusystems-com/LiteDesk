const emailQueueService = require('../../../services/emailQueueService');

function enqueueCommunicationSend(communicationId) {
  return emailQueueService.enqueueSend(communicationId);
}

function isQueueAvailable() {
  return emailQueueService.isQueueAvailable();
}

module.exports = {
  enqueueCommunicationSend,
  isQueueAvailable
};
