/**
 * ============================================================================
 * PLATFORM CORE: Automation Rule Model
 * ============================================================================
 *
 * Configuration-driven automation rules. Triggers match domain events;
 * actions are abstract (no implementation yet). Used by the automation engine
 * for resolution and dry-run execution planning only.
 *
 * - App-aware (appKey)
 * - Entity-aware (entityType)
 * - Optional tenant scope (organizationId)
 *
 * ============================================================================
 */

const mongoose = require('mongoose');

const AutomationRuleSchema = new mongoose.Schema({
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
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true
  },
  entityType: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
    index: true
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  trigger: {
    eventType: {
      type: String,
      trim: true,
      required: true
    },
    condition: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  action: {
    type: {
      type: String,
      trim: true,
      required: true
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  order: {
    type: Number,
    default: 0,
    index: true
  }
}, {
  timestamps: true
});

AutomationRuleSchema.index({ appKey: 1, enabled: 1, 'trigger.eventType': 1 });
AutomationRuleSchema.index({ organizationId: 1, appKey: 1, enabled: 1 });

module.exports = mongoose.model('AutomationRule', AutomationRuleSchema);
