/**
 * ============================================================================
 * Phase 0I.4: Execution Capability Registry Utilities
 * ============================================================================
 * 
 * Pure utility functions for querying execution capabilities.
 * 
 * ⚠️ IMPORTANT: These functions are pure and non-throwing.
 * - Never throw errors
 * - Always return empty arrays or false on invalid input
 * - No permission checks — metadata only
 * - No execution logic — pure queries
 * 
 * Purpose:
 * - Query capabilities by domain, app, action type
 * - Check discovery/execution permissions (metadata level)
 * - Provide Process Designer-safe listings
 * - Enrich Record Context with capabilities
 * 
 * ============================================================================
 */

const {
  getAllExecutionCapabilities,
  getCapabilitiesByDomain,
  getCapability
} = require('../constants/executionCapabilities');

/**
 * Check if an app can discover a capability
 * 
 * ⚠️ This checks metadata only, not actual permissions.
 * 
 * @param {string} appKey - Application key (e.g., 'CRM', 'AUDIT')
 * @param {string} capabilityKey - Capability key (e.g., 'RESPONSE_APPROVE')
 * @returns {boolean} - Whether app can discover the capability
 */
function canDiscoverCapability(appKey, capabilityKey) {
  if (!appKey || !capabilityKey) {
    return false;
  }

  const capability = getCapability(capabilityKey);
  if (!capability) {
    return false;
  }

  const appKeyUpper = appKey.toUpperCase();
  
  // Check if app is in discoverableBy list
  return capability.discoverableBy.includes(appKeyUpper);
}

/**
 * Check if an app can execute a capability
 * 
 * ⚠️ This checks metadata only, not actual permissions or ownership.
 * 
 * @param {string} appKey - Application key (e.g., 'CRM', 'AUDIT')
 * @param {string} capabilityKey - Capability key (e.g., 'RESPONSE_APPROVE')
 * @returns {boolean} - Whether app can execute the capability
 */
function canExecuteCapability(appKey, capabilityKey) {
  if (!appKey || !capabilityKey) {
    return false;
  }

  const capability = getCapability(capabilityKey);
  if (!capability) {
    return false;
  }

  const appKeyUpper = appKey.toUpperCase();
  
  // Check if app is in executableBy list
  return capability.executableBy.includes(appKeyUpper);
}

/**
 * Get capabilities discoverable by Process Designer
 * 
 * Process Designer can discover all capabilities that are:
 * - Marked as discoverable by PROCESS_DESIGNER
 * - Suitable for automation (executionType is 'AUTOMATION' or 'SYSTEM')
 * 
 * @returns {Array} - Array of capability objects
 */
function getCapabilitiesForProcessDesigner() {
  const allCapabilities = Object.values(getAllExecutionCapabilities());
  
  return allCapabilities.filter(cap => {
    // Must be discoverable by Process Designer
    if (!cap.discoverableBy.includes('PROCESS_DESIGNER')) {
      return false;
    }

    // Only automation-capable actions can be used in Process Designer
    // USER actions require human intervention
    return cap.executionType === 'AUTOMATION' || cap.executionType === 'SYSTEM';
  });
}

/**
 * Get capabilities for a record context by domain
 * 
 * Returns capabilities enriched with discovery/execution flags for the requesting app.
 * 
 * @param {string} domain - Execution domain (e.g., 'RESPONSE', 'EVENT')
 * @param {string} appKey - Application key requesting the capabilities (e.g., 'CRM', 'AUDIT')
 * @returns {Array} - Array of capability objects with discovery/execution flags
 */
function getCapabilitiesForRecordContext(domain, appKey = 'CRM') {
  if (!domain) {
    return [];
  }

  const capabilities = getCapabilitiesByDomain(domain);
  const appKeyUpper = (appKey || 'CRM').toUpperCase();

  // Enrich each capability with app-specific flags
  return capabilities.map(cap => ({
    capabilityKey: cap.capabilityKey,
    domain: cap.domain,
    action: cap.action,
    executionOwnerApp: cap.executionOwnerApp,
    executionType: cap.executionType,
    // App-specific flags (metadata only, no permission evaluation)
    allowedToDiscover: canDiscoverCapability(appKey, cap.capabilityKey),
    allowedToExecute: canExecuteCapability(appKey, cap.capabilityKey),
    // Policy information
    auditAppPolicy: cap.auditAppPolicy,
    portalPolicy: cap.portalPolicy,
    // Requirements (for future permission evaluation)
    requiresOwnership: cap.requiresOwnership,
    requiresInstanceActive: cap.requiresInstanceActive,
    // UI hints
    uiHints: cap.uiHints
  }));
}

/**
 * Get capabilities by execution type
 * 
 * @param {string} executionType - Execution type ('USER', 'SYSTEM', 'AUTOMATION')
 * @returns {Array} - Array of capability objects
 */
function getCapabilitiesByExecutionType(executionType) {
  if (!executionType) {
    return [];
  }

  const allCapabilities = Object.values(getAllExecutionCapabilities());
  const typeUpper = executionType.toUpperCase();

  return allCapabilities.filter(cap => cap.executionType === typeUpper);
}

/**
 * Check if a capability is automation-discoverable
 * 
 * @param {string} capabilityKey - Capability key
 * @returns {boolean} - Whether capability is automation-discoverable
 */
function isAutomationDiscoverable(capabilityKey) {
  if (!capabilityKey) {
    return false;
  }

  const capability = getCapability(capabilityKey);
  if (!capability) {
    return false;
  }

  return capability.discoverableBy.includes('PROCESS_DESIGNER') &&
         (capability.executionType === 'AUTOMATION' || capability.executionType === 'SYSTEM');
}

/**
 * Check if a capability is automation-executable
 * 
 * Note: Only CRM can execute, but Process Designer can trigger automation
 * 
 * @param {string} capabilityKey - Capability key
 * @returns {boolean} - Whether capability can be automated
 */
function isAutomationExecutable(capabilityKey) {
  if (!capabilityKey) {
    return false;
  }

  const capability = getCapability(capabilityKey);
  if (!capability) {
    return false;
  }

  // Must be automation-capable and executable by CRM (Process Designer triggers CRM)
  return (capability.executionType === 'AUTOMATION' || capability.executionType === 'SYSTEM') &&
         capability.executableBy.includes('CRM');
}

/**
 * Get all capabilities for a specific app (with discovery/execution flags)
 * 
 * @param {string} appKey - Application key
 * @returns {Array} - Array of capability objects with app-specific flags
 */
function getCapabilitiesForApp(appKey) {
  if (!appKey) {
    return [];
  }

  const allCapabilities = Object.values(getAllExecutionCapabilities());
  const appKeyUpper = appKey.toUpperCase();

  return allCapabilities
    .filter(cap => cap.discoverableBy.includes(appKeyUpper))
    .map(cap => ({
      capabilityKey: cap.capabilityKey,
      domain: cap.domain,
      action: cap.action,
      executionOwnerApp: cap.executionOwnerApp,
      executionType: cap.executionType,
      allowedToDiscover: true, // Already filtered
      allowedToExecute: canExecuteCapability(appKey, cap.capabilityKey),
      auditAppPolicy: cap.auditAppPolicy,
      portalPolicy: cap.portalPolicy,
      requiresOwnership: cap.requiresOwnership,
      requiresInstanceActive: cap.requiresInstanceActive,
      uiHints: cap.uiHints
    }));
}

module.exports = {
  canDiscoverCapability,
  canExecuteCapability,
  getCapabilitiesForProcessDesigner,
  getCapabilitiesForRecordContext,
  getCapabilitiesByExecutionType,
  isAutomationDiscoverable,
  isAutomationExecutable,
  getCapabilitiesForApp
};

