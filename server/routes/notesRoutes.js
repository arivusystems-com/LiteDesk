const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const notesController = require('../controllers/notesController');

// Notes endpoints (create and view)
router.get('/:entityType/:entityId', protect, notesController.getEntityNotes);
router.post('/:entityType/:entityId', protect, notesController.createNote);

module.exports = router;

