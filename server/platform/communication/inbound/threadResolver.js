/**
 * Thread resolver (Phase 3).
 *
 * Resolves the parent communication for an inbound message using:
 *   1. RFC In-Reply-To / References header matching
 *   2. Subject normalization fallback (Re:/Fwd: stripped) within recent
 *      outbound messages to the same module record
 *   3. Recent outbound to the same record (existing Phase 2 behavior)
 */

const Communication = require('../../../models/Communication');

const SUBJECT_PREFIX_PATTERN = /^\s*(?:re|fwd?|aw|tr|res?)\s*:\s*/i;

function normalizeSubject(subject) {
  if (!subject) return '';
  let cleaned = String(subject);
  // Remove successive Re:/Fwd: prefixes.
  for (let i = 0; i < 5; i += 1) {
    if (!SUBJECT_PREFIX_PATTERN.test(cleaned)) break;
    cleaned = cleaned.replace(SUBJECT_PREFIX_PATTERN, '');
  }
  return cleaned.trim().toLowerCase();
}

async function resolveByRfcHeaders(organizationId, inReplyTo, references = []) {
  const ids = new Set();
  if (inReplyTo) ids.add(String(inReplyTo).trim());
  for (const r of references || []) {
    if (r) ids.add(String(r).trim());
  }
  if (ids.size === 0) return null;
  const candidateList = Array.from(ids);
  return Communication.findOne({
    organizationId,
    $or: [
      { messageId: { $in: candidateList } },
      { externalMessageId: { $in: candidateList } }
    ]
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function resolveByRecentRelatedRecord(organizationId, relatedTo, fromAddress) {
  if (!relatedTo?.moduleKey || !relatedTo?.recordId) return null;
  return Communication.findOne({
    organizationId,
    direction: 'outbound',
    'relatedTo.moduleKey': relatedTo.moduleKey,
    'relatedTo.recordId': relatedTo.recordId,
    toAddresses: { $in: [String(fromAddress || '').trim().toLowerCase()] }
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function resolveBySubjectFallback(organizationId, subject, fromAddress) {
  const normalized = normalizeSubject(subject);
  if (!normalized) return null;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const candidates = await Communication.find({
    organizationId,
    direction: 'outbound',
    createdAt: { $gte: since },
    toAddresses: { $in: [String(fromAddress || '').trim().toLowerCase()] }
  })
    .select('_id threadId subject createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  for (const c of candidates) {
    if (normalizeSubject(c.subject) === normalized) {
      return c;
    }
  }
  return null;
}

/**
 * Resolve the parent communication and threadId for an inbound message.
 *
 * @returns {Promise<{
 *   parent: object | null,
 *   threadId: any | null,
 *   strategy: 'rfc_headers' | 'recent_related' | 'subject_fallback' | 'new_thread'
 * }>}
 */
async function resolveThread({
  organizationId,
  inReplyTo,
  references,
  relatedTo,
  fromAddress,
  subject
}) {
  let parent = await resolveByRfcHeaders(organizationId, inReplyTo, references);
  if (parent) {
    return { parent, threadId: parent.threadId || parent._id, strategy: 'rfc_headers' };
  }

  parent = await resolveByRecentRelatedRecord(organizationId, relatedTo, fromAddress);
  if (parent) {
    return { parent, threadId: parent.threadId || parent._id, strategy: 'recent_related' };
  }

  parent = await resolveBySubjectFallback(organizationId, subject, fromAddress);
  if (parent) {
    return { parent, threadId: parent.threadId || parent._id, strategy: 'subject_fallback' };
  }

  return { parent: null, threadId: null, strategy: 'new_thread' };
}

module.exports = {
  resolveThread,
  normalizeSubject
};
