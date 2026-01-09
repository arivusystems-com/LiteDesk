/**
 * ============================================================================
 * Phase 0I.1: App Boundary Enforcement Guards
 * ============================================================================
 * 
 * This middleware enforces hard boundaries between apps to ensure:
 * - CRM owns all Response execution
 * - Audit App never mutates Responses directly
 * - Portal App accesses Responses only through corrective actions
 * 
 * ⚠️ Critical: These guards prevent cross-app state machine duplication
 * ⚠️ These are defensive guards, not business logic
 * 
 * ============================================================================
 */

const { APP_KEYS } = require('../constants/appKeys');
const EXECUTION_DOMAINS = require('../constants/executionDomains');
// Phase 0I.4: Import execution capabilities registry
const {
  canDiscoverCapability,
  canExecuteCapability,
  getCapability
} = require('../utils/executionCapabilityRegistry');

/**
 * Guard: Prevent Audit App from directly mutating Responses
 * Audit App must call CRM controllers internally
 */
function enforceAuditAppReadOnly(req, res, next) {
  // Only applies to Audit App requests
  if (req.appKey !== APP_KEYS.AUDIT) {
    return next();
  }

  // Check if request is trying to mutate Response directly
  const isResponseMutation = req.path.includes('/responses') || 
                             req.path.includes('/form-responses') ||
                             req.body?.executionStatus ||
                             req.body?.reviewStatus;

  if (isResponseMutation && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    console.warn(`[AppBoundaryGuard] BLOCKED: Audit App attempted to mutate Response directly: ${req.method} ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'Audit App cannot mutate Responses directly. All mutations must go through CRM execution gateway.',
      code: 'AUDIT_APP_READ_ONLY'
    });
  }

  next();
}

/**
 * Guard: Prevent Portal App from accessing Responses directly
 * Portal should only see corrective actions
 */
function enforcePortalIndirectAccess(req, res, next) {
  // Only applies to Portal App requests
  if (req.appKey !== APP_KEYS.PORTAL) {
    return next();
  }

  // Check if request is trying to access Response directly
  const isResponseAccess = req.path.includes('/responses') || 
                           req.path.includes('/form-responses') ||
                           (req.query?.module === 'responses');

  if (isResponseAccess) {
    console.warn(`[AppBoundaryGuard] BLOCKED: Portal App attempted to access Response directly: ${req.method} ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'Portal App cannot access Responses directly. Portal should access corrective actions only.',
      code: 'PORTAL_INDIRECT_ACCESS_ONLY'
    });
  }

  next();
}

/**
 * Guard: Ensure CRM execution authority
 * Only CRM can perform execution operations
 */
function enforceCRMExecutionAuthority(req, res, next) {
  // Only check for Response-related execution operations
  const isExecutionOperation = req.path.includes('/responses') && 
                               (req.path.includes('/submit') || 
                                req.path.includes('/approve') ||
                                req.path.includes('/reject') ||
                                req.body?.executionStatus === 'Submitted');

  if (isExecutionOperation && req.appKey !== APP_KEYS.SALES) {
    console.warn(`[AppBoundaryGuard] BLOCKED: Non-CRM app attempted execution operation: ${req.appKey} ${req.method} ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'Only CRM can perform execution operations. Other apps must use CRM execution gateway.',
      code: 'CRM_EXECUTION_AUTHORITY_ONLY'
    });
  }

  next();
}

/**
 * Guard: Validate execution domain access
 * Checks execution domain registry for app access rules
 */
function validateExecutionDomainAccess(req, res, next) {
  // Check if this is a Response-related operation
  const isResponseOperation = req.path.includes('/responses') || 
                              req.path.includes('/form-responses');

  if (!isResponseOperation) {
    return next();
  }

  const responseDomain = EXECUTION_DOMAINS.RESPONSE;
  if (!responseDomain) {
    return next();
  }

  // Check app access rules
  const appAccessRule = responseDomain.appAccessRules?.[req.appKey];
  if (!appAccessRule) {
    // App not in exposedToApps list
    if (!responseDomain.exposedToApps.includes(req.appKey)) {
      console.warn(`[AppBoundaryGuard] BLOCKED: App ${req.appKey} not allowed to access Response domain`);
      return res.status(403).json({
        success: false,
        message: `App ${req.appKey} does not have access to Response execution domain.`,
        code: 'EXECUTION_DOMAIN_ACCESS_DENIED'
      });
    }
  }

  // Validate mode for Audit App
  if (req.appKey === APP_KEYS.AUDIT && appAccessRule?.mode === 'READ_ONLY') {
    if (req.method !== 'GET') {
      console.warn(`[AppBoundaryGuard] BLOCKED: Audit App attempted ${req.method} operation on READ_ONLY domain`);
      return res.status(403).json({
        success: false,
        message: 'Audit App has READ_ONLY access. All mutations must go through CRM execution gateway.',
        code: 'AUDIT_APP_READ_ONLY'
      });
    }
  }

  // Validate mode for Portal App
  if (req.appKey === APP_KEYS.PORTAL && appAccessRule?.mode === 'INDIRECT') {
    // Portal should only access through corrective actions
    if (!req.path.includes('/corrective-actions')) {
      console.warn(`[AppBoundaryGuard] BLOCKED: Portal App attempted direct access to Response domain`);
      return res.status(403).json({
        success: false,
        message: 'Portal App has INDIRECT access. Access Responses through corrective actions only.',
        code: 'PORTAL_INDIRECT_ACCESS_ONLY'
      });
    }
  }

  next();
}

/**
 * Phase 0I.4: Check if app can discover a capability (metadata level)
 * 
 * ⚠️ This is a metadata check only, not a route blocker.
 * Use this to enrich responses with capability visibility flags.
 * 
 * @param {string} appKey - Application key
 * @param {string} capabilityKey - Capability key
 * @returns {boolean} - Whether app can discover the capability
 */
function canAppDiscoverCapability(appKey, capabilityKey) {
  if (!appKey || !capabilityKey) {
    return false;
  }

  return canDiscoverCapability(appKey, capabilityKey);
}

/**
 * Phase 0I.4: Check if app can execute a capability (metadata level)
 * 
 * ⚠️ This is a metadata check only, not a route blocker.
 * Use this to enrich responses with capability execution flags.
 * 
 * Rules (metadata level):
 * - Audit App: May see capabilities, Never execute
 * - Portal: May see limited capabilities, Never execute
 * - CRM: Full execution rights (subject to existing guards)
 * 
 * @param {string} appKey - Application key
 * @param {string} capabilityKey - Capability key
 * @returns {boolean} - Whether app can execute the capability
 */
function canAppExecuteCapability(appKey, capabilityKey) {
  if (!appKey || !capabilityKey) {
    return false;
  }

  // Metadata-level check
  const canExecute = canExecuteCapability(appKey, capabilityKey);

  // Additional metadata validation:
  // Audit App can never execute (even if metadata says discoverable)
  if (appKey === APP_KEYS.AUDIT) {
    return false;
  }

  // Portal can never execute (even if metadata says discoverable)
  if (appKey === APP_KEYS.PORTAL) {
    return false;
  }

  // CRM has full execution rights (subject to existing guards)
  if (appKey === APP_KEYS.SALES) {
    return canExecute;
  }

  return false;
}

/**
 * Phase 0I.4: Get capabilities metadata for an app
 * 
 * Returns capabilities with discovery/execution flags for the requesting app.
 * This is metadata-only, no permission evaluation or ownership checks.
 * 
 * @param {string} appKey - Application key
 * @param {string} domain - Optional execution domain filter
 * @returns {Array} - Array of capability objects with app-specific flags
 */
function getCapabilitiesMetadataForApp(appKey, domain = null) {
  if (!appKey) {
    return [];
  }

  const { getCapabilitiesForApp, getCapabilitiesByDomain } = require('../utils/executionCapabilityRegistry');

  let capabilities;
  if (domain) {
    const { getCapabilitiesForRecordContext } = require('../utils/executionCapabilityRegistry');
    capabilities = getCapabilitiesForRecordContext(domain, appKey);
  } else {
    capabilities = getCapabilitiesForApp(appKey);
  }

  // Enrich with metadata-level validation
  return capabilities.map(cap => {
    const capabilityKey = cap.capabilityKey;
    
    return {
      ...cap,
      // Metadata-level checks (no actual permission evaluation)
      allowedToDiscover: canAppDiscoverCapability(appKey, capabilityKey),
      allowedToExecute: canAppExecuteCapability(appKey, capabilityKey),
      // Policy information
      auditAppPolicy: cap.auditAppPolicy || 'READ_ONLY',
      portalPolicy: cap.portalPolicy || 'READ_ONLY'
    };
  });
}

module.exports = {
  enforceAuditAppReadOnly,
  enforcePortalIndirectAccess,
  enforceCRMExecutionAuthority,
  validateExecutionDomainAccess,
  // Phase 0I.4: Metadata-level capability checks (non-blocking)
  canAppDiscoverCapability,
  canAppExecuteCapability,
  getCapabilitiesMetadataForApp
};
