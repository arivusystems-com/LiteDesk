/**
 * ============================================================================
 * AUDIT APP: Audit Execution Context Model (Runtime Context)
 * ============================================================================
 * 
 * Purpose:
 * - Tracks execution session metadata for Audit App
 * - NOT a workflow engine
 * - NOT a replacement for SALES logic
 * - Used only for Audit App UX & tracking
 * 
 * Rules:
 * - Lifecycle mirrors SALES auditState
 * - No state decisions allowed here
 * - All workflow logic remains in SALES
 * - This is purely for execution tracking
 * 
 * Data Ownership:
 * - Execution state: SALES Event (source of truth)
 * - Execution context: Audit App (this model)
 * 
 * See AUDIT_DOMAIN_MODEL.md for architecture details.
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditExecutionContextSchema = new Schema({
  // Organization context
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Assignment reference
  auditAssignmentId: {
    type: Schema.Types.ObjectId,
    ref: 'AuditAssignment',
    required: true,
    index: true
  },

  // SALES references (source of truth)
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  formResponseId: {
    type: Schema.Types.ObjectId,
    ref: 'FormResponse',
    default: null,
    index: true
  },

  // Execution tracking (mirrors CRM but for Audit App UX)
  checkedInAt: {
    type: Date,
    default: null
  },
  checkedOutAt: {
    type: Date,
    default: null
  },

  // GEO location (execution context)
  geo: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    accuracy: {
      type: Number,
      default: null
    },
    address: {
      type: String,
      default: null
    }
  },

  // Executor (auditor performing the audit)
  executedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Execution status (UX tracking only - not workflow state)
  // This is for Audit App UI purposes, not decision-making
  executionStatus: {
    type: String,
    enum: ['idle', 'in_progress', 'submitted'],
    default: 'idle',
    index: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
auditExecutionContextSchema.index({ organizationId: 1, executedBy: 1, executionStatus: 1 });
auditExecutionContextSchema.index({ auditAssignmentId: 1, executionStatus: 1 });
auditExecutionContextSchema.index({ eventId: 1, executedBy: 1 });

// Pre-save hook: Ensure updatedAt is set
auditExecutionContextSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual: Check if currently executing
auditExecutionContextSchema.virtual('isExecuting').get(function() {
  return this.executionStatus === 'in_progress';
});

// Virtual: Check if submitted
auditExecutionContextSchema.virtual('isSubmitted').get(function() {
  return this.executionStatus === 'submitted';
});

// Instance method: Mark as in progress
auditExecutionContextSchema.methods.startExecution = function(geoData) {
  this.executionStatus = 'in_progress';
  this.checkedInAt = new Date();
  if (geoData) {
    this.geo = {
      latitude: geoData.latitude,
      longitude: geoData.longitude,
      accuracy: geoData.accuracy || null,
      address: geoData.address || null
    };
  }
  return this.save();
};

// Instance method: Mark as submitted
auditExecutionContextSchema.methods.markSubmitted = function() {
  this.executionStatus = 'submitted';
  this.checkedOutAt = new Date();
  return this.save();
};

// Static method: Find active execution for assignment
auditExecutionContextSchema.statics.findActiveForAssignment = function(auditAssignmentId) {
  return this.findOne({
    auditAssignmentId,
    executionStatus: { $in: ['idle', 'in_progress'] }
  });
};

// Static method: Find by event
auditExecutionContextSchema.statics.findByEvent = function(eventId) {
  return this.find({ eventId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('AuditExecutionContext', auditExecutionContextSchema);

