const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const {
  getPublicKey,
  subscribe,
  unsubscribe
} = require('../controllers/pushController');

// Public route for VAPID public key (no auth needed for subscription)
router.get('/public-key', getPublicKey);

// Auth + app context + org isolation for subscription routes
router.use(protect);
router.use(resolveAppContext);
router.use(organizationIsolation);

router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

module.exports = router;

