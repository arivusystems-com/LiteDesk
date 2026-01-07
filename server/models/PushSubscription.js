const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Push subscription model for PWA / Browser push notifications.
 * Stores Web Push API subscription details per user, per app.
 * 
 * Phase 13: External Notification Channels
 */
const pushSubscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  appKey: {
    type: String,
    required: true,
    enum: ['CRM', 'AUDIT', 'PORTAL']
  },
  endpoint: {
    type: String,
    required: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  // Track failures for auto-disable
  failureCount: {
    type: Number,
    default: 0
  },
  lastFailureAt: {
    type: Date,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound index for efficient lookups
pushSubscriptionSchema.index({ userId: 1, appKey: 1 });
pushSubscriptionSchema.index({ organizationId: 1, appKey: 1 });
// Unique constraint: one subscription per endpoint
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);

