const express = require('express');
const { 
    createItem, 
    getItems, 
    getItemById, 
    updateItem, 
    deleteItem,
    updateStock,
    getLowStockItems,
    getItemsByType,
    getItemStatistics,
    linkDeal,
    unlinkDeal
} = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { organizationIsolation, checkTrialStatus, checkFeatureAccess } = require('../middleware/organizationMiddleware');
const { checkPermission, filterByOwnership } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(organizationIsolation);
router.use(checkTrialStatus);
router.use(checkFeatureAccess('items'));

// Statistics route (must come before /:id routes)
router.get('/statistics', checkPermission('items', 'view'), getItemStatistics);

// Low stock route (must come before /:id routes)
router.get('/low-stock', checkPermission('items', 'view'), getLowStockItems);

// Items by type route (must come before /:id routes)
router.get('/type/:type', checkPermission('items', 'view'), getItemsByType);

// Routes that handle collections (GET all, POST new)
router.route('/')
    .get(filterByOwnership('items'), checkPermission('items', 'view'), getItems)
    .post(checkPermission('items', 'create'), createItem);

// Routes that handle single resources (GET by ID, PUT, DELETE)
router.route('/:id')
    .get(checkPermission('items', 'view'), getItemById)
    .put(checkPermission('items', 'edit'), updateItem)
    .delete(checkPermission('items', 'delete'), deleteItem);

// Update stock quantity
router.patch('/:id/stock', checkPermission('items', 'edit'), updateStock);

// Link/unlink deal
router.post('/:id/link-deal', checkPermission('items', 'edit'), linkDeal);
router.delete('/:id/unlink-deal/:dealId', checkPermission('items', 'edit'), unlinkDeal);

module.exports = router;

