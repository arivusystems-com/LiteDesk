/**
 * ============================================================================
 * Tenant Metadata Utilities
 * ============================================================================
 * 
 * Helper functions for reading tenant-level app and module configurations.
 * All functions combine platform metadata with tenant overrides.
 * 
 * Rules:
 * - Platform definitions + tenant overrides = effective behavior
 * - Tenant cannot reference unknown platform definitions
 * - Disabled modules hide relationships automatically
 * - All queries are scoped by organizationId
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const TenantAppConfiguration = require('../models/TenantAppConfiguration');
const TenantModuleConfiguration = require('../models/TenantModuleConfiguration');
const TenantRelationshipConfiguration = require('../models/TenantRelationshipConfiguration');
const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');
const RelationshipDefinition = require('../models/RelationshipDefinition');

/**
 * Get enabled apps for a tenant
 * @param {string|ObjectId} organizationId - The organization ID
 * @returns {Promise<Array>} - Array of enabled app configurations
 */
async function getEnabledAppsForTenant(organizationId) {
  try {
    const tenantAppConfigs = await TenantAppConfiguration.find({
      organizationId,
      enabled: true
    }).sort({ appKey: 1 });

    // Validate against platform definitions
    const enabledApps = [];
    for (const config of tenantAppConfigs) {
      const platformApp = await AppDefinition.findOne({ 
        appKey: config.appKey.toLowerCase() 
      });
      
      if (platformApp && platformApp.enabled) {
        enabledApps.push({
          appKey: config.appKey,
          enabled: config.enabled,
          settings: config.settings || {},
          platform: {
            name: platformApp.name,
            description: platformApp.description,
            icon: platformApp.icon,
            capabilities: platformApp.capabilities
          }
        });
      }
    }

    return enabledApps;
  } catch (error) {
    console.error(`[tenantMetadata] Error getting enabled apps for tenant ${organizationId}:`, error);
    return [];
  }
}

/**
 * Get enabled modules for an app within a tenant
 * @param {string|ObjectId} organizationId - The organization ID
 * @param {string} appKey - The app key (e.g., 'CRM', 'AUDIT', 'PORTAL')
 * @returns {Promise<Array>} - Array of enabled module configurations
 */
async function getEnabledModulesForApp(organizationId, appKey) {
  try {
    const tenantModuleConfigs = await TenantModuleConfiguration.find({
      organizationId,
      appKey: appKey.toUpperCase(),
      enabled: true
    }).sort({ 'ui.order': 1, moduleKey: 1 });

    // Validate against platform definitions
    const enabledModules = [];
    for (const config of tenantModuleConfigs) {
      const platformModule = await ModuleDefinition.findOne({
        appKey: appKey.toLowerCase(),
        moduleKey: config.moduleKey
      });

      if (platformModule) {
        enabledModules.push({
          moduleKey: config.moduleKey,
          appKey: config.appKey,
          enabled: config.enabled,
          labelOverride: config.labelOverride || platformModule.label,
          pluralLabel: platformModule.pluralLabel,
          peopleMode: config.peopleMode || null,
          requiredRelationships: config.requiredRelationships || [],
          ui: {
            showInSidebar: config.ui?.showInSidebar !== false,
            order: config.ui?.order || null
          },
          platform: {
            entityType: platformModule.entityType,
            primaryField: platformModule.primaryField,
            peopleConstraints: platformModule.peopleConstraints,
            organizationConstraints: platformModule.organizationConstraints,
            lifecycle: platformModule.lifecycle,
            supports: platformModule.supports,
            permissions: platformModule.permissions
          }
        });
      }
    }

    return enabledModules;
  } catch (error) {
    console.error(`[tenantMetadata] Error getting enabled modules for tenant ${organizationId}, app ${appKey}:`, error);
    return [];
  }
}

/**
 * Get tenant module configuration (with platform defaults)
 * @param {string|ObjectId} organizationId - The organization ID
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<Object|null>} - Module configuration or null if not found/disabled
 */
async function getTenantModuleConfig(organizationId, appKey, moduleKey) {
  try {
    // Get tenant configuration
    const tenantConfig = await TenantModuleConfiguration.findOne({
      organizationId,
      appKey: appKey.toUpperCase(),
      moduleKey: moduleKey.toLowerCase()
    });

    // Get platform definition
    const platformModule = await ModuleDefinition.findOne({
      appKey: appKey.toLowerCase(),
      moduleKey: moduleKey.toLowerCase()
    });

    if (!platformModule) {
      return null; // Module doesn't exist in platform
    }

    // If tenant config exists and is disabled, return null
    if (tenantConfig && !tenantConfig.enabled) {
      return null;
    }

    // Merge platform defaults with tenant overrides
    return {
      moduleKey: moduleKey.toLowerCase(),
      appKey: appKey.toUpperCase(),
      enabled: tenantConfig?.enabled !== false,
      label: tenantConfig?.labelOverride || platformModule.label,
      pluralLabel: platformModule.pluralLabel,
      peopleMode: tenantConfig?.peopleMode || null,
      requiredRelationships: tenantConfig?.requiredRelationships || [],
      ui: {
        showInSidebar: tenantConfig?.ui?.showInSidebar !== false,
        order: tenantConfig?.ui?.order || null
      },
      platform: {
        entityType: platformModule.entityType,
        primaryField: platformModule.primaryField,
        peopleConstraints: platformModule.peopleConstraints,
        organizationConstraints: platformModule.organizationConstraints,
        lifecycle: platformModule.lifecycle,
        supports: platformModule.supports,
        permissions: platformModule.permissions
      }
    };
  } catch (error) {
    console.error(`[tenantMetadata] Error getting module config for tenant ${organizationId}, ${appKey}.${moduleKey}:`, error);
    return null;
  }
}

/**
 * Get effective relationships for a module within a tenant/app context
 * @param {string|ObjectId} organizationId - The organization ID
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<Array>} - Array of effective relationship configurations
 */
async function getEffectiveRelationships(organizationId, appKey, moduleKey) {
  try {
    // Get all platform relationships for this module
    const platformRelationships = await RelationshipDefinition.find({
      $or: [
        { 'source.appKey': appKey.toLowerCase(), 'source.moduleKey': moduleKey.toLowerCase() },
        { 'target.appKey': appKey.toLowerCase(), 'target.moduleKey': moduleKey.toLowerCase() }
      ],
      enabled: true
    });

    // Get tenant relationship overrides
    const tenantRelationshipConfigs = await TenantRelationshipConfiguration.find({
      organizationId,
      relationshipKey: { $in: platformRelationships.map(r => r.relationshipKey) }
    });

    const relationshipConfigMap = new Map(
      tenantRelationshipConfigs.map(config => [config.relationshipKey, config])
    );

    // Build effective relationships
    const effectiveRelationships = [];
    for (const platformRel of platformRelationships) {
      const tenantConfig = relationshipConfigMap.get(platformRel.relationshipKey);

      // Skip if disabled by tenant
      if (tenantConfig && !tenantConfig.enabled) {
        continue;
      }

      // Check if both source and target modules are enabled for tenant
      const sourceModule = await getTenantModuleConfig(
        organizationId,
        platformRel.source.appKey.toUpperCase(),
        platformRel.source.moduleKey
      );
      const targetModule = await getTenantModuleConfig(
        organizationId,
        platformRel.target.appKey.toUpperCase(),
        platformRel.target.moduleKey
      );

      // Skip if either module is disabled
      if (!sourceModule || !targetModule) {
        continue;
      }

      // Merge platform defaults with tenant overrides
      effectiveRelationships.push({
        relationshipKey: platformRel.relationshipKey,
        source: {
          appKey: platformRel.source.appKey.toUpperCase(),
          moduleKey: platformRel.source.moduleKey,
          ...(tenantConfig?.uiOverride?.source || {}),
          ...(tenantConfig?.uiOverride?.source?.showAs === undefined ? { showAs: platformRel.ui.source.showAs } : {}),
          ...(tenantConfig?.uiOverride?.source?.label === undefined ? { label: platformRel.ui.source.label } : {})
        },
        target: {
          appKey: platformRel.target.appKey.toUpperCase(),
          moduleKey: platformRel.target.moduleKey,
          ...(tenantConfig?.uiOverride?.target || {}),
          ...(tenantConfig?.uiOverride?.target?.showAs === undefined ? { showAs: platformRel.ui.target.showAs } : {}),
          ...(tenantConfig?.uiOverride?.target?.label === undefined ? { label: platformRel.ui.target.label } : {})
        },
        cardinality: platformRel.cardinality,
        ownership: platformRel.ownership,
        required: tenantConfig?.requiredOverride !== null ? tenantConfig.requiredOverride : platformRel.required,
        cascade: platformRel.cascade,
        ui: {
          source: {
            showAs: tenantConfig?.uiOverride?.source?.showAs || platformRel.ui.source.showAs,
            label: tenantConfig?.uiOverride?.source?.label || platformRel.ui.source.label
          },
          target: {
            showAs: tenantConfig?.uiOverride?.target?.showAs || platformRel.ui.target.showAs,
            label: tenantConfig?.uiOverride?.target?.label || platformRel.ui.target.label
          },
          picker: platformRel.ui.picker
        },
        automation: platformRel.automation,
        enabled: true
      });
    }

    return effectiveRelationships;
  } catch (error) {
    console.error(`[tenantMetadata] Error getting effective relationships for tenant ${organizationId}, ${appKey}.${moduleKey}:`, error);
    return [];
  }
}

/**
 * Check if an app is enabled for a tenant
 * @param {string|ObjectId} organizationId - The organization ID
 * @param {string} appKey - The app key
 * @returns {Promise<boolean>} - True if app is enabled
 */
async function isAppEnabledForTenant(organizationId, appKey) {
  try {
    const config = await TenantAppConfiguration.findOne({
      organizationId,
      appKey: appKey.toUpperCase(),
      enabled: true
    });

    if (!config) {
      return false;
    }

    // Validate against platform definition
    const platformApp = await AppDefinition.findOne({
      appKey: appKey.toLowerCase(),
      enabled: true
    });

    return !!platformApp;
  } catch (error) {
    console.error(`[tenantMetadata] Error checking if app ${appKey} is enabled for tenant ${organizationId}:`, error);
    return false;
  }
}

/**
 * Check if a module is enabled for a tenant/app
 * @param {string|ObjectId} organizationId - The organization ID
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<boolean>} - True if module is enabled
 */
async function isModuleEnabledForTenant(organizationId, appKey, moduleKey) {
  try {
    const config = await getTenantModuleConfig(organizationId, appKey, moduleKey);
    return !!config && config.enabled;
  } catch (error) {
    console.error(`[tenantMetadata] Error checking if module ${appKey}.${moduleKey} is enabled for tenant ${organizationId}:`, error);
    return false;
  }
}

module.exports = {
  getEnabledAppsForTenant,
  getEnabledModulesForApp,
  getTenantModuleConfig,
  getEffectiveRelationships,
  isAppEnabledForTenant,
  isModuleEnabledForTenant
};

