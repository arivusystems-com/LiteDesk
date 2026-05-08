const mongoose = require('mongoose');

const UserDirectorySchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },
        tenantDatabaseName: {
            type: String,
            default: null
        },
        tenantUserId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('UserDirectory', UserDirectorySchema);
