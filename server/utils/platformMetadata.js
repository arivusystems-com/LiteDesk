/**
 * ============================================================================
 * Platform Metadata Utilities
 * ============================================================================
 * 
 * Helper functions for reading platform-level app and module metadata.
 * All functions read from AppDefinition & ModuleDefinition models.
 * 
 * ⚠️ This is READ-ONLY metadata access - no business logic
 * ⚠️ No tenant data, no permissions enforcement
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');

/**
 * Get app definition by appKey
 * @param {string} appKey - The app key (e.g., 'sales', 'helpdesk', 'projects', 'audit')
 * @returns {Promise<Object|null>} - App definition or null if not found
 */
async function getApp(appKey) {
  try {
    const app = await AppDefinition.findOne({ appKey: appKey.toLowerCase() });
    return app;
  } catch (error) {
    console.error(`[platformMetadata] Error getting app ${appKey}:`, error);
    return null;
  }
}

/**
 * Get all modules for a specific app
 * @param {string} appKey - The app key
 * @returns {Promise<Array>} - Array of module definitions
 */
async function getModulesByApp(appKey) {
  try {
    const modules = await ModuleDefinition.find({ appKey: appKey.toLowerCase() })
      .sort({ moduleKey: 1 });
    return modules;
  } catch (error) {
    console.error(`[platformMetadata] Error getting modules for app ${appKey}:`, error);
    return [];
  }
}

/**
 * Get module definition by appKey and moduleKey
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<Object|null>} - Module definition or null if not found
 */
async function getModule(appKey, moduleKey) {
  try {
    const module = await ModuleDefinition.findOne({
      appKey: appKey.toLowerCase(),
      moduleKey: moduleKey.toLowerCase()
    });
    return module;
  } catch (error) {
    console.error(`[platformMetadata] Error getting module ${appKey}.${moduleKey}:`, error);
    return null;
  }
}

/**
 * Check if a module is eligible for automation
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<boolean>} - True if module supports automation
 */
async function isModuleAutomationEligible(appKey, moduleKey) {
  try {
    const module = await getModule(appKey, moduleKey);
    if (!module) {
      return false;
    }
    return module.supports && module.supports.automation === true;
  } catch (error) {
    console.error(`[platformMetadata] Error checking automation eligibility for ${appKey}.${moduleKey}:`, error);
    return false;
  }
}

/**
 * Get all enabled apps
 * @returns {Promise<Array>} - Array of enabled app definitions, sorted by order
 */
async function getAllEnabledApps() {
  try {
    const apps = await AppDefinition.find({ enabled: true })
      .sort({ order: 1, appKey: 1 });
    return apps;
  } catch (error) {
    console.error('[platformMetadata] Error getting enabled apps:', error);
    return [];
  }
}

/**
 * Get all modules across all apps
 * @returns {Promise<Array>} - Array of all module definitions
 */
async function getAllModules() {
  try {
    const modules = await ModuleDefinition.find()
      .sort({ appKey: 1, moduleKey: 1 });
    return modules;
  } catch (error) {
    console.error('[platformMetadata] Error getting all modules:', error);
    return [];
  }
}

/**
 * Check if an app uses people entities
 * @param {string} appKey - The app key
 * @returns {Promise<boolean>} - True if app uses people
 */
async function appUsesPeople(appKey) {
  try {
    const app = await getApp(appKey);
    if (!app) {
      return false;
    }
    return app.capabilities && app.capabilities.usesPeople === true;
  } catch (error) {
    console.error(`[platformMetadata] Error checking if app ${appKey} uses people:`, error);
    return false;
  }
}

/**
 * Check if an app uses organization entities
 * @param {string} appKey - The app key
 * @returns {Promise<boolean>} - True if app uses organizations
 */
async function appUsesOrganization(appKey) {
  try {
    const app = await getApp(appKey);
    if (!app) {
      return false;
    }
    return app.capabilities && app.capabilities.usesOrganization === true;
  } catch (error) {
    console.error(`[platformMetadata] Error checking if app ${appKey} uses organizations:`, error);
    return false;
  }
}

module.exports = {
  getApp,
  getModulesByApp,
  getModule,
  isModuleAutomationEligible,
  getAllEnabledApps,
  getAllModules,
  appUsesPeople,
  appUsesOrganization
};

