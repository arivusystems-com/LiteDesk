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

// Export for use in other controllers
exports.getSalesParticipationFields = getSalesParticipationFields;

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
    
    // Compute derived status (non-blocking)
    const { computeAndSetDerivedStatus } = require('../services/derivedStatusService');
    const appKey = req.appKey || req.query.appKey || 'SALES';
    await computeAndSetDerivedStatus('people', record, appKey);
    
    // Save if derivedStatus was computed
    if (record.derivedStatus !== undefined) {
      await record.save();
    }
    
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
    
    // Determine appKey once at the start - check query param first, then middleware
    const appKey = req.query.appKey || req.appKey || 'SALES';
    const moduleKey = 'people';
    
    // Debug logging
    console.log('[PeopleController] appKey determination:', {
      queryAppKey: req.query.appKey,
      middlewareAppKey: req.appKey,
      finalAppKey: appKey
    });
    
    // Only apply type filter if explicitly requested (not for PLATFORM appKey)
    // This ensures identity-only people (without type) are included
    if (req.query.type && appKey !== 'PLATFORM') {
      query.type = req.query.type;
    }
    if (req.query.email) query.email = req.query.email;
    
    // Handle assignedTo filter (identity-based filter for saved views)
    if (req.query.assignedTo !== undefined) {
      if (req.query.assignedTo === 'null' || req.query.assignedTo === null || req.query.assignedTo === '') {
        // Filter for unassigned (null or missing)
        query.assignedTo = null;
      } else {
        // Filter for specific user
        query.assignedTo = req.query.assignedTo;
      }
    }
    
    // Handle organization filter (identity-based filter for saved views)
    // Note: organization filter can be for specific org, null (without organization), or 'has' (with organization)
    if (req.query.organization !== undefined) {
      if (req.query.organization === 'null' || req.query.organization === null || req.query.organization === '') {
        // Filter for without organization (null or missing)
        query.organization = null;
      } else if (req.query.organization === 'has') {
        // Filter for with organization (non-null, exists)
        query.organization = { $ne: null, $exists: true };
      } else {
        // Filter for specific organization (Sales organization, not tenant)
        query.organization = req.query.organization;
      }
    }
    
    // Search functionality - search across name, email, phone fields
    // Store search condition separately - will be combined after projection filter
    let searchCondition = null;
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      searchCondition = {
        $or: [
          { first_name: searchRegex },
          { last_name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { mobile: searchRegex }
        ]
      };
    }

    // Phase 2A.2: Apply projection filter (read-time filtering only)
    // SAFETY: Projection filtering is read-only.
    // SAFETY: No record ownership or permissions are enforced here.
    // CRITICAL: For PLATFORM appKey, skip projection filtering to show ALL people
    // including those without app participation (identity-only records)
    // Skip projection filtering for PLATFORM appKey to ensure all people are visible
    if (appKey !== 'PLATFORM') {
      const projectionMeta = getProjection(appKey, moduleKey);
      query = applyProjectionFilter({
        appKey,
        moduleKey,
        baseQuery: query,
        projectionMeta
      });
    } else {
      // For PLATFORM appKey, explicitly ensure we're not filtering by type
      // This is a safety check to ensure identity-only records are included
      // Explicitly ensure query doesn't exclude records without type field
      // Remove any existing type filter that might have been added earlier
      if (query.type && typeof query.type === 'object' && query.type.$exists === false) {
        // Type filter is checking for non-existence - this is fine
      } else if (query.type && query.type !== null) {
        // If there's a type filter that's not checking for null/existence, remove it
        // unless it was explicitly requested in query params (which we already handled above)
        // Since we only set query.type above if req.query.type exists, we should be safe
        // But let's be extra safe and ensure no type filter exists for PLATFORM
        if (!req.query.type) {
          // No explicit type filter requested, ensure we don't filter by type
          // The query should already not have type filter at this point, but double-check
          delete query.type;
        }
      }
      console.log('[PeopleController] PLATFORM appKey detected - skipping projection filter to show all people');
    }
    
    // Apply search condition after projection filter
    // If projection filter added $or, combine with $and; otherwise just add search $or
    if (searchCondition) {
      if (query.$or) {
        // Projection filter added $or, combine with $and
        query = {
          ...query,
          $and: [
            { $or: query.$or },
            searchCondition
          ]
        };
        delete query.$or;
      } else {
        // No existing $or, just add search $or
        query.$or = searchCondition.$or;
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Handle sorting - default to newest first (desc) so new records appear on first page
    const sortBy = req.query.sortBy || 'createdAt';
    // If no explicit sortOrder provided, default to descending (newest first)
    // Only use 'asc' if explicitly requested
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const User = require('../models/User');
    
    // CRITICAL: Final safety check for PLATFORM appKey - ensure no type filtering
    if (appKey === 'PLATFORM' && !req.query.type) {
      // Explicitly remove any type filter to ensure all records are included
      if (query.type && typeof query.type !== 'object') {
        // Remove direct type filter (like { type: 'Lead' })
        delete query.type;
        console.log('[PeopleController] Removed type filter for PLATFORM appKey');
      }
      // Also check for type in $or conditions from projection filter (shouldn't exist for PLATFORM, but be safe)
      if (query.$or) {
        // Check if any $or condition filters by type in a way that excludes null/missing
        // This shouldn't happen since we skip projection filter for PLATFORM, but check anyway
        const hasRestrictiveTypeFilter = query.$or.some(condition => 
          condition.type && 
          typeof condition.type === 'object' && 
          condition.type.$in && 
          !condition.type.$in.includes(null) &&
          !condition.type.$exists
        );
        if (hasRestrictiveTypeFilter) {
          console.warn('[PeopleController] Warning: Found restrictive type filter in $or for PLATFORM appKey');
        }
      }
    }
    
    // CRITICAL: Double-check the query before executing
    console.log('[PeopleController] Final query before execution:', {
      appKey: appKey,
      queryAppKey: req.query.appKey,
      middlewareAppKey: req.appKey,
      hasProjectionFilter: appKey !== 'PLATFORM',
      hasSearch: !!searchCondition,
      hasTypeFilter: !!query.type,
      queryString: JSON.stringify(query, null, 2),
      queryKeys: Object.keys(query)
    });
    
    // Execute query with detailed logging
    console.log('[PeopleController] Executing find query:', {
      query: JSON.stringify(query),
      sortOptions: sortOptions,
      limit: limit,
      skip: skip
    });
    
    const data = await People.find(query)
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar username')
      .populate('lead_owner', 'firstName lastName email avatar username')
      .populate('organization', 'name')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip);
    
    const total = await People.countDocuments(query);
    
    // Log types distribution to see if records without type are in results
    const typesInResults = {};
    data.forEach(r => {
      const type = r.type || 'NO_TYPE';
      typesInResults[type] = (typesInResults[type] || 0) + 1;
    });
    
    console.log('[PeopleController] Query results:', {
      returnedCount: data.length,
      page: page,
      limit: limit,
      total: total,
      typesDistribution: typesInResults,
      sampleIds: data.slice(0, 5).map(r => ({ 
        id: r._id, 
        name: `${r.first_name} ${r.last_name}`, 
        type: r.type || 'NO_TYPE',
        createdAt: r.createdAt
      }))
    });
    
    console.log('[PeopleController] Total count:', total);
    
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
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        limit: limit
      },
      meta: { page, limit, total: total },
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
    
    // Validate unlink invariants if organization is being unlinked
    if (updateData.organization === null || updateData.organization === '') {
      const { validateUnlink } = require('../services/systemInvariants');
      const invariantResult = await validateUnlink({
        moduleKey: 'people',
        recordId: req.params.id,
        organizationId: req.user.organizationId,
        updateData: { organization: null }
      });
      
      if (!invariantResult.valid) {
        return res.status(400).json({
          success: false,
          code: invariantResult.code,
          message: invariantResult.message,
          errors: invariantResult.errors
        });
      }
    }
    
    // Validate status write protection (if config exists, block direct status writes)
    const { validateStatusWriteProtection } = require('../services/derivedStatusService');
    const appKey = req.appKey || req.query.appKey || 'SALES';
    const statusWriteProtectionResult = await validateStatusWriteProtection('people', updateData, appKey);
    
    if (statusWriteProtectionResult && !statusWriteProtectionResult.valid) {
      return res.status(400).json({
        success: false,
        code: statusWriteProtectionResult.code,
        message: statusWriteProtectionResult.message,
        errors: statusWriteProtectionResult.errors
      });
    }
    
    // Validate status invariant (fail-closed: block if status !== derivedStatus when config exists)
    const { validateStatusInvariant } = require('../services/systemInvariants');
    const statusInvariantResult = await validateStatusInvariant({
      moduleKey: 'people',
      recordId: req.params.id,
      organizationId: req.user.organizationId,
      updateData,
      appKey
    });
    
    if (!statusInvariantResult.valid) {
      return res.status(400).json({
        success: false,
        code: statusInvariantResult.code,
        message: statusInvariantResult.message,
        errors: statusInvariantResult.errors
      });
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
    
    // Check if lifecycle or type fields changed
    const { hasLifecycleOrTypeChanged, computeAndSetDerivedStatus, hasConfiguration } = require('../services/derivedStatusService');
    const shouldComputeDerivedStatus = hasLifecycleOrTypeChanged('people', null, updateData);
    
    let previous = null;
    if (shouldComputeDerivedStatus) {
      previous = await People.findOne(
        { _id: req.params.id, organizationId: req.user.organizationId }
      ).lean();
    }

    const updated = await People.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Emit domain events for automation (lifecycle/type changes only)
    if (shouldComputeDerivedStatus) {
      const { emitPeopleEvents } = require('../services/domainEventHelpers');
      emitPeopleEvents({
        previous,
        current: updated.toObject ? updated.toObject() : updated,
        appKey,
        triggeredBy: req.user?._id ?? null,
        organizationId: req.user?.organizationId ?? null
      });
    }
    
    // Compute derived status if lifecycle/type fields changed
    if (shouldComputeDerivedStatus) {
      const computedDerivedStatus = await computeAndSetDerivedStatus('people', updated, appKey);
      
      // If config exists and derivedStatus was computed, update status field to match
      const configExists = await hasConfiguration('people', appKey);
      if (configExists && computedDerivedStatus) {
        // Update the appropriate status field based on type
        if (updated.type === 'Lead' && updated.lead_status !== computedDerivedStatus) {
          updated.lead_status = computedDerivedStatus;
        } else if (updated.type === 'Contact' && updated.contact_status !== computedDerivedStatus) {
          updated.contact_status = computedDerivedStatus;
        }
      }
      
      // Save if derivedStatus or status was updated
      if (updated.derivedStatus !== undefined && updated.isModified('derivedStatus')) {
        await updated.save();
      } else if (updated.isModified('lead_status') || updated.isModified('contact_status')) {
        await updated.save();
      }
    }
    
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
    // Validate deletion invariants
    const { validateDelete } = require('../services/systemInvariants');
    const invariantResult = await validateDelete({
      moduleKey: 'people',
      recordId: req.params.id,
      organizationId: req.user.organizationId
    });
    
    if (!invariantResult.valid) {
      return res.status(400).json({
        success: false,
        code: invariantResult.code,
        message: invariantResult.message,
        errors: invariantResult.errors
      });
    }
    
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


