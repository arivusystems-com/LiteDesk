/**
 * ============================================================================
 * Default Task Relationships (Platform Defaults)
 * ============================================================================
 *
 * These relationships define the system-recommended, out-of-the-box data model
 * for Tasks across all applications.
 *
 * ⚠️ PLATFORM defaults only - not tenant-specific
 * ⚠️ Only PRIMARY and OPERATIONAL relationships are defined here
 * ============================================================================
 */

const DEFAULT_TASK_RELATIONSHIPS = [
  // 1) Task → Project (PRIMARY)
  {
    relationshipKey: 'project',
    sourceModule: 'tasks',
    targetModule: 'projects',
    relationshipType: 'ONE_TO_MANY', // Project (1) → Tasks (N)
    localField: 'projectId',
    foreignField: '_id',
    required: false,
    userLinkable: false,
    display: {
      coreFields: true,
      relatedSummary: false,
      relatedExplorer: false,
      linkRecord: false
    },
    isDefault: true,
    activateWhenModuleExists: true
  },

  // 2) Task ↔ Event (OPERATIONAL)
  {
    relationshipKey: 'events',
    sourceModule: 'tasks',
    targetModule: 'events',
    relationshipType: 'MANY_TO_MANY',
    userLinkable: true,
    display: {
      relatedSummary: true,
      relatedExplorer: true,
      linkRecord: true
    },
    isDefault: true,
    activateWhenModuleExists: true
  },

  // 3) Task ↔ Deal (OPERATIONAL)
  {
    relationshipKey: 'deals',
    sourceModule: 'tasks',
    targetModule: 'deals',
    relationshipType: 'MANY_TO_MANY',
    userLinkable: true,
    display: {
      relatedSummary: true,
      relatedExplorer: true,
      linkRecord: true
    },
    isDefault: true,
    activateWhenModuleExists: true
  },

  // 4) Task ↔ Case (OPERATIONAL)
  {
    relationshipKey: 'cases',
    sourceModule: 'tasks',
    targetModule: 'cases',
    relationshipType: 'MANY_TO_MANY',
    userLinkable: true,
    display: {
      relatedSummary: true,
      relatedExplorer: true,
      linkRecord: true
    },
    isDefault: true,
    activateWhenModuleExists: true
  },

  // 5) Task ↔ Audit Form (OPERATIONAL)
  {
    relationshipKey: 'forms',
    sourceModule: 'tasks',
    targetModule: 'forms',
    relationshipType: 'MANY_TO_MANY',
    userLinkable: true,
    display: {
      relatedSummary: true,
      relatedExplorer: true,
      linkRecord: true
    },
    isDefault: true,
    activateWhenModuleExists: true
  },

  // 6) Task ↔ Task (Dependency) (OPERATIONAL – ADVANCED)
  {
    relationshipKey: 'dependencies',
    sourceModule: 'tasks',
    targetModule: 'tasks',
    relationshipType: 'MANY_TO_MANY',
    userLinkable: true,
    constraints: {
      preventCircular: true,
      maxDepth: 1
    },
    display: {
      relatedSummary: false,
      relatedExplorer: true,
      linkRecord: true
    },
    isDefault: true,
    isAdvanced: true,
    activateWhenModuleExists: true
  }
];

module.exports = DEFAULT_TASK_RELATIONSHIPS;
