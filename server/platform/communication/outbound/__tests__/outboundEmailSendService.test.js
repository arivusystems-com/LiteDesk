const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildCommunicationUpdateFromSendResult } = require('../outboundEmailSendService');

describe('outboundEmailSendService.buildCommunicationUpdateFromSendResult (R2)', () => {
  it('maps Gmail send ids onto Communication fields', () => {
    const update = buildCommunicationUpdateFromSendResult({
      success: true,
      provider: 'gmail',
      messageId: 'msg123',
      threadId: 'thread456',
      providerMessageKey: 'gmail:msg123'
    });
    assert.equal(update.status, 'sent');
    assert.equal(update.externalMessageId, 'msg123');
    assert.equal(update.providerMessageKey, 'gmail:msg123');
    assert.equal(update.providerThreadId, 'thread456');
    assert.equal(update['metadata.provider'], 'gmail');
  });

  it('maps SMTP message id without provider thread fields', () => {
    const update = buildCommunicationUpdateFromSendResult({
      success: true,
      provider: 'smtp',
      messageId: '<abc@example.com>'
    });
    assert.equal(update.externalMessageId, '<abc@example.com>');
    assert.equal(update.providerMessageKey, undefined);
    assert.equal(update.providerThreadId, undefined);
  });
});
