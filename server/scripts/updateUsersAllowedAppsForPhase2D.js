#!/usr/bin/env node

/**
 * Update all users to include Sales, Helpdesk, and Projects in allowedApps (Phase 2D)
 * 
 * This script updates users' allowedApps to include the new apps.
 * Owners and admins get all enabled apps.
 * Regular users get apps based on their organization's enabledApps.
 * 
 * Usage: node scripts/updateUsersAllowedAppsForPhase2D.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

async function updateUsersAllowedApps() {
  try {
    console.log('🚀 Updating users\' allowedApps to include Sales, Helpdesk, and Projects (Phase 2D)...\n');

    // Get master database URI (always uses litedesk_master)
    const masterUri = getMasterDatabaseUri();
    console.log('🔗 Connecting to MongoDB master database (litedesk_master)...');
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB master database (litedesk_master)\n');

    // Get all users
    const users = await User.find({});
    console.log(`📋 Found ${users.length} user(s)\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // New apps to potentially add
    const newApps = ['SALES', 'HELPDESK', 'PROJECTS'];

    for (const user of users) {
      // Get user's organization
      const organization = await Organization.findById(user.organizationId);
      if (!organization) {
        console.log(`  ⚠️  Skipping user ${user.email}: organization not found`);
        skippedCount++;
        continue;
      }

      // Get enabled apps from organization
      let enabledAppKeys = [];
      if (organization.enabledApps && organization.enabledApps.length > 0) {
        if (typeof organization.enabledApps[0] === 'object' && organization.enabledApps[0] !== null) {
          enabledAppKeys = organization.enabledApps
            .filter(app => app.status === 'ACTIVE')
            .map(app => app.appKey.toUpperCase());
        } else {
          enabledAppKeys = organization.enabledApps.map(app => app.toUpperCase());
        }
      }

      // Start with current allowedApps or default to CRM
      let allowedApps = Array.isArray(user.allowedApps) ? [...user.allowedApps] : ['CRM'];

      // For owners and admins, give access to all enabled apps
      if (user.isOwner || user.role === 'admin' || user.role === 'Admin') {
        // Add all enabled apps that are not already in allowedApps
        for (const appKey of enabledAppKeys) {
          if (!allowedApps.includes(appKey)) {
            allowedApps.push(appKey);
          }
        }
      } else {
        // For regular users, only add new apps if they're enabled for the organization
        // and the user already has access to other apps (maintain existing access pattern)
        if (allowedApps.length > 0) {
          // If user has access to any app, check if new apps are enabled
          for (const appKey of newApps) {
            if (enabledAppKeys.includes(appKey) && !allowedApps.includes(appKey)) {
              // For Phase 2D, give access to new apps if org has them enabled
              allowedApps.push(appKey);
            }
          }
        }
      }

      // Update user if allowedApps changed
      const originalApps = Array.isArray(user.allowedApps) ? [...user.allowedApps].sort() : [];
      const finalAllowedApps = [...allowedApps].sort();
      
      if (JSON.stringify(originalApps) !== JSON.stringify(finalAllowedApps)) {
        user.allowedApps = allowedApps;
        await user.save();
        
        updatedCount++;
        console.log(`  ✅ Updated user: ${user.email}`);
        console.log(`     Role: ${user.role || 'N/A'}, Owner: ${user.isOwner || false}`);
        console.log(`     Old allowedApps: ${originalApps.join(', ') || 'None'}`);
        console.log(`     New allowedApps: ${finalAllowedApps.join(', ')}\n`);
      } else {
        skippedCount++;
      }
    }

    // Summary
    console.log('✅ User allowedApps update complete!');
    console.log(`\n📈 Summary:`);
    console.log(`   - Users updated: ${updatedCount}`);
    console.log(`   - Users skipped: ${skippedCount}`);
    console.log(`   - Total users: ${users.length}`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Users may need to log out and log back in`);
    console.log(`   2. Visit /platform to see all enabled apps\n`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateUsersAllowedApps();
}

module.exports = updateUsersAllowedApps;

