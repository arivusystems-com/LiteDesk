const Organization = require('../models/Organization');
const { applyProjectionFilter } = require('../utils/appProjectionQuery');
const { getProjection } = require('../utils/moduleProjectionResolver');
const { mapOrganizationToSurface } = require('../utils/mappers/mapOrganizationToSurface');

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

// OrganizationSurface API
// Returns a curated, UI-safe projection.
// Never return the raw Organization model to the UI.
// 
// This endpoint enforces OrganizationSurface discipline:
// - Only business organizations (isTenant: false)
// - Only business context fields
// - No platform/tenant fields
// See docs/architecture/organization-surface-invariants.md
exports.getSurface = async (req, res) => {
  try {
    const User = require('../models/User');
    const People = require('../models/People');
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

    // Fetch organization - MUST be business org (isTenant: false)
    const org = await Organization.findOne({ 
      _id: req.params.id, 
      isTenant: false, // CRITICAL: Reject tenant orgs
      createdBy: { $in: userIds } // CRITICAL: Filter by tenant context
    })
      .populate('primaryContact', 'first_name last_name email')
      .lean();
    
    if (!org) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }
    
    // EXPLICIT REJECTION: If somehow a tenant org got through, reject it
    if (org.isTenant === true) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tenant organizations cannot be accessed via OrganizationSurface' 
      });
    }
    
    // Fetch related data for surface
    
    // 1. People count and preview
    const peopleCount = await People.countDocuments({ 
      organization: org._id 
    });
    
    const peoplePreview = await People.find({ 
      organization: org._id 
    })
      .select('_id first_name last_name email role')
      .limit(5) // Small preview list
      .lean()
      .then(people => people.map(p => ({
        id: p._id.toString(),
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown',
        role: p.role || undefined
      })));
    
    // 2. App participation summary
    const apps = [];
    
    // Check SALES app participation (Deals)
    try {
      const Deal = require('../models/Deal');
      const dealCount = await Deal.countDocuments({ 
        accountId: org._id,
        organizationId: tenantOrganizationId 
      });
      
      if (dealCount > 0) {
        apps.push({
          appKey: 'SALES',
          hasWork: true,
          counts: { deals: dealCount }
        });
      }
    } catch (err) {
      // Deal model might not exist - skip
    }
    
    // Check HELPDESK app participation (Tickets/Cases)
    try {
      const Ticket = require('../models/Ticket');
      const ticketCount = await Ticket.countDocuments({ 
        organizationId: org._id,
        tenantOrganizationId: tenantOrganizationId 
      });
      
      if (ticketCount > 0) {
        apps.push({
          appKey: 'HELPDESK',
          hasWork: true,
          counts: { tickets: ticketCount }
        });
      }
    } catch (err) {
      // Ticket model might not exist - skip
    }
    
    // Check AUDIT app participation (Audits)
    try {
      const Audit = require('../models/Audit');
      const auditCount = await Audit.countDocuments({ 
        organizationId: org._id,
        tenantOrganizationId: tenantOrganizationId 
      });
      
      if (auditCount > 0) {
        apps.push({
          appKey: 'AUDIT',
          hasWork: true,
          counts: { audits: auditCount }
        });
      }
    } catch (err) {
      // Audit model might not exist - skip
    }
    
    // 3. Recent activity (limited to last 20 entries)
    // Enhance activity logs with person information when available
    const recentActivityLogs = (org.activityLogs || [])
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20); // Limit to 20 most recent
    
    // Process activity logs and enrich with person information
    const recentActivity = await Promise.all(
      recentActivityLogs.map(async (log) => {
        const activityEntry = {
          timestamp: log.timestamp,
          user: log.user || 'System',
          userId: log.userId ? log.userId.toString() : undefined,
          action: log.action || 'unknown',
          summary: `${log.user || 'System'} ${log.action || 'performed an action'}`,
          personId: undefined,
          personName: undefined
        };
        
        // Extract person ID from action or details if available
        let personId = null;
        
        // Check if details contains person information
        if (log.details) {
          if (log.details.personId) {
            personId = log.details.personId;
          } else if (log.details.person) {
            personId = log.details.person;
          } else if (log.details.peopleId) {
            personId = log.details.peopleId;
          }
        }
        
        // Also try to extract ObjectId from action string (e.g., "created people '695d51f4f9e9e6cc9e10bf47'")
        if (!personId && log.action) {
          const objectIdMatch = log.action.match(/['"]?([0-9a-fA-F]{24})['"]?/);
          if (objectIdMatch && (log.action.includes('people') || log.action.includes('person'))) {
            personId = objectIdMatch[1];
          }
        }
        
        // Fetch person name if we have a person ID
        if (personId) {
          try {
            const person = await People.findOne({ 
              _id: personId,
              organizationId: tenantOrganizationId 
            }).select('first_name last_name email').lean();
            
            if (person) {
              activityEntry.personId = personId.toString();
              activityEntry.personName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.email || 'Unknown';
            }
          } catch (err) {
            // Person not found or error fetching - continue without person info
            console.warn(`[getSurface] Could not fetch person ${personId}:`, err.message);
          }
        }
        
        return activityEntry;
      })
    );
    
    // Map to OrganizationSurfaceData projection
    const surfaceData = mapOrganizationToSurface(org, {
      peopleCount,
      peoplePreview,
      apps,
      recentActivity
    });
    
    res.json({ 
      success: true, 
      data: surfaceData 
    });
  } catch (error) {
    console.error('Error fetching organization surface:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching organization surface', 
      error: error.message 
    });
  }
};


