/**
 * Inbound MIME parser (Phase 3).
 *
 * Wraps `mailparser` and returns a normalized payload that downstream
 * stages (thread resolver, dispatcher, persistence) can rely on without
 * needing to understand mailparser's structure.
 */

const { simpleParser } = require('mailparser');

function collectAddresses(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const out = [];
  for (const item of list) {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item?.value) {
      for (const a of item.value) {
        if (a?.address) out.push(String(a.address).trim());
      }
    }
  }
  return out;
}

function normalizeReferences(refs) {
  if (!refs) return [];
  const list = Array.isArray(refs)
    ? refs
    : String(refs).split(/[\s,]+/);
  return list
    .map((r) => String(r || '').replace(/^<|>$/g, '').trim())
    .filter(Boolean);
}

function stripBrackets(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  return str.replace(/^<|>$/g, '');
}

/**
 * Parse a raw MIME buffer into a normalized inbound message.
 *
 * @param {Buffer} rawBuffer
 * @returns {Promise<{
 *   ok: boolean,
 *   error?: string,
 *   value?: object
 * }>}
 */
async function parseRawMime(rawBuffer) {
  if (!Buffer.isBuffer(rawBuffer) || rawBuffer.length === 0) {
    return { ok: false, error: 'invalid_raw_buffer' };
  }
  let parsed;
  try {
    parsed = await simpleParser(rawBuffer);
  } catch (err) {
    return { ok: false, error: `mime_parse_failed: ${err.message}` };
  }

  const fromObj = parsed.from?.value?.[0] || null;
  const fromAddress = (fromObj?.address || parsed.from?.text || '').trim();
  const fromDisplayName = (fromObj?.name || '').trim();

  const toAddresses = collectAddresses(parsed.to);
  const ccAddresses = collectAddresses(parsed.cc);
  const bccAddresses = collectAddresses(parsed.bcc);
  const allRecipients = [...toAddresses, ...ccAddresses, ...bccAddresses];

  const messageId = stripBrackets(parsed.messageId);
  const inReplyTo = stripBrackets(parsed.inReplyTo);
  const references = normalizeReferences(parsed.references);

  const subject = (parsed.subject || '(no subject)').trim();
  const html = parsed.html || null;
  const text = parsed.text || null;
  const body = html || text || '';

  const attachments = Array.isArray(parsed.attachments)
    ? parsed.attachments
        .filter((att) => att && Buffer.isBuffer(att.content))
        .map((att) => ({
          filename: att.filename || 'attachment',
          contentType: att.contentType || 'application/octet-stream',
          size: att.content.length,
          content: att.content
        }))
    : [];

  return {
    ok: true,
    value: {
      messageId,
      inReplyTo,
      references,
      fromAddress,
      fromDisplayName,
      toAddresses,
      ccAddresses,
      bccAddresses,
      allRecipients,
      subject,
      html,
      text,
      body,
      attachments,
      receivedAt: parsed.date ? new Date(parsed.date) : new Date(),
      rawSize: rawBuffer.length
    }
  };
}

module.exports = {
  parseRawMime
};
