#!/usr/bin/env node

/**
 * Seed Platform App & Module Definitions
 * 
 * This script seeds the platform-level metadata for apps and modules.
 * This is PLATFORM metadata, not tenant data.
 * 
 * Run this once when setting up the platform or after schema changes.
 * 
 * Usage: node scripts/seedPlatformDefinitions.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');

// Support both MONGODB_URI and MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

// Platform App Definitions
const APP_DEFINITIONS = [
  {
    appKey: 'sales',
    name: 'Sales',
    description: 'Sales CRM application for managing leads, contacts, deals, and sales pipeline',
    icon: 'sales',
    category: 'BUSINESS',
    owner: 'PLATFORM',
    enabled: true,
    order: 1,
    capabilities: {
      usesPeople: true,
      usesOrganization: true,
      usesTransactions: true,
      usesAutomation: true
    },
    settingsSchema: null
  },
  {
    appKey: 'helpdesk',
    name: 'Helpdesk',
    description: 'Customer support and helpdesk application for managing tickets and cases',
    icon: 'helpdesk',
    category: 'BUSINESS',
    owner: 'PLATFORM',
    enabled: true,
    order: 2,
    capabilities: {
      usesPeople: true,
      usesOrganization: false,
      usesTransactions: true,
      usesAutomation: true
    },
    settingsSchema: null
  },
  {
    appKey: 'projects',
    name: 'Projects',
    description: 'Project management application for managing projects, tasks, and milestones',
    icon: 'projects',
    category: 'BUSINESS',
    owner: 'PLATFORM',
    enabled: true,
    order: 3,
    capabilities: {
      usesPeople: false,
      usesOrganization: false,
      usesTransactions: false,
      usesAutomation: true
    },
    settingsSchema: null
  },
  {
    appKey: 'audit',
    name: 'Audit',
    description: 'Audit management application for managing audit visits, findings, and corrective actions',
    icon: 'audit',
    category: 'BUSINESS',
    owner: 'PLATFORM',
    enabled: true,
    order: 4,
    capabilities: {
      usesPeople: false,
      usesOrganization: true,
      usesTransactions: false,
      usesAutomation: true
    },
    settingsSchema: null
  }
];

// Platform Module Definitions
const MODULE_DEFINITIONS = [
  // ===== SALES APP MODULES =====
  {
    moduleKey: 'people',
    appKey: 'sales',
    label: 'Person',
    pluralLabel: 'People',
    entityType: 'CORE',
    primaryField: 'name',
    peopleConstraints: {
      allowedTypes: ['Lead', 'Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Lead', 'Contact']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'contacts',
    appKey: 'sales',
    label: 'Contact',
    pluralLabel: 'Contacts',
    entityType: 'CORE',
    primaryField: 'name',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: null,
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'deals',
    appKey: 'sales',
    label: 'Deal',
    pluralLabel: 'Deals',
    entityType: 'TRANSACTION',
    primaryField: 'name',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'stage',
      allowedStatuses: ['Qualification', 'Proposal', 'Negotiation', 'Contract Sent', 'Closed Won', 'Closed Lost', 'Lead', 'Qualified']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'tasks',
    appKey: 'sales',
    label: 'Task',
    pluralLabel: 'Tasks',
    entityType: 'ACTIVITY',
    primaryField: 'title',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Not Started', 'In Progress', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: true,
      view: true
    }
  },
  {
    moduleKey: 'events',
    appKey: 'sales',
    label: 'Meeting',
    pluralLabel: 'Meetings',
    entityType: 'ACTIVITY',
    primaryField: 'eventName',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Planned', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: true,
      view: true
    }
  },

  // ===== HELPDESK APP MODULES =====
  {
    moduleKey: 'people',
    appKey: 'helpdesk',
    label: 'Contact',
    pluralLabel: 'Contacts',
    entityType: 'CORE',
    primaryField: 'name',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: null,
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'cases',
    appKey: 'helpdesk',
    label: 'Ticket',
    pluralLabel: 'Tickets',
    entityType: 'TRANSACTION',
    primaryField: 'subject',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: true
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['New', 'Open', 'In Progress', 'Resolved', 'Closed']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'tasks',
    appKey: 'helpdesk',
    label: 'Case Task',
    pluralLabel: 'Case Tasks',
    entityType: 'ACTIVITY',
    primaryField: 'title',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Not Started', 'In Progress', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: true,
      view: true
    }
  },
  {
    moduleKey: 'events',
    appKey: 'helpdesk',
    label: 'Site Visit',
    pluralLabel: 'Site Visits',
    entityType: 'ACTIVITY',
    primaryField: 'eventName',
    peopleConstraints: {
      allowedTypes: ['Contact'],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Planned', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: true,
      view: true
    }
  },

  // ===== PROJECTS APP MODULES =====
  {
    moduleKey: 'projects',
    appKey: 'projects',
    label: 'Project',
    pluralLabel: 'Projects',
    entityType: 'CORE',
    primaryField: 'name',
    peopleConstraints: {
      allowedTypes: [],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'tasks',
    appKey: 'projects',
    label: 'Project Task',
    pluralLabel: 'Project Tasks',
    entityType: 'ACTIVITY',
    primaryField: 'title',
    peopleConstraints: {
      allowedTypes: [],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Not Started', 'In Progress', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: true,
      view: true
    }
  },
  {
    moduleKey: 'events',
    appKey: 'projects',
    label: 'Milestone',
    pluralLabel: 'Milestones',
    entityType: 'ACTIVITY',
    primaryField: 'eventName',
    peopleConstraints: {
      allowedTypes: [],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Planned', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: true,
      view: true
    }
  },

  // ===== AUDIT APP MODULES =====
  {
    moduleKey: 'audits',
    appKey: 'audit',
    label: 'Audit Visit',
    pluralLabel: 'Audit Visits',
    entityType: 'CORE',
    primaryField: 'eventName',
    peopleConstraints: {
      allowedTypes: [],
      required: false
    },
    organizationConstraints: {
      required: true
    },
    lifecycle: {
      statusField: 'auditState',
      allowedStatuses: ['Ready to start', 'checked_in', 'submitted', 'pending_corrective', 'needs_review', 'approved', 'rejected', 'closed']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'cases',
    appKey: 'audit',
    label: 'Finding',
    pluralLabel: 'Findings',
    entityType: 'TRANSACTION',
    primaryField: 'subject',
    peopleConstraints: {
      allowedTypes: [],
      required: false
    },
    organizationConstraints: {
      required: true
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['New', 'Open', 'In Progress', 'Resolved', 'Closed']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: false,
      view: true
    }
  },
  {
    moduleKey: 'tasks',
    appKey: 'audit',
    label: 'Corrective Action',
    pluralLabel: 'Corrective Actions',
    entityType: 'ACTIVITY',
    primaryField: 'title',
    peopleConstraints: {
      allowedTypes: [],
      required: false
    },
    organizationConstraints: {
      required: false
    },
    lifecycle: {
      statusField: 'status',
      allowedStatuses: ['Not Started', 'In Progress', 'Completed', 'Cancelled']
    },
    supports: {
      ownership: true,
      assignment: true,
      comments: true,
      attachments: true,
      automation: true
    },
    permissions: {
      create: true,
      edit: true,
      delete: true,
      view: true
    }
  }
];

async function seedPlatformDefinitions() {
  try {
    console.log('🚀 Seeding Platform App & Module Definitions...\n');

    // Validate MongoDB URI
    if (!MONGO_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file!');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Seed Apps
    console.log('📦 Seeding App Definitions...');
    let appsCreated = 0;
    let appsUpdated = 0;

    for (const appData of APP_DEFINITIONS) {
      const existingApp = await AppDefinition.findOne({ appKey: appData.appKey });
      
      if (existingApp) {
        await AppDefinition.updateOne({ appKey: appData.appKey }, appData);
        appsUpdated++;
        console.log(`  ✅ Updated app: ${appData.appKey}`);
      } else {
        await AppDefinition.create(appData);
        appsCreated++;
        console.log(`  ✅ Created app: ${appData.appKey}`);
      }
    }

    console.log(`\n📊 Apps: ${appsCreated} created, ${appsUpdated} updated\n`);

    // Seed Modules
    console.log('📦 Seeding Module Definitions...');
    let modulesCreated = 0;
    let modulesUpdated = 0;

    for (const moduleData of MODULE_DEFINITIONS) {
      const existingModule = await ModuleDefinition.findOne({
        appKey: moduleData.appKey,
        moduleKey: moduleData.moduleKey
      });
      
      if (existingModule) {
        await ModuleDefinition.updateOne(
          { appKey: moduleData.appKey, moduleKey: moduleData.moduleKey },
          moduleData
        );
        modulesUpdated++;
        console.log(`  ✅ Updated module: ${moduleData.appKey}.${moduleData.moduleKey}`);
      } else {
        await ModuleDefinition.create(moduleData);
        modulesCreated++;
        console.log(`  ✅ Created module: ${moduleData.appKey}.${moduleData.moduleKey}`);
      }
    }

    console.log(`\n📊 Modules: ${modulesCreated} created, ${modulesUpdated} updated\n`);

    // Summary
    console.log('✅ Platform definitions seeded successfully!');
    console.log(`\n📈 Summary:`);
    console.log(`   - Apps: ${appsCreated + appsUpdated} total`);
    console.log(`   - Modules: ${modulesCreated + modulesUpdated} total\n`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding platform definitions:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedPlatformDefinitions();
}

module.exports = seedPlatformDefinitions;

