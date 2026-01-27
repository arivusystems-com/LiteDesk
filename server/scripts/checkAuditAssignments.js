#!/usr/bin/env node

/**
 * Check Audit Assignments
 * 
 * Quick check for existing AuditAssignment records
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const AuditAssignment = require('../models/AuditAssignment');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

async function checkAssignments() {
  try {
    const masterUri = getMasterDatabaseUri();
    await mongoose.connect(masterUri);
    
    const count = await AuditAssignment.countDocuments({});
    console.log(`📋 Total Audit Assignments: ${count}`);
    
    if (count > 0) {
      const assignments = await AuditAssignment.find({})
        .populate('auditorId', 'email firstName lastName')
        .populate('organizationId', 'name')
        .limit(10)
        .lean();
      
      console.log('\nSample Assignments:');
      assignments.forEach(a => {
        console.log(`  - ${a.auditType} (${a.auditState})`);
        console.log(`    Auditor: ${a.auditorId?.email || 'N/A'}`);
        console.log(`    Org: ${a.organizationId?.name || 'N/A'}`);
        console.log(`    Event ID: ${a.eventId}`);
      });
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkAssignments();
