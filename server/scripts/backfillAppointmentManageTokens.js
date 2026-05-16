#!/usr/bin/env node
'use strict';

/**
 * Backfill appointment.manageToken for planned bookings missing a token.
 *
 * Usage (from server/):
 *   node scripts/backfillAppointmentManageTokens.js
 *   node scripts/backfillAppointmentManageTokens.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { generateManageToken } = require('../utils/appointmentManageToken');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[backfillAppointmentManageTokens] Connected');

  const filter = {
    'appointment.isAppointment': true,
    status: 'Planned',
    deletedAt: null,
    $or: [
      { 'appointment.manageToken': { $exists: false } },
      { 'appointment.manageToken': null },
      { 'appointment.manageToken': '' }
    ]
  };

  const events = await Event.find(filter).select('_id eventName appointment.manageToken');
  console.log(`[backfillAppointmentManageTokens] Found ${events.length} appointment(s) without manage token`);

  let updated = 0;
  for (const event of events) {
    const token = generateManageToken();
    if (dryRun) {
      console.log(`  [dry-run] ${event._id} → would set manageToken`);
      updated++;
      continue;
    }
    await Event.updateOne(
      { _id: event._id },
      { $set: { 'appointment.manageToken': token } }
    );
    updated++;
  }

  console.log(
    `[backfillAppointmentManageTokens] ${dryRun ? 'Would update' : 'Updated'} ${updated} record(s)`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[backfillAppointmentManageTokens] Fatal:', err);
  process.exit(1);
});
