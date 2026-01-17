/**
 * ============================================================================
 * DETACHMENT POLICY (Backend)
 * ============================================================================
 * 
 * Explicit, app-level detachment policy.
 * 
 * This defines which apps allow detachment and under what conditions.
 * 
 * ⚠️ IMPORTANT:
 * - No defaults - explicit per-app decision required
 * - Conservative by default - if not explicitly allowed, disallow
 * - This is a LIFECYCLE decision, not a CRUD action
 * 
 * ============================================================================
 */

/**
 * Detachment policy map
 */
const DETACH_POLICY = {
  SALES: {
    allowed: false,
    reason: 'Sales participation represents business lifecycle. Use deactivate or convert instead.'
  },
  HELPDESK: {
    allowed: false,
    reason: 'Helpdesk participation preserves ticket history and customer relationships.'
  },
  MARKETING: {
    allowed: true,
    requiresConfirmation: true,
    reason: 'Marketing participation can be detached. Campaign history will be preserved.'
  },
  PORTAL: {
    allowed: false,
    reason: 'Portal participation represents user access. Use deactivate instead.'
  },
  AUDIT: {
    allowed: false,
    reason: 'Audit participation preserves compliance history.'
  },
  PROJECTS: {
    allowed: false,
    reason: 'Projects participation preserves project history and assignments.'
  },
  LMS: {
    allowed: false,
    reason: 'LMS participation preserves learning history and progress.'
  }
};

/**
 * Check if detachment is allowed for an app
 * 
 * @param {string} appKey - The app key (e.g., 'SALES', 'MARKETING')
 * @returns {boolean} - True if detachment is allowed
 */
function isDetachAllowed(appKey) {
  const normalizedAppKey = appKey?.toUpperCase();
  const policy = DETACH_POLICY[normalizedAppKey];
  if (!policy) {
    // Conservative default: if no policy defined, disallow
    return false;
  }
  return policy.allowed === true;
}

/**
 * Get detachment reason/message for an app
 * 
 * @param {string} appKey - The app key
 * @returns {string|null} - Reason message or null
 */
function getDetachReason(appKey) {
  const normalizedAppKey = appKey?.toUpperCase();
  const policy = DETACH_POLICY[normalizedAppKey];
  return policy?.reason || null;
}

module.exports = {
  DETACH_POLICY,
  isDetachAllowed,
  getDetachReason
};

