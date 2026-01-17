const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const filesController = require('../controllers/filesController');

// Files endpoints (view and upload)
router.get('/:entityType/:entityId', protect, filesController.getEntityFiles);
router.post('/:entityType/:entityId', protect, uploadSingle('file'), filesController.uploadFile);

module.exports = router;

