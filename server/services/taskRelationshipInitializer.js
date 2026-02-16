/**
 * ============================================================================
 * Task Relationship Initializer (Platform Defaults)
 * ============================================================================
 *
 * Registers default Task relationships and activates them when target modules
 * become available. Safe to run multiple times.
 * ============================================================================
 */

const ModuleDefinition = require('../models/ModuleDefinition');
const RelationshipDefinition = require('../models/RelationshipDefinition');
const DEFAULT_TASK_RELATIONSHIPS = require('../constants/defaultTaskRelationships');
const { buildTaskDefaultRelationshipsForSettings } = require('../utils/taskRelationshipSettings');

const TASK_APP_KEY = 'platform';

const TARGET_APP_BY_MODULE = {
  projects: 'projects',
  events: 'platform',
  deals: 'sales',
  cases: 'helpdesk',
  forms: 'platform',
  tasks: 'platform'
};

const SOURCE_LABEL_BY_TARGET = {
  projects: 'Project',
  events: 'Events',
  deals: 'Deals',
  cases: 'Cases',
  forms: 'Forms',
  tasks: 'Dependencies'
};

const TARGET_LABEL_BY_TARGET = {
  projects: 'Tasks',
  events: 'Tasks',
  deals: 'Tasks',
  cases: 'Tasks',
  forms: 'Tasks',
  tasks: 'Dependent Tasks'
};

async function moduleExists(appKey, moduleKey) {
  if (!appKey || !moduleKey) {
    return false;
  }
  const normalizedAppKey = appKey.toLowerCase();
  const normalizedModuleKey = moduleKey.toLowerCase();
  const existing = await ModuleDefinition.findOne({
    appKey: normalizedAppKey,
    moduleKey: normalizedModuleKey,
    enabled: true,
    organizationId: null
  }).select('_id').lean();

  return !!existing;
}

function resolveTargetAppKey(moduleKey) {
  const normalized = (moduleKey || '').toLowerCase();
  return TARGET_APP_BY_MODULE[normalized] || 'platform';
}

function resolveShowAs(display) {
  if (display?.coreFields) {
    return 'NONE';
  }
  if (display?.relatedExplorer) {
    return 'TAB';
  }
  if (display?.relatedSummary) {
    return 'EMBED';
  }
  return 'NONE';
}

function buildRelationshipDefinition(defaultRel, sourceAppKey, targetAppKey) {
  const sourceModuleKey = defaultRel.sourceModule.toLowerCase();
  const targetModuleKey = defaultRel.targetModule.toLowerCase();

  const sourceLabel = SOURCE_LABEL_BY_TARGET[targetModuleKey] || defaultRel.relationshipKey;
  const targetLabel = TARGET_LABEL_BY_TARGET[targetModuleKey] || 'Tasks';

  const showAsSource = resolveShowAs(defaultRel.display);
  const showAsTarget = defaultRel.display?.coreFields ? 'NONE' : 'TAB';

  return {
    relationshipKey: defaultRel.relationshipKey.toLowerCase(),
    source: {
      appKey: sourceAppKey.toLowerCase(),
      moduleKey: sourceModuleKey
    },
    target: {
      appKey: targetAppKey.toLowerCase(),
      moduleKey: targetModuleKey
    },
    cardinality: defaultRel.relationshipType,
    relationshipType: defaultRel.relationshipType,
    ownership: 'SOURCE',
    required: !!defaultRel.required,
    localField: defaultRel.localField || null,
    foreignField: defaultRel.foreignField || null,
    userLinkable: !!defaultRel.userLinkable,
    display: defaultRel.display || {},
    constraints: defaultRel.constraints || null,
    isDefault: !!defaultRel.isDefault,
    isAdvanced: !!defaultRel.isAdvanced,
    activateWhenModuleExists: !!defaultRel.activateWhenModuleExists,
    ui: {
      source: {
        showAs: showAsSource,
        label: sourceLabel
      },
      target: {
        showAs: showAsTarget,
        label: targetLabel
      },
      picker: {
        enabled: !!defaultRel.userLinkable,
        searchable: true
      }
    },
    automation: {
      allowed: true
    },
    cascade: {
      onDelete: 'DETACH'
    }
  };
}

async function registerDefaultTaskRelationships() {
  try {
    await ensureTaskModuleSettingsDefaults();
  } catch (error) {
    console.error('[TaskRelationshipInitializer] Failed to seed Task settings relationships:', error);
  }

  for (const defaultRel of DEFAULT_TASK_RELATIONSHIPS) {
    const sourceAppKey = TASK_APP_KEY;
    const targetAppKey = resolveTargetAppKey(defaultRel.targetModule);

    const [sourceExists, targetExists] = await Promise.all([
      moduleExists(sourceAppKey, defaultRel.sourceModule),
      moduleExists(targetAppKey, defaultRel.targetModule)
    ]);

    const isActive = sourceExists && targetExists;
    const relationshipData = buildRelationshipDefinition(defaultRel, sourceAppKey, targetAppKey);

    await RelationshipDefinition.updateOne(
      { relationshipKey: relationshipData.relationshipKey },
      {
        $set: relationshipData,
        $setOnInsert: {
          enabled: isActive,
          status: isActive ? 'ACTIVE' : 'PENDING',
          createdBy: 'system'
        }
      },
      { upsert: true }
    );

    if (isActive) {
      await RelationshipDefinition.updateOne(
        { relationshipKey: relationshipData.relationshipKey, status: 'PENDING' },
        { $set: { enabled: true, status: 'ACTIVE' } }
      );
    }
  }
}

async function activatePendingRelationshipsForModule(appKey, moduleKey) {
  if (!appKey || !moduleKey) {
    return;
  }

  const normalizedAppKey = appKey.toLowerCase();
  const normalizedModuleKey = moduleKey.toLowerCase();

  const pending = await RelationshipDefinition.find({
    activateWhenModuleExists: true,
    status: 'PENDING',
    enabled: false,
    $or: [
      { 'source.appKey': normalizedAppKey, 'source.moduleKey': normalizedModuleKey },
      { 'target.appKey': normalizedAppKey, 'target.moduleKey': normalizedModuleKey }
    ]
  }).lean();

  if (!pending.length) {
    return;
  }

  for (const rel of pending) {
    const [sourceExists, targetExists] = await Promise.all([
      moduleExists(rel.source.appKey, rel.source.moduleKey),
      moduleExists(rel.target.appKey, rel.target.moduleKey)
    ]);

    if (!sourceExists || !targetExists) {
      continue;
    }

    await RelationshipDefinition.updateOne(
      { _id: rel._id, status: 'PENDING' },
      { $set: { enabled: true, status: 'ACTIVE' } }
    );
  }
}

function hasDefaultRelationship(existing, defaultRel) {
  const existingKey = String(existing?.relationshipKey || '').toLowerCase();
  const existingTarget = String(existing?.targetModuleKey || '').toLowerCase();
  const defaultKey = String(defaultRel?.relationshipKey || '').toLowerCase();
  const defaultTarget = String(defaultRel?.targetModuleKey || '').toLowerCase();

  if (defaultKey && existingKey && existingKey === defaultKey) {
    return true;
  }
  if (defaultTarget && existingTarget && existingTarget === defaultTarget) {
    return true;
  }
  return false;
}

async function ensureTaskModuleSettingsDefaults() {
  const defaults = buildTaskDefaultRelationshipsForSettings();
  if (!defaults.length) {
    return;
  }

  const candidates = await ModuleDefinition.find({
    relationshipsDefaulted: { $ne: true },
    $or: [
      { appKey: TASK_APP_KEY, moduleKey: 'tasks', organizationId: null },
      { key: 'tasks', organizationId: { $ne: null } }
    ]
  })
    .select('_id relationships key moduleKey organizationId appKey')
    .lean();

  if (!candidates.length) {
    return;
  }

  for (const doc of candidates) {
    const existing = Array.isArray(doc.relationships) ? doc.relationships : [];
    const merged = [...existing];
    let added = 0;

    for (const def of defaults) {
      const alreadyExists = existing.some((rel) => hasDefaultRelationship(rel, def));
      if (!alreadyExists) {
        merged.push({ ...def });
        added += 1;
      }
    }

    const update = { relationshipsDefaulted: true };
    if (added > 0 || existing.length === 0) {
      update.relationships = merged;
    }

    await ModuleDefinition.updateOne({ _id: doc._id }, { $set: update });
  }
}

module.exports = {
  registerDefaultTaskRelationships,
  activatePendingRelationshipsForModule
};
