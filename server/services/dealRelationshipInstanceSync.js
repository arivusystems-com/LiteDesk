const RelationshipInstance = require('../models/RelationshipInstance');

const SALES_APP_KEY = 'sales';
const DEALS_MODULE_KEY = 'deals';

const RELATIONSHIP_CONFIG = {
  people: {
    relationshipKey: 'deal_contacts',
    targetModuleKey: 'people'
  },
  organizations: {
    relationshipKey: 'deal_organizations',
    targetModuleKey: 'organizations'
  }
};

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'object') {
    const nested = value._id ?? value.id ?? value.recordId;
    return nested ? String(nested) : '';
  }
  return String(value);
}

function collectActiveDealPeopleIds(dealDoc) {
  const rows = Array.isArray(dealDoc?.dealPeople) ? dealDoc.dealPeople : [];
  const ids = rows
    .filter((row) => row?.isActive !== false)
    .map((row) => normalizeId(row?.personId))
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function collectActiveDealOrganizationIds(dealDoc) {
  const rows = Array.isArray(dealDoc?.dealOrganizations) ? dealDoc.dealOrganizations : [];
  const ids = rows
    .filter((row) => row?.isActive !== false)
    .map((row) => normalizeId(row?.organizationId))
    .filter(Boolean);
  return Array.from(new Set(ids));
}

async function upsertRelationshipInstance({
  organizationId,
  relationshipKey,
  sourceRecordId,
  targetModuleKey,
  targetRecordId,
  createdBy
}) {
  await RelationshipInstance.updateOne(
    {
      organizationId,
      relationshipKey,
      'source.appKey': SALES_APP_KEY,
      'source.moduleKey': DEALS_MODULE_KEY,
      'source.recordId': sourceRecordId,
      'target.appKey': SALES_APP_KEY,
      'target.moduleKey': targetModuleKey,
      'target.recordId': targetRecordId
    },
    {
      $setOnInsert: {
        createdBy,
        source: {
          appKey: SALES_APP_KEY,
          moduleKey: DEALS_MODULE_KEY,
          recordId: sourceRecordId
        },
        target: {
          appKey: SALES_APP_KEY,
          moduleKey: targetModuleKey,
          recordId: targetRecordId
        }
      }
    },
    { upsert: true }
  );
}

async function reconcileRelationshipGroup({
  organizationId,
  dealId,
  createdBy,
  ids,
  config,
  mode = 'replace'
}) {
  const sourceRecordId = normalizeId(dealId);
  if (!sourceRecordId) return;

  const desiredIds = Array.isArray(ids) ? ids.map((id) => normalizeId(id)).filter(Boolean) : [];
  const desiredSet = new Set(desiredIds);

  const baseQuery = {
    organizationId,
    relationshipKey: config.relationshipKey,
    'source.appKey': SALES_APP_KEY,
    'source.moduleKey': DEALS_MODULE_KEY,
    'source.recordId': sourceRecordId,
    'target.appKey': SALES_APP_KEY,
    'target.moduleKey': config.targetModuleKey
  };

  const existing = await RelationshipInstance.find(baseQuery)
    .select('target.recordId')
    .lean();
  const existingIds = (existing || [])
    .map((entry) => normalizeId(entry?.target?.recordId))
    .filter(Boolean);
  const existingSet = new Set(existingIds);

  if (mode === 'replace') {
    if (desiredSet.size === 0) {
      await RelationshipInstance.deleteMany(baseQuery);
    } else {
      const staleIds = existingIds.filter((id) => !desiredSet.has(id));
      if (staleIds.length > 0) {
        await RelationshipInstance.deleteMany({
          ...baseQuery,
          'target.recordId': { $in: staleIds }
        });
      }
    }
  }

  for (const id of desiredSet) {
    if (existingSet.has(id)) continue;
    await upsertRelationshipInstance({
      organizationId,
      relationshipKey: config.relationshipKey,
      sourceRecordId,
      targetModuleKey: config.targetModuleKey,
      targetRecordId: id,
      createdBy
    });
  }
}

async function syncDealRelationshipInstances({
  organizationId,
  dealDoc,
  createdBy,
  peopleMode = 'replace',
  organizationsMode = 'replace'
}) {
  if (!organizationId || !dealDoc?._id) return;

  const peopleIds = collectActiveDealPeopleIds(dealDoc);
  const organizationIds = collectActiveDealOrganizationIds(dealDoc);

  await reconcileRelationshipGroup({
    organizationId,
    dealId: dealDoc._id,
    createdBy,
    ids: peopleIds,
    config: RELATIONSHIP_CONFIG.people,
    mode: peopleMode
  });

  await reconcileRelationshipGroup({
    organizationId,
    dealId: dealDoc._id,
    createdBy,
    ids: organizationIds,
    config: RELATIONSHIP_CONFIG.organizations,
    mode: organizationsMode
  });
}

module.exports = {
  syncDealRelationshipInstances
};
