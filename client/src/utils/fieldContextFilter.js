/**
 * Field Context Filtering Utilities
 * 
 * Filters fields based on their context property and the current app context.
 * 
 * Rules:
 * - context = 'global' → visible in all contexts
 * - context = '<app>' (e.g. 'sales') → visible ONLY in that app context
 * - If current context is 'platform' or unknown → show ONLY global fields
 */

/**
 * Determine current context from route path
 * 
 * @param {string} path - Current route path
 * @returns {string} - Current context ('sales', 'support', 'platform', etc.) or 'platform' as default
 */
export function getCurrentContext(path) {
  if (!path) return 'platform';
  
  // Extract context from path
  // Examples:
  // /sales/deals → 'sales'
  // /support/tickets → 'support'
  // /people → 'platform'
  // /deals → 'platform' (legacy, no app prefix)
  
  const pathParts = path.split('/').filter(p => p);
  
  // Check for app prefixes in path
  // Common app contexts: sales, support, audit, portal, lms
  const appContexts = ['sales', 'support', 'audit', 'portal', 'lms'];
  
  if (pathParts.length > 0 && appContexts.includes(pathParts[0].toLowerCase())) {
    return pathParts[0].toLowerCase();
  }
  
  // Default to platform context
  return 'platform';
}

/**
 * Filter fields by context
 * 
 * @param {Array} fields - Array of field definitions
 * @param {string} currentContext - Current app context ('sales', 'support', 'platform', etc.)
 * @returns {Array} - Filtered fields
 */
export function filterFieldsByContext(fields, currentContext) {
  if (!Array.isArray(fields)) return [];
  if (!currentContext) currentContext = 'platform'; // Safe default
  
  return fields.filter(field => {
    if (!field || !field.context) {
      // If context is missing, default to 'global' for backward compatibility
      // But only show in platform context as a safe default
      return currentContext === 'platform';
    }
    
    const fieldContext = field.context.toLowerCase();
    
    // Global fields are visible everywhere
    if (fieldContext === 'global') {
      return true;
    }
    
    // App-specific fields are visible only in their app context
    if (currentContext === 'platform') {
      // Platform context shows ONLY global fields
      return false;
    }
    
    // In app context, show fields for that app OR global fields
    return fieldContext === currentContext.toLowerCase();
  });
}

/**
 * Check if a field should be visible in the current context
 * 
 * @param {Object} field - Field definition
 * @param {string} currentContext - Current app context
 * @returns {boolean} - True if field should be visible
 */
export function isFieldVisibleInContext(field, currentContext) {
  if (!field) return false;
  if (!currentContext) currentContext = 'platform';
  
  const fieldContext = field.context?.toLowerCase() || 'global';
  
  // Global fields are visible everywhere
  if (fieldContext === 'global') {
    return true;
  }
  
  // Platform context shows ONLY global fields
  if (currentContext === 'platform') {
    return false;
  }
  
  // App context shows fields for that app OR global
  return fieldContext === currentContext.toLowerCase();
}

