const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const Schema = mongoose.Schema;

const EmailSuppressionSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    reason: { type: String, enum: ['bounced', 'complained'], required: true },
    active: { type: Boolean, default: true, index: true },
    source: { type: String, default: 'webhook' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    lastEventAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

EmailSuppressionSchema.index({ organizationId: 1, email: 1 }, { unique: true });

const EmailSuppression = mongoose.model('EmailSuppression', EmailSuppressionSchema);

module.exports = wrapTenantModel(EmailSuppression);
