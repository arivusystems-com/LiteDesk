#!/usr/bin/env node

/**
 * Find or Create Admin User and Fix Internal Instance
 * 
 * This script:
 * 1. Finds or creates admin@litedesk.com user
 * 2. Ensures their organization has all apps enabled
 * 3. Creates/updates Instance record with isInternal: true
 * 
 * Usage: node scripts/findOrCreateAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Instance = require('../models/Instance');
const { APP_KEYS } = require('../constants/appKeys');
const bcrypt = require('bcrypt');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

async function findOrCreateAdmin() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        
        // Connect to master database (litedesk_master)
        const masterUri = getMasterDatabaseUri();
        await mongoose.connect(masterUri);
        console.log('✅ Connected to MongoDB master database: litedesk_master\n');

        // Find admin user
        let user = await User.findOne({ email: 'admin@litedesk.com' })
            .populate('organizationId')
            .lean();
        
        let organization;
        
        if (!user) {
            console.log('⚠️  admin@litedesk.com not found. Creating...\n');
            
            // Find or create organization
            organization = await Organization.findOne({ name: 'LiteDesk Internal' });
            if (!organization) {
                organization = await Organization.create({
                    name: 'LiteDesk Internal',
                    enabledApps: [
                        { appKey: APP_KEYS.SALES, status: 'ACTIVE', enabledAt: new Date() },
                        { appKey: APP_KEYS.AUDIT, status: 'ACTIVE', enabledAt: new Date() },
                        { appKey: APP_KEYS.PORTAL, status: 'ACTIVE', enabledAt: new Date() }
                    ],
                    subscription: {
                        status: 'active'
                    }
                });
                console.log('✅ Created organization: LiteDesk Internal');
            } else {
                // Ensure all apps are enabled
                const currentAppKeys = (organization.enabledApps || []).map(app => 
                    typeof app === 'string' ? app : app.appKey
                );
                
                for (const appKey of [APP_KEYS.SALES, APP_KEYS.AUDIT, APP_KEYS.PORTAL]) {
                    if (!currentAppKeys.includes(appKey)) {
                        if (typeof organization.enabledApps[0] === 'string') {
                            organization.enabledApps.push(appKey);
                        } else {
                            organization.enabledApps.push({
                                appKey: appKey,
                                status: 'ACTIVE',
                                enabledAt: new Date()
                            });
                        }
                    }
                }
                await organization.save();
                console.log('✅ Updated organization: LiteDesk Internal');
            }
            
            // Create admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            user = await User.create({
                email: 'admin@litedesk.com',
                username: 'admin',
                password: hashedPassword,
                isOwner: true,
                organizationId: organization._id,
                status: 'active',
                role: 'owner',
                appAccess: [
                    { appKey: APP_KEYS.SALES, roleKey: 'ADMIN', status: 'ACTIVE', addedAt: new Date() }
                ]
            });
            console.log('✅ Created admin user: admin@litedesk.com\n');
        } else {
            console.log('✅ Found admin user: admin@litedesk.com');
            organization = await Organization.findById(user.organizationId._id || user.organizationId);
            console.log('');
        }

        // Ensure all apps are enabled
        const currentAppKeys = (organization.enabledApps || []).map(app => 
            typeof app === 'string' ? app : app.appKey
        );

        let needsUpdate = false;
        for (const appKey of [APP_KEYS.SALES, APP_KEYS.AUDIT, APP_KEYS.PORTAL]) {
            if (!currentAppKeys.includes(appKey)) {
                console.log(`   ➕ Adding ${appKey} to enabledApps...`);
                if (typeof organization.enabledApps[0] === 'string') {
                    organization.enabledApps.push(appKey);
                } else {
                    organization.enabledApps.push({
                        appKey: appKey,
                        status: 'ACTIVE',
                        enabledAt: new Date()
                    });
                }
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            await organization.save();
            console.log('   ✅ Organization updated\n');
        } else {
            console.log('   ✅ All apps already enabled\n');
        }

        // Ensure instance exists and is marked as internal
        const orgId = organization._id;
        let instance = await Instance.findOne({ organizationId: orgId });
        
        if (!instance) {
            console.log('🏢 Creating Instance record...');
            instance = await Instance.create({
                organizationId: orgId,
                status: 'ACTIVE',
                isInternal: true,
                source: 'MANUAL'
            });
            console.log('   ✅ Instance created with isInternal: true\n');
        } else {
            console.log('🏢 Instance found:');
            console.log(`   - Status: ${instance.status}`);
            console.log(`   - IsInternal: ${instance.isInternal || false}`);
            
            if (!instance.isInternal) {
                console.log('   ➕ Setting isInternal: true...');
                instance.isInternal = true;
                await instance.save();
                console.log('   ✅ Instance updated\n');
            } else {
                console.log('   ✅ Instance already marked as internal\n');
            }
        }

        // Verify
        console.log('🔍 Verifying setup...');
        const { resolveAppAccess } = require('../services/accessResolutionService');
        
        const updatedOrg = await Organization.findById(orgId).lean();
        const updatedInstance = await Instance.findOne({ organizationId: orgId }).lean();
        const updatedUser = await User.findById(user._id).lean();
        
        console.log('\n📋 Testing Access Resolution:');
        console.log('='.repeat(80));
        
        for (const appKey of ['SALES', 'AUDIT', 'PORTAL']) {
            try {
                const result = await resolveAppAccess({
                    user: updatedUser,
                    organization: updatedOrg,
                    appKey: appKey,
                    intent: 'EXECUTE'
                });

                const status = result.allowed ? '✅ ALLOWED' : '❌ DENIED';
                console.log(`   ${appKey.padEnd(10)} → ${status}`);
                if (result.allowed) {
                    console.log(`              Mode: ${result.mode}`);
                    console.log(`              Reason: ${result.reason}`);
                    if (result.reason === 'INTERNAL_INSTANCE_OVERRIDE') {
                        console.log(`              ✅ Internal instance override working!`);
                    }
                }
            } catch (error) {
                console.log(`   ${appKey.padEnd(10)} → ❌ ERROR: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ Setup complete!');
        console.log('\n📧 Login credentials:');
        console.log(`   Email: admin@litedesk.com`);
        console.log(`   Password: admin123`);
        console.log('\n💡 Next steps:');
        console.log('   1. Log in with admin@litedesk.com');
        console.log('   2. Try switching to Portal/Audit apps in the app switcher');
        console.log('');

    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

if (require.main === module) {
    findOrCreateAdmin().catch(console.error);
}

module.exports = findOrCreateAdmin;

