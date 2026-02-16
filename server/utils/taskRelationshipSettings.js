const DEFAULT_TASK_RELATIONSHIPS = require('../constants/defaultTaskRelationships');

function normalizeRelationshipType(type) {
  if (!type) {
    return 'lookup';
  }
  return String(type).toLowerCase();
}

function buildTaskDefaultRelationshipsForSettings() {
  const nameMap = {
    project: 'Project',
    events: 'Linked Events',
    deals: 'Linked Deals',
    cases: 'Linked Cases',
    forms: 'Linked Forms',
    dependencies: 'Task Dependencies'
  };

  const labelMap = {
    project: 'Project',
    events: 'Events',
    deals: 'Deals',
    cases: 'Cases',
    forms: 'Forms',
    dependencies: 'Dependencies'
  };

  const inverseNameMap = {
    project: 'Tasks',
    events: 'Tasks',
    deals: 'Tasks',
    cases: 'Tasks',
    forms: 'Tasks',
    dependencies: 'Dependent Tasks'
  };

  return DEFAULT_TASK_RELATIONSHIPS.map((rel) => {
    const relationshipKey = rel.relationshipKey || rel.targetModule;
    const localField = rel.localField || '';
    const foreignField = rel.foreignField || '_id';
    const type = normalizeRelationshipType(rel.relationshipType);

    return {
      relationshipKey,
      name: nameMap[relationshipKey] || relationshipKey,
      type,
      targetModuleKey: rel.targetModule,
      localField,
      foreignField,
      inverseName: inverseNameMap[relationshipKey] || 'Tasks',
      inverseField: '',
      required: !!rel.required,
      unique: false,
      index: !!rel.localField,
      cascadeDelete: false,
      label: labelMap[relationshipKey] || relationshipKey,
      userLinkable: !!rel.userLinkable,
      display: rel.display || {},
      constraints: rel.constraints || null,
      isDefault: !!rel.isDefault,
      isAdvanced: !!rel.isAdvanced,
      activateWhenModuleExists: !!rel.activateWhenModuleExists
    };
  });
}

module.exports = {
  buildTaskDefaultRelationshipsForSettings
};
