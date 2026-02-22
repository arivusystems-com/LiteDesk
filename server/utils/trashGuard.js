/**
 * ============================================================================
 * PLATFORM CORE: Trash Guard
 * ============================================================================
 *
 * Central check for whether a record is trashed. Use before workflows,
 * automation, analytics, search indexing.
 *
 * See docs/TRASH_IMPLEMENTATION_SPEC.md
 * ============================================================================
 */

const MODEL_BY_KEY = {
  people: () => require('../models/People'),
  organizations: () => require('../models/Organization'),
  deals: () => require('../models/Deal'),
  tasks: () => require('../models/Task'),
  events: () => require('../models/Event'),
  items: () => require('../models/Item'),
  responses: () => require('../models/FormResponse')
};

/**
 * Check if a record is trashed (soft-deleted).
 *
 * @param {string} moduleKey - Module key (people, deals, tasks, etc.)
 * @param {string|ObjectId} recordId - Record ID
 * @param {string|ObjectId} organizationId - Organization ID (optional for Organization model)
 * @returns {Promise<boolean>}
 */
async function isTrashed(moduleKey, recordId, organizationId) {
  const getModel = MODEL_BY_KEY[moduleKey];
  if (!getModel) return false;

  try {
    const Model = getModel();
    const query = { _id: recordId };
    if (organizationId && moduleKey !== 'organizations') {
      query.organizationId = organizationId;
    }
    const doc = await Model.findOne(query).select('deletedAt').lean();
    return !!doc?.deletedAt;
  } catch (error) {
    console.error('[trashGuard] isTrashed error:', error);
    return false;
  }
}

module.exports = {
  isTrashed
};
