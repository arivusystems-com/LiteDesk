#!/usr/bin/env node

/**
 * Create Test Organization for Phase 0D Testing
 * 
 * Creates a test organization with CRM enabled for UI composition testing.
 * 
 * Usage: node scripts/createTestOrganization.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function createTestOrganization() {
  try {
    console.log('🚀 Creating Test Organization for Phase 0D Testing...\n');

    // Validate MongoDB URI
    if (!MONGO_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file!');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if test org already exists
    const existingOrg = await Organization.findOne({ name: 'Test Organization - Phase 0D' });
    if (existingOrg) {
      console.log('⚠️  Test organization already exists!');
      console.log(`   Name: ${existingOrg.name}`);
      console.log(`   ID: ${existingOrg._id}`);
      console.log(`   enabledApps: ${JSON.stringify(existingOrg.enabledApps)}\n`);
      
      await mongoose.connection.close();
      return existingOrg;
    }

    // Create test organization
    console.log('📋 Creating test organization...');
    const organization = await Organization.create({
      name: 'Test Organization - Phase 0D',
      industry: 'Technology',
      isActive: true,
      subscription: {
        status: 'trial',
        tier: 'trial',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days
      },
      limits: {
        maxUsers: 10,
        maxContacts: 1000,
        maxDeals: 500,
        maxStorageGB: 10
      },
      enabledModules: ['contacts', 'deals', 'tasks', 'events', 'forms', 'items', 'imports'],
      // Phase 0D: Set enabledApps for UI composition (array of objects)
      enabledApps: [{
        appKey: 'CRM',
        status: 'ACTIVE',
        enabledAt: new Date()
      }]
    });

    console.log('✅ Test organization created!');
    console.log(`   Name: ${organization.name}`);
    console.log(`   ID: ${organization._id}`);
    console.log(`   enabledApps: ${JSON.stringify(organization.enabledApps)}`);
    console.log(`   enabledModules: ${organization.enabledModules.join(', ')}\n`);

    console.log('💡 Next Steps:');
    console.log('   1. Run: node scripts/bootstrapOrganizationsForUI.js');
    console.log('   2. Test UI composition: node scripts/testUIComposition.js');
    console.log('   3. Start server and test API endpoints\n');

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    return organization;

  } catch (error) {
    console.error('❌ Error creating test organization:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createTestOrganization();
}

module.exports = createTestOrganization;

