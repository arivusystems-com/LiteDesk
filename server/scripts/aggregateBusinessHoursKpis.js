#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Manually aggregate business-hours KPIs (yesterday or --date=YYYY-MM-DD).
 *
 *   node scripts/aggregateBusinessHoursKpis.js
 *   node scripts/aggregateBusinessHoursKpis.js --date=2026-05-15
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const { aggregateBusinessHoursKpiForDay } = require('../services/businessHoursKpiAggregatorService');

const dateArg = process.argv.find((a) => a.startsWith('--date='));
const date = dateArg ? dateArg.split('=')[1] : null;
const orgArg = process.argv.find((a) => a.startsWith('--org='));
const orgId = orgArg ? orgArg.split('=')[1] : process.env.SMOKE_ORG_ID || null;

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  await dbConnectionManager.initializeMasterConnection();

  const query = { isTenant: true, isActive: { $ne: false } };
  if (orgId) query._id = orgId;

  const tenants = await Organization.find(query).select('_id name database.name').lean();
  if (!tenants.length) {
    console.error('No tenant organizations found');
    process.exit(1);
  }

  for (const tenant of tenants) {
    let conn;
    let dbName;
    if (tenant.database?.name) {
      dbName = tenant.database.name;
      conn = await dbConnectionManager.getOrganizationConnection(dbName);
      if (conn.readyState !== 1) await conn.asPromise();
    } else {
      conn = mongoose.connection;
      dbName = conn.db?.databaseName || 'master';
    }

    const row = await runWithTenantContext(
      { organizationId: tenant._id, connection: conn, databaseName: dbName },
      () => aggregateBusinessHoursKpiForDay({ organizationId: tenant._id, date })
    );

    console.log(
      `${tenant.name || tenant._id} ${row.date}: capacity=${row.businessMinutesAvailable}m in=${row.activitiesInsideHours} overtime=${row.overtimeCount} slaOff=${row.slaBreachesOffHours}`
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
