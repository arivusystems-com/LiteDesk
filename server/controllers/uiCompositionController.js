/**
 * ============================================================================
 * PLATFORM CORE: UI Composition Controller (Phase 0D)
 * ============================================================================
 * 
 * This controller provides UI composition endpoints:
 * - GET /api/ui/apps - Get enabled apps for tenant
 * - GET /api/ui/sidebar - Get complete sidebar definition
 * - GET /api/ui/routes - Get route definitions for dynamic routing
 * 
 * All endpoints are organization-scoped and use req.user.organizationId
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

const uiCompositionService = require('../services/uiCompositionService');

/**
 * Get enabled apps for the current tenant
 * GET /api/ui/apps
 * Phase 0F: Uses access resolution service to determine accessible apps
 */
exports.getApps = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID required'
      });
    }

    const apps = await uiCompositionService.getUIAppsForTenant(organizationId, req.user);

    res.json({
      success: true,
      data: apps
    });
  } catch (error) {
    console.error('[UIComposition] Error getting apps:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching apps'
    });
  }
};

/**
 * Get complete sidebar definition for the current tenant
 * GET /api/ui/sidebar
 * Phase 0F: Uses access resolution service to determine accessible apps
 */
exports.getSidebar = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID required'
      });
    }

    const sidebar = await uiCompositionService.getSidebarDefinition(organizationId, req.user);

    res.json({
      success: true,
      data: sidebar
    });
  } catch (error) {
    console.error('[UIComposition] Error getting sidebar:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sidebar definition'
    });
  }
};

/**
 * Get route definitions for dynamic route injection
 * GET /api/ui/routes
 * Phase 0F: Uses access resolution service to determine accessible apps
 */
exports.getRoutes = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID required'
      });
    }

    const routes = await uiCompositionService.getRouteDefinitions(organizationId, req.user);

    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('[UIComposition] Error getting routes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching route definitions'
    });
  }
};

/**
 * Get modules for a specific app
 * GET /api/ui/apps/:appKey/modules
 */
exports.getModulesForApp = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { appKey } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID required'
      });
    }

    if (!appKey) {
      return res.status(400).json({
        success: false,
        message: 'App key required'
      });
    }

    const modules = await uiCompositionService.getUIModulesForApp(organizationId, appKey);

    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('[UIComposition] Error getting modules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching modules'
    });
  }
};

/**
 * Phase 2B: Get projection metadata for create forms
 * GET /api/ui/projection/:appKey/:moduleKey
 */
exports.getProjectionMetadata = async (req, res) => {
  try {
    const { appKey, moduleKey } = req.params;
    
    if (!appKey || !moduleKey) {
      return res.status(400).json({
        success: false,
        message: 'App key and module key required'
      });
    }

    const { getProjection } = require('../utils/moduleProjectionResolver');
    const projection = getProjection(appKey, moduleKey);

    if (!projection) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: projection
    });
  } catch (error) {
    console.error('[UIComposition] Error getting projection metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projection metadata'
    });
  }
};

/**
 * Phase 2F: Get all app definitions for marketplace discovery
 * GET /api/ui/app-definitions
 * Read-only endpoint for App Registry UI
 */
exports.getAllAppDefinitions = async (req, res) => {
  try {
    const AppDefinition = require('../models/AppDefinition');
    
    // Get all enabled BUSINESS category apps (exclude CONTROL_PLANE)
    // Only return apps that are tenant-visible
    const appDefinitions = await AppDefinition.find({
      appKey: { $ne: 'control_plane' },
      category: 'BUSINESS',
      enabled: true
    })
    .select('appKey name description icon category order capabilities ui marketplace')
    .sort({ order: 1, 'ui.sidebarOrder': 1 })
    .lean();

    res.json({
      success: true,
      data: appDefinitions
    });
  } catch (error) {
    console.error('[UIComposition] Error getting app definitions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching app definitions'
    });
  }
};

