#!/usr/bin/env node

/**
 * Bootstrap Organizations for UI Composition (Phase 0D)
 * 
 * This script ensures all organizations have:
 * 1. enabledApps set (defaults to ['CRM'] if not set)
 * 2. TenantModuleConfiguration records for enabled modules
 * 
 * Run this after seeding platform definitions to enable UI composition.
 * 
 * Usage: node scripts/bootstrapOrganizationsForUI.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const TenantModuleConfiguration = require('../models/TenantModuleConfiguration');
const ModuleDefinition = require('../models/ModuleDefinition');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function bootstrapOrganizationsForUI() {
  try {
    console.log('🚀 Bootstrapping Organizations for UI Composition (Phase 0D)...\n');

    // Validate MongoDB URI
    if (!MONGO_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file!');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`📊 Found ${organizations.length} organizations\n`);

    let orgsUpdated = 0;
    let configsCreated = 0;

    // Get all CRM module definitions
    const crmModules = await ModuleDefinition.find({ appKey: 'crm' });
    console.log(`📦 Found ${crmModules.length} CRM modules to configure\n`);

    for (const org of organizations) {
      let orgNeedsUpdate = false;

      // Step 1: Ensure enabledApps is set
      if (!org.enabledApps || org.enabledApps.length === 0) {
        org.enabledApps = ['CRM'];
        orgNeedsUpdate = true;
        console.log(`  ✅ Set enabledApps for ${org.name || org._id}: ['CRM']`);
      }

      // Step 2: Ensure enabledModules compatibility (backward compatibility)
      if (!org.enabledModules || org.enabledModules.length === 0) {
        org.enabledModules = ['contacts', 'deals', 'tasks', 'events'];
        orgNeedsUpdate = true;
        console.log(`  ✅ Set enabledModules for ${org.name || org._id}`);
      }

      if (orgNeedsUpdate) {
        await org.save();
        orgsUpdated++;
      }

      // Step 3: Create TenantModuleConfiguration for each CRM module
      for (const moduleDef of crmModules) {
        const existingConfig = await TenantModuleConfiguration.findOne({
          organizationId: org._id,
          appKey: 'CRM',
          moduleKey: moduleDef.moduleKey
        });

        if (!existingConfig) {
          await TenantModuleConfiguration.create({
            organizationId: org._id,
            appKey: 'CRM',
            moduleKey: moduleDef.moduleKey,
            enabled: true,
            ui: {
              showInSidebar: true,
              sidebarOrder: moduleDef.ui?.sidebarOrder || null
            }
          });
          configsCreated++;
          console.log(`  ✅ Created config: ${org.name || org._id} → CRM.${moduleDef.moduleKey}`);
        }
      }
    }

    // Summary
    console.log(`\n✅ Bootstrap complete!`);
    console.log(`\n📈 Summary:`);
    console.log(`   - Organizations updated: ${orgsUpdated}`);
    console.log(`   - Module configurations created: ${configsCreated}`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Test UI composition: GET /api/ui/sidebar`);
    console.log(`   2. Verify dynamic sidebar renders correctly`);
    console.log(`   3. Test app switching if multiple apps are enabled\n`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error bootstrapping organizations:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  bootstrapOrganizationsForUI();
}

module.exports = bootstrapOrganizationsForUI;

