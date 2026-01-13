/**
 * ============================================================================
 * PLATFORM COMMAND PALETTE: Builder Function
 * ============================================================================
 * 
 * Builds command palette from sidebar, dashboard, and app registry.
 * 
 * Rules:
 * - Registry-driven: All commands come from existing structures
 * - Permission-aware: Filters commands based on permissions
 * - No duplication: Commands derived from sidebar/dashboard, not redefined
 * - Keyboard-first: All navigation paths accessible via keyboard
 * 
 * ============================================================================
 */

import type {
  CommandItem,
  CommandPaletteDefinition,
  CommandScope,
  CommandCategory,
} from '@/types/command.types';
import type { PermissionOutcome } from '@/types/permission-visibility.types';
import type { SidebarStructure } from '@/types/sidebar.types';
import type { DashboardDefinition } from '@/types/dashboard.types';
import type { AppRegistry } from '@/types/sidebar.types';

/**
 * Check if command should be included based on visibility
 */
function shouldIncludeCommand(visibility: PermissionOutcome): boolean {
  return visibility !== 'HIDDEN';
}

/**
 * Build commands from core sidebar items
 */
function buildCoreCommands(
  coreItems: SidebarStructure['core'],
  scope: CommandScope = 'GLOBAL'
): CommandItem[] {
  return coreItems
    .filter((item) => shouldIncludeCommand(item.visibility))
    .map((item) => ({
      id: `core-${item.key}`,
      label: item.label,
      description: `Navigate to ${item.label}`,
      icon: item.icon,
      route: item.route,
      scope,
      permission: item.permission,
      visibility: item.visibility,
      category: 'navigation' as CommandCategory,
      keywords: [item.label.toLowerCase(), item.key],
      order: item.order ?? 999,
    }));
}

/**
 * Build commands from entities section
 */
function buildEntityCommands(
  entities: SidebarStructure['entities']
): CommandItem[] {
  return entities
    .filter((entity) => shouldIncludeCommand(entity.visibility))
    .map((entity) => ({
      id: `entity-${entity.key}`,
      label: entity.label,
      description: `Navigate to ${entity.label}`,
      icon: entity.icon,
      route: entity.route,
      scope: 'GLOBAL' as CommandScope,
      permission: entity.permission,
      visibility: entity.visibility,
      category: 'navigation' as CommandCategory,
      keywords: [entity.label.toLowerCase(), entity.key],
      order: entity.order ?? 999,
    }));
}

/**
 * Build commands from app headers
 */
function buildAppCommands(
  apps: SidebarStructure['apps']
): CommandItem[] {
  return apps
    .filter((app) => shouldIncludeCommand(app.visibility))
    .map((app) => ({
      id: `app-${app.appKey}`,
      label: app.label,
      description: `Open ${app.label} dashboard`,
      icon: app.icon,
      route: app.dashboardRoute,
      scope: 'APP' as CommandScope,
      visibility: app.visibility,
      category: 'apps' as CommandCategory,
      appKey: app.appKey,
      keywords: [app.label.toLowerCase(), app.appKey.toLowerCase(), 'dashboard'],
      order: app.order ?? 999,
    }));
}

/**
 * Build commands from app modules
 */
function buildModuleCommands(
  apps: SidebarStructure['apps']
): CommandItem[] {
  const commands: CommandItem[] = [];
  
  for (const app of apps) {
    if (!shouldIncludeCommand(app.visibility)) continue;
    
    for (const module of app.children) {
      if (!shouldIncludeCommand(module.visibility)) continue;
      
      commands.push({
        id: `module-${app.appKey}-${module.moduleKey}`,
        label: module.label,
        description: `Open ${module.label} in ${app.label}`,
        icon: module.icon,
        route: module.route,
        scope: 'MODULE' as CommandScope,
        permission: module.permission,
        visibility: module.visibility,
        category: 'modules' as CommandCategory,
        appKey: app.appKey,
        moduleKey: module.moduleKey,
        keywords: [
          module.label.toLowerCase(),
          module.moduleKey.toLowerCase(),
          app.label.toLowerCase(),
        ],
        order: module.order ?? 999,
      });
    }
  }
  
  return commands;
}

/**
 * Build commands from platform sidebar items
 */
function buildPlatformCommands(
  platformItems: SidebarStructure['platform'],
  scope: CommandScope = 'GLOBAL'
): CommandItem[] {
  return platformItems
    .filter((item) => shouldIncludeCommand(item.visibility))
    .map((item) => ({
      id: `platform-${item.key}`,
      label: item.label,
      description: `Navigate to ${item.label}`,
      icon: item.icon,
      route: item.route,
      scope,
      permission: item.permission,
      visibility: item.visibility,
      category: 'settings' as CommandCategory,
      keywords: [item.label.toLowerCase(), item.key],
      order: item.order ?? 999,
    }));
}

/**
 * Build commands from dashboard actions
 */
function buildActionCommands(
  dashboards: DashboardDefinition[]
): CommandItem[] {
  const commands: CommandItem[] = [];
  
  for (const dashboard of dashboards) {
    for (const action of dashboard.actions) {
      if (!shouldIncludeCommand(action.visibility)) continue;
      
      commands.push({
        id: `action-${dashboard.appKey}-${action.key}`,
        label: action.label,
        description: action.type === 'create' 
          ? `Create new ${action.label.toLowerCase()}`
          : action.type === 'import'
          ? `Import data`
          : action.type === 'configure'
          ? `Configure ${dashboard.title}`
          : action.label,
        icon: action.icon,
        route: action.route,
        scope: 'APP' as CommandScope,
        permission: action.permission,
        visibility: action.visibility,
        category: 'actions' as CommandCategory,
        appKey: dashboard.appKey,
        keywords: [
          action.label.toLowerCase(),
          action.key.toLowerCase(),
          action.type,
          dashboard.title.toLowerCase(),
        ],
        order: action.order ?? 999,
      });
    }
  }
  
  return commands;
}

/**
 * Group commands by category
 */
function groupByCategory(commands: CommandItem[]): Record<CommandCategory, CommandItem[]> {
  const grouped: Record<CommandCategory, CommandItem[]> = {
    navigation: [],
    actions: [],
    modules: [],
    apps: [],
    settings: [],
    system: [],
  };
  
  for (const command of commands) {
    grouped[command.category].push(command);
  }
  
  // Sort each category by order
  for (const category in grouped) {
    grouped[category as CommandCategory].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }
  
  return grouped;
}

/**
 * Group commands by scope
 */
function groupByScope(commands: CommandItem[]): Record<CommandScope, CommandItem[]> {
  const grouped: Record<CommandScope, CommandItem[]> = {
    GLOBAL: [],
    APP: [],
    MODULE: [],
  };
  
  for (const command of commands) {
    grouped[command.scope].push(command);
  }
  
  // Sort each scope by order
  for (const scope in grouped) {
    grouped[scope as CommandScope].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }
  
  return grouped;
}

/**
 * Build complete command palette from registry structures
 * 
 * @param sidebarStructure - Sidebar structure (from buildSidebarFromRegistry)
 * @param dashboards - Dashboard definitions (from buildDashboardFromRegistry)
 * @returns Complete command palette definition
 */
export function buildCommandsFromRegistry(
  sidebarStructure: SidebarStructure,
  dashboards: DashboardDefinition[]
): CommandPaletteDefinition {
  const commands: CommandItem[] = [];
  
  // Build commands from all sources (in fixed order: Core → Entities → Apps → Platform)
  commands.push(...buildCoreCommands(sidebarStructure.core));
  commands.push(...buildEntityCommands(sidebarStructure.entities));
  commands.push(...buildAppCommands(sidebarStructure.apps));
  commands.push(...buildModuleCommands(sidebarStructure.apps));
  commands.push(...buildPlatformCommands(sidebarStructure.platform));
  commands.push(...buildActionCommands(dashboards));
  
  // Sort all commands by order
  commands.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  
  return {
    version: 1,
    commands,
    commandsByCategory: groupByCategory(commands),
    commandsByScope: groupByScope(commands),
  };
}

/**
 * Search/filter commands by query
 * 
 * @param commands - Commands to search
 * @param query - Search query
 * @returns Filtered commands
 */
export function searchCommands(
  commands: CommandItem[],
  query: string
): CommandItem[] {
  if (!query || query.trim() === '') {
    return commands;
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return commands.filter((command) => {
    // Match label
    if (command.label.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    // Match description
    if (command.description?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    // Match keywords
    if (command.keywords?.some((keyword) => keyword.includes(normalizedQuery))) {
      return true;
    }
    
    // Match route (for deep navigation)
    if (command.route?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    return false;
  });
}

