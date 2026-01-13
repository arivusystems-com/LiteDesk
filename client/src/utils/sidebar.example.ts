/**
 * ============================================================================
 * PLATFORM SIDEBAR: Usage Example
 * ============================================================================
 * 
 * This file demonstrates how to use buildSidebarFromRegistry to create
 * a sidebar structure from the app registry and user permissions.
 * 
 * ============================================================================
 */

import { buildSidebarFromRegistry } from './buildSidebarFromRegistry';
import type {
  AppRegistry,
  UserPermissions,
  SidebarCoreItem,
  SidebarPlatformItem,
} from '@/types/sidebar.types';

/**
 * Example: Build sidebar for a Sales user
 */
export function exampleSalesUserSidebar() {
  // Sample app registry
  const appRegistry: AppRegistry = {
    SALES: {
      appKey: 'SALES',
      label: 'Sales',
      dashboardRoute: '/sales',
      icon: 'briefcase',
      order: 1,
      modules: [
        {
          moduleKey: 'contacts',
          label: 'Contacts',
          route: '/contacts',
          permission: 'contacts.view',
          icon: 'users',
          order: 1,
        },
        {
          moduleKey: 'deals',
          label: 'Deals',
          route: '/deals',
          permission: 'deals.view',
          icon: 'briefcase',
          order: 2,
        },
        {
          moduleKey: 'tasks',
          label: 'Tasks',
          route: '/tasks',
          permission: 'tasks.view',
          icon: 'check-circle',
          order: 3,
        },
        {
          moduleKey: 'events',
          label: 'Events',
          route: '/events',
          permission: 'events.view',
          icon: 'calendar',
          order: 4,
        },
      ],
    },
    HELPDESK: {
      appKey: 'HELPDESK',
      label: 'Helpdesk',
      dashboardRoute: '/helpdesk',
      icon: 'support',
      order: 2,
      modules: [
        {
          moduleKey: 'tickets',
          label: 'Tickets',
          route: '/helpdesk/tickets',
          permission: 'tickets.view',
          icon: 'ticket',
          order: 1,
        },
        {
          moduleKey: 'knowledge-base',
          label: 'Knowledge Base',
          route: '/helpdesk/kb',
          permission: 'kb.view',
          icon: 'book',
          order: 2,
        },
      ],
    },
  };

  // User permissions (Sales user has Sales permissions, no Helpdesk)
  const userPermissions: UserPermissions = {
    'contacts.view': true,
    'deals.view': true,
    'tasks.view': true,
    'events.view': true,
    'settings.view': true,
    'users.view': true,
    // No Helpdesk permissions
  };

  // Core items (global, non-collapsible)
  const coreItems: SidebarCoreItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'home',
      order: 1,
    },
  ];

  // Platform items (governance)
  const platformItems: SidebarPlatformItem[] = [
    {
      key: 'settings',
      label: 'Settings',
      route: '/settings',
      permission: 'settings.view',
      icon: 'cog',
      order: 1,
    },
    {
      key: 'users',
      label: 'Users',
      route: '/settings/users',
      permission: 'users.view',
      icon: 'users',
      order: 2,
    },
  ];

  // Build sidebar structure
  const sidebar = buildSidebarFromRegistry(
    appRegistry,
    userPermissions,
    coreItems,
    platformItems
  );

  return sidebar;
}

/**
 * Example: Build sidebar for an Admin user (has all permissions)
 */
export function exampleAdminUserSidebar() {
  const appRegistry: AppRegistry = {
    SALES: {
      appKey: 'SALES',
      label: 'Sales',
      dashboardRoute: '/sales',
      icon: 'briefcase',
      order: 1,
      modules: [
        {
          moduleKey: 'contacts',
          label: 'Contacts',
          route: '/contacts',
          permission: 'contacts.view',
          icon: 'users',
          order: 1,
        },
        {
          moduleKey: 'deals',
          label: 'Deals',
          route: '/deals',
          permission: 'deals.view',
          icon: 'briefcase',
          order: 2,
        },
      ],
    },
    HELPDESK: {
      appKey: 'HELPDESK',
      label: 'Helpdesk',
      dashboardRoute: '/helpdesk',
      icon: 'support',
      order: 2,
      modules: [
        {
          moduleKey: 'tickets',
          label: 'Tickets',
          route: '/helpdesk/tickets',
          permission: 'tickets.view',
          icon: 'ticket',
          order: 1,
        },
      ],
    },
  };

  // Admin has all permissions
  const userPermissions: UserPermissions = {
    'contacts.view': true,
    'deals.view': true,
    'tasks.view': true,
    'events.view': true,
    'tickets.view': true,
    'kb.view': true,
    'settings.view': true,
    'apps.view': true,
    'users.view': true,
  };

  const coreItems: SidebarCoreItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'home',
      order: 1,
    },
  ];

  const sidebar = buildSidebarFromRegistry(
    appRegistry,
    userPermissions,
    coreItems
  );

  return sidebar;
}

/**
 * Example: Adding a new app requires zero sidebar code changes
 * 
 * Just add the app to the registry, and it will appear in the sidebar
 * (if user has permissions for its modules).
 */
export function exampleNewApp() {
  const appRegistry: AppRegistry = {
    SALES: {
      appKey: 'SALES',
      label: 'Sales',
      dashboardRoute: '/sales',
      modules: [
        {
          moduleKey: 'contacts',
          label: 'Contacts',
          route: '/contacts',
          permission: 'contacts.view',
        },
      ],
    },
    // NEW APP: Just add to registry, no sidebar code changes needed!
    AUDIT: {
      appKey: 'AUDIT',
      label: 'Audit',
      dashboardRoute: '/audit',
      icon: 'clipboard',
      order: 3,
      modules: [
        {
          moduleKey: 'assignments',
          label: 'Assignments',
          route: '/audit/assignments',
          permission: 'audit.assignments.view',
          icon: 'clipboard',
          order: 1,
        },
        {
          moduleKey: 'timeline',
          label: 'Timeline',
          route: '/audit/timeline',
          permission: 'audit.timeline.view',
          icon: 'clock',
          order: 2,
        },
      ],
    },
  };

  const userPermissions: UserPermissions = {
    'contacts.view': true,
    'audit.assignments.view': true,
    'audit.timeline.view': true,
  };

  // Same function call, no changes needed!
  const sidebar = buildSidebarFromRegistry(appRegistry, userPermissions);

  return sidebar;
}

