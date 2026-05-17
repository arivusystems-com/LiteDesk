#!/usr/bin/env node
'use strict';

/**
 * Create default company BusinessHourSet per tenant org (if missing).
 *
 *   node scripts/migrateBusinessHoursV1.js
 *   node scripts/migrateBusinessHoursV1.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const dbConnectionManager = require('../utils/databaseConnectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const { ensureDefaultCompanySet } = require('../services/businessHoursResolveService');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  await dbConnectionManager.initializeMasterConnection();
  console.log('[migrateBusinessHoursV1] Connected');

  const tenants = await Organization.find({
    isTenant: true,
    isActive: { $ne: false }
  })
    .select('_id name settings.timeZone database.name')
    .lean();

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const dbName = tenant.database?.name;
    if (!dbName) {
      console.warn(`  Skip ${tenant.name || tenant._id}: no tenant database`);
      skipped += 1;
      continue;
    }

    const conn = await dbConnectionManager.getOrganizationConnection(dbName);
    if (conn.readyState !== 1) await conn.asPromise();

    await runWithTenantContext(
      { organizationId: tenant._id, connection: conn, databaseName: dbName },
      async () => {
        const BusinessHourSet = require('../models/BusinessHourSet');
        const existing = await BusinessHourSet.findOne({
          organizationId: tenant._id,
          isDefault: true
        }).lean();

        if (existing) {
          skipped += 1;
          return;
        }

        const tz = tenant.settings?.timeZone || 'UTC';
        if (dryRun) {
          console.log(`  [dry-run] Would create default schedule for ${tenant.name || tenant._id} (${tz})`);
          created += 1;
          return;
        }

        await ensureDefaultCompanySet(tenant._id, tz, null);
        console.log(`  Created default schedule for ${tenant.name || tenant._id}`);
        created += 1;
      }
    );
  }

  console.log(
    `[migrateBusinessHoursV1] Done. ${dryRun ? 'Would create' : 'Created'}: ${created}, skipped: ${skipped}`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
