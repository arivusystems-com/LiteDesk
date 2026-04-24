const ASSIGNMENT_TRIGGER_TYPES = ['immediate', 'delayed', 'scheduled'];
const ASSIGNMENT_DISTRIBUTION_MODES = [
  'queue',
  'round_robin',
  'weighted',
  'load_balanced',
  'availability_based'
];
const ASSIGNMENT_REVERT_MODES = ['reapply_rules', 'revert_previous_owner', 'lock_current_owner'];
const ASSIGNMENT_ESCALATION_ACTIONS = ['notify_owner', 'reassign_group', 'notify_leadership'];

module.exports = {
  ASSIGNMENT_TRIGGER_TYPES,
  ASSIGNMENT_DISTRIBUTION_MODES,
  ASSIGNMENT_REVERT_MODES,
  ASSIGNMENT_ESCALATION_ACTIONS
};
