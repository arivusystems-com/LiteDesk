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

/** Pull email addresses from a header value (string or mailparser header object). */
function extractEmailsFromHeaderValue(value) {
  if (!value) return [];
  let str = value;
  if (typeof value === 'object' && value !== null) {
    if (typeof value.text === 'string') str = value.text;
    else if (Array.isArray(value.value)) {
      return value.value.map((a) => String(a.address || '').trim().toLowerCase()).filter(Boolean);
    } else if (typeof value.toString === 'function') {
      str = value.toString();
    }
  }
  const matches = String(str).match(/[\w.+-]+@[\w.-]+\.\w+/gi) || [];
  return matches.map((e) => e.trim().toLowerCase());
}

/**
 * Catch-all / alias delivery often keeps the routed address only in envelope headers,
 * not in To (e.g. To: inbox@reply.domain but Delivered-To: reply+token@reply.domain).
 */
/**
 * Gmail / Workspace catch-all often leaves the routed address only in Received or odd headers.
 * Scan the raw MIME (headers + body) for reply+token@domain as a last resort.
 */
function scanRoutingAddressesFromRawMime(rawBuffer) {
  const maxBytes = Math.min(rawBuffer.length, 512 * 1024);
  const text = rawBuffer.toString('utf8', 0, maxBytes);
  const inbound = String(process.env.EMAIL_INBOUND_ADDRESS || '').trim();
  const domainFromInbound = inbound.includes('@') ? inbound.split('@')[1].toLowerCase() : '';
  const domain = String(
    process.env.EMAIL_REPLY_TO_DOMAIN || process.env.CRM_REPLY_DOMAIN || domainFromInbound || 'reply.arivusystems.com'
  )
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .split('/')[0];
  const domainEsc = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:reply|replies)\\+([a-z0-9]{6,16})@${domainEsc}`, 'gi');
  const out = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const full = String(match[0]).trim().toLowerCase();
    if (full && !out.includes(full)) {
      out.push(full);
    }
  }
  return out;
}

/** Domain-agnostic scan (catch-all may rewrite To: while token remains in Received / body). */
function scanRoutingAddressesFromRawMimeRelaxed(rawBuffer) {
  const maxBytes = Math.min(rawBuffer.length, 512 * 1024);
  const text = rawBuffer.toString('utf8', 0, maxBytes);
  const re = /(?:reply|replies)\+([a-z0-9]{6,16})@([a-z0-9][a-z0-9.-]*)/gi;
  const out = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const full = String(match[0]).trim().toLowerCase();
    if (full && !out.includes(full)) {
      out.push(full);
    }
  }
  return out;
}

/** @returns {string | null} short CRM token e.g. dbb4x4ux */
function scanCrmThreadTokenFromRawMime(rawBuffer) {
  const maxBytes = Math.min(rawBuffer.length, 512 * 1024);
  const text = rawBuffer.toString('utf8', 0, maxBytes);
  const match = text.match(/(?:reply|replies)\+([a-z0-9]{6,16})@/i);
  return match ? String(match[1]).toLowerCase() : null;
}

function collectEnvelopeRoutingAddresses(parsed) {
  const headerNames = [
    'delivered-to',
    'x-original-to',
    'x-forwarded-to',
    'x-real-to',
    'envelope-to',
    'resent-to',
    'x-gm-original-to',
    'x-google-original-to',
    'x-envelope-to'
  ];
  const out = [];
  if (!parsed.headers || typeof parsed.headers.get !== 'function') {
    return out;
  }
  for (const name of headerNames) {
    const raw = parsed.headers.get(name);
    if (!raw) continue;
    const emails = extractEmailsFromHeaderValue(raw);
    for (const email of emails) {
      if (email && !out.includes(email)) out.push(email);
    }
  }
  return out;
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
  const envelopeRoutingAddresses = collectEnvelopeRoutingAddresses(parsed);
  const mimeScanAddresses = [
    ...scanRoutingAddressesFromRawMime(rawBuffer),
    ...scanRoutingAddressesFromRawMimeRelaxed(rawBuffer)
  ];
  // Reply-To on an outbound CRM copy in the catch-all inbox is not an inbound recipient;
  // only include Reply-To when it is itself a reply+ routing address.
  const replyToRouting = extractEmailsFromHeaderValue(parsed.replyTo).filter((addr) =>
    /(?:^|[\s,;])(?:reply|replies)\+[a-z0-9]{6,16}@/i.test(addr)
  );
  const allRecipients = [
    ...toAddresses,
    ...ccAddresses,
    ...bccAddresses,
    ...envelopeRoutingAddresses,
    ...mimeScanAddresses,
    ...replyToRouting
  ];
  // De-dupe (case-insensitive)
  const seen = new Set();
  const uniqueRecipients = [];
  for (const addr of allRecipients) {
    const key = String(addr || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueRecipients.push(key);
  }

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
      allRecipients: uniqueRecipients,
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
  parseRawMime,
  scanCrmThreadTokenFromRawMime,
  scanRoutingAddressesFromRawMimeRelaxed
};
