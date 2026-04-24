#!/usr/bin/env node

/**
 * One-time migration: normalize Helpdesk Cases route base.
 *
 * Ensures ModuleDefinition documents for Helpdesk Cases use:
 *   ui.routeBase = "/helpdesk/cases"
 *
 * Default mode is DRY-RUN (no writes).
 * Persist changes with:
 *   node scripts/migrateHelpdeskCasesRouteBase.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');

const TARGET_ROUTE_BASE = '/helpdesk/cases';

function resolveMongoUri() {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL) ||
    process.env.MONGO_URI_ATLAS;

  if (!mongoUri) {
    console.error(
      'Missing Mongo URI. Set MONGODB_URI or MONGO_URI in server/.env (or MONGO_URI_LOCAL / MONGO_URI_ATLAS).'
    );
    process.exit(1);
  }
  return mongoUri;
}

function needsRouteBaseFix(routeBase) {
  if (routeBase == null) return false;
  const normalized = String(routeBase).trim();
  return normalized === '/cases' || normalized === 'cases';
}

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = resolveMongoUri();

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

  const docs = await ModuleDefinition.find({
    moduleKey: 'cases',
    appKey: 'helpdesk'
  })
    .select('_id appKey moduleKey organizationId ui')
    .lean();

  if (!docs.length) {
    console.log('No Helpdesk Cases module definitions found.');
    await mongoose.disconnect();
    return;
  }

  let matched = 0;
  let updated = 0;

  for (const doc of docs) {
    const currentRouteBase = doc.ui?.routeBase;
    if (!needsRouteBaseFix(currentRouteBase)) continue;
    matched += 1;

    const scope = doc.organizationId ? `org:${doc.organizationId}` : 'platform';
    console.log(`[${doc._id}] ${scope} routeBase: ${currentRouteBase || '(missing)'} -> ${TARGET_ROUTE_BASE}`);

    if (apply) {
      await ModuleDefinition.updateOne(
        { _id: doc._id },
        {
          $set: {
            'ui.routeBase': TARGET_ROUTE_BASE
          }
        }
      );
      updated += 1;
    }
  }

  console.log('\n' + '='.repeat(48));
  console.log('Migration Summary');
  console.log('='.repeat(48));
  console.log(`Documents scanned: ${docs.length}`);
  console.log(`Documents matched: ${matched}`);
  console.log(`Documents updated: ${updated}`);
  if (!apply && matched > 0) {
    console.log('\nDry-run only. Re-run with --apply to persist changes.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
