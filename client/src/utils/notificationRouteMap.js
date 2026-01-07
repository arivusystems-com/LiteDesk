/**
 * Centralized notification deep-link route mapping.
 * Maps appKey + entity.type to Vue Router route definitions.
 * 
 * This ensures consistency across all notification components
 * and aligns with actual router configurations.
 */

/**
 * Route map: appKey -> entityType -> route definition
 * 
 * Route definitions can be:
 * - { name: 'route-name', params: { ... } } - named route with params
 * - { path: '/path/to/route' } - path-based route
 * - null - no route available
 */
const NOTIFICATION_ROUTE_MAP = {
  CRM: {
    EVENT: (entityId) => ({
      name: 'event-detail',
      params: { id: entityId }
    }),
    // Future: Add more CRM entity types as needed
    // DEAL: (entityId) => ({ name: 'deal-detail', params: { id: entityId } }),
    // TASK: (entityId) => ({ name: 'task-detail', params: { id: entityId } }),
  },
  
  AUDIT: {
    EVENT: (entityId) => ({
      name: 'audit-detail',
      params: { eventId: entityId } // Note: Audit routes use 'eventId' param
    }),
  },
  
  PORTAL: {
    EVENT: (entityId) => ({
      name: 'portal-audit-detail',
      params: { eventId: entityId } // Note: Portal routes use 'eventId' param
    }),
    CORRECTIVE_ACTION: () => ({
      path: '/portal/actions' // List view, no specific ID needed
    }),
  }
};

/**
 * Get route for a notification based on appKey and entity.
 * 
 * @param {string} appKey - 'CRM' | 'AUDIT' | 'PORTAL'
 * @param {Object} entity - { type: string, id: string }
 * @returns {Object|null} Route definition or null if no route available
 */
export function getNotificationRoute(appKey, entity) {
  if (!appKey || !entity || !entity.type || !entity.id) {
    return null;
  }

  const appRoutes = NOTIFICATION_ROUTE_MAP[appKey];
  if (!appRoutes) {
    console.warn(`[notificationRouteMap] Unknown appKey: ${appKey}`);
    return null;
  }

  const routeBuilder = appRoutes[entity.type];
  if (!routeBuilder || typeof routeBuilder !== 'function') {
    console.warn(`[notificationRouteMap] No route for appKey=${appKey}, entityType=${entity.type}`);
    return null;
  }

  try {
    return routeBuilder(entity.id);
  } catch (err) {
    console.error(`[notificationRouteMap] Error building route:`, err);
    return null;
  }
}

/**
 * Validate that a route exists in the router.
 * This is a runtime check to prevent navigation errors.
 * 
 * @param {Object} router - Vue Router instance
 * @param {Object} route - Route definition from getNotificationRoute
 * @returns {boolean} True if route exists
 */
export function validateRoute(router, route) {
  if (!route || !router) return false;

  try {
    // Check if route name exists
    if (route.name) {
      const resolved = router.resolve({ name: route.name, params: route.params || {} });
      return resolved.name !== null;
    }
    
    // Check if path exists
    if (route.path) {
      const resolved = router.resolve(route.path);
      return resolved.name !== null || resolved.matched.length > 0;
    }
    
    return false;
  } catch (err) {
    console.warn(`[notificationRouteMap] Route validation error:`, err);
    return false;
  }
}

/**
 * Get all supported entity types for an app.
 * Useful for debugging or UI hints.
 * 
 * @param {string} appKey - 'CRM' | 'AUDIT' | 'PORTAL'
 * @returns {string[]} Array of supported entity types
 */
export function getSupportedEntityTypes(appKey) {
  const appRoutes = NOTIFICATION_ROUTE_MAP[appKey];
  if (!appRoutes) return [];
  return Object.keys(appRoutes);
}

export default {
  getNotificationRoute,
  validateRoute,
  getSupportedEntityTypes
};

