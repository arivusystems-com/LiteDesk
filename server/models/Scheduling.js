/**
 * ============================================================================
 * PLATFORM CORE: Scheduling Model
 * ============================================================================
 * 
 * Core entity that powers both Tasks and Events as separate UI modules.
 * 
 * Key Characteristics:
 * - Single core entity with type: 'task' | 'event'
 * - App-aware (appContext field)
 * - Entity-attached (entityType, entityId)
 * - NOT used for domain workflows (Audit Events, Beats, Forms)
 * 
 * See scheduling implementation documentation for details.
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchedulingSchema = new Schema({
  // Multi-tenancy
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Type: 'task' or 'event'
  type: {
    type: String,
    enum: ['task', 'event'],
    required: true,
    index: true
  },

  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // Dates
  startDate: {
    type: Date,
    index: true
    // Used for events
  },
  dueDate: {
    type: Date,
    index: true
    // Used for tasks
  },

  // Owner (Person reference)
  ownerPersonId: {
    type: Schema.Types.ObjectId,
    ref: 'People',
    index: true
  },

  // App Context
  appContext: {
    type: String,
    required: true,
    index: true,
    trim: true
  },

  // Entity Attachment
  entityType: {
    type: String,
    required: true,
    trim: true
    // e.g., 'Person', 'Organization', 'Deal'
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },

  // Status (for tasks only: 'open' | 'completed')
  status: {
    type: String,
    enum: ['open', 'completed'],
    default: 'open',
    index: true
    // Only applicable to tasks
  },

  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
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
SchedulingSchema.index({ organizationId: 1, type: 1, appContext: 1 });
SchedulingSchema.index({ organizationId: 1, entityType: 1, entityId: 1 });
SchedulingSchema.index({ organizationId: 1, type: 1, status: 1 });
SchedulingSchema.index({ organizationId: 1, type: 1, dueDate: 1 });
SchedulingSchema.index({ organizationId: 1, type: 1, startDate: 1 });
SchedulingSchema.index({ organizationId: 1, ownerPersonId: 1, type: 1 });

// Pre-save middleware
SchedulingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validation: status only applies to tasks
  if (this.type === 'event' && this.status && this.status !== 'open') {
    // Events don't use status field, but we keep it for consistency
    // Status is ignored for events
  }
  
  next();
});

// Ensure virtuals are included in JSON
SchedulingSchema.set('toJSON', { virtuals: true });
SchedulingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Scheduling', SchedulingSchema);

