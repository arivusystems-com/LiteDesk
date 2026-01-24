/**
 * ============================================================================
 * PLATFORM CORE: Configuration Registry Routes
 * ============================================================================
 * 
 * Routes for configuration registry endpoints:
 * - GET /api/config-registry/entity-types/:entity - Get entity types
 * - GET /api/config-registry/lifecycles/:entityTypeKey - Get lifecycles
 * - GET /api/config-registry/lifecycle-status-mappings/:lifecycleKey - Get status mappings
 * - POST /api/config-registry/compute-derived-status - Compute derived status
 * - GET /api/config-registry/configuration/:entity - Get entity configuration
 * - GET /api/config-registry/configuration - Get all configurations
 * 
 * Middleware:
 * - protect: Authentication required
 * - organizationIsolation: Organization-scoped access
 * 
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const {
  getEntityTypes,
  getLifecycles,
  getLifecycleStatusMappings,
  computeDerivedStatus,
  getEntityConfiguration,
  getAllConfigurations,
  getPipelines,
  getStagesForPipeline
} = require('../controllers/configRegistryController');

// Apply auth and organization middleware to all routes
router.use(protect);
router.use(organizationIsolation);

// Configuration Registry Routes
router.get('/entity-types/:entity', getEntityTypes);
router.get('/lifecycles/:entityTypeKey', getLifecycles);
router.get('/lifecycle-status-mappings/:lifecycleKey', getLifecycleStatusMappings);
router.get('/pipelines', getPipelines);
router.get('/pipelines/:pipelineKey/stages', getStagesForPipeline);
router.post('/compute-derived-status', computeDerivedStatus);
router.get('/configuration/:entity', getEntityConfiguration);
router.get('/configuration', getAllConfigurations);

module.exports = router;
