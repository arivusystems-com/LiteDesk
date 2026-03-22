#!/usr/bin/env node

/**
 * Create TenantModuleConfiguration records for all organizations with Sales modules
 * 
 * Usage: node scripts/createTenantModuleConfigs.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const ModuleDefinition = require('../models/ModuleDefinition');
const TenantModuleConfiguration = require('../models/TenantModuleConfiguration');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function createTenantModuleConfigs() {
    try {
        console.log('🔧 Creating TenantModuleConfiguration Records\n');
        console.log('='.repeat(60));

        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);

        // Find all organizations with Sales enabled
        // Handle both formats: array of objects and array of strings
        const allOrgs = await Organization.find({});
        const organizations = allOrgs.filter(org => {
            if (!org.enabledApps || org.enabledApps.length === 0) return false;
            return org.enabledApps.some(app => {
                const appKey = typeof app === 'string' ? app : app.appKey;
                return appKey && (appKey.toUpperCase() === 'SALES' || appKey.toLowerCase() === 'sales');
            });
        });

        console.log(`Found ${organizations.length} organization(s) with Sales enabled\n`);

        let created = 0;
        let existing = 0;
        let errors = 0;

        for (const org of organizations) {
            console.log(`Organization: ${org.name || org._id}`);
            console.log(`  ID: ${org._id}`);

            // Check if Sales modules exist for this org
            const peopleModule = await ModuleDefinition.findOne({
                organizationId: org._id,
                $or: [
                    { moduleKey: 'people' },
                    { key: 'people' }
                ]
            });

            const dealsModule = await ModuleDefinition.findOne({
                organizationId: org._id,
                $or: [
                    { moduleKey: 'deals' },
                    { key: 'deals' }
                ]
            });

            if (!peopleModule && !dealsModule) {
                console.log(`  ⚠️  No Sales modules found, skipping\n`);
                continue;
            }

            // Create TenantModuleConfiguration for People
            if (peopleModule) {
                try {
                    const existingConfig = await TenantModuleConfiguration.findOne({
                        organizationId: org._id,
                        appKey: 'SALES',
                        moduleKey: 'people'
                    });

                    if (!existingConfig) {
                        await TenantModuleConfiguration.create({
                            organizationId: org._id,
                            appKey: 'SALES',
                            moduleKey: 'people',
                            enabled: true,
                            settings: {
                                peopleTypes: {
                                    SALES: ['Lead', 'Contact'],
                                    HELPDESK: ['Customer', 'Agent']
                                }
                            }
                        });
                        created++;
                        console.log(`  ✅ Created TenantModuleConfiguration for People`);
                    } else {
                        existing++;
                        console.log(`  ℹ️  TenantModuleConfiguration for People already exists`);
                    }
                } catch (error) {
                    console.error(`  ❌ Error creating People config:`, error.message);
                    errors++;
                }
            }

            // Create TenantModuleConfiguration for Deals
            if (dealsModule) {
                try {
                    const existingConfig = await TenantModuleConfiguration.findOne({
                        organizationId: org._id,
                        appKey: 'SALES',
                        moduleKey: 'deals'
                    });

                    if (!existingConfig) {
                        await TenantModuleConfiguration.create({
                            organizationId: org._id,
                            appKey: 'SALES',
                            moduleKey: 'deals',
                            enabled: true
                        });
                        created++;
                        console.log(`  ✅ Created TenantModuleConfiguration for Deals`);
                    } else {
                        existing++;
                        console.log(`  ℹ️  TenantModuleConfiguration for Deals already exists`);
                    }
                } catch (error) {
                    console.error(`  ❌ Error creating Deals config:`, error.message);
                    errors++;
                }
            }

            console.log('');
        }

        console.log('='.repeat(60));
        console.log(`✅ Created: ${created}`);
        console.log(`ℹ️  Already existed: ${existing}`);
        if (errors > 0) {
            console.log(`❌ Errors: ${errors}`);
        }
        console.log('');

        await mongoose.connection.close();
        console.log('✅ Complete\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

createTenantModuleConfigs();
