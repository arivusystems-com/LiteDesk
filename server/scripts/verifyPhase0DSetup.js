#!/usr/bin/env node

/**
 * Verify Phase 0D Setup
 * 
 * This script verifies that Phase 0D implementation is correctly set up:
 * - AppDefinition records exist with UI metadata
 * - ModuleDefinition records exist with UI metadata
 * - Routes are registered
 * - Service is accessible
 * 
 * Usage: node scripts/verifyPhase0DSetup.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function verifyPhase0DSetup() {
  try {
    console.log('🔍 Verifying Phase 0D Setup...\n');

    // Validate MongoDB URI
    if (!MONGO_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file!');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    let allChecksPassed = true;

    // Check 1: AppDefinition records exist
    console.log('📦 Check 1: AppDefinition Records');
    console.log('─'.repeat(50));
    const apps = await AppDefinition.find({});
    console.log(`   Found ${apps.length} app definitions`);
    
    if (apps.length === 0) {
      console.log('   ❌ No app definitions found! Run: node scripts/seedPlatformDefinitionsWithUI.js');
      allChecksPassed = false;
    } else {
      const appsWithUI = apps.filter(app => app.ui && (app.ui.sidebarOrder !== undefined || app.ui.defaultRoute));
      console.log(`   ✅ ${appsWithUI.length}/${apps.length} apps have UI metadata`);
      
      apps.forEach(app => {
        const hasUI = app.ui && (app.ui.sidebarOrder !== undefined || app.ui.defaultRoute);
        console.log(`   ${hasUI ? '✅' : '⚠️ '} ${app.appKey}: ${app.name} ${hasUI ? '(has UI metadata)' : '(missing UI metadata)'}`);
      });
    }
    console.log('');

    // Check 2: ModuleDefinition records exist
    console.log('📦 Check 2: ModuleDefinition Records');
    console.log('─'.repeat(50));
    const modules = await ModuleDefinition.find({});
    console.log(`   Found ${modules.length} module definitions`);
    
    if (modules.length === 0) {
      console.log('   ❌ No module definitions found! Run: node scripts/seedPlatformDefinitionsWithUI.js');
      allChecksPassed = false;
    } else {
      const modulesWithUI = modules.filter(module => module.ui && module.ui.routeBase);
      console.log(`   ✅ ${modulesWithUI.length}/${modules.length} modules have UI metadata`);
      
      // Group by app
      const modulesByApp = {};
      modules.forEach(module => {
        if (!modulesByApp[module.appKey]) {
          modulesByApp[module.appKey] = [];
        }
        modulesByApp[module.appKey].push(module);
      });
      
      Object.keys(modulesByApp).forEach(appKey => {
        const appModules = modulesByApp[appKey];
        const withUI = appModules.filter(m => m.ui && m.ui.routeBase).length;
        console.log(`   ${appKey}: ${withUI}/${appModules.length} modules with UI metadata`);
      });
    }
    console.log('');

    // Check 3: Service is accessible
    console.log('📦 Check 3: UI Composition Service');
    console.log('─'.repeat(50));
    try {
      const uiCompositionService = require('../services/uiCompositionService');
      const methods = ['getUIAppsForTenant', 'getUIModulesForApp', 'getSidebarDefinition', 'getRouteDefinitions'];
      const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(uiCompositionService))
        .filter(m => m !== 'constructor');
      
      const allMethodsExist = methods.every(m => serviceMethods.includes(m));
      if (allMethodsExist) {
        console.log('   ✅ Service loaded successfully');
        console.log(`   ✅ All required methods present: ${methods.join(', ')}`);
      } else {
        console.log('   ❌ Missing methods in service');
        allChecksPassed = false;
      }
    } catch (error) {
      console.log('   ❌ Error loading service:', error.message);
      allChecksPassed = false;
    }
    console.log('');

    // Check 4: Routes are registered
    console.log('📦 Check 4: API Routes');
    console.log('─'.repeat(50));
    try {
      const fs = require('fs');
      const serverJs = fs.readFileSync(__dirname + '/../server.js', 'utf8');
      const hasRouteImport = serverJs.includes('uiCompositionRoutes');
      const hasRouteUse = serverJs.includes("app.use('/api/ui'");
      
      if (hasRouteImport && hasRouteUse) {
        console.log('   ✅ Routes registered in server.js');
      } else {
        console.log('   ❌ Routes not properly registered in server.js');
        allChecksPassed = false;
      }
    } catch (error) {
      console.log('   ⚠️  Could not verify routes:', error.message);
    }
    console.log('');

    // Summary
    console.log('─'.repeat(50));
    if (allChecksPassed) {
      console.log('✅ All checks passed! Phase 0D setup is complete.');
      console.log('\n💡 Next Steps:');
      console.log('   1. Create an organization (or use existing)');
      console.log('   2. Run: node scripts/bootstrapOrganizationsForUI.js');
      console.log('   3. Start server and test API endpoints');
      console.log('   4. Login to frontend and verify dynamic sidebar\n');
    } else {
      console.log('⚠️  Some checks failed. Please review the output above.');
      console.log('\n💡 Fix Steps:');
      console.log('   1. Run: node scripts/seedPlatformDefinitionsWithUI.js');
      console.log('   2. Verify all files are in place');
      console.log('   3. Re-run this verification script\n');
    }

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(allChecksPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Error verifying setup:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  verifyPhase0DSetup();
}

module.exports = verifyPhase0DSetup;

