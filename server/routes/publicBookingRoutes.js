const express = require('express');
const router = express.Router();
const publicBookingController = require('../controllers/publicBookingController');

router.get('/:slug', publicBookingController.getPublicPage);
router.get('/:slug/slots', publicBookingController.getPublicSlots);
router.post('/:slug/book', publicBookingController.submitBooking);

module.exports = router;
