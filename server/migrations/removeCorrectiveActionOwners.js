/**
 * Migration: Remove legacy correctiveActionOwners from Events and module definitions
 *
 * - Unsets `correctiveActionOwners` from all Event documents
 * - Removes `correctiveActionOwners` field config from Events module definitions
 * - Removes references from quickCreate + quickCreateLayout
 *
 * Idempotent: safe to re-run.
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Organization = require('../models/Organization');

async function connectMaster() {
  const isProduction = process.env.NODE_ENV === 'production';
  const MONGO_URI = process.env.MONGODB_URI
    || process.env.MONGO_URI
    || (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL);

  if (!MONGO_URI) {
    throw new Error('MongoDB URI not found. Set MONGODB_URI, MONGO_URI, MONGO_URI_LOCAL, or MONGO_URI_PRODUCTION in .env');
  }

  const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI.split('?');
  const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
  const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
  const masterDbName = 'litedesk_master';
  const masterUri = `${baseUri}/${masterDbName}${mongoQueryString}`;

  await mongoose.connect(masterUri);
  return { baseUri, mongoQueryString };
}

function normalizeKey(key) {
  return String(key || '').toLowerCase();
}

function removeLegacyFromModuleDefDoc(doc) {
  if (!doc || typeof doc !== 'object') return { changed: false, doc };

  let changed = false;

  // Remove field config
  if (Array.isArray(doc.fields)) {
    const before = doc.fields.length;
    doc.fields = doc.fields.filter(f => normalizeKey(f?.key) !== 'correctiveactionowners');
    if (doc.fields.length !== before) changed = true;
  }

  // Remove quickCreate entries (case-insensitive)
  if (Array.isArray(doc.quickCreate)) {
    const before = doc.quickCreate.length;
    doc.quickCreate = doc.quickCreate.filter(k => normalizeKey(k) !== 'correctiveactionowners');
    if (doc.quickCreate.length !== before) changed = true;
  }

  // Remove from quickCreateLayout rows/cols
  if (doc.quickCreateLayout && Array.isArray(doc.quickCreateLayout.rows)) {
    const rowsBefore = JSON.stringify(doc.quickCreateLayout.rows);
    doc.quickCreateLayout.rows = doc.quickCreateLayout.rows
      .map(r => {
        if (!r || !Array.isArray(r.cols)) return r;
        return {
          ...r,
          cols: r.cols.filter(c => normalizeKey(c?.fieldKey) !== 'correctiveactionowners')
        };
      })
      .filter(r => !r || !Array.isArray(r.cols) || r.cols.length > 0);
    if (JSON.stringify(doc.quickCreateLayout.rows) !== rowsBefore) changed = true;
  }

  return { changed, doc };
}

async function cleanupModuleDefinitionsInDb(db, orgId) {
  // collection names vary by environment/history
  const candidates = ['moduledefinitions', 'moduleDefinitions'];
  let totalChanged = 0;

  for (const collName of candidates) {
    const exists = await db.listCollections({ name: collName }).hasNext();
    if (!exists) continue;
    const coll = db.collection(collName);

    const cursor = coll.find({
      key: 'events',
      ...(orgId ? { organizationId: orgId } : {})
    });

    // Iterate and update only if needed (idempotent + logs)
    // eslint-disable-next-line no-await-in-loop
    while (await cursor.hasNext()) {
      // eslint-disable-next-line no-await-in-loop
      const doc = await cursor.next();
      const { changed, doc: updated } = removeLegacyFromModuleDefDoc({ ...doc });
      if (!changed) continue;

      // eslint-disable-next-line no-await-in-loop
      await coll.updateOne(
        { _id: doc._id },
        {
          $set: {
            fields: updated.fields || [],
            quickCreate: updated.quickCreate || [],
            quickCreateLayout: updated.quickCreateLayout || { version: 1, rows: [] }
          }
        }
      );
      totalChanged += 1;
    }
  }

  return totalChanged;
}

async function cleanupEventsInOrgDb(orgConnection) {
  const db = orgConnection.db;
  const eventsExists = await db.listCollections({ name: 'events' }).hasNext();
  if (!eventsExists) return { matched: 0, modified: 0 };

  const res = await db.collection('events').updateMany(
    { correctiveActionOwners: { $exists: true } },
    { $unset: { correctiveActionOwners: '' } }
  );

  return {
    matched: res.matchedCount || res.n || 0,
    modified: res.modifiedCount || res.nModified || 0
  };
}

async function run() {
  console.log('🔄 Starting migration: removeCorrectiveActionOwners');
  const { baseUri, mongoQueryString } = await connectMaster();
  console.log('✅ Connected to master DB');

  const orgs = await Organization.find({ isActive: true }).select('_id name database').lean();
  console.log(`📊 Found ${orgs.length} active org(s)`);

  let totalEventsModified = 0;
  let totalModuleDefsChanged = 0;

  for (const org of orgs) {
    const dbName = org?.database?.name;
    if (!dbName) {
      console.log(`⚠️  Skipping org "${org?.name || org._id}" (no database configured)`);
      continue;
    }

    const orgUri = `${baseUri}/${dbName}${mongoQueryString}`;
    console.log(`\n🔧 Org: ${org.name} (${dbName})`);

    const orgConn = mongoose.createConnection(orgUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000
    });

    try {
      // Wait for connection
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve, reject) => {
        orgConn.once('connected', resolve);
        orgConn.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      // 1) Unset field from events
      // eslint-disable-next-line no-await-in-loop
      const evRes = await cleanupEventsInOrgDb(orgConn);
      totalEventsModified += evRes.modified;
      console.log(`  🧹 events: matched=${evRes.matched}, modified=${evRes.modified}`);

      // 2) Remove field/config from module definitions in org DB
      // eslint-disable-next-line no-await-in-loop
      const mdChanged = await cleanupModuleDefinitionsInDb(orgConn.db, org._id);
      totalModuleDefsChanged += mdChanged;
      console.log(`  🧹 moduleDefinitions: changed=${mdChanged}`);
    } catch (e) {
      console.error(`  ❌ Failed for org ${org.name}:`, e.message);
    } finally {
      // eslint-disable-next-line no-await-in-loop
      await orgConn.close().catch(() => {});
    }
  }

  // Also clean module definitions in master DB (some deployments keep system module defs there)
  try {
    const masterDb = mongoose.connection.db;
    const mdChangedMaster = await cleanupModuleDefinitionsInDb(masterDb, null);
    totalModuleDefsChanged += mdChangedMaster;
    console.log(`\n🧹 master.moduleDefinitions: changed=${mdChangedMaster}`);
  } catch (e) {
    console.warn('⚠️  Failed cleaning module definitions in master DB:', e.message);
  }

  console.log('\n✅ Migration complete');
  console.log(`   events.modified: ${totalEventsModified}`);
  console.log(`   moduleDefinitions.changed: ${totalModuleDefsChanged}`);

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('❌ Migration failed:', err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});


