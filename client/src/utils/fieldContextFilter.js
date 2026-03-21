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

/** First path segment when it matches a known app surface (lowercase). */
const APP_PATH_PREFIXES = [
  'sales',
  'support',
  'audit',
  'portal',
  'lms',
  'helpdesk',
  'marketing',
  'projects'
];

/**
 * Normalize tenant app key (e.g. SALES, HELPDESK) to field `context` token (lowercase).
 */
export function appKeyToFieldContextToken(appKey) {
  if (appKey == null || appKey === '') return '';
  return String(appKey).trim().toLowerCase();
}

/**
 * Determine current context from route path
 *
 * @param {string} path - Current route path
 * @returns {string} - Current context ('sales', 'support', 'platform', etc.) or 'platform' as default
 */
export function getCurrentContext(path) {
  if (!path) return 'platform';

  const pathOnly = path.split('?')[0] || path;
  const pathParts = pathOnly.split('/').filter((p) => p);

  if (pathParts.length > 0 && APP_PATH_PREFIXES.includes(pathParts[0].toLowerCase())) {
    return pathParts[0].toLowerCase();
  }

  return 'platform';
}

/**
 * Resolve field visibility context: query overrides path (e.g. person record opened from Sales with ?appKey=SALES).
 *
 * @param {string} path - Full path or path+query
 * @param {Record<string, unknown>} [query] - Vue Router query object
 * @returns {string} - 'platform' or lowercase app token (e.g. 'sales', 'helpdesk')
 */
export function resolveFieldContext(path, query = {}) {
  const qApp = query.appKey ?? query.app ?? query.surface;
  if (qApp != null && String(qApp).trim() !== '') {
    return appKeyToFieldContextToken(String(qApp).trim());
  }
  const pathOnly = (path || '').split('?')[0];
  return getCurrentContext(pathOnly);
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
  
  return fields.filter((field) => {
    if (!field) return false;
    // Missing context: treat like global (visible in every surface), aligned with isFieldVisibleInContext
    const fieldContext = field.context != null && String(field.context).trim() !== ''
      ? String(field.context).toLowerCase()
      : 'global';

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

