/**
 * ============================================================================
 * PLATFORM CORE: Default List Filters Composable
 * ============================================================================
 * 
 * Opt-in composable for accessing metadata-driven default filter suggestions.
 * 
 * ⚠️ ARCHITECTURAL CONTRACT:
 * 
 * 1. This composable is OPT-IN ONLY
 *    - Does NOT auto-apply filters
 *    - Does NOT mutate existing filter state
 *    - Does NOT override saved filters
 *    - Does NOT change initial list queries
 * 
 * 2. Default filters are SUGGESTIONS only
 *    - UI may display them as hints
 *    - UI may offer them in a "Suggested filters" section
 *    - User-defined filters ALWAYS take precedence
 * 
 * 3. Feature-flagged for safety
 *    - Set ENABLE_DEFAULT_FILTERS = true to enable
 *    - When disabled, returns empty defaults
 *    - Zero behavior change when flag is false
 * 
 * ============================================================================
 * 
 * USAGE EXAMPLES:
 * 
 * ```typescript
 * // In a list view component
 * import { useDefaultListFilters } from '@/composables/useDefaultListFilters';
 * 
 * const { 
 *   defaultFilters,
 *   hasDefaultFilters,
 *   isEnabled,
 *   getFilterDetails 
 * } = useDefaultListFilters('people');
 * 
 * // Display suggested filters (only when enabled)
 * if (isEnabled.value && hasDefaultFilters.value) {
 *   // Show "Suggested filters" UI hint
 * }
 * 
 * // Check if a specific filter is suggested
 * const details = getFilterDetails('assignedTo');
 * if (details?.wouldBeDefault) {
 *   // Highlight this filter option
 * }
 * ```
 * 
 * ============================================================================
 * 
 * INTEGRATION NOTES:
 * 
 * - This composable does NOT modify any existing list behavior
 * - To adopt default filters, UI must explicitly:
 *   1. Read defaultFilters.value
 *   2. Apply them to filter state (user action required)
 *   3. Respect user overrides
 * 
 * - Suggested integration points:
 *   - "Suggested filters" dropdown section
 *   - Filter chip suggestions
 *   - Empty state filter recommendations
 *   - Onboarding filter hints
 * 
 * ============================================================================
 */

import { computed, readonly, ref } from 'vue';
import type { ModuleKey } from '@/platform/fields/FieldRegistry';
import {
  getDefaultFiltersForModule,
  isDefaultFilter,
  getFilterEligibilityDetails,
  getAllEligibleFilters,
  type DefaultFilterOptions,
} from '@/platform/fields/DefaultFilterPolicy';

// =============================================================================
// FEATURE FLAG
// =============================================================================

/**
 * Feature flag for default filter suggestions.
 * 
 * Set to `true` to enable default filter suggestions in the UI.
 * When `false`, the composable returns empty defaults with zero behavior change.
 * 
 * ⚠️ IMPORTANT: This flag controls visibility only, not application.
 * Even when enabled, filters are never auto-applied.
 */
const ENABLE_DEFAULT_FILTERS = false;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for useDefaultListFilters composable.
 */
export interface UseDefaultListFiltersOptions extends DefaultFilterOptions {
  /**
   * Override the feature flag for testing purposes.
   * Default: uses ENABLE_DEFAULT_FILTERS constant
   */
  forceEnabled?: boolean;
}

/**
 * Return type for useDefaultListFilters composable.
 */
export interface UseDefaultListFiltersReturn {
  /**
   * Whether the default filters feature is enabled.
   * Reactive ref that reflects the feature flag state.
   */
  isEnabled: Readonly<ReturnType<typeof ref<boolean>>>;
  
  /**
   * Array of suggested default filter field keys.
   * Empty when feature is disabled.
   * Reactive computed property.
   */
  defaultFilters: ReturnType<typeof computed<string[]>>;
  
  /**
   * Whether there are any default filters available.
   * Convenience computed for conditional rendering.
   */
  hasDefaultFilters: ReturnType<typeof computed<boolean>>;
  
  /**
   * Total count of default filters.
   */
  defaultFilterCount: ReturnType<typeof computed<number>>;
  
  /**
   * All eligible filters (before cap is applied).
   * Useful for showing "more filters" options.
   */
  allEligibleFilters: ReturnType<typeof computed<string[]>>;
  
  /**
   * Check if a specific field is a suggested default filter.
   * Returns false when feature is disabled.
   */
  isDefaultFilter: (fieldKey: string) => boolean;
  
  /**
   * Get detailed eligibility information for a field.
   * Returns null when feature is disabled or field not found.
   */
  getFilterDetails: (fieldKey: string) => ReturnType<typeof getFilterEligibilityDetails>;
  
  /**
   * The module key this composable was initialized with.
   */
  moduleKey: ModuleKey;
}

// =============================================================================
// COMPOSABLE
// =============================================================================

/**
 * Composable for accessing metadata-driven default filter suggestions.
 * 
 * This composable provides read-only access to suggested default filters
 * based on field metadata. It does NOT apply filters automatically.
 * 
 * @param moduleKey - The module to get default filters for
 * @param options - Optional configuration
 * @returns Object with default filter data and helper functions
 * 
 * @example
 * ```typescript
 * const { defaultFilters, hasDefaultFilters, isEnabled } = useDefaultListFilters('tasks');
 * 
 * // Only show suggestions when enabled
 * if (isEnabled.value && hasDefaultFilters.value) {
 *   console.log('Suggested filters:', defaultFilters.value);
 * }
 * ```
 */
export function useDefaultListFilters(
  moduleKey: ModuleKey,
  options: UseDefaultListFiltersOptions = {}
): UseDefaultListFiltersReturn {
  const {
    forceEnabled,
    ...policyOptions
  } = options;
  
  // Determine if feature is enabled
  const isEnabled = readonly(ref(forceEnabled ?? ENABLE_DEFAULT_FILTERS));
  
  // Compute default filters (empty when disabled)
  const defaultFilters = computed<string[]>(() => {
    if (!isEnabled.value) {
      return [];
    }
    return getDefaultFiltersForModule(moduleKey, policyOptions);
  });
  
  // Convenience computed for conditional rendering
  const hasDefaultFilters = computed<boolean>(() => {
    return defaultFilters.value.length > 0;
  });
  
  // Count of default filters
  const defaultFilterCount = computed<number>(() => {
    return defaultFilters.value.length;
  });
  
  // All eligible filters (before cap)
  const allEligibleFilters = computed<string[]>(() => {
    if (!isEnabled.value) {
      return [];
    }
    return getAllEligibleFilters(moduleKey, policyOptions);
  });
  
  // Check if a field is a default filter
  const checkIsDefaultFilter = (fieldKey: string): boolean => {
    if (!isEnabled.value) {
      return false;
    }
    return isDefaultFilter(moduleKey, fieldKey, policyOptions);
  };
  
  // Get filter details for a field
  const getFilterDetails = (fieldKey: string) => {
    if (!isEnabled.value) {
      return null;
    }
    return getFilterEligibilityDetails(moduleKey, fieldKey);
  };
  
  return {
    isEnabled,
    defaultFilters,
    hasDefaultFilters,
    defaultFilterCount,
    allEligibleFilters,
    isDefaultFilter: checkIsDefaultFilter,
    getFilterDetails,
    moduleKey,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Check if default filters feature is globally enabled.
 * Useful for conditional imports or feature detection.
 */
export function isDefaultFiltersEnabled(): boolean {
  return ENABLE_DEFAULT_FILTERS;
}

/**
 * Get the feature flag value.
 * Useful for debugging and testing.
 */
export function getDefaultFiltersFeatureFlag(): boolean {
  return ENABLE_DEFAULT_FILTERS;
}
