#!/usr/bin/env node

/**
 * ============================================================================
 * App Access Verification Script
 * ============================================================================
 * 
 * This script verifies that users have the correct appAccess structure
 * and userType set according to the new app-aware access system.
 * 
 * Usage: node server/scripts/verifyAppAccess.js
 * ============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { APP_KEYS } = require('../constants/appKeys');
const { validateAppRole, validateUserTypeForApp, getAppConfig } = require('../utils/appAccessUtils');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function verifyUsers() {
    try {
        console.log('🔍 Starting App Access Verification\n');

        // Validate MongoDB URI
        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
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
        console.log(`✅ Connected to MongoDB master database: ${masterDbName}\n`);

        // Find all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to verify\n`);

        let validCount = 0;
        let warningCount = 0;
        let errorCount = 0;

        for (const user of users) {
            console.log(`\n👤 User: ${user.email}`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Is Owner: ${user.isOwner}`);
            
            // Check userType
            if (!user.userType) {
                console.log(`   ⚠️  WARNING: userType is not set (should be INTERNAL, EXTERNAL, or SYSTEM)`);
                warningCount++;
            } else {
                console.log(`   ✅ userType: ${user.userType}`);
            }

            // Check appAccess
            if (!user.appAccess || user.appAccess.length === 0) {
                console.log(`   ⚠️  WARNING: appAccess is empty`);
                if (user.allowedApps && user.allowedApps.length > 0) {
                    console.log(`   📝 Legacy allowedApps: ${user.allowedApps.join(', ')}`);
                    console.log(`   💡 Run migration script to convert allowedApps → appAccess`);
                }
                warningCount++;
            } else {
                console.log(`   ✅ appAccess entries: ${user.appAccess.length}`);
                
                // Verify each appAccess entry
                for (const access of user.appAccess) {
                    console.log(`      - App: ${access.appKey}, Role: ${access.roleKey}, Status: ${access.status}`);
                    
                    // Validate app exists in registry
                    const appConfig = getAppConfig(access.appKey);
                    if (!appConfig) {
                        console.log(`         ❌ ERROR: App ${access.appKey} not found in appRegistry`);
                        errorCount++;
                        continue;
                    }
                    
                    // Validate role
                    if (!validateAppRole(access.appKey, access.roleKey)) {
                        console.log(`         ❌ ERROR: Role ${access.roleKey} is not valid for ${access.appKey}`);
                        console.log(`         💡 Valid roles: ${appConfig.roles.join(', ')}`);
                        errorCount++;
                    } else {
                        console.log(`         ✅ Role validated`);
                    }
                    
                    // Validate userType can access app
                    const userType = user.userType || 'INTERNAL';
                    if (!validateUserTypeForApp(userType, access.appKey)) {
                        console.log(`         ❌ ERROR: UserType ${userType} cannot access ${access.appKey}`);
                        console.log(`         💡 Allowed userTypes: ${appConfig.userTypesAllowed.join(', ')}`);
                        errorCount++;
                    } else {
                        console.log(`         ✅ UserType validated`);
                    }
                    
                    // Check status
                    if (access.status !== 'ACTIVE' && access.status !== 'DISABLED') {
                        console.log(`         ⚠️  WARNING: Invalid status ${access.status} (should be ACTIVE or DISABLED)`);
                        warningCount++;
                    }
                }
                
                // Special check for owners
                if (user.isOwner) {
                    const hasCRMAdmin = user.appAccess.some(
                        a => a.appKey === APP_KEYS.CRM && a.roleKey === 'ADMIN' && a.status === 'ACTIVE'
                    );
                    if (!hasCRMAdmin) {
                        console.log(`   ❌ ERROR: Owner must have CRM: ADMIN access`);
                        errorCount++;
                    } else {
                        console.log(`   ✅ Owner has CRM: ADMIN access`);
                    }
                }
            }

            // Check legacy allowedApps (for backward compatibility)
            if (user.allowedApps && user.allowedApps.length > 0) {
                console.log(`   📝 Legacy allowedApps: ${user.allowedApps.join(', ')}`);
            }

            if (errorCount === 0 && warningCount === 0) {
                validCount++;
            }
        }

        console.log('\n\n========================================');
        console.log('📊 Verification Summary:');
        console.log(`   ✅ Valid: ${validCount} users`);
        console.log(`   ⚠️  Warnings: ${warningCount} issues`);
        console.log(`   ❌ Errors: ${errorCount} issues`);
        console.log('========================================\n');

        if (errorCount > 0) {
            console.log('❌ Some users have errors. Please review and fix.\n');
            process.exit(1);
        } else if (warningCount > 0) {
            console.log('⚠️  Some users have warnings. Consider running migration script.\n');
        } else {
            console.log('✅ All users are properly configured!\n');
        }

        await mongoose.disconnect();
        console.log('✅ Verification completed\n');

    } catch (error) {
        console.error('\n❌❌❌ VERIFICATION ERROR ❌❌❌');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('========================================\n');
        process.exit(1);
    }
}

// Run verification
if (require.main === module) {
    verifyUsers()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { verifyUsers };

