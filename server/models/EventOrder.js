const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * EventOrder Model
 * Links orders created during Field Sales Beat events
 * Tracks orders, invoices, and payments per event
 */
const eventOrderSchema = new Schema({
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
  
  // For multi-org events, which org this order is for
  targetOrgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Order type
  orderType: {
    type: String,
    enum: ['ORDER', 'INVOICE', 'PAYMENT', 'FEEDBACK'],
    required: true
  },
  
  // Order details (flexible structure)
  orderData: {
    type: Schema.Types.Mixed,
    required: true
  },
  
  // Amount (for orders/invoices/payments)
  amount: {
    type: Number,
    default: null
  },
  
  // Currency
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    default: 'DRAFT'
  },
  
  // Created by
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Additional metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: false // Using createdAt instead
});

// Indexes
eventOrderSchema.index({ eventId: 1, createdAt: -1 });
eventOrderSchema.index({ targetOrgId: 1, createdAt: -1 });
eventOrderSchema.index({ organizationId: 1, orderType: 1 });
eventOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EventOrder', eventOrderSchema);

