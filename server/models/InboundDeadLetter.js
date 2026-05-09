const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const Schema = mongoose.Schema;

const InboundDeadLetterSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
      default: null
    },
    stage: {
      type: String,
      enum: ['parse', 'route', 'persist', 'unknown'],
      default: 'unknown',
      index: true
    },
    reason: { type: String, default: '' },
    error: { type: String, default: '' },
    rawMimeBase64: { type: String, default: '' },
    rawSizeBytes: { type: Number, default: 0 },
    parsedSummary: {
      messageId: { type: String, default: '' },
      fromAddress: { type: String, default: '' },
      toAddresses: [{ type: String, trim: true }],
      subject: { type: String, default: '' },
      attachmentCount: { type: Number, default: 0 }
    },
    context: { type: Schema.Types.Mixed, default: {} },
    replayCount: { type: Number, default: 0 },
    lastReplayAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

InboundDeadLetterSchema.index({ organizationId: 1, createdAt: -1 });
InboundDeadLetterSchema.index({ organizationId: 1, resolvedAt: 1, createdAt: -1 });

const InboundDeadLetter = mongoose.model('InboundDeadLetter', InboundDeadLetterSchema);

module.exports = wrapTenantModel(InboundDeadLetter);
