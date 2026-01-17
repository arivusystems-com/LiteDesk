/**
 * ============================================================================
 * PLATFORM SIDEBAR: Core Section Items
 * ============================================================================
 * 
 * Defines virtual core items for the Core section (personal/attention layer).
 * These are not modules - they are virtual navigation items.
 * 
 * Core items are:
 * - Always first in sidebar
 * - Small, not schema-driven
 * - Always visible (permission-aware)
 * - Not collapsible
 * - Fixed order
 * - Never app-owned
 * 
 * ============================================================================
 */

import type { SidebarCoreItem } from '@/types/sidebar.types';
import { PermissionOutcome } from '@/types/permission-visibility.types';

/**
 * Default core sidebar items
 * 
 * These are virtual items (not modules) for the personal/attention layer.
 */
export const DEFAULT_CORE_ITEMS: SidebarCoreItem[] = [
  {
    key: 'home',
    label: 'Home',
    route: '/platform/home',
    permission: undefined, // Always visible
    icon: 'home',
    order: 1,
    visibility: PermissionOutcome.ENABLED,
  },
  {
    key: 'inbox',
    label: 'Inbox',
    route: '/inbox',
    permission: undefined, // Always visible
    icon: 'inbox',
    order: 2,
    visibility: PermissionOutcome.ENABLED,
  },
  {
    key: 'reports',
    label: 'Reports',
    route: '/reports',
    permission: 'reports.view', // Permission-aware
    icon: 'chart-bar',
    order: 3,
    visibility: PermissionOutcome.ENABLED,
  },
];

