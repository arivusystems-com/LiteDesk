/**
 * ============================================================================
 * PLATFORM CORE: Relationship Definition Model (Platform Metadata)
 * ============================================================================
 * 
 * This model defines platform-level metadata about relationships between modules:
 * - Cross-app linking (Sales ↔ Projects, Audit ↔ Helpdesk, etc.)
 * - Relationship cardinality (one-to-one, one-to-many, many-to-many)
 * - Directional ownership
 * - UI rendering hints (embed, tab, picker)
 * - Automation compatibility flags
 * 
 * ⚠️ This is PLATFORM metadata, NOT tenant data
 * ⚠️ No business logic, no UI, no automation
 * ⚠️ Required for cross-app relationship engine
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const mongoose = require('mongoose');

const RelationshipDefinitionSchema = new mongoose.Schema({
  relationshipKey: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  source: {
    appKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    moduleKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }
  },

  target: {
    appKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    moduleKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }
  },

  cardinality: {
    type: String,
    enum: ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY'],
    required: true
  },

  ownership: {
    type: String,
    enum: ['SOURCE', 'TARGET'],
    required: true
  },

  required: {
    type: Boolean,
    default: false
  },

  cascade: {
    onDelete: {
      type: String,
      enum: ['NONE', 'DETACH', 'CASCADE'],
      default: 'NONE'
    }
  },

  ui: {
    source: {
      showAs: {
        type: String,
        enum: ['TAB', 'EMBED', 'NONE'],
        default: 'TAB'
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
        default: 'TAB'
      },
      label: {
        type: String,
        trim: true
      }
    },
    picker: {
      enabled: {
        type: Boolean,
        default: true
      },
      searchable: {
        type: Boolean,
        default: true
      }
    }
  },

  automation: {
    allowed: {
      type: Boolean,
      default: true
    }
  },

  enabled: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient lookups
RelationshipDefinitionSchema.index({ relationshipKey: 1 }, { unique: true });
RelationshipDefinitionSchema.index({ 'source.appKey': 1, 'source.moduleKey': 1 });
RelationshipDefinitionSchema.index({ 'target.appKey': 1, 'target.moduleKey': 1 });
RelationshipDefinitionSchema.index({ enabled: 1 });

module.exports = mongoose.model('RelationshipDefinition', RelationshipDefinitionSchema);

