#!/usr/bin/env node
/**
 * Smoke test (reads): inside tenant context, Role.find() should hit tenant DB.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const Organization = require('../models/Organization');
const Role = require('../models/Role');
const { runWithTenantContext } = require('../utils/tenantContext');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    await dbConnectionManager.initializeMasterConnection();

    const slug = process.argv[2] || 'csk';
    const org = await Organization.findOne({ slug }).lean();
    const conn = await dbConnectionManager.getOrganizationConnection(org.database.name);
    if (conn.readyState !== 1) await conn.asPromise();

    console.log('Outside context (should hit master):');
    const masterRoles = await Role.find({ organizationId: org._id }).select('name').lean();
    console.log('  ', masterRoles.map((r) => r.name));

    console.log('Inside tenant context (should hit tenant DB):');
    const tenantRoles = await runWithTenantContext(
        { organizationId: org._id, connection: conn, databaseName: org.database.name },
        async () => Role.find({ organizationId: org._id }).select('name').lean()
    );
    console.log('  ', tenantRoles.map((r) => r.name));

    await dbConnectionManager.closeAllConnections();
    await mongoose.connection.close();
})();
