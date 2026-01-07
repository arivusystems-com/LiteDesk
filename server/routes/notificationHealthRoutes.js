const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/notificationHealthController');

// Internal health endpoint (protected by controller)
router.get('/health', getHealth);

module.exports = router;

