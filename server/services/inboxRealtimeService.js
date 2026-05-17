'use strict';

/**
 * Emit inbox refresh signals to connected SSE clients (R3).
 */

const Mailbox = require('../models/Mailbox');
const User = require('../models/User');
const inboxSSEHub = require('./inboxSSEHub');
const { canUserAccessMailboxThreads } = require('./mailboxAccessService');

/**
 * Notify clients that workspace inbox data may have changed.
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.organizationId
 * @param {string|import('mongoose').Types.ObjectId|null} [params.mailboxId]
 * @param {'sync'|'inbound'|'outbound'|'manual'} [params.reason]
 * @param {object} [params.meta]
 */
async function emitInboxUpdated({ organizationId, mailboxId = null, reason = 'sync', meta = {} }) {
  if (!organizationId) return { delivered: 0 };

  const payload = {
    type: 'inbox:updated',
    mailboxId: mailboxId ? String(mailboxId) : null,
    reason,
    at: Date.now(),
    ...meta
  };

  try {
    if (mailboxId) {
      const delivered = await emitToMailboxSubscribers(organizationId, mailboxId, payload);
      return { delivered };
    }
    return { delivered: inboxSSEHub.publishToOrganization(organizationId, payload) };
  } catch (err) {
    console.warn('[inboxRealtime] emitInboxUpdated failed:', err.message);
    return { delivered: 0 };
  }
}

async function emitToMailboxSubscribers(organizationId, mailboxId, payload) {
  const mb = await Mailbox.findOne({ _id: mailboxId, organizationId }).lean();
  if (!mb) {
    return inboxSSEHub.publishToOrganization(organizationId, payload);
  }

  const users = await User.find({ organizationId }).select('_id role isOwner').lean();
  let delivered = 0;
  for (const user of users) {
    if (!canUserAccessMailboxThreads(user, mb)) continue;
    delivered += inboxSSEHub.publishToUser(organizationId, user._id, payload);
  }
  return delivered;
}

module.exports = {
  emitInboxUpdated,
  emitToMailboxSubscribers
};
