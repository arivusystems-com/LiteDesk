/**
 * ============================================================================
 * PLATFORM CORE: Business Flow Template Routes (Default Templates)
 * ============================================================================
 *
 * GET    /api/admin/business-flow-templates
 * GET    /api/admin/business-flow-templates/count
 * GET    /api/admin/business-flow-templates/:key
 * POST   /api/admin/business-flow-templates/:key/import
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  listTemplates,
  getTemplateCount,
  getTemplateDetails,
  importTemplate
} = require('../controllers/businessFlowTemplateController');

router.use(protect);

router.get('/', listTemplates);
router.get('/count', getTemplateCount); // Must be before :key route
router.get('/:key', getTemplateDetails);
router.post('/:key/import', importTemplate);

module.exports = router;
