#!/usr/bin/env node

/**
 * Smoke test: verify tenant model proxy + AsyncLocalStorage context route
 * tenant-scoped writes to the tenant DB and master-only writes to master.
 *
 * Usage: node server/scripts/_smokeTestTenantProxy.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const Organization = require('../models/Organization');
const Role = require('../models/Role'); // tenant-scoped (proxy-wrapped)
const Group = require('../models/Group'); // tenant-scoped (proxy-wrapped)
const { runWithTenantContext } = require('../utils/tenantContext');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
    await mongoose.connect(MONGO_URI);
    await dbConnectionManager.initializeMasterConnection();

    const tenantSlug = process.argv[2] || 'csk';
    const org = await Organization.findOne({ slug: tenantSlug }).lean();
    if (!org || !org.database?.name) {
        console.error(`No tenant org found for slug=${tenantSlug}`);
        process.exit(1);
    }

    const tenantConn = await dbConnectionManager.getOrganizationConnection(org.database.name);
    if (tenantConn.readyState !== 1) await tenantConn.asPromise();

    console.log(`Master DB: ${mongoose.connection.db.databaseName}`);
    console.log(`Tenant DB: ${tenantConn.db.databaseName} (org=${org._id})`);
    console.log('');

    // ---- 1) Outside any tenant context: writes go to master ----
    console.log('Test 1: Group.create OUTSIDE tenant context');
    const masterGroup = await Group.create({
        organizationId: org._id,
        name: '__SMOKE_TEST_OUTSIDE__'
    });
    console.log(`   Created group _id=${masterGroup._id} (expected in master)`);

    // ---- 2) Inside tenant context: writes should go to tenant DB ----
    console.log('\nTest 2: Group.create INSIDE tenant context');
    const insideGroup = await runWithTenantContext(
        { organizationId: org._id, connection: tenantConn, databaseName: org.database.name },
        async () => Group.create({ organizationId: org._id, name: '__SMOKE_TEST_INSIDE__' })
    );
    console.log(`   Created group _id=${insideGroup._id} (expected in tenant DB)`);

    // ---- 3) Where did each row land? ----
    const masterGroupRows = await mongoose.connection.db
        .collection('groups')
        .find({ name: { $in: ['__SMOKE_TEST_OUTSIDE__', '__SMOKE_TEST_INSIDE__'] } })
        .project({ _id: 1, name: 1 })
        .toArray();
    const tenantGroupRows = await tenantConn.db
        .collection('groups')
        .find({ name: { $in: ['__SMOKE_TEST_OUTSIDE__', '__SMOKE_TEST_INSIDE__'] } })
        .project({ _id: 1, name: 1 })
        .toArray();

    console.log('\n📊 Results:');
    console.log(`   master.groups : ${JSON.stringify(masterGroupRows)}`);
    console.log(`   tenant.groups : ${JSON.stringify(tenantGroupRows)}`);

    const ok =
        masterGroupRows.find((r) => r.name === '__SMOKE_TEST_OUTSIDE__') &&
        tenantGroupRows.find((r) => r.name === '__SMOKE_TEST_INSIDE__') &&
        !masterGroupRows.find((r) => r.name === '__SMOKE_TEST_INSIDE__') &&
        !tenantGroupRows.find((r) => r.name === '__SMOKE_TEST_OUTSIDE__');

    console.log('');
    if (ok) {
        console.log('✅ PASS: tenant proxy correctly routed each write.');
    } else {
        console.log('❌ FAIL: routing did not match expectations.');
    }

    // Cleanup
    await mongoose.connection.db.collection('groups').deleteMany({
        name: { $in: ['__SMOKE_TEST_OUTSIDE__', '__SMOKE_TEST_INSIDE__'] }
    });
    await tenantConn.db.collection('groups').deleteMany({
        name: { $in: ['__SMOKE_TEST_OUTSIDE__', '__SMOKE_TEST_INSIDE__'] }
    });

    await dbConnectionManager.closeAllConnections();
    await mongoose.connection.close();
    process.exit(ok ? 0 : 1);
}

if (require.main === module) {
    main().catch(async (err) => {
        console.error('💥', err);
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
