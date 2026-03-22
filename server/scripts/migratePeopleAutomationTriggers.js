#!/usr/bin/env node

/**
 * Migrate AutomationRule documents from people.type.changed → people.sales_type.changed
 * and condition keys currentState.type / previousState.type → *.sales_type.
 *
 * Usage:
 *   node server/scripts/migratePeopleAutomationTriggers.js           # dry-run
 *   node server/scripts/migratePeopleAutomationTriggers.js --apply   # write
 *
 * Prefer: `npm run migrate:people-legacy` / `migrate:people-legacy:apply` (master + all tenant People DBs + automation).
 *
 * Run --apply before deploying code that drops `people.type.changed` from the automation allowlist.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const AutomationRule = require('../models/AutomationRule');

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
  return MONGO_URI;
}

/**
 * @param {Record<string, unknown>|null|undefined} cond
 * @returns {Record<string, unknown>|null}
 */
function migrateCondition(cond) {
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

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = resolveMasterUri();
  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

  const cursor = AutomationRule.find({
    'trigger.eventType': 'people.type.changed',
  }).cursor();

  let examined = 0;
  let wouldUpdate = 0;

  for await (const doc of cursor) {
    examined++;
    const newCondition = migrateCondition(doc.trigger?.condition);
    const newTrigger = {
      ...doc.trigger,
      eventType: 'people.sales_type.changed',
      condition: newCondition,
    };
    wouldUpdate++;
    console.log(
      `[${doc._id}] ${doc.name}: eventType → people.sales_type.changed; condition:`,
      JSON.stringify(newTrigger.condition)
    );
    if (apply) {
      await AutomationRule.updateOne(
        { _id: doc._id },
        { $set: { trigger: newTrigger } }
      );
    }
  }

  console.log(`\nDone. Rules matched: ${examined}, ${apply ? 'updated' : 'would update'}: ${wouldUpdate}`);
  if (!apply && examined > 0) {
    console.log('Re-run with --apply to persist.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
