/**
 * ============================================================================
 * PLATFORM CORE: Business Flow Template Controller (Default Templates)
 * ============================================================================
 *
 * API endpoints for listing and importing Business Flow templates.
 *
 * ============================================================================
 */

const { listTemplates, getTemplateDetails, getTemplateCount, importTemplate } = require('../services/businessFlowTemplateLoader');
const { createLogger } = require('../services/automationLogger');

const log = createLogger('businessFlowTemplateController');

/**
 * @route   GET /api/admin/business-flow-templates
 * @desc    List all available templates
 * @access  Private (admin)
 */
exports.listTemplates = async (req, res) => {
  try {
    const templates = listTemplates();
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    log.error('list_templates_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error listing templates',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/admin/business-flow-templates/count
 * @desc    Get count of available templates (for empty state logic)
 * @access  Private (admin)
 */
exports.getTemplateCount = async (req, res) => {
  try {
    const count = getTemplateCount();
    res.json({
      success: true,
      count
    });
  } catch (error) {
    log.error('get_template_count_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error getting template count',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/admin/business-flow-templates/:key
 * @desc    Get template details with process previews
 * @access  Private (admin)
 */
exports.getTemplateDetails = async (req, res) => {
  try {
    const { key } = req.params;
    const result = getTemplateDetails(key);

    if (!result.ok) {
      return res.status(404).json({
        success: false,
        message: result.error || 'Template not found'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    log.error('get_template_details_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching template details',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/admin/business-flow-templates/:key/import
 * @desc    Import a template (creates processes as Draft + Business Flow)
 * @access  Private (admin)
 */
exports.importTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const result = await importTemplate(key, organizationId, userId);

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to import template'
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Template imported successfully. All processes are in Draft status and require review before activation.'
    });
  } catch (error) {
    log.error('import_template_error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error importing template',
      error: error.message
    });
  }
};
