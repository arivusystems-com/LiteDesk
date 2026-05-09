const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const Schema = mongoose.Schema;

const CommunicationConfigSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    outboundEmail: {
      enabled: { type: Boolean, default: true },
      requireIdempotencyKey: { type: Boolean, default: false },
      maxRecipientsPerMessage: { type: Number, default: 50, min: 1, max: 1000 },
      allowedModuleKeys: [{ type: String, trim: true }]
    }
  },
  { timestamps: true }
);

const CommunicationConfig = mongoose.model('CommunicationConfig', CommunicationConfigSchema);

module.exports = wrapTenantModel(CommunicationConfig);
