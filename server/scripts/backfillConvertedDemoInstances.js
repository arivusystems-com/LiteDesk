#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const DemoRequest = require('../models/DemoRequest');
const Organization = require('../models/Organization');
const InstanceRegistry = require('../models/InstanceRegistry');
const { generateUniqueSlug } = require('../services/provisioning/utils/slugGenerator');
const { buildTenantFrontendUrl, buildTenantApiUrl } = require('../utils/tenantDomain');

async function run() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
    if (!mongoUri) {
        throw new Error('Mongo URI not configured. Set MONGODB_URI or MONGO_URI.');
    }

    await mongoose.connect(mongoUri);
    console.log('[backfill] Connected to MongoDB');

    const converted = await DemoRequest.find({ status: 'converted' }).lean();
    console.log(`[backfill] Found ${converted.length} converted demo request(s)`);

    let created = 0;
    let linked = 0;
    let skipped = 0;

    for (const demo of converted) {
        try {
            const existingLinked = demo.convertedToInstanceId
                ? await InstanceRegistry.findById(demo.convertedToInstanceId).lean()
                : null;

            if (existingLinked) {
                skipped += 1;
                continue;
            }

            let instance = await InstanceRegistry.findOne({ demoRequestId: demo._id });
            if (!instance) {
                const organization = await Organization.findById(demo.organizationId).lean();
                if (!organization) {
                    console.warn(`[backfill] Skip ${demo._id}: organization missing`);
                    skipped += 1;
                    continue;
                }

                const tier = organization?.subscription?.tier === 'paid' ? 'paid' : 'trial';
                const subdomain = await generateUniqueSlug(organization.name || demo.companyName || 'tenant');
                const dbName = organization?.database?.name || null;

                instance = await InstanceRegistry.create({
                    instanceName: organization.name || demo.companyName || 'Tenant Instance',
                    subdomain,
                    ownerEmail: String(demo.email || '').toLowerCase(),
                    ownerName: demo.contactName || '',
                    status: 'active',
                    provisioningStage: 'complete',
                    healthStatus: 'healthy',
                    subscription: {
                        tier,
                        status: tier === 'trial' ? 'trial' : 'active',
                        trialStartDate: tier === 'trial' ? new Date() : undefined,
                        trialEndDate: tier === 'trial' ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) : undefined
                    },
                    databaseConnection: {
                        database: dbName
                    },
                    urls: {
                        frontend: buildTenantFrontendUrl(subdomain),
                        api: buildTenantApiUrl(subdomain)
                    },
                    demoRequestId: demo._id
                });
                created += 1;
            }

            await DemoRequest.updateOne(
                { _id: demo._id },
                { $set: { convertedToInstanceId: instance._id } }
            );
            linked += 1;
        } catch (err) {
            console.warn(`[backfill] Failed for demo ${demo._id}: ${err.message}`);
            skipped += 1;
        }
    }

    console.log('[backfill] Done');
    console.log(`[backfill] instances created: ${created}`);
    console.log(`[backfill] demo requests linked: ${linked}`);
    console.log(`[backfill] skipped/failed: ${skipped}`);

    await mongoose.connection.close();
}

run().catch(async (err) => {
    console.error('[backfill] Fatal error:', err);
    if (mongoose.connection.readyState) {
        await mongoose.connection.close();
    }
    process.exit(1);
});
