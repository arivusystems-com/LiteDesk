#!/usr/bin/env node

/**
 * Diagnostic script to check Sales initialization status
 * 
 * Usage: node scripts/diagnoseSalesInitialization.js [organizationId]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const ModuleDefinition = require('../models/ModuleDefinition');
const salesAppInitializer = require('../services/salesAppInitializer');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function diagnoseSalesInitialization(organizationId = null) {
    try {
        console.log('🔍 Sales Initialization Diagnostic Tool\n');
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
                // Try as string
                organizations = await Organization.find({ _id: organizationId });
            }
        } else {
            organizations = await Organization.find({}).limit(10);
        }

        if (organizations.length === 0) {
            console.log('❌ No organizations found');
            await mongoose.connection.close();
            return;
        }

        console.log(`Found ${organizations.length} organization(s)\n`);

        for (const org of organizations) {
            console.log('='.repeat(60));
            console.log(`Organization: ${org.name || org._id}`);
            console.log(`  ID: ${org._id}`);
            console.log(`  Database: ${mongoose.connection.name}`);
            
            // Check enabledApps
            console.log(`\n📱 Enabled Apps:`);
            if (org.enabledApps && org.enabledApps.length > 0) {
                org.enabledApps.forEach((app, idx) => {
                    const appKey = typeof app === 'string' ? app : app.appKey;
                    const status = typeof app === 'object' ? app.status : 'ACTIVE';
                    console.log(`  ${idx + 1}. ${appKey} (${status})`);
                });
            } else {
                console.log('  ⚠️  No enabledApps set');
            }

            // Check crmInitialized flag
            console.log(`\n🏷️  CRM Initialized Flag:`);
            console.log(`  crmInitialized: ${org.crmInitialized || false}`);

            // Check if modules exist
            console.log(`\n📦 Sales Modules:`);
            const peopleModule = await ModuleDefinition.findOne({
                organizationId: org._id,
                key: 'people'
            });
            const dealsModule = await ModuleDefinition.findOne({
                organizationId: org._id,
                key: 'deals'
            });

            console.log(`  People module: ${peopleModule ? '✅ EXISTS' : '❌ MISSING'}`);
            if (peopleModule) {
                console.log(`    - Fields: ${peopleModule.fields?.length || 0}`);
                console.log(`    - Enabled: ${peopleModule.enabled !== false}`);
            }

            console.log(`  Deals module: ${dealsModule ? '✅ EXISTS' : '❌ MISSING'}`);
            if (dealsModule) {
                console.log(`    - Fields: ${dealsModule.fields?.length || 0}`);
                console.log(`    - Enabled: ${dealsModule.enabled !== false}`);
            }

            // Check initialization status
            const isInitialized = await salesAppInitializer.isSalesInitialized(org._id);
            console.log(`\n🔍 Sales Initialization Status:`);
            console.log(`  isSalesInitialized(): ${isInitialized ? '✅ TRUE' : '❌ FALSE'}`);
            console.log(`  crmInitialized flag: ${org.crmInitialized ? '✅ TRUE' : '❌ FALSE'}`);

            // Check if initialization is needed
            const needsInitialization = !org.crmInitialized && !isInitialized;
            console.log(`\n⚡ Action Required:`);
            if (needsInitialization) {
                console.log(`  ⚠️  Sales initialization is needed`);
                console.log(`  Run: await salesAppInitializer.initializeSales('${org._id}')`);
            } else if (org.crmInitialized && isInitialized) {
                console.log(`  ✅ Sales is already initialized`);
            } else if (org.crmInitialized && !isInitialized) {
                console.log(`  ⚠️  Flag is set but modules are missing (inconsistent state)`);
            } else if (!org.crmInitialized && isInitialized) {
                console.log(`  ⚠️  Modules exist but flag is not set (needs flag update)`);
            }
        }

        console.log('\n' + '='.repeat(60));
        await mongoose.connection.close();
        console.log('✅ Diagnostic complete\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Get organizationId from command line args
const orgId = process.argv[2] || null;
diagnoseSalesInitialization(orgId);
