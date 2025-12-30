/**
 * Block Visibility Evaluation Utility (Server-side)
 * 
 * System-driven visibility rules for report blocks during PDF generation.
 * These rules are enforced and cannot be overridden by users.
 */

/**
 * System-defined visibility rules for each block type
 * Uses ReportBlockType enum values (uppercase with underscores)
 */
const SYSTEM_VISIBILITY_RULES = {
  PERFORMANCE_TRENDS: 'HIDE_IF_NO_HISTORY',
  NON_COMPLIANCE_SUMMARY: 'HIDE_IF_NO_NON_COMPLIANCE',
  DETAILED_FINDINGS: 'HIDE_IF_NO_QUESTIONS',
  ACTION_ITEMS: 'HIDE_IF_NO_ACTION_ITEMS'
};

/**
 * Evaluate if a block should be visible based on response data
 * @param {Object} block - The block to evaluate
 * @param {Object} responseData - The form response data
 * @param {Object} context - Additional context (e.g., historical responses count)
 * @returns {boolean} True if block should be visible
 */
function evaluateBlockVisibility(block, responseData, context = {}) {
  // Core blocks are always visible
  if (block.mandatory) {
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
 */
function evaluateSystemVisibilityRule(rule, blockType, responseData, context) {
  switch (rule) {
    case 'HIDE_IF_NO_HISTORY':
      // Performance Trends: visible only if historical responses exist
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
 * Evaluate user-defined visibility rules
 */
function evaluateUserVisibilityRule(rule, responseData, context) {
  switch (rule) {
    case 'ALWAYS':
      return true;
    
    case 'SHOW_IF_DATA_EXISTS':
      return responseData !== null && responseData !== undefined;
    
    case 'HIDE_IF_NO_COMPARISON':
      return (context.previousResponse || null) !== null;
    
    default:
      return true;
  }
}

/**
 * Filter blocks based on visibility rules
 * @param {Array} blocks - Array of blocks to filter
 * @param {Object} responseData - The form response data
 * @param {Object} context - Additional context
 * @returns {Array} Filtered array of visible blocks
 */
function filterVisibleBlocks(blocks, responseData, context = {}) {
  if (!blocks || !Array.isArray(blocks)) {
    return [];
  }

  return blocks.filter(block => {
    return evaluateBlockVisibility(block, responseData, context);
  });
}

/**
 * Get the system visibility rule for a block type
 */
function getSystemVisibilityRule(blockType) {
  return SYSTEM_VISIBILITY_RULES[blockType] || null;
}

/**
 * Check if a block has a system-driven visibility rule
 */
function hasSystemVisibilityRule(blockType) {
  return blockType in SYSTEM_VISIBILITY_RULES;
}

module.exports = {
  evaluateBlockVisibility,
  filterVisibleBlocks,
  getSystemVisibilityRule,
  hasSystemVisibilityRule,
  SYSTEM_VISIBILITY_RULES
};

