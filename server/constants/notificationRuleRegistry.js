const ModuleDefinition = require('../models/ModuleDefinition');

/**
 * Notification Rule Registry
 * 
 * Phase 16: Dynamic module-based rule registry.
 * 
 * Rules are now derived from ModuleDefinition.notifications metadata:
 * - module.notifications.ruleEligible === true
 * - module.notifications.supportedEvents contains the event type
 * 
 * This replaces hardcoded whitelisting and allows any module to become
 * rule-eligible by declaring capabilities.
 * 
 * Legacy hardcoded rules remain for backward compatibility with existing
 * TASK, AUDIT, and CORRECTIVE_ACTION rules.
 */
const LEGACY_RULES = {
  CRM: {
    TASK: ['ASSIGNED', 'STATUS_CHANGED'],
    AUDIT: ['STATUS_CHANGED']
  },
  AUDIT: {
    AUDIT: ['ASSIGNED', 'STATUS_CHANGED'],
    CORRECTIVE_ACTION: ['CREATED', 'STATUS_CHANGED']
  },
  PORTAL: {
    CORRECTIVE_ACTION: ['ASSIGNED', 'STATUS_CHANGED']
  }
};

/**
 * Get default notification metadata for system modules.
 * Phase 17: Default configuration for rule-eligible system modules.
 * These defaults are used when a ModuleDefinition document doesn't exist in the database.
 */
function getDefaultNotificationMetadata(moduleKey) {
  const defaults = {
    tasks: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo', 'priority', 'status']
    },
    deals: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo', 'status']
    },
    people: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo']
    },
    organizations: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo']
    },
    events: {
      ruleEligible: true,
      supportedEvents: ['ASSIGNED', 'STATUS_CHANGED'],
      supportedConditions: ['assignedTo', 'status']
    }
    // Other modules (forms, items, imports, reports, users) are not rule-eligible by default
  };
  
  return defaults[moduleKey] || {
    ruleEligible: false,
    supportedEvents: [],
    supportedConditions: []
  };
}

/**
 * Check if a module supports notification rules and the given event type.
 * 
 * @param {String} organizationId - Organization ID
 * @param {String} appKey - App key ('CRM', 'AUDIT', 'PORTAL')
 * @param {String} moduleKey - Module key (e.g., 'tasks', 'deals', 'contacts')
 * @param {String} eventType - Event type ('ASSIGNED', 'CREATED', 'STATUS_CHANGED', 'DUE_SOON')
 * @returns {Promise<Object>} { valid: boolean, message?: string, module?: Object }
 */
async function validateModuleRule(organizationId, appKey, moduleKey, eventType) {
  try {
    // Normalize moduleKey to lowercase for consistency
    const normalizedModuleKey = (moduleKey || '').toLowerCase().trim();
    
    // For CRM apps, check ModuleDefinition or system defaults
    if (appKey === 'CRM') {
      // Try to find module in database (try both original and normalized key)
      let module = await ModuleDefinition.findOne({
        organizationId,
        $or: [
          { key: moduleKey },
          { key: normalizedModuleKey }
        ],
        enabled: { $ne: false } // Allow undefined/null enabled (system modules)
      });

      // If no module found in DB, check if it's a system module with defaults
      let notificationMetadata = null;
      if (module && module.notifications) {
        notificationMetadata = module.notifications;
      } else {
        // Check system module defaults (for modules that don't have ModuleDefinition documents)
        // Try both original and normalized keys
        const systemDefaults = getDefaultNotificationMetadata(normalizedModuleKey) || getDefaultNotificationMetadata(moduleKey);
        
        if (systemDefaults && systemDefaults.ruleEligible) {
          notificationMetadata = systemDefaults;
        }
      }

      if (!notificationMetadata) {
        // Debug logging
        console.log('[notificationRuleRegistry] Module not found:', {
          organizationId: String(organizationId),
          appKey,
          moduleKey,
          normalizedModuleKey,
          foundInDB: !!module,
          systemDefaults: getDefaultNotificationMetadata(normalizedModuleKey)
        });
        return { valid: false, message: `Module "${moduleKey}" not found or disabled` };
      }

      // Check if module is rule-eligible
      if (!notificationMetadata.ruleEligible) {
        return { valid: false, message: `Module "${moduleKey}" is not eligible for notification rules` };
      }

      // Check if event type is supported
      const supportedEvents = notificationMetadata.supportedEvents || [];
      if (!supportedEvents.includes(eventType)) {
        return { valid: false, message: `Event type "${eventType}" not supported by module "${moduleKey}". Supported: ${supportedEvents.join(', ')}` };
      }

      return { valid: true, module: module || { key: moduleKey, notifications: notificationMetadata } };
    }

    // For non-CRM apps (AUDIT, PORTAL), use legacy validation
    // This maintains backward compatibility
    const legacyAppRules = LEGACY_RULES[appKey];
    if (!legacyAppRules) {
      return { valid: false, message: `App "${appKey}" does not support notification rules` };
    }

    // Map moduleKey to legacy entityType for backward compatibility
    const entityTypeMapping = {
      'tasks': 'TASK',
      'audit': 'AUDIT',
      'corrective_action': 'CORRECTIVE_ACTION'
    };
    const entityType = entityTypeMapping[moduleKey] || moduleKey.toUpperCase();

    const allowedEvents = legacyAppRules[entityType];
    if (!allowedEvents) {
      return { valid: false, message: `Module "${moduleKey}" (${entityType}) not supported for app "${appKey}"` };
    }

    if (!allowedEvents.includes(eventType)) {
      return { valid: false, message: `Event type "${eventType}" not supported for ${entityType} in app "${appKey}"` };
    }

    return { valid: true };
  } catch (err) {
    console.error('[notificationRuleRegistry] Error validating module rule:', err);
    return { valid: false, message: 'Error validating module rule' };
  }
}

/**
 * Get supported condition keys for a module.
 * 
 * @param {String} organizationId - Organization ID
 * @param {String} appKey - App key
 * @param {String} moduleKey - Module key
 * @returns {Promise<String[]>} Array of supported condition keys
 */
async function getSupportedConditions(organizationId, appKey, moduleKey) {
  if (appKey === 'CRM') {
    // Normalize moduleKey to lowercase
    const normalizedModuleKey = (moduleKey || '').toLowerCase().trim();
    
    const module = await ModuleDefinition.findOne({
      organizationId,
      $or: [
        { key: moduleKey },
        { key: normalizedModuleKey }
      ],
      enabled: { $ne: false }
    });

    // Check database first
    if (module && module.notifications && module.notifications.supportedConditions) {
      return module.notifications.supportedConditions;
    }

    // Fall back to system defaults (try both normalized and original)
    const systemDefaults = getDefaultNotificationMetadata(normalizedModuleKey) || getDefaultNotificationMetadata(moduleKey);
    if (systemDefaults && systemDefaults.supportedConditions && systemDefaults.supportedConditions.length > 0) {
      return systemDefaults.supportedConditions;
    }
  }

  // Default supported conditions (backward compatibility)
  return ['assignedTo', 'priority', 'status'];
}

module.exports = {
  validateModuleRule,
  getSupportedConditions,
  LEGACY_RULES // Exported for backward compatibility
};

