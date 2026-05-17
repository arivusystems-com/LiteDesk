const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { encodeRawMime, classifyGmailSendError } = require('../gmailSendProvider');

describe('gmailSendProvider (R2)', () => {
  it('encodeRawMime uses Gmail base64url encoding', () => {
    const input = Buffer.from('hello+world/test==');
    const raw = encodeRawMime(input);
    assert.ok(!raw.includes('+'));
    assert.ok(!raw.includes('/'));
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(padded, 'base64');
    assert.equal(decoded.toString(), input.toString());
  });

  it('classifyGmailSendError detects insufficient scope', () => {
    assert.equal(
      classifyGmailSendError({ code: 403, message: 'Insufficient Permission' }),
      'GMAIL_SEND_SCOPE_REQUIRED'
    );
  });

  it('classifyGmailSendError detects revoked token', () => {
    assert.equal(
      classifyGmailSendError({ message: 'invalid_grant: Token has been expired or revoked.' }),
      'GMAIL_OAUTH_REVOKED'
    );
  });
});
