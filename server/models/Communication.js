/**
 * ============================================================================
 * Communication Model (In-Product Email)
 * ============================================================================
 *
 * Stores sent and received emails tied to records (People, Organizations, etc.).
 * See docs/IN_PRODUCT_EMAIL_PLAN.md for full spec.
 *
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Attachment size limits (plan: 10MB per file, 25MB total)
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_ATTACHMENTS_BYTES = 25 * 1024 * 1024; // 25MB

const CommunicationSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },

  kind: { type: String, enum: ['email'], default: 'email' },
  direction: { type: String, enum: ['outbound', 'inbound'], required: true },
  threadId: { type: Schema.Types.ObjectId, ref: 'Communication' },
  parentCommunicationId: { type: Schema.Types.ObjectId, ref: 'Communication', default: null },

  subject: { type: String, trim: true, default: '' },
  body: { type: String, default: '' }, // text or HTML

  fromAddress: { type: String, trim: true },
  toAddresses: [{ type: String, trim: true }],
  ccAddresses: [{ type: String, trim: true }],
  bccAddresses: [{ type: String, trim: true }],

  messageId: { type: String, trim: true }, // RFC Message-ID for In-Reply-To matching
  inReplyTo: { type: String, trim: true },
  references: { type: String, trim: true },
  externalMessageId: { type: String, trim: true }, // SES/nodemailer result.messageId

  sentAt: { type: Date },
  receivedAt: { type: Date },

  status: {
    type: String,
    enum: ['sending', 'sent', 'failed', 'delivered', 'opened', 'bounced', 'complained'],
    default: 'sending'
  },

  relatedTo: {
    moduleKey: { type: String, required: true }, // 'people', 'organizations', 'deals', etc.
    recordId: { type: Schema.Types.ObjectId, required: true }
  },

  sentByUserId: { type: Schema.Types.ObjectId, ref: 'User' },

  attachments: [{
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storagePath: { type: String, required: true }
  }],

  metadata: {
    provider: { type: String }
  }
}, {
  timestamps: true
});

// Indexes per docs/IN_PRODUCT_EMAIL_PLAN.md
CommunicationSchema.index({ organizationId: 1, 'relatedTo.moduleKey': 1, 'relatedTo.recordId': 1, threadId: 1 });
CommunicationSchema.index({ externalMessageId: 1 });
CommunicationSchema.index({ messageId: 1 });
CommunicationSchema.index({ parentCommunicationId: 1 });

const Communication = mongoose.model('Communication', CommunicationSchema);

module.exports = Communication;
module.exports.MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_BYTES;
module.exports.MAX_TOTAL_ATTACHMENTS_BYTES = MAX_TOTAL_ATTACHMENTS_BYTES;
