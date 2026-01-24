/**
 * ============================================================================
 * PLATFORM CORE: Automation Context Controller
 * ============================================================================
 *
 * API endpoints for automation context visibility.
 * Read-only - no editing outside Control Plane.
 *
 * ============================================================================
 */

const {
  getRecordAutomationContext,
  getAppFlows,
  batchCheckAutomation
} = require('../services/automationContextService');
const { createLogger } = require('../services/automationLogger');

const log = createLogger('automationContextController');

/**
 * @route   GET /api/automation/context
 * @desc    Get automation context for a specific record
 * @access  Private (authenticated users)
 * @query   entityType, entityId
 */
exports.getContext = async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityType and entityId are required'
      });
    }

    const result = await getRecordAutomationContext(entityType, entityId, {
      organizationId: req.user.organizationId,
      isAdmin: req.user.role === 'admin' || req.user.role === 'platform_admin'
    });

    if (!result.ok) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to get automation context'
      });
    }

    // Strip admin context for non-admins
    const isAdmin = req.user.role === 'admin' || req.user.role === 'platform_admin';
    if (!isAdmin && result.data._adminContext) {
      delete result.data._adminContext;
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    log.error('get_context_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching automation context',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/automation/app-flows
 * @desc    Get business flows for an app (for app home screens)
 * @access  Private (authenticated users)
 * @query   appKey
 */
exports.getAppFlows = async (req, res) => {
  try {
    const { appKey } = req.query;

    if (!appKey) {
      return res.status(400).json({
        success: false,
        message: 'appKey is required'
      });
    }

    const result = await getAppFlows(appKey, req.user.organizationId);

    if (!result.ok) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to get app flows'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    log.error('get_app_flows_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching app flows',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/automation/batch-check
 * @desc    Batch check automation for multiple records (for list views)
 * @access  Private (authenticated users)
 * @body    { entityType, entityIds }
 */
exports.batchCheck = async (req, res) => {
  try {
    const { entityType, entityIds } = req.body;

    if (!entityType || !entityIds || !Array.isArray(entityIds)) {
      return res.status(400).json({
        success: false,
        message: 'entityType and entityIds array are required'
      });
    }

    // Limit batch size for performance
    if (entityIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 records per batch'
      });
    }

    const result = await batchCheckAutomation(entityType, entityIds, {
      organizationId: req.user.organizationId
    });

    if (!result.ok) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to check automation'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    log.error('batch_check_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error checking automation',
      error: error.message
    });
  }
};
