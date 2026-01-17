/**
 * ============================================================================
 * Phase 0H: Control Plane App Seed Script
 * ============================================================================
 * 
 * This script creates the Control Plane app and migrates existing internal
 * modules (demo-requests, instances) into it WITHOUT rewriting business logic.
 * 
 * Key Principles:
 * - Discover existing implementations
 * - Migrate them under CONTROL_PLANE app context
 * - Preserve data, APIs, and UI behavior
 * - Only refactor ownership, access, and visibility
 * 
 * ============================================================================
 */

const mongoose = require('mongoose');
const path = require('path');
// Load .env from server directory (one level up from scripts)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');
const RelationshipDefinition = require('../models/RelationshipDefinition');

const CONTROL_PLANE_APP_KEY = 'control_plane';

/**
 * Check if user email is a LiteDesk internal email
 */
function isLiteDeskInternalEmail(email) {
    if (!email) return false;
    const internalDomains = [
        'litedesk.com',
        'litedesk.io',
        '@litedesk' // Allow any @litedesk domain
    ];
    const emailLower = email.toLowerCase();
    return internalDomains.some(domain => emailLower.includes(domain));
}

/**
 * Create Control Plane AppDefinition
 */
async function createControlPlaneApp() {
    console.log('📦 Creating Control Plane AppDefinition...');
    
    const appData = {
        appKey: CONTROL_PLANE_APP_KEY,
        name: 'Control Plane',
        description: 'LiteDesk internal platform operations',
        category: 'SYSTEM',
        owner: 'PLATFORM',
        enabled: true,
        order: -1, // Show first in system apps
        
        ui: {
            showInAppSwitcher: false,
            sidebarOrder: -1,
            icon: 'ShieldCheckIcon',
            defaultRoute: '/control'
        },
        
        capabilities: {
            usesPeople: false,
            usesOrganization: false,
            usesTransactions: false,
            usesAutomation: false
        }
    };
    
    const existing = await AppDefinition.findOne({ appKey: CONTROL_PLANE_APP_KEY });
    if (existing) {
        console.log('✅ Control Plane AppDefinition already exists, updating...');
        await AppDefinition.updateOne({ appKey: CONTROL_PLANE_APP_KEY }, appData);
        return existing;
    } else {
        const app = await AppDefinition.create(appData);
        console.log('✅ Control Plane AppDefinition created:', app._id);
        return app;
    }
}

/**
 * Create Demo Requests ModuleDefinition
 */
async function createDemoRequestsModule() {
    console.log('📦 Creating Demo Requests ModuleDefinition...');
    
    const moduleData = {
        appKey: CONTROL_PLANE_APP_KEY,
        moduleKey: 'demo_requests',
        label: 'Demo Request',
        pluralLabel: 'Demo Requests',
        entityType: 'CORE',
        primaryField: 'email',
        
        lifecycle: {
            statusField: 'status',
            allowedStatuses: ['pending', 'contacted', 'demo_scheduled', 'demo_completed', 'converted', 'rejected'],
            customizable: false
        },
        
        supports: {
            ownership: true,
            assignment: true,
            comments: true,
            attachments: false,
            automation: false // Control Plane modules cannot be automated
        },
        
        permissions: {
            create: true,
            edit: true,
            delete: true,
            view: true
        },
        
        ui: {
            routeBase: '/control/demo-requests',
            icon: 'DocumentTextIcon',
            showInSidebar: true,
            sidebarOrder: 1,
            createLabel: 'Create Demo Request',
            listLabel: 'All Demo Requests'
        }
    };
    
    const existing = await ModuleDefinition.findOne({
        appKey: CONTROL_PLANE_APP_KEY,
        moduleKey: 'demo_requests'
    });
    
    if (existing) {
        console.log('✅ Demo Requests ModuleDefinition already exists, updating...');
        await ModuleDefinition.updateOne(
            { appKey: CONTROL_PLANE_APP_KEY, moduleKey: 'demo_requests' },
            moduleData
        );
        return existing;
    } else {
        const module = await ModuleDefinition.create(moduleData);
        console.log('✅ Demo Requests ModuleDefinition created:', module._id);
        return module;
    }
}

/**
 * Create Instances ModuleDefinition
 */
async function createInstancesModule() {
    console.log('📦 Creating Instances ModuleDefinition...');
    
    const moduleData = {
        appKey: CONTROL_PLANE_APP_KEY,
        moduleKey: 'instances',
        label: 'Instance',
        pluralLabel: 'Instances',
        entityType: 'CORE',
        primaryField: 'instanceName',
        
        lifecycle: {
            statusField: 'status',
            allowedStatuses: ['provisioning', 'active', 'suspended', 'failed', 'terminated'],
            customizable: false
        },
        
        supports: {
            ownership: true,
            assignment: false,
            comments: true,
            attachments: false,
            automation: false // Control Plane modules cannot be automated
        },
        
        permissions: {
            create: true,
            edit: true,
            delete: true,
            view: true
        },
        
        ui: {
            routeBase: '/control/instances',
            icon: 'ServerIcon',
            showInSidebar: true,
            sidebarOrder: 2,
            createLabel: 'Create Instance',
            listLabel: 'All Instances'
        }
    };
    
    const existing = await ModuleDefinition.findOne({
        appKey: CONTROL_PLANE_APP_KEY,
        moduleKey: 'instances'
    });
    
    if (existing) {
        console.log('✅ Instances ModuleDefinition already exists, updating...');
        await ModuleDefinition.updateOne(
            { appKey: CONTROL_PLANE_APP_KEY, moduleKey: 'instances' },
            moduleData
        );
        return existing;
    } else {
        const module = await ModuleDefinition.create(moduleData);
        console.log('✅ Instances ModuleDefinition created:', module._id);
        return module;
    }
}

/**
 * Create Relationship between Demo Requests and Instances
 */
async function createDemoToInstanceRelationship() {
    console.log('📦 Creating Demo → Instance Relationship...');
    
    const relationshipData = {
        relationshipKey: 'control.demo_to_instance',
        source: {
            appKey: CONTROL_PLANE_APP_KEY,
            moduleKey: 'demo_requests'
        },
        target: {
            appKey: CONTROL_PLANE_APP_KEY,
            moduleKey: 'instances'
        },
        cardinality: 'ONE_TO_ONE',
        ownership: 'SOURCE',
        required: false,
        cascade: {
            onDelete: 'NONE' // Prevent instance deletion if demo request exists (handled by business logic)
        },
        automation: {
            allowed: false // Control Plane relationships cannot be automated
        },
        enabled: true,
        ui: {
            source: {
                showAs: 'TAB',
                label: 'Instance'
            },
            target: {
                showAs: 'TAB',
                label: 'Demo Request'
            },
            picker: {
                enabled: true,
                searchable: true
            }
        }
    };
    
    const existing = await RelationshipDefinition.findOne({
        relationshipKey: 'control.demo_to_instance'
    });
    
    if (existing) {
        console.log('✅ Demo → Instance Relationship already exists, updating...');
        await RelationshipDefinition.updateOne(
            { relationshipKey: 'control.demo_to_instance' },
            relationshipData
        );
        return existing;
    } else {
        const relationship = await RelationshipDefinition.create(relationshipData);
        console.log('✅ Demo → Instance Relationship created:', relationship._id);
        return relationship;
    }
}

/**
 * Main seed function
 */
async function seedControlPlane() {
    try {
        console.log('🚀 Starting Control Plane seed...');
        
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/litedesk';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        
        // Create AppDefinition
        await createControlPlaneApp();
        
        // Create ModuleDefinitions
        await createDemoRequestsModule();
        await createInstancesModule();
        
        // Create Relationship
        await createDemoToInstanceRelationship();
        
        console.log('✅ Control Plane seed completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log('  - Control Plane AppDefinition created');
        console.log('  - Demo Requests ModuleDefinition created');
        console.log('  - Instances ModuleDefinition created');
        console.log('  - Demo → Instance Relationship created');
        console.log('');
        console.log('⚠️  Next Steps:');
        console.log('  1. Update accessResolutionService to enforce platform admin access');
        console.log('  2. Update uiCompositionService to exclude CONTROL_PLANE from tenant apps');
        console.log('  3. Add Process Designer guardrails');
        console.log('  4. Verify existing routes work under /control namespace');
        
    } catch (error) {
        console.error('❌ Error seeding Control Plane:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    seedControlPlane()
        .then(() => {
            console.log('✅ Seed script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seed script failed:', error);
            process.exit(1);
        });
}

module.exports = {
    seedControlPlane,
    createControlPlaneApp,
    createDemoRequestsModule,
    createInstancesModule,
    createDemoToInstanceRelationship,
    isLiteDeskInternalEmail
};

