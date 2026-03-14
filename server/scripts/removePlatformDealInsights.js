#!/usr/bin/env node

/**
 * Remove deal-insights from platform app (ModuleDefinition)
 *
 * deal-insights should only exist under SALES. If it was also defined with
 * appKey: 'platform', it appears in both SALES and PLATFORM and triggers
 * app registry validation: "Module deal-insights exists in both SALES and PLATFORM".
 *
 * This script removes the platform copy so deal-insights exists only under Sales.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

const MODULE_KEY = 'deal-insights';
const APP_KEY_PLATFORM = 'platform';

async function removePlatformDealInsights() {
  try {
    console.log('Removing deal-insights from platform app (keep under Sales only)...\n');

    const masterUri = getMasterDatabaseUri();
    await mongoose.connect(masterUri);
    console.log('Connected to MongoDB master database.\n');

    const existing = await ModuleDefinition.find({
      appKey: APP_KEY_PLATFORM,
      moduleKey: MODULE_KEY,
    }).select('appKey moduleKey label');

    if (existing.length === 0) {
      console.log(`No platform module found for "${MODULE_KEY}". Nothing to remove.`);
      await mongoose.connection.close();
      process.exit(0);
      return;
    }

    console.log(`Found ${existing.length} platform module(s) for "${MODULE_KEY}":`);
    existing.forEach((m) => console.log(`  - ${m.appKey}.${m.moduleKey} (${m.label})`));

    const result = await ModuleDefinition.deleteMany({
      appKey: APP_KEY_PLATFORM,
      moduleKey: MODULE_KEY,
    });

    console.log(`\nRemoved ${result.deletedCount} platform module(s).`);
    console.log('deal-insights will now only appear under the Sales app.\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

removePlatformDealInsights();
