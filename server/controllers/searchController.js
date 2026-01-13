/**
 * ============================================================================
 * PLATFORM CORE: Global Search Controller
 * ============================================================================
 */

const searchService = require('../services/searchService');

/**
 * GET /api/search
 * Global search across all modules
 */
exports.globalSearch = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { q } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID required'
      });
    }

    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          query: '',
          results: {
            people: [],
            organizations: [],
            deals: [],
            tasks: [],
            events: [],
            forms: [],
            items: []
          },
          total: 0
        }
      });
    }

    // Minimum query length
    if (q.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          query: q,
          results: {
            people: [],
            organizations: [],
            deals: [],
            tasks: [],
            events: [],
            forms: [],
            items: []
          },
          total: 0
        }
      });
    }

    console.log(`[SearchController] Searching for: "${q.trim()}" in organization: ${organizationId}`);
    
    const results = await searchService.searchAll(organizationId, q.trim(), {
      limitPerModule: 5
    });

    console.log(`[SearchController] Search completed. Total results: ${results.total}`);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[SearchController] Error in global search:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
};

