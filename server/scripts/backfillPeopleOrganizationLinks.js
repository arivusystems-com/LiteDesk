#!/usr/bin/env node

/**
 * Backfill People.organization from people_organizations relationship instances.
 *
 * Why:
 * - Some flows created RelationshipInstance (people_organizations) without
 *   syncing People.organization.
 * - OrganizationSurface reads People.organization for linked people preview/count.
 *
 * Default mode is DRY-RUN (no writes).
 * Apply mode: node server/scripts/backfillPeopleOrganizationLinks.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const Organization = require('../models/Organization');
const People = require('../models/People');
const RelationshipInstance = require('../models/RelationshipInstance');

function resolveMasterUri() {
  const isProduction = process.env.NODE_ENV === 'production';
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL) ||
    process.env.MONGO_URI_ATLAS;

  if (!MONGO_URI) {
    console.error(
      'Missing Mongo URI. Set MONGODB_URI or MONGO_URI in server/.env (or MONGO_URI_LOCAL / MONGO_URI_ATLAS).'
    );
    process.exit(1);
  }

  const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI.split('?');
  const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
  const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
  const masterDbName = 'litedesk_master';
  return { masterUri: `${baseUri}/${masterDbName}${mongoQueryString}`, baseUri, mongoQueryString };
}

function getModelsForConnection(conn) {
  const PeopleModel = conn.models.People || conn.model('People', People.schema);
  const RelationshipInstanceModel =
    conn.models.RelationshipInstance || conn.model('RelationshipInstance', RelationshipInstance.schema);
  return { PeopleModel, RelationshipInstanceModel };
}

function toIdString(value) {
  if (!value) return '';
  return String(value);
}

function extractPeopleOrgPair(link) {
  const srcModule = String(link?.source?.moduleKey || '').toLowerCase();
  const tgtModule = String(link?.target?.moduleKey || '').toLowerCase();

  if (srcModule === 'people' && tgtModule === 'organizations') {
    return {
      personId: link.source.recordId,
      orgId: link.target.recordId
    };
  }

  // Defensive handling for any legacy reversed rows.
  if (srcModule === 'organizations' && tgtModule === 'people') {
    return {
      personId: link.target.recordId,
      orgId: link.source.recordId
    };
  }

  return null;
}

async function processConnection(conn, label, apply) {
  const { PeopleModel, RelationshipInstanceModel } = getModelsForConnection(conn);
  const stats = {
    linksExamined: 0,
    pairsAccepted: 0,
    ambiguousPeople: 0,
    tenantConflicts: 0,
    peopleMissing: 0,
    alreadySynced: 0,
    updatesNeeded: 0,
    updated: 0
  };

  // personId -> { orgIds:Set<string>, tenantIds:Set<string>, sampleLinkId:string }
  const personMap = new Map();

  const cursor = RelationshipInstanceModel.find({
    relationshipKey: 'people_organizations'
  })
    .select('_id organizationId source target')
    .lean()
    .cursor();

  for await (const link of cursor) {
    stats.linksExamined++;
    const pair = extractPeopleOrgPair(link);
    if (!pair?.personId || !pair?.orgId) continue;

    const personId = toIdString(pair.personId);
    const orgId = toIdString(pair.orgId);
    const tenantId = toIdString(link.organizationId);
    if (!personId || !orgId || !tenantId) continue;

    let entry = personMap.get(personId);
    if (!entry) {
      entry = {
        orgIds: new Set(),
        tenantIds: new Set(),
        sampleLinkId: toIdString(link._id)
      };
      personMap.set(personId, entry);
    }

    entry.orgIds.add(orgId);
    entry.tenantIds.add(tenantId);
    stats.pairsAccepted++;
  }

  const candidatePersonIds = [];
  for (const [personId, entry] of personMap.entries()) {
    if (entry.tenantIds.size !== 1) {
      stats.tenantConflicts++;
      continue;
    }
    if (entry.orgIds.size !== 1) {
      stats.ambiguousPeople++;
      continue;
    }
    candidatePersonIds.push(personId);
  }

  console.log(`[${label}] Links examined: ${stats.linksExamined}`);
  console.log(`[${label}] Valid people↔org pairs: ${stats.pairsAccepted}`);
  console.log(`[${label}] Skipped tenant conflicts: ${stats.tenantConflicts}`);
  console.log(`[${label}] Skipped ambiguous org links: ${stats.ambiguousPeople}`);

  const previewChanges = [];

  for (const personId of candidatePersonIds) {
    const entry = personMap.get(personId);
    const tenantId = Array.from(entry.tenantIds)[0];
    const expectedOrgId = Array.from(entry.orgIds)[0];

    const person = await PeopleModel.findOne({
      _id: personId,
      organizationId: tenantId
    })
      .select('_id organizationId organization')
      .lean();

    if (!person) {
      stats.peopleMissing++;
      continue;
    }

    const currentOrgId = toIdString(person.organization);
    if (currentOrgId === expectedOrgId) {
      stats.alreadySynced++;
      continue;
    }

    stats.updatesNeeded++;
    if (previewChanges.length < 20) {
      previewChanges.push({
        personId,
        tenantId,
        from: currentOrgId || null,
        to: expectedOrgId
      });
    }

    if (apply) {
      const result = await PeopleModel.updateOne(
        {
          _id: personId,
          organizationId: tenantId
        },
        {
          $set: { organization: expectedOrgId }
        }
      );
      if (result.modifiedCount > 0) stats.updated++;
    }
  }

  console.log(`[${label}] People missing in DB for valid links: ${stats.peopleMissing}`);
  console.log(`[${label}] Already synced: ${stats.alreadySynced}`);
  console.log(`[${label}] Updates needed: ${stats.updatesNeeded}`);
  if (apply) {
    console.log(`[${label}] Updated: ${stats.updated}`);
  } else {
    console.log(`[${label}] Dry-run only (no writes).`);
  }

  if (previewChanges.length > 0) {
    console.log(`[${label}] Sample changes (${previewChanges.length}):`);
    previewChanges.forEach((c) => {
      console.log(`  person=${c.personId} tenant=${c.tenantId} org: ${c.from || 'null'} -> ${c.to}`);
    });
  }

  console.log('');
  return stats;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { masterUri, baseUri, mongoQueryString } = resolveMasterUri();

  console.log(`Mode: ${apply ? 'APPLY (writes)' : 'DRY-RUN'}\n`);
  await mongoose.connect(masterUri);
  console.log(`Connected to master: ${mongoose.connection.name}\n`);

  await processConnection(mongoose.connection, 'master', apply);

  const orgs = await Organization.find({
    'database.name': { $exists: true, $nin: [null, ''] }
  })
    .select('name database')
    .lean();

  console.log(`Tenant org databases: ${orgs.length}\n`);

  for (const org of orgs) {
    const dbName = org.database?.name;
    if (!dbName) continue;

    const orgUri = `${baseUri}/${dbName}${mongoQueryString}`;
    const orgConn = mongoose.createConnection(orgUri);
    await orgConn.asPromise();
    try {
      await processConnection(orgConn, `${org.name || 'tenant'} (${dbName})`, apply);
    } catch (error) {
      console.error(`[${dbName}] Error:`, error.message);
    } finally {
      await orgConn.close();
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
  if (!apply) {
    console.log('Re-run with --apply to persist changes.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

