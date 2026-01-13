/**
 * ============================================================================
 * PLATFORM SIDEBAR: Builder Function
 * ============================================================================
 * 
 * Builds sidebar structure from app registry and user permissions.
 * 
 * Rules:
 * - Registry-driven: All structure comes from appRegistry
 * - Permission-aware: Filters items based on userPermissions
 * - Four sections: core, entities, apps, platform (FIXED ORDER)
 * - Exclusive ownership: Each item belongs to exactly one section
 * - Priority: Core → Entities → Apps → Platform
 * - Core entities never appear under Apps
 * 
 * ============================================================================
 */

import type {
  SidebarStructure,
  SidebarCoreItem,
  SidebarEntityItem,
  SidebarDomain,
  SidebarPlatformItem,
  AppRegistry,
  AppRegistryEntry,
  AppRegistryModule,
  SidebarModule,
} from '@/types/sidebar.types';
import { PermissionOutcome } from '@/types/permission-visibility.types';
import type { PermissionSnapshot } from '@/types/permission-snapshot.types';
import { hasPermission as checkPermission } from '@/types/permission-snapshot.types';
import { memoizeBuilder } from '@/utils/builderCache';
import { validateAppRegistryOrThrow } from '@/utils/validateAppRegistry';

/**
 * Check if user has a specific permission (using snapshot)
 */
function hasPermission(
  permission: string | undefined,
  snapshot: PermissionSnapshot
): boolean {
  return checkPermission(snapshot, permission);
}

/**
 * Convert registry module to sidebar module
 */
function toSidebarModule(
  module: AppRegistryModule,
  snapshot: PermissionSnapshot
): SidebarModule {
  const allowed = hasPermission(module.permission, snapshot);
  const visibility = allowed ? PermissionOutcome.ENABLED : PermissionOutcome.HIDDEN;

  return {
    moduleKey: module.moduleKey,
    label: module.label,
    route: module.route,
    permission: module.permission,
    icon: module.icon,
    order: module.order ?? 999,
    visibility,
  };
}

/**
 * Build core section items
 * 
 * Core items are personal/attention layer items (Home, Inbox, Reports).
 * Virtual items, not modules. Always visible (permission-aware).
 */
function buildCoreSection(
  coreItems: SidebarCoreItem[] = [],
  snapshot: PermissionSnapshot
): SidebarCoreItem[] {
  return coreItems
    .map((item) => {
      const allowed = hasPermission(item.permission, snapshot);
      const visibility = allowed ? PermissionOutcome.ENABLED : PermissionOutcome.HIDDEN;
      return { ...item, visibility };
    })
    .filter((item) => item.visibility !== PermissionOutcome.HIDDEN)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Build entities section (shared system primitives)
 * 
 * Entities are core entities that are shared across apps.
 * Must not appear under Apps section.
 */
function buildEntitiesSection(
  allModules: AppRegistryModule[],
  snapshot: PermissionSnapshot
): SidebarEntityItem[] {
  // Filter modules marked with navigationEntity: true
  const entityModules = allModules.filter(
    (module) => module.navigationEntity === true
  );

  return entityModules
    .map((module) => {
      const allowed = hasPermission(module.permission, snapshot);
      const visibility = allowed ? PermissionOutcome.ENABLED : PermissionOutcome.HIDDEN;

      return {
        key: module.moduleKey,
        label: module.label,
        route: module.route,
        permission: module.permission,
        icon: module.icon,
        order: module.order ?? 999,
        visibility,
      };
    })
    .filter((item) => item.visibility !== PermissionOutcome.HIDDEN)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Build apps section (domain-specific workflows)
 * 
 * Apps are business domains with their modules.
 * Only modules that are NOT marked for Core or Entities sections.
 * Modules marked excludeFromApps: true are excluded.
 */
function buildAppsSection(
  appRegistry: AppRegistry,
  snapshot: PermissionSnapshot
): SidebarDomain[] {
  return Object.values(appRegistry)
    .map((app) => {
      // Filter modules for this app:
      // 1. Must have appKey matching this app (and not 'platform')
      // 2. Must NOT have navigationCore: true
      // 3. Must NOT have navigationEntity: true
      // 4. Must NOT have excludeFromApps: true
      const appModules = (app.modules || []).filter((module) => {
        // Skip if marked for Core section
        if (module.navigationCore === true) {
          return false;
        }
        // Skip if marked for Entities section
        if (module.navigationEntity === true) {
          return false;
        }
        // Skip if explicitly excluded from Apps
        if (module.excludeFromApps === true) {
          return false;
        }
        // Skip if appKey is 'platform' (platform-level entities)
        if (module.appKey && module.appKey.toLowerCase() === 'platform') {
          return false;
        }
        // Must belong to this app
        return module.appKey === app.appKey || (!module.appKey && app.appKey);
      });

      // Convert to sidebar modules
      const children = appModules
        .map((module) => toSidebarModule(module, snapshot))
        .filter((module) => module.visibility !== PermissionOutcome.HIDDEN)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

      const hasAnyAccess =
        children.length > 0 ||
        appModules.some((m) => hasPermission(m.permission, snapshot));

      const visibility = hasAnyAccess ? PermissionOutcome.ENABLED : PermissionOutcome.HIDDEN;

      return {
        appKey: app.appKey,
        label: app.label,
        dashboardRoute: app.dashboardRoute,
        children,
        icon: app.icon,
        order: app.order ?? 999,
        expanded: true, // Default to expanded, can be stored later
        visibility,
      };
    })
    .filter((domain) => domain.visibility !== PermissionOutcome.HIDDEN)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Build platform section (governance items)
 * 
 * Platform items are for system administration and governance.
 * These are typically: Settings, Apps, Users, etc.
 */
function buildPlatformSection(
  platformItems: SidebarPlatformItem[] = [],
  snapshot: PermissionSnapshot
): SidebarPlatformItem[] {
  // Default platform items if none provided
  const defaultPlatformItems: SidebarPlatformItem[] = [
    {
      key: 'settings',
      label: 'Settings',
      route: '/settings',
      permission: 'settings.view',
      icon: 'cog',
      order: 1,
      visibility: PermissionOutcome.ENABLED,
    },
    {
      key: 'apps',
      label: 'Apps',
      route: '/settings/apps',
      permission: 'apps.view',
      icon: 'squares',
      order: 2,
      visibility: PermissionOutcome.ENABLED,
    },
    {
      key: 'users',
      label: 'Users',
      route: '/settings/users',
      permission: 'users.view',
      icon: 'users',
      order: 3,
      visibility: PermissionOutcome.ENABLED,
    },
  ];

  const itemsToUse = platformItems.length > 0 ? platformItems : defaultPlatformItems;

  return itemsToUse
    .map((item) => {
      const allowed = hasPermission(item.permission, snapshot);
      const visibility = allowed ? PermissionOutcome.ENABLED : PermissionOutcome.HIDDEN;
      return { ...item, visibility };
    })
    .filter((item) => item.visibility !== PermissionOutcome.HIDDEN)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Collect all modules from registry
 */
function collectAllModules(appRegistry: AppRegistry): AppRegistryModule[] {
  const allModules: AppRegistryModule[] = [];
  
  for (const app of Object.values(appRegistry)) {
    if (app.modules) {
      for (const module of app.modules) {
        allModules.push(module);
      }
    }
  }
  
  return allModules;
}

/**
 * Build complete sidebar structure from registry and permissions
 * 
 * Enforces exclusive ownership with priority:
 * 1. Core (navigationCore: true)
 * 2. Entities (navigationEntity: true)
 * 3. Apps (appKey && !excludeFromApps && !navigationCore && !navigationEntity)
 * 4. Platform (handled separately)
 * 
 * @param appRegistry - The app registry containing all apps and their modules
 * @param snapshot - Permission snapshot (use createPermissionSnapshot to create)
 * @param coreItems - Optional core section items (defaults to empty)
 * @param platformItems - Optional platform section items (defaults to standard governance items)
 * @param validate - Whether to validate registry (defaults to true in development)
 * @returns Complete sidebar structure with four sections in fixed order
 */
export function buildSidebarFromRegistry(
  appRegistry: AppRegistry,
  snapshot: PermissionSnapshot,
  coreItems: SidebarCoreItem[] = [],
  platformItems: SidebarPlatformItem[] = [],
  validate: boolean = process.env.NODE_ENV === 'development'
): SidebarStructure {
  // Validate registry in development
  if (validate) {
    try {
      validateAppRegistryOrThrow(appRegistry);
    } catch (error) {
      // Log error but don't break in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Registry validation failed:', error);
      }
    }
  }

  // Collect all modules for entities section
  const allModules = collectAllModules(appRegistry);

  // Use memoization for performance
  return memoizeBuilder(
    'buildSidebarFromRegistry',
    appRegistry,
    snapshot,
    coreItems,
    platformItems,
    () => ({
      version: 2, // Increment version for breaking change
      core: buildCoreSection(coreItems, snapshot),
      entities: buildEntitiesSection(allModules, snapshot),
      apps: buildAppsSection(appRegistry, snapshot),
      platform: buildPlatformSection(platformItems, snapshot),
    })
  );
}

