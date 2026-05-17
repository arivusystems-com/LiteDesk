/**
 * Reply content normalizer (Phase 3).
 *
 * Strips quoted-reply blocks and signatures from inbound message bodies so
 * the displayed reply only shows the new content the sender typed.
 *
 * Heuristics are conservative: when a known reply marker is found we
 * truncate everything after it; when nothing matches we return the body
 * unchanged. We always preserve the original body for audit/debug.
 */

const HTML_QUOTED_PATTERNS = [
  /<div[^>]*class="?gmail_quote"?[^>]*>/i,
  /<blockquote[^>]+type="?cite"?/i,
  /<div[^>]+id="?(?:divRplyFwdMsg|reply-intro)"?/i,
  /<hr[^>]*id="?stopSpelling"?[^>]*>/i,
  /<div[^>]+name="?(?:reply|messageReplySection)"?[^>]*>/i,
  /<div[^>]*class="?WordSection1"?[^>]*>/i
];

const TEXT_QUOTED_PATTERNS = [
  /^\s*on .+ wrote:\s*$/im,
  /^\s*from:\s.+\nsent:\s.+\nto:\s.+/im,
  /^-{2,}\s*original message\s*-{2,}/im,
  /^>{1}.*$/m
];

const SIGNATURE_DELIMITERS = [
  /^-- $/m,
  /^[-_]{2,}\s*$/m,
  /^sent from my (iphone|ipad|android|samsung).*$/im
];

function stripHtmlQuotedSection(html) {
  if (!html) return { stripped: html, hadQuotedContent: false };
  let earliest = -1;
  for (const pattern of HTML_QUOTED_PATTERNS) {
    const match = html.search(pattern);
    if (match >= 0 && (earliest === -1 || match < earliest)) {
      earliest = match;
    }
  }
  if (earliest === -1) return { stripped: html, hadQuotedContent: false };
  const stripped = html.slice(0, earliest).trimEnd();
  return { stripped, hadQuotedContent: true };
}

function stripTextQuotedSection(text) {
  if (!text) return { stripped: text, hadQuotedContent: false };
  let earliest = -1;
  for (const pattern of TEXT_QUOTED_PATTERNS) {
    const match = text.search(pattern);
    if (match >= 0 && (earliest === -1 || match < earliest)) {
      earliest = match;
    }
  }
  if (earliest === -1) return { stripped: text, hadQuotedContent: false };
  const stripped = text.slice(0, earliest).trimEnd();
  return { stripped, hadQuotedContent: true };
}

function stripSignature(text) {
  if (!text) return { stripped: text, hadSignature: false };
  let earliest = -1;
  for (const pattern of SIGNATURE_DELIMITERS) {
    const match = text.search(pattern);
    if (match >= 0 && (earliest === -1 || match < earliest)) {
      earliest = match;
    }
  }
  if (earliest === -1) return { stripped: text, hadSignature: false };
  const stripped = text.slice(0, earliest).trimEnd();
  return { stripped, hadSignature: true };
}

/**
 * Normalize a parsed inbound message body for display.
 *
 * Returns:
 *   - displayBody:        clean reply body (HTML preferred, text fallback)
 *   - displayPlainText:   plain-text version of displayBody
 *   - originalBody:       untouched original body (audit)
 *   - hadQuotedContent:   true if any quoted-reply block was stripped
 *   - hadSignature:       true if any signature delimiter was stripped
 */
function normalizeReplyBody({ html, text }) {
  const originalHtml = html || '';
  const originalText = text || '';
  const originalBody = originalHtml || originalText || '';

  const htmlResult = stripHtmlQuotedSection(originalHtml);
  const textResult = stripTextQuotedSection(originalText);
  const sigResult = stripSignature(textResult.stripped || originalText);

  let displayBody = htmlResult.stripped || sigResult.stripped || textResult.stripped || originalBody;
  // Do not replace real content with empty string when quote/signature heuristics over-strip.
  if (!String(displayBody || '').trim() && String(originalBody || '').trim()) {
    displayBody = originalBody;
  }
  let displayPlainText = (sigResult.stripped || textResult.stripped || '').trim() || (originalText || '').trim();
  if (!displayPlainText && String(originalText || '').trim()) {
    displayPlainText = originalText.trim();
  }

  return {
    displayBody,
    displayPlainText,
    originalBody,
    hadQuotedContent: htmlResult.hadQuotedContent || textResult.hadQuotedContent,
    hadSignature: sigResult.hadSignature
  };
}

module.exports = {
  normalizeReplyBody
};
