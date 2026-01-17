#!/usr/bin/env node

/**
 * Check for duplicate core entity modules across apps
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

const CORE_ENTITY_MODULE_KEYS = [
  'people',
  'organizations',
  'tasks',
  'events',
  'items',
  'forms',
  'contacts' // Also check for contacts (legacy name)
];

async function checkDuplicates() {
  try {
    const masterUri = getMasterDatabaseUri();
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Checking for duplicate core entity modules...\n');

    for (const moduleKey of CORE_ENTITY_MODULE_KEYS) {
      const modules = await ModuleDefinition.find({
        moduleKey: moduleKey
      }).select('appKey moduleKey label ui.navigationEntity ui.excludeFromApps');

      if (modules.length > 0) {
        console.log(`\n📦 ${moduleKey.toUpperCase()}:`);
        modules.forEach(mod => {
          const navEntity = mod.ui?.navigationEntity || false;
          const excludeApps = mod.ui?.excludeFromApps || false;
          console.log(`   - ${mod.appKey}.${mod.moduleKey} (${mod.label})`);
          console.log(`     navigationEntity: ${navEntity}, excludeFromApps: ${excludeApps}`);
        });
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkDuplicates();

