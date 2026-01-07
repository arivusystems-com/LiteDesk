#!/usr/bin/env node

/**
 * Migrate Organization Subscriptions
 * 
 * This script creates OrganizationSubscription documents for all existing organizations.
 * 
 * Rules:
 * - Create subscription for all existing orgs
 * - Enable CRM with ENTERPRISE plan
 * - Seat limit = null (unlimited)
 * - Status = ACTIVE
 * - Idempotent (safe to run multiple times)
 * 
 * Usage: node scripts/migrateOrgSubscriptions.js
 */

// Load environment variables from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const OrganizationSubscription = require('../models/OrganizationSubscription');
const { getAppConfig } = require('../utils/appAccessUtils');
const { getSeatsUsed } = require('../utils/subscriptionUtils');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function migrateOrgSubscriptions() {
    try {
        console.log('🚀 Starting Organization Subscription Migration...\n');

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
                // Check if subscription already exists
                const existingSubscription = await OrganizationSubscription.findOne({ 
                    organizationId: org._id 
                });

                if (existingSubscription) {
                    // Check if CRM subscription exists
                    const hasCrm = existingSubscription.apps.some(
                        app => app.appKey === 'CRM'
                    );

                    if (!hasCrm) {
                        // Add CRM subscription if missing
                        existingSubscription.apps.push({
                            appKey: 'CRM',
                            planKey: 'ENTERPRISE',
                            seatLimit: null, // Unlimited
                            seatsUsed: await getSeatsUsed(org._id, 'CRM'),
                            status: 'ACTIVE',
                            startedAt: new Date()
                        });
                        await existingSubscription.save();
                        console.log(`   ✅ Added CRM subscription to org: ${org.name} (${org._id})`);
                        migrated++;
                    } else {
                        // Update seatsUsed to current count
                        const crmApp = existingSubscription.apps.find(app => app.appKey === 'CRM');
                        if (crmApp) {
                            const currentSeats = await getSeatsUsed(org._id, 'CRM');
                            if (crmApp.seatsUsed !== currentSeats) {
                                crmApp.seatsUsed = currentSeats;
                                await existingSubscription.save();
                                console.log(`   ✅ Updated seat count for org: ${org.name} (${org._id}) - ${currentSeats} seats`);
                                migrated++;
                            } else {
                                skipped++;
                            }
                        } else {
                            skipped++;
                        }
                    }
                    continue;
                }

                // Create new subscription with CRM
                const currentSeats = await getSeatsUsed(org._id, 'CRM');
                
                const subscription = new OrganizationSubscription({
                    organizationId: org._id,
                    apps: [
                        {
                            appKey: 'CRM',
                            planKey: 'ENTERPRISE',
                            seatLimit: null, // Unlimited
                            seatsUsed: currentSeats,
                            status: 'ACTIVE',
                            startedAt: new Date()
                        }
                    ]
                });

                await subscription.save();
                
                console.log(`   ✅ Created subscription for org: ${org.name} (${org._id})`);
                console.log(`      CRM: ENTERPRISE plan, ${currentSeats} seats used`);
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
migrateOrgSubscriptions();

