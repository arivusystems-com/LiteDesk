/**
 * Migration: Add owner and context fields to all field definitions
 *
 * Adds two new classification fields to every field in module definitions:
 * - owner: 'platform' | 'app' | 'org' (default: 'platform')
 * - context: 'global' | app/capability name (default: 'global')
 *
 * For ALL existing fields, sets safe defaults:
 * - owner = 'platform'
 * - context = 'global'
 *
 * This ensures zero behavior change and no UI regressions.
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

function addOwnershipAndContextToFields(doc) {
  if (!doc || typeof doc !== 'object') return { changed: false, doc };

  let changed = false;

  // Update fields array
  if (Array.isArray(doc.fields)) {
    const updatedFields = doc.fields.map(field => {
      if (!field || typeof field !== 'object') return field;
      
      const needsUpdate = !field.owner || !field.context;
      if (!needsUpdate) return field;

      return {
        ...field,
        owner: field.owner || 'platform',
        context: field.context || 'global'
      };
    });

    // Check if any field was actually updated
    if (JSON.stringify(updatedFields) !== JSON.stringify(doc.fields)) {
      changed = true;
      doc.fields = updatedFields;
    }
  }

  return { changed, doc };
}

async function updateModuleDefinitionsInDb(db, orgId) {
  // collection names vary by environment/history
  const candidates = ['moduledefinitions', 'moduleDefinitions'];
  let totalChanged = 0;
  let totalFieldsUpdated = 0;

  for (const collName of candidates) {
    const exists = await db.listCollections({ name: collName }).hasNext();
    if (!exists) continue;
    const coll = db.collection(collName);

    const query = orgId ? { organizationId: orgId } : {};
    const cursor = coll.find(query);

    // Iterate and update only if needed (idempotent + logs)
    // eslint-disable-next-line no-await-in-loop
    while (await cursor.hasNext()) {
      // eslint-disable-next-line no-await-in-loop
      const doc = await cursor.next();
      const { changed, doc: updated } = addOwnershipAndContextToFields({ ...doc });
      if (!changed) continue;

      // Count how many fields were updated
      const fieldsBefore = doc.fields || [];
      const fieldsAfter = updated.fields || [];
      let fieldsUpdated = 0;
      for (let i = 0; i < Math.max(fieldsBefore.length, fieldsAfter.length); i++) {
        const before = fieldsBefore[i] || {};
        const after = fieldsAfter[i] || {};
        if (before.owner !== after.owner || before.context !== after.context) {
          fieldsUpdated++;
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await coll.updateOne(
        { _id: doc._id },
        {
          $set: {
            fields: updated.fields || []
          }
        }
      );
      totalChanged += 1;
      totalFieldsUpdated += fieldsUpdated;
    }
  }

  return { totalChanged, totalFieldsUpdated };
}

async function run() {
  console.log('🔄 Starting migration: addFieldOwnershipAndContext');
  const { baseUri, mongoQueryString } = await connectMaster();
  console.log('✅ Connected to master DB');

  const orgs = await Organization.find({ isActive: true }).select('_id name database').lean();
  console.log(`📊 Found ${orgs.length} active org(s)`);

  let totalModuleDefsChanged = 0;
  let totalFieldsUpdated = 0;

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

      // Update module definitions in org DB
      // eslint-disable-next-line no-await-in-loop
      const result = await updateModuleDefinitionsInDb(orgConn.db, org._id);
      totalModuleDefsChanged += result.totalChanged;
      totalFieldsUpdated += result.totalFieldsUpdated;
      console.log(`  ✅ moduleDefinitions: changed=${result.totalChanged}, fieldsUpdated=${result.totalFieldsUpdated}`);
    } catch (e) {
      console.error(`  ❌ Failed for org ${org.name}:`, e.message);
    } finally {
      // eslint-disable-next-line no-await-in-loop
      await orgConn.close().catch(() => {});
    }
  }

  // Also update module definitions in master DB (some deployments keep system module defs there)
  try {
    const masterDb = mongoose.connection.db;
    const result = await updateModuleDefinitionsInDb(masterDb, null);
    totalModuleDefsChanged += result.totalChanged;
    totalFieldsUpdated += result.totalFieldsUpdated;
    console.log(`\n✅ master.moduleDefinitions: changed=${result.totalChanged}, fieldsUpdated=${result.totalFieldsUpdated}`);
  } catch (e) {
    console.warn('⚠️  Failed updating module definitions in master DB:', e.message);
  }

  console.log('\n✅ Migration complete');
  console.log(`   moduleDefinitions.changed: ${totalModuleDefsChanged}`);
  console.log(`   fields.updated: ${totalFieldsUpdated}`);

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('❌ Migration failed:', err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});

