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
const { performance } = require('perf_hooks');

const formatServerTiming = (timings) => {
  return timings
    .filter(({ duration }) => Number.isFinite(duration))
    .map(({ name, duration, description }) => {
      const desc = description ? `;desc="${description.replace(/"/g, "'")}"` : '';
      return `${name};dur=${duration.toFixed(1)}${desc}`;
    })
    .join(', ');
};

/**
 * Get activities for a specific entity (e.g., Person).
 * 
 * GET /api/activity/:entityType/:entityId
 */
exports.getEntityActivities = async (req, res) => {
  const requestStartedAt = performance.now();
  const timings = [];
  try {
    const { entityType, entityId } = req.params;
    
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and ID are required.'
      });
    }

    const et = entityType.toLowerCase();
    if (et !== 'person' && et !== 'organization') {
      return res.status(400).json({
        success: false,
        message: `Entity type '${entityType}' is not supported. Supported: Person, Organization.`
      });
    }

    let rawActivities = [];
    const dbStartedAt = performance.now();
    const entityQuery = et === 'person'
      ? People.findOne({
        _id: entityId,
        organizationId: req.user.organizationId
      }).select('activityLogs').lean()
      : Organization.findOne({
        _id: entityId,
        organizationId: req.user.organizationId,
        isTenant: false
      }).select('activityLogs').lean();
    const orgQuery = req.organization
      ? Promise.resolve(req.organization)
      : Organization.findById(req.user.organizationId).select('enabledApps').lean();
    const [entityRecord, organization] = await Promise.all([entityQuery, orgQuery]);
    timings.push({ name: 'db', duration: performance.now() - dbStartedAt, description: 'Activity entity and app lookup' });

    if (!entityRecord) {
      return res.status(404).json({
        success: false,
        message: et === 'person' ? 'Person not found.' : 'Organization not found.'
      });
    }
    rawActivities = entityRecord.activityLogs || [];

    // Get enabled apps for the organization
    const appStartedAt = performance.now();
    let enabledApps = [];
    if (req.user?.organizationId) {
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
    timings.push({ name: 'app_context_source', duration: performance.now() - appStartedAt, description: 'Enabled app lookup' });

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
    const resolveStartedAt = performance.now();
    const userAppAccess = req.user?.allowedApps || [];
    const appContextResult = resolvePeopleAppContext({
      routeInfo,
      navigationIntent: req.query.appKey ? { sourceAppKey: req.query.appKey } : null,
      enabledApps: enabledApps,
      userAppAccess: userAppAccess
    });
    timings.push({ name: 'resolve_context', duration: performance.now() - resolveStartedAt, description: 'Activity app context resolution' });

    // Resolve and filter activities
    const normalizeStartedAt = performance.now();
    const activityResult = resolveActivities({
      activities: rawActivities,
      resolvedAppContext: appContextResult,
      entityType: entityType,
      entityId: entityId
    });

    // Normalize activities
    const normalizedActivities = activityResult.activities
      .map(normalizeActivity)
      .filter(Boolean);
    timings.push({ name: 'normalize', duration: performance.now() - normalizeStartedAt, description: 'Activity filtering and normalization' });
    timings.push({ name: 'total', duration: performance.now() - requestStartedAt, description: 'Activity request' });
    res.set('Server-Timing', formatServerTiming(timings));

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
