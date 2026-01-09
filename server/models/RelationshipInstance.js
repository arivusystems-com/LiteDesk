/**
 * ============================================================================
 * PLATFORM CORE: Relationship Instance Model
 * ============================================================================
 * 
 * This model represents a single relationship instance between two records
 * across modules and apps, without embedding foreign keys in schemas.
 * 
 * Key Features:
 * - Cross-app linking (e.g., CRM Deal ↔ Portal Order)
 * - No schema changes to existing modules
 * - No foreign keys in record schemas
 * - Metadata-driven relationships
 * - Tenant-aware (organizationId)
 * 
 * ⚠️ This is RUNTIME DATA, NOT metadata
 * ⚠️ No business logic here - pure data model
 * ⚠️ App-agnostic - works for any app/module combination
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const mongoose = require('mongoose');

const RelationshipInstanceSchema = new mongoose.Schema({
  // Relationship Type (references RelationshipDefinition.relationshipKey)
  relationshipKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },

  // Source Record
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
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    }
  },

  // Target Record
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
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    }
  },

  // Multi-tenancy
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient lookups
RelationshipInstanceSchema.index(
  { organizationId: 1, relationshipKey: 1 },
  { name: 'org_relationship_idx' }
);

RelationshipInstanceSchema.index(
  { 'source.appKey': 1, 'source.moduleKey': 1, 'source.recordId': 1 },
  { name: 'source_record_idx' }
);

RelationshipInstanceSchema.index(
  { 'target.appKey': 1, 'target.moduleKey': 1, 'target.recordId': 1 },
  { name: 'target_record_idx' }
);

// Unique constraint: prevent duplicate relationships
RelationshipInstanceSchema.index(
  {
    relationshipKey: 1,
    'source.appKey': 1,
    'source.moduleKey': 1,
    'source.recordId': 1,
    'target.appKey': 1,
    'target.moduleKey': 1,
    'target.recordId': 1,
    organizationId: 1
  },
  {
    unique: true,
    name: 'unique_relationship_idx'
  }
);

// Compound index for bidirectional lookups (source or target)
RelationshipInstanceSchema.index(
  {
    organizationId: 1,
    'source.appKey': 1,
    'source.moduleKey': 1,
    'source.recordId': 1
  },
  { name: 'org_source_lookup_idx' }
);

RelationshipInstanceSchema.index(
  {
    organizationId: 1,
    'target.appKey': 1,
    'target.moduleKey': 1,
    'target.recordId': 1
  },
  { name: 'org_target_lookup_idx' }
);

module.exports = mongoose.model('RelationshipInstance', RelationshipInstanceSchema);

