/**
 * Test script to debug notification rule evaluation
 * Run: node server/scripts/testNotificationRule.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const NotificationRule = require('../models/NotificationRule');
const Task = require('../models/Task');
const { evaluateRules } = require('../services/notificationRuleEngine');
const domainEvents = require('../constants/domainEvents');

async function testRule() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/litedesk';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    // Get the first rule for testing
    const rule = await NotificationRule.findOne({ enabled: true });
    
    if (!rule) {
      console.log('❌ No enabled rules found. Please create a rule first.');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Found rule:');
    console.log('   ID:', rule._id);
    console.log('   User ID:', rule.userId);
    console.log('   App:', rule.appKey);
    console.log('   Module:', rule.moduleKey);
    console.log('   Event:', rule.eventType);
    console.log('   Conditions:', JSON.stringify(rule.conditions, null, 2));
    console.log('   Channels:', JSON.stringify(rule.channels, null, 2));
    console.log('   Enabled:', rule.enabled);
    console.log();

    // Get a task assigned to the rule's user
    const task = await Task.findOne({ assignedTo: rule.userId });
    
    if (!task) {
      console.log('❌ No task found assigned to user:', rule.userId);
      console.log('   Create a task and assign it to this user, then run the test again.');
      await mongoose.connection.close();
      return;
    }

    console.log('📝 Found task:');
    console.log('   ID:', task._id);
    console.log('   Title:', task.title);
    console.log('   Assigned To:', task.assignedTo);
    console.log('   Status:', task.status);
    console.log('   Priority:', task.priority);
    console.log();

    // Test rule evaluation
    console.log('🧪 Testing rule evaluation...\n');
    
    await evaluateRules({
      eventType: domainEvents.TASK_ASSIGNED,
      entity: {
        type: 'Task',
        id: task._id.toString(),
        title: task.title,
        status: task.status,
        priority: task.priority
      },
      organizationId: task.organizationId,
      triggeredBy: task.assignedBy || task.createdBy,
      sourceAppKey: 'CRM'
    });

    console.log('\n✅ Rule evaluation complete. Check if notification was created.\n');

    // Check if notification was created
    const Notification = require('../models/Notification');
    const notification = await Notification.findOne({
      userId: rule.userId,
      ruleId: rule._id,
      createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
    });

    if (notification) {
      console.log('✅ Notification created:');
      console.log('   ID:', notification._id);
      console.log('   Title:', notification.title);
      console.log('   Body:', notification.body);
      console.log('   Channel:', notification.channel);
      console.log('   Source:', notification.source);
    } else {
      console.log('❌ No notification created in the last minute.');
      console.log('   Check server logs for errors.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
  }
}

testRule();

