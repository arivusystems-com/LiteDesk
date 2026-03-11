/**
 * Task module relationship defaults for Settings.
 * Returns empty array so Tasks (and Deals) use only tenant-configured or
 * platform RelationshipDefinition-based relationships (e.g. from linkable-targets).
 */
function buildTaskDefaultRelationshipsForSettings() {
  return [];
}

module.exports = {
  buildTaskDefaultRelationshipsForSettings
};
