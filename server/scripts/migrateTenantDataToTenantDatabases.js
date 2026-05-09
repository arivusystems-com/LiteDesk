#!/usr/bin/env node

/**
 * ============================================================================
 * Migrate Tenant Data Out of Master Into Tenant Databases
 * ============================================================================
 *
 * Tenant-scoped collections (deals, tasks, events, people, items, roles,
 * users, etc.) historically lived in `arivu_master` filtered by
 * `organizationId`. With the data-plane refactor, every tenant database
 * (`arivu_<slug>`) becomes the home for that tenant's records.
 *
 * This script copies each tenant's records from master into the tenant DB
 * (preserving `_id`s) and, optionally, deletes them from master.
 *
 * Modes:
 *   default       — COPY only (master keeps its rows).
 *   --delete      — also remove the migrated rows from master.
 *   --dry-run     — report counts only, no writes anywhere.
 *
 * Filters:
 *   --slug ksca1    — only migrate one tenant by slug
 *   --orgId <id>    — only migrate one tenant by ObjectId
 *
 * Idempotency:
 *   - Copy uses upsert on `_id`, so re-running is safe.
 *   - Delete is performed last and skipped automatically when the tenant DB
 *     count is < master count (sanity guard).
 *
 * Master-only collections (organizations, demoRequests, instanceregistries,
 * userdirectories, appdefinitions, relationshipdefinitions, moduledefinitions,
 * tenantappconfigurations, tenantmoduleconfigurations, tenantrelationshipconfigurations)
 * are NEVER touched.
 * ============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const dbConnectionManager = require('../utils/databaseConnectionManager');

const MONGO_URI =
    process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

// Tenant-scoped MongoDB collection names. These are the actual collection
// names mongoose would use (lowercase, pluralized) — verified against the
// model files. Update this list if you add a new tenant-scoped model.
// Note: 'roles' is intentionally excluded from the default list. The tenant
// seeder (see scripts/seedTenantDatabases.js) already creates the canonical
// default Owner/Admin/Manager/User/Viewer roles in each tenant DB.
// Migrating master-side roles via _id-replace would create duplicates because
// the seeded tenant roles use fresh ObjectIds. If you have custom roles in
// master that you want to migrate, run:
//   node server/scripts/migrateTenantDataToTenantDatabases.js --collections=roles
const TENANT_COLLECTIONS = [
    'users',
    'groups',
    'userpreferences',
    'people',                             // collection: 'people'
    'personnotes',
    'personfileattachments',
    'deals',
    'dealcomments',
    'tasks',
    'taskcomments',
    'events',
    'eventorders',
    'eventtrackings',
    'items',
    'cases',
    'correctiveactionevidences',
    'responsetemplates',
    'forms',
    'formresponses',
    'formkpis',
    'importhistories',
    'automationrules',
    'automationexecutions',
    'businessflows',
    'processes',
    'processexecutions',
    'approvalinstances',
    'auditassignments',
    'auditexecutioncontexts',
    'audittimelines',
    'notifications',
    'notificationpreferences',
    'notificationrules',
    'pushsubscriptions',
    'lifecycles',
    'lifecyclestatusmaps',
    'entitytypes',
    'schedulings',
    'assignmentrulesets',
    'assignmentexecutionlogs',
    'assignmentschedulejobs',
    'communications',
    'relationshipinstances',
    'reports',
    'threadviews',
    'trashsnapshots',
    'executionlogs',
    'recordactivities',
    'recorddescriptionversions',
    'organizationsubscriptions'
];

function parseArgs(argv) {
    const args = { copy: true, delete: false, dryRun: false };
    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--delete') args.delete = true;
        else if (arg === '--dry-run') args.dryRun = true;
        else if (arg.startsWith('--slug')) {
            const [, inline] = arg.split('=');
            args.slug = inline || argv[++i];
        } else if (arg.startsWith('--orgId')) {
            const [, inline] = arg.split('=');
            args.orgId = inline || argv[++i];
        } else if (arg.startsWith('--db')) {
            const [, inline] = arg.split('=');
            args.db = inline || argv[++i];
        } else if (arg === '--collections') {
            args.collections = argv[++i];
        }
    }
    return args;
}

async function loadTargetOrgs(args) {
    const filter = {
        'database.name': { $exists: true, $ne: null, $ne: '' },
        'database.initialized': true
    };
    if (args.orgId) filter._id = new mongoose.Types.ObjectId(args.orgId);
    if (args.slug) filter.slug = String(args.slug).trim().toLowerCase();
    if (args.db) filter['database.name'] = String(args.db).trim();

    return Organization.find(filter).select('_id name slug database').lean();
}

async function migrateCollection(masterDb, tenantDb, collectionName, orgId, opts) {
    const masterColl = masterDb.collection(collectionName);
    const tenantColl = tenantDb.collection(collectionName);

    // Count first - cheap exists check
    const masterCount = await masterColl.countDocuments({ organizationId: orgId });
    if (masterCount === 0) {
        return { collectionName, masterCount: 0, copied: 0, deleted: 0, skipped: true };
    }

    if (opts.dryRun) {
        return { collectionName, masterCount, copied: 0, deleted: 0, dryRun: true };
    }

    // Stream from master and upsert in batches into tenant
    const cursor = masterColl.find({ organizationId: orgId });
    const BATCH = 500;
    let buffer = [];
    let copied = 0;

    const flush = async () => {
        if (buffer.length === 0) return;
        const ops = buffer.map((doc) => ({
            replaceOne: {
                filter: { _id: doc._id },
                replacement: doc,
                upsert: true
            }
        }));
        await tenantColl.bulkWrite(ops, { ordered: false });
        copied += buffer.length;
        buffer = [];
    };

    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        buffer.push(doc);
        if (buffer.length >= BATCH) await flush();
    }
    await flush();

    const tenantCount = await tenantColl.countDocuments({ organizationId: orgId });

    let deleted = 0;
    if (opts.delete) {
        // Sanity: tenant must have at least as many records as we just copied
        // before we delete from master.
        if (tenantCount < masterCount) {
            return {
                collectionName,
                masterCount,
                tenantCount,
                copied,
                deleted: 0,
                error: `tenantCount(${tenantCount}) < masterCount(${masterCount}) - skipping delete for safety`
            };
        }
        const result = await masterColl.deleteMany({ organizationId: orgId });
        deleted = result.deletedCount || 0;
    }

    return { collectionName, masterCount, tenantCount, copied, deleted };
}

async function main() {
    const args = parseArgs(process.argv);

    if (!MONGO_URI) {
        console.error('❌ MONGO_URI is not set');
        process.exit(1);
    }

    const collections = args.collections
        ? args.collections.split(',').map((c) => c.trim()).filter(Boolean)
        : TENANT_COLLECTIONS;

    console.log('🔗 Connecting to master MongoDB...');
    await mongoose.connect(MONGO_URI);
    await dbConnectionManager.initializeMasterConnection();
    console.log('✅ Connected to master');

    const orgs = await loadTargetOrgs(args);
    if (orgs.length === 0) {
        console.warn('⚠️  No tenant organizations matched the filter');
        await mongoose.connection.close();
        process.exit(0);
    }

    console.log(`\n🎯 Mode: ${args.dryRun ? 'DRY-RUN' : args.delete ? 'COPY + DELETE FROM MASTER' : 'COPY-ONLY'}`);
    console.log(`🎯 Tenants: ${orgs.length}`);
    for (const org of orgs) {
        console.log(`   - ${org.name || '(no name)'} [${org.slug || '(no slug)'}] → ${org.database.name}`);
    }
    console.log('');

    const masterDb = mongoose.connection.db;
    const summary = [];
    let totalErrors = 0;

    for (const org of orgs) {
        const dbName = org.database.name;
        console.log(`\n=== ${dbName} (org=${org._id}) ===`);
        const tenantConn = await dbConnectionManager.getOrganizationConnection(dbName);
        if (tenantConn.readyState !== 1 && typeof tenantConn.asPromise === 'function') {
            await tenantConn.asPromise();
        }
        const tenantDb = tenantConn.db;
        const orgResults = [];

        for (const collectionName of collections) {
            try {
                const result = await migrateCollection(masterDb, tenantDb, collectionName, org._id, {
                    delete: args.delete,
                    dryRun: args.dryRun
                });
                orgResults.push(result);

                if (result.skipped) {
                    process.stdout.write(`  · ${collectionName}: empty in master, skipped\n`);
                    continue;
                }
                if (result.error) {
                    totalErrors += 1;
                    process.stdout.write(
                        `  ⚠️  ${collectionName}: master=${result.masterCount}  copied=${result.copied}  ${result.error}\n`
                    );
                    continue;
                }
                if (result.dryRun) {
                    process.stdout.write(`  · ${collectionName}: would copy ${result.masterCount}\n`);
                    continue;
                }
                const tail = args.delete ? `, deleted from master: ${result.deleted}` : '';
                process.stdout.write(
                    `  ✅ ${collectionName}: master=${result.masterCount}  copied=${result.copied}  tenant=${result.tenantCount}${tail}\n`
                );
            } catch (err) {
                totalErrors += 1;
                console.error(`  ❌ ${collectionName}:`, err.message);
            }
        }

        summary.push({ org, results: orgResults });
    }

    console.log('\n📊 Migration finished.');
    if (args.dryRun) {
        console.log('   (dry-run mode — no writes)');
    } else if (!args.delete) {
        console.log('   COPY-ONLY mode: master rows preserved.');
        console.log('   Re-run with --delete after verifying tenant data to remove rows from master.');
    } else {
        console.log('   COPY + DELETE mode: master rows removed for migrated tenants.');
    }

    if (totalErrors > 0) {
        console.warn(`⚠️  ${totalErrors} non-fatal issue(s) encountered. See log above.`);
    }

    await dbConnectionManager.closeAllConnections();
    await mongoose.connection.close();
    process.exit(totalErrors > 0 ? 1 : 0);
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
