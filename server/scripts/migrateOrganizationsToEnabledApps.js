#!/usr/bin/env node

/**
 * Migrate Organizations to Enabled Apps Structure
 * 
 * This script migrates existing organizations to use the new enabledApps structure
 * (array of objects with appKey, status, enabledAt) instead of simple string arrays.
 * 
 * Rules:
 * - All existing organizations get CRM enabled (ACTIVE)
 * - AUDIT and PORTAL are NOT enabled by default
 * - Script is idempotent (safe to run multiple times)
 * - Does not remove or overwrite existing enabledApps
 * 
 * Usage: node scripts/migrateOrganizationsToEnabledApps.js
 */

// Load environment variables from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const { getAppConfig } = require('../utils/appAccessUtils');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function migrateOrganizationsToEnabledApps() {
    try {
        console.log('🚀 Starting Organization Enabled Apps Migration...\n');

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
        console.log('✅ Connected to MongoDB\n');

        // Validate CRM app exists in registry
        const crmConfig = getAppConfig('CRM');
        if (!crmConfig) {
            console.error('❌ Error: CRM app not found in appRegistry!');
            await mongoose.connection.close();
            process.exit(1);
        }

        // Find all organizations
        console.log('📋 Finding all organizations...');
        const organizations = await Organization.find({});
        console.log(`   Found ${organizations.length} organizations\n`);

        if (organizations.length === 0) {
            console.log('✅ No organizations to migrate');
            await mongoose.connection.close();
            return;
        }

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const org of organizations) {
            try {
                // Check if already migrated (has object structure)
                const needsMigration = !org.enabledApps || 
                    org.enabledApps.length === 0 || 
                    (typeof org.enabledApps[0] === 'string');

                if (!needsMigration) {
                    // Already migrated - check if CRM is present
                    const hasCrm = org.enabledApps.some(
                        app => typeof app === 'object' && app.appKey === 'CRM' && app.status === 'ACTIVE'
                    );
                    
                    if (!hasCrm) {
                        // Add CRM if missing
                        org.enabledApps.push({
                            appKey: 'CRM',
                            status: 'ACTIVE',
                            enabledAt: new Date()
                        });
                        await org.save();
                        console.log(`   ✅ Added CRM to org: ${org.name} (${org._id})`);
                        migrated++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                // Migrate: Convert string array to object array
                const newEnabledApps = [];
                
                // If enabledApps exists and is array of strings, convert them
                if (org.enabledApps && org.enabledApps.length > 0) {
                    for (const appKey of org.enabledApps) {
                        // Validate app exists in registry
                        if (getAppConfig(appKey)) {
                            newEnabledApps.push({
                                appKey: appKey,
                                status: 'ACTIVE',
                                enabledAt: new Date()
                            });
                        } else {
                            console.warn(`   ⚠️  Skipping invalid app key: ${appKey} for org: ${org.name}`);
                        }
                    }
                }
                
                // If no apps were in enabledApps, or if it was empty, add CRM
                if (newEnabledApps.length === 0) {
                    newEnabledApps.push({
                        appKey: 'CRM',
                        status: 'ACTIVE',
                        enabledAt: new Date()
                    });
                } else {
                    // Ensure CRM is present (add if missing)
                    const hasCrm = newEnabledApps.some(app => app.appKey === 'CRM');
                    if (!hasCrm) {
                        newEnabledApps.push({
                            appKey: 'CRM',
                            status: 'ACTIVE',
                            enabledAt: new Date()
                        });
                    }
                }

                // Update organization
                org.enabledApps = newEnabledApps;
                await org.save();
                
                console.log(`   ✅ Migrated org: ${org.name} (${org._id})`);
                console.log(`      Enabled apps: ${newEnabledApps.map(a => a.appKey).join(', ')}`);
                migrated++;

            } catch (error) {
                console.error(`   ❌ Error migrating org ${org._id}: ${error.message}`);
                errors++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migrated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('\n✅ Migration complete!');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run migration
migrateOrganizationsToEnabledApps();

