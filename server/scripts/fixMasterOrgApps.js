#!/usr/bin/env node

/**
 * Fix master organization (Arivu) to have SALES, AUDIT, and PORTAL enabled
 * Also ensure the admin user has access to all three apps
 * 
 * Usage: node server/scripts/fixMasterOrgApps.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');
const { APP_KEYS } = require('../constants/appKeys');
const { validateAppRole, getDefaultRoleForApp } = require('../utils/appAccessUtils');

async function fixMasterOrgApps() {
  try {
    console.log('🔧 Fixing master organization apps...\n');

    // Get master database URI
    const masterUri = getMasterDatabaseUri();
    console.log('🔗 Connecting to MongoDB master database (litedesk_master)...');
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB master database\n');

    // Find Arivu organization
    const organization = await Organization.findOne({ name: 'Arivu', isTenant: true });
    if (!organization) {
      console.error('❌ Arivu organization not found!');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`📋 Found organization: ${organization.name} (${organization._id})`);
    console.log(`   Current enabledApps:`, JSON.stringify(organization.enabledApps, null, 2));

    // Update enabledApps to include SALES, AUDIT, and PORTAL
    const requiredApps = [
      { appKey: 'SALES', status: 'ACTIVE', enabledAt: new Date() },
      { appKey: 'AUDIT', status: 'ACTIVE', enabledAt: new Date() },
      { appKey: 'PORTAL', status: 'ACTIVE', enabledAt: new Date() }
    ];

    // Remove duplicates and merge with existing
    const existingApps = Array.isArray(organization.enabledApps) ? organization.enabledApps : [];
    const appMap = new Map();

    // Add existing apps to map
    existingApps.forEach(app => {
      const appKey = typeof app === 'string' ? app : app.appKey;
      appMap.set(appKey.toUpperCase(), {
        appKey: appKey.toUpperCase(),
        status: typeof app === 'object' && app.status ? app.status : 'ACTIVE',
        enabledAt: typeof app === 'object' && app.enabledAt ? app.enabledAt : new Date()
      });
    });

    // Add/update required apps
    requiredApps.forEach(reqApp => {
      appMap.set(reqApp.appKey, reqApp);
    });

    organization.enabledApps = Array.from(appMap.values());
    await organization.save();

    console.log(`✅ Updated enabledApps:`, JSON.stringify(organization.enabledApps, null, 2));

    // Find admin user (owner)
    const adminUser = await User.findOne({ 
      organizationId: organization._id,
      isOwner: true 
    });

    if (!adminUser) {
      console.warn('⚠️  Admin user (owner) not found, skipping user appAccess update');
    } else {
      console.log(`\n👤 Found admin user: ${adminUser.email}`);
      console.log(`   Current appAccess:`, JSON.stringify(adminUser.appAccess, null, 2));
      console.log(`   Current allowedApps:`, adminUser.allowedApps);

      // Update appAccess to include all three apps
      const appAccessMap = new Map();
      
      // Add existing appAccess entries
      if (Array.isArray(adminUser.appAccess)) {
        adminUser.appAccess.forEach(access => {
          appAccessMap.set(access.appKey.toUpperCase(), access);
        });
      }

      // Add/update required apps with appropriate roles
      // For owners, use ADMIN for SALES, appropriate defaults for others
      const appsToAdd = ['SALES', 'AUDIT', 'PORTAL'];
      for (const appKey of appsToAdd) {
        // Determine role: ADMIN for SALES (owner), appropriate defaults for others
        let roleKey;
        if (appKey === 'SALES') {
          roleKey = 'ADMIN'; // Owners should have ADMIN access to SALES
        } else if (appKey === 'AUDIT') {
          roleKey = 'AUDITOR';
        } else if (appKey === 'PORTAL') {
          roleKey = 'CUSTOMER';
        } else {
          roleKey = getDefaultRoleForApp(appKey) || 'ADMIN';
        }

        // Validate role
        if (!validateAppRole(appKey, roleKey)) {
          console.warn(`⚠️  Invalid role ${roleKey} for ${appKey}, using ADMIN`);
          roleKey = 'ADMIN';
        }

        appAccessMap.set(appKey, {
          appKey: appKey,
          roleKey: roleKey,
          status: 'ACTIVE',
          addedAt: new Date()
        });
      }

      adminUser.appAccess = Array.from(appAccessMap.values());
      adminUser.allowedApps = Array.from(appAccessMap.keys()); // Legacy field
      await adminUser.save();

      console.log(`✅ Updated appAccess:`, JSON.stringify(adminUser.appAccess, null, 2));
      console.log(`✅ Updated allowedApps:`, adminUser.allowedApps);
    }

    console.log('\n✅ Fix complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Log out and log back in as the admin user');
    console.log('   3. The app switcher should now show Sales, Audit, and Portal\n');

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing master org apps:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixMasterOrgApps();
}

module.exports = fixMasterOrgApps;
