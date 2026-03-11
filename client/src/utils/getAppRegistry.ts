/**
 * ============================================================================
 * PLATFORM UI: App Registry Fetcher
 * ============================================================================
 * 
 * Fetches app registry from backend and converts it to AppRegistry format
 * for use with buildSidebarFromRegistry.
 * 
 * ============================================================================
 */

import type { AppRegistry } from '@/types/sidebar.types';
import apiClient from '@/utils/apiClient';

/**
 * Fetch app registry from backend
 * 
 * @returns AppRegistry object ready for buildSidebarFromRegistry
 */
export async function getAppRegistry(): Promise<AppRegistry> {
  try {
    // Fetch apps and their modules from the UI composition API
    const appsResponse = await apiClient('/ui/apps');
    
    if (!appsResponse.success || !appsResponse.data) {
      console.warn('[getAppRegistry] Failed to fetch apps, returning empty registry');
      return {};
    }

    const apps = appsResponse.data;
    const registry: AppRegistry = {};

    // Convert each app to AppRegistryEntry format
    for (const app of apps) {
      // Fetch modules for this app
      let modules = [];
      try {
        const modulesResponse = await apiClient(`/ui/apps/${app.appKey}/modules`);
        if (modulesResponse.success && modulesResponse.data) {
          modules = modulesResponse.data.map((module: any) => ({
            moduleKey: module.moduleKey,
            label: module.label,
            route: module.routeBase || `/${module.moduleKey}`,
            permission: `${module.moduleKey}.view`, // Default permission pattern
            icon: module.icon,
            order: module.sidebarOrder || 0,
            // Navigation intent flags (for four-section sidebar)
            appKey: module.appKey,
            navigationCore: module.navigationCore || false,
            navigationEntity: module.navigationEntity || false,
            excludeFromApps: module.excludeFromApps || false,
            // Legacy flags for backward compatibility
            system: module.system || false,
            coreEntity: module.coreEntity || false,
            // Include list configuration if available
            list: module.list || undefined,
          }));
        }
      } catch (error) {
        console.warn(`[getAppRegistry] Failed to fetch modules for app ${app.appKey}:`, error);
      }

      // Log what we're receiving from backend
      console.log(`[getAppRegistry] App ${app.appKey}:`, {
        name: app.name,
        defaultRoute: app.defaultRoute,
        sidebarOrder: app.sidebarOrder,
        icon: app.icon
      });
      
      // Normalize dashboardRoute to expected format: /dashboard or /dashboard/:appKey
      let dashboardRoute = app.defaultRoute || `/${app.appKey.toLowerCase()}`;
      
      // Preserve special app routes that have their own routing structure
      // (Audit, Portal, Helpdesk, Projects use their own route prefixes)
      const appKeyLower = app.appKey.toLowerCase();
      const specialAppRoutes = ['/audit/', '/portal/', '/helpdesk/', '/projects/'];
      const isSpecialAppRoute = specialAppRoutes.some(prefix => dashboardRoute.startsWith(prefix));
      
      if (isSpecialAppRoute) {
        // Preserve special app routes as-is (e.g., /audit/dashboard, /portal/dashboard)
        // These apps have their own routing structure and layouts
      } else if (dashboardRoute.startsWith(`/${appKeyLower}/`)) {
        // Convert /sales/people -> /dashboard/sales
        dashboardRoute = `/dashboard/${appKeyLower}`;
      } else if (dashboardRoute === `/${appKeyLower}`) {
        // Convert /sales -> /dashboard/sales
        dashboardRoute = `/dashboard/${appKeyLower}`;
      } else if (dashboardRoute !== '/dashboard' && !dashboardRoute.startsWith('/dashboard/')) {
        // For any other unexpected route, default to /dashboard/:appKey
        dashboardRoute = `/dashboard/${appKeyLower}`;
      }
      
      registry[app.appKey] = {
        appKey: app.appKey,
        label: app.name || app.appKey,
        dashboardRoute,
        modules,
        icon: app.icon,
        order: app.sidebarOrder || 0,
      };
      
      // Warn if dashboardRoute is still not /dashboard or /dashboard/:appKey (shouldn't happen after normalization)
      // Exclude special app routes (Audit, Portal, Helpdesk, Projects) which have their own routing structure
      const entry = registry[app.appKey];
      if (!entry) continue;
      const isSpecialRoute = specialAppRoutes.some(prefix => entry.dashboardRoute.startsWith(prefix));
      if (
        !isSpecialRoute &&
        entry.dashboardRoute !== '/dashboard' &&
        !entry.dashboardRoute.startsWith('/dashboard/')
      ) {
        console.warn(
          `[getAppRegistry] App ${app.appKey} has unexpected dashboardRoute: ${entry.dashboardRoute}. Expected /dashboard or /dashboard/:appKey`
        );
      }
    }

    // Also fetch platform/entity modules (appKey: 'platform') for Entities section
    // These are core entities shared across apps (People, Organizations, Tasks, Forms, Items, Events)
    try {
      const entityModulesResponse = await apiClient('/ui/entities');
      if (entityModulesResponse.success && entityModulesResponse.data) {
        const platformModules = entityModulesResponse.data.map((module: any) => ({
          moduleKey: module.moduleKey,
          label: module.label,
          route: module.routeBase || `/${module.moduleKey}`,
          permission: `${module.moduleKey}.view`,
          icon: module.icon,
          order: module.sidebarOrder || 0,
          appKey: module.appKey,
          navigationCore: module.navigationCore || false,
          navigationEntity: module.navigationEntity || false,
          excludeFromApps: module.excludeFromApps || false,
          system: module.system || false,
          coreEntity: module.coreEntity || false,
          list: module.list || undefined,
        }));

        // Add platform modules to a special 'PLATFORM' entry in registry
        // This allows collectAllModules to find them for the Entities section
        registry['PLATFORM'] = {
          appKey: 'PLATFORM',
          label: 'Platform',
          dashboardRoute: '/platform/home',
          modules: platformModules,
          icon: '⚙️',
          order: 0,
        };
      }
    } catch (error) {
      // Platform modules might not exist yet, that's okay
      console.debug('[getAppRegistry] Entity modules not available:', error);
    }

    return registry;
  } catch (error) {
    console.error('[getAppRegistry] Error fetching app registry:', error);
    return {};
  }
}

