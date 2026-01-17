/**
 * ============================================================================
 * Phase 0I: Tenant Provisioning Metadata Service
 * ============================================================================
 * 
 * Provides metadata services for tenant provisioning and lifecycle management.
 * 
 * This service will be consumed later by:
 * - Access resolution
 * - Automation engine
 * - Process Designer
 * - Billing enforcement
 * 
 * NO execution logic — metadata and guardrails only.
 * ============================================================================
 */

const { INSTANCE_STATUS } = require('../constants/instanceLifecycle');

/**
 * Check if instance can access platform (non-terminated)
 * 
 * @param {Object} instance - Instance object with status field
 * @returns {boolean} - True if instance can access platform
 */
function canAccessPlatform(instance) {
  return instance.status !== INSTANCE_STATUS.TERMINATED;
}

/**
 * Check if instance can access apps (trial or active)
 * 
 * @param {Object} instance - Instance object with status field
 * @returns {boolean} - True if instance can access apps
 */
function canAccessApps(instance) {
  return [INSTANCE_STATUS.TRIAL, INSTANCE_STATUS.ACTIVE].includes(instance.status);
}

/**
 * Check if instance is read-only (demo mode)
 * 
 * @param {Object} instance - Instance object with status field
 * @returns {boolean} - True if instance is read-only
 */
function isReadOnly(instance) {
  return instance.status === INSTANCE_STATUS.DEMO;
}

/**
 * Check if execution is blocked for instance
 * 
 * @param {Object} instance - Instance object with status field
 * @returns {boolean} - True if execution is blocked
 */
function isExecutionBlocked(instance) {
  return [INSTANCE_STATUS.SUSPENDED, INSTANCE_STATUS.TERMINATED].includes(instance.status);
}

module.exports = {
  canAccessPlatform,
  canAccessApps,
  isReadOnly,
  isExecutionBlocked
};

