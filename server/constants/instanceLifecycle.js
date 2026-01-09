/**
 * ============================================================================
 * Phase 0I: Instance Lifecycle Constants
 * ============================================================================
 * 
 * Single source of truth for instance lifecycle states and transitions.
 * 
 * Lifecycle States:
 * - DEMO: Demo instance (view-only, no execution)
 * - TRIAL: Trial instance (full access, billable)
 * - ACTIVE: Active instance (full access, billable)
 * - SUSPENDED: Suspended instance (no execution, no billing)
 * - TERMINATED: Terminated instance (final state, no access)
 * 
 * Rules:
 * - Status transitions must be validated centrally
 * - No implicit transitions
 * - TERMINATED is final
 * ============================================================================
 */

module.exports = {
  INSTANCE_STATUS: {
    DEMO: 'DEMO',
    TRIAL: 'TRIAL',
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    TERMINATED: 'TERMINATED'
  },

  ALLOWED_TRANSITIONS: {
    DEMO: ['TRIAL', 'TERMINATED'],
    TRIAL: ['ACTIVE', 'SUSPENDED', 'TERMINATED'],
    ACTIVE: ['SUSPENDED', 'TERMINATED'],
    SUSPENDED: ['ACTIVE', 'TERMINATED'],
    TERMINATED: []
  }
};

