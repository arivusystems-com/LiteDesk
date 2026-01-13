/**
 * ============================================================================
 * PLATFORM CORE: UI Composition Service (Phase 0D)
 * ============================================================================
 * 
 * This service composes UI metadata for a tenant based on:
 * - Platform AppDefinition and ModuleDefinition metadata
 * - Tenant enablement (Organization.enabledApps)
 * - Tenant module configurations (TenantModuleConfiguration)
 * - User entitlements (User.allowedApps)
 * 
 * Rules:
 * - Only enabled apps/modules returned
 * - Apply tenant overrides on top of platform metadata
 * - Sort using sidebarOrder
 * - Never throw — return empty arrays on failure
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');
const TenantModuleConfiguration = require('../models/TenantModuleConfiguration');
const Organization = require('../models/Organization');
const { resolveAppAccess } = require('./accessResolutionService');

class UICompositionService {
  /**
   * Get all enabled apps for a tenant with UI metadata
   * Phase 0F: Uses access resolution service to determine accessible apps
   * @param {String} organizationId - Organization ID
   * @param {Object} user - User object (for access resolution)
   * @returns {Promise<Array>} Array of app definitions with UI metadata
   */
  async getUIAppsForTenant(organizationId, user) {
    try {
      // Get organization to check enabledApps
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        console.warn(`[UIComposition] Organization ${organizationId} not found`);
        return [];
      }

      // Handle enabledApps as array of objects or strings (backward compatibility)
      let enabledAppKeys = [];
      if (organization.enabledApps && organization.enabledApps.length > 0) {
        // Check if enabledApps is array of objects (new structure)
        if (typeof organization.enabledApps[0] === 'object' && organization.enabledApps[0] !== null) {
          enabledAppKeys = organization.enabledApps
            .filter(app => app.status === 'ACTIVE')
            .map(app => app.appKey);
        } else {
          // Legacy: array of strings
          enabledAppKeys = organization.enabledApps;
        }
      } else {
        // Default to Sales for backward compatibility
        enabledAppKeys = ['SALES'];
      }
      
      const appKeysLower = enabledAppKeys.map(app => app.toLowerCase());
      
      // Get app definitions for enabled apps
      // EXCLUDE CONTROL_PLANE - it's platform-only, never shown to tenants
      const appDefinitions = await AppDefinition.find({
        appKey: { $in: appKeysLower, $ne: 'control_plane' }, // Explicitly exclude CONTROL_PLANE
        enabled: true
      }).sort({ 'ui.sidebarOrder': 1, order: 1 });

      // Map to UI format
      let uiApps = appDefinitions.map(app => {
        let defaultRoute = app.ui?.defaultRoute || '/dashboard';
        
        // Normalize invalid routes (fix for old data)
        if (defaultRoute === '/portal/me') {
          // /portal/me is an API endpoint, not a frontend route
          defaultRoute = '/portal/dashboard';
        }
        
        return {
          appKey: app.appKey.toUpperCase(),
          name: app.name,
          description: app.description,
          icon: app.ui?.icon || app.icon,
          defaultRoute: defaultRoute,
          showInAppSwitcher: app.ui?.showInAppSwitcher !== false,
          sidebarOrder: app.ui?.sidebarOrder ?? app.order ?? 0
        };
      });

      // Phase 0F: Use access resolution service to filter apps
      // Owner sees all enabled apps (ADMIN access), non-owners see only apps with EXECUTION access
      // CONTROL_PLANE is explicitly excluded (platform-only, never shown to tenants)
      const accessibleApps = [];
      for (const app of uiApps) {
        // Skip CONTROL_PLANE - it's platform-only, never shown to tenants
        if (app.appKey.toUpperCase() === 'CONTROL_PLANE') {
          continue;
        }
        
        try {
          const accessResult = await resolveAppAccess({
            user: user,
            organization: organization,
            appKey: app.appKey,
            intent: 'VIEW' // App switcher just needs VIEW access
          });

          if (accessResult.allowed) {
            accessibleApps.push(app);
          }
        } catch (error) {
          console.warn(`[UIComposition] Error resolving access for app ${app.appKey}:`, error);
          // On error, fall back to legacy check for backward compatibility
          const userAllowedApps = user.allowedApps || [];
          if (userAllowedApps.includes(app.appKey)) {
            accessibleApps.push(app);
          }
        }
      }

      return accessibleApps;
    } catch (error) {
      console.error('[UIComposition] Error getting apps for tenant:', error);
      return [];
    }
  }

  /**
   * Get all enabled modules for an app with UI metadata
   * @param {String} organizationId - Organization ID
   * @param {String} appKey - App key (e.g., 'SALES', 'AUDIT')
   * @returns {Promise<Array>} Array of module definitions with UI metadata
   */
  async getUIModulesForApp(organizationId, appKey) {
    try {
      const appKeyLower = appKey.toLowerCase();

      // Get all module definitions for this app
      const moduleDefinitions = await ModuleDefinition.find({
        appKey: appKeyLower
      });

      // Get tenant module configurations
      const tenantConfigs = await TenantModuleConfiguration.find({
        organizationId,
        appKey: appKey.toUpperCase(),
        enabled: true
      });

      // Create a map of tenant configs by moduleKey
      const tenantConfigMap = {};
      tenantConfigs.forEach(config => {
        tenantConfigMap[config.moduleKey] = config;
      });

      // Compose UI metadata for each enabled module
      const uiModules = [];

      for (const moduleDef of moduleDefinitions) {
        const tenantConfig = tenantConfigMap[moduleDef.moduleKey];

        // Skip if tenant has explicitly disabled this module
        if (tenantConfig && !tenantConfig.enabled) {
          continue;
        }

        // Apply tenant overrides on top of platform metadata
        const uiModule = {
          moduleKey: moduleDef.moduleKey,
          appKey: moduleDef.appKey.toUpperCase(),
          label: tenantConfig?.labelOverride || moduleDef.label,
          pluralLabel: moduleDef.pluralLabel,
          routeBase: moduleDef.ui?.routeBase || `/${moduleDef.moduleKey}`,
          icon: moduleDef.ui?.icon,
          showInSidebar: tenantConfig?.ui?.showInSidebar !== false && 
                        (moduleDef.ui?.showInSidebar !== false),
          sidebarOrder: tenantConfig?.ui?.sidebarOrder ?? 
                       tenantConfig?.ui?.order ?? 
                       moduleDef.ui?.sidebarOrder ?? 
                       0,
          createLabel: moduleDef.ui?.createLabel || `Create ${moduleDef.label}`,
          listLabel: moduleDef.ui?.listLabel || `All ${moduleDef.pluralLabel}`,
          // Navigation intent flags (for four-section sidebar)
          navigationCore: moduleDef.ui?.navigationCore || false,
          navigationEntity: moduleDef.ui?.navigationEntity || false,
          excludeFromApps: moduleDef.ui?.excludeFromApps || false,
          // Legacy flags for backward compatibility
          system: moduleDef.system || false,
          coreEntity: moduleDef.coreEntity || false
        };

        uiModules.push(uiModule);
      }

      // Sort by sidebarOrder
      uiModules.sort((a, b) => a.sidebarOrder - b.sidebarOrder);

      return uiModules;
    } catch (error) {
      console.error('[UIComposition] Error getting modules for app:', error);
      return [];
    }
  }

  /**
   * Get complete sidebar definition for a tenant
   * Phase 0F: Uses access resolution service
   * @param {String} organizationId - Organization ID
   * @param {Object} user - User object (for access resolution)
   * @returns {Promise<Object>} Sidebar definition with apps and modules
   */
  async getSidebarDefinition(organizationId, user) {
    try {
      const apps = await this.getUIAppsForTenant(organizationId, user);
      
      const sidebar = {
        apps: []
      };

      for (const app of apps) {
        const modules = await this.getUIModulesForApp(organizationId, app.appKey);
        
        sidebar.apps.push({
          ...app,
          modules: modules.filter(m => m.showInSidebar)
        });
      }

      return sidebar;
    } catch (error) {
      console.error('[UIComposition] Error getting sidebar definition:', error);
      return { apps: [] };
    }
  }

  /**
   * Get route definitions for dynamic route injection
   * Phase 0F: Uses access resolution service
   * @param {String} organizationId - Organization ID
   * @param {Object} user - User object (for access resolution)
   * @returns {Promise<Array>} Array of route definitions
   */
  async getRouteDefinitions(organizationId, user) {
    try {
      const apps = await this.getUIAppsForTenant(organizationId, user);
      const routes = [];

      for (const app of apps) {
        const modules = await this.getUIModulesForApp(organizationId, app.appKey);
        
        for (const module of modules) {
          // List route
          routes.push({
            path: module.routeBase,
            name: `${module.moduleKey}-list`,
            appKey: module.appKey,
            moduleKey: module.moduleKey,
            type: 'list'
          });

          // Detail route (if module supports it)
          routes.push({
            path: `${module.routeBase}/:id`,
            name: `${module.moduleKey}-detail`,
            appKey: module.appKey,
            moduleKey: module.moduleKey,
            type: 'detail'
          });

          // Create route (if module supports creation)
          routes.push({
            path: `${module.routeBase}/new`,
            name: `${module.moduleKey}-create`,
            appKey: module.appKey,
            moduleKey: module.moduleKey,
            type: 'create'
          });
        }
      }

      return routes;
    } catch (error) {
      console.error('[UIComposition] Error getting route definitions:', error);
      return [];
    }
  }
}

// Singleton instance
const uiCompositionService = new UICompositionService();

module.exports = uiCompositionService;

