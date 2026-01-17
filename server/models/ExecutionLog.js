/**
 * ============================================================================
 * Phase 1F: Execution Audit Log Model
 * ============================================================================
 * 
 * Append-only audit trail for all execution attempts.
 * 
 * Rules:
 * - Never updated (immutable)
 * - Never blocks execution
 * - Logged for every execution attempt (success or failure)
 * - Legal-ready audit trail
 * 
 * ============================================================================
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ExecutionLogSchema = new mongoose.Schema({
  // Unique execution ID (UUID)
  executionId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },

  // Execution capability key
  capabilityKey: {
    type: String,
    required: true,
    index: true
  },

  // Execution domain (RESPONSE | EVENT)
  domain: {
    type: String,
    required: true,
    enum: ['RESPONSE', 'EVENT'],
    index: true
  },

  // Record ID being executed upon
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  // App key (SALES, AUDIT, PORTAL, etc.)
  appKey: {
    type: String,
    required: true,
    index: true
  },

  // Organization ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // User ID who initiated execution
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Execution status
  status: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILED'],
    index: true
  },

  // Error code (nullable, only for failures)
  errorCode: {
    type: String,
    default: null,
    index: true
  },

  // Error message (nullable, only for failures)
  errorMessage: {
    type: String,
    default: null
  },

  // Execution timestamp
  executedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  // Execution duration in milliseconds
  durationMs: {
    type: Number,
    required: true,
    default: 0
  },

  // Optional metadata (JSON)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Idempotency key (if provided)
  idempotencyKey: {
    type: String,
    default: null,
    index: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt (though we never update)
  collection: 'executionlogs'
});

// Indexes for common queries
ExecutionLogSchema.index({ organizationId: 1, executedAt: -1 });
ExecutionLogSchema.index({ userId: 1, executedAt: -1 });
ExecutionLogSchema.index({ recordId: 1, domain: 1, executedAt: -1 });
ExecutionLogSchema.index({ capabilityKey: 1, executedAt: -1 });
ExecutionLogSchema.index({ status: 1, executedAt: -1 });

// Prevent updates (append-only)
ExecutionLogSchema.pre('save', function(next) {
  // If this is an update (not a new document), prevent it
  if (!this.isNew) {
    return next(new Error('ExecutionLog is append-only and cannot be updated'));
  }
  next();
});

module.exports = mongoose.model('ExecutionLog', ExecutionLogSchema);

