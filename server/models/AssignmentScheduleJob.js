const mongoose = require('mongoose');

const { Schema } = mongoose;

const AssignmentScheduleJobSchema = new Schema(
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
    ruleId: { type: String, required: true, trim: true },
    executionMode: {
      type: String,
      enum: ['delayed', 'scheduled'],
      required: true
    },
    runAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'skipped', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    dedupeKey: { type: String, required: true, trim: true, unique: true, index: true },
    snapshotVersion: { type: Number, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    lastError: { type: String, default: null }
  },
  { timestamps: true }
);

AssignmentScheduleJobSchema.index({ organizationId: 1, status: 1, runAt: 1 });

module.exports = mongoose.model('AssignmentScheduleJob', AssignmentScheduleJobSchema);
