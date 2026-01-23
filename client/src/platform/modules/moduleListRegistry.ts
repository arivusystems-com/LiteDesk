/**
 * Module List Configuration Registry
 * 
 * Centralized configuration for all module list views.
 * This registry provides:
 * - Default column configurations
 * - Statistics computation functions
 * - System saved views
 * - API endpoint mappings
 * - Filter normalization logic
 * 
 * All module-specific logic is extracted here to make the list view components
 * fully reusable across all modules.
 */

import { useAuthStore } from '@/stores/auth';

export interface DefaultColumnConfig {
  /** Column keys in display order */
  defaultVisibleColumns: string[];
  /** Fields to exclude from default view (but available via Customize Columns) */
  excludedFromDefault?: string[];
  /** Field key that should be locked (frozen) - typically 'name' */
  lockedColumn?: string;
}

export interface StatisticsConfig {
  /** Statistics to display */
  stats: Array<{
    name: string;
    key: string;
    formatter?: 'number' | 'currency' | 'percentage';
  }>;
  /** Function to compute statistics from data */
  computeFunction: (data: any[], currentUserId?: string) => Record<string, number>;
}

export interface SystemView {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
}

export interface ModuleListConfig {
  /** Default column configuration */
  defaultColumns: DefaultColumnConfig;
  /** Statistics configuration */
  statistics?: StatisticsConfig;
  /** System saved views */
  systemViews?: SystemView[];
  /** API endpoint (relative to /api) */
  apiEndpoint: string;
  /** Function to normalize filters before sending to API */
  normalizeFilters?: (filters: Record<string, any>, currentUserId?: string) => Record<string, any>;
  /** Function to normalize filters from saved view before applying */
  normalizeViewFilters?: (filters: Record<string, any>, currentUserId?: string) => Record<string, any>;
}

/**
 * Build default columns for a module
 */
export function buildDefaultColumns(
  allAvailableColumns: any[],
  config: DefaultColumnConfig
): any[] {
  const { defaultVisibleColumns, excludedFromDefault = [], lockedColumn } = config;
  const defaultVisibleKeys = new Set(defaultVisibleColumns);
  const processedColumns = [];
  const processedKeys = new Set();
  const excludedSet = new Set(excludedFromDefault);

  // Add locked column first if specified
  if (lockedColumn) {
    const lockedCol = allAvailableColumns.find(col => col.key === lockedColumn);
    if (lockedCol) {
      processedColumns.push({ ...lockedCol, visible: true, locked: true });
      processedKeys.add(lockedColumn);
    }
  }

  // Add other default visible columns in the specified order
  defaultVisibleColumns.forEach(key => {
    if (!processedKeys.has(key)) {
      const col = allAvailableColumns.find(c => c.key === key);
      if (col) {
        processedColumns.push({ ...col, visible: true });
        processedKeys.add(key);
      }
    }
  });

  // Add all other eligible columns as hidden by default
  allAvailableColumns.forEach(col => {
    if (!processedKeys.has(col.key)) {
      // Skip excluded fields
      if (excludedSet.has(col.key)) {
        processedColumns.push({ ...col, visible: false, locked: false });
        processedKeys.add(col.key);
        return;
      }

      // Skip fields that match exclusion patterns
      const isExcluded = excludedFromDefault.some(excluded => {
        if (excluded.includes('*')) {
          const pattern = excluded.replace(/\*/g, '.*');
          return new RegExp(pattern).test(col.key);
        }
        return col.key.includes(excluded);
      });

      if (isExcluded) {
        processedColumns.push({ ...col, visible: false, locked: false });
        processedKeys.add(col.key);
        return;
      }

      // Skip system/internal fields
      if (col.key.startsWith('_') || col.key === 'id' || col.key === 'slug') {
        processedColumns.push({ ...col, visible: false, locked: false });
        processedKeys.add(col.key);
        return;
      }

      processedColumns.push({ ...col, visible: false, locked: false });
      processedKeys.add(col.key);
    }
  });

  return processedColumns;
}

/**
 * Compute People statistics
 */
function computePeopleStatistics(data: any[], currentUserId?: string): Record<string, number> {
  const stats = {
    totalPeople: data.length,
    assignedToMe: 0,
    unassigned: 0,
    withOrganization: 0,
    withoutOrganization: 0
  };

  data.forEach(person => {
    // Assigned to me
    const assignedToId = typeof person.assignedTo === 'object' && person.assignedTo?._id
      ? person.assignedTo._id
      : person.assignedTo;
    if (assignedToId === currentUserId) {
      stats.assignedToMe++;
    }

    // Unassigned
    if (!assignedToId || assignedToId === null) {
      stats.unassigned++;
    }

    // With/without organization
    if (person.organization || person.organizationId) {
      stats.withOrganization++;
    } else {
      stats.withoutOrganization++;
    }
  });

  return stats;
}

/**
 * Compute Organizations statistics
 */
function computeOrganizationsStatistics(data: any[], currentUserId?: string): Record<string, number> {
  const stats = {
    totalOrganizations: data.length,
    assignedToMe: 0,
    unassigned: 0,
    activeOrganizations: 0,
    trialOrganizations: 0
  };

  data.forEach(org => {
    // Assigned to me
    const assignedToId = typeof org.assignedTo === 'object' && org.assignedTo?._id
      ? org.assignedTo._id
      : org.assignedTo;
    if (assignedToId === currentUserId) {
      stats.assignedToMe++;
    }

    // Unassigned
    if (!assignedToId || assignedToId === null) {
      stats.unassigned++;
    }

    // Active organizations
    if (org.isActive === true) {
      stats.activeOrganizations++;
    }

    // Trial organizations
    if (org.subscription?.tier === 'trial' || org.subscription?.status === 'trial') {
      stats.trialOrganizations++;
    }
  });

  return stats;
}

/**
 * Generic filter normalizer using schema-driven approach
 * Uses filterType from field definitions to normalize filters
 */
function createGenericFilterNormalizer(moduleKey: string) {
  return (filters: Record<string, any>, currentUserId?: string): Record<string, any> => {
    // Try to get filter configs from field definitions
    // For now, use known filter types based on common patterns
    const filterConfigs: Array<{ key: string; filterType: string }> = [];
    
    // Common filter patterns across modules
    if (filters.assignedTo !== undefined) {
      filterConfigs.push({ key: 'assignedTo', filterType: 'user' });
    }
    if (filters.do_not_contact !== undefined || filters.doNotContact !== undefined) {
      filterConfigs.push({ 
        key: filters.do_not_contact !== undefined ? 'do_not_contact' : 'doNotContact', 
        filterType: 'boolean' 
      });
    }
    
    // Use generic normalizer
    try {
      const { normalizeFiltersForAPI } = require('@/platform/filters/filterNormalizer');
      return normalizeFiltersForAPI(filters, filterConfigs, currentUserId);
    } catch (error) {
      // Fallback to basic normalization
      const normalized = { ...filters };
      if ('assignedTo' in normalized) {
        if (normalized.assignedTo === 'me' && currentUserId) {
          normalized.assignedTo = currentUserId;
        } else if (normalized.assignedTo === 'unassigned') {
          normalized.assignedTo = null;
        }
      }
      return normalized;
    }
  };
}

/**
 * Generic view filter normalizer
 */
function createGenericViewFilterNormalizer(moduleKey: string) {
  return (filters: Record<string, any>, currentUserId?: string): Record<string, any> => {
    const filterConfigs: Array<{ key: string; filterType: string }> = [];
    
    if (filters.assignedTo !== undefined) {
      filterConfigs.push({ key: 'assignedTo', filterType: 'user' });
    }
    if (filters.do_not_contact !== undefined || filters.doNotContact !== undefined) {
      filterConfigs.push({ 
        key: filters.do_not_contact !== undefined ? 'do_not_contact' : 'doNotContact', 
        filterType: 'boolean' 
      });
    }
    
    try {
      const { normalizeFiltersForUI } = require('@/platform/filters/filterNormalizer');
      return normalizeFiltersForUI(filters, filterConfigs, currentUserId);
    } catch (error) {
      // Fallback to basic normalization
      const normalized = { ...filters };
      if ('assignedTo' in normalized) {
        if (normalized.assignedTo === currentUserId) {
          normalized.assignedTo = 'me';
        } else if (normalized.assignedTo === null) {
          normalized.assignedTo = 'unassigned';
        }
      }
      return normalized;
    }
  };
}

/**
 * Normalize People filters (backward compatibility)
 */
function normalizePeopleFilters(filters: Record<string, any>, currentUserId?: string): Record<string, any> {
  return createGenericFilterNormalizer('people')(filters, currentUserId);
}

/**
 * Normalize Organizations filters (backward compatibility)
 */
function normalizeOrganizationsFilters(filters: Record<string, any>, currentUserId?: string): Record<string, any> {
  return createGenericFilterNormalizer('organizations')(filters, currentUserId);
}

/**
 * Normalize People view filters (backward compatibility)
 */
function normalizePeopleViewFilters(filters: Record<string, any>, currentUserId?: string): Record<string, any> {
  return createGenericViewFilterNormalizer('people')(filters, currentUserId);
}

/**
 * Normalize Organizations view filters (backward compatibility)
 */
function normalizeOrganizationsViewFilters(filters: Record<string, any>, currentUserId?: string): Record<string, any> {
  return createGenericViewFilterNormalizer('organizations')(filters, currentUserId);
}

/**
 * Generate default system views for any module
 * All modules get at least "All {ModuleName}" and "My {ModuleName}" views
 */
export function generateDefaultSystemViews(
  moduleKey: string,
  moduleLabel: string,
  currentUserId?: string
): SystemView[] {
  const views: SystemView[] = [
    {
      id: 'all',
      name: `All ${moduleLabel}`,
      filters: {},
      isDefault: true
    }
  ];

  // Add "My {ModuleName}" view if module has assignedTo field
  // This is a common pattern across modules
  if (currentUserId) {
    views.push({
      id: 'assigned-to-me',
      name: `My ${moduleLabel}`,
      filters: { assignedTo: 'me' }
    });
  }

  return views;
}

/**
 * Get system views for a module
 * Returns explicit system views from registry, or generates default ones
 */
export function getSystemViews(
  moduleKey: string,
  moduleLabel: string,
  currentUserId?: string
): SystemView[] {
  const config = MODULE_LIST_REGISTRY[moduleKey];
  if (config?.systemViews) {
    return config.systemViews;
  }
  
  // Generate default views for modules without explicit config
  return generateDefaultSystemViews(moduleKey, moduleLabel, currentUserId);
}

/**
 * Normalize Tasks filters
 */
function normalizeTasksFilters(filters: Record<string, any>, currentUserId?: string): Record<string, any> {
  const normalized = { ...filters };

  // Normalize assignedTo
  if ('assignedTo' in normalized) {
    if (normalized.assignedTo === 'me' && currentUserId) {
      normalized.assignedTo = currentUserId;
    }
  }

  return normalized;
}

/**
 * Normalize Tasks view filters (from saved views)
 */
function normalizeTasksViewFilters(filters: Record<string, any>, currentUserId?: string): Record<string, any> {
  const normalized = { ...filters };

  // Only normalize if assignedTo is actually present
  if ('assignedTo' in normalized) {
    if (normalized.assignedTo === currentUserId) {
      normalized.assignedTo = 'me';
    }
  }

  return normalized;
}

/**
 * Compute Tasks statistics
 */
function computeTasksStatistics(data: any[], currentUserId?: string): Record<string, number> {
  const stats = {
    totalTasks: data.length,
    assignedToMe: 0,
    completed: 0,
    overdue: 0
  };

  const now = new Date();

  data.forEach(task => {
    // Assigned to me
    const assignedToId = typeof task.assignedTo === 'object' && task.assignedTo?._id
      ? task.assignedTo._id
      : task.assignedTo;
    if (assignedToId === currentUserId) {
      stats.assignedToMe++;
    }

    // Completed
    if (task.status === 'completed') {
      stats.completed++;
    }

    // Overdue
    if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed') {
      stats.overdue++;
    }
  });

  return stats;
}

/**
 * Module List Configuration Registry
 */
export const MODULE_LIST_REGISTRY: Record<string, ModuleListConfig> = {
  people: {
    defaultColumns: {
      defaultVisibleColumns: ['name', 'organization', 'type', 'email', 'phone', 'assignedTo'],
      lockedColumn: 'name',
      excludedFromDefault: []
    },
    statistics: {
      stats: [
        { name: 'Total People', key: 'totalPeople', formatter: 'number' },
        { name: 'Assigned to Me', key: 'assignedToMe', formatter: 'number' },
        { name: 'Unassigned', key: 'unassigned', formatter: 'number' },
        { name: 'With Organization', key: 'withOrganization', formatter: 'number' },
        { name: 'Without Organization', key: 'withoutOrganization', formatter: 'number' }
      ],
      computeFunction: computePeopleStatistics
    },
    systemViews: [
      {
        id: 'all',
        name: 'All People',
        filters: {},
        isDefault: true
      },
      {
        id: 'assigned-to-me',
        name: 'My People',
        filters: { assignedTo: 'me' }
      },
      {
        id: 'unassigned',
        name: 'Unassigned',
        filters: { assignedTo: 'unassigned' }
      }
    ],
    apiEndpoint: '/people',
    normalizeFilters: normalizePeopleFilters,
    normalizeViewFilters: normalizePeopleViewFilters
  },

  organizations: {
    defaultColumns: {
      defaultVisibleColumns: ['name', 'assignedTo', 'isActive', 'types', 'industry', 'createdAt'],
      lockedColumn: 'name',
      excludedFromDefault: [
        'subscription.status',
        'subscription.tier',
        'subscription',
        'trialStartDate',
        'trialEndDate',
        'slug',
        '_id',
        'id',
        'legacyOrganizationId'
      ]
    },
    statistics: {
      stats: [
        { name: 'Total Organizations', key: 'totalOrganizations', formatter: 'number' },
        { name: 'Assigned to Me', key: 'assignedToMe', formatter: 'number' },
        { name: 'Unassigned', key: 'unassigned', formatter: 'number' },
        { name: 'Active', key: 'activeOrganizations', formatter: 'number' },
        { name: 'Trial', key: 'trialOrganizations', formatter: 'number' }
      ],
      computeFunction: computeOrganizationsStatistics
    },
    systemViews: [
      {
        id: 'all',
        name: 'All Organizations',
        filters: {},
        isDefault: true
      },
      {
        id: 'assigned-to-me',
        name: 'My Organizations',
        filters: { assignedTo: 'me' }
      },
      {
        id: 'unassigned',
        name: 'Unassigned',
        filters: { assignedTo: 'unassigned' }
      },
      {
        id: 'active',
        name: 'Active',
        filters: { isActive: true }
      },
      {
        id: 'trial',
        name: 'Trial',
        filters: { tier: 'trial' }
      }
    ],
    apiEndpoint: '/v2/organization',
    normalizeFilters: normalizeOrganizationsFilters,
    normalizeViewFilters: normalizeOrganizationsViewFilters
  },

  tasks: {
    defaultColumns: {
      defaultVisibleColumns: ['title', 'assignedTo', 'status', 'priority', 'dueDate', 'createdAt'],
      lockedColumn: 'title',
      excludedFromDefault: []
    },
    statistics: {
      stats: [
        { name: 'Total Tasks', key: 'totalTasks', formatter: 'number' },
        { name: 'Assigned to Me', key: 'assignedToMe', formatter: 'number' },
        { name: 'Completed', key: 'completed', formatter: 'number' },
        { name: 'Overdue', key: 'overdue', formatter: 'number' }
      ],
      computeFunction: computeTasksStatistics
    },
    systemViews: [
      {
        id: 'all',
        name: 'All Tasks',
        filters: {},
        isDefault: true
      },
      {
        id: 'assigned-to-me',
        name: 'My Tasks',
        filters: { assignedTo: 'me' }
      }
    ],
    apiEndpoint: '/tasks',
    normalizeFilters: normalizeTasksFilters,
    normalizeViewFilters: normalizeTasksViewFilters
  }
};

/**
 * Get module list configuration
 */
export function getModuleListConfig(moduleKey: string): ModuleListConfig | null {
  return MODULE_LIST_REGISTRY[moduleKey] || null;
}

/**
 * Check if a module has list configuration
 */
export function hasModuleListConfig(moduleKey: string): boolean {
  return moduleKey in MODULE_LIST_REGISTRY;
}
