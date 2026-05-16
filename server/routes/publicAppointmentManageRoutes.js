const express = require('express');
const router = express.Router();
const controller = require('../controllers/publicAppointmentManageController');

router.get('/:token', controller.getManagePage);
router.get('/:token/slots', controller.getRescheduleSlots);
router.post('/:token/reschedule', controller.reschedule);
router.post('/:token/cancel', controller.cancel);

module.exports = router;
