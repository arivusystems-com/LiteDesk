/**
 * ============================================================================
 * Scheduling Controller
 * ============================================================================
 *
 * Handles Scheduling-related API endpoints.
 * Scheduling is a core entity that powers both Tasks and Events.
 *
 * ============================================================================
 */

const Scheduling = require('../models/Scheduling');
const People = require('../models/People');
const User = require('../models/User');
const ModuleDefinition = require('../models/ModuleDefinition');

/**
 * Helper function to add activity log to linked entity
 */
async function addActivityToEntity(entityType, entityId, organizationId, user, action, appContext, metadata = {}) {
  // Only support Person entity type for activity logging for now
  if (entityType.toLowerCase() === 'person') {
    const person = await People.findOne({
      _id: entityId,
      organizationId: organizationId
    });

    if (person) {
      const userName = user.firstName || user.lastName
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : user.username || 'User';

      person.activityLogs = person.activityLogs || [];
      person.activityLogs.push({
        user: userName,
        userId: user._id,
        action: action,
        details: {
          appKey: appContext,
          ...metadata
        },
        appContext: appContext,
        timestamp: new Date()
      });

      await person.save();
    }
  }
}

/**
 * Get all scheduling items (organization-wide list)
 * GET /api/scheduling
 * 
 * Read-only projection endpoint for Tasks and Events list views.
 * 
 * CROSS-APP AGGREGATION BEHAVIOR:
 * - By default, returns items across ALL apps the user has access to
 * - Optional appContext query parameter filters to a specific app
 * - Each item includes appContext field for UI display
 * - Permissions are still enforced per app internally
 * 
 * Filters by organization, optional appContext, and optional type.
 */
exports.getScheduling = async (req, res) => {
  try {
    const { type, appContext: appContextFilter } = req.query; // Optional: 'task' or 'event', optional appContext filter

    // Build query - start with organization filter
    const query = {
      organizationId: req.user.organizationId
    };

    // Filter by appContext if provided (optional - allows cross-app aggregation)
    if (appContextFilter) {
      query.appContext = appContextFilter;
    }
    // If no appContext filter, we aggregate across all apps
    // This allows list views to show items from all apps

    // Filter by type if provided
    if (type && (type === 'task' || type === 'event')) {
      query.type = type;
    }

    console.log('[getScheduling] Query:', JSON.stringify(query, null, 2));
    console.log('[getScheduling] Aggregating across apps:', !appContextFilter);
    
    // Fetch scheduling items
    const items = await Scheduling.find(query)
      .populate('ownerPersonId', 'first_name last_name email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    console.log('[getScheduling] Found items:', items.length);
    
    // Group by appContext for logging
    if (items.length > 0) {
      const appContextGroups = {};
      items.forEach(item => {
        const appCtx = item.appContext || 'UNKNOWN';
        appContextGroups[appCtx] = (appContextGroups[appCtx] || 0) + 1;
      });
      console.log('[getScheduling] Items by appContext:', appContextGroups);
    }

    // Return flat list response with appContext included in each item
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching scheduling items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduling items',
      error: error.message
    });
  }
};

/**
 * Get scheduling items for an entity
 * GET /api/scheduling/:entityType/:entityId
 */
exports.getEntityScheduling = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { type, appContext } = req.query; // Filter by type ('task' or 'event') and appContext

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and ID are required.'
      });
    }

    // Build query
    const query = {
      organizationId: req.user.organizationId,
      entityType: entityType,
      entityId: entityId
    };

    // Filter by type if provided
    if (type && (type === 'task' || type === 'event')) {
      query.type = type;
    }

    // Filter by appContext if provided (from req.appKey or query param)
    const appKey = appContext || req.appKey;
    if (appKey) {
      query.appContext = appKey;
    }

    // Fetch scheduling items
    const items = await Scheduling.find(query)
      .populate('ownerPersonId', 'first_name last_name email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching scheduling items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduling items',
      error: error.message
    });
  }
};

/**
 * Create a new scheduling item
 * POST /api/scheduling
 */
exports.createScheduling = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      startDate,
      dueDate,
      ownerPersonId,
      entityType,
      entityId,
      status
    } = req.body;

    // Validate required fields
    if (!type || !['task', 'event'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type is required and must be 'task' or 'event'."
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required.'
      });
    }

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and ID are required.'
      });
    }

    // Get app context from request (from middleware)
    const appContext = req.appKey;
    if (!appContext) {
      return res.status(400).json({
        success: false,
        message: 'App context is required. Cannot create scheduling item without app context.',
        code: 'MISSING_APP_CONTEXT'
      });
    }

    // ARCHITECTURE NOTE: Validate dates based on module definition field requirements
    // Respect admin configuration in Settings → Core Modules → Tasks/Events → Field Configuration
    // See: docs/architecture/task-settings.md, docs/architecture/module-settings-doctrine.md
    const moduleKey = type === 'task' ? 'tasks' : 'events';
    
    // Try tenant-specific override first, then fall back to platform default
    let moduleDef = await ModuleDefinition.findOne({
      moduleKey: moduleKey,
      organizationId: req.user.organizationId
    });
    
    // If no tenant override, check platform default
    if (!moduleDef) {
      moduleDef = await ModuleDefinition.findOne({
        moduleKey: moduleKey,
        appKey: 'platform'
      });
    }

    // Validate dates only if marked as required in module definition
    if (type === 'task') {
      const dueDateField = moduleDef?.fields?.find(f => 
        f.key && f.key.toLowerCase() === 'duedate'
      );
      if (dueDateField?.required && !dueDate) {
        return res.status(400).json({
          success: false,
          message: `${dueDateField.label || 'Due date'} is required.`
        });
      }
    }

    if (type === 'event') {
      const startDateField = moduleDef?.fields?.find(f => 
        f.key && f.key.toLowerCase() === 'startdate'
      );
      if (startDateField?.required && !startDate) {
        return res.status(400).json({
          success: false,
          message: `${startDateField.label || 'Start date'} is required.`
        });
      }
    }

    // Validate status (only for tasks)
    if (type === 'event' && status && status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Status field is only applicable to tasks.'
      });
    }

    // Get user info for activity logging
    const user = await User.findById(req.user._id).select('firstName lastName username');

    // Create scheduling item
    const scheduling = await Scheduling.create({
      organizationId: req.user.organizationId,
      type: type,
      title: title.trim(),
      description: description ? description.trim() : undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      ownerPersonId: ownerPersonId || undefined,
      appContext: appContext,
      entityType: entityType,
      entityId: entityId,
      status: type === 'task' ? (status || 'open') : 'open',
      createdBy: req.user._id
    });

    // Populate references
    const populated = await Scheduling.findById(scheduling._id)
      .populate('ownerPersonId', 'first_name last_name email')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    // Add activity log to linked entity
    const action = type === 'task' ? 'task.created' : 'event.created';
    await addActivityToEntity(
      entityType,
      entityId,
      req.user.organizationId,
      user,
      action,
      appContext,
      {
        schedulingId: scheduling._id.toString(),
        schedulingType: type,
        title: title.trim()
      }
    );

    res.status(201).json({
      success: true,
      message: 'Scheduling item created successfully.',
      data: populated
    });
  } catch (error) {
    console.error('Error creating scheduling item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating scheduling item',
      error: error.message
    });
  }
};

/**
 * Update scheduling item status (for tasks: complete/reopen)
 * PATCH /api/scheduling/:id/status
 */
exports.updateSchedulingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status is required and must be 'open' or 'completed'."
      });
    }

    // Find scheduling item
    const scheduling = await Scheduling.findOne({
      _id: id,
      organizationId: req.user.organizationId
    });

    if (!scheduling) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling item not found.'
      });
    }

    // Status only applies to tasks
    if (scheduling.type !== 'task') {
      return res.status(400).json({
        success: false,
        message: 'Status updates are only applicable to tasks.'
      });
    }

    const oldStatus = scheduling.status;
    scheduling.status = status;
    await scheduling.save();

    // Populate references
    const populated = await Scheduling.findById(scheduling._id)
      .populate('ownerPersonId', 'first_name last_name email')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    // Get user info for activity logging
    const user = await User.findById(req.user._id).select('firstName lastName username');

    // Add activity log to linked entity
    const action = status === 'completed' ? 'task.completed' : 'task.reopened';
    await addActivityToEntity(
      scheduling.entityType,
      scheduling.entityId,
      req.user.organizationId,
      user,
      action,
      scheduling.appContext,
      {
        schedulingId: scheduling._id.toString(),
        oldStatus: oldStatus,
        newStatus: status,
        title: scheduling.title
      }
    );

    res.json({
      success: true,
      message: 'Scheduling item status updated successfully.',
      data: populated
    });
  } catch (error) {
    console.error('Error updating scheduling item status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating scheduling item status',
      error: error.message
    });
  }
};

/**
 * Reschedule event (for events: update startDate)
 * PATCH /api/scheduling/:id/reschedule
 */
exports.rescheduleEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate } = req.body;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required for rescheduling.'
      });
    }

    // Find scheduling item
    const scheduling = await Scheduling.findOne({
      _id: id,
      organizationId: req.user.organizationId
    });

    if (!scheduling) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling item not found.'
      });
    }

    // Reschedule only applies to events
    if (scheduling.type !== 'event') {
      return res.status(400).json({
        success: false,
        message: 'Reschedule is only applicable to events.'
      });
    }

    const oldStartDate = scheduling.startDate;
    scheduling.startDate = new Date(startDate);
    await scheduling.save();

    // Populate references
    const populated = await Scheduling.findById(scheduling._id)
      .populate('ownerPersonId', 'first_name last_name email')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    // Get user info for activity logging
    const user = await User.findById(req.user._id).select('firstName lastName username');

    // Add activity log to linked entity
    await addActivityToEntity(
      scheduling.entityType,
      scheduling.entityId,
      req.user.organizationId,
      user,
      'event.rescheduled',
      scheduling.appContext,
      {
        schedulingId: scheduling._id.toString(),
        oldStartDate: oldStartDate,
        newStartDate: scheduling.startDate,
        title: scheduling.title
      }
    );

    res.json({
      success: true,
      message: 'Event rescheduled successfully.',
      data: populated
    });
  } catch (error) {
    console.error('Error rescheduling event:', error);
    res.status(500).json({
      success: false,
      message: 'Error rescheduling event',
      error: error.message
    });
  }
};

/**
 * Get a single scheduling item by ID
 * GET /api/scheduling/:id
 */
exports.getSchedulingById = async (req, res) => {
  try {
    const { id } = req.params;

    const scheduling = await Scheduling.findOne({
      _id: id,
      organizationId: req.user.organizationId
    })
      .populate('ownerPersonId', 'first_name last_name email')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!scheduling) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling item not found.'
      });
    }

    res.json({
      success: true,
      data: scheduling
    });
  } catch (error) {
    console.error('Error fetching scheduling item:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduling item',
      error: error.message
    });
  }
};

/**
 * Update scheduling item
 * PUT /api/scheduling/:id
 */
exports.updateScheduling = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startDate,
      dueDate,
      ownerPersonId
    } = req.body;

    // Find scheduling item
    const scheduling = await Scheduling.findOne({
      _id: id,
      organizationId: req.user.organizationId
    });

    if (!scheduling) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling item not found.'
      });
    }

    // Update allowed fields
    if (title !== undefined) scheduling.title = title.trim();
    if (description !== undefined) scheduling.description = description ? description.trim() : undefined;
    if (startDate !== undefined) scheduling.startDate = startDate ? new Date(startDate) : undefined;
    if (dueDate !== undefined) scheduling.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (ownerPersonId !== undefined) scheduling.ownerPersonId = ownerPersonId || undefined;

    await scheduling.save();

    // Populate references
    const populated = await Scheduling.findById(scheduling._id)
      .populate('ownerPersonId', 'first_name last_name email')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      message: 'Scheduling item updated successfully.',
      data: populated
    });
  } catch (error) {
    console.error('Error updating scheduling item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating scheduling item',
      error: error.message
    });
  }
};

/**
 * Delete scheduling item
 * DELETE /api/scheduling/:id
 */
exports.deleteScheduling = async (req, res) => {
  try {
    const { id } = req.params;

    const scheduling = await Scheduling.findOne({
      _id: id,
      organizationId: req.user.organizationId
    });

    if (!scheduling) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling item not found.'
      });
    }

    await scheduling.deleteOne();

    res.json({
      success: true,
      message: 'Scheduling item deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting scheduling item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting scheduling item',
      error: error.message
    });
  }
};

