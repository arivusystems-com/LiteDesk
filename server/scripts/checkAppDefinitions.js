#!/usr/bin/env node

/**
 * Check if AppDefinition records exist for SALES, AUDIT, and PORTAL
 * 
 * Usage: node server/scripts/checkAppDefinitions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const AppDefinition = require('../models/AppDefinition');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

async function checkAppDefinitions() {
  try {
    console.log('🔍 Checking AppDefinition records...\n');

    // Get master database URI
    const masterUri = getMasterDatabaseUri();
    console.log('🔗 Connecting to MongoDB master database (litedesk_master)...');
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB master database\n');

    const appsToCheck = ['sales', 'audit', 'portal'];
    
    for (const appKey of appsToCheck) {
      const app = await AppDefinition.findOne({ appKey: appKey });
      if (app) {
        console.log(`✅ ${appKey.toUpperCase()}: Found`);
        console.log(`   Name: ${app.name}`);
        console.log(`   Enabled: ${app.enabled}`);
        console.log(`   Category: ${app.category}`);
        console.log(`   Order: ${app.order}`);
        console.log(`   UI Sidebar Order: ${app.ui?.sidebarOrder}`);
        console.log(`   Show in App Switcher: ${app.ui?.showInAppSwitcher}`);
        console.log(`   Default Route: ${app.ui?.defaultRoute}`);
      } else {
        console.log(`❌ ${appKey.toUpperCase()}: NOT FOUND`);
      }
      console.log('');
    }

    // Also check all apps
    const allApps = await AppDefinition.find({}).select('appKey name enabled category order ui.sidebarOrder ui.showInAppSwitcher ui.defaultRoute');
    console.log(`\n📊 Total AppDefinition records: ${allApps.length}`);
    allApps.forEach(app => {
      console.log(`   - ${app.appKey}: ${app.name} (enabled: ${app.enabled}, category: ${app.category})`);
    });

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking app definitions:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkAppDefinitions();
}

module.exports = checkAppDefinitions;
