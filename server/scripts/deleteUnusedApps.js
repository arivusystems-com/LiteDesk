#!/usr/bin/env node

/**
 * Delete unused apps (helpdesk, projects) from the database
 * 
 * This script removes helpdesk and projects app definitions from AppDefinition
 * and any related module definitions from ModuleDefinition.
 * 
 * Usage: node server/scripts/deleteUnusedApps.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

const APPS_TO_DELETE = ['helpdesk', 'projects'];

async function deleteUnusedApps() {
  try {
    console.log('🗑️  Deleting unused apps (helpdesk, projects)...\n');

    // Get master database URI
    const masterUri = getMasterDatabaseUri();
    console.log('🔗 Connecting to MongoDB master database (litedesk_master)...');
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB master database\n');

    // Delete app definitions
    console.log('📦 Deleting App Definitions...');
    for (const appKey of APPS_TO_DELETE) {
      const result = await AppDefinition.deleteOne({ appKey });
      if (result.deletedCount > 0) {
        console.log(`  ✅ Deleted app: ${appKey}`);
      } else {
        console.log(`  ⏭️  App not found: ${appKey}`);
      }
    }

    // Delete module definitions for these apps
    console.log('\n📦 Deleting Module Definitions...');
    for (const appKey of APPS_TO_DELETE) {
      const result = await ModuleDefinition.deleteMany({ appKey });
      if (result.deletedCount > 0) {
        console.log(`  ✅ Deleted ${result.deletedCount} module(s) for app: ${appKey}`);
      } else {
        console.log(`  ⏭️  No modules found for app: ${appKey}`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting unused apps:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deleteUnusedApps();
}

module.exports = deleteUnusedApps;
