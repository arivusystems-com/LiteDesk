/**
 * ============================================================================
 * Phase 0I: Instance Model (Tenant Lifecycle)
 * ============================================================================
 * 
 * Represents the formal lifecycle of a tenant instance.
 * Connects:
 * - Demo Requests (Control Plane)
 * - Organizations (Tenant)
 * - TenantAppConfiguration
 * - Subscriptions
 * - Unified Access Resolution
 * 
 * This model defines state, rules, and transitions only — no UI, no workflows,
 * no automation yet.
 * ============================================================================
 */

const mongoose = require('mongoose');
const { INSTANCE_STATUS, ALLOWED_TRANSITIONS } = require('../constants/instanceLifecycle');

const InstanceSchema = new mongoose.Schema({
  // Organization Reference (Multi-tenancy)
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
    // index: true removed - using explicit index below instead
  },

  // Lifecycle Status
  status: {
    type: String,
    enum: Object.values(INSTANCE_STATUS),
    default: INSTANCE_STATUS.DEMO
    // index: true removed - using explicit index below instead
  },

  // Lifecycle Timestamps
  activatedAt: Date,
  suspendedAt: Date,
  terminatedAt: Date,

  // Source of instance creation
  source: {
    type: String,
    enum: ['DEMO_REQUEST', 'MANUAL', 'MIGRATION'],
    default: 'DEMO_REQUEST'
  },

  // Link to Demo Request (if created from demo request)
  demoRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DemoRequest'
    // index: true removed - using explicit index below instead
  },

  // Phase 0J.1: Internal Instance Flag
  // Marks LiteDesk's own instance(s) for special access handling
  // - Immutable after provisioning
  // - Never user-editable
  // - Enables god-mode execution for internal operations
  isInternal: {
    type: Boolean,
    default: false
    // index: true removed - using explicit index below instead
  }
}, {
  timestamps: true
});

// Indexes for fast queries
InstanceSchema.index({ organizationId: 1 }, { unique: true });
InstanceSchema.index({ status: 1 });
InstanceSchema.index({ demoRequestId: 1 });
InstanceSchema.index({ createdAt: -1 });
InstanceSchema.index({ isInternal: 1 }); // Phase 0J.1: Internal instance lookup

/**
 * Pre-save guard: Validate status transitions
 * 
 * Enforces ALLOWED_TRANSITIONS rules:
 * - No invalid transitions
 * - TERMINATED is final
 */
InstanceSchema.pre('save', async function (next) {
  // Only validate if status is being modified
  if (this.isModified('status')) {
    // For new documents, allow default status (DEMO)
    if (this.isNew) {
      // Update lifecycle timestamps based on status for new documents
      const now = new Date();
      
      if (this.status === INSTANCE_STATUS.ACTIVE || this.status === INSTANCE_STATUS.TRIAL) {
        this.activatedAt = now;
      }
      
      if (this.status === INSTANCE_STATUS.SUSPENDED) {
        this.suspendedAt = now;
      }
      
      if (this.status === INSTANCE_STATUS.TERMINATED) {
        this.terminatedAt = now;
      }
      
      return next();
    }
    
    // For updates, fetch the previous document to get old status
    try {
      const previousDoc = await this.constructor.findById(this._id);
      
      if (previousDoc && previousDoc.status !== this.status) {
        // Validate transition
        const allowedTransitions = ALLOWED_TRANSITIONS[previousDoc.status];
        
        if (allowedTransitions && !allowedTransitions.includes(this.status)) {
          return next(new Error(`Invalid instance transition: ${previousDoc.status} → ${this.status}`));
        }
        
        // Update lifecycle timestamps based on status
        const now = new Date();
        
        if ((this.status === INSTANCE_STATUS.ACTIVE || this.status === INSTANCE_STATUS.TRIAL) && !this.activatedAt) {
          this.activatedAt = now;
        }
        
        if (this.status === INSTANCE_STATUS.SUSPENDED && !this.suspendedAt) {
          this.suspendedAt = now;
        }
        
        if (this.status === INSTANCE_STATUS.TERMINATED && !this.terminatedAt) {
          this.terminatedAt = now;
        }
      }
    } catch (error) {
      // If we can't fetch the previous document, allow the save
      // (graceful degradation for edge cases)
      console.warn('[Instance] Could not validate transition:', error.message);
    }
  }
  
  next();
});

/**
 * Instance method: Check if instance can access platform
 */
InstanceSchema.methods.canAccessPlatform = function () {
  return this.status !== INSTANCE_STATUS.TERMINATED;
};

/**
 * Instance method: Check if instance can access apps
 */
InstanceSchema.methods.canAccessApps = function () {
  return [INSTANCE_STATUS.TRIAL, INSTANCE_STATUS.ACTIVE].includes(this.status);
};

/**
 * Instance method: Check if instance is read-only
 */
InstanceSchema.methods.isReadOnly = function () {
  return this.status === INSTANCE_STATUS.DEMO;
};

/**
 * Instance method: Check if execution is blocked
 */
InstanceSchema.methods.isExecutionBlocked = function () {
  return [INSTANCE_STATUS.SUSPENDED, INSTANCE_STATUS.TERMINATED].includes(this.status);
};

module.exports = mongoose.model('Instance', InstanceSchema);

