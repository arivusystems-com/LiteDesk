/**
 * ============================================================================
 * PLATFORM CORE: Process Model (Process Engine Step 0)
 * ============================================================================
 *
 * Represents a single executable flow. Defines structure, not behavior logic.
 * A Process is a graph of nodes connected by edges, executed sequentially.
 *
 * ============================================================================
 */

const mongoose = require('mongoose');

const ProcessNodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['trigger', 'condition', 'action', 'data_mapping', 'end', 'field_rule', 'ownership_rule', 'status_guard', 'approval_gate'],
    required: true
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  order: {
    type: Number,
    default: null
  }
}, { _id: false });

const ProcessEdgeSchema = new mongoose.Schema({
  fromNodeId: {
    type: String,
    required: true
  },
  toNodeId: {
    type: String,
    required: true
  },
  condition: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { _id: false });

const ProcessSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  appKey: {
    type: String,
    trim: true,
    uppercase: true,
    required: true,
    index: true
  },
  trigger: {
    type: {
      type: String,
      enum: ['domain_event', 'manual'],
      required: true
    },
    eventType: {
      type: String,
      trim: true,
      default: null
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  nodes: {
    type: [ProcessNodeSchema],
    default: []
  },
  edges: {
    type: [ProcessEdgeSchema],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
ProcessSchema.index({ appKey: 1, status: 1 });
ProcessSchema.index({ 'trigger.type': 1, 'trigger.eventType': 1, status: 1 });

module.exports = mongoose.model('Process', ProcessSchema);
