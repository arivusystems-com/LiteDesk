#!/usr/bin/env node

/**
 * Initialize Sales for all organizations that need it
 * 
 * Usage: node scripts/initializeAllSales.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const salesAppInitializer = require('../services/salesAppInitializer');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function initializeAllSales() {
    try {
        console.log('🚀 Initializing Sales for All Organizations\n');
        console.log('='.repeat(60));

        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);

        // Find all organizations
        const organizations = await Organization.find({});
        console.log(`Found ${organizations.length} organization(s)\n`);

        let initialized = 0;
        let errors = 0;

        for (const org of organizations) {
            console.log('='.repeat(60));
            console.log(`Organization: ${org.name || org._id}`);
            console.log(`  ID: ${org._id}`);
            
            // Check if already initialized
            const isInitialized = await salesAppInitializer.isSalesInitialized(org._id);
            if (isInitialized && org.crmInitialized) {
                console.log(`  ✅ Already initialized, skipping\n`);
                continue;
            }

            // Ensure enabledApps is set
            if (!org.enabledApps || org.enabledApps.length === 0) {
                console.log(`  ⚠️  No enabledApps set, adding SALES...`);
                org.enabledApps = [{ appKey: 'SALES', status: 'ACTIVE', enabledAt: new Date() }];
                await org.save();
                console.log(`  ✅ Added SALES to enabledApps\n`);
            }

            // Initialize Sales
            console.log(`  🔄 Initializing Sales modules...`);
            try {
                const result = await salesAppInitializer.initializeSales(org._id);
                
                console.log(`  Result:`);
                console.log(`    Success: ${result.success}`);
                console.log(`    Initialized: ${result.initialized.join(', ') || 'none'}`);
                if (result.errors.length > 0) {
                    console.log(`    Errors:`);
                    result.errors.forEach(err => {
                        console.log(`      - ${err.module}: ${err.error}`);
                    });
                }

                // Verify both modules exist
                const verified = await salesAppInitializer.isSalesInitialized(org._id);
                
                if (verified && result.success) {
                    // Update flag
                    await Organization.findByIdAndUpdate(
                        org._id,
                        { $set: { crmInitialized: true } },
                        { runValidators: false }
                    );
                    console.log(`  ✅ Successfully initialized!\n`);
                    initialized++;
                } else {
                    console.log(`  ⚠️  Initialization completed but verification failed\n`);
                    errors++;
                }
            } catch (error) {
                console.error(`  ❌ Error:`, error.message);
                if (error.stack) {
                    console.error(`  Stack:`, error.stack.split('\n').slice(0, 3).join('\n'));
                }
                console.log('');
                errors++;
            }
        }

        console.log('='.repeat(60));
        console.log(`✅ Initialized: ${initialized}`);
        console.log(`❌ Errors: ${errors}`);
        console.log('');

        await mongoose.connection.close();
        console.log('✅ Complete\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

initializeAllSales();
