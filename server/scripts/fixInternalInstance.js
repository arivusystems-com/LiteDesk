#!/usr/bin/env node

/**
 * Fix Internal Instance Setup
 * 
 * This script:
 * 1. Finds the owner user (admin@litedesk.com or first owner)
 * 2. Ensures their organization has all apps enabled
 * 3. Creates/updates Instance record with isInternal: true
 * 
 * Usage: node scripts/fixInternalInstance.js [userEmail]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Instance = require('../models/Instance');
const { APP_KEYS } = require('../constants/appKeys');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');
const userEmail = process.argv[2] || 'admin@litedesk.com';

async function fixInternalInstance() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        
        // Connect to master database (litedesk_master)
        const masterUri = getMasterDatabaseUri();
        await mongoose.connect(masterUri);
        console.log('✅ Connected to MongoDB master database: litedesk_master\n');

        // Find user - try exact match first, then case-insensitive, then search by owner
        let user = await User.findOne({ email: userEmail })
            .populate('organizationId')
            .lean();
        
        if (!user) {
            user = await User.findOne({ email: new RegExp(userEmail.replace('@', '.*@'), 'i') })
                .populate('organizationId')
                .lean();
        }
        
        if (!user) {
            console.log(`⚠️  User ${userEmail} not found. Searching for owner users...`);
            const owners = await User.find({ isOwner: true })
                .populate('organizationId')
                .lean();
            if (owners.length > 0) {
                console.log(`   Found ${owners.length} owner(s):`);
                owners.forEach(o => console.log(`     - ${o.email}`));
                user = owners[0];
            }
        }

        if (!user) {
            console.error('❌ No user found');
            await mongoose.disconnect();
            return;
        }

        console.log('👤 Found user:');
        console.log(`   - Email: ${user.email}`);
        console.log(`   - IsOwner: ${user.isOwner || false}`);
        console.log(`   - Organization: ${user.organizationId?.name || user.organizationId?._id}`);
        console.log('');

        // Get organization
        const orgId = user.organizationId._id || user.organizationId;
        const organization = await Organization.findById(orgId);

        if (!organization) {
            console.error('❌ Organization not found');
            await mongoose.disconnect();
            return;
        }

        console.log('🏢 Organization:');
        console.log(`   - Name: ${organization.name}`);
        console.log(`   - Current enabledApps: ${JSON.stringify(organization.enabledApps || [])}`);
        console.log('');

        // Ensure all apps are enabled
        const allApps = [
            { appKey: APP_KEYS.SALES, status: 'ACTIVE' },
            { appKey: APP_KEYS.AUDIT, status: 'ACTIVE' },
            { appKey: APP_KEYS.PORTAL, status: 'ACTIVE' }
        ];

        const currentEnabledApps = organization.enabledApps || [];
        const currentAppKeys = currentEnabledApps.map(app => 
            typeof app === 'string' ? app : app.appKey
        );

        let needsUpdate = false;
        for (const app of allApps) {
            if (!currentAppKeys.includes(app.appKey)) {
                console.log(`   ➕ Adding ${app.appKey} to enabledApps...`);
                if (typeof currentEnabledApps[0] === 'string') {
                    organization.enabledApps.push(app.appKey);
                } else {
                    organization.enabledApps.push({
                        appKey: app.appKey,
                        status: app.status,
                        enabledAt: new Date()
                    });
                }
                needsUpdate = true;
            } else {
                console.log(`   ✅ ${app.appKey} already enabled`);
            }
        }

        if (needsUpdate) {
            await organization.save();
            console.log('   ✅ Organization updated\n');
        } else {
            console.log('   ✅ All apps already enabled\n');
        }

        // Check/update instance
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

        // Verify the fix
        console.log('🔍 Verifying fix...');
        const { resolveAppAccess } = require('../services/accessResolutionService');
        
        const updatedOrg = await Organization.findById(orgId).lean();
        const updatedInstance = await Instance.findOne({ organizationId: orgId }).lean();
        
        console.log('\n📋 Testing Access Resolution:');
        console.log('='.repeat(80));
        
        for (const appKey of ['SALES', 'AUDIT', 'PORTAL']) {
            try {
                const result = await resolveAppAccess({
                    user: user,
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
        console.log('\n✅ Fix complete!');
        console.log('\n💡 Next steps:');
        console.log('   1. Log out and log back in to refresh organization data');
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
    fixInternalInstance().catch(console.error);
}

module.exports = fixInternalInstance;

