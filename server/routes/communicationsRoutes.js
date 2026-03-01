const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const controller = require('../controllers/communicationsController');

router.use(protect);
router.use(organizationIsolation);

router.post('/email', controller.sendEmail);
router.get('/threads', controller.getThreads);
router.get('/templates', controller.getTemplates);
router.patch('/threads/:threadId/view', controller.markThreadViewed);
router.post('/:communicationId/create-task', controller.createTaskFromEmail);

router.post('/upload', uploadSingle('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const rawOrgId = req.user?.organizationId?.toString() || 'public';
    const safeOrgId = String(rawOrgId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${safeOrgId}/${req.file.filename}`;
    res.json({
      success: true,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      storagePath
    });
  } catch (err) {
    console.error('[communications] upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
});

module.exports = router;
