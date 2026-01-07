/**
 * ============================================================================
 * App Access Utilities
 * ============================================================================
 * 
 * Helper functions for app access validation and management.
 * All functions read from appRegistry.js - no hardcoded role validation.
 * 
 * ============================================================================
 */

const appRegistry = require('../constants/appRegistry');

/**
 * Get app configuration from registry
 * @param {string} appKey - The app key (CRM, AUDIT, PORTAL)
 * @returns {object|null} - App configuration or null if not found
 */
function getAppConfig(appKey) {
  return appRegistry[appKey] || null;
}

/**
 * Validate if a role is valid for an app
 * @param {string} appKey - The app key
 * @param {string} roleKey - The role key to validate
 * @returns {boolean} - True if role is valid for the app
 */
function validateAppRole(appKey, roleKey) {
  const config = getAppConfig(appKey);
  if (!config) {
    return false;
  }
  return config.roles.includes(roleKey);
}

/**
 * Validate if a userType can access an app
 * @param {string} userType - The user type (INTERNAL, EXTERNAL, SYSTEM)
 * @param {string} appKey - The app key
 * @returns {boolean} - True if userType is allowed for the app
 */
function validateUserTypeForApp(userType, appKey) {
  const config = getAppConfig(appKey);
  if (!config) {
    return false;
  }
  return config.userTypesAllowed.includes(userType);
}

/**
 * Get default role for an app
 * @param {string} appKey - The app key
 * @returns {string|null} - Default role key or null if app not found
 */
function getDefaultRoleForApp(appKey) {
  const config = getAppConfig(appKey);
  if (!config) {
    return null;
  }
  return config.defaultRole;
}

/**
 * Get all valid roles for an app
 * @param {string} appKey - The app key
 * @returns {string[]} - Array of valid role keys
 */
function getRolesForApp(appKey) {
  const config = getAppConfig(appKey);
  if (!config) {
    return [];
  }
  return config.roles;
}

/**
 * Get all apps that a userType can access
 * @param {string} userType - The user type
 * @returns {string[]} - Array of app keys
 */
function getAppsForUserType(userType) {
  const apps = [];
  for (const [appKey, config] of Object.entries(appRegistry)) {
    if (config.userTypesAllowed.includes(userType)) {
      apps.push(appKey);
    }
  }
  return apps;
}

/**
 * Check if an app is enabled for an organization
 * Supports both new object structure and legacy string array
 * @param {object} organization - The organization object
 * @param {string} appKey - The app key to check
 * @returns {boolean} - True if app is enabled and active
 */
function isAppEnabledForOrg(organization, appKey) {
  if (!organization || !organization.enabledApps) {
    return false;
  }
  
  // Validate app exists in registry
  if (!getAppConfig(appKey)) {
    return false;
  }
  
  // Check if enabledApps is array of objects (new structure)
  if (organization.enabledApps.length > 0 && typeof organization.enabledApps[0] === 'object' && organization.enabledApps[0] !== null) {
    return organization.enabledApps.some(
      app => app.appKey === appKey && app.status === 'ACTIVE'
    );
  }
  
  // Legacy: array of strings
  return organization.enabledApps.includes(appKey);
}

/**
 * Validate that an app is enabled for an organization
 * Throws error if validation fails
 * @param {object} organization - The organization object
 * @param {string} appKey - The app key to validate
 * @throws {Error} - If app is not enabled or doesn't exist
 */
function validateOrgAppEnabled(organization, appKey) {
  // Validate app exists in registry
  const appConfig = getAppConfig(appKey);
  if (!appConfig) {
    throw new Error(`App ${appKey} is not registered in the system`);
  }
  
  // Check if enabled
  if (!isAppEnabledForOrg(organization, appKey)) {
    throw new Error(`App ${appKey} is not enabled for this organization`);
  }
  
  return true;
}

module.exports = {
  getAppConfig,
  validateAppRole,
  validateUserTypeForApp,
  getDefaultRoleForApp,
  getRolesForApp,
  getAppsForUserType,
  isAppEnabledForOrg,
  validateOrgAppEnabled
};

