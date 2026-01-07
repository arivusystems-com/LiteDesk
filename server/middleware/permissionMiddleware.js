/**
 * ============================================================================
 * PLATFORM CORE: Permission-based Access Control Middleware (App-Aware)
 * ============================================================================
 * 
 * This middleware provides app-aware permission checking:
 * - Permission verification scoped by appKey
 * - Role-based access control
 * - Ownership filtering
 * - Prevents CRM module access from non-CRM apps
 * 
 * App-Aware Behavior:
 * - CRM modules (contacts, deals, tasks, etc.) are only accessible from CRM app
 * - Non-CRM apps should use app-specific permissions (future)
 * - Existing permissions are treated as CRM-scoped for backward compatibility
 * 
 * ✅ FIXED: Permission checks are now app-aware
 *    CRM modules are blocked from non-CRM apps
 *    Platform core does not assume CRM modules
 * 
 * See PLATFORM_CORE_ANALYSIS.md and APP_AWARE_PERMISSIONS.md for details.
 * ============================================================================
 */

// 🔓 SECURITY DISABLED: Bypass all permission checks
const SECURITY_DISABLED = process.env.DISABLE_SECURITY === 'true' || process.env.NODE_ENV !== 'production';

const securityLogger = require('./securityLoggingMiddleware');
const { APP_KEYS } = require('../constants/appKeys');

// CRM-specific modules that should only be accessible from CRM app
const CRM_MODULES = [
    'contacts', 'people', 'deals', 'tasks', 'events', 'forms', 'items',
    'organizations', 'projects', 'reports', 'imports', 'settings'
];

/**
 * Check if a module is CRM-specific
 */
function isCRMModule(module) {
    const normalizedModule = module === 'people' ? 'contacts' : module;
    return CRM_MODULES.includes(normalizedModule);
}

/**
 * Check if user has permission to perform an action on a module (app-aware)
 * Usage: checkPermission('contacts', 'create')
 * 
 * App-Aware Behavior:
 * - CRM modules are only accessible from CRM app
 * - Non-CRM apps cannot access CRM modules
 * - Existing permissions are treated as CRM-scoped
 */
const checkPermission = (module, action) => {
    return async (req, res, next) => {
        // 🔓 BYPASS: Skip all permission checks if security is disabled
        if (SECURITY_DISABLED) {
            console.warn(`⚠️  [DEV] Permission check bypassed: ${module}.${action}`);
            return next();
        }
        
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Owner always has all permissions (but still subject to app context)
            // For CRM modules, owner can access from any app (backward compatibility)
            if (user.isOwner && (!isCRMModule(module) || req.appKey === APP_KEYS.CRM || !req.appKey)) {
                return next();
            }

            // Normalize module aliases (people -> contacts)
            const normalizedModule = module === 'people' ? 'contacts' : module;
            
            // APP-AWARE CHECK: CRM modules are only accessible from CRM app
            if (isCRMModule(normalizedModule)) {
                // If requesting CRM module but not from CRM app, deny access
                if (req.appKey && req.appKey !== APP_KEYS.CRM) {
                    securityLogger.logPermissionDenial(req, normalizedModule, action);
                    
                    return res.status(403).json({ 
                        message: `CRM modules are only accessible from the CRM application`,
                        code: 'CRM_MODULE_NOT_ACCESSIBLE',
                        module: normalizedModule,
                        action: action,
                        currentApp: req.appKey,
                        requiredApp: APP_KEYS.CRM
                    });
                }
                
                // If no appKey is set, treat as CRM (backward compatibility)
                // This allows existing routes without app context to work
            }
            
            // Admins have full access to settings area (UI configuration, modules & fields, etc.)
            // But only from CRM app (settings is a CRM module)
            if (normalizedModule === 'settings' && String(user.role || '').toLowerCase() === 'admin') {
                if (!req.appKey || req.appKey === APP_KEYS.CRM) {
                    return next();
                }
            }
            
            // Check if user has the specific permission
            // Existing permissions are treated as CRM-scoped (backward compatibility)
            let hasPermission = user.permissions?.[normalizedModule]?.[action];
            
            // For settings module, also check customizeFields as equivalent to edit
            if (normalizedModule === 'settings' && action === 'edit' && !hasPermission) {
                hasPermission = user.permissions?.settings?.customizeFields || false;
            }
            
            if (!hasPermission) {
                // Log permission denial
                securityLogger.logPermissionDenial(req, normalizedModule, action);
                
                return res.status(403).json({ 
                    message: `You don't have permission to ${action} ${module}`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredPermission: { module: normalizedModule, action },
                    appKey: req.appKey || APP_KEYS.CRM // Include app context
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Server error during permission verification' });
        }
    };
};

/**
 * Check if user has a specific role (or higher in hierarchy)
 * Role hierarchy: owner > admin > manager > user > viewer
 * Usage: requireRole('admin') // allows owner and admin
 */
const requireRole = (requiredRole) => {
    const roleHierarchy = {
        'owner': 5,
        'admin': 4,
        'manager': 3,
        'user': 2,
        'viewer': 1
    };
    
    return async (req, res, next) => {
        // 🔓 BYPASS: Skip role checks if security is disabled
        if (SECURITY_DISABLED) {
            console.warn(`⚠️  [DEV] Role check bypassed: ${requiredRole}`);
            return next();
        }
        
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const userRoleLevel = roleHierarchy[user.role] || 0;
            const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
            
            if (userRoleLevel < requiredRoleLevel) {
                return res.status(403).json({ 
                    message: `This action requires ${requiredRole} role or higher`,
                    code: 'INSUFFICIENT_ROLE',
                    userRole: user.role,
                    requiredRole: requiredRole
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ message: 'Server error during role verification' });
        }
    };
};

/**
 * Check if user is owner or admin
 * Shorthand for common permission check
 */
const requireAdmin = () => {
    return requireRole('admin');
};

/**
 * Check if user is from the master organization (application owner)
 * Only master organization users can access platform management features
 * like demo requests, instances, etc.
 */
const requireMasterOrganization = () => {
    return async (req, res, next) => {
        // 🔓 BYPASS: Skip master organization check if security is disabled
        if (SECURITY_DISABLED) {
            console.warn('⚠️  [DEV] Master organization check bypassed');
            return next();
        }
        
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Get organization details
            const Organization = require('../models/Organization');
            const organization = await Organization.findById(user.organizationId);
            
            if (!organization) {
                return res.status(404).json({ message: 'Organization not found' });
            }

            // Check if this is the master organization
            const isMasterOrg = organization.name === 'LiteDesk Master';
            
            if (!isMasterOrg) {
                return res.status(403).json({ 
                    message: 'This feature is only available to the application owner',
                    code: 'MASTER_ORGANIZATION_REQUIRED'
                });
            }

            next();
        } catch (error) {
            console.error('Master organization check error:', error);
            res.status(500).json({ message: 'Server error during organization verification' });
        }
    };
};

/**
 * Check if user is the owner
 */
const requireOwner = () => {
    return requireRole('owner');
};

/**
 * Check if user can manage other users
 */
const canManageUsers = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Authentication required' });
            if (user.isOwner || String(user.role || '').toLowerCase() === 'admin') {
                return next();
            }
            const mw = checkPermission('settings', 'manageUsers');
            return mw(req, res, next);
        } catch (e) {
            console.error('canManageUsers error:', e);
            return res.status(500).json({ message: 'Server error during permission verification' });
        }
    };
};

/**
 * Check if user can manage billing
 */
const canManageBilling = () => {
    return checkPermission('settings', 'manageBilling');
};

/**
 * Check if user can manage roles and permissions
 * For now, requires admin or owner role
 */
const canManageRoles = () => {
    return checkPermission('settings', 'manageRoles');
};

/**
 * Middleware to filter data based on viewAll permission (app-aware)
 * If user doesn't have viewAll, they can only see their own data
 * 
 * App-Aware Behavior:
 * - CRM modules only filter from CRM app
 * - Non-CRM apps should use app-specific filtering (future)
 */
const filterByOwnership = (module) => {
    return async (req, res, next) => {
        // 🔓 BYPASS: Skip ownership filtering if security is disabled
        if (SECURITY_DISABLED) {
            console.warn(`⚠️  [DEV] Ownership filter bypassed: ${module}`);
            req.viewAll = true; // Allow viewing all data
            return next();
        }
        
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const normalizedModule = module === 'people' ? 'contacts' : module;
            
            // APP-AWARE CHECK: CRM modules only filter from CRM app
            if (isCRMModule(normalizedModule)) {
                if (req.appKey && req.appKey !== APP_KEYS.CRM) {
                    // Non-CRM app trying to filter CRM module - deny
                    return res.status(403).json({ 
                        message: `CRM modules are only accessible from the CRM application`,
                        code: 'CRM_MODULE_NOT_ACCESSIBLE',
                        module: normalizedModule,
                        currentApp: req.appKey,
                        requiredApp: APP_KEYS.CRM
                    });
                }
            }
            
            // Owner and users with viewAll can see everything
            // For CRM modules, check CRM-scoped permissions (backward compatibility)
            if (user.isOwner || user.permissions?.[normalizedModule]?.viewAll) {
                req.viewAll = true;
                return next();
            }

            // Others can only see data assigned to them
            req.viewAll = false;
            req.filterByUser = user._id;
            
            next();
        } catch (error) {
            console.error('Ownership filter error:', error);
            res.status(500).json({ message: 'Server error during ownership filtering' });
        }
    };
};

module.exports = {
    checkPermission,
    requireRole,
    requireAdmin,
    requireOwner,
    requireMasterOrganization,
    canManageUsers,
    canManageBilling,
    canManageRoles,
    filterByOwnership
};

