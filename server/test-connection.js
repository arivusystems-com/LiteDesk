// Test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');
const getMasterDatabaseUri = require('./utils/getMasterDatabaseUri');

const masterUri = getMasterDatabaseUri();

console.log('Testing MongoDB connection to master database (litedesk_master)...');
console.log('Connection string:', masterUri.replace(/:[^:@]+@/, ':****@')); // Hide password
console.log('');

mongoose.connect(masterUri)
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Expected database: litedesk_master');
    console.log('Connection state:', mongoose.connection.readyState); // 1 = connected
    if (mongoose.connection.db.databaseName !== 'litedesk_master') {
      console.warn('⚠️  WARNING: Connected to wrong database! Expected litedesk_master');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Connection timed out after 10 seconds');
  process.exit(1);
}, 10000);

