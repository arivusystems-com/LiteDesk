/**
 * ============================================================================
 * AUDIT APP: Audit Assignment Model (Read-Only + Execution References)
 * ============================================================================
 * 
 * Purpose:
 * - Represents an audit assigned to an auditor
 * - Acts as index + access gate for Audit App
 * - Points to SALES Event (single source of truth)
 * 
 * Rules:
 * - eventId is mandatory (references SALES Event)
 * - No workflow state stored independently
 * - auditState is synced from Event (read-only cache)
 * - auditType is copied snapshot for filtering
 * 
 * Data Ownership:
 * - auditState: SALES Event (source of truth)
 * - assignment: Audit App (this model)
 * 
 * See AUDIT_DOMAIN_MODEL.md for architecture details.
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditAssignmentSchema = new Schema({
  // Organization context (auditor's organization)
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Auditor assignment
  auditorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // SALES Event reference (single source of truth)
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    unique: true,
    index: true
  },

  // Denormalized snapshot fields (read-only cache from CRM Event)
  auditType: {
    type: String,
    enum: [
      'Internal Audit',
      'External Audit — Single Org',
      'External Audit Beat'
    ],
    required: true
  },

  // Denormalized auditState from CRM Event (read-only)
  // Synced from Event.auditState - never mutated here
  auditState: {
    type: String,
    enum: [
      'Ready to start',
      'checked_in',
      'submitted',
      'pending_corrective',
      'needs_review',
      'approved',
      'rejected',
      'closed'
    ],
    default: 'Ready to start'
  },

  // Scheduling information (denormalized from Event)
  scheduledAt: {
    type: Date,
    required: true
  },
  dueAt: {
    type: Date,
    required: true
  },

  // Assignment status (Audit App managed)
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
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
auditAssignmentSchema.index({ organizationId: 1, auditorId: 1, status: 1 });
auditAssignmentSchema.index({ organizationId: 1, auditType: 1, status: 1 });
auditAssignmentSchema.index({ auditorId: 1, auditState: 1 });
auditAssignmentSchema.index({ auditorId: 1, dueAt: 1 });

// Pre-save hook: Ensure updatedAt is set
auditAssignmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual: Check if assignment is active
auditAssignmentSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Instance method: Mark as closed
auditAssignmentSchema.methods.close = function() {
  this.status = 'closed';
  return this.save();
};

// Static method: Find active assignments for auditor
auditAssignmentSchema.statics.findActiveForAuditor = function(auditorId, organizationId) {
  return this.find({
    auditorId,
    organizationId,
    status: 'active'
  }).sort({ dueAt: 1 });
};

// Static method: Find by event (for sync operations)
auditAssignmentSchema.statics.findByEvent = function(eventId) {
  return this.findOne({ eventId });
};

module.exports = mongoose.model('AuditAssignment', auditAssignmentSchema);

