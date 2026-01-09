const Organization = require('../models/Organization');
const { applyProjectionFilter } = require('../utils/appProjectionQuery');
const { getProjection } = require('../utils/moduleProjectionResolver');

// Create (Sales organization)
exports.create = async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get user name for activity log (if user is authenticated)
    let userName = 'System';
    if (req.user && req.user._id) {
      const user = await User.findById(req.user._id).select('firstName lastName username');
      if (user) {
        userName = (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User';
      }
    }
    
    const body = {
      ...req.body,
      // Set createdBy from authenticated user
      createdBy: req.user?._id || null,
      // Default assignedTo to creator if not provided (similar to tasks)
      assignedTo: req.body.assignedTo || req.user?._id || null,
      // Mark as Sales organization (not tenant)
      isTenant: false,
      // Add initial activity log for record creation
      activityLogs: [{
        user: userName,
        userId: req.user?._id || null,
        action: 'created this record',
        details: { type: 'create' },
        timestamp: new Date()
      }]
    };
    
    const org = await Organization.create(body);
    res.status(201).json({ success: true, data: org });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error creating organization', error: error.message });
  }
};

// List (Sales organizations only)
// CRITICAL: Filter by tenant organization context to prevent data leakage
// Sales organizations created by users from tenant org A should only be visible to users from tenant org A
exports.list = async (req, res) => {
  try {
    const User = require('../models/User');
    const tenantOrganizationId = req.user?.organizationId;
    
    if (!tenantOrganizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization context required' 
      });
    }

    // Get all users from this tenant organization
    const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
      .select('_id')
      .lean();
    const userIds = tenantUserIds.map(u => u._id);

    // Build query: Sales organizations created by users from this tenant organization
    let query = { 
      isTenant: false, // Only Sales organizations
      createdBy: { $in: userIds } // Only Sales orgs created by users from this tenant
    };
    
    // Note: Organizations use 'types' array field, not 'type'
    // For query params, we'll filter on the types array
    if (req.query.type) {
      // Convert single type to array format for types field
      query.types = req.query.type;
    }
    if (req.query.name) query.name = new RegExp(req.query.name, 'i');

    // Phase 2A.2: Apply projection filter (read-time filtering only)
    // SAFETY: Projection filtering is read-only.
    // SAFETY: No record ownership or permissions are enforced here.
    const appKey = req.appKey || 'SALES'; // From resolveAppContext middleware
    const moduleKey = 'organizations';
    const projectionMeta = getProjection(appKey, moduleKey);
    
    // Debug logging
    console.log('[organizationV2Controller] Before projection filter:', {
      appKey,
      moduleKey,
      hasProjection: !!projectionMeta,
      queryBefore: JSON.stringify(query),
      userIds: userIds.length
    });
    
    query = applyProjectionFilter({
      appKey,
      moduleKey,
      baseQuery: query,
      projectionMeta
    });
    
    // Debug logging
    console.log('[organizationV2Controller] After projection filter:', {
      queryAfter: JSON.stringify(query)
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const data = await Organization.find(query)
      .populate('createdBy', 'firstName lastName email avatar username')
      .populate('assignedTo', 'firstName lastName email avatar username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    const total = await Organization.countDocuments(query);
    res.json({ success: true, data, meta: { page, limit, total } });
  } catch (error) {
    console.error('Error listing Sales organizations:', error);
    res.status(500).json({ success: false, message: 'Error fetching organizations', error: error.message });
  }
};

// Get by ID (Sales organization, filtered by tenant context)
exports.getById = async (req, res) => {
  try {
    const User = require('../models/User');
    const tenantOrganizationId = req.user?.organizationId;
    
    if (!tenantOrganizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization context required' 
      });
    }

    // Get all users from this tenant organization
    const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
      .select('_id')
      .lean();
    const userIds = tenantUserIds.map(u => u._id);

    // Only allow access to Sales organizations created by users from this tenant
    const org = await Organization.findOne({ 
      _id: req.params.id, 
      isTenant: false,
      createdBy: { $in: userIds } // CRITICAL: Filter by tenant context
    })
      .populate('createdBy', 'firstName lastName email avatar username')
      .populate('assignedTo', 'firstName lastName email avatar username');
    if (!org) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching organization', error: error.message });
  }
};

// Update (Sales organization, filtered by tenant context)
exports.update = async (req, res) => {
  try {
    const User = require('../models/User');
    const tenantOrganizationId = req.user?.organizationId;
    
    if (!tenantOrganizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization context required' 
      });
    }

    // Get all users from this tenant organization
    const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
      .select('_id')
      .lean();
    const userIds = tenantUserIds.map(u => u._id);

    // Only allow update of Sales organizations created by users from this tenant
    const updated = await Organization.findOneAndUpdate(
      { 
        _id: req.params.id, 
        isTenant: false,
        createdBy: { $in: userIds } // CRITICAL: Filter by tenant context
      }, 
      req.body, 
      { new: true }
    )
      .populate('createdBy', 'firstName lastName email avatar username')
      .populate('assignedTo', 'firstName lastName email avatar username');
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error updating organization', error: error.message });
  }
};

// Delete (Sales organization only - tenants cannot be deleted this way, filtered by tenant context)
exports.remove = async (req, res) => {
  try {
    const User = require('../models/User');
    const tenantOrganizationId = req.user?.organizationId;
    
    if (!tenantOrganizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization context required' 
      });
    }

    // Get all users from this tenant organization
    const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
      .select('_id')
      .lean();
    const userIds = tenantUserIds.map(u => u._id);

    // Only allow deletion of Sales organizations created by users from this tenant
    const deleted = await Organization.findOneAndDelete({ 
      _id: req.params.id, 
      isTenant: false,
      createdBy: { $in: userIds } // CRITICAL: Filter by tenant context
    });
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: deleted._id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting organization', error: error.message });
  }
};

// Get activity logs for an organization (filtered by tenant context)
exports.getActivityLogs = async (req, res) => {
  try {
    const User = require('../models/User');
    const tenantOrganizationId = req.user?.organizationId;
    
    if (!tenantOrganizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization context required' 
      });
    }

    // Get all users from this tenant organization
    const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
      .select('_id')
      .lean();
    const userIds = tenantUserIds.map(u => u._id);

    // Only allow access to activity logs of Sales organizations created by users from this tenant
    const org = await Organization.findOne({ 
      _id: req.params.id, 
      isTenant: false,
      createdBy: { $in: userIds } // CRITICAL: Filter by tenant context
    }).select('activityLogs');
    
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    // Sort by timestamp (newest first)
    const logs = (org.activityLogs || []).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message
    });
  }
};

// Add activity log to an organization (filtered by tenant context)
exports.addActivityLog = async (req, res) => {
  try {
    const { user, action, details } = req.body;
    
    if (!user || !action) {
      return res.status(400).json({
        success: false,
        message: 'User and action are required'
      });
    }
    
    const User = require('../models/User');
    const tenantOrganizationId = req.user?.organizationId;
    
    if (!tenantOrganizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization context required' 
      });
    }

    // Get all users from this tenant organization
    const tenantUserIds = await User.find({ organizationId: tenantOrganizationId })
      .select('_id')
      .lean();
    const userIds = tenantUserIds.map(u => u._id);
    
    // Only allow adding activity logs to Sales organizations created by users from this tenant
    const org = await Organization.findOneAndUpdate(
      { 
        _id: req.params.id, 
        isTenant: false,
        createdBy: { $in: userIds } // CRITICAL: Filter by tenant context
      },
      {
        $push: {
          activityLogs: {
            user: user,
            userId: req.user?._id || null,
            action: action,
            details: details || null,
            timestamp: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    // Return the newly added log
    const newLog = org.activityLogs[org.activityLogs.length - 1];
    
    res.status(200).json({
      success: true,
      data: newLog
    });
  } catch (error) {
    console.error('Add activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding activity log',
      error: error.message
    });
  }
};


