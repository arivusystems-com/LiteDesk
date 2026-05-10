/**
 * Resolve which mailbox an inbound message belongs to from recipient headers.
 */

const Mailbox = require('../models/Mailbox');

function collectNormalizedAddresses(parsedMessage) {
  const out = new Set();
  const buckets = [
    parsedMessage?.toAddresses,
    parsedMessage?.ccAddresses,
    parsedMessage?.bccAddresses
  ];
  for (const arr of buckets) {
    if (!Array.isArray(arr)) continue;
    for (const a of arr) {
      const e = String(a || '').trim().toLowerCase();
      if (e) out.add(e);
    }
  }
  return [...out];
}

/**
 * Pick a mailbox when any recipient address matches mailbox.emailAddress (case-insensitive).
 * Prefers `group` over `personal` when both match.
 *
 * @returns {Promise<import('mongoose').Types.ObjectId | null>}
 */
async function resolveMailboxIdForInbound({ organizationId, parsedMessage }) {
  const emails = collectNormalizedAddresses(parsedMessage);
  if (!emails.length || !organizationId) return null;

  const mailboxes = await Mailbox.find({
    organizationId,
    emailAddress: { $in: emails, $nin: [null, ''] }
  })
    .select('_id kind emailAddress')
    .lean();

  if (!mailboxes.length) return null;

  const hit = (kind) =>
    mailboxes.find(
      (m) => m.kind === kind && m.emailAddress && emails.includes(String(m.emailAddress).trim().toLowerCase())
    );

  const groupHit = hit('group');
  if (groupHit) return groupHit._id;
  const personalHit = hit('personal');
  if (personalHit) return personalHit._id;
  return null;
}

module.exports = {
  resolveMailboxIdForInbound,
  collectNormalizedAddresses
};
