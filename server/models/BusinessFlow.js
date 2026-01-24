/**
 * ============================================================================
 * PLATFORM CORE: Business Flow Model (Process Designer Phase 4D)
 * ============================================================================
 *
 * Visual grouping of multiple Processes into end-to-end business stories.
 * Business Flows are read-only lenses - they do not execute or contain rules.
 *
 * ============================================================================
 */

const mongoose = require('mongoose');

const BusinessFlowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: null
  },
  appKey: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  /** Array of Process IDs (order inferred dynamically, not stored) */
  processIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Process',
    required: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
BusinessFlowSchema.index({ organizationId: 1, appKey: 1 });
BusinessFlowSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('BusinessFlow', BusinessFlowSchema);
