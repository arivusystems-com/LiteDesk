/**
 * ============================================================================
 * ThreadView Model (Email Unread Tracking)
 * ============================================================================
 *
 * Tracks per-user lastViewedAt for email threads.
 * Unread = lastMessageDirection === 'inbound' && lastActivityAt > lastViewedAt
 *
 * See docs/IN_PRODUCT_EMAIL_PLAN.md Phase 4.
 *
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ThreadViewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  threadId: { type: String, required: true, index: true },
  lastViewedAt: { type: Date, required: true }
}, {
  timestamps: true
});

ThreadViewSchema.index({ userId: 1, organizationId: 1, threadId: 1 }, { unique: true });

const ThreadView = mongoose.model('ThreadView', ThreadViewSchema);

module.exports = ThreadView;
