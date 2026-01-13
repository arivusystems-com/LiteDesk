/**
 * Script to fix organizations missing enabledApps
 * Run: node server/scripts/fixEnabledApps.js
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const { APP_KEYS } = require('../constants/appKeys');

async function fixEnabledApps() {
    try {
        console.log('🔗 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        // Find all organizations
        const organizations = await Organization.find({});
        console.log(`📊 Found ${organizations.length} organizations\n`);

        let fixed = 0;
        let alreadyOk = 0;
        let errors = 0;

        for (const org of organizations) {
            try {
                const needsFix = !org.enabledApps || 
                               !Array.isArray(org.enabledApps) || 
                               org.enabledApps.length === 0;

                if (needsFix) {
                    console.log(`🔧 Fixing organization: ${org.name} (${org._id})`);
                    console.log(`   Current enabledApps:`, org.enabledApps);
                    
                    org.enabledApps = [{ 
                        appKey: APP_KEYS.SALES, 
                        status: 'ACTIVE', 
                        enabledAt: new Date() 
                    }];
                    
                    await org.save();
                    console.log(`   ✅ Fixed! New enabledApps:`, org.enabledApps);
                    fixed++;
                } else {
                    console.log(`✅ Organization ${org.name} already has enabledApps:`, org.enabledApps);
                    alreadyOk++;
                }
            } catch (error) {
                console.error(`❌ Error fixing organization ${org.name}:`, error.message);
                errors++;
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Fixed: ${fixed}`);
        console.log(`   ✅ Already OK: ${alreadyOk}`);
        console.log(`   ❌ Errors: ${errors}`);

        await mongoose.disconnect();
        console.log('\n✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

fixEnabledApps();

