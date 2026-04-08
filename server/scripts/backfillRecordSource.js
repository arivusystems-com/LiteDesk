#!/usr/bin/env node
/**
 * Backfill `source` on existing records: set missing or invalid values to "Direct"
 * or map legacy free-text to the closest canonical picklist value when obvious.
 *
 * Usage: node server/scripts/backfillRecordSource.js [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { RECORD_SOURCE_VALUES, DEFAULT_RECORD_SOURCE, RECORD_SOURCE_SET } = require('../constants/recordSource');

const People = require('../models/People');
const Deal = require('../models/Deal');
const Task = require('../models/Task');
const Organization = require('../models/Organization');
const Event = require('../models/Event');
const Item = require('../models/Item');
const FormResponse = require('../models/FormResponse');

const LEGACY_MAP = [
  [/web|website|form/i, 'Web Form'],
  [/import|csv/i, 'Import'],
  [/api/i, 'API'],
  [/automation|workflow/i, 'Automation'],
  [/ai\b/i, 'AI'],
  [/email|mail|inbound/i, 'Email'],
  [/phone|call|telephony/i, 'Phone'],
  [/chat/i, 'Chat'],
  [/whatsapp/i, 'WhatsApp'],
  [/facebook/i, 'Facebook'],
  [/linkedin/i, 'LinkedIn'],
  [/referral/i, 'Referral'],
  [/campaign/i, 'Campaign'],
  [/integration|webhook|zapier/i, 'Integration']
];

function inferFromString(s) {
  if (s == null || String(s).trim() === '') return DEFAULT_RECORD_SOURCE;
  const str = String(s);
  if (RECORD_SOURCE_SET.has(str)) return str;
  for (const [re, val] of LEGACY_MAP) {
    if (re.test(str)) return val;
  }
  return DEFAULT_RECORD_SOURCE;
}

async function run() {
  const dry = process.argv.includes('--dry-run');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI/MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(dry ? 'DRY RUN — no writes' : 'Applying writes…');

  const models = [
    { name: 'people', Model: People, query: {} },
    { name: 'deals', Model: Deal, query: {} },
    { name: 'tasks', Model: Task, query: {} },
    { name: 'organizations', Model: Organization, query: { isTenant: false } },
    { name: 'events', Model: Event, query: {} },
    { name: 'items', Model: Item, query: {} },
    { name: 'formresponses', Model: FormResponse, query: {} }
  ];

  let total = 0;
  for (const { name, Model, query } of models) {
    const cursor = Model.find(query).select('_id source').cursor();
    for await (const doc of cursor) {
      const cur = doc.source;
      if (cur != null && RECORD_SOURCE_SET.has(String(cur))) continue;
      const next = inferFromString(cur);
      total++;
      if (!dry) {
        await Model.updateOne({ _id: doc._id }, { $set: { source: next } });
      }
      if (total <= 20) {
        console.log(`[${name}] ${doc._id} "${cur}" → "${next}"`);
      }
    }
  }

  console.log(`Done. ${dry ? 'Would update' : 'Updated'} ~${total} documents (see count above).`);
  await mongoose.connection.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
