#!/usr/bin/env node

/**
 * Fix missing appKey on ModuleDefinition records
 * 
 * Sets appKey='sales' for People and Deals modules that are missing appKey
 * 
 * Usage: node scripts/fixModuleAppKeys.js [organizationId]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');
const Organization = require('../models/Organization');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function fixModuleAppKeys(organizationId = null) {
    try {
        console.log('🔧 Fixing Module appKey Values\n');
        console.log('='.repeat(60));

        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);

        // Find modules missing appKey
        let query = {
            $or: [
                { appKey: { $exists: false } },
                { appKey: null },
                { appKey: '' }
            ],
            key: { $in: ['people', 'deals'] }
        };

        if (organizationId) {
            const orgId = mongoose.Types.ObjectId.isValid(organizationId) 
                ? (typeof organizationId === 'string' ? new mongoose.Types.ObjectId(organizationId) : organizationId)
                : organizationId;
            query.organizationId = orgId;
        }

        const modulesToFix = await ModuleDefinition.find(query);

        if (modulesToFix.length === 0) {
            console.log('✅ No modules need fixing (all have appKey set)\n');
            await mongoose.connection.close();
            return;
        }

        console.log(`Found ${modulesToFix.length} module(s) missing appKey\n`);

        let fixed = 0;
        let errors = 0;

        for (const module of modulesToFix) {
            try {
                const org = await Organization.findById(module.organizationId);
                const orgName = org ? org.name : module.organizationId;

                console.log(`Fixing: ${module.key} module for ${orgName}`);
                console.log(`  Module ID: ${module._id}`);
                console.log(`  Organization ID: ${module.organizationId}`);

                // Set appKey based on module key
                // People and Deals are Sales app modules
                const appKey = module.key === 'people' || module.key === 'deals' ? 'sales' : 'platform';
                
                module.appKey = appKey;
                await module.save();

                console.log(`  ✅ Set appKey to: ${appKey}\n`);
                fixed++;
            } catch (error) {
                console.error(`  ❌ Error fixing module ${module._id}:`, error.message);
                errors++;
            }
        }

        console.log('='.repeat(60));
        console.log(`✅ Fixed: ${fixed}`);
        if (errors > 0) {
            console.log(`❌ Errors: ${errors}`);
        }
        console.log('');

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
fixModuleAppKeys(orgId);
