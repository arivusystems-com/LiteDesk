/**
 * Field-Level Access Control Utilities
 * 
 * Controls READ and WRITE access to fields based on user roles and permissions.
 * This is orthogonal to owner and context - it controls ACCESS, not existence.
 * 
 * For complete field governance rules, see: /docs/field-governance.md
 * 
 * Rules:
 * - Platform-owned fields: Only owners/admins can edit
 * - App-owned fields: Users with app access and edit permission can edit
 * - Org-owned fields: Users with edit permission can edit
 * - READ access: Based on view permission for the module
 */

/**
 * Check if user can READ a field
 * 
 * @param {Object} field - Field definition
 * @param {Object} user - User object with permissions
 * @param {string} moduleKey - Module key (e.g., 'people', 'deals')
 * @returns {boolean} - True if user can read the field
 */
function canReadField(field, user, moduleKey) {
  if (!field || !user) return false;
  
  // Owners can read all fields
  if (user.isOwner) return true;
  
  // Check module-level view permission
  const normalizedModule = moduleKey === 'people' ? 'contacts' : moduleKey;
  const hasViewPermission = user.permissions?.[normalizedModule]?.view || 
                           user.permissions?.[normalizedModule]?.viewAll ||
                           false;
  
  if (!hasViewPermission) return false;
  
  // All fields in a module are readable if user has view permission
  // (Field-level read restrictions can be added here if needed)
  return true;
}

/**
 * Check if user can WRITE (edit) a field
 * 
 * @param {Object} field - Field definition
 * @param {Object} user - User object with permissions
 * @param {string} moduleKey - Module key (e.g., 'people', 'deals')
 * @returns {boolean} - True if user can write to the field
 */
function canWriteField(field, user, moduleKey) {
  if (!field || !user) return false;
  
  // Owners can write to all fields (except platform-owned fields may have restrictions)
  if (user.isOwner) {
    // Even owners cannot edit platform-owned fields (unless they're admins)
    const fieldOwner = (field.owner || 'platform').toLowerCase();
    if (fieldOwner === 'platform') {
      // Platform fields can only be edited by owners (isOwner flag)
      return true; // Owners can edit platform fields
    }
    return true;
  }
  
  // Check module-level edit permission
  const normalizedModule = moduleKey === 'people' ? 'contacts' : moduleKey;
  const hasEditPermission = user.permissions?.[normalizedModule]?.edit || false;
  
  if (!hasEditPermission) return false;
  
  // Check field ownership rules
  const fieldOwner = (field.owner || 'platform').toLowerCase();
  
  // Platform-owned fields: Only owners/admins can edit
  if (fieldOwner === 'platform') {
    // Regular users cannot edit platform fields
    return false;
  }
  
  // App-owned fields: Users with app access and edit permission can edit
  if (fieldOwner === 'app') {
    // Check if user has access to the app (via appAccess or allowedApps)
    const fieldContext = (field.context || 'global').toLowerCase();
    if (fieldContext === 'global') {
      // Global app fields - check if user has any app access
      return hasEditPermission;
    }
    
    // App-specific fields - check if user has access to that app
    const appKey = fieldContext.toUpperCase();
    const hasAppAccess = user.appAccess?.some(
      access => access.appKey === appKey && access.status === 'ACTIVE'
    ) || user.allowedApps?.includes(appKey) || false;
    
    return hasAppAccess && hasEditPermission;
  }
  
  // Org-owned fields: Users with edit permission can edit
  if (fieldOwner === 'org') {
    return hasEditPermission;
  }
  
  // Default: deny if ownership is unclear
  return false;
}

/**
 * Filter fields by READ access
 * 
 * @param {Array} fields - Array of field definitions
 * @param {Object} user - User object with permissions
 * @param {string} moduleKey - Module key
 * @returns {Array} - Filtered fields that user can read
 */
function filterFieldsByReadAccess(fields, user, moduleKey) {
  if (!Array.isArray(fields)) return [];
  if (!user) return [];
  
  return fields.filter(field => canReadField(field, user, moduleKey));
}

/**
 * Filter fields by WRITE access
 * 
 * @param {Array} fields - Array of field definitions
 * @param {Object} user - User object with permissions
 * @param {string} moduleKey - Module key
 * @returns {Array} - Filtered fields that user can write
 */
function filterFieldsByWriteAccess(fields, user, moduleKey) {
  if (!Array.isArray(fields)) return [];
  if (!user) return [];
  
  return fields.filter(field => canWriteField(field, user, moduleKey));
}

/**
 * Validate if user can write to a specific field
 * 
 * @param {string} fieldKey - Field key
 * @param {Array} fields - Array of field definitions
 * @param {Object} user - User object with permissions
 * @param {string} moduleKey - Module key
 * @returns {Object} - { allowed: boolean, reason: string }
 */
function validateFieldWrite(fieldKey, fields, user, moduleKey) {
  if (!fieldKey || !fields || !user) {
    return { allowed: false, reason: 'Missing required parameters' };
  }
  
  const field = fields.find(f => f && f.key && f.key.toLowerCase() === fieldKey.toLowerCase());
  
  if (!field) {
    // Field doesn't exist - allow (might be custom field or new field)
    return { allowed: true, reason: 'Field not found in definitions' };
  }
  
  const canWrite = canWriteField(field, user, moduleKey);
  
  if (!canWrite) {
    const fieldOwner = (field.owner || 'platform').toLowerCase();
    let reason = 'Insufficient permissions';
    
    if (fieldOwner === 'platform') {
      reason = 'Platform fields cannot be modified by regular users';
    } else if (fieldOwner === 'app') {
      reason = 'App-managed fields require app access and edit permission';
    } else if (fieldOwner === 'org') {
      reason = 'Edit permission required for this field';
    }
    
    return { allowed: false, reason };
  }
  
  return { allowed: true, reason: 'Access granted' };
}

module.exports = {
  canReadField,
  canWriteField,
  filterFieldsByReadAccess,
  filterFieldsByWriteAccess,
  validateFieldWrite
};

