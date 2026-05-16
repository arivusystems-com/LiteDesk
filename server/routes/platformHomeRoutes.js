const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { getPlatformHome } = require('../controllers/platformHomeController');

router.use(protect);
router.use(organizationIsolation);

/**
 * GET /api/platform/home
 * Attention preview, shell counts (approvals, mail), resume items.
 */
router.get('/home', getPlatformHome);

module.exports = router;
