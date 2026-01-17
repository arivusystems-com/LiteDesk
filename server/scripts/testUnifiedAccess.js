#!/usr/bin/env node

/**
 * Test Unified Access Resolution Service
 * 
 * This script tests the unified access resolution to verify:
 * 1. Owner access to all enabled apps (for internal instances)
 * 2. Owner access for regular instances
 * 3. Internal instance override
 * 4. Non-owner access
 * 
 * Usage: node scripts/testUnifiedAccess.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { resolveAppAccess } = require('../services/accessResolutionService');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Instance = require('../models/Instance');
const { APP_KEYS } = require('../constants/appKeys');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

async function testUnifiedAccess() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        
        // Connect to master database (litedesk_master)
        const masterUri = getMasterDatabaseUri();
        await mongoose.connect(masterUri);
        console.log('✅ Connected to MongoDB master database: litedesk_master\n');

        // Find an owner user
        let owner = await User.findOne({ isOwner: true })
            .populate('organizationId')
            .lean();
        
        if (!owner) {
            console.log('⚠️  No owner user found. Creating test scenario...\n');
            
            // Create a test organization
            const testOrg = await Organization.create({
                name: 'Test Organization',
                enabledApps: [
                    { appKey: 'CRM', status: 'ACTIVE' },
                    { appKey: 'AUDIT', status: 'ACTIVE' },
                    { appKey: 'PORTAL', status: 'ACTIVE' }
                ],
                subscription: {
                    status: 'trial'
                }
            });
            
            // Create a test owner user
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('test123', 10);
            owner = await User.create({
                email: 'test-owner@example.com',
                username: 'testowner',
                password: hashedPassword,
                isOwner: true,
                organizationId: testOrg._id,
                status: 'active',
                appAccess: [{ appKey: 'CRM', roleKey: 'ADMIN', status: 'ACTIVE' }]
            });
            
            console.log('✅ Created test owner user and organization\n');
        }

        console.log('👤 Found owner user:');
        console.log(`   - ID: ${owner._id}`);
        console.log(`   - Email: ${owner.email}`);
        console.log(`   - IsOwner: ${owner.isOwner}`);
        console.log(`   - Organization: ${owner.organizationId?.name || owner.organizationId?._id}`);
        console.log(`   - Enabled Apps: ${JSON.stringify(owner.organizationId?.enabledApps || [])}\n`);

        // Get organization with enabledApps first
        const organization = await Organization.findById(owner.organizationId._id || owner.organizationId)
            .lean();
        
        // Check if instance exists and if it's internal
        let instance = await Instance.findOne({ organizationId: owner.organizationId._id || owner.organizationId }).lean();
        console.log('🏢 Instance status:');
        if (instance) {
            console.log(`   - Found: ${instance.instanceName || instance._id}`);
            console.log(`   - IsInternal: ${instance.isInternal || false}`);
        } else {
            console.log('   - No instance record found (single-instance mode)');
            // Test both scenarios: with and without internal instance
            console.log('   - Testing with internal instance...');
            instance = await Instance.create({
                organizationId: owner.organizationId._id || owner.organizationId,
                instanceName: organization.name,
                isInternal: true,
                status: 'ACTIVE'
            });
            console.log('   ✅ Created internal instance');
        }
        
        // Also test without internal instance (delete it temporarily)
        const wasInternal = instance?.isInternal;
        if (wasInternal) {
            console.log('\n🔄 Testing WITHOUT internal instance (regular instance)...');
            await Instance.updateOne(
                { _id: instance._id },
                { $set: { isInternal: false } }
            );
            instance.isInternal = false;
        }
        console.log('');
        
        if (!organization) {
            console.error('❌ Organization not found');
            await mongoose.disconnect();
            return;
        }

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

        console.log('📋 Testing Access Resolution:\n');
        console.log('=' .repeat(80));

        // Test all apps
        const appsToTest = ['CRM', 'AUDIT', 'PORTAL', 'LMS'];
        const intentsToTest = ['VIEW', 'CONFIGURE', 'EXECUTE'];

        // Test with current instance status
        const instanceType = instance?.isInternal ? 'INTERNAL INSTANCE' : 'REGULAR INSTANCE';
        console.log(`\n🔍 Testing with ${instanceType} (isInternal: ${instance?.isInternal || false})\n`);

        for (const appKey of appsToTest) {
            const isEnabled = enabledAppKeys.includes(appKey);
            console.log(`\n📱 Testing App: ${appKey} (${isEnabled ? 'ENABLED' : 'NOT ENABLED'})`);
            console.log('-'.repeat(80));

            for (const intent of intentsToTest) {
                try {
                    // Get fresh instance data for each test
                    const currentInstance = await Instance.findOne({ 
                        organizationId: owner.organizationId._id || owner.organizationId 
                    }).lean();
                    
                    const result = await resolveAppAccess({
                        user: owner,
                        organization: organization,
                        appKey: appKey,
                        intent: intent
                    });

                    const status = result.allowed ? '✅ ALLOWED' : '❌ DENIED';
                    console.log(`   ${intent.padEnd(10)} → ${status}`);
                    if (result.allowed) {
                        console.log(`              Mode: ${result.mode || 'N/A'}`);
                        console.log(`              Billable: ${result.billable}`);
                        console.log(`              Reason: ${result.reason}`);
                        if (result.roleKey) {
                            console.log(`              Role: ${result.roleKey}`);
                        }
                    } else {
                        console.log(`              Reason: ${result.reason}`);
                    }
                } catch (error) {
                    console.log(`   ${intent.padEnd(10)} → ❌ ERROR: ${error.message}`);
                }
            }
        }
        
        // Now test without internal instance
        if (instance?.isInternal) {
            console.log('\n\n' + '='.repeat(80));
            console.log('🔄 Testing WITHOUT Internal Instance (Regular Instance Mode)\n');
            console.log('='.repeat(80));
            
            // Temporarily disable internal flag
            await Instance.updateOne(
                { _id: instance._id },
                { $set: { isInternal: false } }
            );
            
            // Test PORTAL specifically (the app that was failing)
            console.log(`\n📱 Testing App: PORTAL (ENABLED) - Regular Instance`);
            console.log('-'.repeat(80));
            
            for (const intent of intentsToTest) {
                try {
                    const result = await resolveAppAccess({
                        user: owner,
                        organization: organization,
                        appKey: 'PORTAL',
                        intent: intent
                    });

                    const status = result.allowed ? '✅ ALLOWED' : '❌ DENIED';
                    console.log(`   ${intent.padEnd(10)} → ${status}`);
                    if (result.allowed) {
                        console.log(`              Mode: ${result.mode || 'N/A'}`);
                        console.log(`              Billable: ${result.billable}`);
                        console.log(`              Reason: ${result.reason}`);
                        if (result.roleKey) {
                            console.log(`              Role: ${result.roleKey}`);
                        }
                    } else {
                        console.log(`              Reason: ${result.reason}`);
                    }
                } catch (error) {
                    console.log(`   ${intent.padEnd(10)} → ❌ ERROR: ${error.message}`);
                }
            }
            
            // Restore internal flag
            await Instance.updateOne(
                { _id: instance._id },
                { $set: { isInternal: true } }
            );
        }

        // Test with a non-owner user if available
        const nonOwner = await User.findOne({ 
            isOwner: false, 
            organizationId: owner.organizationId._id || owner.organizationId,
            status: 'active'
        }).lean();

        if (nonOwner) {
            console.log('\n\n👤 Testing Non-Owner Access:');
            console.log(`   - User: ${nonOwner.email}`);
            console.log(`   - Allowed Apps: ${JSON.stringify(nonOwner.allowedApps || [])}`);
            console.log(`   - App Access: ${JSON.stringify(nonOwner.appAccess || [])}`);
            console.log('-'.repeat(80));

            for (const appKey of ['CRM', 'PORTAL']) {
                const hasExplicitAccess = (nonOwner.allowedApps || []).includes(appKey) ||
                    (nonOwner.appAccess || []).some(access => 
                        access.appKey === appKey && access.status === 'ACTIVE'
                    );

                console.log(`\n📱 App: ${appKey} (${hasExplicitAccess ? 'HAS ACCESS' : 'NO ACCESS'})`);
                
                try {
                    const result = await resolveAppAccess({
                        user: nonOwner,
                        organization: organization,
                        appKey: appKey,
                        intent: 'VIEW'
                    });

                    const status = result.allowed ? '✅ ALLOWED' : '❌ DENIED';
                    console.log(`   VIEW → ${status} (Reason: ${result.reason})`);
                } catch (error) {
                    console.log(`   VIEW → ❌ ERROR: ${error.message}`);
                }
            }
        } else {
            console.log('\n\n⚠️  No non-owner user found for testing');
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ Access resolution testing complete!\n');

    } catch (error) {
        console.error('\n❌ Test error:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the test
if (require.main === module) {
    testUnifiedAccess().catch(console.error);
}

module.exports = testUnifiedAccess;

