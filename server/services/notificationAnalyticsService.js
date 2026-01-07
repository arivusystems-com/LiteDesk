const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const User = require('../models/User');

const NOTIFICATION_DEBUG = process.env.NOTIFICATION_DEBUG === 'true';

/**
 * Notification Analytics Service (Phase 15)
 * 
 * Read-only aggregation service for notification delivery metrics.
 * Computes statistics from existing Notification collection.
 * No new data storage, no behavior changes.
 */

/**
 * Get delivery statistics for an organization/app.
 * 
 * @param {Object} params
 * @param {string} params.organizationId - Organization ID
 * @param {string} params.appKey - App key (CRM/AUDIT/PORTAL)
 * @param {Object} params.range - Time range { start, end } (default: last 7 days)
 */
async function getDeliveryStats({ organizationId, appKey, range = null }) {
  try {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const startDate = range?.start ? new Date(range.start) : defaultStart;
    const endDate = range?.end ? new Date(range.end) : now;

    // Build query
    const query = {
      organizationId,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (appKey) {
      query.appKey = appKey;
    }

    // Aggregate statistics
    const [
      totalCount,
      unreadCount,
      readNotifications,
      digestCount,
      realtimeCount
    ] = await Promise.all([
      // Total notifications
      Notification.countDocuments(query),
      
      // Unread count
      Notification.countDocuments({ ...query, readAt: null }),
      
      // Read notifications (for time-to-read calculation)
      Notification.find({ ...query, readAt: { $ne: null } })
        .select('createdAt readAt')
        .lean(),
      
      // Digest notifications (DIGEST_DAILY, DIGEST_WEEKLY)
      Notification.countDocuments({
        ...query,
        eventType: { $in: ['DIGEST_DAILY', 'DIGEST_WEEKLY'] }
      }),
      
      // Real-time notifications (everything else)
      Notification.countDocuments({
        ...query,
        eventType: { $nin: ['DIGEST_DAILY', 'DIGEST_WEEKLY'] }
      })
    ]);

    // Calculate read rate
    const readRate = totalCount > 0 ? ((totalCount - unreadCount) / totalCount * 100) : 0;

    // Calculate average time-to-read (in hours)
    let avgTimeToRead = null;
    if (readNotifications.length > 0) {
      const timeToReadValues = readNotifications.map(n => {
        const readAt = new Date(n.readAt);
        const createdAt = new Date(n.createdAt);
        return (readAt - createdAt) / (1000 * 60 * 60); // Convert to hours
      });
      avgTimeToRead = timeToReadValues.reduce((a, b) => a + b, 0) / timeToReadValues.length;
    }

    // Calculate digest vs real-time ratio
    const digestRatio = totalCount > 0 ? (digestCount / totalCount) : 0;

    return {
      total: totalCount,
      unread: unreadCount,
      readRate: Math.round(readRate * 100) / 100, // Round to 2 decimals
      avgTimeToReadHours: avgTimeToRead ? Math.round(avgTimeToRead * 100) / 100 : null,
      digestCount,
      realtimeCount,
      digestRatio: Math.round(digestRatio * 100) / 100,
      range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
  } catch (error) {
    console.error('[notificationAnalyticsService] getDeliveryStats error:', error);
    throw error;
  }
}

/**
 * Get channel health metrics.
 * 
 * @param {Object} params
 * @param {string} params.organizationId - Organization ID
 * @param {string} params.appKey - App key (optional)
 */
async function getChannelHealth({ organizationId, appKey = null }) {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const baseQuery = { organizationId };
    if (appKey) {
      baseQuery.appKey = appKey;
    }

    const channels = ['IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP', 'SMS'];
    const healthData = {};

    for (const channel of channels) {
      const query = { ...baseQuery, channel };

      // Get sent count (last hour for failure rate calculation)
      const sentLastHour = await Notification.countDocuments({
        ...query,
        createdAt: { $gte: oneHourAgo }
      });

      // Get failed count (notifications that couldn't be delivered)
      // Note: We don't track failures in Notification model currently,
      // so we'll use a placeholder. In production, you'd track this separately.
      const failedLastHour = 0; // TODO: Track channel failures separately if needed

      // Calculate failure rate
      const failureRate = sentLastHour > 0 ? (failedLastHour / sentLastHour * 100) : 0;

      // Get last failure timestamp (placeholder)
      const lastFailure = null; // TODO: Track last failure timestamp

      // Get total sent count (all time for this channel)
      const totalSent = await Notification.countDocuments(query);

      // Get disabled by preference count (approximate)
      // Count notifications that were created but user has channel disabled
      const disabledCount = 0; // This would require checking preferences, complex query

      // Determine health status
      let status = 'OK';
      if (failureRate > 25 || (lastFailure && new Date(lastFailure) > fiveMinutesAgo)) {
        status = 'UNHEALTHY';
      } else if (failureRate > 10) {
        status = 'DEGRADED';
      }

      healthData[channel] = {
        status,
        sent: totalSent,
        failed: failedLastHour,
        failureRate: Math.round(failureRate * 100) / 100,
        lastFailure,
        disabledByPreference: disabledCount
      };
    }

    return healthData;
  } catch (error) {
    console.error('[notificationAnalyticsService] getChannelHealth error:', error);
    throw error;
  }
}

/**
 * Get user notification volume statistics.
 * 
 * @param {Object} params
 * @param {string} params.organizationId - Organization ID
 * @param {string} params.appKey - App key (optional)
 * @param {Object} params.range - Time range (default: last 7 days)
 * @param {Object} params.pagination - { page, limit }
 */
async function getUserNotificationVolume({ organizationId, appKey = null, range = null, pagination = { page: 1, limit: 20 } }) {
  try {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = range?.start ? new Date(range.start) : defaultStart;
    const endDate = range?.end ? new Date(range.end) : now;

    const query = {
      organizationId,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (appKey) {
      query.appKey = appKey;
    }

    // Aggregate by user
    const userStats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$userId',
          notificationsReceived: { $sum: 1 },
          notificationsUnread: {
            $sum: { $cond: [{ $eq: ['$readAt', null] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          userEmail: '$user.email',
          userFirstName: '$user.firstName',
          userLastName: '$user.lastName',
          notificationsReceived: 1,
          notificationsUnread: 1,
          unreadRate: {
            $cond: [
              { $gt: ['$notificationsReceived', 0] },
              {
                $multiply: [
                  { $divide: ['$notificationsUnread', '$notificationsReceived'] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          highVolume: { $gte: ['$notificationsReceived', 50] } // Threshold: 50+ notifications
        }
      },
      { $sort: { notificationsReceived: -1 } },
      { $skip: (pagination.page - 1) * pagination.limit },
      { $limit: pagination.limit }
    ]);

    // Get total count for pagination
    const totalUsers = await Notification.distinct('userId', query).then(ids => ids.length);

    return {
      users: userStats.map(stat => ({
        userId: String(stat.userId),
        userEmail: stat.userEmail || 'Unknown',
        userName: `${stat.userFirstName || ''} ${stat.userLastName || ''}`.trim() || stat.userEmail || 'Unknown',
        notificationsReceived: stat.notificationsReceived,
        notificationsUnread: stat.notificationsUnread,
        unreadRate: Math.round(stat.unreadRate * 100) / 100,
        highVolume: stat.highVolume
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / pagination.limit)
      }
    };
  } catch (error) {
    console.error('[notificationAnalyticsService] getUserNotificationVolume error:', error);
    throw error;
  }
}

/**
 * Get most frequent event types.
 * 
 * @param {Object} params
 * @param {string} params.organizationId - Organization ID
 * @param {string} params.appKey - App key (optional)
 * @param {Object} params.range - Time range (default: last 7 days)
 * @param {number} params.limit - Number of top events to return (default: 10)
 */
async function getTopEventTypes({ organizationId, appKey = null, range = null, limit = 10 }) {
  try {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = range?.start ? new Date(range.start) : defaultStart;
    const endDate = range?.end ? new Date(range.end) : now;

    const query = {
      organizationId,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (appKey) {
      query.appKey = appKey;
    }

    const eventStats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$readAt', null] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    return eventStats.map(stat => ({
      eventType: stat._id,
      count: stat.count,
      unreadCount: stat.unreadCount,
      readRate: stat.count > 0 ? Math.round(((stat.count - stat.unreadCount) / stat.count * 100) * 100) / 100 : 0
    }));
  } catch (error) {
    console.error('[notificationAnalyticsService] getTopEventTypes error:', error);
    throw error;
  }
}

/**
 * Get anti-overload insights (informational warnings).
 * 
 * @param {Object} params
 * @param {string} params.organizationId - Organization ID
 * @param {string} params.appKey - App key (optional)
 */
async function getAntiOverloadInsights({ organizationId, appKey = null }) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const query = {
      organizationId,
      createdAt: { $gte: todayStart }
    };
    if (appKey) {
      query.appKey = appKey;
    }

    // Count users who received > N notifications today
    const highVolumeThreshold = 20; // Configurable
    const highVolumeUsers = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: highVolumeThreshold }
        }
      },
      { $count: 'users' }
    ]);

    const highVolumeUserCount = highVolumeUsers[0]?.users || 0;

    // Find event types that triggered unusually often (top 3)
    const frequentEvents = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    // Check for channels with elevated failures (placeholder)
    const elevatedFailures = []; // TODO: Implement if failure tracking is added

    const insights = [];

    if (highVolumeUserCount > 0) {
      insights.push({
        type: 'high_volume_users',
        severity: 'info',
        message: `${highVolumeUserCount} user(s) received more than ${highVolumeThreshold} notifications today`,
        count: highVolumeUserCount
      });
    }

    if (frequentEvents.length > 0 && frequentEvents[0].count > 50) {
      insights.push({
        type: 'frequent_event',
        severity: 'info',
        message: `Event "${frequentEvents[0]._id}" triggered ${frequentEvents[0].count} times today`,
        eventType: frequentEvents[0]._id,
        count: frequentEvents[0].count
      });
    }

    if (elevatedFailures.length > 0) {
      insights.push({
        type: 'elevated_failures',
        severity: 'warning',
        message: `${elevatedFailures.length} channel(s) showing elevated failure rates`,
        channels: elevatedFailures
      });
    }

    return insights;
  } catch (error) {
    console.error('[notificationAnalyticsService] getAntiOverloadInsights error:', error);
    throw error;
  }
}

module.exports = {
  getDeliveryStats,
  getChannelHealth,
  getUserNotificationVolume,
  getTopEventTypes,
  getAntiOverloadInsights
};

