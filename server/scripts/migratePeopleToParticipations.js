#!/usr/bin/env node

/**
 * ============================================================================
 * Migration: People → Participations
 * ============================================================================
 *
 * Migrates legacy top-level type/lead_status/contact_status into
 * person.participations.SALES for all people with type set but no SALES
 * participation.
 *
 * Logic:
 *   For each person: if (person.type && !person.participations?.SALES) {
 *     person.participations.SALES = { role, lead_status, contact_status };
 *   }
 *
 * Constraints:
 *   - Idempotent: skips when participations.SALES already exists
 *   - No data loss: only adds to participations, does not remove legacy fields
 *
 * Usage (legacy): this script only touched `litedesk_master`. Prefer:
 *   npm run migrate:people-legacy              # dry-run all DBs
 *   npm run migrate:people-legacy:apply      # apply
 *
 * Or: node server/scripts/migratePeopleToParticipations.js
 *
 * Run once in staging, then once in production.
 *
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const People = require('../models/People');
const { setSalesParticipationIn } = require('../utils/syncSalesParticipation');

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
  console.log(
    `Connected to ${mongoose.connection.name}. Migrating people with type but no participations.SALES...\n`
  );

  const cursor = People.collection.find({
    type: { $exists: true, $nin: [null, ''] },
    'participations.SALES': { $exists: false },
  });

  let migrated = 0;
  let processed = 0;

  for await (const doc of cursor) {
    processed++;
    // Idempotent: skip if participations.SALES already exists (safety check)
    if (doc.participations?.SALES) continue;

    const role = doc.type ?? null;
    const lead_status = doc.lead_status ?? null;
    const contact_status = doc.contact_status ?? null;

    const participations = setSalesParticipationIn(doc.participations || {}, {
      role,
      lead_status,
      contact_status
    });

    await People.collection.updateOne(
      { _id: doc._id },
      { $set: { participations } }
    );
    migrated++;
    if (migrated % 100 === 0) {
      console.log(`  ... ${migrated} people migrated`);
    }
  }

  console.log(`\nDone. Migrated: ${migrated} | Processed: ${processed}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
