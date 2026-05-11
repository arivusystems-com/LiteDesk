#!/usr/bin/env node

/**
 * Mark Org as Internal (Arivu master)
 *
 * Sets `Instance.isInternal = true` for the Arivu master organization so that
 * `subscriptionBootstrapService` and `ensureOrgSubscriptionForEnabledApps`
 * permanently treat it as ENTERPRISE / unlimited / ACTIVE for every app —
 * including any app enabled in the future.
 *
 * Behavior:
 *   - If an Instance already exists for the org: sets `isInternal = true`
 *   - If no Instance exists: creates one with `status: ACTIVE`, `isInternal: true`,
 *     `source: MANUAL`
 *   - Idempotent
 *
 * Lookup order (same as setInternalOrgPlanToEnterprise.js):
 *   1. Instance with isInternal: true (already marked)
 *   2. Organization by well-known internal names
 *   3. --org-id override
 *
 * Usage:
 *   node server/scripts/markOrgAsInternal.js
 *   node server/scripts/markOrgAsInternal.js --org-id <id>
 *   node server/scripts/markOrgAsInternal.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Organization = require('../models/Organization');
const Instance = require('../models/Instance');
const { INSTANCE_STATUS } = require('../constants/instanceLifecycle');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

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

    // 1) Already marked
    const existing = await Instance.findOne({ isInternal: true }).lean();
    if (existing?.organizationId) {
        const org = await Organization.findById(existing.organizationId);
        if (org) return { org, via: 'Instance.isInternal=true (already marked)' };
    }

    // 2) Name fallback
    const org = await Organization.findOne({ name: { $in: INTERNAL_ORG_NAMES } });
    if (org) return { org, via: `Organization.name=${org.name}` };

    throw new Error(
        'Could not locate the Arivu internal organization. ' +
        'Pass --org-id <id> to target explicitly.'
    );
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

        const instance = await Instance.findOne({ organizationId: org._id });

        if (instance) {
            console.log('Existing Instance found:');
            console.log(`  _id:        ${instance._id}`);
            console.log(`  status:     ${instance.status}`);
            console.log(`  isInternal: ${!!instance.isInternal}`);
            console.log(`  source:     ${instance.source}`);

            if (instance.isInternal) {
                console.log('\nAlready marked as internal. No changes needed.');
                return;
            }

            if (dryRun) {
                console.log('\n[dry-run] Would set isInternal=true on this Instance.');
                return;
            }

            instance.isInternal = true;
            await instance.save();
            console.log('\nUpdated: isInternal=true');
            return;
        }

        console.log('No Instance document exists for this org.');

        if (dryRun) {
            console.log('[dry-run] Would create Instance { status: ACTIVE, isInternal: true, source: MANUAL }.');
            return;
        }

        const created = await Instance.create({
            organizationId: org._id,
            status: INSTANCE_STATUS.ACTIVE,
            isInternal: true,
            source: 'MANUAL'
        });
        console.log(`\nCreated Instance ${created._id} with isInternal=true, status=${created.status}.`);
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((err) => {
    console.error('\nFailed:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exitCode = 1;
});
