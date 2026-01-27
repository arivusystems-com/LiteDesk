#!/usr/bin/env node

/**
 * Convert organization-specific ModuleDefinitions to platform-level modules
 * and create TenantModuleConfiguration records
 * 
 * Usage: node scripts/convertToPlatformModules.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');
const TenantModuleConfiguration = require('../models/TenantModuleConfiguration');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function convertToPlatformModules() {
    try {
        console.log('🔄 Converting Organization Modules to Platform Modules\n');
        console.log('='.repeat(60));

        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI is not set in .env file!');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);

        // Find all organization-specific Sales modules
        const orgModules = await ModuleDefinition.find({
            appKey: 'sales',
            organizationId: { $ne: null }
        });

        console.log(`Found ${orgModules.length} organization-specific Sales modules\n`);

        if (orgModules.length === 0) {
            console.log('✅ No organization-specific modules to convert\n');
            await mongoose.connection.close();
            return;
        }

        // Group by moduleKey
        const modulesByKey = {};
        orgModules.forEach(module => {
            const key = module.moduleKey || module.key;
            if (!modulesByKey[key]) {
                modulesByKey[key] = [];
            }
            modulesByKey[key].push(module);
        });

        let platformCreated = 0;
        let configsCreated = 0;
        let errors = 0;

        for (const [moduleKey, modules] of Object.entries(modulesByKey)) {
            console.log(`\nProcessing ${moduleKey} module...`);
            
            // Check if platform-level module already exists
            let platformModule = await ModuleDefinition.findOne({
                appKey: 'sales',
                moduleKey: moduleKey,
                organizationId: null
            });

            if (!platformModule) {
                // Use the first org module as the template for platform module
                const template = modules[0];
                console.log(`  Creating platform-level module from org: ${template.organizationId}`);
                
                try {
                    // Create platform-level module (remove organizationId, keep fields)
                    platformModule = await ModuleDefinition.create({
                        appKey: 'sales',
                        moduleKey: moduleKey,
                        label: template.label || (moduleKey === 'people' ? 'Person' : 'Deal'),
                        pluralLabel: template.pluralLabel || (moduleKey === 'people' ? 'People' : 'Deals'),
                        entityType: template.entityType || (moduleKey === 'people' ? 'CORE' : 'TRANSACTION'),
                        primaryField: template.primaryField || 'name',
                        // Keep fields, relationships, etc. from org module
                        fields: template.fields || [],
                        relationships: template.relationships || [],
                        quickCreate: template.quickCreate || [],
                        quickCreateLayout: template.quickCreateLayout || { version: 1, rows: [] },
                        pipelineSettings: template.pipelineSettings || [],
                        type: 'system',
                        enabled: true
                    });
                    platformCreated++;
                    console.log(`  ✅ Created platform-level ${moduleKey} module`);
                } catch (error) {
                    if (error.code === 11000) {
                        // Duplicate key - platform module might exist with different fields
                        console.log(`  ⚠️  Platform module already exists, updating...`);
                        platformModule = await ModuleDefinition.findOne({
                            appKey: 'sales',
                            moduleKey: moduleKey,
                            organizationId: null
                        });
                        // Update fields if they're missing
                        if (platformModule && (!platformModule.fields || platformModule.fields.length === 0)) {
                            platformModule.fields = template.fields || [];
                            platformModule.relationships = template.relationships || [];
                            platformModule.quickCreate = template.quickCreate || [];
                            platformModule.quickCreateLayout = template.quickCreateLayout || { version: 1, rows: [] };
                            if (template.pipelineSettings) {
                                platformModule.pipelineSettings = template.pipelineSettings;
                            }
                            await platformModule.save();
                            console.log(`  ✅ Updated platform-level ${moduleKey} module with fields`);
                        }
                    } else {
                        console.error(`  ❌ Error creating platform module:`, error.message);
                        errors++;
                        continue;
                    }
                }
            } else {
                console.log(`  ✅ Platform-level ${moduleKey} module already exists`);
            }

            // Create TenantModuleConfiguration for each organization
            for (const orgModule of modules) {
                const orgId = orgModule.organizationId;
                console.log(`  Creating TenantModuleConfiguration for org: ${orgId}`);
                
                try {
                    const existingConfig = await TenantModuleConfiguration.findOne({
                        organizationId: orgId,
                        appKey: 'SALES',
                        moduleKey: moduleKey
                    });

                    if (!existingConfig) {
                        await TenantModuleConfiguration.create({
                            organizationId: orgId,
                            appKey: 'SALES',
                            moduleKey: moduleKey,
                            enabled: true
                        });
                        configsCreated++;
                        console.log(`    ✅ Created TenantModuleConfiguration`);
                    } else {
                        console.log(`    ℹ️  TenantModuleConfiguration already exists`);
                    }
                } catch (configError) {
                    console.error(`    ❌ Error creating TenantModuleConfiguration:`, configError.message);
                    errors++;
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Platform modules created: ${platformCreated}`);
        console.log(`✅ Tenant configurations created: ${configsCreated}`);
        if (errors > 0) {
            console.log(`❌ Errors: ${errors}`);
        }
        console.log('');

        await mongoose.connection.close();
        console.log('✅ Conversion complete\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

convertToPlatformModules();
