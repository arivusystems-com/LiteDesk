'use strict';

/**
 * Decode inbound MIME from Gmail relay (base64 or base64url) or raw bytes.
 */

function looksLikeRfc822Mime(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  const head = buf.slice(0, 256).toString('latin1');
  return /^(?:From|Return-Path|Delivered-To|Received|MIME-Version|Content-Type|Date|Subject):/im.test(
    head
  );
}

function decodeBase64OrBase64Url(stringValue) {
  const compact = String(stringValue || '').trim().replace(/\s+/g, '');
  if (!compact) return null;

  const tryDecode = (input) => {
    try {
      return Buffer.from(input, 'base64');
    } catch {
      return null;
    }
  };

  let buf = tryDecode(compact);
  if (buf && looksLikeRfc822Mime(buf)) return buf;

  const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const bufUrl = tryDecode(padded);
  if (bufUrl && looksLikeRfc822Mime(bufUrl)) return bufUrl;

  return buf && buf.length > 0 ? buf : bufUrl;
}

/**
 * @param {Buffer | string | { rawMime?: string }} input
 * @returns {Buffer | null}
 */
function decodeInboundRawMime(input) {
  if (Buffer.isBuffer(input)) {
    return input.length > 0 ? input : null;
  }
  if (input && typeof input === 'object' && input.rawMime != null) {
    return decodeBase64OrBase64Url(input.rawMime);
  }
  if (typeof input === 'string') {
    return decodeBase64OrBase64Url(input);
  }
  return null;
}

module.exports = {
  decodeInboundRawMime,
  decodeBase64OrBase64Url,
  looksLikeRfc822Mime
};
