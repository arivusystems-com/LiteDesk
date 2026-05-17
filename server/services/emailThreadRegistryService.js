'use strict';

/**
 * Master-registry reply routing for enterprise CRM email.
 * CRM always controls Reply-To; never the user's personal mailbox address.
 */

const crypto = require('crypto');
const EmailThreadRegistry = require('../models/EmailThreadRegistry');
const {
  isShortCrmReplyTokenEnabled,
  buildCrmReplyToAddress
} = require('../constants/emailReplyRouting');

const TOKEN_LENGTH = 8;
const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateCrmThreadToken() {
  const bytes = crypto.randomBytes(TOKEN_LENGTH);
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i += 1) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

async function allocateUniqueCrmThreadToken(maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const token = generateCrmThreadToken();
    const exists = await EmailThreadRegistry.findOne({ crmThreadToken: token })
      .select('_id')
      .lean();
    if (!exists) return token;
  }
  throw new Error('Failed to allocate unique CRM thread token');
}

function resolveMailboxType(mailboxLean) {
  if (!mailboxLean) return 'none';
  return mailboxLean.kind === 'group' ? 'shared' : 'personal';
}

function resolveProviderFromMailbox(mailboxLean) {
  if (!mailboxLean) return 'none';
  const p = String(mailboxLean.inboxProvider || '').trim().toLowerCase();
  if (p === 'google') return 'gmail';
  if (p === 'microsoft') return 'microsoft';
  if (p === 'imap') return 'imap';
  return 'none';
}

/**
 * Register or refresh master routing row for an outbound/inbound conversation thread.
 * @param {object} doc — Communication lean or doc (tenant DB)
 * @param {object} [options]
 * @param {object} [options.mailboxLean]
 * @param {string} [options.providerThreadId]
 */
async function registerThreadForCommunication(doc, options = {}) {
  const tenantId = doc.organizationId;
  const conversationId = doc.threadId || doc._id;
  if (!tenantId || !conversationId) {
    throw new Error('organizationId and threadId are required to register email thread');
  }

  const mailboxLean = options.mailboxLean || null;
  const moduleKey = String(doc.relatedTo?.moduleKey || 'workspace').trim().toLowerCase();
  const recordId = doc.relatedTo?.recordId || tenantId;

  let row = await EmailThreadRegistry.findOne({
    tenantId,
    conversationId
  }).lean();

  if (!row) {
    const crmThreadToken = await allocateUniqueCrmThreadToken();
    row = (
      await EmailThreadRegistry.create({
        crmThreadToken,
        tenantId,
        conversationId,
        mailboxId: mailboxLean?._id || doc.mailboxId || null,
        mailboxType: resolveMailboxType(mailboxLean),
        provider: resolveProviderFromMailbox(mailboxLean),
        providerThreadId:
          options.providerThreadId || doc.providerThreadId
            ? String(options.providerThreadId || doc.providerThreadId).trim()
            : null,
        moduleKey,
        recordId,
        sentByUserId: doc.sentByUserId || null,
        rootCommunicationId: conversationId,
        legacyTokenVersion: 2
      })
    ).toObject();
  } else {
    const update = {
      moduleKey,
      recordId,
      mailboxId: mailboxLean?._id || doc.mailboxId || row.mailboxId,
      mailboxType: resolveMailboxType(mailboxLean) !== 'none' ? resolveMailboxType(mailboxLean) : row.mailboxType,
      provider: resolveProviderFromMailbox(mailboxLean) !== 'none' ? resolveProviderFromMailbox(mailboxLean) : row.provider
    };
    if (options.providerThreadId || doc.providerThreadId) {
      update.providerThreadId = String(options.providerThreadId || doc.providerThreadId).trim();
    }
    await EmailThreadRegistry.updateOne({ _id: row._id }, { $set: update });
    row = { ...row, ...update };
  }

  return row;
}

/**
 * Resolve master registry by short token (reply+t92ab81@…).
 * @param {string} crmThreadToken
 */
async function resolveByCrmThreadToken(crmThreadToken) {
  const token = String(crmThreadToken || '').trim().toLowerCase();
  if (!token) return null;
  const row = await EmailThreadRegistry.findOne({ crmThreadToken: token }).lean();
  if (!row) return null;
  return {
    crmThreadToken: row.crmThreadToken,
    tenantId: String(row.tenantId),
    orgId: String(row.tenantId),
    conversationId: String(row.conversationId),
    mailboxId: row.mailboxId ? String(row.mailboxId) : null,
    mailboxType: row.mailboxType,
    provider: row.provider,
    providerThreadId: row.providerThreadId || null,
    moduleKey: row.moduleKey,
    recordId: String(row.recordId),
    sentByUserId: row.sentByUserId ? String(row.sentByUserId) : null,
    rootCommunicationId: row.rootCommunicationId ? String(row.rootCommunicationId) : null
  };
}

/**
 * Ensure Reply-To address for outbound send (short token path).
 * @param {object} doc
 * @param {object} [options]
 */
async function ensureReplyToForCommunication(doc, options = {}) {
  if (!isShortCrmReplyTokenEnabled()) {
    return null;
  }
  const row = await registerThreadForCommunication(doc, options);
  return buildCrmReplyToAddress(row.crmThreadToken);
}

/**
 * Update provider thread id after Gmail/Graph send succeeds.
 */
async function updateProviderThreadId(tenantId, conversationId, providerThreadId) {
  if (!tenantId || !conversationId || !providerThreadId) return;
  await EmailThreadRegistry.updateOne(
    { tenantId, conversationId },
    { $set: { providerThreadId: String(providerThreadId).trim() } }
  );
}

module.exports = {
  generateCrmThreadToken,
  registerThreadForCommunication,
  resolveByCrmThreadToken,
  ensureReplyToForCommunication,
  updateProviderThreadId
};
