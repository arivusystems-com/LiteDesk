const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const scheduledJobs = require('../services/scheduledJobs');

/**
 * POST /api/digest/trigger/daily
 * Manually trigger daily digest (admin only, for testing)
 */
router.post('/trigger/daily', protect, async (req, res) => {
  try {
    // Check if user is admin/owner
    if (!req.user.isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admins can trigger digests' 
      });
    }

    await scheduledJobs.triggerDailyDigest();
    
    res.json({
      success: true,
      message: 'Daily digest triggered successfully'
    });
  } catch (err) {
    console.error('[digestRoutes] Error triggering daily digest:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger daily digest',
      error: err.message
    });
  }
});

/**
 * POST /api/digest/trigger/weekly
 * Manually trigger weekly digest (admin only, for testing)
 */
router.post('/trigger/weekly', protect, async (req, res) => {
  try {
    // Check if user is admin/owner
    if (!req.user.isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admins can trigger digests' 
      });
    }

    await scheduledJobs.triggerWeeklyDigest();
    
    res.json({
      success: true,
      message: 'Weekly digest triggered successfully'
    });
  } catch (err) {
    console.error('[digestRoutes] Error triggering weekly digest:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger weekly digest',
      error: err.message
    });
  }
});

module.exports = router;

