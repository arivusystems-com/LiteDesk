const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * User-defined notification rule.
 * Allows users to create personal notification triggers based on domain events.
 * 
 * Phase 16: User-Defined Notification Rules
 * 
 * Constraints:
 * - Max 10 rules per user
 * - App-scoped and organization-isolated
 * - Extensible condition structure
 */
const notificationRuleSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  appKey: {
    type: String,
    required: true,
    enum: ['SALES', 'AUDIT', 'PORTAL'],
    index: true
  },

  // Module key (e.g., 'tasks', 'deals', 'contacts') - Phase 16: Generic module support
  moduleKey: {
    type: String,
    required: false, // Optional for backward compatibility
    trim: true,
    lowercase: true,
    index: true
  },

  // Entity and event type that triggers this rule
  // Phase 16: entityType is now derived from moduleKey, but kept for backward compatibility
  entityType: {
    type: String,
    required: false, // Made optional for new generic approach
    enum: ['TASK', 'AUDIT', 'CORRECTIVE_ACTION'] // Legacy values
  },
  eventType: {
    type: String,
    required: true,
    enum: ['ASSIGNED', 'CREATED', 'STATUS_CHANGED']
  },

  // Conditions for rule matching (pure function evaluation)
  conditions: {
    // For ASSIGNED event: 'ME' means assigned to me, 'ANY' means any assignment
    assignedTo: {
      type: String,
      enum: ['ME', 'ANY'],
      default: 'ANY'
    },
    // Filter by priority (array of allowed priorities)
    priority: [{
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    }],
    // Filter by status (array of allowed statuses)
    // For TASK: ['todo', 'in_progress', 'waiting', 'completed', 'cancelled']
    // For AUDIT: ['Ready to start', 'checked_in', 'submitted', 'pending_corrective', 'needs_review', 'approved', 'rejected', 'closed']
    // For CORRECTIVE_ACTION: status values from corrective action model
    status: [{
      type: String
    }]
  },

  // Channel preferences for this rule
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: false
    },
    whatsapp: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },

  // Enable/disable rule
  enabled: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

// Compound indexes for efficient rule lookup
notificationRuleSchema.index({ userId: 1, appKey: 1, enabled: 1 });
notificationRuleSchema.index({ organizationId: 1, appKey: 1, entityType: 1, eventType: 1, enabled: 1 });
notificationRuleSchema.index({ organizationId: 1, appKey: 1, moduleKey: 1, eventType: 1, enabled: 1 }); // Phase 16: Module-based lookup
notificationRuleSchema.index({ userId: 1, appKey: 1, moduleKey: 1 }); // Phase 16: Per-module rule count

// Pre-save validation: enforce max 10 rules per user per app AND max 5 per module
notificationRuleSchema.pre('save', async function() {
  if (this.isNew) {
    // Max 10 rules per user per app
    const totalCount = await mongoose.model('NotificationRule').countDocuments({
      userId: this.userId,
      appKey: this.appKey
    });
    
    if (totalCount >= 10) {
      throw new Error('Maximum 10 notification rules allowed per user per app');
    }

    // Max 5 rules per module per user (Phase 16)
    if (this.moduleKey) {
      const moduleCount = await mongoose.model('NotificationRule').countDocuments({
        userId: this.userId,
        appKey: this.appKey,
        moduleKey: this.moduleKey
      });
      
      if (moduleCount >= 5) {
        throw new Error(`Maximum 5 notification rules allowed per module per user (module: ${this.moduleKey})`);
      }
    }
  }
});

module.exports = mongoose.model('NotificationRule', notificationRuleSchema);

