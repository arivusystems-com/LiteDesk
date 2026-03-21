/**
 * ============================================================================
 * PLATFORM CORE: People (Contacts) Model
 * ============================================================================
 * 
 * This model represents people/contacts (app-agnostic):
 * - Basic contact information (name, email, phone)
 * - Organization reference (multi-tenancy)
 * - Assignment tracking
 * - Activity logs (generic audit trail)
 * 
 * ⚠️ ARCHITECTURAL NOTE: Contains SALES-specific fields
 *    - Lead/Contact type distinction (type: 'Lead' | 'Contact')
 *    - Lead-specific fields (lead_status, lead_score, qualification_date)
 *    - Contact-specific fields (contact_status, role, birthday)
 *    
 *    These fields are used by the SALES app but don't break platform core
 *    since they're optional. For pure platform core usage, ignore SALES fields.
 *    Future: Could split into People (platform core) + SalesContact (SALES app)
 *            if stricter separation is needed.
 * 
 * See PLATFORM_CORE_ANALYSIS.md for details.
 * ============================================================================
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PeopleSchema = new Schema({
  // Multi-tenancy
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },

  // System fields
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true }, // Default: optional (can be configured by admin)
  legacyContactId: { type: Schema.Types.ObjectId, index: true },

  // Core
  source: { type: String, trim: true },
  // ⚠️ SALES-SPECIFIC: Lead/Contact distinction (used by SALES app)
  // NOTE: This field is optional - participation is set via Attach-to-App, not during creation
  type: { type: String, enum: ['Lead', 'Contact'], required: false },

  first_name: { type: String, trim: true, required: true }, // Default: required (can be configured by admin)
  last_name: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !!(this.first_name || v);
      },
      message: 'Last Name is required if First Name is missing'
    }
  },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  mobile: { type: String, trim: true },

  organization: { type: Schema.Types.ObjectId, ref: 'Organization' }, // SALES Organization (company), not tenant Organization

  tags: [{ type: String, trim: true }],
  do_not_contact: { type: Boolean, default: false },

  // ⚠️ SALES-SPECIFIC: Lead-specific fields (used by SALES app)
  // Lead-specific
  lead_status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Disqualified', 'Nurturing', 'Re-Engage']
  },
  lead_owner: { type: Schema.Types.ObjectId, ref: 'User' },
  lead_score: { type: Number, min: 0 },

  interest_products: [{ type: String, trim: true }],
  qualification_date: { type: Date },
  qualification_notes: { type: String, trim: true },
  estimated_value: { type: Number, min: 0 },

  // ⚠️ SALES-SPECIFIC: Contact-specific fields (used by SALES app)
  // Contact-specific
  contact_status: {
    type: String,
    enum: ['Active', 'Inactive', 'DoNotContact']
  },
  role: {
    type: String,
    enum: ['Decision Maker', 'Influencer', 'Support', 'Other']
  },
  birthday: { type: Date },
  preferred_contact_method: {
    type: String,
    enum: ['Email', 'Phone', 'WhatsApp', 'SMS', 'None']
  },
  
  // Derived Status (computed from Configuration Registry)
  // This field is computed from lifecycle mappings and is nullable
  // If no config exists or computation fails, this remains null
  derivedStatus: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  
  // Trash (soft delete) - See docs/TRASH_IMPLEMENTATION_SPEC.md
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  deletionReason: { type: String, trim: true, maxlength: 500 },

  // Activity Logs (Generic audit trail - app-agnostic structure)
  // ⚠️ NOTE: The action field is a generic string, but action values may be app-specific
  //    SALES app may use values like "lead_status_changed", "contact_created", etc.
  //    Other apps can use their own action types. The structure itself is app-agnostic.
  activityLogs: [{
    user: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // Generic action type (values are app-specific)
    details: { type: Schema.Types.Mixed },
    appContext: { type: String }, // App context (appKey) - optional for backward compatibility
    timestamp: { type: Date, default: Date.now, required: true }
  }],

  // Description version history (native, task/deal parity)
  descriptionVersions: [{
    content: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // Custom fields (user-defined via Settings → Modules & Fields)
  customFields: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

PeopleSchema.index({ organizationId: 1, assignedTo: 1 });
PeopleSchema.index({ organizationId: 1, type: 1 });
PeopleSchema.index({ organizationId: 1, email: 1 }, { unique: false, sparse: true });
PeopleSchema.index({ organizationId: 1, lead_status: 1 });
PeopleSchema.index({ organizationId: 1, contact_status: 1 });
PeopleSchema.index({ organizationId: 1, legacyContactId: 1 }, { unique: false, sparse: true });
PeopleSchema.index({ organizationId: 1, deletedAt: 1 });

// Prevent createdBy from being modified after creation
PeopleSchema.pre('findOneAndUpdate', function() {
  // Remove createdBy from update if it exists
  const update = this.getUpdate();
  if (update && update.createdBy !== undefined) {
    delete update.createdBy;
  }
  // Also handle $set operations
  if (update && update.$set && update.$set.createdBy !== undefined) {
    delete update.$set.createdBy;
  }
});

PeopleSchema.pre('save', async function(next) {
  // If this is an update (not new document) and createdBy is being changed, prevent it
  if (!this.isNew && this.isModified('createdBy')) {
    try {
      // Fetch the original document to get the original createdBy value
      const original = await this.constructor.findById(this._id).select('createdBy').lean();
      if (original && original.createdBy) {
        // Restore the original value
        this.createdBy = original.createdBy;
        // Mark the field as unmodified
        this.unmarkModified('createdBy');
      }
      next();
    } catch (error) {
      // If we can't fetch the original, prevent the save
      next(new Error('createdBy field cannot be modified after creation'));
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('People', PeopleSchema);


