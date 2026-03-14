/**
 * Unified record API for all modules: activity, comments, and prev/next navigation.
 * Record CRUD stays on existing routes (GET /deals/:id, etc.); this controller
 * provides activity, comments, and neighbors for ModuleRecordPage.
 */
const Deal = require('../models/Deal');
const DealComment = require('../models/DealComment');
const Task = require('../models/Task');
const TaskComment = require('../models/TaskComment');
const RecordActivity = require('../models/RecordActivity');
const User = require('../models/User');
const mongoose = require('mongoose');

const MODULES_WITH_NATIVE_ACTIVITY = new Set(['deals', 'tasks']);
const MODULES_WITH_NATIVE_COMMENTS = new Set(['deals', 'tasks']);

/**
 * Default list handler: given a model and orgId, return record IDs for prev/next.
 * Used for any module that has a known model (add new modules here or via getDefaultListHandler).
 */
async function getRecordIdsFromModel(Model, organizationId, baseQuery = {}) {
  const query = { organizationId, ...baseQuery };
  if (Model.schema?.paths?.deletedAt) query.deletedAt = null;
  const ids = await Model.find(query)
    .sort({ updatedAt: -1 })
    .limit(500)
    .select('_id')
    .lean();
  return ids.map((d) => d._id.toString());
}

/**
 * Model getters for modules with a backing collection.
 * To add a new/custom module with prev/next support: add an entry here (e.g. tickets: () => require('../models/Ticket')).
 * getListHandlerForModule() will then return a list handler for that module by default.
 */
const MODEL_BY_KEY = {
  deals: () => Deal,
  tasks: () => Task,
  people: () => require('../models/People'),
  organizations: () => require('../models/Organization'),
  events: () => require('../models/Event'),
  items: () => require('../models/Item'),
  responses: () => require('../models/FormResponse')
};

/** Optional base query per module (e.g. Organization uses isTenant: false). */
const LIST_BASE_QUERY_BY_KEY = {
  organizations: () => ({ isTenant: false })
};

/** Explicit list handlers (override default model behavior when needed). */
const LIST_HANDLERS = {
  deals: (organizationId) => getRecordIdsFromModel(Deal, organizationId),
  tasks: (organizationId) => getRecordIdsFromModel(Task, organizationId),
  people: (organizationId) => getRecordIdsFromModel(require('../models/People'), organizationId),
  organizations: (organizationId) =>
    getRecordIdsFromModel(require('../models/Organization'), organizationId, { isTenant: false }),
  events: (organizationId) => getRecordIdsFromModel(require('../models/Event'), organizationId),
  items: (organizationId) => getRecordIdsFromModel(require('../models/Item'), organizationId),
  responses: (organizationId) =>
    getRecordIdsFromModel(require('../models/FormResponse'), organizationId)
};

/**
 * Resolve list handler for a module. Uses LIST_HANDLERS first, then builds one from MODEL_BY_KEY so
 * new/custom modules get prev/next by default when their model is registered.
 */
function getListHandlerForModule(moduleKey) {
  const key = (moduleKey || '').toLowerCase();
  if (LIST_HANDLERS[key]) return LIST_HANDLERS[key];
  const getModel = MODEL_BY_KEY[key];
  if (!getModel) return null;
  const baseQuery = LIST_BASE_QUERY_BY_KEY[key] ? LIST_BASE_QUERY_BY_KEY[key]() : {};
  return (organizationId) => getRecordIdsFromModel(getModel(), organizationId, baseQuery);
}

function getModuleKey(req) {
  return (req.params.moduleKey || '').toLowerCase().trim();
}

function getRecordId(req) {
  return req.params.recordId;
}

/**
 * GET /api/modules/:moduleKey/records/:recordId/activity
 * Returns merged activity logs + comments for the record (all modules).
 */
exports.getActivity = async (req, res) => {
  try {
    const moduleKey = getModuleKey(req);
    const recordId = getRecordId(req);
    const organizationId = req.user.organizationId;

    if (!moduleKey || !recordId) {
      return res.status(400).json({ success: false, message: 'moduleKey and recordId are required' });
    }

    const events = [];

    if (MODULES_WITH_NATIVE_ACTIVITY.has(moduleKey)) {
      if (moduleKey === 'deals') {
        const deal = await Deal.findOne({
          _id: recordId,
          organizationId,
          deletedAt: null
        }).select('activityLogs').lean();
        if (deal && Array.isArray(deal.activityLogs)) {
          const userIds = [...new Set(deal.activityLogs.map((l) => l.userId).filter(Boolean))];
          let usersMap = {};
          if (userIds.length > 0) {
            const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName username email').lean();
            usersMap = users.reduce((acc, u) => {
              acc[u._id.toString()] = u;
              return acc;
            }, {});
          }
          for (const log of deal.activityLogs) {
            const user = log.userId && usersMap[log.userId.toString()];
            const actor = user ? `${(user.firstName || '').trim()} ${(user.lastName || '').trim()}`.trim() || user.username || user.email || 'Unknown' : (log.user || 'Unknown');
            events.push({
              id: `activity-${log.timestamp}-${log._id || ''}`,
              type: 'system',
              actor,
              createdAt: log.timestamp ? new Date(log.timestamp).toISOString() : null,
              payload: { action: log.action || 'updated', message: log.message || '', details: log.details || {} }
            });
          }
        }
        const comments = await DealComment.find({ dealId: recordId, organizationId })
          .populate('author', 'firstName lastName email username')
          .sort({ createdAt: 1 })
          .lean();
        for (const c of comments) {
          const author = c.author;
          const actor = author ? `${(author.firstName || '').trim()} ${(author.lastName || '').trim()}`.trim() || author.username || author.email : 'Unknown';
          events.push({
            id: `comment-${c._id}`,
            type: 'comment',
            actor,
            createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
            payload: {
              body: c.content,
              parentCommentId: c.parentCommentId ? c.parentCommentId.toString() : null,
              attachments: c.attachments || [],
              reactions: c.reactions || [],
              commentId: c._id.toString()
            },
            meta: { authorId: c.author?._id?.toString() }
          });
        }
      } else if (moduleKey === 'tasks') {
        const task = await Task.findOne({
          _id: recordId,
          organizationId,
          deletedAt: null
        })
          .populate('activityLogs.userId', 'firstName lastName username email')
          .select('activityLogs createdAt updatedAt createdBy')
          .lean();
        if (task) {
          const getUserName = (u) => {
            if (!u) return 'System';
            if (typeof u === 'string') return u;
            const name = [(u.firstName || ''), (u.lastName || '')].filter(Boolean).join(' ').trim();
            return name || u.username || u.email || 'User';
          };
          const logs = (task.activityLogs || []).map((entry) => ({
            timestamp: entry.timestamp || task.updatedAt || task.createdAt,
            user: getUserName(entry.userId),
            action: entry.action || 'updated',
            details: entry.details || {}
          }));
          if (logs.length === 0 && task.createdAt) {
            logs.push({
              timestamp: task.createdAt,
              user: getUserName(task.createdBy),
              action: 'created',
              details: {}
            });
          }
          for (const log of logs) {
            events.push({
              id: `activity-${log.timestamp}-${Math.random()}`,
              type: 'system',
              actor: log.user,
              createdAt: log.timestamp ? new Date(log.timestamp).toISOString() : null,
              payload: { action: log.action, message: '', details: log.details }
            });
          }
        }
        const comments = await TaskComment.find({ taskId: recordId, organizationId })
          .populate('author', 'firstName lastName email username')
          .sort({ createdAt: 1 })
          .lean();
        for (const c of comments) {
          const author = c.author;
          const actor = author ? `${(author.firstName || '').trim()} ${(author.lastName || '').trim()}`.trim() || author.username || author.email : 'Unknown';
          events.push({
            id: `comment-${c._id}`,
            type: 'comment',
            actor,
            createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
            payload: {
              body: c.content,
              parentCommentId: c.parentCommentId ? c.parentCommentId.toString() : null,
              attachments: c.attachments || [],
              reactions: c.reactions || [],
              commentId: c._id.toString()
            },
            meta: { authorId: c.author?._id?.toString() }
          });
        }
      }
    } else {
      const generic = await RecordActivity.find({
        organizationId,
        moduleKey,
        recordId: new mongoose.Types.ObjectId(recordId)
      })
        .populate('author', 'firstName lastName email username')
        .sort({ createdAt: 1 })
        .lean();
      for (const entry of generic) {
        if (entry.type === 'activity') {
          const actor = entry.author ? `${(entry.author.firstName || '').trim()} ${(entry.author.lastName || '').trim()}`.trim() || entry.author.username || entry.author.email : 'Unknown';
          events.push({
            id: `activity-${entry._id}`,
            type: 'system',
            actor,
            createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : null,
            payload: { action: entry.action || 'updated', message: entry.message || '', details: entry.details || {} }
          });
        } else {
          const author = entry.author;
          const actor = author ? `${(author.firstName || '').trim()} ${(author.lastName || '').trim()}`.trim() || author.username || author.email : 'Unknown';
          events.push({
            id: `comment-${entry._id}`,
            type: 'comment',
            actor,
            createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : null,
            payload: {
              body: entry.content,
              parentCommentId: entry.parentCommentId ? entry.parentCommentId.toString() : null,
              attachments: entry.attachments || [],
              reactions: entry.reactions || [],
              commentId: entry._id.toString()
            },
            meta: { authorId: entry.author?._id?.toString() }
          });
        }
      }
    }

    events.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('getActivity error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching activity', error: err.message });
  }
};

/**
 * GET /api/modules/:moduleKey/records/:recordId/comments
 */
exports.getComments = async (req, res) => {
  try {
    const moduleKey = getModuleKey(req);
    const recordId = getRecordId(req);
    const organizationId = req.user.organizationId;

    if (!moduleKey || !recordId) {
      return res.status(400).json({ success: false, message: 'moduleKey and recordId are required' });
    }

    if (MODULES_WITH_NATIVE_COMMENTS.has(moduleKey)) {
      if (moduleKey === 'deals') {
        const deal = await Deal.findOne({ _id: recordId, organizationId, deletedAt: null }).select('_id').lean();
        if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
        const comments = await DealComment.find({ dealId: recordId, organizationId })
          .populate('author', 'firstName lastName email avatar username')
          .populate('reactions.users', 'firstName lastName email avatar username')
          .sort({ createdAt: 1 })
          .lean();
        const { buildDealCommentResponse } = require('./dealController');
        const data = comments.map((c) => buildDealCommentResponse(c, req.user?._id));
        return res.json({ success: true, data });
      }
      if (moduleKey === 'tasks') {
        const task = await Task.findOne({ _id: recordId, organizationId, deletedAt: null }).select('_id').lean();
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        const comments = await TaskComment.find({ taskId: recordId, organizationId })
          .populate('author', 'firstName lastName email avatar username')
          .populate('reactions.users', 'firstName lastName email avatar username')
          .sort({ createdAt: 1 })
          .lean();
        const { buildTaskCommentResponse } = require('./taskController');
        const data = comments.map((c) => buildTaskCommentResponse(c, req.user?._id));
        return res.json({ success: true, data });
      }
    }

    const comments = await RecordActivity.find({
      organizationId,
      moduleKey,
      recordId: new mongoose.Types.ObjectId(recordId),
      type: 'comment'
    })
      .populate('author', 'firstName lastName email avatar username')
      .populate('reactions.users', 'firstName lastName email avatar username')
      .sort({ createdAt: 1 })
      .lean();

    const data = comments.map((c) => ({
      _id: c._id,
      content: c.content,
      parentCommentId: c.parentCommentId,
      attachments: c.attachments || [],
      reactions: (c.reactions || []).map((r) => ({
        emoji: r.emoji,
        users: r.users || [],
        count: (r.users || []).length
      })),
      author: c.author,
      editedAt: c.editedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('getComments error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching comments', error: err.message });
  }
};

/**
 * POST /api/modules/:moduleKey/records/:recordId/comments
 */
exports.createComment = async (req, res) => {
  try {
    const moduleKey = getModuleKey(req);
    const recordId = getRecordId(req);
    const organizationId = req.user.organizationId;
    const { content, parentCommentId } = req.body || {};

    if (!moduleKey || !recordId) {
      return res.status(400).json({ success: false, message: 'moduleKey and recordId are required' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    if (MODULES_WITH_NATIVE_COMMENTS.has(moduleKey)) {
      const fakeReq = {
        params: { id: recordId },
        user: req.user,
        body: req.body
      };
      const fakeRes = {
        statusCode: 200,
        _data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(obj) {
          this._data = obj;
          return this;
        }
      };
      if (moduleKey === 'deals') {
        const { createDealComment } = require('./dealController');
        await createDealComment(fakeReq, fakeRes);
      } else {
        const { createTaskComment } = require('./taskController');
        await createTaskComment(fakeReq, fakeRes);
      }
      return res.status(fakeRes.statusCode).json(fakeRes._data);
    }

    let validatedParentId = null;
    if (parentCommentId && mongoose.Types.ObjectId.isValid(parentCommentId)) {
      const parent = await RecordActivity.findOne({
        _id: parentCommentId,
        organizationId,
        moduleKey,
        recordId: new mongoose.Types.ObjectId(recordId),
        type: 'comment'
      }).select('_id').lean();
      if (parent) validatedParentId = parent._id;
    }

    const comment = await RecordActivity.create({
      organizationId,
      moduleKey,
      recordId: new mongoose.Types.ObjectId(recordId),
      type: 'comment',
      content: content.trim(),
      parentCommentId: validatedParentId,
      author: req.user._id
    });

    const populated = await RecordActivity.findById(comment._id)
      .populate('author', 'firstName lastName email avatar username')
      .lean();

    return res.status(201).json({
      success: true,
      data: {
        _id: populated._id,
        content: populated.content,
        parentCommentId: populated.parentCommentId,
        attachments: populated.attachments || [],
        reactions: populated.reactions || [],
        author: populated.author,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt
      }
    });
  } catch (err) {
    console.error('createComment error:', err);
    return res.status(500).json({ success: false, message: 'Error creating comment', error: err.message });
  }
};

/**
 * GET /api/modules/:moduleKey/records/:recordId/neighbors
 * Returns { previousId, nextId } for prev/next navigation.
 */
exports.getNeighbors = async (req, res) => {
  try {
    const moduleKey = getModuleKey(req);
    const recordId = getRecordId(req);
    const organizationId = req.user.organizationId;

    if (!moduleKey || !recordId) {
      return res.status(400).json({ success: false, message: 'moduleKey and recordId are required' });
    }

    const getIds = getListHandlerForModule(moduleKey);
    if (!getIds) {
      return res.json({ success: true, data: { previousId: null, nextId: null } });
    }

    const ids = await getIds(organizationId);
    const currentIndex = ids.indexOf(recordId);
    const previousId = currentIndex > 0 ? ids[currentIndex - 1] : null;
    const nextId = currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;

    return res.json({ success: true, data: { previousId, nextId } });
  } catch (err) {
    console.error('getNeighbors error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching neighbors', error: err.message });
  }
};

/** Modules that support batch fetch for related-record enrichment (deals, events, forms). */
const BATCH_MODULES = new Set(['deals', 'events', 'forms']);

/**
 * POST /api/modules/:moduleKey/records/batch
 * Body: { ids: string[] }
 * Returns { success: true, data: record[] } with only records that exist and belong to the org.
 * Used by Task record page to enrich related deals/events/forms without N GET requests or 404s.
 */
exports.getRecordsBatch = async (req, res) => {
  try {
    const moduleKey = getModuleKey(req);
    const organizationId = req.user.organizationId;
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = rawIds
      .map((id) => (id != null && String(id).trim() ? String(id).trim() : null))
      .filter(Boolean);
    if (!moduleKey) {
      return res.status(400).json({ success: false, message: 'moduleKey is required' });
    }
    if (!BATCH_MODULES.has(moduleKey)) {
      return res.status(400).json({ success: false, message: `Batch not supported for module: ${moduleKey}` });
    }
    if (ids.length === 0) {
      return res.json({ success: true, data: [] });
    }

    let Model;
    let query = { _id: { $in: ids }, organizationId };
    if (moduleKey === 'deals') {
      Model = Deal;
      query.deletedAt = null;
    } else if (moduleKey === 'events') {
      Model = require('../models/Event');
      query.deletedAt = null;
    } else if (moduleKey === 'forms') {
      Model = require('../models/Form');
    } else {
      return res.json({ success: true, data: [] });
    }

    const records = await Model.find(query).lean();
    let data = records;
    if (moduleKey === 'deals' && records.length > 0) {
      const { flattenCustomFieldsForResponse } = require('../utils/customFieldsExtractor');
      data = records.map((r) => flattenCustomFieldsForResponse(r));
    }
    if (moduleKey === 'events' && records.length > 0) {
      const { flattenCustomFieldsForResponse } = require('../utils/customFieldsExtractor');
      data = records.map((r) => flattenCustomFieldsForResponse(r));
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('getRecordsBatch error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching records batch', error: err.message });
  }
};
