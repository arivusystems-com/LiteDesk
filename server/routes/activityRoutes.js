const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const activityController = require('../controllers/activityController');

// Activity endpoints (read-only, immutable)
router.get('/:entityType/:entityId', protect, activityController.getEntityActivities);

module.exports = router;

