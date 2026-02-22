/**
 * ============================================================================
 * PLATFORM CORE: Trash Snapshot Model
 * ============================================================================
 *
 * Immutable backup of records moved to trash. Enables:
 * - Forensic recovery (full JSON snapshot)
 * - Schema-change resilience
 * - Cascade restore with parent references
 * - Compliance and legal hold
 *
 * See docs/TRASH_IMPLEMENTATION_SPEC.md
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrashSnapshotSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  appKey: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  moduleKey: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  originalId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  displayName: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  snapshot: {
    type: Schema.Types.Mixed,
    required: true
  },
  checksum: {
    type: String,
    trim: true
  },
  parentReferences: [{
    moduleKey: { type: String, required: true },
    recordId: { type: Schema.Types.ObjectId, required: true },
    fieldPath: { type: String }
  }],
  deletedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  deletionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  retentionExpiresAt: {
    type: Date,
    required: true
  },
  isLegalHold: {
    type: Boolean,
    default: false,
    index: true
  },
  legalHoldReason: { type: String, trim: true },
  legalHoldExpiresAt: { type: Date },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'trash_snapshots'
});

TrashSnapshotSchema.index({ organizationId: 1, deletedAt: -1 });
TrashSnapshotSchema.index({ organizationId: 1, moduleKey: 1, deletedAt: -1 });
TrashSnapshotSchema.index({ retentionExpiresAt: 1 });
TrashSnapshotSchema.index(
  { organizationId: 1, originalId: 1, moduleKey: 1 },
  { unique: true }
);

module.exports = mongoose.model('TrashSnapshot', TrashSnapshotSchema);
