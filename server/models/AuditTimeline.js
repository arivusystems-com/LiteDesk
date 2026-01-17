/**
 * ============================================================================
 * AUDIT APP: Audit Timeline Model (Read-Only History)
 * ============================================================================
 * 
 * Purpose:
 * - Auditor-visible timeline of audit events
 * - Mirrors SALES audit trail
 * - No write authority from Audit App
 * 
 * Rules:
 * - Populated via SALES hooks only
 * - Audit App never mutates this
 * - Read-only for Audit App users
 * - Source of truth remains in SALES Event.auditHistory
 * 
 * Data Ownership:
 * - Timeline entries: SALES → Audit App (read-only sync)
 * - Audit App never creates/modifies timeline entries
 * 
 * See AUDIT_DOMAIN_MODEL.md for architecture details.
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditTimelineSchema = new Schema({
  // Organization context
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // SALES Event reference (source of truth)
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },

  // Actor (user who performed the action)
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Action type (mirrors CRM Event.auditHistory.action)
  action: {
    type: String,
    enum: [
      'CHECK_IN',
      'CHECK_OUT',
      'SUBMIT',
      'CORRECTIVE_ACTION_CREATED',
      'CORRECTIVE_ACTION_COMPLETED',
      'APPROVE',
      'REJECT',
      'STATUS_CHANGED',
      'RESCHEDULED',
      'CREATED',
      'UPDATED',
      'CANCELLED'
    ],
    required: true,
    index: true
  },

  // State transition (from)
  fromState: {
    type: String,
    default: null
  },

  // State transition (to)
  toState: {
    type: String,
    default: null
  },

  // Additional metadata (flexible for different action types)
  meta: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // Timestamp (when action occurred)
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  timestamps: false // We only use createdAt, not updatedAt (read-only)
});

// Compound indexes for common queries
auditTimelineSchema.index({ eventId: 1, createdAt: -1 });
auditTimelineSchema.index({ organizationId: 1, actorId: 1, createdAt: -1 });
auditTimelineSchema.index({ eventId: 1, action: 1 });

// Virtual: Check if state transition
auditTimelineSchema.virtual('isStateTransition').get(function() {
  return this.fromState !== null && this.toState !== null;
});

// Static method: Find timeline for event (chronological)
auditTimelineSchema.statics.findByEvent = function(eventId) {
  return this.find({ eventId })
    .sort({ createdAt: 1 })
    .populate('actorId', 'firstName lastName email');
};

// Static method: Find recent timeline entries
auditTimelineSchema.statics.findRecent = function(organizationId, limit = 50) {
  return this.find({ organizationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actorId', 'firstName lastName email')
    .populate('eventId', 'eventId eventName auditType');
};

// Static method: Find by action type
auditTimelineSchema.statics.findByAction = function(eventId, action) {
  return this.find({ eventId, action })
    .sort({ createdAt: 1 })
    .populate('actorId', 'firstName lastName email');
};

module.exports = mongoose.model('AuditTimeline', auditTimelineSchema);

