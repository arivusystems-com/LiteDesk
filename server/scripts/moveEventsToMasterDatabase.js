/**
 * Script to move events from 'arivu' database to 'arivu_master' database
 * This fixes the issue where events were created in the wrong database
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Get MongoDB URI
const isProduction = process.env.NODE_ENV === 'production';
const MONGO_URI = process.env.MONGODB_URI 
  || process.env.MONGO_URI 
  || (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL)
  || process.env.MONGO_URI_ATLAS;

if (!MONGO_URI) {
  console.error('❌ Error: MongoDB URI not found in environment variables.');
  process.exit(1);
}

// Extract base URI
const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI.split('?');
const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');

const sourceDbName = 'arivu';
const targetDbName = 'arivu_master';

async function moveEvents() {
  const client = new MongoClient(`${baseUri}${mongoQueryString}`);
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const sourceDb = client.db(sourceDbName);
    const targetDb = client.db(targetDbName);

    // Check if events collection exists in source
    const sourceCollections = await sourceDb.listCollections({ name: 'events' }).toArray();
    if (sourceCollections.length === 0) {
      console.log(`ℹ️  No events collection found in '${sourceDbName}' database. Nothing to move.`);
      return;
    }

    // Get events from source database
    const events = await sourceDb.collection('events').find({}).toArray();
    console.log(`📊 Found ${events.length} events in '${sourceDbName}' database`);

    if (events.length === 0) {
      console.log('ℹ️  No events to move.');
      return;
    }

    // Check if events already exist in target database
    const existingEvents = await targetDb.collection('events').find({}).toArray();
    console.log(`📊 Found ${existingEvents.length} events in '${targetDbName}' database`);

    if (existingEvents.length > 0) {
      console.log('⚠️  Warning: Events already exist in target database.');
      console.log('   This script will add events from source database.');
      console.log('   If there are duplicates, they will be inserted as new documents.');
    }

    // Insert events into target database
    let moved = 0;
    let skipped = 0;
    let errors = 0;

    for (const event of events) {
      try {
        // Check if event already exists (by _id)
        const exists = await targetDb.collection('events').findOne({ _id: event._id });
        if (exists) {
          console.log(`  ⏭️  Skipped (already exists): ${event.eventName || event.title || event._id}`);
          skipped++;
          continue;
        }

        // Insert into target database
        await targetDb.collection('events').insertOne(event);
        moved++;
        console.log(`  ✅ Moved: ${event.eventName || event.title || event._id}`);
      } catch (error) {
        errors++;
        console.error(`  ❌ Error moving event ${event._id}:`, error.message);
      }
    }

    console.log('\n📊 Move Summary:');
    console.log(`  ✅ Moved: ${moved}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📝 Total: ${events.length}`);

    if (moved > 0) {
      console.log(`\n⚠️  Note: Events have been copied to '${targetDbName}' database.`);
      console.log(`   You may want to delete them from '${sourceDbName}' database after verifying.`);
      console.log(`   To delete: db.getSiblingDB('${sourceDbName}').events.drop()`);
    }

    console.log('\n✅ Move complete!');
  } catch (error) {
    console.error('❌ Move failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  moveEvents()
    .then(() => {
      console.log('✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { moveEvents };

