/**
 * Quick script to check what's in both databases
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

async function checkDatabases() {
    try {
        const [uriWithoutQuery, queryPart] = MONGO_URI.split('?');
        const connectionQuery = queryPart ? `?${queryPart}` : '';
        const baseUri = uriWithoutQuery.split('/').slice(0, -1).join('/');
        
        const databases = ['litedesk', 'litedesk_master'];
        
        for (const dbName of databases) {
            console.log(`\n📊 Checking database: ${dbName}`);
            console.log('='.repeat(50));
            
            try {
                if (mongoose.connection.readyState !== 0) {
                    await mongoose.disconnect();
                }
                
                const dbUri = `${baseUri}/${dbName}${connectionQuery}`;
                await mongoose.connect(dbUri);
                
                const db = mongoose.connection.db;
                const collections = await db.listCollections().toArray();
                
                console.log(`✅ Connected to ${dbName}`);
                console.log(`📁 Collections found: ${collections.length}`);
                
                for (const coll of collections) {
                    const count = await db.collection(coll.name).countDocuments({});
                    console.log(`   - ${coll.name}: ${count} documents`);
                }
                
                if (collections.length === 0) {
                    console.log('   (empty database)');
                }
                
                await mongoose.disconnect();
            } catch (error) {
                console.log(`❌ Error: ${error.message}`);
            }
        }
        
        console.log('\n✅ Database check complete\n');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

checkDatabases()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

