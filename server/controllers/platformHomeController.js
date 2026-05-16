'use strict';

const { getPlatformHomeSnapshot } = require('../services/platformHomeService');

/**
 * GET /api/platform/home
 * Unified snapshot for platform landing (attention, shell counts, resume).
 */
exports.getPlatformHome = async (req, res) => {
  try {
    const data = await getPlatformHomeSnapshot(req);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[PlatformHome] getPlatformHome error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load platform home',
      error: error.message
    });
  }
};
