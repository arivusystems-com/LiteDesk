/**
 * ============================================================================
 * Reply-To Token Service (Phase 2 Inbound)
 * ============================================================================
 *
 * Opaque HMAC-signed tokens for Reply-To addressing.
 * Format: replies+{base64url(payload)}.{base64url(signature)}@domain
 *
 * Payload: { orgId, moduleKey, recordId } — never expose raw IDs in token string.
 * Signature: HMAC-SHA256(secret, payload) — prevents enumeration.
 *
 * See docs/IN_PRODUCT_EMAIL_PLAN.md Part 2.2
 *
 * ============================================================================
 */

const crypto = require('crypto');

const TOKEN_VERSION = 1;
const SEP = '.';

/**
 * Encode payload and sign with HMAC. Returns local part for plus-addressing.
 * @param {Object} payload - { orgId, moduleKey, recordId }
 * @returns {string} local part e.g. "replies+{encoded}.{signature}"
 */
function encodeToken(payload) {
  const secret = process.env.EMAIL_REPLY_TOKEN_SECRET;
  if (!secret) {
    throw new Error('EMAIL_REPLY_TOKEN_SECRET is required for Reply-To tokens');
  }

  const { orgId, moduleKey, recordId } = payload;
  if (!orgId || !moduleKey || !recordId) {
    throw new Error('Payload must include orgId, moduleKey, recordId');
  }

  const obj = { v: TOKEN_VERSION, orgId: String(orgId), moduleKey: String(moduleKey), recordId: String(recordId) };
  const json = JSON.stringify(obj);
  const payloadB64 = Buffer.from(json, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  return `replies+${payloadB64}${SEP}${signature}`;
}

/**
 * Build full Reply-To address for a record.
 * @param {Object} payload - { orgId, moduleKey, recordId }
 * @returns {string} e.g. "replies+Xk29as9Kz.Y2ln@inbound.example.com"
 */
function buildReplyToAddress(payload) {
  const localPart = encodeToken(payload);
  const domain = process.env.EMAIL_INBOUND_ADDRESS?.split('@')[1] || process.env.EMAIL_REPLY_TO_DOMAIN || 'litedesk.local';
  return `${localPart}@${domain}`;
}

/**
 * Decode and verify token from email address. Extracts from To/Cc/Bcc.
 * @param {string} address - Full address e.g. "replies+Xk29as9Kz.Y2ln@domain.com"
 * @returns {{ orgId: string, moduleKey: string, recordId: string } | null}
 */
function decodeToken(address) {
  const secret = process.env.EMAIL_REPLY_TOKEN_SECRET;
  if (!secret) return null;

  if (!address || typeof address !== 'string') return null;

  // Match plus-addressing: replies+{token}@...
  const match = address.match(/replies\+([^@]+)@/);
  if (!match) return null;

  const fullToken = match[1];
  const sepIdx = fullToken.lastIndexOf(SEP);
  if (sepIdx <= 0) return null;

  const payloadB64 = fullToken.slice(0, sepIdx);
  const signatureB64 = fullToken.slice(sepIdx + 1);

  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', secret).update(json).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signatureB64, 'base64url'), Buffer.from(expectedSig, 'base64url'))) {
      return null;
    }
    const obj = JSON.parse(json);
    if (obj.v !== TOKEN_VERSION || !obj.orgId || !obj.moduleKey || !obj.recordId) return null;
    return { orgId: obj.orgId, moduleKey: obj.moduleKey, recordId: obj.recordId };
  } catch {
    return null;
  }
}

/**
 * Extract token payload from any of the recipient headers (To, Cc, Bcc).
 * @param {string[]} addresses - Array of parsed addresses
 * @returns {{ orgId: string, moduleKey: string, recordId: string } | null}
 */
function extractFromAddresses(addresses) {
  if (!Array.isArray(addresses)) return null;
  for (const addr of addresses) {
    const email = typeof addr === 'string' ? addr : (addr?.address || addr?.value?.[0]?.address);
    if (email) {
      const decoded = decodeToken(email);
      if (decoded) return decoded;
    }
  }
  return null;
}

module.exports = {
  encodeToken,
  buildReplyToAddress,
  decodeToken,
  extractFromAddresses
};
