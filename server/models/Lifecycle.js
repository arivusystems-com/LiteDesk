/**
 * ============================================================================
 * PLATFORM CORE: Lifecycle Model
 * ============================================================================
 * 
 * Defines lifecycles per entity type in a data-driven way.
 * 
 * Key Features:
 * - App-aware but not hardcoded
 * - Supports multiple lifecycles per entity type
 * - Ordered for display and workflow progression
 * 
 * ============================================================================
 */

const mongoose = require('mongoose');

const LifecycleSchema = new mongoose.Schema({
  // Unique identifier for the lifecycle
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
  
  // Entity type this lifecycle belongs to
  entityTypeKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Order for display and workflow progression
  order: {
    type: Number,
    required: true,
    default: 0,
    index: true
  },
  
  // Whether this lifecycle is active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // App context (optional - for app-specific lifecycles)
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
  }
}, {
  timestamps: true
});

// Compound index for entityTypeKey + appKey queries
LifecycleSchema.index({ entityTypeKey: 1, appKey: 1, isActive: 1, order: 1 });

// Ensure unique key
LifecycleSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Lifecycle', LifecycleSchema);
