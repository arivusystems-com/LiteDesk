'use strict';

const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const { Schema } = mongoose;

const deferredAutomationActionSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    eventId: { type: String, required: true, trim: true, index: true },
    ruleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule', required: true, index: true },
    actionIndex: { type: Number, required: true, min: 0 },
    actionType: { type: String, required: true, trim: true },
    actionParams: { type: Schema.Types.Mixed, default: null },
    eventPayload: { type: Schema.Types.Mixed, required: true },
    executeAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    dedupeKey: { type: String, required: true, trim: true, unique: true, index: true },
    lastError: { type: String, default: null },
    pauseReason: { type: String, default: null }
  },
  { timestamps: true }
);

deferredAutomationActionSchema.index({ organizationId: 1, status: 1, executeAt: 1 });

module.exports = wrapTenantModel(mongoose.model('DeferredAutomationAction', deferredAutomationActionSchema));
