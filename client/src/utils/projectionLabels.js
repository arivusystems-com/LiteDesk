/**
 * ============================================================================
 * Phase 2C: Projection Label Utilities
 * ============================================================================
 * 
 * Utility functions to get user-friendly labels for projection types.
 * Maps internal type enums to display labels based on app context.
 * 
 * ============================================================================
 */

/**
 * Get display label for a projection type
 * @param {string} type - Internal type (e.g., 'LEAD', 'CONTACT', 'MEETING', 'INTERNAL_AUDIT')
 * @param {string} appKey - App key (e.g., 'SALES', 'AUDIT', 'PORTAL')
 * @returns {string} - Display label (e.g., 'Lead', 'Contact', 'Meeting', 'Audit Event')
 */
export function getProjectionTypeLabel(type, appKey = 'SALES') {
  if (!type) return null;

  const normalizedType = String(type).toUpperCase();
  const normalizedAppKey = String(appKey).toUpperCase();

  // PEOPLE types
  if (normalizedType === 'LEAD') {
    return 'Lead';
  }
  if (normalizedType === 'CONTACT') {
    if (normalizedAppKey === 'HELPDESK') {
      return 'Support Contact';
    }
    if (normalizedAppKey === 'AUDIT') {
      return 'Contact';
    }
    return 'Contact';
  }
  if (normalizedType === 'PARTNER') {
    return 'Partner';
  }

  // EVENT types
  if (normalizedType === 'MEETING') {
    return 'Meeting';
  }
  if (normalizedType === 'INTERNAL_AUDIT') {
    if (normalizedAppKey === 'AUDIT') {
      return 'Audit Event';
    }
    return 'Internal Audit';
  }
  if (normalizedType === 'EXTERNAL_AUDIT_SINGLE') {
    if (normalizedAppKey === 'AUDIT') {
      return 'Audit Event';
    }
    return 'External Audit';
  }
  if (normalizedType === 'EXTERNAL_AUDIT_BEAT') {
    if (normalizedAppKey === 'AUDIT') {
      return 'Audit Event';
    }
    return 'External Audit Beat';
  }
  if (normalizedType === 'FIELD_SALES_BEAT') {
    return 'Field Sales Beat';
  }

  // FORM types
  if (normalizedType === 'SURVEY') {
    return 'Survey';
  }
  if (normalizedType === 'AUDIT') {
    if (normalizedAppKey === 'AUDIT') {
      return 'Audit Form';
    }
    return 'Audit';
  }
  if (normalizedType === 'FEEDBACK') {
    return 'Feedback';
  }

  // ORGANIZATION types
  if (normalizedType === 'CUSTOMER') {
    return 'Customer';
  }
  if (normalizedType === 'PARTNER') {
    return 'Partner';
  }
  if (normalizedType === 'VENDOR') {
    return 'Vendor';
  }

  // Fallback: format the type nicely
  return normalizedType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get badge color class for a projection type
 * @param {string} type - Internal type
 * @param {string} appKey - App key
 * @returns {string} - Tailwind CSS classes for badge
 */
export function getProjectionTypeBadgeClass(type, appKey = 'SALES') {
  if (!type) return 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium';

  const normalizedType = String(type).toUpperCase();
  const normalizedAppKey = String(appKey).toUpperCase();

  // PEOPLE types
  if (normalizedType === 'LEAD') {
    return 'px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium';
  }
  if (normalizedType === 'CONTACT') {
    return 'px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium';
  }

  // EVENT types
  if (normalizedType === 'MEETING') {
    return 'px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-medium';
  }
  if (normalizedType === 'INTERNAL_AUDIT' || normalizedType === 'EXTERNAL_AUDIT_SINGLE' || normalizedType === 'EXTERNAL_AUDIT_BEAT') {
    if (normalizedAppKey === 'AUDIT') {
      return 'px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium';
    }
    return 'px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs font-medium';
  }
  if (normalizedType === 'FIELD_SALES_BEAT') {
    return 'px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium';
  }

  // FORM types
  if (normalizedType === 'SURVEY') {
    return 'px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium';
  }
  if (normalizedType === 'AUDIT') {
    if (normalizedAppKey === 'AUDIT') {
      return 'px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium';
    }
    return 'px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs font-medium';
  }
  if (normalizedType === 'FEEDBACK') {
    return 'px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded-full text-xs font-medium';
  }

  // Default
  return 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium';
}

/**
 * Get app label for display
 * @param {string} appKey - App key
 * @returns {string} - Display label (e.g., 'Sales', 'Audit', 'Portal')
 */
export function getAppLabel(appKey) {
  const normalizedAppKey = String(appKey).toUpperCase();
  
  const appLabels = {
    'SALES': 'Sales',
    'AUDIT': 'Audit',
    'PORTAL': 'Portal',
    'HELPDESK': 'Support'
  };

  return appLabels[normalizedAppKey] || normalizedAppKey;
}

