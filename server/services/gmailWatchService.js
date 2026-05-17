'use strict';

/**
 * Gmail users.watch + Pub/Sub push helpers (R3.1).
 */

const Mailbox = require('../models/Mailbox');
const { getGmailApiClientForMailbox, normalizeGmailSyncLabelIds } = require('./mailboxGmailInboxSyncService');

function isGmailPushEnabled() {
  if (process.env.ENABLE_GMAIL_PUSH === 'false') return false;
  const topic = String(process.env.GMAIL_PUBSUB_TOPIC || '').trim();
  return topic.startsWith('projects/') && topic.includes('/topics/');
}

function getPubSubTopicName() {
  return String(process.env.GMAIL_PUBSUB_TOPIC || '').trim();
}

/**
 * Register Gmail push notifications for a connected mailbox.
 * @param {object} mailboxLean
 */
async function registerGmailWatchForMailbox(mailboxLean) {
  if (!isGmailPushEnabled()) {
    return { ok: false, skipped: true, reason: 'push_disabled' };
  }

  const topicName = getPubSubTopicName();
  const clientResult = await getGmailApiClientForMailbox(mailboxLean);
  if (clientResult.error) {
    return { ok: false, error: clientResult.error, code: clientResult.code };
  }

  const labelIds = normalizeGmailSyncLabelIds(
    Array.isArray(mailboxLean.gmailSyncLabelIds) && mailboxLean.gmailSyncLabelIds.length > 0
      ? mailboxLean.gmailSyncLabelIds
      : ['INBOX']
  );

  try {
    const res = await clientResult.gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: labelIds.length ? labelIds : ['INBOX'],
        labelFilterAction: 'include'
      }
    });

    const historyId = res.data?.historyId ? String(res.data.historyId) : '';
    const expirationMs = res.data?.expiration ? Number(res.data.expiration) : 0;
    const expirationAt = expirationMs > 0 ? new Date(expirationMs) : null;

    await Mailbox.updateOne(
      { _id: mailboxLean._id, organizationId: mailboxLean.organizationId },
      {
        $set: {
          gmailWatchExpiration: expirationAt,
          gmailWatchTopic: topicName,
          ...(historyId ? { gmailHistoryId: historyId } : {})
        }
      }
    );

    return {
      ok: true,
      historyId,
      expirationAt
    };
  } catch (err) {
    const msg = err?.message || String(err);
    return { ok: false, error: msg };
  }
}

async function stopGmailWatchForMailbox(mailboxLean) {
  const clientResult = await getGmailApiClientForMailbox(mailboxLean);
  if (clientResult.error) {
    return { ok: false, error: clientResult.error };
  }
  try {
    await clientResult.gmail.users.stop({ userId: 'me' });
    await Mailbox.updateOne(
      { _id: mailboxLean._id, organizationId: mailboxLean.organizationId },
      {
        $set: {
          gmailWatchExpiration: null,
          gmailWatchTopic: ''
        }
      }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

module.exports = {
  isGmailPushEnabled,
  getPubSubTopicName,
  registerGmailWatchForMailbox,
  stopGmailWatchForMailbox
};
