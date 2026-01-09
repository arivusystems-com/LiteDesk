#!/usr/bin/env node

/**
 * Test UI Composition API (Phase 0D)
 * 
 * This script tests the UI composition endpoints to verify they work correctly.
 * 
 * Usage: node scripts/testUIComposition.js [organizationId]
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const uiCompositionService = require('../services/uiCompositionService');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function testUIComposition(organizationId) {
  try {
    console.log('🧪 Testing UI Composition API (Phase 0D)...\n');

    // Validate MongoDB URI
    if (!MONGO_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file!');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get organization
    let org;
    if (organizationId) {
      org = await Organization.findById(organizationId);
    } else {
      org = await Organization.findOne({});
    }

    if (!org) {
      console.error('❌ Error: No organization found!');
      console.log('   Usage: node scripts/testUIComposition.js [organizationId]');
      process.exit(1);
    }

    console.log(`📊 Testing with organization: ${org.name} (${org._id})\n`);

    // Test 1: Get Apps
    console.log('📦 Test 1: Get UI Apps for Tenant');
    console.log('─'.repeat(50));
    const apps = await uiCompositionService.getUIAppsForTenant(org._id);
    console.log(`✅ Found ${apps.length} apps:`);
    apps.forEach(app => {
      console.log(`   - ${app.appKey}: ${app.name}`);
      console.log(`     Icon: ${app.icon}, Route: ${app.defaultRoute}`);
    });
    console.log('');

    // Test 2: Get Modules for CRM
    console.log('📦 Test 2: Get UI Modules for CRM App');
    console.log('─'.repeat(50));
    const crmModules = await uiCompositionService.getUIModulesForApp(org._id, 'CRM');
    console.log(`✅ Found ${crmModules.length} modules:`);
    crmModules.forEach(module => {
      console.log(`   - ${module.moduleKey}: ${module.label}`);
      console.log(`     Route: ${module.routeBase}, Sidebar: ${module.showInSidebar ? 'Yes' : 'No'}, Order: ${module.sidebarOrder}`);
    });
    console.log('');

    // Test 3: Get Sidebar Definition
    console.log('📦 Test 3: Get Sidebar Definition');
    console.log('─'.repeat(50));
    const sidebar = await uiCompositionService.getSidebarDefinition(org._id);
    console.log(`✅ Sidebar structure:`);
    sidebar.apps.forEach(app => {
      console.log(`   App: ${app.appKey} (${app.name})`);
      console.log(`   Modules (${app.modules.length}):`);
      app.modules.forEach(module => {
        console.log(`     - ${module.label} (${module.routeBase})`);
      });
    });
    console.log('');

    // Test 4: Get Route Definitions
    console.log('📦 Test 4: Get Route Definitions');
    console.log('─'.repeat(50));
    const routes = await uiCompositionService.getRouteDefinitions(org._id);
    console.log(`✅ Found ${routes.length} routes:`);
    routes.slice(0, 10).forEach(route => {
      console.log(`   - ${route.path} (${route.type})`);
    });
    if (routes.length > 10) {
      console.log(`   ... and ${routes.length - 10} more`);
    }
    console.log('');

    // Summary
    console.log('✅ All tests passed!');
    console.log(`\n📈 Summary:`);
    console.log(`   - Apps: ${apps.length}`);
    console.log(`   - CRM Modules: ${crmModules.length}`);
    console.log(`   - Total Routes: ${routes.length}`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Test API endpoints: GET /api/ui/sidebar`);
    console.log(`   2. Verify frontend loads UI metadata correctly`);
    console.log(`   3. Check dynamic sidebar rendering\n`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error testing UI composition:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Get organization ID from command line
const organizationId = process.argv[2];

// Run if called directly
if (require.main === module) {
  testUIComposition(organizationId);
}

module.exports = testUIComposition;

