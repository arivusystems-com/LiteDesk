/**
 * ============================================================================
 * Phase 0I: Tenant Defaults (Metadata Only)
 * ============================================================================
 * 
 * Defines expected defaults for TenantAppConfiguration based on instance status.
 * 
 * These are descriptive metadata only — no enforcement logic.
 * Enforcement will be implemented in future phases.
 * ============================================================================
 */

const { INSTANCE_STATUS } = require('./instanceLifecycle');

module.exports = {
  DEMO: {
    appsEnabled: [],
    executionAllowed: false
  },
  TRIAL: {
    appsEnabled: 'AUTO',
    executionAllowed: true
  },
  ACTIVE: {
    appsEnabled: 'CONFIGURED',
    executionAllowed: true
  },
  SUSPENDED: {
    appsEnabled: [],
    executionAllowed: false
  }
};

