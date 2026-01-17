/**
 * ============================================================================
 * PLATFORM CORE: People (Contacts) Management Controller
 * ============================================================================
 * 
 * This controller handles app-agnostic people/contact management:
 * - People CRUD operations
 * - Notes management
 * - Activity log management
 * 
 * ✅ FIXED: Person creation is now identity-only and app-agnostic.
 *    Participation fields (type, lead_status, contact_status, etc.) are
 *    stripped from creation payloads and must be set via Attach-to-App.
 * 
 * See PLATFORM_CORE_ANALYSIS.md for details.
 * ============================================================================
 */

const People = require('../models/People');
const { applyProjectionFilter } = require('../utils/appProjectionQuery');
const { getProjection } = require('../utils/moduleProjectionResolver');

/**
 * Get list of Sales participation fields that should not be set during Person creation
 * These fields are set via Attach-to-App, not during identity creation
 */
function getSalesParticipationFields() {
  return [
    'type',              // State field - Lead/Contact distinction
    'lead_status',       // State field - Lead workflow status
    'contact_status',    // State field - Contact workflow status
    'lead_owner',        // Detail field - Lead owner
    'lead_score',        // Detail field - Lead scoring
    'interest_products', // Detail field - Products of interest
    'qualification_date', // Detail field - Qualification date
    'qualification_notes', // Detail field - Qualification notes
    'estimated_value',   // Detail field - Estimated deal value
    'role',              // Detail field - Contact role
    'birthday',          // Detail field - Birthday
    'preferred_contact_method' // Detail field - Contact preference
  ];
}

// Create People
exports.create = async (req, res) => {
  try {
    const User = require('../models/User');
    
    // GUARDRAIL: Strip Sales participation fields from creation payload
    // Person creation is identity-only and app-agnostic
    // Participation fields are set via Attach-to-App, not during creation
    const participationFields = getSalesParticipationFields();
    const strippedBody = { ...req.body };
    const detectedParticipationFields = [];
    
    for (const field of participationFields) {
      if (strippedBody.hasOwnProperty(field)) {
        detectedParticipationFields.push(field);
        delete strippedBody[field];
      }
    }
    
    // Log warning if participation fields were detected (for legacy callers)
    if (detectedParticipationFields.length > 0) {
      console.warn(`[PeopleController] ⚠️ Participation fields detected in Person creation payload and stripped: ${detectedParticipationFields.join(', ')}. Person creation is identity-only. Use Attach-to-App to set participation fields.`);
    }
    
    // Get user name for activity log
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? 
      (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' 
      : 'System';
    
    const body = {
      ...strippedBody, // Use stripped body (no participation fields)
      organizationId: req.user.organizationId,
      createdBy: req.user._id,
      // Add initial activity log for record creation
      activityLogs: [{
        user: userName,
        userId: req.user._id,
        action: 'created this record',
        details: { type: 'create' },
        timestamp: new Date()
      }]
    };
    const record = await People.create(body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Error creating people record:', error);
    console.error('Error name:', error.name);
    console.error('Error errors:', error.errors);
    console.error('Error message:', error.message);
    
    // Handle Mongoose validation errors - check both error.name and error.errors
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      console.log('Returning validation errors:', validationErrors);
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed. Please check the fields below.',
        errors: validationErrors
      });
    }
    
    // Parse error message for validation errors (format: "People validation failed: type: Path `type` is required.")
    // This happens when Mongoose validation fails but error.name is not 'ValidationError'
    if (error.message && error.message.includes('validation failed')) {
      const validationErrors = {};
      
      // Pattern 1: "field: Path `field` is required."
      const requiredPattern = /(\w+):\s*Path\s+`(\w+)`\s+is\s+required\.?/gi;
      let match;
      while ((match = requiredPattern.exec(error.message)) !== null) {
        const fieldName = match[1] || match[2];
        validationErrors[fieldName] = `${fieldName} is required`;
      }
      
      // Pattern 2: "field: error message" (general format)
      if (Object.keys(validationErrors).length === 0) {
        const parts = error.message.split(/validation failed:\s*/i);
        if (parts.length > 1) {
          const errorPart = parts[1];
          const fieldMatches = errorPart.match(/(\w+):\s*(.+?)(?:,|$)/g);
          if (fieldMatches) {
            fieldMatches.forEach(fieldMatch => {
              const fieldParts = fieldMatch.match(/(\w+):\s*(.+)/);
              if (fieldParts) {
                const fieldName = fieldParts[1];
                let errorMsg = fieldParts[2].trim();
                // Clean up common Mongoose error phrases
                errorMsg = errorMsg.replace(/^Path\s+`\w+`\s+/, '');
                validationErrors[fieldName] = errorMsg;
              }
            });
          }
        }
      }
      
      if (Object.keys(validationErrors).length > 0) {
        console.log('Parsed validation errors from message:', validationErrors);
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed. Please check the fields below.',
          errors: validationErrors
        });
      }
    }
    
    // Handle other errors - return the actual error message
    res.status(400).json({ 
      success: false, 
      message: 'Error creating record',
      error: error.message
    });
  }
};

// List People with org isolation and basic filters
exports.list = async (req, res) => {
  try {
    // CRITICAL: Ensure organizationId is set and log for debugging
    const userOrgId = req.user?.organizationId;
    if (!userOrgId) {
      console.error('[PeopleController] Missing organizationId in req.user:', {
        userId: req.user?._id,
        userEmail: req.user?.email,
        hasUser: !!req.user
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Organization context required' 
      });
    }

    // CRITICAL: Ensure organizationId is a proper ObjectId
    const mongoose = require('mongoose');
    const orgIdObjectId = mongoose.Types.ObjectId.isValid(userOrgId) 
      ? new mongoose.Types.ObjectId(userOrgId) 
      : userOrgId;
    
    let query = { organizationId: orgIdObjectId };
    
    // Debug logging
    console.log('[PeopleController] Filtering by organizationId:', {
      organizationId: String(userOrgId),
      organizationIdType: typeof userOrgId,
      orgIdObjectId: String(orgIdObjectId),
      userEmail: req.user?.email,
      queryKeys: Object.keys(query),
      query: JSON.stringify(query)
    });
    
    if (req.query.type) query.type = req.query.type;
    if (req.query.email) query.email = req.query.email;
    if (req.query.organization) query.organization = req.query.organization; // This is Sales organization, not tenant

    // Phase 2A.2: Apply projection filter (read-time filtering only)
    // SAFETY: Projection filtering is read-only.
    // SAFETY: No record ownership or permissions are enforced here.
    const appKey = req.appKey || 'SALES'; // From resolveAppContext middleware
    const moduleKey = 'people';
    const projectionMeta = getProjection(appKey, moduleKey);
    query = applyProjectionFilter({
      appKey,
      moduleKey,
      baseQuery: query,
      projectionMeta
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Handle sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const User = require('../models/User');
    
    // CRITICAL: Double-check the query before executing
    console.log('[PeopleController] Executing query:', JSON.stringify(query, null, 2));
    
    const data = await People.find(query)
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar username')
      .populate('lead_owner', 'firstName lastName email avatar username')
      .populate('organization', 'name')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip);
    const total = await People.countDocuments(query);
    
    // Calculate statistics with projection filter applied
    // Use the same query so stats match the filtered results
    const statistics = await People.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          leadContacts: { $sum: { $cond: [{ $eq: ['$type', 'Lead'] }, 1, 0] } },
          customerContacts: { $sum: { $cond: [{ $eq: ['$type', 'Contact'] }, 1, 0] } }
        }
      }
    ]);
    
    // Get new contacts this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = await People.countDocuments({
      ...query,
      createdAt: { $gte: oneWeekAgo }
    });
    
    // Get new customers this week
    const newCustomers = await People.countDocuments({
      ...query,
      type: 'Contact',
      createdAt: { $gte: oneWeekAgo }
    });
    
    // Calculate conversion rate (customers / total * 100)
    const statsData = statistics[0] || {
      totalContacts: 0,
      leadContacts: 0,
      customerContacts: 0
    };
    const conversionRate = statsData.totalContacts > 0
      ? Math.round((statsData.customerContacts / statsData.totalContacts) * 100)
      : 0;
    
    // Debug: Check if any records have wrong organizationId
    if (data.length > 0) {
      const wrongOrgRecords = data.filter(record => {
        const recordOrgId = record.organizationId?._id || record.organizationId;
        return String(recordOrgId) !== String(userOrgId);
      });
      
      if (wrongOrgRecords.length > 0) {
        console.error('[PeopleController] CRITICAL: Found records with wrong organizationId:', {
          expectedOrgId: String(userOrgId),
          userEmail: req.user?.email,
          wrongRecordsCount: wrongOrgRecords.length,
          wrongRecords: wrongOrgRecords.map(r => ({
            id: r._id,
            name: `${r.first_name} ${r.last_name}`,
            actualOrgId: String(r.organizationId?._id || r.organizationId),
            expectedOrgId: String(userOrgId)
          }))
        });
      } else {
        console.log('[PeopleController] ✅ All records have correct organizationId:', {
          recordCount: data.length,
          organizationId: String(userOrgId)
        });
      }
      
      // Also log the first few records to verify
      console.log('[PeopleController] Sample records organizationId:', 
        data.slice(0, 3).map(r => ({
          name: `${r.first_name} ${r.last_name}`,
          orgId: String(r.organizationId?._id || r.organizationId)
        }))
      );
    }
    
    // CRITICAL: Filter out any records that somehow have wrong organizationId
    // This is a safety net in case the query didn't work correctly
    const filteredData = data.filter(record => {
      const recordOrgId = record.organizationId?._id || record.organizationId;
      return String(recordOrgId) === String(userOrgId);
    });
    
    if (filteredData.length !== data.length) {
      console.error('[PeopleController] CRITICAL: Filtered out records with wrong organizationId:', {
        before: data.length,
        after: filteredData.length,
        removed: data.length - filteredData.length
      });
    }
    
    res.json({ 
      success: true, 
      data: filteredData, 
      meta: { page, limit, total: filteredData.length },
      statistics: {
        totalContacts: statsData.totalContacts,
        leadContacts: statsData.leadContacts,
        customerContacts: statsData.customerContacts,
        newThisWeek: newThisWeek,
        newCustomers: newCustomers,
        conversionRate: conversionRate
      }
    });
  } catch (error) {
    console.error('Error in people list:', error);
    res.status(500).json({ success: false, message: 'Error fetching records', error: error.message });
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const record = await People.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .populate('organization', 'name industry status email phone website')
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar username')
      .populate('lead_owner', 'firstName lastName email avatar username')
      .populate('notes.created_by', 'firstName lastName');
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching record', error: error.message });
  }
};

// Update
exports.update = async (req, res) => {
  try {
    // Remove createdBy from body to prevent it from being changed
    const { createdBy, ...updateData } = req.body;
    
    // If someone tried to change createdBy, log a warning (but don't fail the request)
    if (createdBy !== undefined) {
      console.warn(`Attempt to modify createdBy field blocked for People record ${req.params.id}`);
    }
    
    // Validate field-level write access
    const ModuleDefinition = require('../models/ModuleDefinition');
    const { validateFieldWrite } = require('../utils/fieldAccessControl');
    
    const moduleDef = await ModuleDefinition.findOne({
      organizationId: req.user.organizationId,
      key: 'people'
    });
    
    if (moduleDef && Array.isArray(moduleDef.fields)) {
      const fieldViolations = [];
      
      // Validate each field being updated
      for (const [fieldKey, fieldValue] of Object.entries(updateData)) {
        // Skip system fields and metadata
        if (['_id', '__v', 'organizationId', 'createdAt', 'updatedAt', 'createdBy'].includes(fieldKey)) {
          continue;
        }
        
        const validation = validateFieldWrite(fieldKey, moduleDef.fields, req.user, 'people');
        if (!validation.allowed) {
          fieldViolations.push({
            field: fieldKey,
            reason: validation.reason
          });
        }
      }
      
      // If any field violations, reject the entire update
      if (fieldViolations.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Field access denied',
          code: 'FIELD_ACCESS_DENIED',
          violations: fieldViolations
        });
      }
    }
    
    // Ensure organization field is properly formatted (ObjectId string or null)
    if (updateData.organization !== undefined) {
      if (updateData.organization === null || updateData.organization === '') {
        updateData.organization = null;
      } else if (typeof updateData.organization === 'object' && updateData.organization._id) {
        // If it's an object with _id, extract the _id
        updateData.organization = updateData.organization._id;
      }
      // Otherwise keep it as is (should be an ObjectId string)
    }
    
    console.log('📝 Updating People record:', {
      id: req.params.id,
      organization: updateData.organization,
      organizationType: typeof updateData.organization,
      updateKeys: Object.keys(updateData)
    });
    
    const updated = await People.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Re-fetch with populated fields to ensure populate works correctly
    const populatedRecord = await People.findById(updated._id)
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('lead_owner', 'firstName lastName email avatar username')
      .populate('organization', 'name');
    
    // Debug: Check if assignedTo is populated
    console.log('✅ Updated People record:', {
      id: populatedRecord._id,
      organization: populatedRecord.organization,
      organizationType: typeof populatedRecord.organization,
      assignedTo: populatedRecord.assignedTo,
      assignedToType: typeof populatedRecord.assignedTo,
      assignedToIsObject: populatedRecord.assignedTo && typeof populatedRecord.assignedTo === 'object' && !Array.isArray(populatedRecord.assignedTo),
      assignedToKeys: populatedRecord.assignedTo && typeof populatedRecord.assignedTo === 'object' ? Object.keys(populatedRecord.assignedTo) : null
    });
    
    res.json({ success: true, data: populatedRecord });
  } catch (error) {
    console.error('❌ Error updating People record:', error);
    res.status(400).json({ success: false, message: 'Error updating record', error: error.message });
  }
};

// Delete
exports.remove = async (req, res) => {
  try {
    const deleted = await People.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: deleted._id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting record', error: error.message });
  }
};

// Add note to person
exports.addNote = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note text is required'
      });
    }
    
    const person = await People.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.user.organizationId 
      },
      {
        $push: {
          notes: {
            text: text.trim(),
            created_by: req.user._id,
            created_at: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('organization', 'name industry status email phone website')
    .populate('assignedTo', 'firstName lastName email')
    .populate('notes.created_by', 'firstName lastName');
    
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found or access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: person
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding note',
      error: error.message
    });
  }
};

// Get activity logs for a person
exports.getActivityLogs = async (req, res) => {
  try {
    const person = await People.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    }).select('activityLogs');
    
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found or access denied'
      });
    }
    
    // Sort by timestamp (newest first)
    const logs = (person.activityLogs || []).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Enrich logs with user information from userId
    const User = require('../models/User');
    const userIds = [...new Set(logs.map(log => log.userId).filter(id => id))];
    
    let usersMap = {};
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } })
        .select('firstName lastName username email')
        .lean();
      
      usersMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {});
    }
    
    // Enrich logs with user information
    const enrichedLogs = logs.map(log => {
      const enrichedLog = { ...log.toObject ? log.toObject() : log };
      
      // If user field is an ObjectId string, try to resolve it from userId
      if (log.userId && usersMap[log.userId.toString()]) {
        const user = usersMap[log.userId.toString()];
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // If user field looks like an ObjectId (24 hex chars), replace it with username
        if (typeof enrichedLog.user === 'string' && /^[0-9a-fA-F]{24}$/.test(enrichedLog.user)) {
          enrichedLog.user = fullName || user.username || user.email || 'Unknown User';
        } else if (!enrichedLog.user || enrichedLog.user === '') {
          // If user field is empty, use the resolved user info
          enrichedLog.user = fullName || user.username || user.email || 'Unknown User';
        }
      } else if (typeof enrichedLog.user === 'string' && /^[0-9a-fA-F]{24}$/.test(enrichedLog.user)) {
        // If user field is an ObjectId but we couldn't resolve it, use a fallback
        enrichedLog.user = 'Unknown User';
      }
      
      return enrichedLog;
    });
    
    res.status(200).json({
      success: true,
      data: enrichedLogs
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

// Add activity log to a person
exports.addActivityLog = async (req, res) => {
  try {
    const { user, action, details } = req.body;
    
    if (!user || !action) {
      return res.status(400).json({
        success: false,
        message: 'User and action are required'
      });
    }
    
    const person = await People.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.user.organizationId 
      },
      {
        $push: {
          activityLogs: {
            user: user,
            userId: req.user._id,
            action: action,
            details: details || null,
            timestamp: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found or access denied'
      });
    }
    
    // Return the newly added log
    const newLog = person.activityLogs[person.activityLogs.length - 1];
    
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


