const mongoose = require('mongoose');

const { Schema } = mongoose;

const AssignmentExecutionLogSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    appKey: { type: String, required: true, uppercase: true, trim: true, index: true },
    moduleKey: { type: String, required: true, lowercase: true, trim: true, index: true },
    recordId: { type: String, required: true, trim: true, index: true },
    executionId: { type: String, required: true, trim: true, unique: true, index: true },
    triggerSource: {
      type: String,
      enum: ['immediate', 'delayed', 'scheduled', 'manual_override', 'simulation'],
      required: true
    },
    ruleId: { type: String, default: null, trim: true },
    previousOwnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    newOwnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignedGroupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    status: {
      type: String,
      enum: ['simulated', 'assigned', 'queued', 'skipped', 'failed'],
      default: 'simulated'
    },
    idempotencyKey: { type: String, default: null, trim: true, index: true },
    isManual: { type: Boolean, default: false },
    details: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

AssignmentExecutionLogSchema.index({ organizationId: 1, appKey: 1, moduleKey: 1, createdAt: -1 });

module.exports = mongoose.model('AssignmentExecutionLog', AssignmentExecutionLogSchema);
