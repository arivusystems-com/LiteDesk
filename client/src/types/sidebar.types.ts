/**
 * ============================================================================
 * PLATFORM SIDEBAR: Pure Data Contract
 * ============================================================================
 * 
 * This file defines the sidebar schema as a pure data contract:
 * - No UI logic
 * - No Vue/React specifics
 * - Registry-driven and permission-aware
 * - Supports exactly four sections: core, entities, apps, platform
 * 
 * ============================================================================
 */

import { PermissionOutcome } from './permission-visibility.types';

/**
 * Sidebar Module (Leaf Node)
 * 
 * Represents a single navigable module within an app domain.
 * Modules are leaf nodes with no nesting beyond one level.
 */
export interface SidebarModule {
  /** Unique module identifier (e.g., 'contacts', 'deals') */
  moduleKey: string;
  
  /** Display label for the module */
  label: string;
  
  /** Route path for navigation (e.g., '/contacts', '/deals') */
  route: string;
  
  /** Optional permission key required to view this module (e.g., 'contacts.view') */
  permission?: string;
  
  /** Optional icon identifier (for UI layer to map to icon components) */
  icon?: string;
  
  /** Optional display order within parent domain */
  order?: number;

  /** Permission outcome for this module */
  visibility: PermissionOutcome;
}

/**
 * Domain Header (App Section)
 * 
 * Represents an application domain in the sidebar.
 * Domain headers are first-class items that can be clicked to navigate to the app dashboard.
 */
export interface SidebarDomain {
  /** Application key (e.g., 'SALES', 'HELPDESK', 'AUDIT') */
  appKey: string;
  
  /** Display label for the app (e.g., 'Sales', 'Helpdesk') */
  label: string;
  
  /** Route to the app dashboard (e.g., '/sales', '/helpdesk') */
  dashboardRoute: string;
  
  /** Modules belonging to this app domain */
  children: SidebarModule[];
  
  /** Optional icon identifier for the domain header */
  icon?: string;
  
  /** Optional display order for domains */
  order?: number;
  
  /** Whether this domain is expanded (for future state storage) */
  expanded?: boolean;

  /** Permission outcome for this domain */
  visibility: PermissionOutcome;
}

/**
 * Core Section Item
 * 
 * Represents a global, non-collapsible item in the core section.
 * Core items are platform-level navigation items available across all apps.
 */
export interface SidebarCoreItem {
  /** Unique identifier for the core item */
  key: string;
  
  /** Display label */
  label: string;
  
  /** Route path for navigation */
  route: string;
  
  /** Optional permission key required to view this item */
  permission?: string;
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Optional display order */
  order?: number;

  /** Permission outcome for this core item */
  visibility: PermissionOutcome;
}

/**
 * Entities Section Item
 * 
 * Represents a shared system primitive (core entity) in the entities section.
 * These are core entities that are shared across apps and must not appear under Apps.
 */
export interface SidebarEntityItem {
  /** Unique identifier for the entity item */
  key: string;
  
  /** Display label */
  label: string;
  
  /** Route path for navigation */
  route: string;
  
  /** Optional permission key required to view this item */
  permission?: string;
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Optional display order */
  order?: number;

  /** Permission outcome for this entity item */
  visibility: PermissionOutcome;
}

/**
 * Platform Section Item
 * 
 * Represents a governance item in the platform section.
 * Platform items are for system administration and governance.
 */
export interface SidebarPlatformItem {
  /** Unique identifier for the platform item */
  key: string;
  
  /** Display label */
  label: string;
  
  /** Route path for navigation */
  route: string;
  
  /** Optional permission key required to view this item */
  permission?: string;
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Optional display order */
  order?: number;

  /** Permission outcome for this platform item */
  visibility: PermissionOutcome;
}

/**
 * Complete Sidebar Structure
 * 
 * The root structure containing all four sections in fixed order:
 * Core → Entities → Apps → Platform
 */
export interface SidebarStructure {
  /** Contract version (incremented on breaking changes) */
  version: number;
  
  /** Core section: personal/attention layer (Home, Inbox, Reports) */
  core: SidebarCoreItem[];
  
  /** Entities section: shared system primitives (People, Organizations, Tasks, etc.) */
  entities: SidebarEntityItem[];
  
  /** Apps section: domain-specific workflows (Sales, Helpdesk, etc.) */
  apps: SidebarDomain[];
  
  /** Platform section: governance items (Settings, Apps, Users) */
  platform: SidebarPlatformItem[];
}

/**
 * App Registry Module Definition
 * 
 * Module definition with navigation intent flags.
 */
export interface AppRegistryModule {
  /** Unique module identifier */
  moduleKey: string;
  
  /** Display label */
  label: string;
  
  /** Route path for navigation */
  route: string;
  
  /** Optional permission key required to view this module */
  permission?: string;
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Optional display order */
  order?: number;
  
  /** Optional app key (if module belongs to an app) */
  appKey?: string;
  
  /** Optional system flag (legacy, for backward compatibility) */
  system?: boolean;
  
  /** Optional core entity flag (legacy, for backward compatibility) */
  coreEntity?: boolean;
  
  /** Navigation intent: Place in Core section (personal/attention layer) */
  navigationCore?: boolean;
  
  /** Navigation intent: Place in Entities section (shared system primitives) */
  navigationEntity?: boolean;
  
  /** Hard stop: Exclude from Apps section (prevents core entities from appearing under apps) */
  excludeFromApps?: boolean;
}

/**
 * App Registry Entry
 * 
 * Expected structure from the app registry for building sidebar.
 */
export interface AppRegistryEntry {
  /** Application key */
  appKey: string;
  
  /** Display label */
  label: string;
  
  /** Dashboard route */
  dashboardRoute: string;
  
  /** Modules available in this app */
  modules?: AppRegistryModule[];
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Optional display order */
  order?: number;
}

/**
 * User Permissions
 * 
 * Structure for user permissions used to filter sidebar items.
 */
export interface UserPermissions {
  /** Map of permission keys to boolean values (e.g., { 'contacts.view': true }) */
  [permissionKey: string]: boolean;
}

/**
 * App Registry
 * 
 * Complete app registry structure.
 */
export interface AppRegistry {
  [appKey: string]: AppRegistryEntry;
}

