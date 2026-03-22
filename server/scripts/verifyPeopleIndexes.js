#!/usr/bin/env node

/**
 * ============================================================================
 * Verify People Indexes
 * ============================================================================
 *
 * After restart/deploy, verifies that people collection has the expected
 * indexes for participations.SALES queries.
 *
 * Expected indexes (among others):
 *   - organizationId_1_participations.SALES.role_1
 *   - organizationId_1_participations.SALES.lead_status_1
 *   - organizationId_1_participations.SALES.contact_status_1
 *
 * Usage:
 *   node server/scripts/verifyPeopleIndexes.js
 *
 * For multi-tenant: Run against each tenant database, or ensure
 * databaseConnectionManager.createOrganizationIndexes runs on org DB init.
 *
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const People = require('../models/People');
const {
  PEOPLE_SALES_ROLE_PATH,
  PEOPLE_SALES_LEAD_STATUS_PATH,
  PEOPLE_SALES_CONTACT_STATUS_PATH,
} = require('../utils/peopleFieldRegistry');

const REQUIRED_INDEX_KEYS = [
  ['organizationId', PEOPLE_SALES_ROLE_PATH],
  ['organizationId', PEOPLE_SALES_LEAD_STATUS_PATH],
  ['organizationId', PEOPLE_SALES_CONTACT_STATUS_PATH],
];

function indexMatches(index, keys) {
  const keyObj = index.key || index;
  const keyList = Object.keys(keyObj);
  if (keyList.length !== keys.length) return false;
  return keys.every((k, i) => keyList[i] === k);
}

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (process.env.NODE_ENV === 'production' ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL) ||
    process.env.MONGO_URI_ATLAS;

  if (!uri) {
    console.error('Missing Mongo URI. Set MONGODB_URI or MONGO_URI in server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}\n`);
  console.log('People collection indexes:\n');

  const indexes = await People.collection.indexes();

  for (const idx of indexes) {
    console.log(`  ${idx.name}:`, JSON.stringify(idx.key));
  }

  console.log('\n--- Verification ---\n');
  let allOk = true;
  for (const keys of REQUIRED_INDEX_KEYS) {
    const found = indexes.some(idx => indexMatches(idx, keys));
    const status = found ? '✓' : '✗ MISSING';
    if (!found) allOk = false;
    console.log(`  ${status}: ${keys.join(' + ')}`);
  }

  if (!allOk) {
    console.log('\n⚠️  Some indexes are missing. Ensure databaseConnectionManager.createOrganizationIndexes');
    console.log('   runs when org DBs are initialized, or run migrations against each tenant DB.');
    process.exit(1);
  }
  console.log('\n✅ All required participations.SALES indexes present.');
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
