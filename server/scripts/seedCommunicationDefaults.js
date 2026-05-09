#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const { ensureDefaultCommunicationSettingsForOrganization } = require('../services/communicationDefaultsSeeder');

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
  if (!mongoUri) {
    console.error('MONGODB_URI/MONGO_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  try {
    const tenants = await Organization.find({ isTenant: true }).select('_id name').lean();
    let seeded = 0;
    for (const tenant of tenants) {
      await ensureDefaultCommunicationSettingsForOrganization(tenant._id);
      seeded += 1;
      console.log(`✅ Seeded communication defaults for tenant: ${tenant.name} (${tenant._id})`);
    }
    console.log(`\nDone. Seeded ${seeded} tenant organizations.`);
  } finally {
    await mongoose.connection.close();
  }
}

run().catch(async (error) => {
  console.error('Failed to seed communication defaults:', error);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
