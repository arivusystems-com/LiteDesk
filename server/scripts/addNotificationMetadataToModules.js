/**
 * Migration Script: Add Notification Metadata to Modules
 * 
 * Phase 17: Adds notification rule eligibility metadata to existing ModuleDefinition documents.
 * 
 * This script:
 * 1. Finds all ModuleDefinition documents
 * 2. Adds notification metadata for rule-eligible modules
 * 3. Preserves existing notification metadata if present
 * 
 * Usage:
 *   node server/scripts/addNotificationMetadataToModules.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');

// Default notification metadata for rule-eligible modules
const DEFAULT_NOTIFICATION_METADATA = {
  tasks: {
    ruleEligible: true,
    supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
    supportedConditions: ['assignedTo', 'priority', 'status']
  },
  deals: {
    ruleEligible: true,
    supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
    supportedConditions: ['assignedTo', 'status']
  },
  people: {
    ruleEligible: true,
    supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
    supportedConditions: ['assignedTo']
  },
  organizations: {
    ruleEligible: true,
    supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
    supportedConditions: ['assignedTo']
  },
  events: {
    ruleEligible: true,
    supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
    supportedConditions: ['assignedTo', 'status']
  }
};

async function migrateModules() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/litedesk';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all modules
    const modules = await ModuleDefinition.find({});
    console.log(`\n📋 Found ${modules.length} module definition(s)`);

    let updated = 0;
    let skipped = 0;

    for (const module of modules) {
      const moduleKey = module.key;
      const defaultMetadata = DEFAULT_NOTIFICATION_METADATA[moduleKey];

      // Skip if module doesn't have default metadata (not rule-eligible)
      if (!defaultMetadata) {
        console.log(`⏭️  Skipping ${moduleKey} (not rule-eligible)`);
        skipped++;
        continue;
      }

      // Skip if notification metadata already exists and is complete
      if (module.notifications && 
          module.notifications.ruleEligible !== undefined &&
          Array.isArray(module.notifications.supportedEvents) &&
          Array.isArray(module.notifications.supportedConditions)) {
        console.log(`✅ ${moduleKey} already has notification metadata`);
        skipped++;
        continue;
      }

      // Add or update notification metadata
      module.notifications = {
        ruleEligible: defaultMetadata.ruleEligible,
        supportedEvents: defaultMetadata.supportedEvents,
        supportedConditions: defaultMetadata.supportedConditions,
        // Preserve any existing custom values
        ...(module.notifications || {})
      };

      await module.save();
      console.log(`✅ Updated ${moduleKey} with notification metadata`);
      updated++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total: ${modules.length}`);

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrateModules()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { migrateModules, DEFAULT_NOTIFICATION_METADATA };

