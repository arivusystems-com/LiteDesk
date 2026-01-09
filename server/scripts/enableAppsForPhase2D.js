#!/usr/bin/env node

/**
 * Enable Sales, Helpdesk, and Projects apps for all organizations (Phase 2D)
 * 
 * This script enables the new apps for existing organizations.
 * 
 * Usage: node scripts/enableAppsForPhase2D.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

async function enableAppsForPhase2D() {
  try {
    console.log('🚀 Enabling Sales, Helpdesk, and Projects apps for all organizations (Phase 2D)...\n');

    // Get master database URI (always uses litedesk_master)
    const masterUri = getMasterDatabaseUri();
    console.log('🔗 Connecting to MongoDB master database (litedesk_master)...');
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB master database (litedesk_master)\n');

    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`📋 Found ${organizations.length} organization(s)\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Apps to enable
    const appsToEnable = [
      { appKey: 'SALES', name: 'Sales' },
      { appKey: 'HELPDESK', name: 'Helpdesk' },
      { appKey: 'PROJECTS', name: 'Projects' }
    ];

    for (const org of organizations) {
      // Check if enabledApps exists and is array of objects
      let enabledApps = org.enabledApps || [];
      
      // Handle legacy format (array of strings)
      if (enabledApps.length > 0 && typeof enabledApps[0] === 'string') {
        enabledApps = enabledApps.map(appKey => ({
          appKey: appKey.toUpperCase(),
          status: 'ACTIVE',
          enabledAt: new Date()
        }));
      }

      // Track which apps need to be added
      const existingAppKeys = enabledApps.map(app => app.appKey.toUpperCase());
      const appsToAdd = [];

      for (const app of appsToEnable) {
        const appKeyUpper = app.appKey.toUpperCase();
        if (!existingAppKeys.includes(appKeyUpper)) {
          appsToAdd.push({
            appKey: appKeyUpper,
            status: 'ACTIVE',
            enabledAt: new Date()
          });
        }
      }

      if (appsToAdd.length > 0) {
        // Add new apps
        enabledApps.push(...appsToAdd);
        
        // Update organization
        org.enabledApps = enabledApps;
        await org.save();

        updatedCount++;
        console.log(`  ✅ Updated organization: ${org.name}`);
        console.log(`     Added apps: ${appsToAdd.map(a => a.appKey).join(', ')}`);
        
        // Show all enabled apps
        const allEnabledAppKeys = enabledApps.map(a => a.appKey).join(', ');
        console.log(`     All enabled apps: ${allEnabledAppKeys}\n`);
      } else {
        skippedCount++;
        console.log(`  ⏭️  Skipped organization: ${org.name} (already has all apps enabled)\n`);
      }
    }

    // Summary
    console.log('✅ App enablement complete!');
    console.log(`\n📈 Summary:`);
    console.log(`   - Organizations updated: ${updatedCount}`);
    console.log(`   - Organizations skipped: ${skippedCount}`);
    console.log(`   - Total organizations: ${organizations.length}`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Log in to the application`);
    console.log(`   2. Visit /platform to see all enabled apps`);
    console.log(`   3. Use App Switcher to switch between apps\n`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error enabling apps:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  enableAppsForPhase2D();
}

module.exports = enableAppsForPhase2D;

