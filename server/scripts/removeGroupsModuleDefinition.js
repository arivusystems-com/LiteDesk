const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const ModuleDefinition = require('../models/ModuleDefinition');

async function removeGroupsModuleDefinition() {
  try {
    console.log('🔄 Removing Groups module definition...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/arivu';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find and delete all Groups module definitions
    const result = await ModuleDefinition.deleteMany({ key: 'groups' });
    
    console.log(`✅ Deleted ${result.deletedCount} Groups module definition(s)\n`);
    
    if (result.deletedCount === 0) {
      console.log('ℹ️  No Groups module definitions found to delete.\n');
    }

    console.log('✅ Cleanup completed successfully!\n');
    
    await mongoose.connection.close();
    console.log('👋 Database connection closed\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error removing Groups module definition:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
removeGroupsModuleDefinition();

