#!/usr/bin/env node

/**
 * ============================================================================
 * Migration: Remove Legacy People Fields (type, lead_status, contact_status)
 * ============================================================================
 *
 * PREREQUISITE: Run migratePeopleToParticipations.js FIRST and verify all data
 * is correctly in participations.SALES. Test thoroughly before running this.
 *
 * This script $unsets the legacy top-level fields from all people documents:
 *   - type
 *   - lead_status
 *   - contact_status
 *
 * After this migration, the People schema no longer defines these fields.
 * Participations.SALES is the sole source of truth.
 *
 * Usage:
 *   node server/scripts/removeLegacyPeopleFields.js
 *
 * Prefer (all tenant DBs + master + automation):
 *   npm run migrate:people-legacy
 *   npm run migrate:people-legacy:apply
 *
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const People = require('../models/People');

function resolveMasterUri() {
  const isProduction = process.env.NODE_ENV === 'production';
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL) ||
    process.env.MONGO_URI_ATLAS;
  if (!MONGO_URI) {
    console.error(
      'Missing Mongo URI. Set MONGODB_URI or MONGO_URI in server/.env (or MONGO_URI_LOCAL / MONGO_URI_ATLAS).'
    );
    process.exit(1);
  }
  const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI.split('?');
  const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
  const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
  const masterDbName = 'litedesk_master';
  return `${baseUri}/${masterDbName}${mongoQueryString}`;
}

async function main() {
  const uri = resolveMasterUri();
  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}.\n`);
  console.log('Removing legacy top-level fields (type, lead_status, contact_status)...\n');

  const result = await People.collection.updateMany(
    {},
    { $unset: { type: '', lead_status: '', contact_status: '' } }
  );

  console.log(`Unset fields: ${result.modifiedCount} documents`);

  // Drop legacy indexes (ignore errors if they don't exist)
  const indexes = await People.collection.indexes();
  const legacyIndexNames = ['organizationId_1_type_1', 'organizationId_1_lead_status_1', 'organizationId_1_contact_status_1'];
  for (const name of legacyIndexNames) {
    if (indexes.some((idx) => idx.name === name)) {
      await People.collection.dropIndex(name).catch((e) => console.warn(`Could not drop index ${name}:`, e.message));
      console.log(`Dropped index: ${name}`);
    }
  }

  console.log(`\nDone.`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
