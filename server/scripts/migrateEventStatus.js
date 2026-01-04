/**
 * Migration Script: Event Status to System-Controlled
 * 
 * This script migrates existing events to the new system-controlled status model:
 * - Old statuses: PLANNED, STARTED, CHECKED_IN, IN_PROGRESS, PAUSED, CHECKED_OUT, 
 *                SUBMITTED, PENDING_CORRECTIVE, NEEDS_REVIEW, APPROVED, REJECTED, CLOSED
 * - New statuses: Planned, Completed, Cancelled
 * 
 * Migration Rules:
 * 1. Events with status "STARTED", "IN_PROGRESS", "CHECKED_IN", "PAUSED" → "Planned"
 * 2. Events with status "CLOSED", "APPROVED" → "Completed" (if auditState is 'closed')
 * 3. Events with status "REJECTED" → "Planned" (can be retried)
 * 4. Events with status "CHECKED_OUT", "SUBMITTED", "PENDING_CORRECTIVE", "NEEDS_REVIEW" → "Planned"
 * 5. Events with status "PLANNED" → "Planned" (no change, just normalize case)
 * 
 * Preserves:
 * - auditState (for audit events)
 * - check-in / check-out timestamps
 * - execution data
 * - All other event fields
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Load Organization model (for master database)
const Organization = require('../models/Organization');

// We'll create Event models dynamically for each organization's database
// The Event model will be created per-connection using the schema
// For now, we'll use mongoose.model() with the schema from the Event file
// First, let's require the Event model to get access to its schema
const EventModel = require('../models/Event');
// Get the schema from the compiled model
const EventSchema = EventModel.schema;

// Status migration mapping
const statusMigrationMap = {
  // Map to "Planned" (in-progress states)
  'PLANNED': 'Planned',
  'STARTED': 'Planned',
  'CHECKED_IN': 'Planned',
  'IN_PROGRESS': 'Planned',
  'PAUSED': 'Planned',
  'CHECKED_OUT': 'Planned',
  'SUBMITTED': 'Planned',
  'PENDING_CORRECTIVE': 'Planned',
  'NEEDS_REVIEW': 'Planned',
  'REJECTED': 'Planned',
  
  // Map to "Completed" (terminal states)
  'CLOSED': 'Completed',
  'APPROVED': 'Completed',
  
  // Handle case variations
  'planned': 'Planned',
  'Planned': 'Planned',
  'completed': 'Completed',
  'Completed': 'Completed',
  'cancelled': 'Cancelled',
  'Cancelled': 'Cancelled',
  'canceled': 'Cancelled'
};

async function migrateEventStatus() {
  try {
    // Get MongoDB URI (same logic as server.js)
    const isProduction = process.env.NODE_ENV === 'production';
    const MONGO_URI = process.env.MONGODB_URI 
      || process.env.MONGO_URI 
      || (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL);

    if (!MONGO_URI) {
      console.error('❌ Error: MongoDB URI not found in environment variables.');
      console.error('   Set MONGODB_URI, MONGO_URI, MONGO_URI_LOCAL, or MONGO_URI_PRODUCTION in .env file');
      process.exit(1);
    }

    // Extract base URI and connect to master database (same as server.js)
    const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI.split('?');
    const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
    const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
    const masterDbName = 'litedesk_master';
    const masterUri = `${baseUri}/${masterDbName}${mongoQueryString}`;

    console.log('🔄 Connecting to MongoDB master database...');
    console.log(`📊 Database: ${masterDbName}`);
    console.log(`📊 Base URI: ${baseUri.substring(0, 50)}...\n`);
    
    // Connect to master database
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB master database\n');
    
    // Get all organizations
    const organizations = await Organization.find({ isActive: true });
    console.log(`📊 Found ${organizations.length} active organizations\n`);
    
    if (organizations.length === 0) {
      console.log('⚠️  No organizations found. Exiting.');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Quick check: Do we need to migrate at all?
    let needsMigration = false;
    let totalInvalidEvents = 0;
    
    console.log('🔍 Checking if migration is needed...\n');
    
    for (const org of organizations) {
      if (!org.database || !org.database.name) continue;
      
      const orgDbName = org.database.name;
      const orgUri = `${baseUri}/${orgDbName}${mongoQueryString}`;
      
      try {
        const checkConnection = mongoose.createConnection(orgUri);
        await new Promise((resolve, reject) => {
          checkConnection.once('connected', resolve);
          checkConnection.once('error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
        
        const EventCheck = checkConnection.model('Event', EventSchema);
        const invalidCount = await EventCheck.countDocuments({
          status: { $nin: ['Planned', 'Completed', 'Cancelled'] }
        });
        
        if (invalidCount > 0) {
          needsMigration = true;
          totalInvalidEvents += invalidCount;
          console.log(`   ⚠️  ${org.name}: ${invalidCount} events need migration`);
        }
        
        await checkConnection.close();
      } catch (error) {
        // Skip if connection fails - will handle in main loop
      }
    }
    
    if (!needsMigration) {
      console.log('\n✅ No migration needed! All events already have valid statuses.');
      console.log('   Status values are: Planned, Completed, Cancelled\n');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    console.log(`\n📊 Migration required: ${totalInvalidEvents} events across ${organizations.length} organization(s)\n`);
    console.log('🔄 Starting migration...\n');
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const globalStats = {
      toPlanned: 0,
      toCompleted: 0,
      toCancelled: 0,
      alreadyCorrect: 0
    };
    
    // Migrate events for each organization
    for (const org of organizations) {
      if (!org.database || !org.database.name) {
        console.log(`⚠️  Skipping organization "${org.name}" - no database configured`);
        continue;
      }
      
      const orgDbName = org.database.name;
      const orgUri = `${baseUri}/${orgDbName}${mongoQueryString}`;
      
      console.log(`\n🔄 Migrating events for organization: ${org.name}`);
      console.log(`   Database: ${orgDbName}`);
      
      try {
        // Create connection to organization database
        const orgConnection = mongoose.createConnection(orgUri);
        
        // Wait for connection
        await new Promise((resolve, reject) => {
          orgConnection.once('connected', resolve);
          orgConnection.once('error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        });
        
        // Create Event model for this organization's database
        const Event = orgConnection.model('Event', EventSchema);
        
        // First, check if there are any events with invalid statuses
        const invalidStatusEvents = await Event.find({
          status: { $nin: ['Planned', 'Completed', 'Cancelled'] }
        });
        
        if (invalidStatusEvents.length === 0) {
          console.log(`   ✅ All events already have valid statuses - skipping migration`);
          await orgConnection.close();
          continue;
        }
        
        console.log(`   Found ${invalidStatusEvents.length} events with invalid statuses that need migration`);
        
        // Find all events in this organization's database
        const events = await Event.find({});
        console.log(`   Total events: ${events.length}`);
    
        let migrated = 0;
        let skipped = 0;
        let errors = 0;
        const migrationStats = {
          toPlanned: 0,
          toCompleted: 0,
          toCancelled: 0,
          alreadyCorrect: 0
        };
        
        for (const event of events) {
      try {
        const oldStatus = event.status;
        let newStatus = null;
        let needsUpdate = false;
        
        // Check if status needs migration
        if (statusMigrationMap[oldStatus]) {
          newStatus = statusMigrationMap[oldStatus];
          needsUpdate = true;
        } else if (['Planned', 'Completed', 'Cancelled'].includes(oldStatus)) {
          // Already in correct format, just ensure case is correct
          newStatus = oldStatus;
          if (oldStatus !== 'Planned' && oldStatus !== 'Completed' && oldStatus !== 'Cancelled') {
            needsUpdate = true;
          } else {
            migrationStats.alreadyCorrect++;
            skipped++;
            continue;
          }
        } else {
          // Unknown status - default to Planned
          console.warn(`⚠️  Unknown status "${oldStatus}" for event ${event.eventId || event._id}. Setting to "Planned".`);
          newStatus = 'Planned';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          // Special handling: If auditState is 'closed', set status to 'Completed'
          if (event.auditState === 'closed' && newStatus !== 'Cancelled') {
            newStatus = 'Completed';
            if (!event.completedAt) {
              event.completedAt = event.modifiedTime || event.createdTime || new Date();
            }
          }
          
          // Update status
          event.status = newStatus;
          
          // Track migration stats
          if (newStatus === 'Planned') {
            migrationStats.toPlanned++;
          } else if (newStatus === 'Completed') {
            migrationStats.toCompleted++;
            // Ensure completedAt is set
            if (!event.completedAt) {
              event.completedAt = event.modifiedTime || event.createdTime || new Date();
            }
          } else if (newStatus === 'Cancelled') {
            migrationStats.toCancelled++;
          }
          
          // Add audit entry for status change
          if (!event.auditHistory) {
            event.auditHistory = [];
          }
          event.auditHistory.push({
            timestamp: new Date(),
            actorUserId: event.modifiedBy || event.createdBy,
            action: 'status_changed',
            from: oldStatus,
            to: newStatus,
            metadata: {
              reason: 'Migration to system-controlled status',
              migration: true
            }
          });
          
          // Save event
          await event.save();
          migrated++;
          
          if (migrated % 50 === 0) {
            console.log(`     Migrated ${migrated}/${events.length} events...`);
          }
        }
      } catch (error) {
        console.error(`     ❌ Error migrating event ${event.eventId || event._id}:`, error.message);
        errors++;
      }
    }
    
    // Close organization connection
    await orgConnection.close();
    
    // Update global stats
    totalMigrated += migrated;
    totalSkipped += skipped;
    totalErrors += errors;
    globalStats.toPlanned += migrationStats.toPlanned;
    globalStats.toCompleted += migrationStats.toCompleted;
    globalStats.toCancelled += migrationStats.toCancelled;
    globalStats.alreadyCorrect += migrationStats.alreadyCorrect;
    
    console.log(`   ✅ Completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    
    // Verify migration for this organization
    const orgConnectionVerify = mongoose.createConnection(orgUri);
    await new Promise((resolve, reject) => {
      orgConnectionVerify.once('connected', resolve);
      orgConnectionVerify.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
    
    const EventVerify = orgConnectionVerify.model('Event', EventSchema);
    const invalidStatuses = await EventVerify.find({
      status: { $nin: ['Planned', 'Completed', 'Cancelled'] }
    });
    
    if (invalidStatuses.length > 0) {
      console.warn(`   ⚠️  Found ${invalidStatuses.length} events with invalid statuses`);
    } else {
      console.log(`   ✅ All events have valid statuses`);
    }
    
    await orgConnectionVerify.close();
    
    } catch (orgError) {
      console.error(`   ❌ Error processing organization "${org.name}":`, orgError.message);
      totalErrors++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration Complete!');
  console.log('='.repeat(60));
  console.log('\n📊 Global Migration Statistics:');
  console.log(`   Organizations processed: ${organizations.length}`);
  console.log(`   Total migrated: ${totalMigrated}`);
  console.log(`   Total skipped (already correct): ${totalSkipped}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`\n   Status Distribution:`);
  console.log(`   → Planned: ${globalStats.toPlanned}`);
  console.log(`   → Completed: ${globalStats.toCompleted}`);
  console.log(`   → Cancelled: ${globalStats.toCancelled}`);
  console.log(`   → Already correct: ${globalStats.alreadyCorrect}`);
  
  await mongoose.connection.close();
  console.log('\n✅ Migration script completed successfully');
  process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateEventStatus();
}

module.exports = { migrateEventStatus };

