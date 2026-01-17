/**
 * ============================================================================
 * Activity Controller
 * ============================================================================
 *
 * Handles Activity-related API endpoints.
 * Activities are immutable, app-aware audit streams.
 *
 * ============================================================================
 */

const { resolvePeopleAppContext } = require('../utils/peopleAppContextResolver');
const { resolveActivities, normalizeActivity } = require('../utils/activityResolver');
const People = require('../models/People');
const Organization = require('../models/Organization');
const { APP_KEYS } = require('../constants/appKeys');
const appRegistry = require('../constants/appRegistry');

/**
 * Get activities for a specific entity (e.g., Person).
 * 
 * GET /api/activity/:entityType/:entityId
 */
exports.getEntityActivities = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and ID are required.'
      });
    }

    // Only support 'Person' entity type for now
    if (entityType.toLowerCase() !== 'person') {
      return res.status(400).json({
        success: false,
        message: `Entity type '${entityType}' is not supported. Only 'Person' is supported.`
      });
    }

    // Fetch the person record
    const person = await People.findOne({
      _id: entityId,
      organizationId: req.user.organizationId
    }).lean();

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found.'
      });
    }

    // Get enabled apps for the organization
    let enabledApps = [];
    if (req.user?.organizationId) {
      const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
      if (organization?.enabledApps) {
        enabledApps = organization.enabledApps.map(app => {
          return typeof app === 'object' && app.appKey ? app.appKey : app;
        });
      }
    }

    // If no enabledApps found, fall back to user's allowedApps
    if (!enabledApps.length && req.user?.allowedApps) {
      enabledApps = Array.isArray(req.user.allowedApps) ? req.user.allowedApps : [];
    }

    // Build route info from request for app context resolution
    const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const routePath = req.query.routePath || fullPath;
    
    const routeInfo = {
      path: routePath,
      name: req.query.routeName || null,
      params: { entityType, entityId },
      query: req.query,
      meta: {}
    };

    // Resolve app context
    const userAppAccess = req.user?.allowedApps || [];
    const appContextResult = resolvePeopleAppContext({
      routeInfo,
      navigationIntent: req.query.appKey ? { sourceAppKey: req.query.appKey } : null,
      enabledApps: enabledApps,
      userAppAccess: userAppAccess
    });

    // Get raw activities from person record
    const rawActivities = person.activityLogs || [];

    // Resolve and filter activities
    const activityResult = resolveActivities({
      activities: rawActivities,
      resolvedAppContext: appContextResult,
      entityType: 'Person',
      entityId: entityId
    });

    // Normalize activities
    const normalizedActivities = activityResult.activities
      .map(normalizeActivity)
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        activities: normalizedActivities,
        appContext: appContextResult,
        stats: {
          total: activityResult.total,
          filtered: activityResult.filtered,
          shown: normalizedActivities.length
        },
        blocked: activityResult.blocked || false,
        reason: activityResult.reason || null
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message
    });
  }
};

