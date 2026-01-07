#!/usr/bin/env node

/**
 * ============================================================================
 * User Migration Script: Convert allowedApps to appAccess
 * ============================================================================
 * 
 * This script migrates existing users from the legacy allowedApps field
 * to the new appAccess structure.
 * 
 * Responsibilities:
 * - Set userType = 'INTERNAL' for all existing users
 * - Convert allowedApps → appAccess
 * - Map existing CRM roles correctly
 * - Ensure organization owners always have { appKey: 'CRM', roleKey: 'ADMIN' }
 * - Do not remove allowedApps (kept for backward compatibility)
 * 
 * Script is idempotent - safe to run multiple times.
 * 
 * Usage: node server/scripts/migrateUsersToAppAccess.js
 * ============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { APP_KEYS } = require('../constants/appKeys');
const { mapLegacyRoleToCRM } = require('../constants/appRoles');
const { getDefaultRoleForApp, validateAppRole } = require('../utils/appAccessUtils');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function migrateUsers() {
    try {
        console.log('🚀 Starting User Migration: allowedApps → appAccess\n');

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
        console.log(`📊 Found ${users.length} users to migrate\n`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                let needsUpdate = false;
                const updates = {};

                // 1. Set userType = 'INTERNAL' if not set
                if (!user.userType) {
                    updates.userType = 'INTERNAL';
                    needsUpdate = true;
                    console.log(`  [${user.email}] Setting userType = INTERNAL`);
                }

                // 2. Convert allowedApps → appAccess if appAccess is empty or missing
                if (!user.appAccess || user.appAccess.length === 0) {
                    const allowedApps = user.allowedApps || ['CRM'];
                    const appAccess = [];

                    for (const appKey of allowedApps) {
                        // Skip invalid app keys
                        if (!['CRM', 'AUDIT', 'PORTAL'].includes(appKey)) {
                            console.warn(`  [${user.email}] Skipping invalid appKey: ${appKey}`);
                            continue;
                        }

                        // Determine roleKey based on app and user's legacy role
                        let roleKey;
                        
                        if (appKey === 'CRM') {
                            // For CRM, map legacy role to CRM roleKey
                            if (user.isOwner) {
                                roleKey = 'ADMIN'; // Owners always get ADMIN
                            } else {
                                roleKey = mapLegacyRoleToCRM(user.role || 'user');
                            }
                        } else {
                            // For other apps, use default role
                            roleKey = getDefaultRoleForApp(appKey);
                        }

                        // Validate roleKey
                        if (!validateAppRole(appKey, roleKey)) {
                            console.warn(`  [${user.email}] Invalid roleKey ${roleKey} for ${appKey}, using default`);
                            roleKey = getDefaultRoleForApp(appKey);
                        }

                        appAccess.push({
                            appKey: appKey,
                            roleKey: roleKey,
                            status: 'ACTIVE',
                            addedAt: user.createdAt || new Date()
                        });
                    }

                    // Ensure owners always have CRM: ADMIN
                    if (user.isOwner) {
                        const hasCRMAdmin = appAccess.some(
                            a => a.appKey === 'CRM' && a.roleKey === 'ADMIN'
                        );
                        if (!hasCRMAdmin) {
                            // Remove any existing CRM entry
                            const filtered = appAccess.filter(a => a.appKey !== 'CRM');
                            filtered.push({
                                appKey: 'CRM',
                                roleKey: 'ADMIN',
                                status: 'ACTIVE',
                                addedAt: user.createdAt || new Date()
                            });
                            updates.appAccess = filtered;
                        } else {
                            updates.appAccess = appAccess;
                        }
                    } else {
                        updates.appAccess = appAccess;
                    }

                    needsUpdate = true;
                    console.log(`  [${user.email}] Created appAccess: ${JSON.stringify(updates.appAccess)}`);
                } else {
                    // appAccess exists, but ensure owners have CRM: ADMIN
                    if (user.isOwner) {
                        const hasCRMAdmin = user.appAccess.some(
                            a => a.appKey === 'CRM' && a.roleKey === 'ADMIN' && a.status === 'ACTIVE'
                        );
                        if (!hasCRMAdmin) {
                            // Remove any existing CRM entry
                            const filtered = user.appAccess.filter(a => a.appKey !== 'CRM');
                            filtered.push({
                                appKey: 'CRM',
                                roleKey: 'ADMIN',
                                status: 'ACTIVE',
                                addedAt: user.createdAt || new Date()
                            });
                            updates.appAccess = filtered;
                            needsUpdate = true;
                            console.log(`  [${user.email}] Updated appAccess to ensure CRM: ADMIN for owner`);
                        }
                    }
                }

                // Apply updates if needed
                if (needsUpdate) {
                    await User.findByIdAndUpdate(user._id, updates);
                    migratedCount++;
                    console.log(`  ✅ [${user.email}] Migration completed\n`);
                } else {
                    skippedCount++;
                    console.log(`  ⏭️  [${user.email}] Already migrated, skipping\n`);
                }

            } catch (error) {
                errorCount++;
                console.error(`  ❌ [${user.email}] Migration error: ${error.message}\n`);
            }
        }

        console.log('\n========================================');
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migratedCount} users`);
        console.log(`   ⏭️  Skipped: ${skippedCount} users`);
        console.log(`   ❌ Errors: ${errorCount} users`);
        console.log('========================================\n');

        await mongoose.disconnect();
        console.log('✅ Migration completed successfully\n');

    } catch (error) {
        console.error('\n❌❌❌ MIGRATION ERROR ❌❌❌');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('========================================\n');
        process.exit(1);
    }
}

// Run migration
if (require.main === module) {
    migrateUsers()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { migrateUsers };
