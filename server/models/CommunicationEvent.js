const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const Schema = mongoose.Schema;

const CommunicationEventSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    communicationId: { type: Schema.Types.ObjectId, ref: 'Communication', index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'accepted',
        'queued',
        'processing',
        'sent',
        'failed',
        'idempotency_replay',
        'delivered',
        'opened',
        'bounced',
        'complained'
      ]
    },
    source: { type: String, default: 'communications-api' },
    webhookEventId: { type: String, index: true },
    idempotencyKeyHash: { type: String, index: true },
    payload: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

CommunicationEventSchema.index({ organizationId: 1, communicationId: 1, createdAt: -1 });
CommunicationEventSchema.index({ organizationId: 1, eventType: 1, createdAt: -1 });
CommunicationEventSchema.index(
  { source: 1, webhookEventId: 1 },
  { unique: true, partialFilterExpression: { webhookEventId: { $exists: true, $type: 'string' } } }
);

const CommunicationEvent = mongoose.model('CommunicationEvent', CommunicationEventSchema);

module.exports = wrapTenantModel(CommunicationEvent);
