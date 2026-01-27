#!/usr/bin/env node

/**
 * Diagnose user access issues
 * 
 * Usage: node scripts/diagnoseUserAccess.js [userEmail]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { resolveAppAccess } = require('../services/accessResolutionService');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function diagnoseUserAccess(userEmail = null) {
    try {
        console.log('🔍 User Access Diagnostic Tool\n');
        console.log('='.repeat(60));

        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);

        let users;
        if (userEmail) {
            users = await User.find({ email: userEmail.toLowerCase() });
        } else {
            users = await User.find({}).limit(5);
        }

        if (users.length === 0) {
            console.log('❌ No users found');
            await mongoose.connection.close();
            return;
        }

        console.log(`Found ${users.length} user(s)\n`);

        for (const user of users) {
            console.log('='.repeat(60));
            console.log(`User: ${user.email}`);
            console.log(`  ID: ${user._id}`);
            console.log(`  Organization ID: ${user.organizationId}`);
            console.log(`  Is Owner: ${user.isOwner || false}`);
            
            if (!user.organizationId) {
                console.log(`  ⚠️  User has no organizationId!\n`);
                continue;
            }

            // Get organization
            const org = await Organization.findById(user.organizationId);
            if (!org) {
                console.log(`  ❌ Organization not found: ${user.organizationId}\n`);
                continue;
            }

            console.log(`\n📋 Organization: ${org.name}`);
            console.log(`  Enabled Apps:`);
            if (org.enabledApps && org.enabledApps.length > 0) {
                org.enabledApps.forEach((app, idx) => {
                    const appKey = typeof app === 'string' ? app : app.appKey;
                    const status = typeof app === 'object' ? app.status : 'ACTIVE';
                    console.log(`    ${idx + 1}. ${appKey} (${status})`);
                });
            } else {
                console.log(`    ⚠️  No enabledApps set`);
            }

            console.log(`\n👤 User App Access:`);
            if (user.appAccess && user.appAccess.length > 0) {
                user.appAccess.forEach((access, idx) => {
                    console.log(`    ${idx + 1}. ${access.appKey} - ${access.roleKey} (${access.status})`);
                });
            } else {
                console.log(`    ⚠️  No appAccess set`);
            }

            // Test access resolution
            console.log(`\n🔍 Testing Access Resolution:`);
            try {
                const accessResult = await resolveAppAccess({
                    user: user.toObject ? user.toObject() : user,
                    organization: org.toObject ? org.toObject() : org,
                    appKey: 'SALES',
                    intent: 'VIEW'
                });

                console.log(`  Result:`);
                console.log(`    Allowed: ${accessResult.allowed}`);
                console.log(`    Mode: ${accessResult.mode || 'null'}`);
                console.log(`    Reason: ${accessResult.reason}`);
                console.log(`    Billable: ${accessResult.billable}`);
            } catch (error) {
                console.error(`  ❌ Error during access resolution:`, error.message);
                console.error(`  Stack:`, error.stack);
            }

            console.log('');
        }

        console.log('='.repeat(60));
        await mongoose.connection.close();
        console.log('✅ Diagnostic complete\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Get userEmail from command line args
const userEmail = process.argv[2] || null;
diagnoseUserAccess(userEmail);
