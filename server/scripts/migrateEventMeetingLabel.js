#!/usr/bin/env node

/**
 * One-time migration: Event Type label rename
 *
 * Renames persisted Event.eventType values:
 *   "Meeting / Appointment" -> "Meeting"
 *
 * Default mode is DRY-RUN (no writes).
 * Persist changes with:
 *   node scripts/migrateEventMeetingLabel.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const EventModel = require('../models/Event');

const LEGACY_LABEL = 'Meeting / Appointment';
const NEW_LABEL = 'Meeting';

function resolveMasterUri() {
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

  const [mongoUriWithoutQuery, mongoUriQueryPart] = mongoUri.split('?');
  const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
  const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
  const masterDbName = 'litedesk_master';

  return {
    masterUri: `${baseUri}/${masterDbName}${mongoQueryString}`,
    baseUri,
    mongoQueryString,
  };
}

async function migrateConnectionEventLabel(conn, label, apply) {
  const Event = conn.models.Event || conn.model('Event', EventModel.schema);
  const filter = { eventType: LEGACY_LABEL };
  const matchCount = await Event.countDocuments(filter);

  if (matchCount === 0) {
    console.log(`  [${label}] no legacy records`);
    return { matched: 0, modified: 0 };
  }

  console.log(`  [${label}] matched ${matchCount} record(s)`);

  if (!apply) {
    return { matched: matchCount, modified: 0 };
  }

  const result = await Event.updateMany(filter, {
    $set: {
      eventType: NEW_LABEL,
      modifiedTime: new Date(),
    },
  });

  console.log(`  [${label}] updated ${result.modifiedCount} record(s)`);
  return { matched: matchCount, modified: result.modifiedCount };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { masterUri, baseUri, mongoQueryString } = resolveMasterUri();

  console.log(`Mode: ${apply ? 'APPLY (writes)' : 'DRY-RUN'}\n`);
  await mongoose.connect(masterUri);
  console.log(`Connected to master: ${mongoose.connection.name}\n`);

  let totalMatched = 0;
  let totalModified = 0;
  let failedDbs = 0;

  // Process master DB first.
  console.log('Master DB:');
  {
    const stats = await migrateConnectionEventLabel(mongoose.connection, 'master', apply);
    totalMatched += stats.matched;
    totalModified += stats.modified;
  }

  // Process each tenant DB listed in Organization.database.name.
  const orgs = await Organization.find({
    'database.name': { $exists: true, $nin: [null, ''] },
  })
    .select('name database')
    .lean();

  const uniqueDbNames = Array.from(new Set(orgs.map((org) => org.database?.name).filter(Boolean)));

  console.log(`\nTenant DBs to scan: ${uniqueDbNames.length}\n`);

  for (const dbName of uniqueDbNames) {
    const orgUri = `${baseUri}/${dbName}${mongoQueryString}`;
    const orgConn = mongoose.createConnection(orgUri);
    try {
      await orgConn.asPromise();
      console.log(`DB "${dbName}":`);
      const stats = await migrateConnectionEventLabel(orgConn, dbName, apply);
      totalMatched += stats.matched;
      totalModified += stats.modified;
    } catch (error) {
      failedDbs += 1;
      console.error(`  [${dbName}] error: ${error.message}`);
    } finally {
      await orgConn.close().catch(() => {});
    }
  }

  console.log('\n' + '='.repeat(56));
  console.log('Migration Summary');
  console.log('='.repeat(56));
  console.log(`Matched legacy records: ${totalMatched}`);
  console.log(`Modified records:       ${totalModified}`);
  console.log(`Failed databases:       ${failedDbs}`);
  console.log(`Target rename:          "${LEGACY_LABEL}" -> "${NEW_LABEL}"`);
  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to persist changes.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
