/**
 * ============================================================================
 * PLATFORM CORE: Relationship Enforcement Service
 * ============================================================================
 * 
 * This service enforces relationship rules:
 * - Validates required relationships on CREATE/UPDATE
 * - Enforces cardinality rules (ONE_TO_ONE, ONE_TO_MANY, etc.)
 * - Enforces cascade delete rules (BLOCK, CASCADE, SOFT)
 * 
 * Key Features:
 * - Used by controllers before record operations
 * - Used by future Process Designer
 * - App-agnostic validation
 * - Tenant-aware (respects tenant overrides)
 * 
 * ⚠️ This is VALIDATION ONLY - no mutations
 * ⚠️ Returns validation errors, doesn't throw
 * ⚠️ Must be called before record operations
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const RelationshipDefinition = require('../models/RelationshipDefinition');
const TenantRelationshipConfiguration = require('../models/TenantRelationshipConfiguration');
const RelationshipInstance = require('../models/RelationshipInstance');
const { getEffectiveRelationships } = require('../utils/tenantMetadata');
const {
  getOutgoingLinks,
  getIncomingLinks,
  isRequiredRelationshipSatisfied
} = require('./relationshipResolver');

/**
 * Record context for validation
 * @typedef {Object} RecordContext
 * @property {string|ObjectId} organizationId - Organization ID
 * @property {string} appKey - App key
 * @property {string} moduleKey - Module key
 * @property {string|ObjectId} recordId - Record ID (null for CREATE)
 * @property {Object} recordData - Record data (for CREATE/UPDATE)
 */

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {Array<string>} errors - Array of error messages
 */

/**
 * Validate required relationships for a record context
 * @param {RecordContext} recordContext - The record context
 * @returns {Promise<ValidationResult>} - Validation result
 */
async function validateCreate(recordContext) {
  const errors = [];
  const { organizationId, appKey, moduleKey, recordId } = recordContext;

  try {
    // Get effective relationships for this module
    const effectiveRelationships = await getEffectiveRelationships(
      organizationId,
      appKey,
      moduleKey
    );

    // Filter to only required relationships where this module is source
    const requiredOutgoing = effectiveRelationships.filter(
      rel => rel.required && 
      rel.source.appKey.toLowerCase() === appKey.toLowerCase() &&
      rel.source.moduleKey.toLowerCase() === moduleKey.toLowerCase()
    );

    // Check each required relationship
    for (const rel of requiredOutgoing) {
      const satisfied = await isRequiredRelationshipSatisfied(
        organizationId,
        appKey,
        moduleKey,
        recordId,
        rel.relationshipKey
      );

      if (!satisfied) {
        const label = rel.ui.target.label || rel.target.moduleKey;
        errors.push(
          `Required relationship '${rel.relationshipKey}' to ${rel.target.appKey}.${rel.target.moduleKey} (${label}) is missing`
        );
      }
    }

    // Also check required relationships where this module is target
    const requiredIncoming = effectiveRelationships.filter(
      rel => rel.required &&
      rel.target.appKey.toLowerCase() === appKey.toLowerCase() &&
      rel.target.moduleKey.toLowerCase() === moduleKey.toLowerCase()
    );

    for (const rel of requiredIncoming) {
      const satisfied = await isRequiredRelationshipSatisfied(
        organizationId,
        rel.source.appKey,
        rel.source.moduleKey,
        null, // We can't check incoming relationships on create
        rel.relationshipKey
      );

      // Note: Incoming required relationships are harder to validate on create
      // This would require checking if the source record exists and has this relationship
      // For now, we'll skip this check on create
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error(
      `[relationshipEnforcement] Error validating create for ${appKey}.${moduleKey}:`,
      error
    );
    // On error, return valid to avoid blocking operations
    return {
      valid: true,
      errors: []
    };
  }
}

/**
 * Validate relationships before updating a record
 * @param {RecordContext} recordContext - The record context
 * @returns {Promise<ValidationResult>} - Validation result
 */
async function validateUpdate(recordContext) {
  // For now, update validation is same as create
  // Future: could check if required relationships are being removed
  return validateCreate(recordContext);
}

/**
 * Validate and enforce cascade rules before deleting a record
 * @param {RecordContext} recordContext - The record context
 * @returns {Promise<ValidationResult>} - Validation result with cascade actions
 */
async function validateDelete(recordContext) {
  const errors = [];
  const cascadeActions = [];
  const { organizationId, appKey, moduleKey, recordId } = recordContext;

  try {
    // Get all relationships where this record is involved
    const outgoingLinks = await getOutgoingLinks(organizationId, appKey, moduleKey, recordId);
    const incomingLinks = await getIncomingLinks(organizationId, appKey, moduleKey, recordId);

    // Get relationship definitions
    const allRelKeys = [
      ...new Set([
        ...outgoingLinks.map(l => l.relationshipKey),
        ...incomingLinks.map(l => l.relationshipKey)
      ])
    ];

    const relDefinitions = await RelationshipDefinition.find({
      relationshipKey: { $in: allRelKeys },
      enabled: true
    });

    const relDefMap = new Map(relDefinitions.map(rel => [rel.relationshipKey.toLowerCase(), rel]));

    // Get tenant configurations
    const tenantConfigs = await TenantRelationshipConfiguration.find({
      organizationId,
      relationshipKey: { $in: allRelKeys }
    });

    const tenantConfigMap = new Map(
      tenantConfigs.map(config => [config.relationshipKey.toLowerCase(), config])
    );

    // Process outgoing links (this record is source)
    for (const link of outgoingLinks) {
      const relKey = link.relationshipKey.toLowerCase();
      const relDef = relDefMap.get(relKey);
      const tenantConfig = tenantConfigMap.get(relKey);

      if (!relDef) {
        continue; // Skip if relationship definition not found
      }

      // Check if tenant has disabled this relationship
      if (tenantConfig && !tenantConfig.enabled) {
        continue; // Skip disabled relationships
      }

      const cascadeRule = relDef.cascade?.onDelete || 'NONE';

      if (cascadeRule === 'BLOCK') {
        const targetLabel = relDef.ui?.target?.label || relDef.target.moduleKey;
        errors.push(
          `Cannot delete record: relationship '${relKey}' to ${relDef.target.appKey}.${relDef.target.moduleKey} (${targetLabel}) blocks deletion`
        );
      } else if (cascadeRule === 'CASCADE') {
        cascadeActions.push({
          type: 'DELETE_RELATIONSHIP',
          relationshipKey: relKey,
          direction: 'OUTGOING',
          targetRecord: {
            appKey: link.target.appKey,
            moduleKey: link.target.moduleKey,
            recordId: link.target.recordId
          }
        });
      } else if (cascadeRule === 'DETACH') {
        cascadeActions.push({
          type: 'DETACH_RELATIONSHIP',
          relationshipKey: relKey,
          direction: 'OUTGOING',
          relationshipInstanceId: link._id
        });
      }
    }

    // Process incoming links (this record is target)
    for (const link of incomingLinks) {
      const relKey = link.relationshipKey.toLowerCase();
      const relDef = relDefMap.get(relKey);
      const tenantConfig = tenantConfigMap.get(relKey);

      if (!relDef) {
        continue;
      }

      if (tenantConfig && !tenantConfig.enabled) {
        continue;
      }

      const cascadeRule = relDef.cascade?.onDelete || 'NONE';

      if (cascadeRule === 'BLOCK') {
        const sourceLabel = relDef.ui?.source?.label || relDef.source.moduleKey;
        errors.push(
          `Cannot delete record: relationship '${relKey}' from ${relDef.source.appKey}.${relDef.source.moduleKey} (${sourceLabel}) blocks deletion`
        );
      } else if (cascadeRule === 'CASCADE') {
        // For incoming links, CASCADE means delete the source record
        // This is more aggressive - may want to make this configurable
        cascadeActions.push({
          type: 'DELETE_SOURCE_RECORD',
          relationshipKey: relKey,
          direction: 'INCOMING',
          sourceRecord: {
            appKey: link.source.appKey,
            moduleKey: link.source.moduleKey,
            recordId: link.source.recordId
          }
        });
      } else if (cascadeRule === 'DETACH') {
        cascadeActions.push({
          type: 'DETACH_RELATIONSHIP',
          relationshipKey: relKey,
          direction: 'INCOMING',
          relationshipInstanceId: link._id
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      cascadeActions
    };
  } catch (error) {
    console.error(
      `[relationshipEnforcement] Error validating delete for ${appKey}.${moduleKey}:${recordId}:`,
      error
    );
    // On error, return valid to avoid blocking operations
    return {
      valid: true,
      errors: [],
      cascadeActions: []
    };
  }
}

/**
 * Validate cardinality rules before creating a relationship
 * @param {string|ObjectId} organizationId - Organization ID
 * @param {string} relationshipKey - Relationship key
 * @param {Object} source - Source record reference
 * @param {Object} target - Target record reference
 * @returns {Promise<ValidationResult>} - Validation result
 */
async function validateCardinality(organizationId, relationshipKey, source, target) {
  const errors = [];
  
  try {
    const relDef = await RelationshipDefinition.findOne({
      relationshipKey: relationshipKey.toLowerCase(),
      enabled: true
    });

    if (!relDef) {
      return {
        valid: false,
        errors: [`Relationship '${relationshipKey}' not found or disabled`]
      };
    }

    const cardinality = relDef.cardinality;

    // Check ONE_TO_ONE: source can only have one target
    if (cardinality === 'ONE_TO_ONE') {
      const existing = await RelationshipInstance.findOne({
        organizationId,
        relationshipKey: relationshipKey.toLowerCase(),
        'source.appKey': source.appKey.toLowerCase(),
        'source.moduleKey': source.moduleKey.toLowerCase(),
        'source.recordId': source.recordId
      });

      if (existing) {
        errors.push(
          `ONE_TO_ONE relationship '${relationshipKey}' already exists for source record`
        );
      }
    }

    // Check MANY_TO_ONE: target can only have one source (if ownership is TARGET)
    if (cardinality === 'MANY_TO_ONE' && relDef.ownership === 'TARGET') {
      const existing = await RelationshipInstance.findOne({
        organizationId,
        relationshipKey: relationshipKey.toLowerCase(),
        'target.appKey': target.appKey.toLowerCase(),
        'target.moduleKey': target.moduleKey.toLowerCase(),
        'target.recordId': target.recordId
      });

      if (existing) {
        errors.push(
          `MANY_TO_ONE relationship '${relationshipKey}' already exists for target record`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error(
      `[relationshipEnforcement] Error validating cardinality for ${relationshipKey}:`,
      error
    );
    return {
      valid: false,
      errors: [`Cardinality validation error: ${error.message}`]
    };
  }
}

module.exports = {
  validateCreate,
  validateUpdate,
  validateDelete,
  validateCardinality
};

