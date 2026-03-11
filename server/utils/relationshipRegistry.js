/**
 * ============================================================================
 * Platform Relationship Registry Utilities
 * ============================================================================
 *
 * Helper functions for reading platform-level relationship metadata.
 * Includes an in-memory cache of enabled relationshipKeys for fast validation
 * (registry.has(key)) without DB queries. Call refreshRelationshipKeyCache()
 * at server startup to populate the cache.
 *
 * ⚠️ This is READ-ONLY metadata access - no business logic
 * ⚠️ No tenant data, no permissions enforcement
 * ⚠️ Never throws - returns empty arrays/objects instead
 *
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const RelationshipDefinition = require('../models/RelationshipDefinition');
const AppDefinition = require('../models/AppDefinition');
const ModuleDefinition = require('../models/ModuleDefinition');

// In-memory cache of enabled relationshipKeys (lowercase). Populated by refreshRelationshipKeyCache().
let _enabledKeysSet = new Set();
// Map: relationshipKey (lowercase) -> { source: { appKey, moduleKey }, target: { appKey, moduleKey } } for validation
let _definitionsByKey = new Map();
// Reverse index: targetKey (appKey.moduleKey) -> array of { relationshipKey, source, target } where module is the target
let _reverseByTarget = new Map();

/**
 * Refresh the relationshipKey cache from the database. Call at server startup.
 * Safe to call repeatedly; each call replaces the cache with current enabled keys, source/target, and reverse index.
 * @returns {Promise<void>}
 */
async function refreshRelationshipKeyCache() {
  try {
    const docs = await RelationshipDefinition.find({ enabled: true })
      .select('relationshipKey source target')
      .lean();
    _enabledKeysSet = new Set();
    _definitionsByKey = new Map();
    _reverseByTarget = new Map();
    for (const doc of docs || []) {
      const k = String(doc.relationshipKey || '').trim().toLowerCase();
      if (!k) continue;
      const def = {
        source: {
          appKey: (doc.source?.appKey || '').toString().toLowerCase(),
          moduleKey: (doc.source?.moduleKey || '').toString().toLowerCase()
        },
        target: {
          appKey: (doc.target?.appKey || '').toString().toLowerCase(),
          moduleKey: (doc.target?.moduleKey || '').toString().toLowerCase()
        }
      };
      _enabledKeysSet.add(k);
      _definitionsByKey.set(k, def);
      const targetKey = `${def.target.appKey}.${def.target.moduleKey}`;
      if (!_reverseByTarget.has(targetKey)) _reverseByTarget.set(targetKey, []);
      _reverseByTarget.get(targetKey).push({ relationshipKey: k, source: def.source, target: def.target });
    }
  } catch (error) {
    console.error('[relationshipRegistry] Error refreshing relationshipKey cache:', error);
    _enabledKeysSet = new Set();
    _definitionsByKey = new Map();
    _reverseByTarget = new Map();
  }
}

/** Normalize key before registry access so case/whitespace mismatches cannot slip through. */
function normalizeKey(key) {
  if (key == null) return '';
  return String(key).trim().toLowerCase();
}

/**
 * Check whether a relationshipKey exists in the platform (enabled). Uses cache only.
 * Key is normalized (trim + toLowerCase) before lookup.
 * @param {string} key - relationshipKey (case-insensitive)
 * @returns {boolean}
 */
function has(key) {
  if (!key) return false;
  return _enabledKeysSet.has(normalizeKey(key));
}

/**
 * Get cached definition (source/target) for a relationshipKey. Uses cache only; no DB query.
 * Key is normalized (trim + toLowerCase) before lookup.
 * @param {string} key - relationshipKey (case-insensitive)
 * @returns {{ source: { appKey: string, moduleKey: string }, target: { appKey: string, moduleKey: string } } | undefined}
 */
function get(key) {
  if (!key) return undefined;
  return _definitionsByKey.get(normalizeKey(key));
}

/**
 * Get the Set of enabled relationshipKeys (lowercase). Read-only; do not mutate.
 * Empty if cache has not been populated.
 * @returns {Set<string>}
 */
function getEnabledKeysSet() {
  return _enabledKeysSet;
}

/**
 * Get all enabled relationships
 * @returns {Promise<Array>} - Array of all enabled relationship definitions
 */
async function getAllRelationships() {
  try {
    const relationships = await RelationshipDefinition.find({ enabled: true })
      .sort({ relationshipKey: 1 });
    return relationships;
  } catch (error) {
    console.error('[relationshipRegistry] Error getting all relationships:', error);
    return [];
  }
}

/**
 * Get all relationships for a specific module (both incoming and outgoing)
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<Array>} - Array of relationship definitions where the module is source or target
 */
async function getRelationshipsForModule(appKey, moduleKey) {
  try {
    const normalizedAppKey = appKey.toLowerCase();
    const normalizedModuleKey = moduleKey.toLowerCase();
    
    const relationships = await RelationshipDefinition.find({
      enabled: true,
      $or: [
        {
          'source.appKey': normalizedAppKey,
          'source.moduleKey': normalizedModuleKey
        },
        {
          'target.appKey': normalizedAppKey,
          'target.moduleKey': normalizedModuleKey
        }
      ]
    }).sort({ relationshipKey: 1 });
    
    return relationships;
  } catch (error) {
    console.error(`[relationshipRegistry] Error getting relationships for module ${appKey}.${moduleKey}:`, error);
    return [];
  }
}

/**
 * Get outgoing relationships from a specific module (where module is the source)
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<Array>} - Array of relationship definitions where the module is the source
 */
async function getOutgoingRelationships(appKey, moduleKey) {
  try {
    const normalizedAppKey = appKey.toLowerCase();
    const normalizedModuleKey = moduleKey.toLowerCase();
    
    const relationships = await RelationshipDefinition.find({
      enabled: true,
      'source.appKey': normalizedAppKey,
      'source.moduleKey': normalizedModuleKey
    }).sort({ relationshipKey: 1 });
    
    return relationships;
  } catch (error) {
    console.error(`[relationshipRegistry] Error getting outgoing relationships for ${appKey}.${moduleKey}:`, error);
    return [];
  }
}

/**
 * Get relationships where the given module is the target (incoming links).
 * Uses the reverse index built during refreshRelationshipKeyCache(); no DB query.
 * Allows record pages to discover which modules can link to the current module.
 * @param {string} appKey - Target app key (case-insensitive)
 * @param {string} moduleKey - Target module key (case-insensitive)
 * @returns {Array<{ relationshipKey: string, source: { appKey: string, moduleKey: string }, target: { appKey: string, moduleKey: string } }>}
 */
function getIncomingRelationships(appKey, moduleKey) {
  if (!appKey || !moduleKey) return [];
  const targetKey = `${String(appKey).trim().toLowerCase()}.${String(moduleKey).trim().toLowerCase()}`;
  const list = _reverseByTarget.get(targetKey) || [];
  return list.slice();
}

/**
 * Get a specific relationship by its key
 * @param {string} relationshipKey - The relationship key
 * @returns {Promise<Object|null>} - Relationship definition or null if not found
 */
async function getRelationshipByKey(relationshipKey) {
  try {
    const relationship = await RelationshipDefinition.findOne({
      relationshipKey: relationshipKey.toLowerCase(),
      enabled: true
    });
    return relationship;
  } catch (error) {
    console.error(`[relationshipRegistry] Error getting relationship ${relationshipKey}:`, error);
    return null;
  }
}

/**
 * Check if a relationship is required for a specific module
 * @param {string} appKey - The app key
 * @param {string} moduleKey - The module key
 * @returns {Promise<boolean>} - True if the module has any required relationships
 */
async function isRelationshipRequired(appKey, moduleKey) {
  try {
    const relationships = await getRelationshipsForModule(appKey, moduleKey);
    return relationships.some(rel => rel.required === true);
  } catch (error) {
    console.error(`[relationshipRegistry] Error checking if relationship is required for ${appKey}.${moduleKey}:`, error);
    return false;
  }
}

/**
 * Check if automation is allowed for a specific relationship
 * @param {string} relationshipKey - The relationship key
 * @returns {Promise<boolean>} - True if automation is allowed for this relationship
 */
async function isRelationshipAutomationAllowed(relationshipKey) {
  try {
    const relationship = await getRelationshipByKey(relationshipKey);
    if (!relationship) {
      return false;
    }
    return relationship.automation && relationship.automation.allowed === true;
  } catch (error) {
    console.error(`[relationshipRegistry] Error checking automation allowance for ${relationshipKey}:`, error);
    return false;
  }
}

/**
 * ============================================================================
 * Validation Helpers
 * ============================================================================
 */

/**
 * Validate that source and target apps/modules exist
 * @param {string} sourceAppKey - Source app key
 * @param {string} sourceModuleKey - Source module key
 * @param {string} targetAppKey - Target app key
 * @param {string} targetModuleKey - Target module key
 * @returns {Promise<{valid: boolean, errors: Array<string>}>} - Validation result
 */
async function validateAppsAndModulesExist(sourceAppKey, sourceModuleKey, targetAppKey, targetModuleKey) {
  const errors = [];
  
  try {
    // Validate source app
    const sourceApp = await AppDefinition.findOne({ appKey: sourceAppKey.toLowerCase() });
    if (!sourceApp) {
      errors.push(`Source app '${sourceAppKey}' does not exist`);
    }
    
    // Validate target app
    const targetApp = await AppDefinition.findOne({ appKey: targetAppKey.toLowerCase() });
    if (!targetApp) {
      errors.push(`Target app '${targetAppKey}' does not exist`);
    }
    
    // Validate source module
    const sourceModule = await ModuleDefinition.findOne({
      appKey: sourceAppKey.toLowerCase(),
      moduleKey: sourceModuleKey.toLowerCase()
    });
    if (!sourceModule) {
      errors.push(`Source module '${sourceAppKey}.${sourceModuleKey}' does not exist`);
    }
    
    // Validate target module
    const targetModule = await ModuleDefinition.findOne({
      appKey: targetAppKey.toLowerCase(),
      moduleKey: targetModuleKey.toLowerCase()
    });
    if (!targetModule) {
      errors.push(`Target module '${targetAppKey}.${targetModuleKey}' does not exist`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('[relationshipRegistry] Error validating apps and modules:', error);
    return {
      valid: false,
      errors: ['Validation error: ' + error.message]
    };
  }
}

/**
 * Check if a module is trying to relate to itself
 * @param {string} sourceAppKey - Source app key
 * @param {string} sourceModuleKey - Source module key
 * @param {string} targetAppKey - Target app key
 * @param {string} targetModuleKey - Target module key
 * @returns {boolean} - True if source and target are the same
 */
function isSelfRelation(sourceAppKey, sourceModuleKey, targetAppKey, targetModuleKey) {
  return sourceAppKey.toLowerCase() === targetAppKey.toLowerCase() &&
         sourceModuleKey.toLowerCase() === targetModuleKey.toLowerCase();
}

/**
 * Check if a duplicate relationship already exists
 * @param {string} sourceAppKey - Source app key
 * @param {string} sourceModuleKey - Source module key
 * @param {string} targetAppKey - Target app key
 * @param {string} targetModuleKey - Target module key
 * @param {string} excludeRelationshipKey - Optional relationship key to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if duplicate exists
 */
async function isDuplicateRelationship(sourceAppKey, sourceModuleKey, targetAppKey, targetModuleKey, excludeRelationshipKey = null) {
  try {
    const query = {
      'source.appKey': sourceAppKey.toLowerCase(),
      'source.moduleKey': sourceModuleKey.toLowerCase(),
      'target.appKey': targetAppKey.toLowerCase(),
      'target.moduleKey': targetModuleKey.toLowerCase()
    };
    
    if (excludeRelationshipKey) {
      query.relationshipKey = { $ne: excludeRelationshipKey.toLowerCase() };
    }
    
    const existing = await RelationshipDefinition.findOne(query);
    return !!existing;
  } catch (error) {
    console.error('[relationshipRegistry] Error checking for duplicate relationship:', error);
    return false;
  }
}

/**
 * Check for cardinality conflicts (e.g., two required ONE_TO_ONE from same module)
 * @param {string} sourceAppKey - Source app key
 * @param {string} sourceModuleKey - Source module key
 * @param {string} cardinality - The cardinality type
 * @param {boolean} required - Whether the relationship is required
 * @param {string} excludeRelationshipKey - Optional relationship key to exclude from check (for updates)
 * @returns {Promise<{valid: boolean, errors: Array<string>}>} - Validation result
 */
async function validateCardinalityConflicts(sourceAppKey, sourceModuleKey, cardinality, required, excludeRelationshipKey = null) {
  const errors = [];
  
  try {
    // If it's a required ONE_TO_ONE relationship, check for other required ONE_TO_ONE from same source
    if (cardinality === 'ONE_TO_ONE' && required) {
      const query = {
        'source.appKey': sourceAppKey.toLowerCase(),
        'source.moduleKey': sourceModuleKey.toLowerCase(),
        cardinality: 'ONE_TO_ONE',
        required: true,
        enabled: true
      };
      
      if (excludeRelationshipKey) {
        query.relationshipKey = { $ne: excludeRelationshipKey.toLowerCase() };
      }
      
      const conflicting = await RelationshipDefinition.findOne(query);
      if (conflicting) {
        errors.push(`Cannot have multiple required ONE_TO_ONE relationships from ${sourceAppKey}.${sourceModuleKey}. Existing relationship: ${conflicting.relationshipKey}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('[relationshipRegistry] Error validating cardinality conflicts:', error);
    return {
      valid: false,
      errors: ['Cardinality validation error: ' + error.message]
    };
  }
}

/**
 * Validate a relationship definition before creation/update
 * @param {Object} relationshipData - The relationship data to validate
 * @param {string} excludeRelationshipKey - Optional relationship key to exclude from duplicate checks (for updates)
 * @returns {Promise<{valid: boolean, errors: Array<string>}>} - Validation result
 */
async function validateRelationship(relationshipData, excludeRelationshipKey = null) {
  const errors = [];
  
  try {
    const { source, target, cardinality, required } = relationshipData;
    
    // Validate apps and modules exist
    const appsModulesValidation = await validateAppsAndModulesExist(
      source.appKey,
      source.moduleKey,
      target.appKey,
      target.moduleKey
    );
    if (!appsModulesValidation.valid) {
      errors.push(...appsModulesValidation.errors);
    }
    
    // Check for self-relation (unless explicitly allowed in future)
    if (isSelfRelation(source.appKey, source.moduleKey, target.appKey, target.moduleKey)) {
      errors.push('A module cannot relate to itself');
    }
    
    // Check for duplicate relationships
    const isDuplicate = await isDuplicateRelationship(
      source.appKey,
      source.moduleKey,
      target.appKey,
      target.moduleKey,
      excludeRelationshipKey
    );
    if (isDuplicate) {
      errors.push(`Duplicate relationship already exists between ${source.appKey}.${source.moduleKey} and ${target.appKey}.${target.moduleKey}`);
    }
    
    // Validate cardinality conflicts
    const cardinalityValidation = await validateCardinalityConflicts(
      source.appKey,
      source.moduleKey,
      cardinality,
      required,
      excludeRelationshipKey
    );
    if (!cardinalityValidation.valid) {
      errors.push(...cardinalityValidation.errors);
    }
    
    // Validate that required relationships cannot be disabled
    if (relationshipData.enabled === false && required === true) {
      errors.push('Required relationships cannot be disabled');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('[relationshipRegistry] Error validating relationship:', error);
    return {
      valid: false,
      errors: ['Validation error: ' + error.message]
    };
  }
}

module.exports = {
  refreshRelationshipKeyCache,
  has,
  get,
  getEnabledKeysSet,
  getAllRelationships,
  getRelationshipsForModule,
  getOutgoingRelationships,
  getIncomingRelationships,
  getRelationshipByKey,
  isRelationshipRequired,
  isRelationshipAutomationAllowed,
  validateAppsAndModulesExist,
  isSelfRelation,
  isDuplicateRelationship,
  validateCardinalityConflicts,
  validateRelationship
};

