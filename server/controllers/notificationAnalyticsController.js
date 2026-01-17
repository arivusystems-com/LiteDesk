const notificationAnalyticsService = require('../services/notificationAnalyticsService');

/**
 * Notification Analytics Controller (Phase 15)
 * 
 * Admin-only read-only endpoints for notification analytics.
 * All endpoints require SALES ADMIN role and are organization-scoped.
 */

/**
 * GET /api/admin/notifications/overview
 * Get app-level summary statistics.
 */
exports.getOverview = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const appKey = req.query.appKey || null; // Optional filter
    const range = req.query.range ? JSON.parse(req.query.range) : null;

    const stats = await notificationAnalyticsService.getDeliveryStats({
      organizationId,
      appKey,
      range
    });

    // Get channel health summary
    const channelHealth = await notificationAnalyticsService.getChannelHealth({
      organizationId,
      appKey
    });

    // Count degraded/unhealthy channels
    const degradedChannels = Object.values(channelHealth).filter(
      ch => ch.status === 'DEGRADED'
    ).length;
    const unhealthyChannels = Object.values(channelHealth).filter(
      ch => ch.status === 'UNHEALTHY'
    ).length;

    // Count active channels (channels with sent > 0)
    const activeChannels = Object.values(channelHealth).filter(
      ch => ch.sent > 0
    ).length;

    res.json({
      success: true,
      stats,
      channelHealth: {
        active: activeChannels,
        degraded: degradedChannels,
        unhealthy: unhealthyChannels
      },
      appKey: appKey || 'all'
    });
  } catch (error) {
    console.error('[notificationAnalyticsController] getOverview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification overview'
    });
  }
};

/**
 * GET /api/admin/notifications/channels
 * Get channel health metrics per app.
 */
exports.getChannels = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const appKey = req.query.appKey || null;

    const channelHealth = await notificationAnalyticsService.getChannelHealth({
      organizationId,
      appKey
    });

    // Ensure channelHealth is an object
    if (!channelHealth || typeof channelHealth !== 'object') {
      throw new Error('Invalid channel health data returned from service');
    }

    // Format for frontend
    const channels = Object.entries(channelHealth).map(([channel, data]) => ({
      channel,
      status: data?.status || 'OK',
      sent: data?.sent || 0,
      failed: data?.failed || 0,
      failureRate: data?.failureRate || 0,
      lastFailure: data?.lastFailure || null,
      disabledByPreference: data?.disabledByPreference || 0
    }));

    res.json({
      success: true,
      channels,
      appKey: appKey || 'all'
    });
  } catch (error) {
    console.error('[notificationAnalyticsController] getChannels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channel health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/admin/notifications/users
 * Get top notification volume users (paged).
 */
exports.getUsers = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const appKey = req.query.appKey || null;
    const range = req.query.range ? JSON.parse(req.query.range) : null;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page

    const result = await notificationAnalyticsService.getUserNotificationVolume({
      organizationId,
      appKey,
      range,
      pagination: { page, limit }
    });

    res.json({
      success: true,
      ...result,
      appKey: appKey || 'all'
    });
  } catch (error) {
    console.error('[notificationAnalyticsController] getUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user notification volume'
    });
  }
};

/**
 * GET /api/admin/notifications/events
 * Get most frequent event types.
 */
exports.getEvents = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const appKey = req.query.appKey || null;
    const range = req.query.range ? JSON.parse(req.query.range) : null;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50

    const events = await notificationAnalyticsService.getTopEventTypes({
      organizationId,
      appKey,
      range,
      limit
    });

    res.json({
      success: true,
      events,
      appKey: appKey || 'all'
    });
  } catch (error) {
    console.error('[notificationAnalyticsController] getEvents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event statistics'
    });
  }
};

/**
 * GET /api/admin/notifications/insights
 * Get anti-overload insights (informational warnings).
 */
exports.getInsights = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const appKey = req.query.appKey || null;

    const insights = await notificationAnalyticsService.getAntiOverloadInsights({
      organizationId,
      appKey
    });

    res.json({
      success: true,
      insights,
      appKey: appKey || 'all'
    });
  } catch (error) {
    console.error('[notificationAnalyticsController] getInsights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights'
    });
  }
};

