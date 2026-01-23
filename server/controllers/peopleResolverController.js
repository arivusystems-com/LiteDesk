/**
 * ============================================================================
 * People Resolver Controller
 * ============================================================================
 * 
 * API endpoints for People runtime contract resolvers.
 * Exposes resolver utilities to frontend for app context and type resolution.
 * 
 * ============================================================================
 */

const { resolvePeopleAppContext } = require('../utils/peopleAppContextResolver');
const { resolvePeopleTypes } = require('../utils/peopleTypeResolver');
const { resolveQuickCreateContext } = require('../utils/peopleQuickCreateContextResolver');
const { composePersonProfile, CORE_FIELD_KEYS, APP_FIELD_KEYS_BY_APP, hasAppParticipation, getAppDisplayName } = require('../utils/personProfileComposer');
const { getSalesParticipationFields } = require('./peopleController');
const appRegistry = require('../constants/appRegistry');
const People = require('../models/People');
const User = require('../models/User');

/**
 * Resolve app context for People flows
 * POST /api/people/resolve-context
 */
exports.resolveContext = async (req, res) => {
  try {
    const { routeInfo, navigationIntent } = req.body;
    
    // Get enabled apps from organization
    // organizationId is an ObjectId, need to fetch the organization
    const Organization = require('../models/Organization');
    let enabledApps = [];
    
    if (req.user?.organizationId) {
      const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
      if (organization?.enabledApps) {
        // Handle both array of strings and array of objects {appKey, status}
        enabledApps = organization.enabledApps.map(app => {
          return typeof app === 'object' && app.appKey ? app.appKey : app;
        });
      }
    }
    
    // If no enabledApps found, fall back to user's allowedApps
    if (!enabledApps.length && req.user?.allowedApps) {
      enabledApps = Array.isArray(req.user.allowedApps) ? req.user.allowedApps : [];
    }
    
    // Get user app access
    const userAppAccess = req.user?.allowedApps || 
                         req.user?.appAccess?.map(entry => entry.appKey) || 
                         [];
    
    // Resolve app context
    const result = resolvePeopleAppContext({
      routeInfo: routeInfo || {},
      navigationIntent: navigationIntent || null,
      enabledApps: Array.isArray(enabledApps) ? enabledApps : [],
      userAppAccess: Array.isArray(userAppAccess) ? userAppAccess : []
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error resolving People app context:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving app context',
      error: error.message
    });
  }
};

/**
 * Resolve visible People types
 * POST /api/people/resolve-types
 */
exports.resolveTypes = async (req, res) => {
  try {
    // Get enabled apps from organization
    // organizationId is an ObjectId, need to fetch the organization
    const Organization = require('../models/Organization');
    let enabledApps = [];
    
    if (req.user?.organizationId) {
      const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
      if (organization?.enabledApps) {
        // Handle both array of strings and array of objects {appKey, status}
        enabledApps = organization.enabledApps.map(app => {
          return typeof app === 'object' && app.appKey ? app.appKey : app;
        });
      }
    }
    
    // If no enabledApps found, fall back to user's allowedApps
    if (!enabledApps.length && req.user?.allowedApps) {
      enabledApps = Array.isArray(req.user.allowedApps) ? req.user.allowedApps : [];
    }
    
    // Build user permissions snapshot
    // Check if user has people.view permission in each app
    const userPermissions = {};
    const normalizedEnabledApps = Array.isArray(enabledApps) 
      ? enabledApps.map(k => k.toUpperCase()) 
      : [];
    
    // For each enabled app, check if user has people.view permission
    for (const appKey of normalizedEnabledApps) {
      const canViewPeople = req.user?.isOwner || 
                           req.user?.permissions?.people?.view ||
                           req.user?.permissions?.contacts?.view ||
                           false;
      
      userPermissions[appKey] = {
        canViewPeople: canViewPeople
      };
    }
    
    // If user is owner and no enabledApps, allow all apps from registry
    // This is a fallback for organizations that haven't set enabledApps yet
    if (req.user?.isOwner && normalizedEnabledApps.length === 0) {
      const allAppKeys = Object.keys(appRegistry);
      for (const appKey of allAppKeys) {
        userPermissions[appKey.toUpperCase()] = {
          canViewPeople: true
        };
      }
    }
    
    // Resolve types
    const result = resolvePeopleTypes({
      enabledApps: normalizedEnabledApps.length > 0 ? normalizedEnabledApps : Object.keys(appRegistry).map(k => k.toUpperCase()),
      appRegistry: appRegistry,
      userPermissions: userPermissions
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error resolving People types:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving types',
      error: error.message
    });
  }
};

/**
 * Resolve Quick Create context
 * POST /api/people/resolve-quick-create
 */
exports.resolveQuickCreate = async (req, res) => {
  try {
    const { selectedType, owningApps, resolvedAppContext } = req.body;

    // Get enabled apps from organization
    const enabledApps = req.user?.organizationId?.enabledApps || 
                       req.user?.organization?.enabledApps || 
                       [];
    
    // Get user app access
    const userAppAccess = req.user?.allowedApps || 
                         req.user?.appAccess?.map(entry => entry.appKey) || 
                         [];

    // If resolvedAppContext is not provided, resolve it first
    let appContext = resolvedAppContext;
    if (!appContext) {
      const routeInfo = req.body.routeInfo || {};
      const navigationIntent = req.body.navigationIntent || null;
      
      appContext = resolvePeopleAppContext({
        routeInfo,
        navigationIntent,
        enabledApps: Array.isArray(enabledApps) ? enabledApps : [],
        userAppAccess: Array.isArray(userAppAccess) ? userAppAccess : []
      });
    }

    // Resolve quick create context
    const result = resolveQuickCreateContext({
      selectedType: selectedType || null,
      owningApps: owningApps || [],
      resolvedAppContext: appContext
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error resolving Quick Create context:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving Quick Create context',
      error: error.message
    });
  }
};

/**
 * Compose Person profile with structured sections
 * GET /api/people/:id/profile
 */
exports.composeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get person record
    const person = await People.findOne({ 
      _id: id, 
      organizationId: req.user.organizationId 
    })
    .populate('organization', 'name')
    .populate('assignedTo', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email');
    
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found'
      });
    }
    
    // Get enabled apps from organization
    // organizationId is an ObjectId, need to fetch the organization
    const Organization = require('../models/Organization');
    let enabledApps = [];
    
    if (req.user?.organizationId) {
      const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
      if (organization?.enabledApps) {
        // Handle both array of strings and array of objects {appKey, status}
        enabledApps = organization.enabledApps.map(app => {
          return typeof app === 'object' && app.appKey ? app.appKey : app;
        });
      }
    }
    
    // If no enabledApps found, fall back to user's allowedApps
    if (!enabledApps.length && req.user?.allowedApps) {
      enabledApps = Array.isArray(req.user.allowedApps) ? req.user.allowedApps : [];
    }
    
    // Build route info from request
    // Use originalUrl to get full path, or fall back to path + query params
    const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const routePath = req.query.routePath || fullPath;
    
    // Build query object - include appKey if provided explicitly
    const query = { ...req.query };
    if (req.query.appKey) {
      query.appKey = req.query.appKey;
    }
    
    const routeInfo = {
      path: routePath,
      name: req.query.routeName || null,
      params: { id: id },
      query: query,
      meta: {}
    };
    
    // Resolve app context
    const userAppAccess = req.user?.allowedApps || 
                         req.user?.appAccess?.map(entry => entry.appKey) || 
                         [];
    
    // Build navigationIntent from appKey query param if available
    // If no appKey in query, check person's actual participation as fallback
    let navigationIntent = null;
    if (req.query.appKey) {
      navigationIntent = {
        sourceAppKey: req.query.appKey
      };
    } else {
      // Check person's actual participation - prioritize apps where they actually participate
      // This ensures we show the correct app context even when no query param is provided
      
      // Direct check for SALES participation via type field (most reliable)
      // SALES participation is indicated by type being 'Lead' or 'Contact'
      const personType = person?.type;
      const hasSalesParticipation = personType === 'Lead' || personType === 'Contact';
      
      console.log('[People Profile] Person participation check:', {
        personId: id,
        personType: personType,
        hasSalesParticipation,
        personRaw: {
          type: person?.type,
          lead_status: person?.lead_status,
          contact_status: person?.contact_status
        },
        enabledApps: enabledApps,
        userAppAccess: userAppAccess
      });
      
      if (hasSalesParticipation) {
        navigationIntent = {
          sourceAppKey: 'SALES'
        };
        console.log('[People Profile] Setting navigationIntent to SALES based on type field:', personType);
      }
    }
    
    const appContextResult = resolvePeopleAppContext({
      routeInfo,
      navigationIntent: navigationIntent,
      enabledApps: Array.isArray(enabledApps) ? enabledApps : [],
      userAppAccess: Array.isArray(userAppAccess) ? userAppAccess : []
    });
    
    // Override: If person participates in SALES (has type field), always use SALES
    // This ensures we show the correct app context regardless of resolver ambiguity
    const personType = person?.type;
    const hasSalesType = personType === 'Lead' || personType === 'Contact';
    
    if (hasSalesType) {
      const normalizedEnabledApps = enabledApps.map(k => 
        typeof k === 'string' ? k.toUpperCase() : (k?.appKey || k).toUpperCase()
      );
      if (normalizedEnabledApps.includes('SALES')) {
        appContextResult.appKey = 'SALES';
        appContextResult.confidence = 'HIGH';
        appContextResult.reason = `Person participates in SALES app (type: ${personType}) - using SALES context`;
        console.log('[People Profile] Overriding app context to SALES based on type field:', personType);
      } else {
        console.log('[People Profile] Person has SALES type but SALES is not enabled. Enabled apps:', normalizedEnabledApps);
      }
    }
    
    console.log('[People Profile] App context resolution result:', {
      appKey: appContextResult.appKey,
      confidence: appContextResult.confidence,
      reason: appContextResult.reason,
      candidates: appContextResult.candidates,
      signals: appContextResult.signals,
      navigationIntent: navigationIntent
    });
    
    // Build permissions snapshot
    const permissions = {
      core: {
        canView: req.user?.isOwner || 
                req.user?.permissions?.people?.view ||
                req.user?.permissions?.contacts?.view ||
                false,
        canEdit: req.user?.isOwner || 
                req.user?.permissions?.people?.edit ||
                req.user?.permissions?.contacts?.edit ||
                false
      },
      apps: {}
    };
    
    // Build app permissions
    const normalizedEnabledApps = Array.isArray(enabledApps) 
      ? enabledApps.map(k => k.toUpperCase()) 
      : [];
    
    for (const appKey of normalizedEnabledApps) {
      permissions.apps[appKey] = {
        canView: req.user?.isOwner || 
                req.user?.permissions?.people?.view ||
                req.user?.permissions?.contacts?.view ||
                false,
        canEdit: req.user?.isOwner || 
                req.user?.permissions?.people?.edit ||
                req.user?.permissions?.contacts?.edit ||
                false
      };
    }
    
    // Compose profile
    const profile = composePersonProfile({
      person,
      resolvedAppContext: appContextResult,
      enabledApps: normalizedEnabledApps,
      permissions
    });
    
    res.json({
      success: true,
      data: {
        profile,
        appContext: appContextResult
      }
    });
  } catch (error) {
    console.error('Error composing Person profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error composing profile',
      error: error.message
    });
  }
};

/**
 * Create or attach a Person with app context
 * POST /api/people/create
 * 
 * This endpoint:
 * - Creates a new Person if no duplicate exists (by email)
 * - Attaches app context to existing Person if duplicate found
 * - Only initializes fields for the selected app context
 * - Never merges app configurations
 * - Handles validation errors
 */
exports.createOrAttach = async (req, res) => {
  try {
    const { 
      appKey,           // Final resolved app key (required)
      selectedType,     // Selected People type (e.g., 'LEAD', 'CONTACT')
      formData          // Form data with core + app-specific fields
    } = req.body;

    // Validate required inputs
    if (!appKey || typeof appKey !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'appKey is required',
        code: 'MISSING_APP_KEY'
      });
    }

    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'formData is required',
        code: 'MISSING_FORM_DATA'
      });
    }

    const normalizedAppKey = appKey.trim().toUpperCase();
    // Normalize type - only set if explicitly provided and not empty
    const normalizedType = selectedType && selectedType.trim() 
      ? selectedType.trim().toUpperCase() 
      : null;
    
    // Debug: Log what we received
    console.log('[createOrAttach] 📥 Request received:', {
      appKey: normalizedAppKey,
      selectedType: selectedType,
      normalizedType: normalizedType,
      formDataKeys: Object.keys(formData || {})
    });

    // Get enabled apps from organization
    // Need to fetch organization to get enabledApps (req.user.organization may not be populated)
    const Organization = require('../models/Organization');
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND'
      });
    }

    // Use the utility function to check if app is enabled (handles both object and string formats)
    const { isAppEnabledForOrg } = require('../utils/appAccessUtils');
    if (!isAppEnabledForOrg(organization, normalizedAppKey)) {
      return res.status(403).json({
        success: false,
        message: `App ${normalizedAppKey} is not enabled for this organization`,
        code: 'APP_NOT_ENABLED'
      });
    }

    // Separate core fields from app-specific fields
    const coreFields = {};
    const appFields = {};

    // ObjectId fields that should not accept empty strings
    const objectIdFields = ['organization', 'organizationId', 'createdBy', 'assignedTo'];

    // Extract core fields
    CORE_FIELD_KEYS.forEach(key => {
      if (formData.hasOwnProperty(key)) {
        const value = formData[key];
        // Filter out empty strings for ObjectId fields to prevent BSON casting errors
        if (objectIdFields.includes(key)) {
          // Only include if value is not empty string, null, or undefined
          if (value !== null && value !== undefined && value !== '') {
            coreFields[key] = value;
          }
        } else {
          // For non-ObjectId fields, include all values (including empty strings for text fields)
          coreFields[key] = value;
        }
      }
    });

    // Extract app-specific fields for the selected app
    // ⚠️ IMPORTANT: These will only be used when ATTACHING to existing person
    // For NEW person creation, we create identity-only (no participation fields)
    const appFieldKeys = APP_FIELD_KEYS_BY_APP[normalizedAppKey] || [];
    
    // GUARDRAIL: Only extract app fields that have non-empty values
    // Empty strings, null, undefined are ignored to prevent accidental participation
    appFieldKeys.forEach(key => {
      if (formData.hasOwnProperty(key)) {
        const value = formData[key];
        // Only include non-empty values (empty strings, null, undefined are ignored)
        if (value !== null && value !== undefined && value !== '') {
          appFields[key] = value;
        }
      }
    });

    // Set type if provided and it's an app field
    // ⚠️ IMPORTANT: This will only be used when ATTACHING to existing person
    // For NEW person creation, we create identity-only (no type field)
    // CRITICAL: Only set type if normalizedType is explicitly provided (not null/empty)
    if (normalizedType && appFieldKeys.includes('type')) {
      // Map type key to model value (LEAD -> Lead, CONTACT -> Contact)
      const typeValue = normalizedType === 'LEAD' ? 'Lead' : 
                        normalizedType === 'CONTACT' ? 'Contact' : 
                        normalizedType;
      appFields.type = typeValue;
    }
    
    // Debug: Log extracted fields
    console.log('[createOrAttach] 📋 Extracted fields:', {
      coreFieldsKeys: Object.keys(coreFields),
      appFieldsKeys: Object.keys(appFields),
      appFields: appFields,
      normalizedType: normalizedType,
      hasTypeInAppFields: 'type' in appFields
    });

    // Check for duplicate by email (identity rule)
    let existingPerson = null;
    if (coreFields.email) {
      existingPerson = await People.findOne({
        organizationId: req.user.organizationId,
        email: coreFields.email.toLowerCase().trim()
      });
    }

    // Get user name for activity log
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? 
      (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' 
      : 'System';

    let result;
    let wasAttached = false;

    if (existingPerson) {
      // Enforce uniqueness: Check if person already has participation in this app
      if (hasAppParticipation(existingPerson, normalizedAppKey)) {
        const appName = getAppDisplayName(normalizedAppKey);
        // Get current participation type for better error message
        let currentType = null;
        if (normalizedAppKey === 'SALES' && existingPerson.type) {
          currentType = existingPerson.type;
        }
        
        const errorMessage = currentType 
          ? `Person already participates in ${appName} as ${currentType}. Use conversion instead.`
          : `Person already participates in ${appName}. Use conversion instead.`;
        
        return res.status(400).json({
          success: false,
          message: errorMessage,
          code: 'PARTICIPATION_EXISTS'
        });
      }
      
      // Attach app context to existing person
      // Only update app-specific fields if they don't already exist
      const updateData = {};
      
      // Only set app fields that are not already set
      Object.entries(appFields).forEach(([key, value]) => {
        if (existingPerson[key] === undefined || existingPerson[key] === null || existingPerson[key] === '') {
          updateData[key] = value;
        }
      });

      // Update core fields if provided (but don't overwrite existing non-empty values)
      Object.entries(coreFields).forEach(([key, value]) => {
        // Skip system fields
        if (['organizationId', 'createdBy', 'assignedTo'].includes(key)) {
          return;
        }
        // Filter out empty strings for ObjectId fields to prevent BSON casting errors
        if (objectIdFields.includes(key) && (value === '' || value === null || value === undefined)) {
          return;
        }
        // Only update if current value is empty/null
        if (!existingPerson[key] || existingPerson[key] === '') {
          updateData[key] = value;
        }
      });

      if (Object.keys(updateData).length > 0) {
        // Add activity log for app context attachment
        updateData.$push = {
          activityLogs: {
            user: userName,
            userId: req.user._id,
            action: `app_context_attached`,
            details: { 
              appKey: normalizedAppKey,
              type: 'attach',
              attachedFields: Object.keys(updateData)
            },
            timestamp: new Date()
          }
        };

        result = await People.findOneAndUpdate(
          { _id: existingPerson._id, organizationId: req.user.organizationId },
          { $set: updateData },
          { new: true, runValidators: true }
        );
      } else {
        result = existingPerson;
      }

      wasAttached = true;
    } else {
      // Create new person - IDENTITY ONLY (no participation fields)
      // ⚠️ IMPORTANT: Person creation is identity-only and app-agnostic.
      //    Participation fields (type, lead_status, etc.) are NOT set here.
      //    They will be set via Attach-to-App flow after creation.
      
      // GUARDRAIL: Explicitly exclude any participation fields that might have leaked into coreFields
      // This is a defensive measure to ensure identity-only creation
      const participationFields = getSalesParticipationFields();
      const sanitizedCoreFields = { ...coreFields };
      participationFields.forEach(field => {
        if (sanitizedCoreFields.hasOwnProperty(field)) {
          console.warn(`[createOrAttach] ⚠️ Participation field "${field}" detected in coreFields and stripped`);
          delete sanitizedCoreFields[field];
        }
      });
      
      const newPersonData = {
        ...sanitizedCoreFields,
        // Do NOT include appFields here - identity-only creation
        // appFields will be set via Attach-to-App after creation
        organizationId: req.user.organizationId,
        createdBy: req.user._id,
        assignedTo: req.user._id, // Default to creator
        activityLogs: [{
          user: userName,
          userId: req.user._id,
          action: 'created this record',
          details: { 
            type: 'create',
            appKey: normalizedAppKey,
            peopleType: normalizedType // Store in activity log, not in person record
          },
          timestamp: new Date()
        }]
      };

      result = await People.create(newPersonData);
      
      // Debug: Log what was created
      console.log('[createOrAttach] ✅ Created identity-only person:', {
        personId: result._id,
        hasType: !!result.type,
        type: result.type,
        appFieldsKeys: Object.keys(appFields),
        normalizedType: normalizedType
      });
      
      // After creating identity-only person, attach app participation if type was provided
      // This makes Quick Create work: create identity + attach in one operation
      // ⚠️ IMPORTANT: Only attach if normalizedType is explicitly provided
      //    If no type selected, create identity-only (can attach later via Attach-to-App)
      if (normalizedType) {
        // Attach app participation to the newly created person
        const attachUpdateData = {};
        
        // Set app-specific fields (including type)
        Object.entries(appFields).forEach(([key, value]) => {
          attachUpdateData[key] = value;
        });
        
        // Ensure type is set if normalizedType was provided
        if (appFieldKeys.includes('type') && normalizedType) {
          const typeValue = normalizedType === 'LEAD' ? 'Lead' : 
                            normalizedType === 'CONTACT' ? 'Contact' : 
                            normalizedType;
          attachUpdateData.type = typeValue;
        }
        
        // Update the person with app fields
        if (Object.keys(attachUpdateData).length > 0) {
          console.log('[createOrAttach] 🔗 Attaching participation fields:', Object.keys(attachUpdateData));
          result = await People.findOneAndUpdate(
            { _id: result._id, organizationId: req.user.organizationId },
            { $set: attachUpdateData },
            { new: true, runValidators: true }
          );
          
          wasAttached = true; // Mark as attached since we set participation fields
          
          // Debug: Verify attachment
          console.log('[createOrAttach] ✅ Attached participation:', {
            personId: result._id,
            type: result.type,
            hasAppParticipation: hasAppParticipation(result, normalizedAppKey)
          });
        }
      } else {
        // Debug: No type provided, person should have no participation
        console.log('[createOrAttach] ℹ️ No type provided, person created identity-only:', {
          personId: result._id,
          hasType: !!result.type,
          hasAppParticipation: hasAppParticipation(result, normalizedAppKey)
        });
      }
    }

    // Populate references
    const populated = await People.findById(result._id)
      .populate('organization', 'name')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(wasAttached ? 200 : 201).json({
      success: true,
      data: populated,
      meta: {
        wasAttached,
        appKey: normalizedAppKey,
        peopleType: normalizedType
      }
    });
  } catch (error) {
    console.error('Error creating/attaching Person:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed. Please check the fields below.',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating/attaching Person',
      error: error.message
    });
  }
};

/**
 * Attach app participation to an existing Person
 * POST /api/people/:id/attach
 * 
 * Explicitly adds app participation to an existing person without creating duplicates.
 * Only app-specific fields are set, core fields remain unchanged.
 */
exports.attachAppParticipation = async (req, res) => {
  try {
    const personId = req.params.id;
    const { appKey, participationType, formData } = req.body;

    // Validate required fields
    if (!appKey) {
      return res.status(400).json({
        success: false,
        message: 'appKey is required',
        code: 'MISSING_APP_KEY'
      });
    }

    if (!participationType) {
      return res.status(400).json({
        success: false,
        message: 'participationType is required',
        code: 'MISSING_PARTICIPATION_TYPE'
      });
    }

    const normalizedAppKey = appKey.trim().toUpperCase();
    const normalizedType = participationType.trim().toUpperCase();

    // Verify app is enabled for organization
    const Organization = require('../models/Organization');
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND'
      });
    }

    const { isAppEnabledForOrg } = require('../utils/appAccessUtils');
    if (!isAppEnabledForOrg(organization, normalizedAppKey)) {
      return res.status(403).json({
        success: false,
        message: `App ${normalizedAppKey} is not enabled for this organization`,
        code: 'APP_NOT_ENABLED'
      });
    }

    // Find the person
    const person = await People.findOne({
      _id: personId,
      organizationId: req.user.organizationId
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found',
        code: 'PERSON_NOT_FOUND'
      });
    }

    // Extract app-specific fields (needed for both participation check and field extraction)
    const { APP_FIELD_KEYS_BY_APP } = require('../utils/personProfileComposer');
    const appFieldKeys = APP_FIELD_KEYS_BY_APP[normalizedAppKey] || [];
    
    // Enforce uniqueness: Check if person already has participation in this app
    // Debug: Log person's current state
    const personAppFields = {};
    appFieldKeys.forEach(key => {
      if (person[key] !== undefined && person[key] !== null && person[key] !== '') {
        personAppFields[key] = person[key];
      }
    });
    
    console.log('[attachAppParticipation] 🔍 Checking participation:', {
      personId: personId,
      appKey: normalizedAppKey,
      hasAppParticipation: hasAppParticipation(person, normalizedAppKey),
      personAppFields: personAppFields,
      type: person.type,
      lead_status: person.lead_status,
      contact_status: person.contact_status
    });
    
    if (hasAppParticipation(person, normalizedAppKey)) {
      const appName = getAppDisplayName(normalizedAppKey);
      // Get current participation type for better error message
      let currentType = null;
      if (normalizedAppKey === 'SALES' && person.type) {
        currentType = person.type;
      }
      
      const errorMessage = currentType 
        ? `Person already participates in ${appName} as ${currentType}. Use conversion instead.`
        : `Person already participates in ${appName}. Use conversion instead.`;
      
      console.log('[attachAppParticipation] ❌ Participation exists:', {
        errorMessage,
        personAppFields
      });
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        code: 'PARTICIPATION_EXISTS'
      });
    }

    // Extract app-specific fields from formData
    const appFields = {};

    // Extract app-specific fields from formData if provided
    if (formData && typeof formData === 'object') {
      appFieldKeys.forEach(key => {
        if (formData.hasOwnProperty(key) && formData[key] !== null && formData[key] !== '') {
          appFields[key] = formData[key];
        }
      });
    }

    // Set type if it's an app field
    if (normalizedType && appFieldKeys.includes('type')) {
      const typeValue = normalizedType === 'LEAD' ? 'Lead' : 
                        normalizedType === 'CONTACT' ? 'Contact' : 
                        normalizedType;
      appFields.type = typeValue;
    }

    // Clean enum fields: convert empty strings to null
    const enumFields = ['lead_status', 'contact_status', 'role', 'source'];
    enumFields.forEach(field => {
      if (appFields[field] === '') {
        appFields[field] = null;
      }
    });

    // Prepare update data - only set fields that don't already exist
    const fieldsToSet = {};
    Object.entries(appFields).forEach(([key, value]) => {
      if (person[key] === undefined || person[key] === null || person[key] === '') {
        fieldsToSet[key] = value;
      }
    });

    // Get user name for activity log
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? 
      (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' 
      : 'System';

    // Build update object with $set and $push at the same level
    const updateObject = {
      $set: fieldsToSet,
      $push: {
        activityLogs: {
          user: userName,
          userId: req.user._id,
          action: `added_to_${normalizedAppKey.toLowerCase()}_as_${normalizedType.toLowerCase()}`,
          details: { 
            appKey: normalizedAppKey,
            participationType: normalizedType,
            attachedFields: Object.keys(fieldsToSet)
          },
          appContext: normalizedAppKey,
          timestamp: new Date()
        }
      }
    };

    // Update person with app-specific fields
    const updatedPerson = await People.findOneAndUpdate(
      { _id: personId, organizationId: req.user.organizationId },
      updateObject,
      { new: true, runValidators: true }
    );

    // Populate references
    const populated = await People.findById(updatedPerson._id)
      .populate('organization', 'name')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: populated,
      message: `Successfully added ${normalizedAppKey} participation`,
      meta: {
        appKey: normalizedAppKey,
        participationType: normalizedType
      }
    });
  } catch (error) {
    console.error('Error attaching app participation:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed. Please check the fields below.',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error attaching app participation',
      error: error.message
    });
  }
};

/**
 * Update core Person fields only
 * PUT /api/people/:id/update-core
 * 
 * Updates only core (shared) Person fields, not app-specific fields.
 * This endpoint does not require Sales app access since core fields
 * are platform-level and shared across all apps.
 */
exports.updateCore = async (req, res) => {
  try {
    const personId = req.params.id;
    const { formData } = req.body;

    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Form data is required.'
      });
    }

    // Import CORE_FIELD_KEYS to filter allowed fields
    const { CORE_FIELD_KEYS } = require('../utils/personProfileComposer');

    // Find the person
    const person = await People.findOne({
      _id: personId,
      organizationId: req.user.organizationId
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found.'
      });
    }

    // Filter to only core fields (exclude system/audit fields that shouldn't be updated)
    const updatableCoreFields = CORE_FIELD_KEYS.filter(key => 
      !['organizationId', 'createdBy', 'assignedTo', 'legacyContactId', 'notes', 'activityLogs', 'createdAt', 'updatedAt'].includes(key)
    );

    // Build update object with only allowed core fields
    const updateData = {};
    let hasUpdates = false;

    for (const key of updatableCoreFields) {
      if (formData.hasOwnProperty(key)) {
        // Allow null/empty values for optional fields
        updateData[key] = formData[key];
        hasUpdates = true;
      }
    }

    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        message: 'No valid core fields to update.'
      });
    }

    // Validate required fields if they're being updated
    const finalFirstName = updateData.first_name !== undefined ? updateData.first_name : person.first_name;
    const finalLastName = updateData.last_name !== undefined ? updateData.last_name : person.last_name;
    const finalEmail = updateData.email !== undefined ? updateData.email : person.email;
    
    if (!finalFirstName && !finalLastName && !finalEmail) {
      return res.status(400).json({
        success: false,
        message: 'At least one of First Name, Last Name, or Email is required.'
      });
    }

    // Update the person record
    const updatedPerson = await People.findOneAndUpdate(
      { _id: personId, organizationId: req.user.organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPerson) {
      return res.status(404).json({
        success: false,
        message: 'Person not found after update.'
      });
    }

    // Add activity log entry with app context
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' : 'System';

    // Resolve app context for activity log
    const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const routePath = req.query.routePath || fullPath;
    const routeInfo = {
      path: routePath,
      name: req.query.routeName || null,
      params: { id: id },
      query: req.query,
      meta: {}
    };
    
    // Get enabled apps
    const Organization = require('../models/Organization');
    let enabledApps = [];
    if (req.user?.organizationId) {
      const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
      if (organization?.enabledApps) {
        enabledApps = organization.enabledApps.map(app => {
          return typeof app === 'object' && app.appKey ? app.appKey : app;
        });
      }
    }
    if (!enabledApps.length && req.user?.allowedApps) {
      enabledApps = Array.isArray(req.user.allowedApps) ? req.user.allowedApps : [];
    }
    
    const userAppAccess = req.user?.allowedApps || [];
    const appContextResult = resolvePeopleAppContext({
      routeInfo,
      navigationIntent: req.query.appKey ? { sourceAppKey: req.query.appKey } : null,
      enabledApps: enabledApps,
      userAppAccess: userAppAccess
    });

    updatedPerson.activityLogs.push({
      user: userName,
      userId: req.user._id,
      action: 'updated core information',
      details: { updatedFields: Object.keys(updateData) },
      appContext: appContextResult.appKey, // Include app context
      timestamp: new Date()
    });

    await updatedPerson.save({ runValidators: true });

    res.json({
      success: true,
      message: 'Core information updated successfully.',
      data: updatedPerson
    });
  } catch (error) {
    console.error('Error updating core Person fields:', error);
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
      message: 'Error updating core information',
      error: error.message
    });
  }
};

/**
 * Update app-specific Person fields only
 * PUT /api/people/:id/update-app-fields
 * 
 * Updates only app-specific fields for a given app context.
 * This endpoint requires the app to be enabled and user to have edit permissions.
 */
exports.updateAppFields = async (req, res) => {
  try {
    const personId = req.params.id;
    const { appKey, formData } = req.body;

    if (!appKey || !formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'App key and form data are required.'
      });
    }

    // Normalize app key
    const normalizedAppKey = appKey.toUpperCase();

    // Import APP_FIELD_KEYS_BY_APP to filter allowed fields
    const { APP_FIELD_KEYS_BY_APP } = require('../utils/personProfileComposer');

    // Get allowed fields for this app
    const allowedFields = APP_FIELD_KEYS_BY_APP[normalizedAppKey];
    if (!allowedFields || !Array.isArray(allowedFields) || allowedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No app-specific fields defined for app: ${normalizedAppKey}`
      });
    }

    // Find the person
    const person = await People.findOne({
      _id: personId,
      organizationId: req.user.organizationId
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found.'
      });
    }

    // Verify app is enabled for organization
    const Organization = require('../models/Organization');
    const organization = await Organization.findById(req.user.organizationId).select('enabledApps').lean();
    if (!organization?.enabledApps) {
      return res.status(403).json({
        success: false,
        message: 'Organization apps not configured.'
      });
    }

    const enabledApps = organization.enabledApps.map(app => {
      return typeof app === 'object' && app.appKey ? app.appKey.toUpperCase() : app.toUpperCase();
    });

    if (!enabledApps.includes(normalizedAppKey)) {
      return res.status(403).json({
        success: false,
        message: `App ${normalizedAppKey} is not enabled for this organization.`
      });
    }

    // Build update object with only allowed app-specific fields
    const updateData = {};
    let hasUpdates = false;

    for (const key of allowedFields) {
      if (formData.hasOwnProperty(key)) {
        // Special handling for type field: map uppercase values to enum values
        if (key === 'type') {
          const typeValue = formData[key];
          if (typeof typeValue === 'string') {
            const normalizedType = typeValue.trim().toUpperCase();
            // Map type key to model value (LEAD -> Lead, CONTACT -> Contact)
            updateData[key] = normalizedType === 'LEAD' ? 'Lead' : 
                              normalizedType === 'CONTACT' ? 'Contact' : 
                              typeValue; // Fallback to original if not recognized
          } else {
            updateData[key] = typeValue;
          }
        } else {
          // Allow null/empty values for optional fields
          updateData[key] = formData[key];
        }
        hasUpdates = true;
      }
    }

    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        message: 'No valid app-specific fields to update.'
      });
    }

    // Update the person record
    const updatedPerson = await People.findOneAndUpdate(
      { _id: personId, organizationId: req.user.organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPerson) {
      return res.status(404).json({
        success: false,
        message: 'Person not found after update.'
      });
    }

    // Add activity log entry with app context
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' : 'System';

    updatedPerson.activityLogs.push({
      user: userName,
      userId: req.user._id,
      action: `updated ${normalizedAppKey} app-specific fields`,
      details: { appKey: normalizedAppKey, updatedFields: Object.keys(updateData) },
      appContext: normalizedAppKey, // Include app context (already normalized)
      timestamp: new Date()
    });

    await updatedPerson.save({ runValidators: true });

    res.json({
      success: true,
      message: `${normalizedAppKey} app fields updated successfully.`,
      data: updatedPerson
    });
  } catch (error) {
    console.error('Error updating app-specific Person fields:', error);
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
      message: 'Error updating app-specific fields',
      error: error.message
    });
  }
};

/**
 * Convert Sales Lead to Sales Contact
 * POST /api/people/:id/convert-lead-to-contact
 * 
 * Converts an existing Sales Lead participation to Sales Contact.
 * This is a same-app lifecycle change, not an attach operation.
 */
exports.convertLeadToContact = async (req, res) => {
  try {
    const personId = req.params.id;

    // Find the person
    const person = await People.findOne({
      _id: personId,
      organizationId: req.user.organizationId
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found',
        code: 'PERSON_NOT_FOUND'
      });
    }

    // Validate: Person must have Sales participation as Lead
    if (!person.type || person.type !== 'Lead') {
      return res.status(400).json({
        success: false,
        message: 'Person is not a Sales Lead. Conversion is only available for Leads.',
        code: 'INVALID_CONVERSION'
      });
    }

    // Verify Sales app is enabled for organization
    const Organization = require('../models/Organization');
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND'
      });
    }

    const { isAppEnabledForOrg } = require('../utils/appAccessUtils');
    if (!isAppEnabledForOrg(organization, 'SALES')) {
      return res.status(403).json({
        success: false,
        message: 'Sales app is not enabled for this organization',
        code: 'APP_NOT_ENABLED'
      });
    }

    // Get user name for activity log
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? 
      (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' 
      : 'System';

    // Get formData from request body (if provided)
    const { formData } = req.body || {};
    
    // Convert Lead to Contact
    // Update type field and clear Lead-specific fields
    const updateData = {
      type: 'Contact',
      // Clear Lead-specific fields
      lead_status: null,
      lead_owner: null,
      lead_score: null,
      interest_products: [],
      qualification_date: null,
      qualification_notes: null,
      estimated_value: null
    };
    
    // Apply Contact-specific fields from formData if provided
    if (formData && typeof formData === 'object') {
      // Only include Contact-specific fields (exclude Lead fields)
      const contactFields = ['contact_status', 'role', 'birthday', 'preferred_contact_method'];
      contactFields.forEach(field => {
        if (formData.hasOwnProperty(field)) {
          const value = formData[field];
          // Only set non-empty values
          if (value !== null && value !== undefined && value !== '') {
            updateData[field] = value;
          }
        }
      });
    }
    
    // Set default Contact status if not provided in formData and not already set
    if (!updateData.contact_status && !person.contact_status) {
      updateData.contact_status = 'Active';
    }

    // Build activity log entry
    const activityLogEntry = {
      user: userName,
      userId: req.user._id,
      action: 'converted_sales_lead_to_contact',
      details: { 
        appKey: 'SALES',
        from: 'Lead',
        to: 'Contact',
        convertedAt: new Date()
      },
      appContext: 'SALES',
      timestamp: new Date()
    };

    // Use findOneAndUpdate with $set and $push to ensure both updates happen atomically
    const updatedPerson = await People.findOneAndUpdate(
      { _id: personId, organizationId: req.user.organizationId },
      {
        $set: updateData,
        $push: {
          activityLogs: activityLogEntry
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedPerson) {
      return res.status(404).json({
        success: false,
        message: 'Person not found after conversion',
        code: 'PERSON_NOT_FOUND'
      });
    }

    // Verify activity log was saved
    const verifyPerson = await People.findById(personId).select('activityLogs').lean();
    if (verifyPerson && verifyPerson.activityLogs) {
      const lastLog = verifyPerson.activityLogs[verifyPerson.activityLogs.length - 1];
      console.log('[Convert Lead to Contact] Activity log verification:', {
        totalLogs: verifyPerson.activityLogs.length,
        lastLogAction: lastLog?.action,
        lastLogAppContext: lastLog?.appContext,
        lastLogUser: lastLog?.user,
        lastLogTimestamp: lastLog?.timestamp
      });
    } else {
      console.error('[Convert Lead to Contact] Activity log was not saved! Person ID:', personId);
    }

    // Populate references
    const populated = await People.findById(updatedPerson._id)
      .populate('organization', 'name')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: populated,
      message: 'Successfully converted Sales Lead to Contact',
      meta: {
        appKey: 'SALES',
        from: 'Lead',
        to: 'Contact'
      }
    });
  } catch (error) {
    console.error('Error converting Lead to Contact:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed. Please check the fields below.',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error converting Lead to Contact',
      error: error.message
    });
  }
};

/**
 * Check for active child records that would block detachment
 * 
 * @param {string} personId - Person ID
 * @param {string} appKey - App key (e.g., 'SALES', 'MARKETING')
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} - Array of active child records found
 */
async function checkActiveChildRecords(personId, appKey, organizationId) {
  const activeRecords = [];
  
  try {
    // SALES app: Check for active deals
    if (appKey === 'SALES') {
      const Deal = require('../models/Deal');
      // Active deals are those not closed (not 'Won' or 'Lost' or 'Closed Won' or 'Closed Lost')
      const activeDeals = await Deal.find({
        contactId: personId,
        organizationId: organizationId,
        status: { $nin: ['Won', 'Lost', 'Closed Won', 'Closed Lost'] }
      }).select('_id name status stage').limit(10).lean();
      
      if (activeDeals.length > 0) {
        activeRecords.push({
          type: 'Deal',
          count: activeDeals.length,
          records: activeDeals.map(d => ({ id: d._id, name: d.name, status: d.status }))
        });
      }
    }
    
    // MARKETING app: Check for active campaigns/activities (if applicable)
    // Future: Add marketing-specific child record checks here
    // Example:
    // if (appKey === 'MARKETING') {
    //   const Campaign = require('../models/Campaign');
    //   const activeCampaigns = await Campaign.find({
    //     contactId: personId,
    //     organizationId: organizationId,
    //     status: 'Active'
    //   }).select('_id name').limit(10).lean();
    //   if (activeCampaigns.length > 0) {
    //     activeRecords.push({
    //       type: 'Campaign',
    //       count: activeCampaigns.length,
    //       records: activeCampaigns
    //     });
    //   }
    // }
    
    // HELPDESK app: Check for open tickets (if applicable)
    // Future: Add helpdesk-specific child record checks here
    
    // PROJECTS app: Check for active project assignments (if applicable)
    // Future: Add projects-specific child record checks here
    
  } catch (error) {
    console.error('[checkActiveChildRecords] Error checking child records:', error);
    // Don't block detachment if check fails - log and continue
    // This is a guardrail, not a hard requirement
  }
  
  return activeRecords;
}

/**
 * Detach Person from App
 * POST /api/people/:id/detach
 * 
 * Removes a person's participation in a specific app.
 * This is a guarded, explicit lifecycle action.
 * 
 * ⚠️ IMPORTANT:
 * - Only allowed for apps with DETACH_POLICY.allowed === true
 * - Blocked if active child records exist
 * - Does NOT delete identity or historical records
 * - Preserves activity logs and audit history
 * - Soft detach (clears participation fields, preserves history)
 */
exports.detachFromApp = async (req, res) => {
  try {
    const personId = req.params.id;
    const { appKey } = req.body;

    if (!appKey) {
      return res.status(400).json({
        success: false,
        message: 'App key is required',
        code: 'APP_KEY_REQUIRED'
      });
    }

    const normalizedAppKey = appKey.trim().toUpperCase();

    // Validate detachment policy
    const { isDetachAllowed, getDetachReason } = require('../utils/detachPolicy');
    if (!isDetachAllowed(normalizedAppKey)) {
      const reason = getDetachReason(normalizedAppKey);
      return res.status(403).json({
        success: false,
        message: reason || `Detachment is not allowed for ${normalizedAppKey} app.`,
        code: 'DETACH_NOT_ALLOWED'
      });
    }

    // Find the person
    const person = await People.findOne({
      _id: personId,
      organizationId: req.user.organizationId
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found',
        code: 'PERSON_NOT_FOUND'
      });
    }

    // Verify person has participation in this app
    const { hasAppParticipation } = require('../utils/personProfileComposer');
    if (!hasAppParticipation(person, normalizedAppKey)) {
      return res.status(400).json({
        success: false,
        message: `Person does not participate in ${normalizedAppKey} app.`,
        code: 'NO_PARTICIPATION'
      });
    }

    // GUARDRAIL: Check for active child records before allowing detachment
    // This prevents detachment when there are active dependencies
    // Backend is the final authority - even if UI hides the action
    const activeChildRecords = await checkActiveChildRecords(personId, normalizedAppKey, req.user.organizationId);
    if (activeChildRecords.length > 0) {
      const recordTypes = activeChildRecords.map(r => r.type).join(', ');
      const totalCount = activeChildRecords.reduce((sum, r) => sum + r.count, 0);
      return res.status(400).json({
        success: false,
        message: `Cannot detach: This person has ${totalCount} active ${recordTypes} record(s). Please close or reassign them first.`,
        code: 'ACTIVE_CHILD_RECORDS',
        activeRecords: activeChildRecords
      });
    }

    // Get app-specific fields to clear
    const { APP_FIELD_KEYS_BY_APP } = require('../utils/personProfileComposer');
    const appFieldKeys = APP_FIELD_KEYS_BY_APP[normalizedAppKey] || [];

    if (appFieldKeys.length === 0) {
      // No app-specific fields to clear, but still log the detachment
      console.log(`[DetachFromApp] No app-specific fields found for ${normalizedAppKey}`);
    }

    // Build update data: clear all app-specific fields
    const updateData = {};
    appFieldKeys.forEach(fieldKey => {
      // Set to null to clear the field
      updateData[fieldKey] = null;
    });

    // Special handling for array fields (set to empty array)
    if (normalizedAppKey === 'SALES') {
      if (appFieldKeys.includes('interest_products')) {
        updateData.interest_products = [];
      }
    }

    // Get user name for activity log
    const user = await User.findById(req.user._id).select('firstName lastName username');
    const userName = user ? 
      (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username) || 'User' 
      : 'System';

    // Build activity log entry
    const activityLogEntry = {
      user: userName,
      userId: req.user._id,
      action: 'detached_from_app',
      details: { 
        appKey: normalizedAppKey,
        detachedAt: new Date(),
        clearedFields: appFieldKeys
      },
      appContext: normalizedAppKey,
      timestamp: new Date()
    };

    // Perform soft detach: clear participation fields, preserve history
    const updatedPerson = await People.findOneAndUpdate(
      { _id: personId, organizationId: req.user.organizationId },
      {
        $set: updateData,
        $push: {
          activityLogs: activityLogEntry
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedPerson) {
      return res.status(404).json({
        success: false,
        message: 'Person not found after detachment',
        code: 'PERSON_NOT_FOUND'
      });
    }

    // Populate references
    const populated = await People.findById(updatedPerson._id)
      .populate('organization', 'name')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    console.log(`[DetachFromApp] Successfully detached person ${personId} from ${normalizedAppKey}`);

    res.status(200).json({
      success: true,
      data: populated,
      message: `Successfully detached from ${normalizedAppKey}`,
      meta: {
        appKey: normalizedAppKey,
        clearedFields: appFieldKeys
      }
    });
  } catch (error) {
    console.error('Error detaching from app:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed. Please check the fields below.',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error detaching from app',
      error: error.message
    });
  }
};

