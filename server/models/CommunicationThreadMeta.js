const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const Schema = mongoose.Schema;

const CommunicationThreadMetaSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  threadId: { type: String, required: true, index: true },
  assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  tags: { type: [String], default: [] },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

CommunicationThreadMetaSchema.index({ organizationId: 1, threadId: 1 }, { unique: true });

const CommunicationThreadMeta = mongoose.model('CommunicationThreadMeta', CommunicationThreadMetaSchema);

module.exports = wrapTenantModel(CommunicationThreadMeta);
