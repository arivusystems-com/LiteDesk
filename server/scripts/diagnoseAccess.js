#!/usr/bin/env node

/**
 * Diagnose Access Issues
 * 
 * This script checks the actual user's access setup to identify issues.
 * 
 * Usage: node scripts/diagnoseAccess.js [userEmail]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Instance = require('../models/Instance');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');
const userEmail = process.argv[2];

async function diagnoseAccess() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        
        // Connect to master database (litedesk_master)
        const masterUri = getMasterDatabaseUri();
        await mongoose.connect(masterUri);
        console.log('✅ Connected to MongoDB master database: litedesk_master\n');

        // Find user
        let user;
        if (userEmail) {
            user = await User.findOne({ email: userEmail })
                .populate('organizationId')
                .lean();
        } else {
            user = await User.findOne({ isOwner: true })
                .populate('organizationId')
                .lean();
        }

        if (!user) {
            console.error('❌ User not found');
            await mongoose.disconnect();
            return;
        }

        console.log('👤 User Information:');
        console.log(`   - Email: ${user.email}`);
        console.log(`   - IsOwner: ${user.isOwner || false}`);
        console.log(`   - AllowedApps: ${JSON.stringify(user.allowedApps || [])}`);
        console.log(`   - AppAccess: ${JSON.stringify(user.appAccess || [])}`);
        console.log('');

        // Get organization
        const orgId = user.organizationId._id || user.organizationId;
        const organization = await Organization.findById(orgId).lean();

        if (!organization) {
            console.error('❌ Organization not found');
            await mongoose.disconnect();
            return;
        }

        console.log('🏢 Organization Information:');
        console.log(`   - Name: ${organization.name}`);
        console.log(`   - EnabledApps: ${JSON.stringify(organization.enabledApps || [])}`);
        console.log(`   - Subscription Status: ${organization.subscription?.status || 'N/A'}`);
        console.log('');

        // Check instance
        const instance = await Instance.findOne({ organizationId: orgId }).lean();
        console.log('🏢 Instance Information:');
        if (instance) {
            console.log(`   - Found: ${instance.instanceName || instance._id}`);
            console.log(`   - IsInternal: ${instance.isInternal || false}`);
            console.log(`   - Status: ${instance.status || 'N/A'}`);
        } else {
            console.log('   - No instance record (single-instance mode)');
            console.log('   - ⚠️  For internal instances, you need to create an Instance record with isInternal: true');
        }
        console.log('');

        // Extract enabled app keys
        const enabledAppKeys = [];
        if (organization.enabledApps && organization.enabledApps.length > 0) {
            organization.enabledApps.forEach(app => {
                if (typeof app === 'string') {
                    enabledAppKeys.push(app.toUpperCase());
                } else if (app && typeof app === 'object' && app.appKey) {
                    if (!app.status || app.status === 'ACTIVE') {
                        enabledAppKeys.push(app.appKey.toUpperCase());
                    }
                }
            });
        }

        console.log('📊 Access Analysis:');
        console.log('='.repeat(80));
        
        if (user.isOwner) {
            console.log('\n✅ User is OWNER');
            console.log(`   - Should have access to all enabled apps: ${enabledAppKeys.join(', ') || 'NONE'}`);
            
            if (instance?.isInternal) {
                console.log('   - ✅ Instance is INTERNAL → Owner has ADMIN access to all apps (INTERNAL_INSTANCE_OVERRIDE)');
            } else {
                console.log('   - ⚠️  Instance is NOT internal');
                console.log('   - Owner has ADMIN access for VIEW/CONFIGURE');
                console.log('   - Owner has EXECUTION access during TRIAL');
                console.log('   - After trial, owner needs explicit appAccess entries for EXECUTE');
            }
        } else {
            console.log('\n⚠️  User is NOT owner');
            console.log(`   - Needs explicit appAccess entries: ${JSON.stringify(user.appAccess || [])}`);
            console.log(`   - Or allowedApps: ${JSON.stringify(user.allowedApps || [])}`);
        }

        console.log('\n📋 Enabled Apps Check:');
        for (const appKey of ['CRM', 'AUDIT', 'PORTAL']) {
            const isEnabled = enabledAppKeys.includes(appKey);
            const hasAccess = (user.allowedApps || []).includes(appKey) ||
                (user.appAccess || []).some(a => a.appKey === appKey && a.status === 'ACTIVE');
            
            console.log(`   ${appKey}:`);
            console.log(`      - Enabled for org: ${isEnabled ? '✅' : '❌'}`);
            console.log(`      - User has access: ${hasAccess ? '✅' : '❌'}`);
            if (user.isOwner && isEnabled) {
                console.log(`      - Owner access: ✅ (should work)`);
            } else if (!hasAccess && !isEnabled) {
                console.log(`      - ⚠️  Issue: App not enabled AND user has no access`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n💡 Recommendations:');
        
        if (user.isOwner && !instance?.isInternal) {
            console.log('   1. If this is an internal instance, set isInternal: true on the Instance record');
            console.log('   2. Ensure organization.enabledApps includes all apps you want to access');
        }
        
        if (!user.isOwner) {
            console.log('   1. Add appAccess entries for the apps the user should access');
            console.log('   2. Or ensure organization.enabledApps includes the apps');
        }
        
        if (enabledAppKeys.length === 0) {
            console.log('   1. ⚠️  No apps are enabled for this organization!');
            console.log('   2. Add apps to organization.enabledApps array');
        }

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
    diagnoseAccess().catch(console.error);
}

module.exports = diagnoseAccess;

