const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');

// Audit history entry schema
const auditHistoryEntrySchema = new Schema({
  timestamp: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  actorUserId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    enum: ['status_changed', 'rescheduled', 'attendee_added', 'attendee_removed', 'attendee_status_changed', 'created', 'updated', 'deleted', 'note_added'] // Picklist
  },
  from: Schema.Types.Mixed, // Previous value
  to: Schema.Types.Mixed,    // New value
  metadata: Schema.Types.Mixed // Additional context (reason, oldStart, newStart, etc.)
}, { _id: false });


const eventSchema = new Schema({
  // Primary Key - UUID
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Basic Information
  eventName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 255
  },
  
  // Type & Status (Picklist fields) - Per Events Module Spec
  eventType: { 
    type: String, 
    enum: [
      'Meeting / Appointment', 
      'Internal Audit', 
      'External Audit — Single Org', 
      'External Audit Beat', 
      'Field Sales Beat'
    ],
    required: true,
    default: 'Meeting / Appointment'
  },
  
  // Execution Status - Per Events Module Spec
  status: { 
    type: String, 
    enum: [
      'PLANNED',           // Event created but not started
      'STARTED',          // Event execution started
      'CHECKED_IN',       // User checked in (GEO mode)
      'IN_PROGRESS',      // Currently executing
      'PAUSED',           // Auto-paused (GEO exit) or manual pause
      'CHECKED_OUT',      // User checked out (GEO mode)
      'SUBMITTED',        // Audit/Form submitted
      'PENDING_CORRECTIVE', // Audit needs corrective action
      'NEEDS_REVIEW',     // Corrective submitted, awaiting review
      'APPROVED',         // Corrective approved
      'REJECTED',         // Corrective rejected
      'CLOSED'            // Event completed and closed
    ],
    required: true,
    default: 'PLANNED'
  },
  
  // Audit Workflow State (for audit events only)
  auditState: {
    type: String,
    enum: ['DRAFT', 'IN_PROGRESS', 'PAUSED', 'SUBMITTED', 'PENDING_CORRECTIVE', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'],
    default: null
  },
  
  // Linked Organization (for audit events)
  relatedToId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  
  // Event Owner
  eventOwnerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  
  // Date & Time
  startDateTime: { 
    type: Date, 
    required: true 
  },
  endDateTime: { 
    type: Date, 
    required: true 
  },
  
  // Location (can be address or URL)
  location: { 
    type: String,
    maxlength: 1024,
    default: ''
  },
  
  // ===== GEO & EXECUTION FIELDS =====
  geoRequired: {
    type: Boolean,
    default: false
  },
  
  // GEO Location Data
  geoLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: null },
    radius: { type: Number, default: 100 }, // meters, default 100m
    accuracy: { type: Number, default: null } // GPS accuracy in meters
  },
  
  // Check-in/Check-out tracking
  checkIn: {
    timestamp: { type: Date, default: null },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null }
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  
  checkOut: {
    timestamp: { type: Date, default: null },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null }
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  
  // Execution tracking
  executionStartTime: { type: Date, default: null },
  executionEndTime: { type: Date, default: null },
  timeSpent: { type: Number, default: 0 }, // seconds
  
  // Auto-pause tracking (GEO mode)
  isPaused: { type: Boolean, default: false },
  pauseReasons: [{
    reason: { type: String, enum: ['GPS_EXIT', 'GPS_DISABLED', 'POOR_ACCURACY', 'MANUAL'], required: true },
    timestamp: { type: Date, default: Date.now },
    resumedAt: { type: Date, default: null }
  }],
  
  // ===== MULTI-ORG ROUTE FIELDS =====
  // For External Audit Beat and Field Sales Beat
  isMultiOrg: {
    type: Boolean,
    default: false
  },
  
  orgList: [{
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    sequence: { type: Number, required: true }, // Order in route
    status: { 
      type: String, 
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
      default: 'PENDING'
    },
    checkIn: {
      timestamp: { type: Date, default: null },
      location: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
      }
    },
    checkOut: {
      timestamp: { type: Date, default: null },
      location: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
      }
    },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: '' }
  }],
  
  routeSequence: {
    type: [Number], // Array of sequence numbers in order
    default: []
  },
  
  currentOrgIndex: {
    type: Number,
    default: 0 // Index of current org being visited
  },
  
  // ===== AUDIT-SPECIFIC FIELDS =====
  minVisitDuration: {
    type: Number,
    default: null // minutes
  },
  
  backgroundTracking: {
    type: Boolean,
    default: false // For External Audit Beat
  },
  
  minTimePerStop: {
    type: Number,
    default: null // minutes, for multi-org routes
  },
  
  partnerVisibility: {
    type: Boolean,
    default: false // For External Audit with guest auditor
  },
  
  // ===== FIELD SALES-SPECIFIC FIELDS =====
  allowedActions: {
    orders: { type: Boolean, default: true },
    payments: { type: Boolean, default: false },
    feedback: { type: Boolean, default: true }
  },
  
  kpiTargets: {
    orderCount: { type: Number, default: null },
    orderValue: { type: Number, default: null },
    visitCompletionPercent: { type: Number, default: null },
    conversionRate: { type: Number, default: null }
  },
  
  kpiActuals: {
    orderCount: { type: Number, default: 0 },
    orderValue: { type: Number, default: 0 },
    visitsCompleted: { type: Number, default: 0 },
    ordersCreated: { type: Number, default: 0 }
  },
  
  // ===== VISIBILITY & PERMISSIONS =====
  visibility: {
    type: String,
    enum: ['Internal', 'Partner', 'Public'],
    default: 'Internal'
  },
  
  // ===== ATTACHMENTS =====
  attachments: [{
    filename: { type: String, required: true },
    filepath: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Form Linking (for Audit events)
  linkedFormId: {
    type: Schema.Types.ObjectId,
    ref: 'Form',
    default: null
  },
  
  // Form Assignment (for assigning forms to auditors)
  formAssignment: {
    assignedAuditor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    dueDate: {
      type: Date,
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    }
  },
  
  // Recurrence - Universal field (Optional)
  recurrence: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Custom'],
    default: null
  },
  
  // Notes - Universal field (Optional)
  notes: { 
    type: String,
    maxlength: 5000,
    default: ''
  },
  
  // Audit History
  auditHistory: [auditHistoryEntrySchema],
  
  // Notes (for user-added notes/comments - backward compatibility)
  notes: [{
    text: { type: String, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
  }],
  
  // Metadata for storing additional data (form responses, etc.)
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Multi-tenancy
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true
  },
  
  // Timestamps (auto-filled)
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  createdTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  modifiedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  modifiedTime: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { 
  timestamps: false // We use createdTime/modifiedTime instead
});

// Indexes as per specification
eventSchema.index({ eventOwnerId: 1, startDateTime: 1 }, { name: 'idx_events_owner_start' });
eventSchema.index({ relatedToId: 1 }, { name: 'idx_events_relatedTo' });
eventSchema.index({ organizationId: 1, startDateTime: 1 });
eventSchema.index({ organizationId: 1, status: 1 });
eventSchema.index({ organizationId: 1, eventType: 1 });
eventSchema.index({ organizationId: 1, auditState: 1 });
eventSchema.index({ linkedFormId: 1 });
eventSchema.index({ 'formAssignment.assignedAuditor': 1 });
eventSchema.index({ isMultiOrg: 1, 'orgList.organizationId': 1 });
eventSchema.index({ 'orgList.organizationId': 1, 'orgList.sequence': 1 });
eventSchema.index({ geoRequired: 1, 'checkIn.timestamp': 1 });
eventSchema.index({ executionStartTime: 1 });
// eventId is already indexed via unique: true, no need for explicit index

// Virtual for duration
eventSchema.virtual('duration').get(function() {
  if (this.startDateTime && this.endDateTime) {
    return this.endDateTime - this.startDateTime;
  }
  return null;
});

// Pre-save middleware to update timestamps and add audit entries
eventSchema.pre('save', function(next) {
  const now = new Date();
  
  // Set createdTime on new documents
  if (this.isNew) {
    this.createdTime = now;
    this.modifiedTime = now;
    
    // Add creation audit entry
    if (!this.auditHistory) {
      this.auditHistory = [];
    }
    this.auditHistory.push({
      timestamp: now,
      actorUserId: this.createdBy,
      action: 'created',
      from: null,
      to: null,
      metadata: {
        eventName: this.eventName,
        eventType: this.eventType,
        startDateTime: this.startDateTime
      }
    });
  } else {
    // Update modifiedTime on existing documents
    this.modifiedTime = now;
  }
  
  // Validate end date is after start date
  if (this.endDateTime && this.startDateTime && this.endDateTime <= this.startDateTime) {
    return next(new Error('End date must be after start date'));
  }
  
  // ===== GEO REQUIRED ENFORCEMENT =====
  // Enforce GEO Required based on event type per spec
  if (this.isNew || this.isModified('eventType')) {
    if (this.eventType === 'Internal Audit' || this.eventType === 'External Audit Beat') {
      // Always ON, cannot be disabled
      this.geoRequired = true;
    } else if (this.eventType === 'External Audit — Single Org' || this.eventType === 'Field Sales Beat') {
      // ON by default, but can be disabled by admin
      if (this.geoRequired === undefined || this.geoRequired === null) {
        this.geoRequired = true;
      }
    } else if (this.eventType === 'Meeting / Appointment') {
      // OFF by default, but can be enabled
      if (this.geoRequired === undefined || this.geoRequired === null) {
        this.geoRequired = false;
      }
    }
  }
  
  // ===== AUDIT STATE INITIALIZATION =====
  // Set audit state for audit event types
  if (['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(this.eventType)) {
    if (!this.auditState) {
      this.auditState = 'DRAFT';
    }
  } else {
    // Clear audit state for non-audit events
    this.auditState = null;
  }
  
  // ===== MULTI-ORG SETUP =====
  // Auto-set isMultiOrg flag
  if (['External Audit Beat', 'Field Sales Beat'].includes(this.eventType)) {
    this.isMultiOrg = true;
    // Auto-generate route sequence if orgList has more than 1 org
    if (this.orgList && this.orgList.length > 1) {
      this.routeSequence = this.orgList
        .map((org, index) => ({ org, index }))
        .sort((a, b) => a.org.sequence - b.org.sequence)
        .map(item => item.index);
    }
  } else {
    this.isMultiOrg = false;
  }
  
  // ===== STATUS SYNCHRONIZATION =====
  // Sync status with auditState for audit events
  if (this.auditState) {
    const statusMap = {
      'DRAFT': 'PLANNED',
      'IN_PROGRESS': 'IN_PROGRESS',
      'PAUSED': 'PAUSED',
      'SUBMITTED': 'SUBMITTED',
      'PENDING_CORRECTIVE': 'PENDING_CORRECTIVE',
      'NEEDS_REVIEW': 'NEEDS_REVIEW',
      'APPROVED': 'APPROVED',
      'REJECTED': 'REJECTED',
      'CLOSED': 'CLOSED'
    };
    if (statusMap[this.auditState] && !['PLANNED', 'STARTED', 'CHECKED_IN', 'CHECKED_OUT'].includes(this.status)) {
      this.status = statusMap[this.auditState];
    }
  }
  
  next();
});

// Method to add audit history entry
eventSchema.methods.addAuditEntry = function(action, actorUserId, from, to, metadata) {
  if (!this.auditHistory) {
    this.auditHistory = [];
  }
  this.auditHistory.push({
    timestamp: new Date(),
    actorUserId: actorUserId,
    action: action,
    from: from,
    to: to,
    metadata: metadata || {}
  });
};

module.exports = mongoose.model('Event', eventSchema);
