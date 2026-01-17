/**
 * ============================================================================
 * Phase 2B: Projection-Aware Create Form Hook
 * ============================================================================
 * 
 * Composable for projection-aware create forms.
 * 
 * Responsibilities:
 * - Reads projection metadata from API
 * - Exposes allowedTypes, defaultType, isPlatformOwned, isReadOnly
 * - Provides resolveInitialCreatePayload() helper
 * 
 * Rules:
 * - If platform-owned + defaultType exists → auto set it
 * - If only one allowed type → hide selector
 * - If multiple allowed types → show selector
 * - If no projection → fallback safely (current behavior)
 * 
 * Must be:
 * - Pure
 * - Non-throwing
 * - App-agnostic
 * 
 * ============================================================================
 */

import { ref, computed, onMounted } from 'vue';
import apiClient from '@/utils/apiClient';
import { useAppShellStore } from '@/stores/appShell';
import { useRoute } from 'vue-router';


/**
 * Map projection type to model field value
 * Handles differences between projection metadata and actual model values
 */
function mapProjectionTypeToModelValue(moduleKey, projectionType) {
  if (!moduleKey || !projectionType) {
    return null;
  }

  const normalizedModuleKey = (moduleKey || '').toLowerCase();
  const normalizedType = (projectionType || '').toUpperCase();

  // People: Projection uses 'LEAD', 'CONTACT' -> Model uses 'Lead', 'Contact'
  if (normalizedModuleKey === 'people') {
    if (normalizedType === 'LEAD') return 'Lead';
    if (normalizedType === 'CONTACT') return 'Contact';
    if (normalizedType === 'PARTNER') return 'Partner';
    return projectionType; // Fallback to original
  }

  // Form: Projection uses 'SURVEY', 'AUDIT', 'FEEDBACK' -> Model uses 'Survey', 'Audit', 'Feedback'
  if (normalizedModuleKey === 'forms' || normalizedModuleKey === 'form') {
    if (normalizedType === 'SURVEY') return 'Survey';
    if (normalizedType === 'AUDIT') return 'Audit';
    if (normalizedType === 'FEEDBACK') return 'Feedback';
    return projectionType; // Fallback to original
  }

  // Event: Projection uses 'MEETING', 'INTERNAL_AUDIT', etc. -> Model uses specific values
  if (normalizedModuleKey === 'events' || normalizedModuleKey === 'event') {
    if (normalizedType === 'MEETING') return 'Meeting / Appointment';
    if (normalizedType === 'INTERNAL_AUDIT') return 'Internal Audit';
    if (normalizedType === 'EXTERNAL_AUDIT_SINGLE') return 'External Audit — Single Org';
    if (normalizedType === 'EXTERNAL_AUDIT_BEAT') return 'External Audit Beat';
    if (normalizedType === 'FIELD_SALES_BEAT') return 'Field Sales Beat';
    return projectionType; // Fallback to original
  }

  // Organization: Projection uses 'CUSTOMER', 'PARTNER', 'VENDOR'
  if (normalizedModuleKey === 'organizations' || normalizedModuleKey === 'organization') {
    // Keep original case for organizations (may vary)
    return projectionType;
  }

  return projectionType; // Default: return as-is
}

/**
 * Main composable function
 * @param {string} moduleKey - Module key (e.g., 'people', 'events', 'forms')
 * @param {string|null} appKey - Optional app key override (defaults to current app context)
 */
export function useProjectionCreate(moduleKey, appKey = null) {
  const loading = ref(false);
  const error = ref(null);
  const projection = ref(null);

  // Get current app key (from route or store)
  // Note: We need to call useRoute inside the composable, but since it's called at setup time,
  // we can use it directly. For computed, we'll evaluate it lazily.
  const route = useRoute();
  const appShellStore = useAppShellStore();
  
  const currentAppKey = computed(() => {
    if (appKey) return appKey.toUpperCase();
    
    // Try route path first
    if (route.path.startsWith('/audit/')) {
      return 'AUDIT';
    }
    if (route.path.startsWith('/portal/')) {
      return 'PORTAL';
    }
    
    // Fallback to store's active app (defaults to Sales)
    return (appShellStore.activeApp || 'SALES').toUpperCase();
  });

  // Expose projection metadata
  const allowedTypes = computed(() => {
    if (!projection.value) return [];
    return (projection.value.allowedTypes || []).map(type => ({
      projectionType: type,
      modelValue: mapProjectionTypeToModelValue(moduleKey, type)
    }));
  });

  const defaultType = computed(() => {
    if (!projection.value || !projection.value.defaultType) return null;
    const projectionDefaultType = projection.value.defaultType;
    return {
      projectionType: projectionDefaultType,
      modelValue: mapProjectionTypeToModelValue(moduleKey, projectionDefaultType)
    };
  });

  const isPlatformOwned = computed(() => {
    return projection.value ? (projection.value.platformOwned || false) : false;
  });

  const isReadOnly = computed(() => {
    return projection.value ? (projection.value.readOnly || false) : false;
  });

  // Determine if type selector should be shown
  const showTypeSelector = computed(() => {
    if (!projection.value) return false;
    const types = allowedTypes.value;
    return types.length > 1;
  });

  // Determine if type selector should be hidden
  const hideTypeSelector = computed(() => {
    return !showTypeSelector.value;
  });

  /**
   * Resolve initial create payload with projection defaults
   * @param {Object} basePayload - Base payload to merge with
   * @returns {Object} - Payload with projection defaults applied
   */
  const resolveInitialCreatePayload = (basePayload = {}) => {
    if (!projection.value || !isPlatformOwned.value) {
      return basePayload;
    }

    const payload = { ...basePayload };

    // Auto-set default type if platform-owned and defaultType exists
    if (defaultType.value && defaultType.value.modelValue) {
      // Determine the type field name based on module
      const typeField = getTypeFieldName(moduleKey);
      if (typeField && !payload[typeField]) {
        payload[typeField] = defaultType.value.modelValue;
      }
    }

    return payload;
  };

  /**
   * Get type field name for module
   */
  function getTypeFieldName(moduleKey) {
    const normalized = (moduleKey || '').toLowerCase();
    if (normalized === 'people') return 'type';
    if (normalized === 'forms' || normalized === 'form') return 'formType';
    if (normalized === 'events' || normalized === 'event') return 'eventType';
    if (normalized === 'organizations' || normalized === 'organization') return 'type';
    return 'type'; // Default
  }

  /**
   * Validate if a type is allowed
   * @param {string} type - Type to validate (model value)
   * @returns {boolean} - True if allowed
   */
  const isTypeAllowed = (type) => {
    if (!projection.value || !type) return true; // Allow if no projection
    
    const normalizedType = (type || '').toUpperCase();
    const allowed = allowedTypes.value.map(t => t.projectionType.toUpperCase());
    
    // Check if type matches any allowed type (via model value or projection type)
    return allowedTypes.value.some(allowedType => {
      const modelValueUpper = (allowedType.modelValue || '').toUpperCase();
      const projectionTypeUpper = allowedType.projectionType.toUpperCase();
      return modelValueUpper === normalizedType || projectionTypeUpper === normalizedType;
    });
  };

  /**
   * Load projection metadata
   * @param {boolean} forceRefresh - Force refresh even if cached
   */
  const load = async (forceRefresh = false) => {
    const appKeyValue = currentAppKey.value;
    const moduleKeyValue = moduleKey;

    if (!appKeyValue || !moduleKeyValue) {
      console.warn('[useProjectionCreate] Missing appKey or moduleKey');
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get(`/ui/projection/${appKeyValue}/${moduleKeyValue}`);
      
      if (response.success) {
        projection.value = response.data;
      } else {
        projection.value = null;
      }
    } catch (err) {
      console.error('[useProjectionCreate] Error loading projection:', err);
      error.value = err;
      projection.value = null; // Fail safely
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    loading,
    error,
    projection,

    // Computed
    allowedTypes,
    defaultType,
    isPlatformOwned,
    isReadOnly,
    showTypeSelector,
    hideTypeSelector,
    currentAppKey,

    // Methods
    load,
    resolveInitialCreatePayload,
    isTypeAllowed
  };
}

