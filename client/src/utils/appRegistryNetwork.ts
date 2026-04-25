/**
 * Network-only app registry fetch (parallel module requests).
 * Cached by appShell store — import this only for uncached fetches / tests.
 */

import type { AppRegistry } from '@/types/sidebar.types';
import apiClient from '@/utils/apiClient';

function resolveModulePermission(appKey: string, moduleKey: string): string | undefined {
  const normalizedAppKey = String(appKey || '').toUpperCase();
  const normalizedModuleKey = String(moduleKey || '').toLowerCase();

  if (normalizedAppKey === 'AUDIT') {
    if (normalizedModuleKey === 'audits' || normalizedModuleKey === 'cases' || normalizedModuleKey === 'responses') {
      return undefined;
    }
  }

  return `${moduleKey}.view`;
}

function mapRawModulesToRegistryModules(app: { appKey: string }, modulesData: any[]): any[] {
  if (!modulesData?.length) return [];

  let modules = modulesData.map((module: any) => {
    const normalizedAppKey = String(app.appKey || '').toUpperCase();
    const normalizedModuleKey = String(module.moduleKey || '').toLowerCase();
    let route = module.routeBase || `/${module.moduleKey}`;
    const normalizedRoute = String(route || '').trim().replace(/\/+$/, '');
    const normalizedIncomingLabel = String(module.label || '').toLowerCase();
    const isHelpdeskCaseSurface =
      normalizedAppKey === 'HELPDESK' &&
      (normalizedModuleKey === 'cases' ||
        normalizedModuleKey === 'ticket' ||
        normalizedModuleKey === 'tickets' ||
        normalizedModuleKey === 'ticklets' ||
        normalizedRoute === '/cases' ||
        normalizedRoute === 'cases' ||
        normalizedRoute === '/helpdesk/cases' ||
        normalizedIncomingLabel.includes('ticket') ||
        normalizedIncomingLabel.includes('ticklet'));

    if (isHelpdeskCaseSurface && (normalizedRoute === '/cases' || normalizedRoute === 'cases')) {
      route = '/helpdesk/cases';
    }
    const normalizedLabel = isHelpdeskCaseSurface ? 'Cases' : module.label;

    if (normalizedAppKey === 'AUDIT' && normalizedModuleKey === 'audits') {
      route = '/audit/audits';
    }
    if (normalizedAppKey === 'AUDIT' && normalizedModuleKey === 'cases') {
      route = '/audit/findings';
    }
    if (normalizedAppKey === 'AUDIT' && normalizedModuleKey === 'responses') {
      route = '/audit/responses';
    }

    return {
      moduleKey: module.moduleKey,
      label: normalizedLabel,
      route,
      permission: resolveModulePermission(app.appKey, module.moduleKey),
      icon: module.icon,
      order: module.sidebarOrder || 0,
      appKey: module.appKey,
      navigationCore: module.navigationCore || false,
      navigationEntity: module.navigationEntity || false,
      excludeFromApps: module.excludeFromApps || false,
      system: module.system || false,
      coreEntity: module.coreEntity || false,
      list: module.list || undefined
    };
  });

  if (
    String(app.appKey || '').toUpperCase() === 'AUDIT' &&
    !modules.some((m: any) => String(m.moduleKey || '').toLowerCase() === 'responses')
  ) {
    modules.push({
      moduleKey: 'responses',
      label: 'Responses',
      route: '/audit/responses',
      permission: undefined,
      icon: 'responses',
      order: 3,
      appKey: 'AUDIT',
      navigationCore: false,
      navigationEntity: false,
      excludeFromApps: false,
      system: false,
      coreEntity: false,
      list: undefined
    });
  }

  return modules;
}

export async function fetchAppRegistryFromNetwork(): Promise<AppRegistry> {
  try {
    const appsResponse = await apiClient('/ui/apps');

    if (!appsResponse.success || !appsResponse.data) {
      console.warn('[appRegistryNetwork] Failed to fetch apps, returning empty registry');
      return {};
    }

    const apps = appsResponse.data;

    const modulesByAppKey: Record<string, any[]> = {};
    await Promise.all(
      apps.map(async (app: any) => {
        try {
          const modulesResponse = await apiClient(`/ui/apps/${app.appKey}/modules`);
          if (modulesResponse.success && modulesResponse.data) {
            modulesByAppKey[app.appKey] = mapRawModulesToRegistryModules(app, modulesResponse.data);
          } else {
            modulesByAppKey[app.appKey] = [];
          }
        } catch (error) {
          console.warn(`[appRegistryNetwork] Failed to fetch modules for app ${app.appKey}:`, error);
          modulesByAppKey[app.appKey] = [];
        }
      })
    );

    const registry: AppRegistry = {};

    for (const app of apps) {
      const modules = modulesByAppKey[app.appKey] || [];

      console.log(`[appRegistryNetwork] App ${app.appKey}:`, {
        name: app.name,
        defaultRoute: app.defaultRoute,
        sidebarOrder: app.sidebarOrder,
        icon: app.icon
      });

      const appKeyLower = app.appKey.toLowerCase();
      let dashboardRoute = app.defaultRoute || `/${appKeyLower}`;

      if (dashboardRoute === '/dashboard') {
        dashboardRoute = `/dashboard/${appKeyLower}`;
      }

      if (appKeyLower !== 'sales' && (dashboardRoute === '/sales/dashboard' || dashboardRoute.startsWith('/sales/'))) {
        dashboardRoute = `/dashboard/${appKeyLower}`;
      }

      const specialAppRoutes = ['/audit/', '/portal/', '/helpdesk/', '/projects/'];
      const isSpecialAppRoute = specialAppRoutes.some((prefix) => dashboardRoute.startsWith(prefix));

      if (isSpecialAppRoute) {
        // keep
      } else if (dashboardRoute.startsWith(`/${appKeyLower}/`)) {
        dashboardRoute = `/dashboard/${appKeyLower}`;
      } else if (dashboardRoute === `/${appKeyLower}`) {
        dashboardRoute = `/dashboard/${appKeyLower}`;
      } else if (dashboardRoute !== '/dashboard' && !dashboardRoute.startsWith('/dashboard/')) {
        dashboardRoute = `/dashboard/${appKeyLower}`;
      }

      registry[app.appKey] = {
        appKey: app.appKey,
        label: app.name || app.appKey,
        dashboardRoute,
        modules,
        icon: app.icon,
        order: app.sidebarOrder || 0
      };

      const entry = registry[app.appKey];
      if (!entry) continue;
      const isSpecialRoute = specialAppRoutes.some((prefix) => entry.dashboardRoute.startsWith(prefix));
      if (
        !isSpecialRoute &&
        entry.dashboardRoute !== '/dashboard' &&
        !entry.dashboardRoute.startsWith('/dashboard/')
      ) {
        console.warn(
          `[appRegistryNetwork] App ${app.appKey} has unexpected dashboardRoute: ${entry.dashboardRoute}. Expected /dashboard or /dashboard/:appKey`
        );
      }
    }

    try {
      const entityModulesResponse = await apiClient('/ui/entities');
      if (entityModulesResponse.success && entityModulesResponse.data) {
        const moduleKeysInApps = new Set<string>();
        for (const a of Object.values(registry)) {
          if (!a || a.appKey === 'PLATFORM') continue;
          for (const m of a.modules || []) {
            if (m.moduleKey) moduleKeysInApps.add(m.moduleKey);
          }
        }

        const platformModulesRaw = entityModulesResponse.data.map((module: any) => ({
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
          list: module.list || undefined
        }));

        const platformModules = platformModulesRaw.filter(
          (m: { moduleKey: string }) => !moduleKeysInApps.has(m.moduleKey)
        );

        registry['PLATFORM'] = {
          appKey: 'PLATFORM',
          label: 'Platform',
          dashboardRoute: '/platform/home',
          modules: platformModules,
          icon: '⚙️',
          order: 0
        };
      }
    } catch (error) {
      console.debug('[appRegistryNetwork] Entity modules not available:', error);
    }

    return registry;
  } catch (error) {
    console.error('[appRegistryNetwork] Error fetching app registry:', error);
    return {};
  }
}
