/**
 * ============================================================================
 * PLATFORM CORE: App Definition Model (Platform Metadata)
 * ============================================================================
 * 
 * This model defines platform-level metadata about applications:
 * - What apps exist on the platform (sales, helpdesk, projects, audit)
 * - App capabilities (people, organization, transactions, automation)
 * - App configuration and settings schema
 * 
 * ⚠️ This is PLATFORM metadata, NOT tenant data
 * ⚠️ No business logic, no UI, no automation
 * ⚠️ Required for multi-app architecture
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const mongoose = require('mongoose');

const AppDefinitionSchema = new mongoose.Schema({
  appKey: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  icon: {
    type: String,
    trim: true
  },

  category: {
    type: String,
    enum: ['BUSINESS', 'SYSTEM'],
    default: 'BUSINESS'
  },

  owner: {
    type: String,
    enum: ['PLATFORM', 'TENANT'],
    default: 'PLATFORM'
  },

  enabled: {
    type: Boolean,
    default: true
  },

  order: {
    type: Number,
    default: 0
  },

  capabilities: {
    usesPeople: { 
      type: Boolean, 
      default: false 
    },
    usesOrganization: { 
      type: Boolean, 
      default: false 
    },
    usesTransactions: { 
      type: Boolean, 
      default: false 
    },
    usesAutomation: { 
      type: Boolean, 
      default: false 
    }
  },

  settingsSchema: {
    type: mongoose.Schema.Types.Mixed, // JSON schema for future app-level settings
    default: null
  },

  // Phase 0D: UI Composition Metadata
  ui: {
    sidebarOrder: {
      type: Number,
      default: 0
    },
    icon: {
      type: String,
      trim: true
    },
    defaultRoute: {
      type: String,
      trim: true,
      default: '/dashboard'
    },
    showInAppSwitcher: {
      type: Boolean,
      default: true
    }
  },

  // Phase 2F: Marketplace Metadata (Optional, non-breaking)
  marketplace: {
    category: {
      type: String,
      trim: true,
      // Categories: Sales, Operations, Support, Audit, Platform
    },
    comingSoon: {
      type: Boolean,
      default: false
    },
    beta: {
      type: Boolean,
      default: false
    },
    shortDescription: {
      type: String,
      trim: true
    },
    docsUrl: {
      type: String,
      trim: true
    }
  }
}, { 
  timestamps: true 
});

// Index for efficient lookups
AppDefinitionSchema.index({ appKey: 1 }, { unique: true });
AppDefinitionSchema.index({ enabled: 1, order: 1 });

module.exports = mongoose.model('AppDefinition', AppDefinitionSchema);

