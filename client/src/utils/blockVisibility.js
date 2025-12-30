/**
 * Block Visibility Evaluation Utility
 * 
 * System-driven visibility rules that determine if blocks should be rendered
 * based on available data. These rules cannot be overridden by users.
 */

/**
 * System-defined visibility rules for each block type
 * These rules are enforced and cannot be changed by users
 */
const SYSTEM_VISIBILITY_RULES = {
  performance_trends: 'HIDE_IF_NO_HISTORY',
  non_compliance_summary: 'HIDE_IF_NO_NON_COMPLIANCE',
  detailed_findings: 'HIDE_IF_NO_QUESTIONS',
  action_items_summary: 'HIDE_IF_NO_ACTION_ITEMS'
};

/**
 * Evaluate if a block should be visible based on response data
 * @param {Object} block - The block to evaluate
 * @param {Object} responseData - The form response data
 * @param {Object} context - Additional context (e.g., historical responses count)
 * @returns {boolean} True if block should be visible
 */
export function evaluateBlockVisibility(block, responseData = null, context = {}) {
  // Core blocks are always visible
  if (block.mandatory) {
    return true;
  }

  // If no response data provided, show block (for template builder preview)
  if (!responseData) {
    return true;
  }

  // Get system visibility rule for this block type
  const systemRule = SYSTEM_VISIBILITY_RULES[block.type];
  
  // If no system rule, check user-defined visibility rule
  if (!systemRule) {
    return evaluateUserVisibilityRule(block.visibilityRule || 'ALWAYS', responseData, context);
  }

  // Evaluate system-driven rule (these cannot be overridden)
  return evaluateSystemVisibilityRule(systemRule, block.type, responseData, context);
}

/**
 * Evaluate system-driven visibility rules
 * @param {string} rule - The system rule to evaluate
 * @param {string} blockType - The block type
 * @param {Object} responseData - The form response data
 * @param {Object} context - Additional context
 * @returns {boolean}
 */
function evaluateSystemVisibilityRule(rule, blockType, responseData, context) {
  switch (rule) {
    case 'HIDE_IF_NO_HISTORY':
      // Performance Trends: visible only if historical responses exist
      // context.historicalResponsesCount should be provided
      return (context.historicalResponsesCount || 0) > 0;

    case 'HIDE_IF_NO_NON_COMPLIANCE':
      // Non-Compliance Summary: visible only if failed items exist
      if (!responseData.sectionScores || !Array.isArray(responseData.sectionScores)) {
        return false;
      }
      const totalFailed = responseData.sectionScores.reduce((sum, section) => {
        return sum + (section.failed || 0);
      }, 0);
      return totalFailed > 0;

    case 'HIDE_IF_NO_QUESTIONS':
      // Detailed Findings: visible only if questions exist
      if (!responseData.responseDetails || !Array.isArray(responseData.responseDetails)) {
        return false;
      }
      return responseData.responseDetails.length > 0;

    case 'HIDE_IF_NO_ACTION_ITEMS':
      // Action Items: visible only if corrective actions exist
      if (!responseData.correctiveActions || !Array.isArray(responseData.correctiveActions)) {
        return false;
      }
      return responseData.correctiveActions.length > 0;

    default:
      return true;
  }
}

/**
 * Evaluate user-defined visibility rules (for non-system blocks)
 * @param {string} rule - The user-defined rule
 * @param {Object} responseData - The form response data
 * @param {Object} context - Additional context
 * @returns {boolean}
 */
function evaluateUserVisibilityRule(rule, responseData, context) {
  switch (rule) {
    case 'ALWAYS':
      return true;
    
    case 'SHOW_IF_DATA_EXISTS':
      // Generic check - block should determine what "data exists" means
      return responseData !== null && responseData !== undefined;
    
    case 'HIDE_IF_NO_COMPARISON':
      // Hide if no comparison data available
      return (context.previousResponse || null) !== null;
    
    default:
      return true;
  }
}

/**
 * Get the system visibility rule for a block type
 * @param {string} blockType - The block type
 * @returns {string|null} The system rule or null if none
 */
export function getSystemVisibilityRule(blockType) {
  return SYSTEM_VISIBILITY_RULES[blockType] || null;
}

/**
 * Check if a block has a system-driven visibility rule
 * @param {string} blockType - The block type
 * @returns {boolean}
 */
export function hasSystemVisibilityRule(blockType) {
  return blockType in SYSTEM_VISIBILITY_RULES;
}

export default {
  evaluateBlockVisibility,
  getSystemVisibilityRule,
  hasSystemVisibilityRule,
  SYSTEM_VISIBILITY_RULES
};

