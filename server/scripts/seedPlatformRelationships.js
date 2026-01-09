#!/usr/bin/env node

/**
 * Seed Platform Relationship Definitions
 * 
 * This script seeds the platform-level metadata for relationships between modules.
 * This is PLATFORM metadata, not tenant data.
 * 
 * Run this once when setting up the platform or after schema changes.
 * 
 * Usage: node scripts/seedPlatformRelationships.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const RelationshipDefinition = require('../models/RelationshipDefinition');
const { validateRelationship } = require('../utils/relationshipRegistry');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

// Platform Relationship Definitions
// Minimal foundational relationships - easy to extend
const RELATIONSHIP_DEFINITIONS = [
  // Sales → Deals ↔ Projects → Projects
  {
    relationshipKey: 'sales.deals-to-projects.projects',
    source: {
      appKey: 'sales',
      moduleKey: 'deals'
    },
    target: {
      appKey: 'projects',
      moduleKey: 'projects'
    },
    cardinality: 'ONE_TO_MANY',
    ownership: 'SOURCE',
    required: false,
    cascade: {
      onDelete: 'DETACH'
    },
    ui: {
      source: {
        showAs: 'TAB',
        label: 'Related Projects'
      },
      target: {
        showAs: 'TAB',
        label: 'Related Deals'
      },
      picker: {
        enabled: true,
        searchable: true
      }
    },
    automation: {
      allowed: true
    },
    enabled: true
  },
  
  // Audit → Audits ↔ Helpdesk → Cases
  {
    relationshipKey: 'audit.audits-to-helpdesk.cases',
    source: {
      appKey: 'audit',
      moduleKey: 'audits'
    },
    target: {
      appKey: 'helpdesk',
      moduleKey: 'cases'
    },
    cardinality: 'ONE_TO_MANY',
    ownership: 'SOURCE',
    required: false,
    cascade: {
      onDelete: 'DETACH'
    },
    ui: {
      source: {
        showAs: 'TAB',
        label: 'Related Cases'
      },
      target: {
        showAs: 'TAB',
        label: 'Related Audits'
      },
      picker: {
        enabled: true,
        searchable: true
      }
    },
    automation: {
      allowed: true
    },
    enabled: true
  },
  
  // Phase 0I.1: CRM Form to Response Relationship
  {
    relationshipKey: 'crm.form_to_response',
    source: {
      appKey: 'crm',
      moduleKey: 'forms'
    },
    target: {
      appKey: 'crm',
      moduleKey: 'responses'
    },
    cardinality: 'ONE_TO_MANY',
    ownership: 'SOURCE',
    required: false,
    cascade: {
      onDelete: 'DETACH'
    },
    ui: {
      source: {
        showAs: 'TAB',
        label: 'Responses'
      },
      target: {
        showAs: 'NONE',
        label: 'Form'
      },
      picker: {
        enabled: false
      }
    },
    automation: {
      allowed: false
    },
    enabled: true
  },
  
  // Phase 0I.1: CRM Event to Response Relationship
  {
    relationshipKey: 'crm.event_to_response',
    source: {
      appKey: 'crm',
      moduleKey: 'events'
    },
    target: {
      appKey: 'crm',
      moduleKey: 'responses'
    },
    cardinality: 'ONE_TO_MANY',
    ownership: 'SOURCE',
    required: false,
    cascade: {
      onDelete: 'DETACH'
    },
    ui: {
      source: {
        showAs: 'TAB',
        label: 'Responses'
      },
      target: {
        showAs: 'NONE',
        label: 'Event'
      },
      picker: {
        enabled: false
      }
    },
    automation: {
      allowed: false
    },
    enabled: true
  },
  
  // Phase 0I.1: Response to Corrective Actions (embedded relationship)
  // Note: Corrective actions are embedded in FormResponse.correctiveActions array
  // This relationship definition is for metadata/registry purposes only
  {
    relationshipKey: 'crm.response_to_corrective_actions',
    source: {
      appKey: 'crm',
      moduleKey: 'responses'
    },
    target: {
      appKey: 'crm',
      moduleKey: 'corrective_actions'
    },
    cardinality: 'ONE_TO_MANY',
    ownership: 'SOURCE',
    required: false,
    cascade: {
      onDelete: 'CASCADE'
    },
    ui: {
      source: {
        showAs: 'TAB',
        label: 'Corrective Actions'
      },
      target: {
        showAs: 'NONE',
        label: 'Response'
      },
      picker: {
        enabled: false
      }
    },
    automation: {
      allowed: false
    },
    enabled: true
  }
];

async function seedPlatformRelationships() {
  try {
    console.log('🚀 Seeding Platform Relationship Definitions...\n');

    // Validate MongoDB URI
    if (!MONGO_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file!');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Seed Relationships
    console.log('📦 Seeding Relationship Definitions...');
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;
    let relationshipsSkipped = 0;

    for (const relData of RELATIONSHIP_DEFINITIONS) {
      // Validate relationship before creating/updating
      const validation = await validateRelationship(relData);
      
      if (!validation.valid) {
        console.log(`  ⚠️  Skipping ${relData.relationshipKey} - Validation errors:`);
        validation.errors.forEach(err => console.log(`     - ${err}`));
        relationshipsSkipped++;
        continue;
      }

      const existingRel = await RelationshipDefinition.findOne({
        relationshipKey: relData.relationshipKey
      });

      if (existingRel) {
        // Re-validate with exclude key for updates
        const updateValidation = await validateRelationship(relData, relData.relationshipKey);
        if (!updateValidation.valid) {
          console.log(`  ⚠️  Skipping update for ${relData.relationshipKey} - Validation errors:`);
          updateValidation.errors.forEach(err => console.log(`     - ${err}`));
          relationshipsSkipped++;
          continue;
        }

        await RelationshipDefinition.updateOne(
          { relationshipKey: relData.relationshipKey },
          relData
        );
        relationshipsUpdated++;
        console.log(`  ✅ Updated relationship: ${relData.relationshipKey}`);
      } else {
        await RelationshipDefinition.create(relData);
        relationshipsCreated++;
        console.log(`  ✅ Created relationship: ${relData.relationshipKey}`);
      }
    }

    console.log(`\n📊 Relationships: ${relationshipsCreated} created, ${relationshipsUpdated} updated, ${relationshipsSkipped} skipped\n`);

    // Summary
    console.log('✅ Platform relationships seeded successfully!');
    console.log(`\n📈 Summary:`);
    console.log(`   - Created: ${relationshipsCreated}`);
    console.log(`   - Updated: ${relationshipsUpdated}`);
    console.log(`   - Skipped: ${relationshipsSkipped}`);
    console.log(`   - Total: ${relationshipsCreated + relationshipsUpdated + relationshipsSkipped}\n`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding platform relationships:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedPlatformRelationships();
}

module.exports = seedPlatformRelationships;

