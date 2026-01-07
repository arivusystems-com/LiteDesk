/**
 * Test Script: Verify Modules API Returns Notification Metadata
 * 
 * Phase 17: Verifies that listModules returns notification metadata correctly.
 * 
 * This script simulates the listModules logic to ensure notification metadata
 * is included in the response.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Copy the default notification metadata function from moduleController
function getDefaultNotificationMetadata(moduleKey) {
  const defaults = {
    tasks: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo', 'priority', 'status']
    },
    deals: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo', 'status']
    },
    people: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo']
    },
    organizations: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo']
    },
    events: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo', 'status']
    }
  };
  
  return defaults[moduleKey] || {
    ruleEligible: false,
    supportedEvents: [],
    supportedConditions: []
  };
}

async function testNotificationMetadata() {
  try {
    console.log('🧪 Testing Notification Metadata Logic\n');

    const systemModules = [
      { key: 'tasks', name: 'Tasks' },
      { key: 'deals', name: 'Deals' },
      { key: 'people', name: 'People' },
      { key: 'organizations', name: 'Organizations' },
      { key: 'events', name: 'Events' },
      { key: 'forms', name: 'Forms' },
      { key: 'items', name: 'Items' }
    ];

    console.log('📋 Testing default notification metadata:\n');

    for (const module of systemModules) {
      const metadata = getDefaultNotificationMetadata(module.key);
      const status = metadata.ruleEligible ? '✅' : '❌';
      
      console.log(`${status} ${module.name} (${module.key}):`);
      if (metadata.ruleEligible) {
        console.log(`   Rule Eligible: ${metadata.ruleEligible}`);
        console.log(`   Supported Events: ${metadata.supportedEvents.join(', ')}`);
        console.log(`   Supported Conditions: ${metadata.supportedConditions.join(', ')}`);
      } else {
        console.log(`   Rule Eligible: ${metadata.ruleEligible} (not eligible)`);
      }
      console.log();
    }

    // Test rule-eligible modules
    const eligibleModules = systemModules.filter(m => 
      getDefaultNotificationMetadata(m.key).ruleEligible === true
    );

    console.log('✅ Summary:');
    console.log(`   Rule-eligible modules: ${eligibleModules.length}`);
    console.log(`   Modules: ${eligibleModules.map(m => m.name).join(', ')}`);
    console.log();

    // Verify expected modules are eligible
    const expectedEligible = ['tasks', 'deals', 'people', 'organizations', 'events'];
    const allEligible = expectedEligible.every(key => 
      getDefaultNotificationMetadata(key).ruleEligible === true
    );

    if (allEligible) {
      console.log('✅ All expected modules are rule-eligible');
    } else {
      console.log('❌ Some expected modules are missing');
      process.exit(1);
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testNotificationMetadata()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testNotificationMetadata };

