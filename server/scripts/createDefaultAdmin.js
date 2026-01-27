#!/usr/bin/env node

/**
 * Create Default Admin Account
 * 
 * This script creates a default admin user and organization for the platform owner.
 * Run this once when setting up your LiteDesk instance.
 * 
 * Usage: node scripts/createDefaultAdmin.js
 */

// Load environment variables from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Role = require('../models/Role');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

// Default Admin Credentials (use environment variables or defaults)
const DEFAULT_ADMIN = {
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@litedesk.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
    username: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    organizationName: 'Arivu',
    industry: 'Technology'
};

async function createDefaultAdmin() {
    try {
        console.log('🚀 Creating Default Admin Account...\n');

        // Validate MongoDB URI
        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            console.error('\n📝 Steps to fix:');
            console.error('   1. Create /home/ubuntu/LiteDesk/server/.env file');
            console.error('   2. Add: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/litedesk');
            console.error('   3. Replace with your actual MongoDB Atlas connection string\n');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        
// Preserve any query string (e.g., authSource)
const [uriWithoutQuery, queryPart] = MONGO_URI.split('?');
const connectionQuery = queryPart ? `?${queryPart}` : '';

// Connect to master database (litedesk_master)
const baseUri = uriWithoutQuery.split('/').slice(0, -1).join('/');
        const masterDbName = 'litedesk_master';
const masterUri = `${baseUri}/${masterDbName}${connectionQuery}`;
        
        await mongoose.connect(masterUri);
        console.log(`✅ Connected to MongoDB master database: ${masterDbName}`);

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN.email });
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log(`   Email: ${DEFAULT_ADMIN.email}`);
            console.log('\n   To reset, delete the user first or change the email in this script.');
            await mongoose.connection.close();
            return;
        }

        // Create Master Organization
        console.log('\n📋 Creating Master Organization...');
        const organization = new Organization({
            name: DEFAULT_ADMIN.organizationName,
            industry: DEFAULT_ADMIN.industry,
            isActive: true,
            isTenant: true, // Mark as tenant organization (required for feature checks)
            subscription: {
                status: 'active',
                tier: 'paid', // Updated to match new subscription tiers
                trialStartDate: new Date(),
                trialEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
            },
            limits: {
                maxUsers: 999999,
                maxContacts: 999999,
                maxDeals: 999999,
                maxStorage: 999999
            },
            enabledModules: [
                'contacts',
                'deals',
                'tasks',
                'calendar',
                'reports',
                'settings',
                'users',
                'demo_requests',
                'instances'
            ],
            // Master organization starts with Sales, Audit, and Portal enabled
            enabledApps: [{
                appKey: 'SALES',
                status: 'ACTIVE',
                enabledAt: new Date()
            }, {
                appKey: 'AUDIT',
                status: 'ACTIVE',
                enabledAt: new Date()
            }, {
                appKey: 'PORTAL',
                status: 'ACTIVE',
                enabledAt: new Date()
            }]
        });

        await organization.save();
        console.log('✅ Master Organization created');
        console.log(`   Name: ${organization.name}`);
        console.log(`   ID: ${organization._id}`);

        // CRM organization will be created after admin user is created (to set assignedTo/accountManager)

        // Create Default Roles
        console.log('\n🔐 Creating default roles...');
        try {
            const roles = await Role.createDefaultRoles(organization._id);
            console.log('✅ Default roles created:', roles.length, 'roles');
            roles.forEach(role => {
                console.log(`   - ${role.name} (Level ${role.level})`);
            });
        } catch (roleError) {
            console.warn('⚠️  Failed to create default roles:', roleError.message);
        }

        // Hash password
        console.log('\n🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

        // Create Admin User
        console.log('\n👤 Creating Admin User...');
        const { APP_KEYS } = require('../constants/appKeys');
        const { validateAppRole } = require('../utils/appAccessUtils');
        
        // Ensure Sales app is present in enabledApps (preserve any other enabled apps like AUDIT/PORTAL)
        if (!organization.enabledApps || !organization.enabledApps.some(app => {
            const appKey = typeof app === 'string' ? app : app.appKey;
            return appKey === APP_KEYS.SALES;
        })) {
            const existingApps = Array.isArray(organization.enabledApps) ? organization.enabledApps : [];
            organization.enabledApps = [
                ...existingApps,
                {
                    appKey: APP_KEYS.SALES,
                    status: 'ACTIVE',
                    enabledAt: new Date()
                }
            ];
            await organization.save();
            console.log('✅ Ensured organization.enabledApps includes SALES (existing apps preserved)');
        }
        
        // Ensure owner has Sales: ADMIN access
        const salesRoleKey = 'ADMIN';
        if (!validateAppRole(APP_KEYS.SALES, salesRoleKey)) {
            throw new Error(`Invalid Sales roleKey: ${salesRoleKey}`);
        }

        const adminUser = new User({
            username: DEFAULT_ADMIN.username,
            email: DEFAULT_ADMIN.email,
            password: hashedPassword,
            firstName: DEFAULT_ADMIN.firstName,
            lastName: DEFAULT_ADMIN.lastName,
            organizationId: organization._id,
            role: 'owner',
            isOwner: true,
            status: 'active',
            userType: 'INTERNAL',
            appAccess: [{
                appKey: APP_KEYS.SALES,
                roleKey: salesRoleKey, // Owner must have Sales: ADMIN
                status: 'ACTIVE',
                addedAt: new Date()
            }],
            allowedApps: [APP_KEYS.SALES] // Legacy field for backward compatibility
        });

        // Set all permissions to true for owner
        adminUser.setPermissionsByRole('owner');

        await adminUser.save();
        console.log('✅ Admin User created');
        console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Role: ${adminUser.role}`);

        // Success summary
        console.log('\n' + '='.repeat(60));
        console.log('🎉 DEFAULT ADMIN ACCOUNT CREATED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('\n📝 LOGIN CREDENTIALS:\n');
        console.log(`   Email:    ${DEFAULT_ADMIN.email}`);
        console.log(`   Password: ${DEFAULT_ADMIN.password}`);
        console.log('\n⚠️  SECURITY WARNING:');
        console.log('   Please change this password immediately after first login!');
        console.log('   Go to Settings → Update Password\n');
        console.log('='.repeat(60));
        console.log('\n✅ You can now login at: http://localhost:5173');
        console.log('   Click "Admin Login" and use the credentials above.\n');

        await mongoose.connection.close();
        console.log('✅ Database connection closed\n');

    } catch (error) {
        console.error('\n❌ Error creating default admin:', error.message);
        console.error(error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run the script
createDefaultAdmin();

