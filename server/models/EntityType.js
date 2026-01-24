/**
 * ============================================================================
 * PLATFORM CORE: Entity Type Model
 * ============================================================================
 * 
 * Defines entity types (People, Organization, Deal) in a data-driven way.
 * 
 * Key Features:
 * - App-aware but not hardcoded
 * - Supports multiple entity types per entity (e.g., Lead/Contact for People)
 * - Can be extended for future apps
 * 
 * ============================================================================
 */

const mongoose = require('mongoose');

const EntityTypeSchema = new mongoose.Schema({
  // Unique identifier for the entity type
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true
  },
  
  // Human-readable label
  label: {
    type: String,
    required: true,
    trim: true
  },
  
  // Entity this type belongs to (people, organization, deal)
  entity: {
    type: String,
    required: true,
    enum: ['people', 'organization', 'deal'],
    index: true
  },
  
  // Whether this entity type is active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // App context (optional - for app-specific entity types)
  appKey: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Metadata
  description: {
    type: String,
    trim: true
  },
  
  // Order for display
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for entity + appKey queries
EntityTypeSchema.index({ entity: 1, appKey: 1, isActive: 1 });

// Ensure unique key
EntityTypeSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('EntityType', EntityTypeSchema);
