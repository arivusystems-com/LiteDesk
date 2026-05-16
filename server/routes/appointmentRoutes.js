const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const appointmentConfigController = require('../controllers/appointmentConfigController');
const appointmentTeamConfigController = require('../controllers/appointmentTeamConfigController');
const appointmentCalendarController = require('../controllers/appointmentCalendarController');
const appointmentController = require('../controllers/appointmentController');

router.use(protect);
router.use(organizationIsolation);

router.get('/config/me', appointmentConfigController.getMyConfig);
router.put('/config/me', appointmentConfigController.upsertMyConfig);
router.get('/config/slug-available', appointmentConfigController.checkSlugAvailable);
router.get('/config/user/:userId', appointmentConfigController.getUserConfig);
router.put('/config/user/:userId', appointmentConfigController.upsertUserConfig);
router.get('/config', appointmentConfigController.listAllConfigs);

router.get('/calendar/:configId/status', appointmentCalendarController.getCalendarStatus);
router.get('/calendar/:configId/google/start', appointmentCalendarController.googleOAuthStart);
router.delete('/calendar/:configId/google', appointmentCalendarController.googleDisconnect);

router.get('/config/teams', appointmentTeamConfigController.listTeamConfigs);
router.post('/config/team', appointmentTeamConfigController.createTeamConfig);
router.get('/config/team/:id', appointmentTeamConfigController.getTeamConfig);
router.put('/config/team/:id', appointmentTeamConfigController.updateTeamConfig);
router.delete('/config/team/:id', appointmentTeamConfigController.deleteTeamConfig);

router.get('/stats', appointmentController.getAppointmentStats);
router.post('/events/:id/cancel', appointmentController.cancelAppointment);
router.post('/events/:id/complete', appointmentController.completeAppointment);
router.post('/events/:id/no-show', appointmentController.markAppointmentNoShow);

module.exports = router;
