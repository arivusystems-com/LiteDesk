/**
 * ============================================================================
 * Corrective Action Evidence Model
 * ============================================================================
 * 
 * Stores evidence files uploaded by Portal users for corrective actions.
 * 
 * Core Principles:
 * - Append-only (no updates, no deletes)
 * - Immutable once uploaded
 * - Organization isolation enforced
 * - Portal user ownership tracked
 * 
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CorrectiveActionEvidenceSchema = new Schema({
    // Organization isolation
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Links to corrective action
    correctiveActionId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    
    // Portal user who uploaded
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // File metadata
    fileUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    
    // Timestamp
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: false // We only use createdAt, not updatedAt (immutable)
});

// Indexes for efficient querying
CorrectiveActionEvidenceSchema.index({ correctiveActionId: 1, createdAt: -1 });
CorrectiveActionEvidenceSchema.index({ organizationId: 1, uploadedBy: 1 });

// Prevent updates and deletes (append-only)
CorrectiveActionEvidenceSchema.pre('findOneAndUpdate', function() {
    throw new Error('Evidence records cannot be updated');
});

CorrectiveActionEvidenceSchema.pre('findOneAndDelete', function() {
    throw new Error('Evidence records cannot be deleted');
});

module.exports = mongoose.model('CorrectiveActionEvidence', CorrectiveActionEvidenceSchema);

