/**
 * ============================================================================
 * Phase 2A.1: Module Projection Resolver Utility
 * ============================================================================
 * 
 * Utility functions to resolve projection metadata for apps and modules.
 * 
 * ⚠️ SAFETY RULES:
 * - Must fall back safely
 * - Must never throw
 * - Must not enforce permissions (metadata only)
 * - Must not filter queries (metadata only)
 * - Must not mutate data (read-only)
 * 
 * This is metadata resolution only - no behavior changes.
 * 
 * ============================================================================
 */

const moduleProjections = require('../constants/moduleProjections');

/**
 * Get projection metadata for an app and module combination
 * @param {string} appKey - App key (e.g., 'CRM', 'AUDIT', 'PORTAL')
 * @param {string} moduleKey - Module key (e.g., 'people', 'organizations', 'events', 'forms')
 * @returns {Object|null} - Projection metadata or null if not found
 */
function getProjection(appKey, moduleKey) {
  try {
    if (!appKey || !moduleKey) {
      return null;
    }

    const normalizedAppKey = (appKey || '').toUpperCase();
    const normalizedModuleKey = (moduleKey || '').toLowerCase();

    // Find the projection primitive that matches this module
    const projectionPrimitive = Object.values(moduleProjections).find(
      projection => projection.baseModuleKey === normalizedModuleKey
    );

    if (!projectionPrimitive) {
      return null;
    }

    // Get app-specific projection config
    const appProjection = projectionPrimitive.apps[normalizedAppKey];
    if (!appProjection) {
      return null;
    }

    return {
      platformOwned: projectionPrimitive.platformOwned,
      baseModuleKey: projectionPrimitive.baseModuleKey,
      types: projectionPrimitive.types,
      appKey: normalizedAppKey,
      allowedTypes: appProjection.allowedTypes || [],
      defaultType: appProjection.defaultType || null,
      readOnly: appProjection.readOnly || false,
      behaviors: appProjection.behaviors || {}
    };
  } catch (error) {
    console.error('[moduleProjectionResolver] Error getting projection:', error);
    return null;
  }
}

/**
 * Get allowed types for an app and module combination
 * @param {string} appKey - App key
 * @param {string} moduleKey - Module key
 * @returns {string[]} - Array of allowed types, empty array if not found
 */
function getAllowedTypes(appKey, moduleKey) {
  try {
    const projection = getProjection(appKey, moduleKey);
    return projection ? (projection.allowedTypes || []) : [];
  } catch (error) {
    console.error('[moduleProjectionResolver] Error getting allowed types:', error);
    return [];
  }
}

/**
 * Check if a type is allowed for an app and module combination
 * @param {string} appKey - App key
 * @param {string} moduleKey - Module key
 * @param {string} type - Type to check (e.g., 'LEAD', 'CONTACT', 'AUDIT')
 * @returns {boolean} - True if type is allowed, false otherwise
 */
function isTypeAllowed(appKey, moduleKey, type) {
  try {
    if (!type) {
      return false;
    }

    const normalizedType = (type || '').toUpperCase();
    const allowedTypes = getAllowedTypes(appKey, moduleKey);

    // If no projection exists or no allowed types, return false
    if (allowedTypes.length === 0) {
      return false;
    }

    return allowedTypes.includes(normalizedType);
  } catch (error) {
    console.error('[moduleProjectionResolver] Error checking type allowed:', error);
    return false;
  }
}

/**
 * Check if projection is read-only for an app and module combination
 * @param {string} appKey - App key
 * @param {string} moduleKey - Module key
 * @returns {boolean} - True if read-only, false otherwise
 */
function isReadOnlyProjection(appKey, moduleKey) {
  try {
    const projection = getProjection(appKey, moduleKey);
    return projection ? (projection.readOnly || false) : false;
  } catch (error) {
    console.error('[moduleProjectionResolver] Error checking read-only:', error);
    return false;
  }
}

/**
 * Get default type for an app and module combination
 * @param {string} appKey - App key
 * @param {string} moduleKey - Module key
 * @returns {string|null} - Default type or null if not found
 */
function getDefaultType(appKey, moduleKey) {
  try {
    const projection = getProjection(appKey, moduleKey);
    return projection ? (projection.defaultType || null) : null;
  } catch (error) {
    console.error('[moduleProjectionResolver] Error getting default type:', error);
    return null;
  }
}

/**
 * Get base primitive for a module key
 * @param {string} moduleKey - Module key
 * @returns {string|null} - Base primitive key (e.g., 'PEOPLE', 'ORGANIZATION') or null
 */
function getBasePrimitive(moduleKey) {
  try {
    if (!moduleKey) {
      return null;
    }

    const normalizedModuleKey = (moduleKey || '').toLowerCase();
    const projectionPrimitive = Object.entries(moduleProjections).find(
      ([_, projection]) => projection.baseModuleKey === normalizedModuleKey
    );

    return projectionPrimitive ? projectionPrimitive[0] : null;
  } catch (error) {
    console.error('[moduleProjectionResolver] Error getting base primitive:', error);
    return null;
  }
}

/**
 * Check if a module is a platform-owned primitive
 * @param {string} moduleKey - Module key
 * @returns {boolean} - True if platform-owned primitive, false otherwise
 */
function isPlatformOwnedPrimitive(moduleKey) {
  try {
    const basePrimitive = getBasePrimitive(moduleKey);
    if (!basePrimitive) {
      return false;
    }

    const projection = moduleProjections[basePrimitive];
    return projection ? (projection.platformOwned || false) : false;
  } catch (error) {
    console.error('[moduleProjectionResolver] Error checking platform owned:', error);
    return false;
  }
}

module.exports = {
  getProjection,
  getAllowedTypes,
  isTypeAllowed,
  isReadOnlyProjection,
  getDefaultType,
  getBasePrimitive,
  isPlatformOwnedPrimitive
};

