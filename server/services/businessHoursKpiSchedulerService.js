'use strict';

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const { aggregateBusinessHoursKpiForDay } = require('./businessHoursKpiAggregatorService');

/**
 * Aggregate yesterday's KPIs for all active tenant organizations.
 */
async function tickBusinessHoursKpiAggregation() {
  const tenants = await Organization.find({
    isTenant: true,
    isActive: { $ne: false }
  })
    .select('_id database.name')
    .lean();

  let processed = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
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

      await runWithTenantContext(
        { organizationId: tenant._id, connection: conn, databaseName: dbName },
        async () => {
          await aggregateBusinessHoursKpiForDay({ organizationId: tenant._id });
        }
      );
      processed += 1;
    } catch (err) {
      failed += 1;
      console.error(`[businessHoursKpiScheduler] org ${tenant._id}:`, err.message);
    }
  }

  return { tenants: tenants.length, processed, failed };
}

module.exports = {
  tickBusinessHoursKpiAggregation
};
