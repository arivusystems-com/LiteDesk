const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { RECORD_SOURCE_VALUES, DEFAULT_RECORD_SOURCE } = require('../constants/recordSource');

// Item Schema Definition
const ItemSchema = new Schema({
    // 🏢 ORGANIZATION REFERENCE (Multi-tenancy)
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },

    // 📋 CORE IDENTIFICATION
    item_id: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    item_name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    item_code: {
        type: String,
        trim: true,
        index: true
    },
    item_type: {
        type: String,
        enum: ['Product', 'Service', 'Serialized Product', 'Non-Stock Product'],
        required: true,
        default: 'Product',
        index: true
    },

    // 📂 CATEGORIZATION
    category: {
        type: String,
        trim: true,
        index: true
    },
    subcategory: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],

    // 📏 MEASUREMENT & STATUS
    unit_of_measure: {
        type: String,
        enum: ['pcs', 'liters', 'hours', 'boxes', 'kg', 'meters', 'units'],
        default: 'pcs'
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
        index: true
    },

    // 📝 DESCRIPTION & MEDIA
    description: {
        type: String,
        trim: true
    },
    descriptionVersions: [{
        content: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    product_image: {
        type: String, // File path or URL
        trim: true
    },

    // 💰 PRICING
    cost_price: {
        type: Number,
        min: 0,
        default: 0
    },
    selling_price: {
        type: Number,
        min: 0,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD',
        trim: true
    },

    // 💳 TAX & COMMISSION
    tax_type: {
        type: String,
        enum: ['GST', 'VAT', 'None'],
        default: 'None'
    },
    tax_percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    commission_rate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // 🏭 INVENTORY MANAGEMENT (for Product & Serialized Product)
    stock_quantity: {
        type: Number,
        min: 0,
        default: 0
    },
    reorder_level: {
        type: Number,
        min: 0,
        default: 0
    },

    // 🔢 SERIALIZED PRODUCT FIELDS
    serial_numbers: [{
        type: String,
        trim: true
    }],
    warranty_period_months: {
        type: Number,
        min: 0,
        default: 0
    },

    // 🔗 RELATIONSHIPS
    vendor: {
        type: Schema.Types.ObjectId,
        ref: 'Organization', // Vendor organization
        index: true
    },
    linked_deals: [{
        type: Schema.Types.ObjectId,
        ref: 'Deal',
        index: true
    }],
    linked_invoices: [{
        type: Schema.Types.ObjectId,
        ref: 'Invoice', // Future module
        index: true
    }],
    linked_forms: [{
        type: Schema.Types.ObjectId,
        ref: 'Form',
        index: true
    }],
    linked_contacts: [{
        type: Schema.Types.ObjectId,
        ref: 'People',
        index: true
    }],

    /** System-managed creation channel (set server-side only) */
    source: {
        type: String,
        enum: RECORD_SOURCE_VALUES,
        default: DEFAULT_RECORD_SOURCE
    },

    // 📊 METADATA
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    
    // 🔧 CUSTOM FIELDS
    customFields: {
        type: Schema.Types.Mixed,
        default: {}
    },

    // Trash (soft delete) - See docs/TRASH_IMPLEMENTATION_SPEC.md
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletionReason: { type: String, trim: true, maxlength: 500 }
}, {
    timestamps: true // Automatically handles 'createdAt' and 'updatedAt'
});

// Indexes
ItemSchema.index({ organizationId: 1, status: 1 });
ItemSchema.index({ organizationId: 1, item_type: 1 });
ItemSchema.index({ organizationId: 1, category: 1 });
ItemSchema.index({ organizationId: 1, vendor: 1 });
ItemSchema.index({ organizationId: 1, item_code: 1 }, { unique: true, sparse: true });
ItemSchema.index({ organizationId: 1, deletedAt: 1 });

// Pre-save middleware to auto-generate item_id
ItemSchema.pre('save', async function(next) {
    if (!this.item_id) {
        // Generate item_id: ITM-001, ITM-002, etc.
        const count = await mongoose.model('Item').countDocuments({ organizationId: this.organizationId });
        this.item_id = `ITM-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Set modifiedBy on update
    if (!this.isNew && !this.modifiedBy) {
        // modifiedBy should be set by controller
    }
    
    // Auto-generate item_code if not provided (use item_id as fallback)
    if (!this.item_code && this.item_id) {
        this.item_code = this.item_id;
    }
    
    next();
});

// Virtual for calculating total price with tax
ItemSchema.virtual('totalPrice').get(function() {
    if (this.tax_type === 'None' || !this.tax_percentage) {
        return this.selling_price || 0;
    }
    return this.selling_price * (1 + this.tax_percentage / 100);
});

// Virtual for stock status
ItemSchema.virtual('stockStatus').get(function() {
    if (this.item_type === 'Service' || this.item_type === 'Non-Stock Product') {
        return 'N/A';
    }
    if (this.stock_quantity === 0) {
        return 'Out of Stock';
    }
    if (this.reorder_level > 0 && this.stock_quantity <= this.reorder_level) {
        return 'Low Stock';
    }
    return 'In Stock';
});

// Method to check if stock is low
ItemSchema.methods.isLowStock = function() {
    if (this.item_type === 'Service' || this.item_type === 'Non-Stock Product') {
        return false;
    }
    return this.reorder_level > 0 && this.stock_quantity <= this.reorder_level;
};

// Method to check if out of stock
ItemSchema.methods.isOutOfStock = function() {
    if (this.item_type === 'Service' || this.item_type === 'Non-Stock Product') {
        return false;
    }
    return this.stock_quantity === 0;
};

// Static method to get items by type
ItemSchema.statics.getItemsByType = async function(organizationId, itemType) {
    return await this.find({
        organizationId: organizationId,
        item_type: itemType,
        status: 'Active'
    }).sort({ item_name: 1 });
};

// Static method to get low stock items
ItemSchema.statics.getLowStockItems = async function(organizationId) {
    return await this.find({
        organizationId: organizationId,
        item_type: { $in: ['Product', 'Serialized Product'] },
        status: 'Active',
        $expr: {
            $lte: ['$stock_quantity', '$reorder_level']
        }
    }).sort({ stock_quantity: 1 });
};

// Static method to get item statistics
ItemSchema.statics.getItemStatistics = async function(organizationId) {
    // Convert organizationId to ObjectId if it's a string
    const orgId = mongoose.Types.ObjectId.isValid(organizationId) 
        ? (organizationId instanceof mongoose.Types.ObjectId ? organizationId : new mongoose.Types.ObjectId(organizationId))
        : organizationId;
    
    return await this.aggregate([
        { $match: { organizationId: orgId, deletedAt: null } },
        {
            $group: {
                _id: null,
                totalItems: { $sum: 1 },
                activeItems: {
                    $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                },
                inactiveItems: {
                    $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] }
                },
                products: {
                    $sum: { $cond: [{ $eq: ['$item_type', 'Product'] }, 1, 0] }
                },
                services: {
                    $sum: { $cond: [{ $eq: ['$item_type', 'Service'] }, 1, 0] }
                },
                serializedProducts: {
                    $sum: { $cond: [{ $eq: ['$item_type', 'Serialized Product'] }, 1, 0] }
                },
                nonStockProducts: {
                    $sum: { $cond: [{ $eq: ['$item_type', 'Non-Stock Product'] }, 1, 0] }
                },
                totalStockValue: {
                    $sum: {
                        $cond: [
                            { $in: ['$item_type', ['Product', 'Serialized Product']] },
                            { $multiply: ['$stock_quantity', '$cost_price'] },
                            0
                        ]
                    }
                }
            }
        }
    ]);
};

// Enable virtuals in JSON
ItemSchema.set('toJSON', { virtuals: true });
ItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Item', ItemSchema);

