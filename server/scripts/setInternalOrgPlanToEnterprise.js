#!/usr/bin/env node

/**
 * Set Internal (Arivu master) Org Plan to ENTERPRISE
 *
 * Locates the Arivu internal organization on the master database and upgrades
 * every entry in its OrganizationSubscription.apps[] to:
 *   - planKey: 'ENTERPRISE'
 *   - seatLimit: null   (unlimited; matches appPricingRegistry ENTERPRISE plan)
 *   - status:   'ACTIVE'
 *
 * Lookup order:
 *   1. Instance with isInternal: true  (canonical source of truth)
 *   2. Organization by well-known internal names ("Arivu Internal", "Arivu Systems", ...)
 *
 * Idempotent: re-running on an already-upgraded org reports "no changes".
 *
 * Usage:
 *   node server/scripts/setInternalOrgPlanToEnterprise.js
 *   node server/scripts/setInternalOrgPlanToEnterprise.js --org-id <id>   (override lookup)
 *   node server/scripts/setInternalOrgPlanToEnterprise.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Organization = require('../models/Organization');
const OrganizationSubscription = require('../models/OrganizationSubscription');
const Instance = require('../models/Instance');
const appPricingRegistry = require('../constants/appPricingRegistry');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

const TARGET_PLAN = 'ENTERPRISE';
const INTERNAL_ORG_NAMES = [
    'Arivu Internal',
    'Arivu Systems',
    'Arivu',
    'Arivu Platform',
    'Arivu Ops',
];

function parseArgs(argv) {
    const args = { dryRun: false, orgId: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--dry-run') args.dryRun = true;
        else if (a === '--org-id') args.orgId = argv[++i];
    }
    return args;
}

async function findInternalOrg(overrideOrgId) {
    if (overrideOrgId) {
        const org = await Organization.findById(overrideOrgId);
        if (!org) throw new Error(`Organization not found for --org-id ${overrideOrgId}`);
        return { org, via: 'override' };
    }

    const internalInstance = await Instance.findOne({ isInternal: true }).lean();
    if (internalInstance?.organizationId) {
        const org = await Organization.findById(internalInstance.organizationId);
        if (org) return { org, via: 'Instance.isInternal=true' };
    }

    const org = await Organization.findOne({ name: { $in: INTERNAL_ORG_NAMES } });
    if (org) return { org, via: `Organization.name=${org.name}` };

    throw new Error(
        'Could not locate the Arivu internal organization. ' +
        'Pass --org-id <id> to target explicitly.'
    );
}

function describeApp(app) {
    return `${app.appKey.padEnd(10)} plan=${String(app.planKey).padEnd(10)} seatLimit=${app.seatLimit === null ? 'unlimited' : app.seatLimit} status=${app.status}`;
}

async function run() {
    const { dryRun, orgId } = parseArgs(process.argv.slice(2));

    console.log('Connecting to master database...');
    await mongoose.connect(getMasterDatabaseUri());
    console.log('Connected.\n');

    try {
        const { org, via } = await findInternalOrg(orgId);
        console.log(`Target organization: ${org.name} (${org._id})`);
        console.log(`Located via: ${via}\n`);

        const subscription = await OrganizationSubscription.findOne({ organizationId: org._id });
        if (!subscription) {
            throw new Error(
                `No OrganizationSubscription document for org ${org._id}. ` +
                'Run server/scripts/migrateOrgSubscriptions.js first.'
            );
        }

        if (!subscription.apps || subscription.apps.length === 0) {
            throw new Error(`OrganizationSubscription has no apps[] entries for org ${org._id}.`);
        }

        console.log('Current subscription:');
        for (const app of subscription.apps) console.log('  - ' + describeApp(app));
        console.log('');

        let changes = 0;
        for (const app of subscription.apps) {
            const pricing = appPricingRegistry[app.appKey];
            // ENTERPRISE seat limit per registry (null = unlimited for PER_USER; null also for FLAT).
            const targetSeatLimit = pricing?.plans?.ENTERPRISE?.seatLimit ?? null;

            const before = {
                planKey: app.planKey,
                seatLimit: app.seatLimit,
                status: app.status,
            };

            if (app.planKey !== TARGET_PLAN) { app.planKey = TARGET_PLAN; changes++; }
            if (app.seatLimit !== targetSeatLimit) { app.seatLimit = targetSeatLimit; changes++; }
            if (app.status !== 'ACTIVE') { app.status = 'ACTIVE'; changes++; }
            // Clear trial end so it cannot auto-suspend.
            if (app.trialEndsAt) { app.trialEndsAt = null; changes++; }

            const changedKeys = [];
            if (before.planKey !== app.planKey) changedKeys.push(`planKey: ${before.planKey} -> ${app.planKey}`);
            if (before.seatLimit !== app.seatLimit) changedKeys.push(`seatLimit: ${before.seatLimit === null ? 'unlimited' : before.seatLimit} -> ${app.seatLimit === null ? 'unlimited' : app.seatLimit}`);
            if (before.status !== app.status) changedKeys.push(`status: ${before.status} -> ${app.status}`);

            if (changedKeys.length) {
                console.log(`  ~ ${app.appKey}: ${changedKeys.join(', ')}`);
            } else {
                console.log(`  = ${app.appKey}: already ENTERPRISE/unlimited/ACTIVE`);
            }
        }

        if (!changes) {
            console.log('\nNo changes needed. Already on ENTERPRISE everywhere.');
            return;
        }

        if (dryRun) {
            console.log('\n[dry-run] Skipping save. Re-run without --dry-run to apply.');
            return;
        }

        await subscription.save();

        const verify = await OrganizationSubscription.findOne({ organizationId: org._id }).lean();
        console.log('\nUpdated subscription:');
        for (const app of verify.apps) console.log('  - ' + describeApp(app));
        console.log('\nDone.');
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((err) => {
    console.error('\nFailed:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exitCode = 1;
});
