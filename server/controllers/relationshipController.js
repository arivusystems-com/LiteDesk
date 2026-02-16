/**
 * ============================================================================
 * PLATFORM CORE: Relationship Controller
 * ============================================================================
 * 
 * This controller handles relationship operations:
 * - Link records (create relationship instance)
 * - Unlink records (delete relationship instance)
 * - Get record context (relationships for a record)
 * 
 * Key Features:
 * - Validates against platform + tenant metadata
 * - Enforces permissions (stub hooks for now)
 * - Respects ownership rules from RelationshipDefinition
 * - App-agnostic
 * 
 * ⚠️ No UI components yet - JSON API only
 * ⚠️ Permission enforcement stubbed (to be implemented later)
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const RelationshipInstance = require('../models/RelationshipInstance');
const RelationshipDefinition = require('../models/RelationshipDefinition');
const TenantRelationshipConfiguration = require('../models/TenantRelationshipConfiguration');
const Task = require('../models/Task');
const { validateCardinality } = require('../services/relationshipEnforcement');
const { getRecordContextForUI } = require('../services/recordContextService');
const { getEffectiveRelationships } = require('../utils/tenantMetadata');

const getActorName = (user) => {
  if (!user) return 'System';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.username || user.email || 'System';
};

/**
 * Link two records with a relationship
 * POST /api/relationships/link
 */
exports.linkRecords = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { relationshipKey, source, target } = req.body;

    // Validate required fields
    if (!relationshipKey || !source || !target) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: relationshipKey, source, target'
      });
    }

    if (!source.appKey || !source.moduleKey || !source.recordId) {
      return res.status(400).json({
        success: false,
        message: 'Source must have appKey, moduleKey, and recordId'
      });
    }

    if (!target.appKey || !target.moduleKey || !target.recordId) {
      return res.status(400).json({
        success: false,
        message: 'Target must have appKey, moduleKey, and recordId'
      });
    }

    // Normalize keys
    const normalizedRelKey = relationshipKey.toLowerCase();
    const normalizedSource = {
      appKey: source.appKey.toLowerCase(),
      moduleKey: source.moduleKey.toLowerCase(),
      recordId: source.recordId
    };
    const normalizedTarget = {
      appKey: target.appKey.toLowerCase(),
      moduleKey: target.moduleKey.toLowerCase(),
      recordId: target.recordId
    };

    // Get relationship definition
    const relDef = await RelationshipDefinition.findOne({
      relationshipKey: normalizedRelKey,
      enabled: true
    });

    if (!relDef) {
      return res.status(404).json({
        success: false,
        message: `Relationship '${relationshipKey}' not found or disabled`
      });
    }

    // Enforce linkability (PRIMARY/SYSTEM relationships are not user-linkable)
    if (relDef.userLinkable === false || relDef.display?.linkRecord === false) {
      return res.status(403).json({
        success: false,
        message: `Relationship '${relationshipKey}' is not user-linkable`
      });
    }

    // Validate source/target match relationship definition
    const sourceMatches = 
      relDef.source.appKey === normalizedSource.appKey &&
      relDef.source.moduleKey === normalizedSource.moduleKey;
    
    const targetMatches = 
      relDef.target.appKey === normalizedTarget.appKey &&
      relDef.target.moduleKey === normalizedTarget.moduleKey;

    if (!sourceMatches || !targetMatches) {
      return res.status(400).json({
        success: false,
        message: `Source/Target does not match relationship definition. Expected: ${relDef.source.appKey}.${relDef.source.moduleKey} → ${relDef.target.appKey}.${relDef.target.moduleKey}`
      });
    }

    // Check tenant configuration
    const tenantConfig = await TenantRelationshipConfiguration.findOne({
      organizationId,
      relationshipKey: normalizedRelKey
    });

    if (tenantConfig && !tenantConfig.enabled) {
      return res.status(403).json({
        success: false,
        message: `Relationship '${relationshipKey}' is disabled for this organization`
      });
    }

    // Validate cardinality
    const cardinalityValidation = await validateCardinality(
      organizationId,
      normalizedRelKey,
      normalizedSource,
      normalizedTarget
    );

    if (!cardinalityValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Cardinality validation failed',
        errors: cardinalityValidation.errors
      });
    }

    // Check for duplicate relationship
    const existing = await RelationshipInstance.findOne({
      organizationId,
      relationshipKey: normalizedRelKey,
      'source.appKey': normalizedSource.appKey,
      'source.moduleKey': normalizedSource.moduleKey,
      'source.recordId': normalizedSource.recordId,
      'target.appKey': normalizedTarget.appKey,
      'target.moduleKey': normalizedTarget.moduleKey,
      'target.recordId': normalizedTarget.recordId
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Relationship already exists'
      });
    }

    // TODO: Permission check (stub for now)
    // await checkRelationshipPermission(req.user, relationshipKey, source, target, 'link');

    // Create relationship instance
    const relationshipInstance = await RelationshipInstance.create({
      organizationId,
      relationshipKey: normalizedRelKey,
      source: normalizedSource,
      target: normalizedTarget,
      createdBy: req.user._id
    });

    const taskLinkTargets = [];
    if (normalizedSource.moduleKey === 'tasks') {
      taskLinkTargets.push({
        taskId: normalizedSource.recordId,
        relatedModuleKey: normalizedTarget.moduleKey,
        relatedRecordId: normalizedTarget.recordId
      });
    }
    if (normalizedTarget.moduleKey === 'tasks') {
      taskLinkTargets.push({
        taskId: normalizedTarget.recordId,
        relatedModuleKey: normalizedSource.moduleKey,
        relatedRecordId: normalizedSource.recordId
      });
    }

    if (taskLinkTargets.length > 0) {
      const actorName = getActorName(req.user);
      const seenTaskIds = new Set();

      for (const item of taskLinkTargets) {
        const taskId = String(item.taskId || '');
        if (!taskId || seenTaskIds.has(taskId)) continue;
        seenTaskIds.add(taskId);

        try {
          await Task.updateOne(
            { _id: taskId, organizationId },
            {
              $push: {
                activityLogs: {
                  user: actorName,
                  userId: req.user._id,
                  action: 'record_linked',
                  details: {
                    relationshipKey: normalizedRelKey,
                    relatedModuleKey: item.relatedModuleKey,
                    relatedRecordId: String(item.relatedRecordId || '')
                  },
                  timestamp: new Date()
                }
              }
            }
          );
        } catch (activityErr) {
          console.warn('[relationshipController] Failed to append task link activity log:', activityErr?.message || activityErr);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: relationshipInstance
    });
  } catch (error) {
    console.error('[relationshipController] Error linking records:', error);
    
    // Handle duplicate key error (unique index violation)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Relationship already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error linking records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get raw relationship links for a record (metadata-agnostic)
 * GET /api/relationships/links
 */
exports.getRecordLinks = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { appKey, moduleKey, recordId } = req.query;

    if (!appKey || !moduleKey || !recordId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: appKey, moduleKey, recordId'
      });
    }

    const normalizedAppKey = String(appKey).toLowerCase();
    const normalizedModuleKey = String(moduleKey).toLowerCase();

    const links = await RelationshipInstance.find({
      organizationId,
      $or: [
        {
          'source.appKey': normalizedAppKey,
          'source.moduleKey': normalizedModuleKey,
          'source.recordId': recordId
        },
        {
          'target.appKey': normalizedAppKey,
          'target.moduleKey': normalizedModuleKey,
          'target.recordId': recordId
        }
      ]
    }).lean();

    const data = (links || []).map((link) => {
      const isSource =
        link?.source?.appKey === normalizedAppKey &&
        link?.source?.moduleKey === normalizedModuleKey &&
        String(link?.source?.recordId) === String(recordId);

      const relatedRecord = isSource ? link?.target : link?.source;

      return {
        relationshipKey: link?.relationshipKey,
        direction: isSource ? 'SOURCE' : 'TARGET',
        source: link?.source,
        target: link?.target,
        relatedRecord: relatedRecord
          ? {
              appKey: relatedRecord.appKey,
              moduleKey: relatedRecord.moduleKey,
              recordId: relatedRecord.recordId
            }
          : null
      };
    });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[relationshipController] Error getting record links:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting record links',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Unlink two records (remove relationship)
 * POST /api/relationships/unlink
 */
exports.unlinkRecords = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { relationshipKey, source, target } = req.body;

    // Validate required fields
    if (!relationshipKey || !source || !target) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: relationshipKey, source, target'
      });
    }

    // Normalize keys
    const normalizedRelKey = relationshipKey.toLowerCase();
    const normalizedSource = {
      appKey: source.appKey.toLowerCase(),
      moduleKey: source.moduleKey.toLowerCase(),
      recordId: source.recordId
    };
    const normalizedTarget = {
      appKey: target.appKey.toLowerCase(),
      moduleKey: target.moduleKey.toLowerCase(),
      recordId: target.recordId
    };

    // Find relationship instance
    const relationshipInstance = await RelationshipInstance.findOne({
      organizationId,
      relationshipKey: normalizedRelKey,
      'source.appKey': normalizedSource.appKey,
      'source.moduleKey': normalizedSource.moduleKey,
      'source.recordId': normalizedSource.recordId,
      'target.appKey': normalizedTarget.appKey,
      'target.moduleKey': normalizedTarget.moduleKey,
      'target.recordId': normalizedTarget.recordId
    });

    if (!relationshipInstance) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // TODO: Permission check (stub for now)
    // await checkRelationshipPermission(req.user, relationshipKey, source, target, 'unlink');

    // Delete relationship instance
    await RelationshipInstance.deleteOne({ _id: relationshipInstance._id });

    res.status(200).json({
      success: true,
      message: 'Relationship removed successfully'
    });
  } catch (error) {
    console.error('[relationshipController] Error unlinking records:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlinking records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get record context (relationships for a record)
 * GET /api/relationships/record-context
 */
exports.getRecordContext = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { appKey, moduleKey, recordId } = req.query;

    // Validate required fields
    if (!appKey || !moduleKey || !recordId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: appKey, moduleKey, recordId'
      });
    }

    // Phase 1C: Get full record context with execution feedback
    const { getRecordContext } = require('../services/recordContextService');
    const Organization = require('../models/Organization');
    
    // Get organization for execution feedback resolution
    const organization = await Organization.findById(organizationId);
    
    // Get full record context with user and organization for feedback resolution
    const context = await getRecordContext(organizationId, appKey, moduleKey, recordId, {
      requestingAppKey: req.appContext?.appKey || appKey,
      user: req.user,
      organization: organization
    });

    res.status(200).json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('[relationshipController] Error getting record context:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting record context',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
