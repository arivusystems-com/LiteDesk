const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const replyToTokenService = require('../replyToTokenService');

describe('replyToTokenService routing (R0)', () => {
  const savedSecret = process.env.EMAIL_REPLY_TOKEN_SECRET;

  beforeEach(() => {
    process.env.EMAIL_REPLY_TOKEN_SECRET = 'test-secret-for-r0-routing-32chars!!';
    process.env.EMAIL_REPLY_TO_DOMAIN = 'reply.example.com';
    delete process.env.EMAIL_INBOUND_ADDRESS;
  });

  afterEach(() => {
    if (savedSecret === undefined) delete process.env.EMAIL_REPLY_TOKEN_SECRET;
    else process.env.EMAIL_REPLY_TOKEN_SECRET = savedSecret;
  });

  it('decodes replies+ token from recipient list', () => {
    const local = replyToTokenService.encodeToken({
      orgId: '507f1f77bcf86cd799439011',
      moduleKey: 'people',
      recordId: '507f1f77bcf86cd799439012'
    });
    const addr = `${local}@reply.example.com`;
    const decoded = replyToTokenService.extractFromAddresses([addr]);
    assert.equal(decoded.tokenType, 'legacy');
    assert.equal(decoded.orgId, '507f1f77bcf86cd799439011');
    assert.equal(decoded.moduleKey, 'people');
  });

  it('extracts short CRM thread token from reply+abc123@domain', () => {
    const token = replyToTokenService.extractCrmThreadToken('reply+t92ab81@reply.example.com');
    assert.equal(token, 't92ab81');
    const fromList = replyToTokenService.extractFromAddresses(['reply+t92ab81@reply.example.com']);
    assert.equal(fromList.tokenType, 'short');
    assert.equal(fromList.crmThreadToken, 't92ab81');
  });

  it('decodes blueprint-style reply+ alias prefix', () => {
    const local = replyToTokenService.encodeToken({
      orgId: '507f1f77bcf86cd799439011',
      moduleKey: 'people',
      recordId: '507f1f77bcf86cd799439012'
    });
    const replyAlias = `reply+${local.replace(/^replies\+/i, '')}`;
    const decoded = replyToTokenService.decodeToken(`${replyAlias}@reply.example.com`);
    assert.equal(decoded.moduleKey, 'people');
    assert.equal(decoded.recordId, '507f1f77bcf86cd799439012');
  });
});
