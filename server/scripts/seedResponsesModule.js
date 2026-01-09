#!/usr/bin/env node

/**
 * Phase 0I.1: Seed Responses Module Definition
 * 
 * This script ensures the Responses module is registered in ModuleDefinition.
 * Responses is a first-class execution domain within CRM.
 * 
 * Usage: node scripts/seedResponsesModule.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

// Phase 0I.1: Responses Module Definition
const RESPONSES_MODULE_DEFINITION = {
  moduleKey: 'responses',
  appKey: 'crm',
  label: 'Response',
  pluralLabel: 'Responses',
  entityType: 'TRANSACTION',
  primaryField: 'responseId',
  peopleConstraints: {
    allowedTypes: [],
    required: false
  },
  organizationConstraints: {
    required: false
  },
  lifecycle: {
    statusField: 'executionStatus',
    allowedStatuses: ['Not Started', 'In Progress', 'Submitted'],
    executionDriven: true,
    immutableAfter: 'executionStatus:Submitted'
  },
  supports: {
    ownership: false, // Responses are owned by execution context, not users
    assignment: false,
    comments: true,
    attachments: true,
    automation: false, // Responses themselves are not automated, they trigger automation
    correctiveActions: true,
    approvalFlow: true,
    auditReview: true,
    reporting: true
  },
  permissions: {
    create: true,  // Only through form submission or CRM execution
    edit: false,   // Immutable after submission
    delete: false, // Archive/invalidate only
    view: true,
    execution: true,  // Execution operations
    review: true,     // Review operations
    approve: true     // Approval operations
  },
  ui: {
    routeBase: '/responses',
    icon: 'clipboard-document-check',
    showInSidebar: true,
    sidebarOrder: 6,
    createLabel: 'New Response',
    listLabel: 'All Responses',
    showAsTabUnder: ['forms'] // Show Responses tab under Forms
  }
};

async function seedResponsesModule() {
  try {
    console.log('🚀 Seeding Responses Module Definition...\n');

    // Validate MongoDB URI
    if (!MONGO_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file!');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if module already exists
    const existingModule = await ModuleDefinition.findOne({
      appKey: 'crm',
      moduleKey: 'responses'
    });

    if (existingModule) {
      console.log('📝 Updating existing Responses module definition...');
      await ModuleDefinition.updateOne(
        { appKey: 'crm', moduleKey: 'responses' },
        RESPONSES_MODULE_DEFINITION
      );
      console.log('✅ Updated Responses module definition\n');
    } else {
      console.log('➕ Creating Responses module definition...');
      await ModuleDefinition.create(RESPONSES_MODULE_DEFINITION);
      console.log('✅ Created Responses module definition\n');
    }

    // Verify
    const module = await ModuleDefinition.findOne({
      appKey: 'crm',
      moduleKey: 'responses'
    });

    if (!module) {
      throw new Error('Failed to create/update Responses module definition');
    }

    console.log('✅ Responses module seeded successfully!');
    console.log(`\n📈 Module Details:`);
    console.log(`   - App: ${module.appKey}`);
    console.log(`   - Module: ${module.moduleKey}`);
    console.log(`   - Label: ${module.label}`);
    console.log(`   - Entity Type: ${module.entityType}`);
    console.log(`   - Execution Driven: ${module.lifecycle.executionDriven}`);
    console.log(`   - Supports Corrective Actions: ${module.supports.correctiveActions}`);
    console.log(`   - Supports Approval Flow: ${module.supports.approvalFlow}\n`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding Responses module:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedResponsesModule();
}

module.exports = seedResponsesModule;
