/**
 * ============================================================================
 * PLATFORM CORE: Lifecycle Status Map Model
 * ============================================================================
 * 
 * Maps lifecycle states to derived status values.
 * 
 * Key Features:
 * - Enables computation of derivedStatus from lifecycle state
 * - App-aware but not hardcoded
 * - Supports multiple status mappings per lifecycle
 * 
 * ============================================================================
 */

const mongoose = require('mongoose');

const LifecycleStatusMapSchema = new mongoose.Schema({
  // Lifecycle this mapping belongs to
  lifecycleKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Derived status value (computed from lifecycle state)
  derivedStatus: {
    type: String,
    required: true,
    trim: true
  },
  
  // Source status field name (e.g., 'lead_status', 'contact_status', 'stage')
  sourceStatusField: {
    type: String,
    required: true,
    trim: true
  },
  
  // Source status value (e.g., 'New', 'Qualified', 'Closed Won')
  sourceStatusValue: {
    type: String,
    required: true,
    trim: true
  },
  
  // App context (optional - for app-specific mappings)
  appKey: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Whether this mapping is active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Metadata
  description: {
    type: String,
    trim: true
  },

  // Stage → probability (0–100). Used for deal pipelines; optional.
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for lifecycleKey + appKey queries
LifecycleStatusMapSchema.index({ lifecycleKey: 1, appKey: 1, isActive: 1 });

// Index for status field lookups
LifecycleStatusMapSchema.index({ sourceStatusField: 1, sourceStatusValue: 1, isActive: 1 });

module.exports = mongoose.model('LifecycleStatusMap', LifecycleStatusMapSchema);
