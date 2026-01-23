/**
 * Schema-Driven Filter Resolver
 * 
 * Generates filter configurations from field metadata.
 * Single source of truth for all module filters.
 */

import type { FilterType } from '@/platform/fields/peopleFieldModel';

export interface FilterConfig {
  key: string;
  label: string;
  filterType: FilterType;
  fieldPath: string;
  options?: Array<{ value: string; label: string }>;
  priority: number;
}

export interface FieldDefinition {
  key: string;
  label?: string;
  filterable?: boolean;
  filterType?: FilterType;
  filterPriority?: number;
  dataType?: string;
  options?: Array<{ value: string; label: string }>;
  [key: string]: any; // Allow additional field properties
}

/**
 * Get filterable fields for a module from field definitions
 * 
 * @param moduleKey - The module key (e.g., 'people', 'organizations')
 * @param fieldDefinitions - Array of field definitions from backend or metadata
 * @param maxDefaultFilters - Maximum number of default visible filters (default: 3)
 * @returns Array of filter configurations sorted by priority
 */
export function getFiltersForModule(
  moduleKey: string,
  fieldDefinitions: FieldDefinition[],
  maxDefaultFilters: number = 3
): FilterConfig[] {
  if (!Array.isArray(fieldDefinitions) || fieldDefinitions.length === 0) {
    return [];
  }

  // Filter to only filterable fields
  const filterableFields = fieldDefinitions.filter(field => 
    field.filterable === true && field.filterType
  );

  // Sort by priority (lower number = higher priority)
  const sortedFields = filterableFields.sort((a, b) => {
    const priorityA = a.filterPriority ?? 999;
    const priorityB = b.filterPriority ?? 999;
    return priorityA - priorityB;
  });

  // Map to filter configurations
  const filters: FilterConfig[] = sortedFields.map(field => {
    const filter: FilterConfig = {
      key: field.key,
      label: field.label || field.key,
      filterType: field.filterType!,
      fieldPath: field.key,
      priority: field.filterPriority ?? 999,
    };

    // Add options for select/multi-select if available
    if (field.filterType === 'select' || field.filterType === 'multi-select') {
      if (field.options && Array.isArray(field.options)) {
        filter.options = field.options;
      }
    }

    return filter;
  });

  return filters;
}

/**
 * Get default visible filters (top N by priority)
 */
export function getDefaultFilters(
  moduleKey: string,
  fieldDefinitions: FieldDefinition[],
  maxDefaultFilters: number = 3
): FilterConfig[] {
  const allFilters = getFiltersForModule(moduleKey, fieldDefinitions, maxDefaultFilters);
  return allFilters.slice(0, maxDefaultFilters);
}

/**
 * Get all available filters (including hidden ones)
 */
export function getAllFilters(
  moduleKey: string,
  fieldDefinitions: FieldDefinition[]
): FilterConfig[] {
  return getFiltersForModule(moduleKey, fieldDefinitions, Infinity);
}
