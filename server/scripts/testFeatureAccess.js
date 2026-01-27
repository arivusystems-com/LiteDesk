#!/usr/bin/env node

/**
 * Test feature access for an organization
 * 
 * Usage: node scripts/testFeatureAccess.js [featureName]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
const featureName = process.argv[2] || 'tasks';

async function testFeatureAccess() {
    try {
        console.log('🧪 Testing Feature Access\n');
        console.log('='.repeat(60));

        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);

        const org = await Organization.findOne({});
        if (!org) {
            console.log('❌ No organization found');
            await mongoose.connection.close();
            return;
        }

        console.log(`Testing feature: ${featureName}\n`);
        console.log('Organization State:');
        console.log(`  ID: ${org._id}`);
        console.log(`  Name: ${org.name}`);
        console.log(`  isTenant: ${org.isTenant}`);
        console.log(`  enabledApps:`, JSON.stringify(org.enabledApps, null, 2));
        console.log(`  enabledModules:`, org.enabledModules);
        console.log(`\nFeature Check Results:`);
        console.log(`  hasApp('SALES'): ${org.hasApp('SALES')}`);
        console.log(`  hasFeature('${featureName}'): ${org.hasFeature(featureName)}`);
        
        // Test the actual method call
        const result = org.hasFeature(featureName);
        console.log(`\n✅ Result: ${result ? 'ALLOWED' : 'DENIED'}`);
        
        if (!result) {
            console.log('\n⚠️  Feature access denied. Possible reasons:');
            if (!org.isTenant) {
                console.log('  - Organization is not marked as tenant (isTenant: false)');
            }
            if (!org.hasApp('SALES')) {
                console.log('  - SALES app is not enabled');
            }
            const salesModules = ['contacts', 'deals', 'tasks', 'events', 'people', 'organizations', 'projects', 'items', 'documents', 'transactions', 'forms', 'processes', 'reports'];
            if (!salesModules.includes(featureName)) {
                console.log('  - Feature is not a SALES module');
                if (!org.enabledModules || !org.enabledModules.includes(featureName)) {
                    console.log('  - Feature is not in enabledModules');
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        await mongoose.connection.close();
        console.log('✅ Test complete\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testFeatureAccess();
