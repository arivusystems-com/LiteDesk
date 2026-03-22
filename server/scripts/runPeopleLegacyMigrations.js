#!/usr/bin/env node

/**
 * People legacy field migration (all databases)
 *
 * 1) Master DB: AutomationRule — people.type.changed → people.sales_type.changed (+ condition keys).
 * 2) Master DB + each tenant org DB: People — copy top-level type/lead_status/contact_status into
 *    participations.SALES when missing; then $unset legacy top-level fields.
 *
 * Default is DRY-RUN. Persist with: node server/scripts/runPeopleLegacyMigrations.js --apply
 *
 * Prerequisite: Mongo URI in server/.env (MONGODB_URI or MONGO_URI, etc.).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const AutomationRule = require('../models/AutomationRule');
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
  return { masterUri: `${baseUri}/${masterDbName}${mongoQueryString}`, baseUri, mongoQueryString };
}

function migrateAutomationCondition(cond) {
  if (!cond || typeof cond !== 'object' || Array.isArray(cond)) return cond || null;
  const next = {};
  for (const [k, v] of Object.entries(cond)) {
    let nk = k;
    if (k === 'currentState.type') nk = 'currentState.sales_type';
    else if (k === 'previousState.type') nk = 'previousState.sales_type';
    next[nk] = v;
  }
  return next;
}

async function runAutomationMigration(apply) {
  const cursor = AutomationRule.find({ 'trigger.eventType': 'people.type.changed' }).cursor();
  let examined = 0;
  let updated = 0;
  for await (const doc of cursor) {
    examined++;
    const newCondition = migrateAutomationCondition(doc.trigger?.condition);
    const newTrigger = {
      ...doc.trigger,
      eventType: 'people.sales_type.changed',
      condition: newCondition,
    };
    console.log(
      `[AutomationRule ${doc._id}] ${doc.name}: eventType → people.sales_type.changed`,
      JSON.stringify(newTrigger.condition)
    );
    if (apply) {
      await AutomationRule.updateOne({ _id: doc._id }, { $set: { trigger: newTrigger } });
      updated++;
    }
  }
  console.log(`Automation rules: matched ${examined}, ${apply ? `updated ${updated}` : 'dry-run (no writes)'}\n`);
}

const LEGACY_UNSET = { type: '', lead_status: '', contact_status: '' };
const LEGACY_INDEX_NAMES = [
  'organizationId_1_type_1',
  'organizationId_1_lead_status_1',
  'organizationId_1_contact_status_1',
];

/** Documents with legacy type but no participations.SALES yet */
function participationMigrateFilter() {
  return {
    type: { $exists: true, $nin: [null, ''] },
    'participations.SALES': { $exists: false },
  };
}

async function migrateParticipations(collection, label, apply) {
  const filter = participationMigrateFilter();
  const count = await collection.countDocuments(filter);
  console.log(`  [${label}] participations backfill candidates: ${count}`);
  if (!apply || count === 0) return { migrated: 0, examined: count };

  const cursor = collection.find(filter);
  let migrated = 0;
  for await (const doc of cursor) {
    if (doc.participations?.SALES) continue;
    const role = doc.type ?? null;
    const lead_status = doc.lead_status ?? null;
    const contact_status = doc.contact_status ?? null;
    const participations = setSalesParticipationIn(doc.participations || {}, {
      role,
      lead_status,
      contact_status,
    });
    await collection.updateOne({ _id: doc._id }, { $set: { participations } });
    migrated++;
    if (migrated % 200 === 0) console.log(`    ... ${migrated} migrated`);
  }
  console.log(`  [${label}] participations backfill applied: ${migrated}`);
  return { migrated, examined: count };
}

async function unsetLegacyFields(collection, label, apply) {
  const legacyPresent = {
    $or: [
      { type: { $exists: true } },
      { lead_status: { $exists: true } },
      { contact_status: { $exists: true } },
    ],
  };
  const count = await collection.countDocuments(legacyPresent);
  console.log(`  [${label}] documents with legacy top-level type/lead_status/contact_status: ${count}`);
  if (!apply) return { modified: 0 };

  const result = await collection.updateMany({}, { $unset: LEGACY_UNSET });
  console.log(`  [${label}] $unset modified: ${result.modifiedCount}`);

  const indexes = await collection.indexes();
  for (const name of LEGACY_INDEX_NAMES) {
    if (indexes.some((idx) => idx.name === name)) {
      await collection.dropIndex(name).catch((e) => console.warn(`    Could not drop index ${name}:`, e.message));
      console.log(`  [${label}] dropped index: ${name}`);
    }
  }
  return { modified: result.modifiedCount };
}

async function processPeopleDatabase(conn, label, apply) {
  const PeopleModel = conn.models.People || conn.model('People', People.schema);
  const collection = PeopleModel.collection;
  await migrateParticipations(collection, label, apply);
  await unsetLegacyFields(collection, label, apply);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { masterUri, baseUri, mongoQueryString } = resolveMasterUri();

  console.log(`Mode: ${apply ? 'APPLY (writes)' : 'DRY-RUN'}\n`);
  await mongoose.connect(masterUri);
  console.log(`Connected to master: ${mongoose.connection.name}\n`);

  await runAutomationMigration(apply);

  console.log('People collections (master + tenant DBs):\n');
  await processPeopleDatabase(mongoose.connection, 'master', apply);

  const orgs = await Organization.find({
    'database.name': { $exists: true, $nin: [null, ''] },
  })
    .select('name database')
    .lean();

  console.log(`\nTenant org databases (by Organization.database.name): ${orgs.length}\n`);

  for (const org of orgs) {
    const dbName = org.database?.name;
    if (!dbName) continue;
    if (org.database?.initialized === false) {
      console.log(`  (note) Org "${org.name}" database not marked initialized — still processing ${dbName}`);
    }
    const orgUri = `${baseUri}/${dbName}${mongoQueryString}`;
    const orgConn = mongoose.createConnection(orgUri);
    await orgConn.asPromise();
    try {
      console.log(`Org "${org.name}" (${dbName}):`);
      await processPeopleDatabase(orgConn, dbName, apply);
    } catch (e) {
      console.error(`  Error on ${dbName}:`, e.message);
    } finally {
      await orgConn.close();
    }
  }

  console.log('\nDone.');
  if (!apply) {
    console.log('Re-run with --apply to persist changes.');
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
