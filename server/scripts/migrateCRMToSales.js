/**
 * ============================================================================
 * Migration Script: CRM → Sales
 * ============================================================================
 * 
 * This script migrates all CRM references to Sales in the database:
 * - Updates AppDefinition records (appKey: 'crm' → 'sales', name: 'CRM' → 'Sales')
 * - Updates Organization.enabledApps arrays
 * - Updates User.allowedApps arrays
 * - Updates Notification records
 * - Updates NotificationPreference records
 * - Updates NotificationRule records
 * - Updates PushSubscription records
 * 
 * Usage:
 *   node server/scripts/migrateCRMToSales.js
 * 
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
const mongoose = require('mongoose');
const AppDefinition = require('../models/AppDefinition');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const NotificationRule = require('../models/NotificationRule');
const PushSubscription = require('../models/PushSubscription');

async function migrateCRMToSales() {
  try {
    console.log('🔄 Starting CRM → Sales migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Handle AppDefinition - delete 'crm' if 'sales' already exists
    console.log('📦 Step 1: Handling AppDefinition records...');
    const crmApp = await AppDefinition.findOne({ appKey: 'crm' });
    const salesApp = await AppDefinition.findOne({ appKey: 'sales' });
    
    if (crmApp && salesApp) {
      // Both exist - delete CRM and keep SALES
      console.log('   ⚠️  Both CRM and Sales AppDefinitions exist. Deleting CRM...');
      await AppDefinition.deleteOne({ appKey: 'crm' });
      console.log('   ✅ Deleted CRM AppDefinition (Sales already exists)\n');
    } else if (crmApp && !salesApp) {
      // Only CRM exists - rename it
      await AppDefinition.updateOne(
        { appKey: 'crm' },
        { 
          $set: { 
            appKey: 'sales',
            name: 'Sales'
          } 
        }
      );
      console.log('   ✅ Renamed CRM AppDefinition to Sales\n');
    } else if (!crmApp && salesApp) {
      console.log('   ✅ Sales AppDefinition already exists, no CRM to migrate\n');
    } else {
      console.log('   ⚠️  Neither CRM nor Sales AppDefinition found\n');
    }

    // 2. Update Organization.enabledApps
    console.log('🏢 Step 2: Updating Organization.enabledApps...');
    // Find all orgs and check manually (enabledApps can be strings or objects)
    const orgs = await Organization.find({});

    let orgCount = 0;
    for (const org of orgs) {
      let updated = false;
      let newEnabledApps = org.enabledApps;
      
      if (Array.isArray(org.enabledApps)) {
        // Check if it's array of objects
        if (org.enabledApps.length > 0 && typeof org.enabledApps[0] === 'object') {
          newEnabledApps = org.enabledApps.map(app => {
            if (app.appKey === 'CRM' || app.appKey === 'crm') {
              updated = true;
              return { ...app, appKey: 'SALES' };
            }
            return app;
          });
        } else {
          // Array of strings
          newEnabledApps = org.enabledApps.map(app => {
            if (app === 'CRM' || app === 'crm') {
              updated = true;
              return 'SALES';
            }
            return app;
          });
        }
      } else if (org.enabledApps === 'CRM' || org.enabledApps === 'crm') {
        newEnabledApps = 'SALES';
        updated = true;
      }

      if (updated) {
        await Organization.findByIdAndUpdate(org._id, { $set: { enabledApps: newEnabledApps } });
        orgCount++;
      }
    }
    console.log(`   ✅ Updated ${orgCount} Organization records\n`);

    // 3. Update User.allowedApps
    console.log('👤 Step 3: Updating User.allowedApps...');
    const users = await User.find({
      allowedApps: { $in: ['CRM', 'crm'] }
    });

    let userCount = 0;
    for (const user of users) {
      if (Array.isArray(user.allowedApps)) {
        user.allowedApps = user.allowedApps.map(app => {
          if (app === 'CRM' || app === 'crm') {
            return 'SALES';
          }
          return app;
        });
        await user.save();
        userCount++;
      }
    }
    console.log(`   ✅ Updated ${userCount} User records\n`);

    // 4. Update User.appAccess
    console.log('👤 Step 4: Updating User.appAccess...');
    const usersWithAppAccess = await User.find({
      'appAccess.appKey': { $in: ['CRM', 'crm'] }
    });

    let appAccessCount = 0;
    for (const user of usersWithAppAccess) {
      if (Array.isArray(user.appAccess)) {
        let updated = false;
        user.appAccess = user.appAccess.map(access => {
          if (access.appKey === 'CRM' || access.appKey === 'crm') {
            updated = true;
            return { ...access, appKey: 'SALES' };
          }
          return access;
        });
        if (updated) {
          await user.save();
          appAccessCount++;
        }
      }
    }
    console.log(`   ✅ Updated ${appAccessCount} User.appAccess records\n`);

    // 5. Update Notification records
    console.log('🔔 Step 5: Updating Notification records...');
    const notifResult = await Notification.updateMany(
      { appKey: 'CRM' },
      { $set: { appKey: 'SALES' } }
    );
    const notifSourceResult = await Notification.updateMany(
      { sourceAppKey: 'CRM' },
      { $set: { sourceAppKey: 'SALES' } }
    );
    console.log(`   ✅ Updated ${notifResult.modifiedCount} Notification.appKey records`);
    console.log(`   ✅ Updated ${notifSourceResult.modifiedCount} Notification.sourceAppKey records\n`);

    // 6. Handle NotificationPreference records - delete CRM if SALES exists, otherwise update
    console.log('⚙️  Step 6: Handling NotificationPreference records...');
    // Find users with both CRM and SALES preferences
    const usersWithBoth = await NotificationPreference.aggregate([
      { $match: { appKey: { $in: ['CRM', 'SALES'] } } },
      { $group: { _id: '$userId', apps: { $addToSet: '$appKey' } } },
      { $match: { apps: { $size: 2 } } }
    ]);
    
    // Delete CRM preferences for users who have both
    let deletedCount = 0;
    for (const user of usersWithBoth) {
      const deleted = await NotificationPreference.deleteMany({
        userId: user._id,
        appKey: 'CRM'
      });
      deletedCount += deleted.deletedCount;
    }
    
    // Update remaining CRM preferences to SALES
    const prefResult = await NotificationPreference.updateMany(
      { appKey: 'CRM' },
      { $set: { appKey: 'SALES' } }
    );
    console.log(`   ✅ Deleted ${deletedCount} duplicate CRM NotificationPreference records`);
    console.log(`   ✅ Updated ${prefResult.modifiedCount} NotificationPreference records\n`);

    // 7. Update NotificationRule records
    console.log('📋 Step 7: Updating NotificationRule records...');
    const ruleResult = await NotificationRule.updateMany(
      { appKey: 'CRM' },
      { $set: { appKey: 'SALES' } }
    );
    console.log(`   ✅ Updated ${ruleResult.modifiedCount} NotificationRule records\n`);

    // 8. Update PushSubscription records
    console.log('📱 Step 8: Updating PushSubscription records...');
    const pushResult = await PushSubscription.updateMany(
      { appKey: 'CRM' },
      { $set: { appKey: 'SALES' } }
    );
    console.log(`   ✅ Updated ${pushResult.modifiedCount} PushSubscription records\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Organization: ${orgCount} records`);
    console.log(`   - User.allowedApps: ${userCount} records`);
    console.log(`   - User.appAccess: ${appAccessCount} records`);
    console.log(`   - Notification: ${notifResult.modifiedCount + notifSourceResult.modifiedCount} records`);
    console.log(`   - NotificationPreference: ${deletedCount} deleted, ${prefResult.modifiedCount} updated`);
    console.log(`   - NotificationRule: ${ruleResult.modifiedCount} records`);
    console.log(`   - PushSubscription: ${pushResult.modifiedCount} records`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrateCRMToSales()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCRMToSales };

