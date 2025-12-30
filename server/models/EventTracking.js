const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * EventTracking Model
 * Tracks GPS coordinates, check-in/check-out, and movement during event execution
 * Used for GEO mode events
 */
const eventTrackingSchema = new Schema({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // For multi-org routes, track which org this is for
  orgIndex: {
    type: Number,
    default: null // null for single-org events
  },
  
  // Tracking entry type
  entryType: {
    type: String,
    enum: ['CHECK_IN', 'CHECK_OUT', 'GPS_POINT', 'PAUSE', 'RESUME'],
    required: true
  },
  
  // Location data
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null }, // GPS accuracy in meters
    altitude: { type: Number, default: null },
    heading: { type: Number, default: null }, // Direction of travel
    speed: { type: Number, default: null } // Speed in m/s
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Device info
  deviceInfo: {
    platform: String,
    userAgent: String,
    batteryLevel: Number
  },
  
  // Additional metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
eventTrackingSchema.index({ eventId: 1, timestamp: 1 });
eventTrackingSchema.index({ userId: 1, timestamp: -1 });
eventTrackingSchema.index({ organizationId: 1, timestamp: -1 });

module.exports = mongoose.model('EventTracking', eventTrackingSchema);

