'use strict';

const crypto = require('crypto');

function deriveKey() {
  const secret = String(process.env.MAILBOX_OAUTH_SECRET || process.env.JWT_SECRET || '');
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptTenantSecret(plain) {
  if (!plain) return '';
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decryptTenantSecret(blob) {
  if (!blob) return '';
  try {
    const key = deriveKey();
    const buf = Buffer.from(String(blob), 'base64');
    if (buf.length < 28) return '';
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

module.exports = {
  encryptTenantSecret,
  decryptTenantSecret
};
