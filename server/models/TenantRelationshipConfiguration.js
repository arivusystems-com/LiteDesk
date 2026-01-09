/**
 * ============================================================================
 * PLATFORM CORE: Tenant Relationship Configuration Model
 * ============================================================================
 * 
 * This model defines tenant-level (organization) relationship configuration:
 * - Override platform relationship behavior per tenant
 * - Enable/disable relationships per tenant
 * - Override relationship requirements (required/optional)
 * - Override UI behavior per tenant
 * 
 * ⚠️ This is TENANT configuration, NOT platform metadata
 * ⚠️ References platform RelationshipDefinition for relationship metadata
 * ⚠️ Must not duplicate platform metadata
 * 
 * Relationship:
 * - TenantRelationshipConfiguration references RelationshipDefinition.relationshipKey
 * - One TenantRelationshipConfiguration per (organizationId, relationshipKey) combination
 * 
 * This enables:
 * - Mandatory deal when creating project (requiredOverride: true)
 * - Optional audit ↔ helpdesk link (enabled: true, required: false)
 * - UI control per tenant (uiOverride)
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const mongoose = require('mongoose');

const TenantRelationshipConfigurationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  relationshipKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },

  enabled: {
    type: Boolean,
    default: true,
    index: true
  },

  requiredOverride: {
    type: Boolean,
    default: null // null means use platform default
  },

  uiOverride: {
    source: {
      showAs: {
        type: String,
        enum: ['TAB', 'EMBED', 'NONE'],
        default: null
      },
      label: {
        type: String,
        trim: true
      }
    },
    target: {
      showAs: {
        type: String,
        enum: ['TAB', 'EMBED', 'NONE'],
        default: null
      },
      label: {
        type: String,
        trim: true
      }
    }
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

// Compound unique index for (organizationId + relationshipKey)
TenantRelationshipConfigurationSchema.index(
  { organizationId: 1, relationshipKey: 1 },
  { unique: true }
);

// Index for enabled relationships lookup
TenantRelationshipConfigurationSchema.index({ organizationId: 1, enabled: 1 });

// Pre-save hook to update updatedAt
TenantRelationshipConfigurationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-update hook to update updatedAt
TenantRelationshipConfigurationSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('TenantRelationshipConfiguration', TenantRelationshipConfigurationSchema);

