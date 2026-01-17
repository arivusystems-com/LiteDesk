#!/usr/bin/env node

/**
 * ============================================================================
 * Phase 0J.1: Seed Internal Instance Flag
 * ============================================================================
 * 
 * This script marks LiteDesk's internal instance(s) with isInternal=true.
 * 
 * Behavior:
 * - Locate LiteDesk instance (by known organizationId / owner email / organization name)
 * - Set isInternal = true
 * 
 * Constraints:
 * - Idempotent (safe to re-run)
 * - No side effects on other instances
 * - Only marks instances owned by LiteDesk
 * 
 * Usage: node server/scripts/seedInternalInstance.js
 * 
 * ============================================================================
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Instance = require('../models/Instance');
const Organization = require('../models/Organization');
const User = require('../models/User');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

/**
 * Check if email is a LiteDesk internal email
 */
function isLiteDeskInternalEmail(email) {
    if (!email) return false;
    const internalDomains = [
        'litedesk.com',
        'litedesk.io',
        '@litedesk' // Allow any @litedesk domain
    ];
    const emailLower = email.toLowerCase();
    return internalDomains.some(domain => emailLower.includes(domain));
}

/**
 * Check if organization name suggests it's LiteDesk internal
 */
function isLiteDeskInternalOrg(orgName) {
    if (!orgName) return false;
    const nameLower = orgName.toLowerCase();
    const internalNames = [
        'litedesk',
        'litedesk internal',
        'litedesk platform',
        'litedesk ops'
    ];
    return internalNames.some(name => nameLower.includes(name));
}

async function seedInternalInstance() {
    try {
        console.log('🚀 Seeding Internal Instance Flag (Phase 0J.1)...\n');

        // Validate MongoDB URI
        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find LiteDesk internal organizations
        // Strategy: Look for organizations where:
        // 1. Owner email contains @litedesk domain
        // 2. Organization name contains "LiteDesk"
        console.log('📋 Finding LiteDesk internal organizations...');
        
        // Get all organizations
        const allOrgs = await Organization.find({});
        console.log(`   Found ${allOrgs.length} total organizations\n`);

        // Find owner users for each organization
        const internalOrgIds = [];
        for (const org of allOrgs) {
            // Check organization name
            if (isLiteDeskInternalOrg(org.name)) {
                console.log(`   ✓ Found internal org by name: ${org.name} (ID: ${org._id})`);
                internalOrgIds.push(org._id);
                continue;
            }

            // Find owner user
            const owner = await User.findOne({
                organizationId: org._id,
                isOwner: true
            });

            if (owner && isLiteDeskInternalEmail(owner.email)) {
                console.log(`   ✓ Found internal org by owner email: ${org.name} (Owner: ${owner.email}, ID: ${org._id})`);
                internalOrgIds.push(org._id);
                continue;
            }
        }

        if (internalOrgIds.length === 0) {
            console.log('⚠️  No LiteDesk internal organizations found.\n');
            console.log('   Tip: Create an organization with owner email containing @litedesk.com\n');
            await mongoose.connection.close();
            process.exit(0);
        }

        console.log(`✅ Found ${internalOrgIds.length} internal organization(s)\n`);

        // Process each internal organization
        let updatedCount = 0;
        let createdCount = 0;

        for (const orgId of internalOrgIds) {
            console.log(`📝 Processing organization: ${orgId}`);

            // Find or create instance for this organization
            let instance = await Instance.findOne({ organizationId: orgId });

            if (!instance) {
                // Create instance if it doesn't exist
                console.log(`   → Creating new instance with isInternal=true`);
                instance = await Instance.create({
                    organizationId: orgId,
                    status: 'ACTIVE',
                    source: 'MANUAL',
                    isInternal: true
                });
                createdCount++;
                console.log(`   ✅ Created instance (ID: ${instance._id})\n`);
            } else {
                // Update existing instance
                if (instance.isInternal === true) {
                    console.log(`   ✓ Already marked as internal (no change needed)\n`);
                } else {
                    console.log(`   → Marking instance as internal`);
                    instance.isInternal = true;
                    await instance.save();
                    updatedCount++;
                    console.log(`   ✅ Updated instance (ID: ${instance._id})\n`);
                }
            }
        }

        // Summary
        console.log('=' .repeat(60));
        console.log('📊 Summary:');
        console.log(`   - Internal organizations found: ${internalOrgIds.length}`);
        console.log(`   - Instances created: ${createdCount}`);
        console.log(`   - Instances updated: ${updatedCount}`);
        console.log('=' .repeat(60));
        console.log('\n✅ Internal instance seeding complete!\n');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error seeding internal instance:');
        console.error(error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    seedInternalInstance();
}

module.exports = { seedInternalInstance };

