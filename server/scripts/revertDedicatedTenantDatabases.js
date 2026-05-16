#!/usr/bin/env node
'use strict';

/**
 * Undo dedicated per-tenant databases: copy inbox/CRM rows back into arivu_master
 * (when present in the tenant DB), clear organization.database.*, optionally drop tenant DBs.
 *
 * Usage:
 *   node scripts/revertDedicatedTenantDatabases.js
 *   node scripts/revertDedicatedTenantDatabases.js --drop-tenant-dbs
 *   node scripts/revertDedicatedTenantDatabases.js --slug arivu-systems
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const { getMongoUris, connectMasterWithRetry } = require('../lib/mongoConnect');
const Organization = require('../models/Organization');

const COPY_COLLECTIONS = [
  'communications',
  'communicationevents',
  'mailboxes',
  'threadviews',
  'communicationthreadmetas'
];

function parseArgs(argv) {
  const args = { dropTenantDbs: false, slug: '' };
  for (const arg of argv) {
    if (arg === '--drop-tenant-dbs') args.dropTenantDbs = true;
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length);
    else if (arg === '--slug') args.slug = argv[argv.indexOf(arg) + 1];
  }
  return args;
}

async function copyCollection(masterDb, tenantDb, collName, orgId) {
  const tenantColl = tenantDb.collection(collName);
  const masterColl = masterDb.collection(collName);
  const docs = await tenantColl.find({ organizationId: orgId }).toArray();
  if (!docs.length) return { copied: 0 };
  let copied = 0;
  for (const doc of docs) {
    await masterColl.replaceOne({ _id: doc._id }, doc, { upsert: true });
    copied += 1;
  }
  return { copied };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const { masterUri } = getMongoUris();
  await connectMasterWithRetry(masterUri);
  console.log(`Connected to master: ${masterUri}\n`);

  const filter = {
    'database.name': { $exists: true, $nin: [null, ''] },
    'database.initialized': true
  };
  if (args.slug) filter.slug = String(args.slug).trim().toLowerCase();

  const orgs = await Organization.find(filter).select('_id name slug database').lean();
  if (!orgs.length) {
    console.log('No organizations with dedicated tenant databases found.');
    await mongoose.connection.close();
    return;
  }

  const masterDb = mongoose.connection.db;
  let adminClient;

  for (const org of orgs) {
    const dbName = org.database.name;
    const orgId = new mongoose.Types.ObjectId(String(org._id));
    console.log(`\n=== ${org.name} → master only (was ${dbName}) ===`);

    const tenantConn = mongoose.connection.useDb(dbName, { useCache: true });
    const tenantDb = tenantConn.db;

    for (const coll of COPY_COLLECTIONS) {
      const { copied } = await copyCollection(masterDb, tenantDb, coll, orgId);
      if (copied) console.log(`  ✅ ${coll}: copied ${copied} to master`);
    }

    await Organization.updateOne(
      { _id: org._id },
      {
        $unset: {
          'database.name': '',
          'database.connectionString': '',
          'database.createdAt': ''
        },
        $set: { 'database.initialized': false }
      }
    );
    console.log('  ✅ Cleared organization.database (uses arivu_master again)');

    if (args.dropTenantDbs) {
      if (!adminClient) {
        const { baseUri, mongoQueryString } = getMongoUris();
        adminClient = new MongoClient(`${baseUri}/admin${mongoQueryString}`);
        await adminClient.connect();
      }
      await adminClient.db(dbName).dropDatabase();
      console.log(`  🗑  Dropped database: ${dbName}`);
    }
  }

  if (adminClient) await adminClient.close();
  await mongoose.connection.close();
  console.log('\nDone. Restart the server.');
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
