/**
 * ============================================================================
 * Phase 1E: Execution Gateway Service
 * ============================================================================
 * 
 * Generic execution gateway that routes capability actions to appropriate handlers.
 * 
 * Purpose:
 * - Single entry point for all execution actions
 * - Routes based on capabilityKey to domain-specific handlers
 * - Validates execution permissions before routing
 * - Maintains execution ownership rules
 * 
 * Core Principle:
 * - Sales remains single execution engine
 * - All execution goes through Sales controllers
 * - Gateway is a routing layer, not a logic layer
 * 
 * ============================================================================
 */

const { getAllExecutionCapabilities } = require('../constants/executionCapabilities');
const EXECUTION_DOMAINS = require('../constants/executionDomains');

/**
 * Get capability metadata by capabilityKey
 */
function getCapability(capabilityKey) {
  const allCapabilities = getAllExecutionCapabilities();
  return allCapabilities[capabilityKey] || null;
}

/**
 * Validate execution permission
 */
function validateExecutionPermission(capability, user, organization, recordId) {
  // Check if capability exists
  if (!capability) {
    return {
      allowed: false,
      error: {
        code: 'CAPABILITY_NOT_FOUND',
        message: `Execution capability '${capabilityKey}' not found`
      }
    };
  }

  // Check if user's app can execute
  const userAppKey = 'SALES'; // For now, all execution is from Sales
  if (!capability.executableBy.includes(userAppKey)) {
    return {
      allowed: false,
      error: {
        code: 'EXECUTION_NOT_ALLOWED',
        message: `App '${userAppKey}' cannot execute capability '${capability.capabilityKey}'`
      }
    };
  }

  // Check instance active requirement
  if (capability.requiresInstanceActive && organization?.subscription?.status === 'suspended') {
    return {
      allowed: false,
      error: {
        code: 'INSTANCE_SUSPENDED',
        message: 'Instance is suspended. Execution is not allowed.'
      }
    };
  }

  return { allowed: true };
}

/**
 * Route execution action to appropriate handler
 */
async function routeExecution(capabilityKey, recordId, params, user, organization) {
  const capability = getCapability(capabilityKey);
  
  if (!capability) {
    throw new Error(`Capability '${capabilityKey}' not found`);
  }

  // Validate permission
  const permissionCheck = validateExecutionPermission(capability, user, organization, recordId);
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.error.message);
  }

  // Route based on domain
  const domain = capability.domain;
  
  switch (domain) {
    case 'RESPONSE':
      return await routeResponseExecution(capability, recordId, params, user, organization);
    
    case 'EVENT':
      return await routeEventExecution(capability, recordId, params, user, organization);
    
    default:
      throw new Error(`Execution domain '${domain}' not supported`);
  }
}

/**
 * Route Response domain execution
 */
async function routeResponseExecution(capability, recordId, params, user, organization) {
  const action = capability.action;
  
  // Import response controller dynamically to avoid circular dependencies
  const responseController = require('../controllers/responseController');
  
  switch (action) {
    case 'APPROVE':
      return await responseController.approveResponse(recordId, user, organization, params);
    
    case 'REJECT':
      return await responseController.rejectResponse(recordId, user, organization, params);
    
    case 'CLOSE':
      return await responseController.closeResponse(recordId, user, organization, params);
    
    default:
      throw new Error(`Response action '${action}' not implemented`);
  }
}

/**
 * Route Event domain execution
 */
async function routeEventExecution(capability, recordId, params, user, organization) {
  const action = capability.action;
  
  // Import event controller dynamically
  const eventController = require('../controllers/eventController');
  
  switch (action) {
    case 'CHECK_IN':
      return await eventController.checkIn(recordId, params.location, user, organization);
    
    case 'SUBMIT':
      return await eventController.submitAudit(recordId, params.formResponseId, params.orgIndex, user, organization);
    
    case 'APPROVE':
      return await eventController.approveAudit(recordId, user, organization);
    
    case 'REJECT':
      return await eventController.rejectAudit(recordId, params.reason, user, organization);
    
    default:
      throw new Error(`Event action '${action}' not implemented`);
  }
}

module.exports = {
  getCapability,
  validateExecutionPermission,
  routeExecution
};

