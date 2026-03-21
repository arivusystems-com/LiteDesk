/**
 * ============================================================================
 * Notes Controller
 * ============================================================================
 *
 * Handles Notes-related API endpoints.
 * Notes are app-aware, entity-attached, and mutable.
 *
 * ============================================================================
 */

const { resolvePeopleAppContext } = require('../utils/peopleAppContextResolver');
const { resolveNotes, normalizeNote } = require('../utils/notesResolver');
const People = require('../models/People');
const PersonNote = require('../models/PersonNote');
const Organization = require('../models/Organization');
const User = require('../models/User');

/**
 * Get notes for a specific entity (e.g., Person).
 * 
 * GET /api/notes/:entityType/:entityId
 */
exports.getEntityNotes = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and ID are required.'
      });
    }

    // Only support 'Person' entity type for now
    if (entityType.toLowerCase() !== 'person') {
      return res.status(400).json({
        success: false,
        message: `Entity type '${entityType}' is not supported. Only 'Person' is supported.`
      });
    }

    const person = await People.findOne({
      _id: entityId,
      organizationId: req.user.organizationId,
      deletedAt: null
    }).lean();

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found.'
      });
    }

    // Get enabled apps for the organization
    let enabledApps = [];
    if (req.user?.organizationId) {
      const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
      if (organization?.enabledApps) {
        enabledApps = organization.enabledApps.map(app => {
          return typeof app === 'object' && app.appKey ? app.appKey : app;
        });
      }
    }

    // If no enabledApps found, fall back to user's allowedApps
    if (!enabledApps.length && req.user?.allowedApps) {
      enabledApps = Array.isArray(req.user.allowedApps) ? req.user.allowedApps : [];
    }

    // Build route info from request for app context resolution
    const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const routePath = req.query.routePath || fullPath;
    
    const routeInfo = {
      path: routePath,
      name: req.query.routeName || null,
      params: { entityType, entityId },
      query: req.query,
      meta: {}
    };

    // Resolve app context
    const userAppAccess = req.user?.allowedApps || [];
    const appContextResult = resolvePeopleAppContext({
      routeInfo,
      navigationIntent: req.query.appKey ? { sourceAppKey: req.query.appKey } : null,
      enabledApps: enabledApps,
      userAppAccess: userAppAccess
    });

    const rawNotes = await PersonNote.find({
      personId: entityId,
      organizationId: req.user.organizationId
    })
      .sort({ created_at: -1 })
      .lean();

    // Resolve and filter notes
    const notesResult = resolveNotes({
      notes: rawNotes,
      resolvedAppContext: appContextResult,
      entityType: 'Person',
      entityId: entityId
    });

    // Normalize notes and populate author information
    const normalizedNotes = [];
    for (const note of notesResult.notes) {
      const normalized = normalizeNote(note);
      if (normalized && normalized.authorId) {
        // Populate author name
        const author = await User.findById(normalized.authorId).select('firstName lastName username').lean();
        if (author) {
          normalized.authorName = author.firstName || author.lastName 
            ? `${author.firstName || ''} ${author.lastName || ''}`.trim() 
            : author.username || 'User';
        } else {
          normalized.authorName = 'User';
        }
      } else if (normalized) {
        normalized.authorName = 'User';
      }
      if (normalized) {
        normalizedNotes.push(normalized);
      }
    }

    res.json({
      success: true,
      data: {
        notes: normalizedNotes,
        appContext: appContextResult,
        stats: {
          total: notesResult.total,
          filtered: notesResult.filtered,
          shown: normalizedNotes.length
        },
        blocked: notesResult.blocked || false,
        reason: notesResult.reason || null
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notes',
      error: error.message
    });
  }
};

/**
 * Create a new note for a specific entity.
 * 
 * POST /api/notes/:entityType/:entityId
 */
exports.createNote = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { content } = req.body;
    
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and ID are required.'
      });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required.'
      });
    }

    // Only support 'Person' entity type for now
    if (entityType.toLowerCase() !== 'person') {
      return res.status(400).json({
        success: false,
        message: `Entity type '${entityType}' is not supported. Only 'Person' is supported.`
      });
    }

    const person = await People.findOne({
      _id: entityId,
      organizationId: req.user.organizationId,
      deletedAt: null
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found.'
      });
    }

    // Get enabled apps for the organization
    let enabledApps = [];
    if (req.user?.organizationId) {
      const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
      if (organization?.enabledApps) {
        enabledApps = organization.enabledApps.map(app => {
          return typeof app === 'object' && app.appKey ? app.appKey : app;
        });
      }
    }

    // If no enabledApps found, fall back to user's allowedApps
    if (!enabledApps.length && req.user?.allowedApps) {
      enabledApps = Array.isArray(req.user.allowedApps) ? req.user.allowedApps : [];
    }

    // Build route info from request for app context resolution
    const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const routePath = req.query.routePath || fullPath;
    
    const routeInfo = {
      path: routePath,
      name: req.query.routeName || null,
      params: { entityType, entityId },
      query: req.query,
      meta: {}
    };

    // Resolve app context
    const userAppAccess = req.user?.allowedApps || [];
    const appContextResult = resolvePeopleAppContext({
      routeInfo,
      navigationIntent: req.query.appKey ? { sourceAppKey: req.query.appKey } : null,
      enabledApps: enabledApps,
      userAppAccess: userAppAccess
    });

    // Block note creation if app context is ambiguous
    if (appContextResult.isAmbiguous || !appContextResult.appKey) {
      return res.status(400).json({
        success: false,
        message: appContextResult.isAmbiguous 
          ? 'App context is ambiguous. Cannot create note without explicit app context.'
          : 'App context is not resolved. Cannot create note.',
        code: 'AMBIGUOUS_APP_CONTEXT'
      });
    }

    // Get user information for author
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' : 'System';

    const doc = await PersonNote.create({
      organizationId: req.user.organizationId,
      personId: entityId,
      text: content.trim(),
      created_by: req.user._id,
      created_at: new Date(),
      appContext: appContextResult.appKey,
      updated_at: new Date()
    });

    await People.updateOne(
      { _id: entityId, organizationId: req.user.organizationId, deletedAt: null },
      {
        $push: {
          activityLogs: {
            user: userName,
            userId: req.user._id,
            action: 'created a note',
            details: {
              appKey: appContextResult.appKey,
              noteLength: content.trim().length
            },
            appContext: appContextResult.appKey,
            timestamp: new Date()
          }
        }
      }
    );

    const newNote = doc.toObject ? doc.toObject() : doc;
    const normalizedNote = normalizeNote(newNote);
    if (normalizedNote) {
      normalizedNote.authorName = userName;
      normalizedNote.id = doc._id || null;
    }

    res.json({
      success: true,
      message: 'Note created successfully.',
      data: normalizedNote
    });
  } catch (error) {
    console.error('Error creating note:', error);
    if (error.name === 'ValidationError') {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating note',
      error: error.message
    });
  }
};

