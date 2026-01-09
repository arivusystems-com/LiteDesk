/**
 * ============================================================================
 * Execution Domains Registry
 * ============================================================================
 * 
 * Platform-level registry for execution domains.
 * Execution domains represent first-class execution entities in the platform
 * that drive workflows, corrective actions, approvals, and reporting.
 * 
 * ⚠️ This is PLATFORM metadata, NOT tenant data
 * ⚠️ Defines execution domains, NOT new apps
 * 
 * Phase 0I.1: Responses Registration
 * - Responses are an execution domain within Sales, not a separate app
 * - Sales remains the sole execution authority for Responses
 * - Audit App and Portal consume Response state read-only
 * 
 * ============================================================================
 */

// Phase 0I.3: Import review actions metadata
const { RESPONSE_REVIEW_ACTIONS } = require('./reviewActions');

module.exports = {
  RESPONSE: {
    key: 'RESPONSE',
    label: 'Response',
    sourceApp: 'SALES',
    executionOwner: 'SALES',
    primaryModel: 'FormResponse',
    reviewable: true,
    supportsCorrectiveActions: true,
    exposedToApps: ['AUDIT', 'PORTAL'],
    immutableAfterSubmit: true,

    statuses: {
      executionStatus: [
        'Not Started',
        'In Progress',
        'Submitted'
      ],
      reviewStatus: [
        null,
        'Pending Corrective Action',
        'Needs Auditor Review',
        'Approved',
        'Rejected',
        'Closed'
      ]
    },

    lifecycleOwner: 'SALES',

    // Phase 0I.3: Review actions metadata
    // ⚠️ SAFETY: These are declarative metadata only, not executable logic.
    // All actions are Sales-owned. Audit App and Portal are read-only.
    reviewActions: RESPONSE_REVIEW_ACTIONS,
    
    // Phase 0I.3: Execution ownership metadata
    executionOwnedBy: 'SALES',
    allowsDirectExecution: false,
    auditAppReadOnly: true,
    portalReadOnly: true,

    // Phase 0I.1: Detailed app access rules
    appAccessRules: {
      AUDIT: {
        mode: 'READ_ONLY',
        via: 'Execution Gateway',
        description: 'Audit App never mutates Response directly. All mutations go through Sales controllers.'
      },
      PORTAL: {
        mode: 'INDIRECT',
        via: 'Corrective Actions',
        description: 'Portal does NOT access responses directly. Portal sees Corrective Actions and Evidence uploads. Status derived from FormResponse.reviewStatus.'
      }
    },

    description:
      'Execution record created from form submission. Drives corrective actions, auditor review, and reporting.'
  }
};

