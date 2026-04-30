/**
 * Migration: add task_home_summary_idx to existing organization databases.
 *
 * The Home dashboard task summary queries by organization, assignee,
 * deletedAt, dueDate ranges, and active status. Production disables
 * Mongoose autoIndex, so this migration creates the matching index
 * explicitly for existing tenant databases.
 *
 * Idempotent: safe to re-run.
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Organization = require('../models/Organization');
const { getMongoUris } = require('../lib/mongoConnect');

const TASK_HOME_SUMMARY_INDEX = {
  organizationId: 1,
  assignedTo: 1,
  deletedAt: 1,
  dueDate: 1,
  status: 1
};

const TASK_HOME_SUMMARY_INDEX_OPTIONS = {
  name: 'task_home_summary_idx'
};

async function createTaskIndex(db, label) {
  const exists = await db.listCollections({ name: 'tasks' }).hasNext();
  if (!exists) {
    console.log(`- ${label}: skipped, tasks collection does not exist`);
    return false;
  }

  await db.collection('tasks').createIndex(
    TASK_HOME_SUMMARY_INDEX,
    TASK_HOME_SUMMARY_INDEX_OPTIONS
  );
  console.log(`- ${label}: ensured task_home_summary_idx`);
  return true;
}

async function run() {
  const { masterUri, baseUri, mongoQueryString } = getMongoUris();

  console.log('Starting migration: addTaskHomeSummaryIndex');
  await mongoose.connect(masterUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000
  });
  console.log(`Connected to master DB: ${mongoose.connection.name}`);

  let ensuredCount = 0;

  if (await createTaskIndex(mongoose.connection.db, 'master')) {
    ensuredCount += 1;
  }

  const orgs = await Organization.find({ isActive: true })
    .select('_id name database')
    .lean();

  for (const org of orgs) {
    const dbName = org?.database?.name;
    const label = `${org?.name || org._id} (${dbName || 'no database'})`;

    if (!dbName) {
      console.log(`- ${label}: skipped, no database configured`);
      continue;
    }

    const orgConn = mongoose.createConnection(`${baseUri}/${dbName}${mongoQueryString}`, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000
    });

    try {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve, reject) => {
        orgConn.once('connected', resolve);
        orgConn.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      // eslint-disable-next-line no-await-in-loop
      if (await createTaskIndex(orgConn.db, label)) {
        ensuredCount += 1;
      }
    } catch (error) {
      console.error(`- ${label}: failed: ${error.message}`);
    } finally {
      // eslint-disable-next-line no-await-in-loop
      await orgConn.close().catch(() => {});
    }
  }

  console.log(`Done. Ensured index in ${ensuredCount} database(s).`);
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error('Migration failed:', error);
  try {
    await mongoose.connection.close();
  } catch (_) {
    // Ignore close errors during failure handling.
  }
  process.exit(1);
});
