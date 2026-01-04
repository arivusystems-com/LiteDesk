const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Event CRUD routes
router.get('/', eventController.getEvents);
router.get('/stats', eventController.getEventStats);
router.get('/export', eventController.exportEvents);
router.get('/:id', eventController.getEventById);
router.post('/', eventController.createEvent);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Bulk operations
router.post('/bulk-delete', eventController.bulkDeleteEvents);

// Event-specific actions
router.post('/:id/notes', eventController.addNote);
// Status is system-controlled - use cancel/complete endpoints instead
// router.patch('/:id/status', eventController.updateEventStatus); // DEPRECATED - use cancel/complete

// Execution workflow routes
router.post('/:id/start', eventController.startEvent);
router.post('/:id/check-in', eventController.checkIn);
router.post('/:id/check-out', eventController.checkOut);
router.post('/:id/submit-audit', eventController.submitAudit);
router.post('/:id/approve-audit', eventController.approveAudit);
router.post('/:id/reject-audit', eventController.rejectAudit);
router.post('/:id/next-org', eventController.moveToNextOrg);
router.post('/:id/orders', eventController.createOrder);
router.post('/:id/complete', eventController.completeEvent);
router.post('/:id/cancel', eventController.cancelEvent);

module.exports = router;

