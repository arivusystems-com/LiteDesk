#!/usr/bin/env node

/**
 * One-time fix: Remove duplicate "Deleted By" (and other duplicate fields) from Tasks module definitions.
 * Run: node server/scripts/fixTasksModuleDuplicateFields.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');

/** Canonical key: lowercase, trim, strip spaces and hyphens (so "deleted-by", "deletedBy", "Deleted By" all match) */
function fieldKeyCanonical(k) {
  return String(k || '').toLowerCase().trim().replace(/\s+/g, '').replace(/-/g, '');
}

function dedupeFieldsByKey(fields) {
  if (!Array.isArray(fields)) return fields;
  const byCanonical = new Map();
  for (const f of fields) {
    const k = fieldKeyCanonical(f?.key);
    if (!k) continue;
    const existing = byCanonical.get(k);
    if (!existing || ((f.key || '').indexOf(' ') === -1 && (existing.key || '').indexOf(' ') !== -1)) {
      byCanonical.set(k, f);
    }
  }
  return Array.from(byCanonical.values());
}

async function fixTasksModuleFields() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI or MONGO_URI required');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const tasksModules = await ModuleDefinition.find({
      $or: [
        { key: 'tasks' },
        { moduleKey: 'tasks' }
      ]
    }).select('key moduleKey organizationId appKey fields');

    console.log(`Found ${tasksModules.length} Tasks module definition(s)\n`);

    let fixed = 0;
    for (const mod of tasksModules) {
      const fields = mod.fields || [];
      const before = fields.length;
      const deduped = dedupeFieldsByKey(fields);
      const after = deduped.length;

      if (before !== after) {
        // Use updateOne to avoid triggering full document validation (tenant overrides may lack appKey/moduleKey)
        await ModuleDefinition.updateOne({ _id: mod._id }, { $set: { fields: deduped } });
        fixed++;
        const scope = mod.organizationId ? `org ${mod.organizationId}` : 'platform';
        console.log(`✅ Fixed ${scope}: ${before} → ${after} fields (removed ${before - after} duplicate(s))`);
      }
    }

    if (fixed === 0) {
      console.log('No duplicates found. Tasks modules already clean.');
    } else {
      console.log(`\n✅ Fixed ${fixed} module(s)`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixTasksModuleFields();
