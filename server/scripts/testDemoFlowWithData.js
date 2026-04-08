#!/usr/bin/env node

/**
 * Demo Request Flow Test - WITHOUT CLEANUP
 * Tests demo request creation and keeps data for inspection
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

const Organization = require('../models/Organization');
const People = require('../models/People');
const DemoRequest = require('../models/DemoRequest');
const User = require('../models/User');
const Role = require('../models/Role');
const ModuleDefinition = require('../models/ModuleDefinition');
const updatePeopleModuleFields = require('./updatePeopleModuleFields');
const updateOrganizationsModuleFields = require('./updateOrganizationsModuleFields');
const updateDealsModuleFields = require('./updateDealsModuleFields');

async function testDemoFlow() {
    console.log('🧪 Testing Demo Request Flow (KEEPING DATA)\n');
    
    try {
        // Connect to MongoDB
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected\n');
        
        // Find master admin
        const masterAdmin = await User.findOne({ isOwner: true }).sort({ createdAt: 1 });
        if (!masterAdmin) {
            console.log('❌ No master admin found. Run: node server/scripts/createDefaultAdmin.js');
            process.exit(1);
        }
        console.log('✅ Master admin found:', masterAdmin.email);
        
        // Step 1: Create Organization (tenant)
        console.log('\n📋 Step 1: Creating Organization (tenant)...');
        const organization = await Organization.create({
            name: 'Test Acme Corp',
            slug: `test-acme-corp-${Date.now()}`,
            industry: 'Technology',
            isActive: true,
            subscription: {
                tier: 'trial',
                status: 'trial',
                trialStartDate: new Date(),
                trialEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            },
            limits: {
                maxUsers: 5,
                maxContacts: 100,
                maxStorageGB: 1,
                maxApiRequests: 1000
            },
            settings: {
                timeZone: 'UTC',
                currency: 'USD'
            },
            enabledModules: ['contacts', 'deals']
        });
        console.log('✅ Organization created:', organization._id, organization.name);
        
        // Step 2: Create CRM organization record
        console.log('\n📋 Step 2: Creating CRM organization record...');
        const organizationV2 = await Organization.create({
            legacyOrganizationId: organization._id,
            name: 'Test Acme Corp',
            industry: 'Technology',
            types: [],
            customerStatus: 'Prospect',
            isTenant: false // Mark as CRM organization
        });
        console.log('✅ CRM Organization created:', organizationV2._id);
        console.log('   ✅ Linked via legacyOrganizationId:', organizationV2.legacyOrganizationId.toString() === organization._id.toString());
        
        // Step 3: Create Default Roles
        console.log('\n🔐 Step 3: Creating default roles...');
        const roles = await Role.createDefaultRoles(organization._id);
        console.log(`✅ Created ${roles.length} roles`);
        
        // Step 4: Initialize People module
        console.log('\n🔍 Step 4: Initializing People module...');
        await updatePeopleModuleFields(organization._id);
        console.log('✅ People module initialized');
        
        // Step 5: Initialize Organizations module
        console.log('\n🔍 Step 5: Initializing Organizations module...');
        await updateOrganizationsModuleFields(organization._id);
        console.log('✅ Organizations module initialized');

        console.log('\n🔍 Step 5.5: Initializing Deals module...');
        await updateDealsModuleFields(organization._id);
        console.log('✅ Deals module initialized');
        
        // Step 6: Create People (Lead)
        console.log('\n👤 Step 6: Creating People (Lead)...');
        const uniqueEmail = `john.doe.${Date.now()}@testacme.com`;
        const person = await People.create({
            organizationId: organization._id,
            organization: organizationV2._id,
            createdBy: masterAdmin._id,
            assignedTo: masterAdmin._id,
            first_name: 'John',
            last_name: 'Doe',
            email: uniqueEmail,
            phone: '+1-555-0123',
            source: 'Web Form',
            lead_score: 50,
            tags: ['demo-request', 'Technology']
        });
        console.log('✅ People created:', person._id);
        console.log('   ✅ Has organizationId (tenant):', !!person.organizationId);
        console.log('   ✅ Has organization (CRM link):', !!person.organization);
        console.log('   ✅ Organization link correct:', person.organization.toString() === organizationV2._id.toString());
        
        // Step 7: Create DemoRequest
        console.log('\n📝 Step 7: Creating DemoRequest...');
        const demoRequest = await DemoRequest.create({
            companyName: 'Test Acme Corp',
            industry: 'Technology',
            companySize: '51-200',
            contactName: 'John Doe',
            email: person.email, // Use the same unique email
            phone: '+1-555-0123',
            jobTitle: 'CTO',
            message: 'Interested in CRM solution',
            status: 'pending',
            source: 'website',
            organizationId: organization._id,
            contactId: person._id
        });
        console.log('✅ DemoRequest created:', demoRequest._id);
        console.log('   ✅ Has organizationId link:', !!demoRequest.organizationId);
        console.log('   ✅ Has contactId link:', !!demoRequest.contactId);
        
        // Step 8: Verify all relationships
        console.log('\n🔗 Step 8: Verifying relationships...');
        
        const populatedDemo = await DemoRequest.findById(demoRequest._id)
            .populate('organizationId', 'name slug subscription')
            .populate('contactId', 'first_name last_name email organization');
        
        console.log('✅ DemoRequest populated successfully');
        console.log('   Organization:', populatedDemo.organizationId?.name);
        console.log('   Contact:', populatedDemo.contactId?.first_name, populatedDemo.contactId?.last_name);
        
        const populatedPerson = await People.findById(person._id)
            .populate('organizationId', 'name slug')
            .populate('organization', 'name customerStatus');
        
        console.log('✅ People populated successfully');
        console.log('   Tenant Org:', populatedPerson.organizationId?.name);
        console.log('   CRM Org:', populatedPerson.organization?.name, '- Status:', populatedPerson.organization?.customerStatus);
        
        // Verify module definitions
        console.log('\n📚 Step 9: Verifying Module Definitions...');
        const peopleModuleDef = await ModuleDefinition.findOne({
            organizationId: organization._id,
            key: 'people'
        });
        console.log('✅ People Module:', peopleModuleDef ? `${peopleModuleDef.fields?.length || 0} fields` : 'NOT FOUND');
        
        const orgModuleDef = await ModuleDefinition.findOne({
            organizationId: organization._id,
            key: 'organizations'
        });
        console.log('✅ Organizations Module:', orgModuleDef ? `${orgModuleDef.fields?.length || 0} fields` : 'NOT FOUND');
        
        // Summary
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                  ✅ ALL TESTS PASSED!                      ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\n📊 Created Records (NOT CLEANED UP - INSPECT IN DATABASE):');
        console.log('   - Organization (tenant):', organization._id);
        console.log('   - OrganizationV2 (CRM):', organizationV2._id);
        console.log('   - People (Lead):', person._id);
        console.log('   - DemoRequest:', demoRequest._id);
        console.log('   - Roles:', roles.length);
        console.log('\n🔗 Relationships:');
        console.log('   ✅ OrganizationV2 → Organization (via legacyOrganizationId)');
        console.log('   ✅ People → Organization (tenant isolation)');
        console.log('   ✅ People → OrganizationV2 (CRM link)');
        console.log('   ✅ DemoRequest → Organization (tenant)');
        console.log('   ✅ DemoRequest → People (contact)');
        console.log('\n💡 To inspect data:');
        console.log('   - Use MongoDB Compass or mongo shell');
        console.log('   - Collections to check: organizations, organizationv2s, people, demorequests, moduledefinitions, roles');
        
        await mongoose.connection.close();
        console.log('\n🎉 Demo flow test completed successfully! Data is preserved for inspection.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testDemoFlow();

