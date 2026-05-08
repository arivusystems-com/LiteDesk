#!/usr/bin/env node

/**
 * ============================================================================
 * Seed Tenant Databases
 * ============================================================================
 *
 * Backfills the tenant-DB baseline for every Organization that has a dedicated
 * database (`database.name` set and `database.initialized=true`). For each
 * tenant DB, this script writes the same data that `litedesk_master` is given
 * on first setup:
 *
 *   - AppDefinition           (platform app catalog)
 *   - ModuleDefinition        (platform-level module definitions)
 *   - RelationshipDefinition  (platform relationships)
 *   - Role                    (default Owner / Admin / Manager / User / Viewer)
 *   - TenantAppConfiguration  (default tenant app configs)
 *   - TenantModuleConfiguration (default tenant module configs)
 *
 * The script is idempotent. Running it again will only insert what is missing.
 *
 * Usage:
 *   node server/scripts/seedTenantDatabases.js                # all tenants
 *   node server/scripts/seedTenantDatabases.js --slug ksca1    # one tenant by slug
 *   node server/scripts/seedTenantDatabases.js --orgId <id>    # one tenant by ObjectId
 *   node server/scripts/seedTenantDatabases.js --db litedesk_ksca1  # one tenant by DB name
 * ============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { seedTenantDatabase } = require('../services/provisioning/tenantSeeder');

const MONGO_URI =
    process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const [key, inlineValue] = arg.slice(2).split('=');
            const next = argv[i + 1];
            if (inlineValue !== undefined) {
                args[key] = inlineValue;
            } else if (next && !next.startsWith('--')) {
                args[key] = next;
                i += 1;
            } else {
                args[key] = true;
            }
        }
    }
    return args;
}

async function loadTargetOrgs(args) {
    const filter = {
        'database.name': { $exists: true, $ne: null, $ne: '' },
        'database.initialized': true
    };

    if (args.orgId) {
        filter._id = new mongoose.Types.ObjectId(args.orgId);
    }
    if (args.slug) {
        filter.slug = String(args.slug).trim().toLowerCase();
    }
    if (args.db) {
        filter['database.name'] = String(args.db).trim();
    }

    const orgs = await Organization.find(filter)
        .select('_id name slug database')
        .lean();

    return orgs;
}

async function main() {
    const args = parseArgs(process.argv);

    if (!MONGO_URI) {
        console.error('❌ MONGO_URI / MONGODB_URI is not set. Cannot connect to master DB.');
        process.exit(1);
    }

    console.log('🔗 Connecting to master MongoDB...');
    await mongoose.connect(MONGO_URI);
    await dbConnectionManager.initializeMasterConnection();
    console.log('✅ Connected to master MongoDB');

    const orgs = await loadTargetOrgs(args);
    if (orgs.length === 0) {
        console.warn('⚠️  No tenant organizations matched the given filter.');
        await mongoose.connection.close();
        process.exit(0);
    }

    console.log(`\n🎯 Seeding ${orgs.length} tenant database(s):`);
    for (const org of orgs) {
        console.log(`   - ${org.name || '(no name)'}  [${org.slug || '(no slug)'}]  →  ${org.database.name}`);
    }
    console.log('');

    const results = [];
    let failed = 0;

    for (const org of orgs) {
        const dbName = org.database.name;
        try {
            const orgConnection = await dbConnectionManager.getOrganizationConnection(dbName);
            const summary = await seedTenantDatabase(orgConnection, org);
            results.push({ org, summary });
        } catch (err) {
            console.error(`❌ Failed to seed ${dbName}:`, err.message);
            console.error(err.stack);
            failed += 1;
            results.push({ org, error: err.message });
        }
    }

    console.log('\n📊 Seed Summary:');
    for (const result of results) {
        const orgLabel = `${result.org.name || '(no name)'} [${result.org.slug || '(no slug)'}]`;
        if (result.error) {
            console.log(`   ❌ ${orgLabel}: ${result.error}`);
            continue;
        }
        const s = result.summary;
        console.log(`   ✅ ${orgLabel}`);
        console.log(`        AppDefinition:              +${s.appDefinitions.created}  (skipped ${s.appDefinitions.skipped})`);
        console.log(`        ModuleDefinition:           +${s.moduleDefinitions.created}  (skipped ${s.moduleDefinitions.skipped})`);
        console.log(`        RelationshipDefinition:     +${s.relationshipDefinitions.created}  (skipped ${s.relationshipDefinitions.skipped})`);
        console.log(`        Role (defaults):            +${s.roles.created}  (skipped ${s.roles.skipped})`);
        console.log(`        TenantAppConfiguration:     +${s.tenantAppConfigurations.created}  (skipped ${s.tenantAppConfigurations.skipped})`);
        console.log(`        TenantModuleConfiguration:  +${s.tenantModuleConfigurations.created}  (skipped ${s.tenantModuleConfigurations.skipped})`);
    }

    await dbConnectionManager.closeAllConnections();
    await mongoose.connection.close();

    if (failed > 0) {
        console.log(`\n⚠️  ${failed} tenant(s) failed. See errors above.`);
        process.exit(1);
    }

    console.log('\n🎉 Tenant DB seed complete.');
    process.exit(0);
}

if (require.main === module) {
    main().catch(async (err) => {
        console.error('💥 Unexpected error:', err);
        try {
            await dbConnectionManager.closeAllConnections();
        } catch (_e) {
            /* ignore */
        }
        try {
            await mongoose.connection.close();
        } catch (_e) {
            /* ignore */
        }
        process.exit(1);
    });
}
