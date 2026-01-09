/**
 * ============================================================================
 * Phase 0G: Record Context Composable
 * ============================================================================
 * 
 * Platform-level composable for fetching and managing record context:
 * - Fetches record context from /api/relationships/record-context
 * - Caches per record (appKey.moduleKey.recordId)
 * - Exposes relationship groups, required relationships, and permissions
 * - App-agnostic and metadata-driven
 * 
 * ============================================================================
 */

import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/stores/auth';
import { fetchRecordsForDisplay } from '@/utils/recordDisplay';

// Cache for record contexts
const contextCache = new Map();

/**
 * Generate cache key for a record
 */
function getCacheKey(appKey, moduleKey, recordId) {
  // Ensure values are strings (handle refs/computed values)
  const appKeyStr = String(appKey || 'sales').toLowerCase();
  const moduleKeyStr = String(moduleKey || 'unknown').toLowerCase();
  const recordIdStr = String(recordId || '');
  return `${appKeyStr}.${moduleKeyStr}.${recordIdStr}`;
}

/**
 * Get record context from API
 */
async function fetchRecordContext(appKey, moduleKey, recordId) {
  try {
    // Ensure values are strings (handle refs/computed values)
    const appKeyStr = String(appKey || 'sales');
    const moduleKeyStr = String(moduleKey || 'unknown');
    const recordIdStr = String(recordId || '');
    
    const response = await apiClient.get('/relationships/record-context', {
      params: {
        appKey: appKeyStr,
        moduleKey: moduleKeyStr,
        recordId: recordIdStr
      }
    });

    if (response.success && response.data) {
      return response.data;
    }

    // Return safe defaults on error
    return {
      record: { id: recordId, appKey, moduleKey, label: '' },
      relationships: [],
      hasRequiredUnsatisfied: false
    };
  } catch (error) {
    console.error('[useRecordContext] Error fetching record context:', error);
    return {
      record: { id: recordId, appKey, moduleKey, label: '' },
      relationships: [],
      hasRequiredUnsatisfied: false
    };
  }
}

/**
 * Resolve app access mode for the current user
 * This determines if user can link/unlink (EXECUTION) or only view (ADMIN)
 */
async function resolveAccessMode(appKey) {
  const authStore = useAuthStore();
  const user = authStore.user;
  const organization = authStore.organization;

  if (!user || !organization) {
    return { mode: null, canLink: false, canUnlink: false };
  }

  // Owner has ADMIN access (view-only for relationships)
  if (user.isOwner) {
    return { mode: 'ADMIN', canLink: false, canUnlink: false };
  }

  // Check if user has explicit app access
  const appAccess = user.appAccess || [];
  const hasAccess = appAccess.some(
    access => access.appKey === appKey.toUpperCase() && access.status === 'ACTIVE'
  );

  // Legacy: check allowedApps
  const hasLegacyAccess = !hasAccess && (user.allowedApps || []).includes(appKey.toUpperCase());

  if (hasAccess || hasLegacyAccess) {
    // EXECUTION mode - can link/unlink
    return { mode: 'EXECUTION', canLink: true, canUnlink: true };
  }

  // No access
  return { mode: null, canLink: false, canUnlink: false };
}

/**
 * Main composable function
 */
export function useRecordContext(appKey, moduleKey, recordId) {
  const loading = ref(false);
  const error = ref(null);
  const context = ref(null);
  const accessMode = ref(null);

  // Ensure accessors are called to get actual values
  const cacheKey = computed(() => {
    const appKeyValue = typeof appKey === 'function' ? appKey() : appKey;
    const moduleKeyValue = typeof moduleKey === 'function' ? moduleKey() : moduleKey;
    const recordIdValue = typeof recordId === 'function' ? recordId() : recordId;
    return getCacheKey(appKeyValue, moduleKeyValue, recordIdValue);
  });

  // Group relationships by UI display type
  const relatedGroups = computed(() => {
    if (!context.value || !context.value.relationships) {
      return {
        tabs: [],
        embeds: [],
        inlines: []
      };
    }

    const groups = {
      tabs: [],
      embeds: [],
      inlines: []
    };

    context.value.relationships.forEach(rel => {
      const group = {
        relationshipKey: rel.relationshipKey,
        label: rel.ui?.label || rel.label || rel.relationshipKey,
        direction: rel.direction,
        cardinality: rel.cardinality,
        required: rel.required || false,
        requiredSatisfied: rel.requiredSatisfied !== false,
        linkedRecords: rel.records || [],
        ui: rel.ui || {}
      };

      const showAs = (rel.ui?.showAs || 'TAB').toUpperCase();
      
      if (showAs === 'TAB') {
        groups.tabs.push(group);
      } else if (showAs === 'EMBED') {
        groups.embeds.push(group);
      } else if (showAs === 'INLINE') {
        groups.inlines.push(group);
      }
    });

    return groups;
  });

  // Required relationships that are not satisfied
  const requiredRelationships = computed(() => {
    if (!context.value || !context.value.relationships) {
      return [];
    }

    return context.value.relationships.filter(
      rel => rel.required && !rel.requiredSatisfied
    );
  });

  // Check if there are unsatisfied required relationships
  const hasUnsatisfiedRequired = computed(() => {
    return requiredRelationships.value.length > 0;
  });

  // Can link/unlink based on access mode
  const canLink = computed(() => {
    return accessMode.value?.canLink || false;
  });

  const canUnlink = computed(() => {
    return accessMode.value?.canUnlink || false;
  });

  // Load record context
  const load = async (forceRefresh = false) => {
    // Get actual values from accessors
    const appKeyValue = typeof appKey === 'function' ? appKey() : appKey;
    const moduleKeyValue = typeof moduleKey === 'function' ? moduleKey() : moduleKey;
    const recordIdValue = typeof recordId === 'function' ? recordId() : recordId;
    
    const key = cacheKey.value;

    // Check cache first (unless force refresh)
    if (!forceRefresh && contextCache.has(key)) {
      context.value = contextCache.get(key);
      // Still resolve access mode (may have changed)
      accessMode.value = await resolveAccessMode(appKeyValue);
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch context and resolve access in parallel
      const [contextData, access] = await Promise.all([
        fetchRecordContext(appKeyValue, moduleKeyValue, recordIdValue),
        resolveAccessMode(appKeyValue)
      ]);

      // Phase 2E: Enhance linked records with fetched details for better labels
      // SAFETY: Handle broken relationships gracefully (deleted records, disabled apps, etc.)
      if (contextData.relationships) {
        for (const rel of contextData.relationships) {
          if (rel.records && rel.records.length > 0) {
            try {
              // Fetch record details in parallel
              const enhancedRecords = await fetchRecordsForDisplay(rel.records);
              
              // Phase 2E: Filter out null records (deleted or inaccessible)
              // Replace with placeholder rows for broken relationships
              rel.records = enhancedRecords.map((record, index) => {
                const original = rel.records[index];
                
                // If record fetch failed (null), create placeholder
                if (!record) {
                  return {
                    ...original,
                    _isBroken: true,
                    label: 'Related record unavailable',
                    secondaryText: 'Record may have been deleted or access denied',
                    isDisabled: true
                  };
                }
                
                // Phase 2E: Preserve projection metadata from record if available
                // The record context API should include projection metadata
                const projection = record.projection || original.projection;
                
                return {
                  ...record,
                  ...original,
                  primaryField: record.label || record.primaryField,
                  label: record.label,
                  // Phase 2E: Include projection metadata for projection-aware labels
                  projection: projection ? {
                    currentType: projection.currentType,
                    basePrimitive: projection.basePrimitive,
                    appKey: projection.appKey || original.appKey?.toUpperCase() || 'SALES',
                    allowedTypes: projection.allowedTypes,
                    defaultType: projection.defaultType,
                    readOnly: projection.readOnly,
                    platformOwned: projection.platformOwned
                  } : null
                };
              });
            } catch (error) {
              // Phase 2E: Never throw - mark all records as broken
              console.warn('[useRecordContext] Error fetching record details:', error);
              rel.records = rel.records.map(record => ({
                ...record,
                _isBroken: true,
                label: 'Related record unavailable',
                secondaryText: 'Error loading record details',
                isDisabled: true
              }));
            }
          }
        }
      }

      context.value = contextData;
      accessMode.value = access;

      // Cache the context
      contextCache.set(key, contextData);
    } catch (err) {
      error.value = err;
      console.error('[useRecordContext] Error loading context:', err);
    } finally {
      loading.value = false;
    }
  };

  // Refresh context (force reload)
  const refresh = () => {
    const key = cacheKey.value;
    contextCache.delete(key);
    return load(true);
  };

  // Clear cache for this record
  const clearCache = () => {
    const key = cacheKey.value;
    contextCache.delete(key);
    context.value = null;
  };

  return {
    // State
    loading,
    error,
    context,
    accessMode,

    // Computed
    relatedGroups,
    requiredRelationships,
    hasUnsatisfiedRequired,
    canLink,
    canUnlink,

    // Methods
    load,
    refresh,
    clearCache
  };
}

/**
 * Clear all cached contexts (useful on logout)
 */
export function clearAllRecordContextCache() {
  contextCache.clear();
}

