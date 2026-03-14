/**
 * Unified record API for all modules: activity, comments, neighbors, batch.
 * Used by ModuleRecordPage so one client pattern works for every module.
 *
 * POST /api/modules/:moduleKey/records/batch             - batch fetch by ids (for related-record enrichment)
 * GET  /api/modules/:moduleKey/records/:recordId/activity   - merged activity + comments
 * GET  /api/modules/:moduleKey/records/:recordId/comments  - comments only
 * POST /api/modules/:moduleKey/records/:recordId/comments  - create comment
 * GET  /api/modules/:moduleKey/records/:recordId/neighbors  - prev/next for navigation
 */
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation } = require('../middleware/organizationMiddleware');
const { checkPermissionFromParam } = require('../middleware/permissionMiddleware');
const { resolveAppContext } = require('../middleware/resolveAppContextMiddleware');
const controller = require('../controllers/moduleRecordController');

const router = express.Router();

router.use(protect);
router.use(resolveAppContext);
router.use(organizationIsolation);

// Batch must be before :recordId routes so "batch" is not captured as recordId
router.post(
  '/:moduleKey/records/batch',
  checkPermissionFromParam('moduleKey', 'view'),
  controller.getRecordsBatch
);

router.get(
  '/:moduleKey/records/:recordId/activity',
  checkPermissionFromParam('moduleKey', 'view'),
  controller.getActivity
);
router.get(
  '/:moduleKey/records/:recordId/comments',
  checkPermissionFromParam('moduleKey', 'view'),
  controller.getComments
);
router.post(
  '/:moduleKey/records/:recordId/comments',
  checkPermissionFromParam('moduleKey', 'edit'),
  controller.createComment
);
router.get(
  '/:moduleKey/records/:recordId/neighbors',
  checkPermissionFromParam('moduleKey', 'view'),
  controller.getNeighbors
);

module.exports = router;
