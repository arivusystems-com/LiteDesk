#!/usr/bin/env node

/**
 * Remove all duplicate core entity modules from business apps
 * 
 * Core entities (people, organizations, tasks, events, items, forms) should
 * ONLY exist with appKey: 'platform' and navigationEntity: true.
 * 
 * This script removes all other versions from business apps (sales, helpdesk, crm, etc.)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

// Core entity module keys that should ONLY exist in platform
const CORE_ENTITY_MODULE_KEYS = [
  'people',
  'organizations',
  'items',
  'forms',
  'contacts' // Legacy name for people
];

// Business apps (exclude 'platform' and 'control_plane')
const BUSINESS_APPS = ['sales', 'helpdesk', 'crm', 'projects', 'audit', 'portal'];

async function removeDuplicateCoreEntities() {
  try {
    console.log('🚀 Removing duplicate core entity modules from business apps...\n');

    const masterUri = getMasterDatabaseUri();
    console.log('🔗 Connecting to MongoDB master database (litedesk_master)...');
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB master database (litedesk_master)\n');

    let totalRemoved = 0;

    for (const moduleKey of CORE_ENTITY_MODULE_KEYS) {
      console.log(`\n📦 Processing: ${moduleKey}`);
      
      for (const appKey of BUSINESS_APPS) {
        const result = await ModuleDefinition.deleteMany({
          appKey: appKey,
          moduleKey: moduleKey
        });

        if (result.deletedCount > 0) {
          console.log(`  ✅ Removed: ${appKey}.${moduleKey} (${result.deletedCount} module(s))`);
          totalRemoved += result.deletedCount;
        }
      }
    }

    console.log(`\n📊 Summary: Removed ${totalRemoved} duplicate core entity module(s)\n`);

    // Verify only platform modules remain
    console.log('🔍 Verifying only platform modules remain...\n');
    for (const moduleKey of CORE_ENTITY_MODULE_KEYS) {
      if (moduleKey === 'contacts') continue; // Skip contacts, it's legacy
      
      const allModules = await ModuleDefinition.find({
        moduleKey: moduleKey
      }).select('appKey moduleKey label ui.navigationEntity ui.excludeFromApps');

      if (allModules.length > 0) {
        console.log(`\n📦 ${moduleKey.toUpperCase()}:`);
        allModules.forEach(mod => {
          const navEntity = mod.ui?.navigationEntity || false;
          const excludeApps = mod.ui?.excludeFromApps || false;
          const status = mod.appKey === 'platform' && navEntity && excludeApps ? '✅' : '⚠️';
          console.log(`   ${status} ${mod.appKey}.${mod.moduleKey} (${mod.label})`);
          if (mod.appKey !== 'platform') {
            console.log(`     ⚠️  WARNING: Non-platform module still exists!`);
          }
        });
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Refresh your browser to see the updated sidebar');
    console.log('   2. Core entities should now only appear in Entities section\n');

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error removing duplicate core entities:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

removeDuplicateCoreEntities();

