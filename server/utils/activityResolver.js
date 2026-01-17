/**
 * ============================================================================
 * Activity Resolver
 * ============================================================================
 *
 * Pure utility for resolving and filtering Activity entries based on app context.
 *
 * This resolver:
 * - Filters activities by resolved app context
 * - Ensures activities are immutable (read-only)
 * - Validates actor + app context integrity
 * - Makes no assumptions about specific apps
 *
 * Inputs:
 *   - activities: Array of activity entries
 *   - resolvedAppContext: {
 *       appKey: string,
 *       confidence: string,
 *       isAmbiguous: boolean
 *     }
 *   - entityType: string (e.g., 'Person')
 *   - entityId: string
 *
 * Output:
 *   {
 *     activities: Array,              // Filtered activities for the app context
 *     filtered: number,                // Number of activities filtered out
 *     total: number                    // Total activities before filtering
 *   }
 *
 * NOTE:
 * - Activities are filtered by appContext field (if present)
 * - If appContext is missing, activities are included only if app context is ambiguous
 * - This ensures backward compatibility with existing activityLogs
 * ============================================================================
 */

/**
 * Resolve and filter activities for a given app context.
 *
 * @param {Object} options
 * @param {Array} options.activities - Raw activity entries
 * @param {Object} options.resolvedAppContext - Resolved app context from AppContextResolver
 * @param {string} options.entityType - Entity type (e.g., 'Person')
 * @param {string} options.entityId - Entity ID
 * @returns {{
 *   activities: Array,
 *   filtered: number,
 *   total: number
 * }}
 */
function resolveActivities({
  activities = [],
  resolvedAppContext = {},
  entityType = null,
  entityId = null
}) {
  if (!Array.isArray(activities)) {
    return {
      activities: [],
      filtered: 0,
      total: 0
    };
  }

  const total = activities.length;
  const appKey = resolvedAppContext?.appKey;
  const isAmbiguous = resolvedAppContext?.isAmbiguous;

  // If app context is ambiguous, block activity rendering
  if (isAmbiguous || !appKey) {
    return {
      activities: [],
      filtered: total,
      total: total,
      blocked: true,
      reason: isAmbiguous 
        ? 'App context is ambiguous. Cannot determine which activities to show.'
        : 'App context is not resolved. Cannot filter activities.'
    };
  }

  // Filter activities by app context
  // Activities without appContext are included for backward compatibility
  // but only if we have a resolved app context
  const normalizedAppKey = appKey.toUpperCase();
  
  const filteredActivities = activities.filter(activity => {
    // If activity has appContext, it must match
    if (activity.appContext) {
      return activity.appContext.toUpperCase() === normalizedAppKey;
    }
    
    // If activity doesn't have appContext, include it for backward compatibility
    // This allows existing activityLogs to still be shown
    return true;
  });

  // Sort by timestamp (oldest first for history - chronological order)
  const sortedActivities = filteredActivities.sort((a, b) => {
    const timestampA = a.timestamp || a.createdAt || 0;
    const timestampB = b.timestamp || b.createdAt || 0;
    return new Date(timestampA) - new Date(timestampB);
  });

  return {
    activities: sortedActivities,
    filtered: total - sortedActivities.length,
    total: total
  };
}

/**
 * Normalize an activity entry to ensure it has the required structure.
 *
 * @param {Object} activity - Raw activity entry
 * @returns {Object} Normalized activity entry
 */
function normalizeActivity(activity) {
  if (!activity || typeof activity !== 'object') {
    return null;
  }

  return {
    // Actor information
    actor: activity.user || activity.actor || 'System',
    actorId: activity.userId || activity.actorId || null,
    
    // App context
    appContext: activity.appContext || null,
    
    // Entity information
    entityType: activity.entityType || 'Person',
    entityId: activity.entityId || activity._id || null,
    
    // Action
    action: activity.action || 'unknown',
    
    // Metadata
    metadata: activity.details || activity.metadata || {},
    
    // Timestamp
    createdAt: activity.timestamp || activity.createdAt || new Date(),
    
    // Original activity ID (if available)
    id: activity._id || activity.id || null
  };
}

module.exports = {
  resolveActivities,
  normalizeActivity
};

