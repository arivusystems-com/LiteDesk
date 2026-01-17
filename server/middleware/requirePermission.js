/**
 * ============================================================================
 * REQUIRE PERMISSION MIDDLEWARE
 * ============================================================================
 * 
 * Pure permission check middleware for explicit permission strings.
 * 
 * This middleware checks if the user has a specific permission string.
 * It supports both:
 * - String-based permissions (array of permission strings)
 * - Legacy nested permissions (permissions.module.action)
 * 
 * ⚠️ IMPORTANT:
 * - No UI logic
 * - No role inference
 * - Pure permission check
 * - Errors bubble to console
 * 
 * ============================================================================
 */

/**
 * Check if user has a specific permission
 * 
 * Supports multiple permission formats:
 * 1. String-based: user.permissions array contains the permission string
 * 2. Legacy nested: user.permissions.module.action === true
 * 
 * @param {string} permission - Permission string (e.g., 'people.attach.sales')
 * @returns {Function} Express middleware
 */
module.exports = function requirePermission(permission) {
  return function (req, res, next) {
    // Security bypass (for development)
    if (process.env.DISABLE_SECURITY === 'true') {
      console.warn(`⚠️  [DEV] Permission check bypassed: ${permission}`);
      return next();
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Owners always have all permissions
    if (user.isOwner) {
      return next();
    }

    // Check if user has the permission
    let hasPermission = false;

    // Method 1: Check string-based permissions array
    if (Array.isArray(user.permissions)) {
      hasPermission = user.permissions.includes(permission);
    }

    // Method 2: Check legacy nested permissions structure
    // Parse permission string (e.g., 'people.attach.sales' -> ['people', 'attach', 'sales'])
    if (!hasPermission && user.permissions && typeof user.permissions === 'object' && !Array.isArray(user.permissions)) {
      const parts = permission.split('.');
      
      if (parts.length >= 2) {
        const module = parts[0]; // 'people'
        const action = parts[1]; // 'attach'
        
        // Map 'people' module to 'contacts' for backward compatibility
        // The legacy system uses 'contacts' but new system uses 'people'
        const permissionModule = module === 'people' ? 'contacts' : module;
        
        // Check base permission (e.g., 'contacts.attach' or 'contacts.edit')
        // For People permissions, map actions:
        // - 'attach' -> 'create' (attaching is similar to creating participation)
        // - 'participation.edit' -> 'edit' (editing participation is editing)
        // - 'lifecycle.manage' -> 'edit' (lifecycle changes are edits)
        let permissionAction = action;
        if (module === 'people') {
          if (action === 'attach') {
            permissionAction = 'create';
          } else if (action === 'participation') {
            // 'people.participation.edit' -> check 'contacts.edit'
            permissionAction = 'edit';
          } else if (action === 'lifecycle') {
            // 'people.lifecycle.manage' -> check 'contacts.edit'
            permissionAction = 'edit';
          }
        }
        
        // Check base permission (e.g., 'contacts.create' or 'contacts.edit')
        if (user.permissions?.[permissionModule]?.[permissionAction] === true) {
          hasPermission = true;
        }
        
        // For app-specific permissions (e.g., 'people.attach.sales'),
        // also verify user has access to the app
        if (parts.length === 3 && hasPermission) {
          const appKey = parts[2].toUpperCase(); // 'SALES'
          
          // Check if user has app access
          const userAppAccess = user.allowedApps || 
                               user.appAccess?.map(entry => entry.appKey) || 
                               [];
          
          // If user doesn't have access to the app, deny permission
          if (!userAppAccess.includes(appKey)) {
            hasPermission = false;
          }
        }
      }
      
      // Method 3: Check if permission string exists as a flat key
      if (!hasPermission && user.permissions[permission] === true) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.'
      });
    }

    next();
  };
};
