#!/usr/bin/env node

/**
 * Fix Sales initialization for an organization
 * Creates missing modules and updates the crmInitialized flag
 * 
 * Usage: node scripts/fixSalesInitialization.js [organizationId]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const salesAppInitializer = require('../services/salesAppInitializer');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function fixSalesInitialization(organizationId = null) {
    try {
        console.log('🔧 Sales Initialization Fix Tool\n');
        console.log('='.repeat(60));

        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);

        let organizations;
        if (organizationId) {
            const orgId = mongoose.Types.ObjectId.isValid(organizationId) 
                ? (typeof organizationId === 'string' ? new mongoose.Types.ObjectId(organizationId) : organizationId)
                : organizationId;
            organizations = await Organization.find({ _id: orgId });
            if (organizations.length === 0) {
                organizations = await Organization.find({ _id: organizationId });
            }
        } else {
            // Find organizations with crmInitialized=true but missing modules
            const ModuleDefinition = require('../models/ModuleDefinition');
            const allOrgs = await Organization.find({ crmInitialized: true }).limit(10);
            organizations = [];
            
            for (const org of allOrgs) {
                const isInitialized = await salesAppInitializer.isSalesInitialized(org._id);
                if (!isInitialized) {
                    organizations.push(org);
                }
            }
        }

        if (organizations.length === 0) {
            console.log('✅ No organizations need fixing');
            await mongoose.connection.close();
            return;
        }

        console.log(`Found ${organizations.length} organization(s) to fix\n`);

        for (const org of organizations) {
            console.log('='.repeat(60));
            console.log(`Fixing: ${org.name || org._id}`);
            console.log(`  ID: ${org._id}\n`);

            // Check current state
            const isInitialized = await salesAppInitializer.isSalesInitialized(org._id);
            console.log(`Current state:`);
            console.log(`  crmInitialized flag: ${org.crmInitialized}`);
            console.log(`  Modules exist: ${isInitialized ? '✅' : '❌'}`);

            if (isInitialized && org.crmInitialized) {
                console.log(`  ✅ Already correctly initialized, skipping\n`);
                continue;
            }

            // Initialize Sales modules
            console.log(`\n🔄 Initializing Sales modules...`);
            try {
                const result = await salesAppInitializer.initializeSales(org._id);
                
                console.log(`Initialization result:`);
                console.log(`  Success: ${result.success}`);
                console.log(`  Initialized: ${result.initialized.join(', ')}`);
                if (result.errors.length > 0) {
                    console.log(`  Errors:`);
                    result.errors.forEach(err => {
                        console.log(`    - ${err.module}: ${err.error}`);
                    });
                }

                // Verify both modules exist
                const verified = await salesAppInitializer.isSalesInitialized(org._id);
                
                if (verified) {
                    // Update flag
                    await Organization.findByIdAndUpdate(
                        org._id,
                        { $set: { crmInitialized: true } },
                        { runValidators: false }
                    );
                    console.log(`\n✅ Successfully fixed! Both modules exist and flag is set.\n`);
                } else {
                    console.log(`\n⚠️  Initialization completed but modules are still missing.`);
                    console.log(`   This may indicate a database connection issue or permission problem.\n`);
                }
            } catch (error) {
                console.error(`\n❌ Error during initialization:`, error.message);
                console.error(`   Stack:`, error.stack);
                console.log(`\n   Please check server logs for more details.\n`);
            }
        }

        console.log('='.repeat(60));
        await mongoose.connection.close();
        console.log('✅ Fix complete\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Get organizationId from command line args
const orgId = process.argv[2] || null;
fixSalesInitialization(orgId);
