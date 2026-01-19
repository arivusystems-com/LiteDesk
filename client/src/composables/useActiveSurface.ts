/**
 * ============================================================================
 * ACTIVE SURFACE COMPOSABLE
 * ============================================================================
 * 
 * Derives the current active surface from the Vue Router route.
 * Used by command palette and other context-aware features.
 * 
 * SURFACE DEFINITIONS:
 * 
 * - 'inbox': Inbox surface (/inbox)
 * - 'people': People list surface (/people)
 * - 'person': Person detail surface (/people/:id)
 * - 'organizations': Organizations list surface (/organizations)
 * - 'organization': Organization detail surface (/organizations/:id)
 * - undefined: No specific surface (platform home, settings, etc.)
 * 
 * DESIGN PRINCIPLES:
 * 
 * 1. MINIMAL SURFACE ENUM:
 *    - Only surfaces that affect command context
 *    - Not every route needs a surface
 *    - Surfaces represent user context, not technical routes
 * 
 * 2. EXPLICIT DERIVATION:
 *    - Surface is derived from route, not inferred from URL strings
 *    - Uses Vue Router's route object (name, path, params)
 *    - Centralized logic prevents URL string parsing throughout codebase
 * 
 * 3. CONTEXT-AWARE:
 *    - Surfaces enable context-aware features (commands, UI, etc.)
 *    - Different surfaces may show different commands or UI elements
 *    - Surfaces are reactive to route changes
 * 
 * ============================================================================
 */

import { computed } from 'vue';
import { useRoute } from 'vue-router';

/**
 * Active surface type
 * 
 * Represents the current user context/surface.
 * Only includes surfaces that affect command context or UI behavior.
 */
export type ActiveSurface = 
  | 'inbox'
  | 'people'
  | 'person'
  | 'organizations'
  | 'organization'
  | undefined;

/**
 * Get the active surface from the current route
 * 
 * Derives surface from route name and path structure.
 * Returns undefined when not in a contextual surface.
 * 
 * @returns ActiveSurface - The current surface or undefined
 * 
 * @example
 * ```typescript
 * const { activeSurface } = useActiveSurface();
 * // activeSurface.value === 'inbox' when on /inbox
 * // activeSurface.value === 'person' when on /people/:id
 * ```
 */
export function useActiveSurface() {
  const route = useRoute();

  const activeSurface = computed<ActiveSurface>(() => {
    // Use route name first (more reliable than path matching)
    const routeName = route.name as string | undefined;
    
    if (routeName === 'inbox') {
      return 'inbox';
    }
    
    if (routeName === 'people') {
      return 'people';
    }
    
    if (routeName === 'person-detail') {
      return 'person';
    }
    
    if (routeName === 'organizations') {
      return 'organizations';
    }
    
    if (routeName === 'organization-detail') {
      return 'organization';
    }
    
    // Fallback to path-based detection for routes without explicit names
    // This handles dynamic routes and edge cases
    const path = route.path;
    
    if (path === '/inbox' || path.startsWith('/inbox/')) {
      return 'inbox';
    }
    
    if (path === '/people' || path === '/people/create') {
      return 'people';
    }
    
    if (path.startsWith('/people/') && route.params.id) {
      return 'person';
    }
    
    if (path === '/organizations') {
      return 'organizations';
    }
    
    if (path.startsWith('/organizations/') && route.params.id) {
      return 'organization';
    }
    
    // No specific surface (platform home, settings, etc.)
    return undefined;
  });

  return {
    activeSurface
  };
}
