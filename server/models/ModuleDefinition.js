/**
 * ============================================================================
 * PLATFORM CORE: Module Definition Model (Platform Metadata)
 * ============================================================================
 * 
 * This model defines platform-level metadata about modules:
 * - What modules belong to each app
 * - Module behavior (people/org usage, lifecycle, permissions, automation)
 * - Module capabilities and constraints
 * 
 * ⚠️ This is PLATFORM metadata, NOT tenant data
 * ⚠️ No business logic, no UI, no automation
 * ⚠️ Required for multi-app architecture
 * 
 * NOTE: This replaces the previous tenant-specific ModuleDefinition.
 * Tenant-specific module configurations (fields, pipelines) should use
 * a separate model (e.g., TenantModuleConfiguration).
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const mongoose = require('mongoose');

const ModuleDefinitionSchema = new mongoose.Schema({
  moduleKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  appKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  label: {
    type: String,
    required: true,
    trim: true
  },

  pluralLabel: {
    type: String,
    required: true,
    trim: true
  },

  entityType: {
    type: String,
    enum: ['CORE', 'TRANSACTION', 'ACTIVITY'],
    required: true
  },

  primaryField: {
    type: String,
    default: 'name'
  },

  peopleConstraints: {
    allowedTypes: {
      type: [String], // Lead, Contact
      default: []
    },
    required: {
      type: Boolean,
      default: false
    }
  },

  organizationConstraints: {
    required: {
      type: Boolean,
      default: false
    }
  },

  lifecycle: {
    statusField: {
      type: String,
      trim: true
    },
    allowedStatuses: {
      type: [String],
      default: []
    },
    // Phase 0I.1: Execution domain metadata
    executionDriven: {
      type: Boolean,
      default: false
    },
    immutableAfter: {
      type: String,
      trim: true
      // e.g., "executionStatus:Submitted"
    }
  },

  supports: {
    ownership: { 
      type: Boolean, 
      default: true 
    },
    assignment: { 
      type: Boolean, 
      default: true 
    },
    comments: { 
      type: Boolean, 
      default: true 
    },
    attachments: { 
      type: Boolean, 
      default: true 
    },
    automation: { 
      type: Boolean, 
      default: true 
    },
    // Phase 0I.1: Execution domain capabilities
    correctiveActions: {
      type: Boolean,
      default: false
    },
    approvalFlow: {
      type: Boolean,
      default: false
    },
    auditReview: {
      type: Boolean,
      default: false
    },
    reporting: {
      type: Boolean,
      default: false
    }
  },

  permissions: {
    create: { 
      type: Boolean, 
      default: true 
    },
    edit: { 
      type: Boolean, 
      default: true 
    },
    delete: { 
      type: Boolean, 
      default: false 
    },
    view: { 
      type: Boolean, 
      default: true 
    },
    // Phase 0I.1: Execution domain permissions
    execution: {
      type: Boolean,
      default: false
    },
    review: {
      type: Boolean,
      default: false
    },
    approve: {
      type: Boolean,
      default: false
    }
  },

  // Phase 0D: UI Composition Metadata
  ui: {
    routeBase: {
      type: String,
      trim: true
      // e.g., "/sales/deals" or "/people"
    },
    icon: {
      type: String,
      trim: true
    },
    showInSidebar: {
      type: Boolean,
      default: true
    },
    sidebarOrder: {
      type: Number,
      default: 0
    },
    createLabel: {
      type: String,
      trim: true
      // e.g., "Create Deal"
    },
    listLabel: {
      type: String,
      trim: true
      // e.g., "All Deals"
    },
    // Phase 0I.1: Tab display metadata
    showAsTabUnder: {
      type: [String],
      default: []
      // e.g., ['forms'] - shows Responses tab under Forms
    }
  },

  // Phase 2A.1: Projection Metadata (Optional)
  // Declares that this module is a projection of a platform-owned primitive
  projection: {
    enabled: {
      type: Boolean,
      default: false
    },
    basePrimitive: {
      type: String,
      trim: true,
      lowercase: true
      // e.g., 'people', 'organizations', 'events', 'forms'
      // References the base primitive module key
    }
  }
}, { 
  timestamps: true 
});

// Compound unique index for appKey + moduleKey
ModuleDefinitionSchema.index({ appKey: 1, moduleKey: 1 }, { unique: true });
ModuleDefinitionSchema.index({ appKey: 1 });

module.exports = mongoose.model('ModuleDefinition', ModuleDefinitionSchema);
