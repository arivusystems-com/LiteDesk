const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReportSchema = new Schema({
  // Organization Reference (Multi-tenancy)
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Report Configuration
  reportType: {
    type: String,
    enum: ['sales', 'activity', 'funnel', 'custom'],
    default: 'custom'
  },
  entity: {
    type: String,
    enum: ['deals', 'contacts', 'tasks', 'events', 'forms'],
    default: 'deals'
  },
  
  // Filters
  filters: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed
  }],
  
  // Date Range
  dateRange: {
    type: {
      type: String,
      enum: ['custom', 'last_7_days', 'this_month', 'this_quarter', 'this_year'],
      default: 'custom'
    },
    startDate: Date,
    endDate: Date
  },
  
  // Grouping & Aggregation
  groupBy: [{
    type: String
  }],
  metrics: [{
    field: String,
    aggregation: {
      type: String,
      enum: ['sum', 'avg', 'count', 'min', 'max']
    },
    label: String
  }],
  
  // Visualization
  chartType: {
    type: String,
    enum: ['table', 'bar', 'line', 'pie', 'funnel'],
    default: 'table'
  },
  
  // Sorting
  sortBy: String,
  sortOrder: {
    type: String,
    enum: ['asc', 'desc'],
    default: 'asc'
  },
  
  // Scheduling
  isScheduled: {
    type: Boolean,
    default: false
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    recipients: [String],
    nextRun: Date
  },
  
  // Access
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
ReportSchema.index({ organizationId: 1, createdAt: -1 });
ReportSchema.index({ organizationId: 1, createdBy: 1 });
ReportSchema.index({ organizationId: 1, reportType: 1 });

module.exports = mongoose.model('Report', ReportSchema);

