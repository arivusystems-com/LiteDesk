'use strict';

/**
 * Master DB (arivu_master) — cross-tenant reply routing index.
 * Maps short CRM tokens (reply+abc123@reply.domain) → tenant conversation context.
 *
 * Tenant email bodies live in tenant DB `communications` collection.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EmailThreadRegistrySchema = new Schema(
  {
    /** Short opaque token, e.g. t92ab81 (unique). */
    crmThreadToken: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 32,
      index: true,
      unique: true
    },
    /** Organization / tenant id. */
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    /** Communication.threadId (conversation root) in tenant DB. */
    conversationId: { type: Schema.Types.ObjectId, required: true, index: true },
    mailboxId: { type: Schema.Types.ObjectId, default: null, index: true },
    mailboxType: { type: String, enum: ['shared', 'personal', 'none'], default: 'none' },
    provider: { type: String, enum: ['gmail', 'microsoft', 'imap', 'none'], default: 'none' },
    providerThreadId: { type: String, trim: true, default: null, index: true },
    moduleKey: { type: String, required: true, trim: true },
    recordId: { type: Schema.Types.ObjectId, required: true },
    sentByUserId: { type: Schema.Types.ObjectId, default: null },
    rootCommunicationId: { type: Schema.Types.ObjectId, default: null },
    /** Legacy v1 token fields for migration / dual-read. */
    legacyTokenVersion: { type: Number, default: 2 }
  },
  { timestamps: true, collection: 'email_threads' }
);

EmailThreadRegistrySchema.index({ tenantId: 1, conversationId: 1 });
EmailThreadRegistrySchema.index({ tenantId: 1, providerThreadId: 1 });

module.exports =
  mongoose.models.EmailThreadRegistry
  || mongoose.model('EmailThreadRegistry', EmailThreadRegistrySchema);
