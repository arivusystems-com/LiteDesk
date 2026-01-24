/**
 * ============================================================================
 * PLATFORM CORE: Configuration Registry Controller
 * ============================================================================
 * 
 * API endpoints for reading configuration registry data.
 * 
 * Note: Currently read-only. Edit APIs will be added later.
 * ============================================================================
 */

const {
  getEntityTypes,
  getLifecycles,
  getLifecycleStatusMappings,
  computeDerivedStatus,
  getEntityConfiguration,
  getAllConfigurations,
  getPipelines,
  getStagesForPipeline
} = require('../services/configRegistry');

/**
 * Get entity types for a given entity
 * GET /api/config-registry/entity-types/:entity
 */
exports.getEntityTypes = async (req, res) => {
  try {
    const { entity } = req.params;
    const { appKey } = req.query;
    
    if (!entity || !['people', 'organization', 'deal'].includes(entity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity. Must be one of: people, organization, deal'
      });
    }
    
    const types = await getEntityTypes(entity.toLowerCase(), appKey);
    
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Error fetching entity types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching entity types',
      error: error.message
    });
  }
};

/**
 * Get lifecycles for a given entity type
 * GET /api/config-registry/lifecycles/:entityTypeKey
 */
exports.getLifecycles = async (req, res) => {
  try {
    const { entityTypeKey } = req.params;
    const { appKey } = req.query;
    
    if (!entityTypeKey) {
      return res.status(400).json({
        success: false,
        message: 'Entity type key is required'
      });
    }
    
    const lifecycles = await getLifecycles(entityTypeKey, appKey);
    
    res.json({
      success: true,
      data: lifecycles
    });
  } catch (error) {
    console.error('Error fetching lifecycles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lifecycles',
      error: error.message
    });
  }
};

/**
 * Get lifecycle status mappings for a given lifecycle
 * GET /api/config-registry/lifecycle-status-mappings/:lifecycleKey
 */
exports.getLifecycleStatusMappings = async (req, res) => {
  try {
    const { lifecycleKey } = req.params;
    const { appKey } = req.query;
    
    if (!lifecycleKey) {
      return res.status(400).json({
        success: false,
        message: 'Lifecycle key is required'
      });
    }
    
    const mappings = await getLifecycleStatusMappings(lifecycleKey, appKey);
    
    res.json({
      success: true,
      data: mappings
    });
  } catch (error) {
    console.error('Error fetching lifecycle status mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lifecycle status mappings',
      error: error.message
    });
  }
};

/**
 * Compute derived status for a record
 * POST /api/config-registry/compute-derived-status
 */
exports.computeDerivedStatus = async (req, res) => {
  try {
    const { entity, recordData, appKey } = req.body;
    
    if (!entity || !['people', 'organization', 'deal'].includes(entity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity. Must be one of: people, organization, deal'
      });
    }
    
    if (!recordData || typeof recordData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Record data is required'
      });
    }
    
    const derivedStatus = await computeDerivedStatus(entity.toLowerCase(), recordData, appKey);
    
    res.json({
      success: true,
      data: {
        derivedStatus,
        entity,
        appKey: appKey || null
      }
    });
  } catch (error) {
    console.error('Error computing derived status:', error);
    res.status(500).json({
      success: false,
      message: 'Error computing derived status',
      error: error.message
    });
  }
};

/**
 * Get complete configuration for a given entity
 * GET /api/config-registry/configuration/:entity
 */
exports.getEntityConfiguration = async (req, res) => {
  try {
    const { entity } = req.params;
    const { appKey } = req.query;
    
    if (!entity || !['people', 'organization', 'deal'].includes(entity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity. Must be one of: people, organization, deal'
      });
    }
    
    const configuration = await getEntityConfiguration(entity.toLowerCase(), appKey);
    
    res.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    console.error('Error fetching entity configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching entity configuration',
      error: error.message
    });
  }
};

/**
 * Get all configurations for all entities
 * GET /api/config-registry/configuration
 */
exports.getAllConfigurations = async (req, res) => {
  try {
    const { appKey } = req.query;
    
    const configurations = await getAllConfigurations(appKey);
    
    res.json({
      success: true,
      data: configurations
    });
  } catch (error) {
    console.error('Error fetching all configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching configurations',
      error: error.message
    });
  }
};

/**
 * Get deal pipelines (lifecycles for entity type 'default')
 * GET /api/config-registry/pipelines
 */
exports.getPipelines = async (req, res) => {
  try {
    const { appKey } = req.query;
    const pipelines = await getPipelines(appKey);
    res.json({ success: true, data: pipelines });
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pipelines',
      error: error.message
    });
  }
};

/**
 * Get stages for a pipeline
 * GET /api/config-registry/pipelines/:pipelineKey/stages
 */
exports.getStagesForPipeline = async (req, res) => {
  try {
    const { pipelineKey } = req.params;
    const { appKey } = req.query;
    if (!pipelineKey) {
      return res.status(400).json({
        success: false,
        message: 'Pipeline key is required'
      });
    }
    const stages = await getStagesForPipeline(pipelineKey, appKey);
    res.json({ success: true, data: stages });
  } catch (error) {
    console.error('Error fetching stages for pipeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stages for pipeline',
      error: error.message
    });
  }
};
