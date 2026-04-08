const DemoRequest = require('../models/DemoRequest');
const Organization = require('../models/Organization');
const People = require('../models/People');
const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const updatePeopleModuleFields = require('../scripts/updatePeopleModuleFields');
const updateOrganizationsModuleFields = require('../scripts/updateOrganizationsModuleFields');
const updateDealsModuleFields = require('../scripts/updateDealsModuleFields');

// --- Submit Demo Request (Public) ---
exports.submitDemoRequest = async (req, res) => {
    const { companyName, industry, companySize, contactName, email, phone, jobTitle, message } = req.body;
    
    try {
        console.log('📝 Demo request received from:', email);
        
        // Validate required fields
        if (!companyName || !contactName || !email || !industry || !companySize) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields' 
            });
        }
        
        // Check if email already requested
        const existing = await DemoRequest.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ 
                success: false,
                message: 'A demo request with this email already exists. We will contact you soon!' 
            });
        }
        
        // Step 1: Create Organization for the prospect company
        // Single organization table handles both tenant and Sales fields
        console.log('📋 Creating organization for:', companyName);
        
        // Generate unique slug to avoid conflicts
        let baseSlug = companyName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        // Check if slug exists and make it unique if needed
        let slug = baseSlug;
        let counter = 1;
        while (await Organization.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        // Create single organization with both tenant and Sales fields
        const organization = await Organization.create({
            name: companyName,
            slug: slug,
            industry: industry,
            isActive: true,
            
            // Tenant fields (ready for when they convert)
            subscription: {
                tier: 'trial',
                status: 'trial', // In trial until they convert
                trialStartDate: new Date(),
                trialEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days
            },
            limits: {
                maxUsers: -1, // Unlimited - let users explore the product
                maxContacts: -1, // Unlimited
                maxDeals: -1, // Unlimited
                maxStorageGB: -1 // Unlimited
            },
            settings: {
                timeZone: 'UTC',
                currency: 'USD'
            },
            enabledModules: ['contacts', 'deals'], // Limited modules for prospects
            // New organizations start with Sales enabled only
            enabledApps: [{
                appKey: 'SALES',
                status: 'ACTIVE',
                enabledAt: new Date()
            }],
            
            // Sales fields (for tracking as prospect)
            types: [], // Empty types for prospects
            customerStatus: 'Prospect', // Sales status field
            
            // Flag: Not a tenant yet (will be set to true on conversion)
            isTenant: false
        });
        
        console.log('✅ Organization created:', organization._id, organization.name, 'slug:', slug);
        
        // Step 1.5: Create Default Roles for the organization
        console.log('🔐 Creating default roles...');
        try {
            const roles = await Role.createDefaultRoles(organization._id);
            console.log('✅ Default roles created:', roles.length, 'roles');
        } catch (roleError) {
            console.warn('⚠️  Failed to create default roles:', roleError.message);
            // Continue even if role creation fails
        }
        
        // Step 1.6: Initialize Sales modules for the organization
        // Using Sales app initializer to keep initialization centralized
        console.log('🔍 Initializing Sales modules...');
        try {
            const salesInitializer = require('../services/salesAppInitializer');
            const initResult = await salesInitializer.initializeSales(organization._id);
            if (initResult.success) {
                console.log('✅ Sales modules initialized:', initResult.initialized.join(', '));
            } else {
                console.warn('⚠️  Sales initialization completed with errors:', initResult.errors);
            }
        } catch (moduleError) {
            console.warn('⚠️  Failed to initialize Sales modules:', moduleError.message);
            // Continue even if module initialization fails - can be run manually later
        }
        
        // Initialize Organizations module (if needed)
        try {
            await updateOrganizationsModuleFields(organization._id);
            console.log('✅ Organizations module definition initialized with dependencies');
        } catch (moduleError) {
            console.warn('⚠️  Failed to initialize Organizations module:', moduleError.message);
            // Continue even if module initialization fails - can be run manually later
        }
        
        // Step 2: Create People for the requester
        // Find master admin user to use as createdBy/assignedTo (required fields)
        console.log('👤 Finding master admin user...');
        const masterAdmin = await User.findOne({ isOwner: true })
            .sort({ createdAt: 1 }); // Get the first owner (master admin)
        
        if (!masterAdmin) {
            console.error('❌ No master admin user found! Cannot create People record.');
            throw new Error('System configuration error: Master admin not found');
        }
        
        console.log('✅ Using master admin:', masterAdmin.email);
        
        console.log('👤 Creating person for:', contactName);
        // ⚠️ IMPORTANT: Person creation is identity-only and app-agnostic.
        //    Participation fields (type, lead_score, etc.) are NOT set here.
        //    They must be set via Attach-to-App flow.
        const person = await People.create({
            organizationId: organization._id,  // Organization reference
            organization: organization._id,  // Sales organization link (same organization)
            createdBy: masterAdmin._id,
            assignedTo: masterAdmin._id,
            // No type field - identity only, no Sales participation
            first_name: contactName.split(' ')[0] || contactName,
            last_name: contactName.split(' ').slice(1).join(' ') || '',
            email: email.toLowerCase(),
            phone: phone || '',
            source: 'Web Form',
            // No lead_score - participation field, not set on creation
            tags: ['demo-request', industry, companySize]
        });
        
        console.log('✅ People created:', person._id, person.email);
        
        // Step 3: Create demo request with references
        const demoRequest = await DemoRequest.create({
            companyName,
            industry,
            companySize,
            contactName,
            email: email.toLowerCase(),
            phone,
            jobTitle,
            message,
            status: 'pending',
            source: 'website',
            organizationId: organization._id, // Link to organization
            contactId: person._id // Link to people
        });
        
        console.log('✅ Demo request created:', demoRequest._id);
        console.log('🔗 Linked to Organization:', organization._id);
        console.log('🔗 Linked to People:', person._id);
        
        // TODO: Send email notification to sales team
        // TODO: Send confirmation email to requester
        
        res.status(201).json({
            success: true,
            message: 'Thank you for your interest! Our team will contact you within 24 hours.',
            requestId: demoRequest._id,
            organizationId: organization._id,
            contactId: person._id
        });
        
    } catch (error) {
        console.error('❌ Demo request error:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error name:', error.name);
        res.status(500).json({ 
            success: false,
            message: 'Error submitting demo request. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// --- Get All Demo Requests (Admin Only) ---
exports.getDemoRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        
        const requests = await DemoRequest.find(query)
            .sort({ createdAt: -1 })
            .populate('assignedTo', 'username email firstName lastName')
            .populate('organizationId', 'name industry')
            .populate('contactId', 'first_name last_name email phone lifecycle_stage')
            .populate('convertedToInstanceId', 'instanceName subdomain status');
        
        res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching demo requests:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error fetching demo requests' 
        });
    }
};

// --- Get Single Demo Request ---
exports.getDemoRequest = async (req, res) => {
    try {
        const request = await DemoRequest.findById(req.params.id)
            .populate('assignedTo', 'username email firstName lastName')
            .populate('organizationId', 'name industry subscription')
            .populate('contactId', 'first_name last_name email phone job_title lifecycle_stage lead_score')
            .populate('convertedToInstanceId', 'instanceName subdomain status urls');
        
        if (!request) {
            return res.status(404).json({ 
                success: false,
                message: 'Demo request not found' 
            });
        }
        
        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('Error fetching demo request:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
};

// --- Update Demo Request Status ---
exports.updateDemoRequest = async (req, res) => {
    try {
        const { status, notes, assignedTo, preferredDemoDate } = req.body;
        
        const updateData = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
        if (preferredDemoDate) updateData.preferredDemoDate = preferredDemoDate;
        
        const demoRequest = await DemoRequest.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('assignedTo', 'username email');
        
        if (!demoRequest) {
            return res.status(404).json({ 
                success: false,
                message: 'Demo request not found' 
            });
        }
        
        console.log('✅ Demo request updated:', demoRequest._id, '- Status:', demoRequest.status);
        
        res.json({
            success: true,
            data: demoRequest,
            message: 'Demo request updated successfully'
        });
    } catch (error) {
        console.error('Error updating demo request:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error updating demo request' 
        });
    }
};

// --- Convert Demo Request to Instance (Multi-Instance Architecture) ---
exports.convertToOrganization = async (req, res) => {
    try {
        const demoRequest = await DemoRequest.findById(req.params.id);
        
        if (!demoRequest) {
            return res.status(404).json({ 
                success: false,
                message: 'Demo request not found' 
            });
        }
        
        if (demoRequest.status === 'converted') {
            return res.status(400).json({ 
                success: false,
                message: 'This demo request has already been converted' 
            });
        }
        
        const { password, subscriptionTier = 'trial' } = req.body;
        
        if (!password) {
            return res.status(400).json({ 
                success: false,
                message: 'Password is required for conversion' 
            });
        }
        
        console.log('🔄 Converting demo request to ORGANIZATION:', demoRequest.email);
        
        // Get the organization
        console.log('📋 Step 1: Fetching organization...');
        const organization = await Organization.findById(demoRequest.organizationId);
        if (!organization) {
            return res.status(404).json({ 
                success: false,
                message: 'Organization not found for this demo request' 
            });
        }
        console.log('✅ Organization found:', organization.name);
        
        // Validate subscription tier (only 'trial' or 'paid' allowed)
        const validTiers = ['trial', 'paid'];
        const tier = validTiers.includes(subscriptionTier) ? subscriptionTier : 'trial';
        console.log('✅ Subscription tier:', tier);
        
        // Generate database name from organization slug or ID
        const dbName = organization.slug 
            ? `litedesk_${organization.slug.replace(/-/g, '_')}`
            : `litedesk_${organization._id.toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        console.log('📦 Step 2: Creating dedicated database:', dbName);
        
        // Import database connection manager
        const dbConnectionManager = require('../utils/databaseConnectionManager');
        
        // Create organization database
        try {
            await dbConnectionManager.createOrganizationDatabase(dbName);
            console.log('✅ Database created:', dbName);
        } catch (dbError) {
            console.error('❌ Database creation failed:', dbError.message);
            console.error('❌ Database error stack:', dbError.stack);
            // Continue anyway - database might already exist
        }
        
        console.log('📦 Step 3: Getting organization database connection...');
        // Get organization database connection
        const orgDbConnection = await dbConnectionManager.getOrganizationConnection(dbName);
        console.log('✅ Organization database connection established');
        
        // Build connection string for storage (use baseMongoUri from connection manager)
        if (!dbConnectionManager.baseMongoUri) {
            // Ensure baseMongoUri is set
            await dbConnectionManager.initializeMasterConnection();
        }
        const baseUri = dbConnectionManager.baseMongoUri;
        if (!baseUri) {
            throw new Error('Failed to get base MongoDB URI. Please ensure MONGO_URI is set in .env');
        }
        const connectionString = `${baseUri}/${dbName}`;
        console.log('✅ Connection string built:', connectionString);
        
        console.log('📦 Step 4: Updating organization with database info...');
        
        // Get modules for the subscription tier (exclude admin-only modules)
        const OrganizationModel = require('../models/Organization');
        const tempOrg = new OrganizationModel();
        const tierModules = tempOrg.getModulesForTier(tier);
        
        // Remove admin-only modules (demo_requests, instances, etc.)
        const adminModules = ['demo_requests', 'instances', 'users', 'settings'];
        const allowedModules = tierModules.filter(module => !adminModules.includes(module));
        
        // Update organization with database info and mark as tenant
        await Organization.findByIdAndUpdate(
            demoRequest.organizationId,
            {
                isTenant: true, // Mark as tenant organization
                customerStatus: 'Active', // Update Sales status
                // Update subscription tier and status
                'subscription.tier': tier,
                'subscription.status': tier === 'trial' ? 'trial' : 'active',
                // Store database configuration
                'database.name': dbName,
                'database.connectionString': connectionString,
                'database.createdAt': new Date(),
                'database.initialized': true,
                // Update enabled modules (exclude admin-only modules)
                enabledModules: allowedModules
            }
        );
        console.log('✅ Organization marked as tenant with database:', dbName);
        console.log('✅ Enabled modules:', allowedModules.join(', '));

        try {
            await updateDealsModuleFields(organization._id);
            console.log('✅ Deals module definition refreshed after conversion');
        } catch (moduleError) {
            console.warn('⚠️  Failed to refresh Deals module during conversion:', moduleError.message);
        }
        
        // Create owner user in the organization's database
        console.log('👤 Step 5: Creating owner user in organization database...');
        
        // Import User model for organization database
        // Check if model already exists on this connection
        let OrgUser;
        if (orgDbConnection.models.User) {
            OrgUser = orgDbConnection.models.User;
            console.log('✅ Using existing User model on organization connection');
        } else {
            console.log('📋 Creating User model for organization database...');
            // Get schema definition from the compiled User model
            const UserModel = require('../models/User');
            const originalSchema = UserModel.schema;
            
            console.log('📋 Schema definition retrieved, creating new schema instance...');
            // Create a new schema instance from the schema definition object
            // Mongoose doesn't have clone(), so we need to create from the definition
            const UserSchema = new mongoose.Schema(originalSchema.obj, originalSchema.options);
            
            // Copy methods from original schema
            if (originalSchema.methods) {
                Object.keys(originalSchema.methods).forEach(methodName => {
                    UserSchema.methods[methodName] = originalSchema.methods[methodName];
                });
                console.log(`✅ Copied ${Object.keys(originalSchema.methods).length} methods`);
            }
            
            // Copy statics from original schema
            if (originalSchema.statics) {
                Object.keys(originalSchema.statics).forEach(staticName => {
                    UserSchema.statics[staticName] = originalSchema.statics[staticName];
                });
                console.log(`✅ Copied ${Object.keys(originalSchema.statics).length} statics`);
            }
            
            // Copy indexes from original schema
            if (originalSchema._indexes && originalSchema._indexes.length > 0) {
                originalSchema._indexes.forEach(index => {
                    UserSchema.index(index[0], index[1]);
                });
                console.log(`✅ Copied ${originalSchema._indexes.length} indexes`);
            }
            
            // Register the model with the organization database connection
            OrgUser = orgDbConnection.model('User', UserSchema);
            console.log('✅ Created User model on organization connection');
        }
        
        // Extract first and last name (used in both org and master DB)
        const nameParts = demoRequest.contactName ? demoRequest.contactName.split(' ') : [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Check if user already exists
        const existingUser = await OrgUser.findOne({ email: demoRequest.email.toLowerCase() });
        
        if (existingUser) {
            console.log('⚠️  User already exists in organization database');
            // Update existing user
            existingUser.organizationId = demoRequest.organizationId;
            existingUser.role = 'owner';
            existingUser.isOwner = true;
            existingUser.status = 'active';
            existingUser.setPermissionsByRole('owner');
            await existingUser.save();
            console.log('✅ Existing user updated as owner');
        } else {
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Create owner user in organization database
            const ownerUser = await OrgUser.create({
                organizationId: demoRequest.organizationId,
                username: demoRequest.email.split('@')[0] || demoRequest.contactName?.toLowerCase().replace(/\s+/g, '') || 'user',
                email: demoRequest.email.toLowerCase(),
                password: hashedPassword,
                firstName: firstName,
                lastName: lastName,
                phoneNumber: demoRequest.phone || '',
                role: 'owner',
                isOwner: true,
                status: 'active'
            });
            
            // Set owner permissions
            ownerUser.setPermissionsByRole('owner');
            await ownerUser.save();
            
            console.log('✅ Owner user created in organization database:', ownerUser.email);
        }
        
        // Also create user in master database for login lookup (with minimal info)
        console.log('👤 Step 6: Creating user reference in master database for login...');
        const MasterUser = require('../models/User');
        const masterUserExists = await MasterUser.findOne({ email: demoRequest.email.toLowerCase() });
        
        if (!masterUserExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            await MasterUser.create({
                organizationId: demoRequest.organizationId,
                username: demoRequest.email.split('@')[0] || 'user',
                email: demoRequest.email.toLowerCase(),
                password: hashedPassword,
                firstName: firstName,
                lastName: lastName,
                phoneNumber: demoRequest.phone || '',
                role: 'owner',
                isOwner: true,
                status: 'active'
            });
            console.log('✅ User reference created in master database');
        } else {
            console.log('⚠️  User already exists in master database');
        }
        
        // Update demo request
        demoRequest.status = 'converted';
        demoRequest.convertedAt = new Date();
        await demoRequest.save();
        
        // Return success response
        res.json({
            success: true,
            message: 'Organization converted successfully. Dedicated database created.',
            data: {
                demoRequestId: demoRequest._id,
                organizationId: demoRequest.organizationId,
                databaseName: dbName,
                status: 'converted',
                loginCredentials: {
                    email: demoRequest.email,
                    password: 'Use the password you provided during conversion'
                },
                note: 'User can now login to access their organization'
            }
        });
        
    } catch (error) {
        console.error('❌ Conversion error:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // Return detailed error in development
        const errorResponse = {
            success: false,
            message: 'Error converting demo request',
            error: error.message,
            stack: error.stack,
            name: error.name
        };
        
        // Add additional error details if available
        if (error.code) errorResponse.code = error.code;
        if (error.keyPattern) errorResponse.keyPattern = error.keyPattern;
        if (error.keyValue) errorResponse.keyValue = error.keyValue;
        
        res.status(500).json(errorResponse);
    }
};

// --- Delete Demo Request ---
exports.deleteDemoRequest = async (req, res) => {
    try {
        const demoRequest = await DemoRequest.findByIdAndDelete(req.params.id);
        
        if (!demoRequest) {
            return res.status(404).json({ 
                success: false,
                message: 'Demo request not found' 
            });
        }
        
        console.log('🗑️ Demo request deleted:', demoRequest.email);
        
        res.json({
            success: true,
            message: 'Demo request deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting demo request:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
};

// --- Get Demo Request Statistics ---
exports.getStats = async (req, res) => {
    try {
        const stats = await DemoRequest.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const total = await DemoRequest.countDocuments();
        const thisMonth = await DemoRequest.countDocuments({
            createdAt: { $gte: new Date(new Date().setDate(1)) }
        });
        
        res.json({
            success: true,
            data: {
                total,
                thisMonth,
                byStatus: stats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
};

