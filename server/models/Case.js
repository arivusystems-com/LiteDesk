const mongoose = require('mongoose');
const { RECORD_SOURCE_VALUES, DEFAULT_RECORD_SOURCE } = require('../constants/recordSource');
const {
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_STATUSES,
  CASE_CHANNELS
} = require('../constants/caseLifecycle');

const { Schema } = mongoose;

const CaseActivitySchema = new Schema(
  {
    activityType: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      trim: true
    },
    channel: {
      type: String,
      trim: true
    },
    internal: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    actorName: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const SlaCycleSchema = new Schema(
  {
    cycleNo: { type: Number, required: true, min: 1 },
    startedAt: { type: Date, required: true },
    pausedAt: { type: Date, default: null },
    stoppedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['running', 'paused', 'stopped'],
      default: 'running'
    },
    responseTargetAt: { type: Date, default: null },
    resolutionTargetAt: { type: Date, default: null },
    policySnapshot: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const CaseSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    caseType: {
      type: String,
      enum: CASE_TYPES,
      required: true,
      default: 'Support Ticket'
    },
    priority: {
      type: String,
      enum: CASE_PRIORITIES,
      required: true,
      default: 'Medium'
    },
    status: {
      type: String,
      enum: CASE_STATUSES,
      required: true,
      default: 'New',
      index: true
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'People',
      default: null
    },
    organizationRefId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null
    },
    caseOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    channel: {
      type: String,
      enum: CASE_CHANNELS,
      default: 'Internal'
    },
    relatedItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Item'
      }
    ],
    caseNotes: {
      type: String,
      trim: true
    },
    resolutionSummary: {
      type: String,
      trim: true
    },
    currentSlaCycle: {
      type: SlaCycleSchema,
      required: true
    },
    slaCycles: {
      type: [SlaCycleSchema],
      default: []
    },
    activities: {
      type: [CaseActivitySchema],
      default: []
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: {}
    },
    source: {
      type: String,
      enum: RECORD_SOURCE_VALUES,
      default: DEFAULT_RECORD_SOURCE
    },
    assignmentControl: {
      isLocked: { type: Boolean, default: false },
      lockReason: { type: String, default: null, trim: true },
      lockRuleId: { type: String, default: null, trim: true },
      lockedAt: { type: Date, default: null },
      lockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      manualOverrideAt: { type: Date, default: null },
      previousOwnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null }
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletionReason: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

CaseSchema.index({ organizationId: 1, status: 1, priority: 1 });
CaseSchema.index({ organizationId: 1, caseOwnerId: 1, status: 1 });

CaseSchema.statics.CASE_TYPES = CASE_TYPES;
CaseSchema.statics.CASE_PRIORITIES = CASE_PRIORITIES;
CaseSchema.statics.CASE_STATUSES = CASE_STATUSES;
CaseSchema.statics.CASE_CHANNELS = CASE_CHANNELS;

module.exports = mongoose.model('Case', CaseSchema);
