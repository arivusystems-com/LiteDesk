/**
 * ============================================================================
 * PLATFORM CORE: Automation Execution Model
 * ============================================================================
 *
 * Persists automation action execution for idempotency and observability.
 * Key: eventId + ruleId + actionIndex. Skip execution if already recorded.
 *
 * ============================================================================
 */

const mongoose = require('mongoose');

const AutomationExecutionSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true
  },
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutomationRule',
    required: true,
    index: true
  },
  actionIndex: {
    type: Number,
    required: true,
    index: true
  },
  actionType: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['completed', 'failed'],
    required: true,
    index: true
  },
  error: {
    type: String,
    default: null
  },
  entityType: {
    type: String,
    trim: true,
    default: null
  },
  entityId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

AutomationExecutionSchema.index({ eventId: 1, ruleId: 1, actionIndex: 1 }, { unique: true });

module.exports = mongoose.model('AutomationExecution', AutomationExecutionSchema);
