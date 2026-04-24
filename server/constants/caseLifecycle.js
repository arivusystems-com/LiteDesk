const CASE_TYPES = ['Support Ticket', 'Complaint', 'Service Request', 'Warranty Claim', 'Internal Case'];
const CASE_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const CASE_STATUSES = ['New', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
const CASE_CHANNELS = ['Email', 'Live Chat', 'Phone', 'Customer Portal', 'Partner Portal', 'Internal'];

// Locked lifecycle contract for Helpdesk Cases.
const CASE_STATUS_TRANSITIONS = {
  New: ['Assigned'],
  Assigned: ['In Progress', 'On Hold'],
  'In Progress': ['On Hold', 'Resolved'],
  'On Hold': ['In Progress', 'Resolved'],
  Resolved: ['Closed'],
  Closed: []
};

module.exports = {
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_STATUSES,
  CASE_CHANNELS,
  CASE_STATUS_TRANSITIONS
};
