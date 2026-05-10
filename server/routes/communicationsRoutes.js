const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const controller = require('../controllers/communicationsController');

router.use(protect);
router.use(organizationIsolation);

router.post('/email', controller.sendEmail);
router.get('/pipeline-metrics', controller.getPipelineMetrics);
router.get('/pipeline-diagnostics', controller.getPipelineDiagnostics);
router.get('/inbound/diagnostics', controller.getInboundDiagnostics);
router.get('/inbound/dead-letter', controller.listInboundDeadLetters);
router.post('/inbound/dead-letter/:id/replay', controller.replayInboundDeadLetter);
router.get('/suppressions/stats', controller.getSuppressionStats);
router.get('/suppressions', controller.getSuppressions);
router.delete('/suppressions/:email', controller.removeSuppression);
router.get('/webhook-test/templates', controller.getWebhookTestTemplates);
router.post('/webhook-test/simulate', controller.simulateWebhookEvent);
router.get('/threads', controller.getThreads);
router.get('/workspace-threads', controller.getWorkspaceThreads);
router.get('/workspace-thread-ids', controller.getWorkspaceThreadIds);
router.get('/workspace-thread-counts', controller.getWorkspaceThreadCounts);
router.get('/templates', controller.getTemplates);
router.patch('/threads/bulk', controller.bulkThreadActions);
router.patch('/threads/:threadId/view', controller.markThreadViewed);
router.patch('/threads/:threadId/done', controller.markThreadDone);
router.patch('/threads/:threadId/snooze', controller.markThreadSnooze);
router.patch('/threads/:threadId/assign', controller.assignThreadOwner);
router.patch('/threads/:threadId/tags', controller.updateThreadTags);
router.post('/:communicationId/create-task', controller.createTaskFromEmail);
router.post('/:communicationId/create-case', controller.createCaseFromEmail);

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
