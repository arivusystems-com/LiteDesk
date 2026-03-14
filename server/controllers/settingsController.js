/**
 * ============================================================================
 * PLATFORM CORE: Settings Controller
 * ============================================================================
 * 
 * This controller handles Settings API endpoints:
 * - Core Modules (read-only)
 * - Applications (read-only)
 * - Subscriptions (read-only)
 * - Users & Access
 * - Security
 * - Integrations
 * 
 * All data comes from registries (ModuleDefinition, AppDefinition, etc.)
 * No business logic inference - all metadata from backend
 * ============================================================================
 */

const ModuleDefinition = require('../models/ModuleDefinition');
const Organization = require('../models/Organization');
const User = require('../models/User');
const TenantModuleConfiguration = require('../models/TenantModuleConfiguration');
const integrationRegistry = require('../constants/integrationRegistry');
const emailService = require('../services/emailService');

/**
 * Get all core modules with their application usage
 * GET /api/settings/core-modules
 */
exports.getCoreModules = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Get enabled apps for this organization (defensive: handle null/undefined entries and legacy shapes)
        const VALID_APPS = ['SALES', 'HELPDESK', 'PROJECTS', 'PORTAL', 'AUDIT', 'LMS'];
        const rawApps = Array.isArray(organization.enabledApps) ? organization.enabledApps : [];
        const enabledAppKeys = rawApps
            .filter(app => app != null && (typeof app === 'object' ? app.status === 'ACTIVE' : typeof app === 'string' && app.length > 0))
            .map(app => typeof app === 'string' ? app : (app && app.appKey))
            .filter(Boolean)
            .map(key => String(key).toUpperCase())
            .filter(appKey => VALID_APPS.includes(appKey));

        // Core platform modules with explicit ordering
        // Order: People, Organization, Task, Event, Item, Form (new modules added at the bottom)
        const coreModuleOrder = ['people', 'organizations', 'tasks', 'events', 'items', 'forms'];
        const coreModuleKeys = [...coreModuleOrder, 'reports']; // reports and any future modules go at the end

        // Get all platform-owned modules (appKey: 'platform')
        const platformModulesRaw = await ModuleDefinition.find({
            appKey: 'platform',
            moduleKey: { $in: coreModuleKeys }
        }).lean();

        // Get org-specific display name overrides (saved via Settings → Module details)
        // Query by both key and moduleKey (tenant overrides use key; some docs may have moduleKey)
        const orgOverrides = await ModuleDefinition.find({
            organizationId: req.user.organizationId,
            $or: [
                { key: { $in: coreModuleKeys } },
                { moduleKey: { $in: coreModuleKeys } }
            ]
        })
        .select('key moduleKey name')
        .lean();
        const nameOverridesByKey = {};
        for (const o of orgOverrides) {
            const name = typeof o.name === 'string' ? o.name.trim() : '';
            if (!name) continue;
            const key = (o.moduleKey || o.key || '').toLowerCase();
            if (key) nameOverridesByKey[key] = name;
            const keyAlt = (o.key || o.moduleKey || '').toLowerCase();
            if (keyAlt && keyAlt !== key) nameOverridesByKey[keyAlt] = name;
        }
        
        // Sort modules according to the defined order (modules not in coreModuleOrder go to the end)
        const platformModules = platformModulesRaw.sort((a, b) => {
            const orderA = coreModuleOrder.indexOf(a.moduleKey);
            const orderB = coreModuleOrder.indexOf(b.moduleKey);
            // If not in coreModuleOrder, place at end (use a high number)
            const effectiveOrderA = orderA === -1 ? 999 : orderA;
            const effectiveOrderB = orderB === -1 ? 999 : orderB;
            return effectiveOrderA - effectiveOrderB;
        });

        // Check organization-level overrides for module participation
        const moduleOverrides = organization.moduleOverrides || {};

        // Build modules response with application usage
        const modules = platformModules.map((module) => {
            const appsUsingModule = [];
            const moduleOverride = moduleOverrides[module.moduleKey] || {};

            // Determine which apps use this module
            // For core modules, all enabled apps can potentially use them
            // Required relationships come from app definitions (simplified for now)
            for (const appKey of enabledAppKeys) {
                const appKeyLower = appKey.toLowerCase();
                
                // Check if this app uses this module
                // Core modules are generally available to all apps
                // Some apps require specific modules (e.g., Sales requires People and Organizations)
                const requiredModules = getRequiredModulesForApp(appKeyLower);
                const isRequired = requiredModules.includes(module.moduleKey);
                
                // Check if there's an override for this app, otherwise default to enabled
                const overrideValue = moduleOverride[appKey];
                const enabled = overrideValue !== undefined ? overrideValue : true;
                
                appsUsingModule.push({
                    appKey: appKey,
                    appName: getAppName(appKeyLower),
                    required: isRequired,
                    enabled: enabled, // Use override if exists, otherwise default to enabled
                    canToggle: !isRequired, // Can toggle if not required
                    usage: getModuleUsage(module.moduleKey, appKeyLower)
                });
            }

            // Calculate order: modules in coreModuleOrder get their index, others go to the end
            const orderIndex = coreModuleOrder.indexOf(module.moduleKey);
            const order = orderIndex === -1 ? 999 : orderIndex;

            const displayName = nameOverridesByKey[module.moduleKey] || module.label || capitalizeFirst(module.moduleKey);
            return {
                moduleKey: module.moduleKey,
                name: displayName,
                description: module.description || `${displayName} - Shared platform capability`,
                icon: 'module',
                platformOwned: true,
                order: order,
                applications: appsUsingModule
            };
        });

        res.json({
            success: true,
            modules: modules
        });
    } catch (error) {
        console.error('Get core modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch core modules',
            error: error.message
        });
    }
};

/**
 * Get detailed information about a specific core module
 * GET /api/settings/core-modules/:moduleKey
 */
exports.getCoreModule = async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const organization = await Organization.findById(req.user.organizationId);
        
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Get the platform module
        const module = await ModuleDefinition.findOne({
            appKey: 'platform',
            moduleKey: moduleKey.toLowerCase()
        }).lean();

        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Core module not found'
            });
        }

        // Get org-specific display name override (saved via Settings → Module details)
        const keyLower = moduleKey.toLowerCase();
        const orgOverride = await ModuleDefinition.findOne({
            organizationId: req.user.organizationId,
            $or: [{ key: keyLower }, { moduleKey: keyLower }]
        })
        .select('name')
        .lean();
        const displayName = (orgOverride?.name && typeof orgOverride.name === 'string' && orgOverride.name.trim())
            ? orgOverride.name.trim()
            : (module.label || capitalizeFirst(module.moduleKey));

        // Get enabled apps (defensive: handle null/undefined entries and legacy shapes)
        const VALID_APPS = ['SALES', 'HELPDESK', 'PROJECTS', 'PORTAL', 'AUDIT', 'LMS'];
        const rawApps = Array.isArray(organization.enabledApps) ? organization.enabledApps : [];
        const enabledAppKeys = rawApps
            .filter(app => app != null && (typeof app === 'object' ? app.status === 'ACTIVE' : typeof app === 'string' && app.length > 0))
            .map(app => typeof app === 'string' ? app : (app && app.appKey))
            .filter(Boolean)
            .map(key => String(key).toUpperCase())
            .filter(appKey => VALID_APPS.includes(appKey));

        // Check organization-level overrides for module participation
        const moduleOverrides = organization.moduleOverrides || {};
        const moduleOverride = moduleOverrides[module.moduleKey] || {};

        // Build applications list
        const applications = [];
        for (const appKey of enabledAppKeys) {
            const appKeyLower = appKey.toLowerCase();
            const requiredModules = getRequiredModulesForApp(appKeyLower);
            const isRequired = requiredModules.includes(module.moduleKey);

            // Check if there's an override for this app, otherwise default to enabled
            const overrideValue = moduleOverride[appKey];
            const enabled = overrideValue !== undefined ? overrideValue : true;

            applications.push({
                appKey: appKey,
                appName: getAppName(appKeyLower),
                required: isRequired,
                enabled: enabled,
                canToggle: !isRequired,
                usage: getModuleUsage(module.moduleKey, appKeyLower),
                reason: isRequired ? 'This application requires this module' : null
            });
        }

        // Core module order: People, Organization, Task, Event, Item, Form (new modules at the end)
        const coreModuleOrder = ['people', 'organizations', 'tasks', 'events', 'items', 'forms'];
        const orderIndex = coreModuleOrder.indexOf(module.moduleKey);
        const order = orderIndex === -1 ? 999 : orderIndex;

        res.json({
            success: true,
            moduleKey: module.moduleKey,
            name: displayName,
            description: module.description || `${displayName} - Shared platform capability`,
            icon: 'module',
            platformOwned: true,
            order: order,
            applications: applications
        });
    } catch (error) {
        console.error('Get core module error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch core module',
            error: error.message
        });
    }
};

// Helper function to get app name
// Note: CRM is not an app - it's legacy terminology. Actual apps are: SALES, HELPDESK, PROJECTS, PORTAL, AUDIT, LMS
function getAppName(appKey) {
    const appNames = {
        'sales': 'Sales',
        'helpdesk': 'Helpdesk',
        'projects': 'Projects',
        'audit': 'Audit',
        'portal': 'Portal',
        'lms': 'LMS'
    };
    return appNames[appKey.toLowerCase()] || appKey.toUpperCase();
}

// Helper function to get required modules for an app
// In a full implementation, this would come from AppDefinition model
// Note: These are the actual apps in the system
function getRequiredModulesForApp(appKey) {
    const appKeyLower = appKey.toLowerCase();
    const requiredModulesMap = {
        'sales': ['people', 'organizations'], // Sales requires People and Organizations
        'helpdesk': ['people'], // Helpdesk requires People
        'projects': ['people'], // Projects requires People
        'audit': ['people'], // Audit requires People
        'portal': ['people'], // Portal requires People
        'lms': [] // LMS might not require any
    };
    return requiredModulesMap[appKeyLower] || [];
}

// Helper function to capitalize first letter
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to get module usage description
function getModuleUsage(moduleKey, appKey) {
    const usageMap = {
        'people': {
            'sales': 'Used for contact management and leads',
            'helpdesk': 'Used for customer contact information',
            'projects': 'Used for team member management',
            'audit': 'Used for auditor contact information',
            'portal': 'Used for customer profile management'
        },
        'organizations': {
            'sales': 'Used for company and account management',
            'helpdesk': 'Used for customer company information',
            'projects': 'Used for client organization management'
        },
        'events': {
            'sales': 'Used for meetings and customer interactions',
            'helpdesk': 'Used for support appointments',
            'projects': 'Used for project milestones and deadlines'
        },
        'tasks': {
            'sales': 'Used for sales activities and follow-ups',
            'helpdesk': 'Used for support task management',
            'projects': 'Used for project task tracking'
        },
        'forms': {
            'sales': 'Used for lead capture forms',
            'helpdesk': 'Used for support request forms',
            'projects': 'Used for project intake forms'
        },
        'items': {
            'sales': 'Used for product catalog',
            'projects': 'Used for project resources'
        },
        'reports': {
            'sales': 'Used for sales analytics',
            'helpdesk': 'Used for support metrics',
            'projects': 'Used for project reporting'
        }
    };

    return usageMap[moduleKey]?.[appKey.toLowerCase()] || `Used by ${getAppName(appKey)}`;
}

/**
 * Toggle application participation in a core module
 * PATCH /api/settings/core-modules/:moduleKey/applications/:appKey
 */
exports.toggleAppParticipation = async (req, res) => {
    try {
        const { moduleKey, appKey } = req.params;
        const { enabled } = req.body;
        const organization = await Organization.findById(req.user.organizationId);
        
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Validate module exists
        const module = await ModuleDefinition.findOne({
            appKey: 'platform',
            moduleKey: moduleKey.toLowerCase()
        }).lean();

        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Core module not found'
            });
        }

        // Validate app key
        const VALID_APPS = ['SALES', 'HELPDESK', 'PROJECTS', 'PORTAL', 'AUDIT', 'LMS'];
        const appKeyUpper = appKey.toUpperCase();
        if (!VALID_APPS.includes(appKeyUpper)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application key'
            });
        }

        // Check if app is enabled for organization
        const appEntry = organization.enabledApps?.find(
            app => (typeof app === 'string' ? app : app.appKey).toUpperCase() === appKeyUpper
        );

        if (!appEntry || (typeof appEntry === 'object' && appEntry.status !== 'ACTIVE')) {
            return res.status(400).json({
                success: false,
                message: 'Application is not enabled for this organization'
            });
        }

        // Check if app is required for this module
        const requiredModules = getRequiredModulesForApp(appKeyUpper.toLowerCase());
        const isRequired = requiredModules.includes(module.moduleKey);

        if (isRequired) {
            return res.status(403).json({
                success: false,
                message: 'Cannot disable required module for this application',
                code: 'REQUIRED_MODULE'
            });
        }

        // Store module participation override in organization
        // This is stored at organization level to track which apps use which core modules
        // Format: organization.moduleOverrides[moduleKey][appKey] = enabled
        // For Mixed type fields, we need to create a new object to ensure Mongoose tracks changes
        const currentOverrides = organization.moduleOverrides || {};
        const moduleOverrides = { ...currentOverrides };
        
        if (!moduleOverrides[module.moduleKey]) {
            moduleOverrides[module.moduleKey] = {};
        }
        
        // Create a new object for the module's overrides to ensure change tracking
        const moduleOverride = { ...moduleOverrides[module.moduleKey] };
        moduleOverride[appKeyUpper] = enabled === true;
        moduleOverrides[module.moduleKey] = moduleOverride;
        
        // Set the entire object to ensure Mongoose tracks the change
        organization.moduleOverrides = moduleOverrides;
        
        // Mark the field as modified for Mongoose to detect changes in Mixed type
        organization.markModified('moduleOverrides');
        
        // Clean up enabledApps to remove invalid app keys (like 'CRM') before saving
        // This prevents validation errors when saving the organization
        if (organization.enabledApps && Array.isArray(organization.enabledApps)) {
            organization.enabledApps = organization.enabledApps.filter(app => {
                const appKey = typeof app === 'string' ? app : app.appKey;
                return VALID_APPS.includes(appKey.toUpperCase());
            });
        }
        
        await organization.save();

        res.json({
            success: true,
            message: `Application participation ${enabled ? 'enabled' : 'disabled'} successfully`,
            moduleKey: module.moduleKey,
            appKey: appKeyUpper,
            enabled: enabled
        });
    } catch (error) {
        console.error('Toggle app participation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to toggle application participation',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get all applications with their status and dependencies
 * GET /api/settings/applications
 */
exports.getApplications = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Valid apps registry (platform apps currently supported for tenants)
        // NOTE: Helpdesk, Projects, and LMS have been removed from the platform
        // for this deployment. Keep this list in sync with AppDefinition seeds.
        const VALID_APPS = ['SALES', 'PORTAL', 'AUDIT'];
        
        // App metadata (in a real implementation, this would come from AppDefinition model)
        const appMetadata = {
            'SALES': {
                name: 'Sales',
                description: 'Manage your sales pipeline, deals, and customer relationships',
                icon: 'sales'
            },
            'PORTAL': {
                name: 'Portal',
                description: 'Customer self-service portal',
                icon: 'portal'
            },
            'AUDIT': {
                name: 'Audit',
                description: 'Audit management and compliance tracking',
                icon: 'audit'
            }
        };

        // Get enabled apps from organization
        const enabledAppEntries = (organization.enabledApps || [])
            .filter(app => {
                const appKey = typeof app === 'string' ? app : app.appKey;
                return VALID_APPS.includes(appKey.toUpperCase());
            })
            .map(app => {
                const appKey = typeof app === 'string' ? app : app.appKey;
                return {
                    appKey: appKey.toUpperCase(),
                    status: typeof app === 'string' ? 'ACTIVE' : app.status,
                    enabledAt: typeof app === 'object' ? app.enabledAt : new Date()
                };
            });

        // Build applications list with status and dependencies
        const applications = VALID_APPS.map(appKey => {
            const appEntry = enabledAppEntries.find(e => e.appKey === appKey);
            const metadata = appMetadata[appKey];
            
            // Determine status
            let status = 'DISABLED';
            if (appEntry) {
                if (appEntry.status === 'ACTIVE') {
                    // Check if it's trial (could be determined by subscription tier)
                    const isTrial = organization.subscription?.tier === 'trial';
                    status = isTrial ? 'TRIAL' : 'ENABLED';
                } else {
                    status = 'SUSPENDED';
                }
            } else {
                // Check if app is included by default (could be determined by subscription)
                // For now, no apps are included by default
                status = 'DISABLED';
            }

            // Get dependencies (required core modules for this app)
            const requiredModules = getRequiredModulesForApp(appKey.toLowerCase());
            const dependencies = requiredModules.map(moduleKey => {
                // Get module name from ModuleDefinition or use default
                const moduleNames = {
                    'people': 'People',
                    'organizations': 'Organizations',
                    'events': 'Events',
                    'tasks': 'Tasks',
                    'forms': 'Forms',
                    'items': 'Items',
                    'reports': 'Reports'
                };
                return {
                    moduleKey: moduleKey,
                    moduleName: moduleNames[moduleKey] || capitalizeFirst(moduleKey),
                    required: true
                };
            });

            return {
                appKey: appKey,
                name: metadata?.name || appKey,
                description: metadata?.description || `${metadata?.name || appKey} application`,
                icon: metadata?.icon || 'app',
                status: status,
                dependencies: dependencies
            };
        });

        res.json({
            success: true,
            applications: applications
        });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch applications',
            error: error.message
        });
    }
};

/**
 * Get detailed information about a specific application
 * GET /api/settings/applications/:appKey
 */
exports.getApplication = async (req, res) => {
    try {
        const { appKey } = req.params;
        const organization = await Organization.findById(req.user.organizationId);
        
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Validate app key
        // Keep in sync with getApplications VALID_APPS
        const VALID_APPS = ['SALES', 'PORTAL', 'AUDIT'];
        const appKeyUpper = appKey.toUpperCase();
        if (!VALID_APPS.includes(appKeyUpper)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application key'
            });
        }

        // App metadata
        const appMetadata = {
            'SALES': {
                name: 'Sales',
                description: 'Manage your sales pipeline, deals, and customer relationships',
                icon: 'sales'
            },
            'HELPDESK': {
                name: 'Helpdesk',
                description: 'Customer support and ticket management',
                icon: 'helpdesk'
            },
            'PROJECTS': {
                name: 'Projects',
                description: 'Project management and task tracking',
                icon: 'projects'
            },
            'PORTAL': {
                name: 'Portal',
                description: 'Customer self-service portal',
                icon: 'portal'
            },
            'AUDIT': {
                name: 'Audit',
                description: 'Audit management and compliance tracking',
                icon: 'audit'
            },
            'LMS': {
                name: 'LMS',
                description: 'Learning Management System',
                icon: 'lms'
            }
        };

        // Get app entry from organization
        const appEntry = organization.enabledApps?.find(
            app => (typeof app === 'string' ? app : app.appKey).toUpperCase() === appKeyUpper
        );

        // Determine status
        let status = 'DISABLED';
        if (appEntry) {
            if (appEntry.status === 'ACTIVE') {
                const isTrial = organization.subscription?.tier === 'trial';
                status = isTrial ? 'TRIAL' : 'ENABLED';
            } else {
                status = 'SUSPENDED';
            }
        }

        // Get dependencies
        const requiredModules = getRequiredModulesForApp(appKeyUpper.toLowerCase());
        const dependencies = requiredModules.map(moduleKey => {
            const moduleNames = {
                'people': 'People',
                'organizations': 'Organizations',
                'events': 'Events',
                'tasks': 'Tasks',
                'forms': 'Forms',
                'items': 'Items',
                'reports': 'Reports'
            };
            return {
                moduleKey: moduleKey,
                moduleName: moduleNames[moduleKey] || capitalizeFirst(moduleKey),
                required: true,
                description: getModuleUsage(moduleKey, appKeyUpper.toLowerCase())
            };
        });

        // Get optional modules (modules that this app can use but doesn't require)
        const allCoreModules = ['people', 'organizations', 'events', 'tasks', 'forms', 'items', 'reports'];
        const optionalModules = allCoreModules
            .filter(moduleKey => !requiredModules.includes(moduleKey))
            .map(moduleKey => {
                // Check if this module is enabled for this app via moduleOverrides
                const isEnabled = organization.moduleOverrides?.[moduleKey]?.[appKeyUpper] !== false;
                
                const moduleNames = {
                    'people': 'People',
                    'organizations': 'Organizations',
                    'events': 'Events',
                    'tasks': 'Tasks',
                    'forms': 'Forms',
                    'items': 'Items',
                    'reports': 'Reports'
                };
                return {
                    moduleKey: moduleKey,
                    moduleName: moduleNames[moduleKey] || capitalizeFirst(moduleKey),
                    required: false,
                    enabled: isEnabled,
                    description: getModuleUsage(moduleKey, appKeyUpper.toLowerCase())
                };
            });

        const metadata = appMetadata[appKeyUpper] || {};

        res.json({
            success: true,
            appKey: appKeyUpper,
            name: metadata.name || appKeyUpper,
            description: metadata.description || `${metadata.name || appKeyUpper} application`,
            icon: metadata.icon || 'app',
            status: status,
            enabledAt: appEntry && typeof appEntry === 'object' ? appEntry.enabledAt : null,
            dependencies: {
                required: dependencies,
                optional: optionalModules
            }
        });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch application',
            error: error.message
        });
    }
};


/**
 * Get all subscriptions (one per application)
 * GET /api/settings/subscriptions
 */
exports.getSubscriptions = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const VALID_APPS = ['SALES', 'HELPDESK', 'PROJECTS', 'PORTAL', 'AUDIT', 'LMS'];
        
        // App metadata
        const appMetadata = {
            'SALES': {
                name: 'Sales',
                description: 'Sales pipeline and customer relationship management',
                usageMetrics: ['contacts', 'deals', 'users']
            },
            'HELPDESK': {
                name: 'Helpdesk',
                description: 'Customer support and ticket management',
                usageMetrics: ['tickets', 'agents', 'users']
            },
            'PROJECTS': {
                name: 'Projects',
                description: 'Project management and task tracking',
                usageMetrics: ['projects', 'tasks', 'users']
            },
            'PORTAL': {
                name: 'Portal',
                description: 'Customer self-service portal',
                usageMetrics: ['users', 'portal_visits']
            },
            'AUDIT': {
                name: 'Audit',
                description: 'Audit management and compliance tracking',
                usageMetrics: ['audits', 'users']
            },
            'LMS': {
                name: 'LMS',
                description: 'Learning Management System',
                usageMetrics: ['courses', 'learners', 'users']
            }
        };

        // Get enabled apps
        const enabledAppEntries = (organization.enabledApps || [])
            .filter(app => {
                const appKey = typeof app === 'string' ? app : app.appKey;
                return VALID_APPS.includes(appKey.toUpperCase());
            })
            .map(app => {
                const appKey = typeof app === 'string' ? app : app.appKey;
                return {
                    appKey: appKey.toUpperCase(),
                    status: typeof app === 'string' ? 'ACTIVE' : app.status,
                    enabledAt: typeof app === 'object' ? app.enabledAt : new Date()
                };
            });

        // Get actual usage counts
        const userCount = await User.countDocuments({ 
            organizationId: organization._id,
            status: 'active'
        });

        // Get contact and deal counts (if Contact and Deal models exist)
        let contactCount = 0;
        let dealCount = 0;
        try {
            const Contact = require('../models/Contact');
            contactCount = await Contact.countDocuments({ organizationId: organization._id });
        } catch (err) {
            // Contact model might not exist, use 0
        }
        try {
            const Deal = require('../models/Deal');
            dealCount = await Deal.countDocuments({ organizationId: organization._id });
        } catch (err) {
            // Deal model might not exist, use 0
        }

        // Build subscriptions list (one per app)
        const subscriptions = VALID_APPS.map(appKey => {
            const appEntry = enabledAppEntries.find(e => e.appKey === appKey);
            const metadata = appMetadata[appKey];
            
            // Determine plan/status
            let plan = 'DISABLED';
            let canUpgrade = false;
            
            if (appEntry && appEntry.status === 'ACTIVE') {
                if (organization.subscription?.tier === 'trial') {
                    plan = 'Trial';
                    canUpgrade = true;
                } else if (organization.subscription?.tier === 'paid') {
                    plan = 'Paid';
                    canUpgrade = false;
                } else {
                    plan = 'Active';
                    canUpgrade = true;
                }
            } else if (appEntry && appEntry.status === 'SUSPENDED') {
                plan = 'Suspended';
                canUpgrade = true;
            } else {
                plan = 'Not Subscribed';
                canUpgrade = true;
            }

            // Get usage (app-scoped, using organization-level metrics)
            const usage = {
                users: {
                    current: userCount,
                    limit: organization.limits?.maxUsers || 0
                },
                contacts: {
                    current: contactCount,
                    limit: organization.limits?.maxContacts || 0
                },
                deals: {
                    current: dealCount,
                    limit: organization.limits?.maxDeals || 0
                }
            };

            // App-specific limits
            const limits = {
                users: organization.limits?.maxUsers || 0,
                storage: organization.limits?.maxStorageGB || 0
            };

            return {
                appKey: appKey,
                appName: metadata?.name || appKey,
                description: metadata?.description || `${metadata?.name || appKey} application`,
                plan: plan,
                canUpgrade: canUpgrade,
                usage: usage,
                limits: limits,
                status: appEntry ? appEntry.status : 'DISABLED'
            };
        }).filter(sub => sub.status === 'ACTIVE' || sub.canUpgrade);

        res.json({
            success: true,
            subscriptions: subscriptions
        });
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions',
            error: error.message
        });
    }
};

/**
 * Get detailed subscription information for a specific application
 * GET /api/settings/subscriptions/:appKey
 */
exports.getSubscription = async (req, res) => {
    try {
        const { appKey } = req.params;
        const organization = await Organization.findById(req.user.organizationId);
        
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Validate app key
        const VALID_APPS = ['SALES', 'HELPDESK', 'PROJECTS', 'PORTAL', 'AUDIT', 'LMS'];
        const appKeyUpper = appKey.toUpperCase();
        if (!VALID_APPS.includes(appKeyUpper)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application key'
            });
        }

        // App metadata
        const appMetadata = {
            'SALES': {
                name: 'Sales',
                description: 'Sales pipeline and customer relationship management',
                usageMetrics: ['contacts', 'deals', 'users']
            },
            'HELPDESK': {
                name: 'Helpdesk',
                description: 'Customer support and ticket management',
                usageMetrics: ['tickets', 'agents', 'users']
            },
            'PROJECTS': {
                name: 'Projects',
                description: 'Project management and task tracking',
                usageMetrics: ['projects', 'tasks', 'users']
            },
            'PORTAL': {
                name: 'Portal',
                description: 'Customer self-service portal',
                usageMetrics: ['users', 'portal_visits']
            },
            'AUDIT': {
                name: 'Audit',
                description: 'Audit management and compliance tracking',
                usageMetrics: ['audits', 'users']
            },
            'LMS': {
                name: 'LMS',
                description: 'Learning Management System',
                usageMetrics: ['courses', 'learners', 'users']
            }
        };

        // Get app entry
        const appEntry = organization.enabledApps?.find(
            app => (typeof app === 'string' ? app : app.appKey).toUpperCase() === appKeyUpper
        );

        // Determine plan
        let plan = 'DISABLED';
        let canUpgrade = false;
        let planDetails = null;

        if (appEntry && appEntry.status === 'ACTIVE') {
            if (organization.subscription?.tier === 'trial') {
                plan = 'Trial';
                canUpgrade = true;
                const trialEndDate = organization.subscription?.trialEndDate;
                const daysRemaining = trialEndDate 
                    ? Math.max(0, Math.ceil((new Date(trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0;
                planDetails = {
                    name: 'Trial',
                    period: {
                        start: organization.subscription?.trialStartDate,
                        end: trialEndDate
                    },
                    daysRemaining: daysRemaining
                };
            } else if (organization.subscription?.tier === 'paid') {
                plan = 'Paid';
                canUpgrade = false;
                planDetails = {
                    name: 'Paid Plan',
                    period: {
                        start: organization.subscription?.currentPeriodStart,
                        end: organization.subscription?.currentPeriodEnd
                    },
                    autoRenew: organization.subscription?.autoRenew || false
                };
            } else {
                plan = 'Active';
                canUpgrade = true;
            }
        } else if (appEntry && appEntry.status === 'SUSPENDED') {
            plan = 'Suspended';
            canUpgrade = true;
        } else {
            plan = 'Not Subscribed';
            canUpgrade = true;
        }

        // Get actual usage counts
        const userCount = await User.countDocuments({ 
            organizationId: organization._id,
            status: 'active'
        });

        let contactCount = 0;
        let dealCount = 0;
        try {
            const Contact = require('../models/Contact');
            contactCount = await Contact.countDocuments({ organizationId: organization._id });
        } catch (err) {
            // Contact model might not exist
        }
        try {
            const Deal = require('../models/Deal');
            dealCount = await Deal.countDocuments({ organizationId: organization._id });
        } catch (err) {
            // Deal model might not exist
        }

        // Get usage
        const usage = {
            users: {
                current: userCount,
                limit: organization.limits?.maxUsers || 0,
                unit: 'users'
            },
            contacts: {
                current: contactCount,
                limit: organization.limits?.maxContacts || 0,
                unit: 'contacts'
            },
            deals: {
                current: dealCount,
                limit: organization.limits?.maxDeals || 0,
                unit: 'deals'
            },
            storage: {
                current: 0, // Would come from actual storage tracking
                limit: organization.limits?.maxStorageGB || 0,
                unit: 'GB'
            }
        };

        // Limits
        const limits = {
            users: organization.limits?.maxUsers || 0,
            contacts: organization.limits?.maxContacts || 0,
            deals: organization.limits?.maxDeals || 0,
            storage: organization.limits?.maxStorageGB || 0
        };

        const metadata = appMetadata[appKeyUpper] || {};

        res.json({
            success: true,
            appKey: appKeyUpper,
            appName: metadata.name || appKeyUpper,
            description: metadata.description || `${metadata.name || appKeyUpper} application`,
            plan: plan,
            planDetails: planDetails,
            canUpgrade: canUpgrade,
            usage: usage,
            limits: limits,
            enabledAt: appEntry && typeof appEntry === 'object' ? appEntry.enabledAt : null
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription',
            error: error.message
        });
    }
};

/**
 * Get organization settings
 * GET /api/settings/organization
 */
exports.getOrganizationSettings = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Return only organization identity and settings fields
        // Exclude subscription, billing, app enablement, etc.
        res.json({
            success: true,
            data: {
                name: organization.name,
                logoUrl: organization.settings?.logoUrl || null,
                timeZone: organization.settings?.timeZone || 'UTC',
                currency: organization.settings?.currency || 'USD',
                locale: organization.settings?.locale || 'en-US',
                language: organization.settings?.language || 'en',
                dataRegion: organization.dataRegion || 'us-east-1',
                industry: organization.industry || null
            }
        });
    } catch (error) {
        console.error('Get organization settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization settings',
            error: error.message
        });
    }
};

/**
 * Update organization settings
 * PUT /api/settings/organization
 */
exports.updateOrganizationSettings = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const { name, logoUrl, timeZone, currency, locale, language } = req.body;

        // Validate and update only allowed fields
        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization name is required'
                });
            }
            organization.name = name.trim();
        }

        // Update settings object
        if (!organization.settings) {
            organization.settings = {};
        }

        if (logoUrl !== undefined) {
            organization.settings.logoUrl = logoUrl || null;
        }

        if (timeZone !== undefined) {
            // Validate timezone (basic validation)
            if (timeZone && typeof timeZone === 'string') {
                organization.settings.timeZone = timeZone;
            }
        }

        if (currency !== undefined) {
            // Validate currency code (basic validation - 3 uppercase letters)
            if (currency && /^[A-Z]{3}$/.test(currency)) {
                organization.settings.currency = currency;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid currency code. Must be a 3-letter ISO code (e.g., USD, EUR)'
                });
            }
        }

        if (locale !== undefined) {
            // Validate locale (basic validation - format like en-US)
            if (locale && typeof locale === 'string') {
                organization.settings.locale = locale;
            }
        }

        if (language !== undefined) {
            // Validate language code (basic validation - 2-3 letter code)
            if (language && /^[a-z]{2,3}$/i.test(language)) {
                organization.settings.language = language.toLowerCase();
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid language code. Must be a 2-3 letter ISO code (e.g., en, es, fr)'
                });
            }
        }

        await organization.save();

        // Return updated settings
        res.json({
            success: true,
            message: 'Organization settings updated successfully',
            data: {
                name: organization.name,
                logoUrl: organization.settings?.logoUrl || null,
                timeZone: organization.settings?.timeZone || 'UTC',
                currency: organization.settings?.currency || 'USD',
                locale: organization.settings?.locale || 'en-US',
                language: organization.settings?.language || 'en',
                dataRegion: organization.dataRegion || 'us-east-1',
                industry: organization.industry || null
            }
        });
    } catch (error) {
        console.error('Update organization settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update organization settings',
            error: error.message
        });
    }
};

/**
 * Get security settings
 * GET /api/settings/security
 */
exports.getSecuritySettings = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Return security configuration with defaults
        const security = organization.security || {};
        
        res.json({
            success: true,
            data: {
                passwordPolicy: {
                    minLength: security.passwordPolicy?.minLength || 8,
                    requireUppercase: security.passwordPolicy?.requireUppercase !== false,
                    requireLowercase: security.passwordPolicy?.requireLowercase !== false,
                    requireNumbers: security.passwordPolicy?.requireNumbers !== false,
                    requireSpecialChars: security.passwordPolicy?.requireSpecialChars || false,
                    expirationDays: security.passwordPolicy?.expirationDays || 90,
                    preventReuse: security.passwordPolicy?.preventReuse || 5
                },
                sessionRules: {
                    durationHours: security.sessionRules?.durationHours || 24,
                    idleTimeoutMinutes: security.sessionRules?.idleTimeoutMinutes || 30,
                    maxConcurrentSessions: security.sessionRules?.maxConcurrentSessions || 5
                },
                loginRestrictions: {
                    ipWhitelist: security.loginRestrictions?.ipWhitelist || [],
                    ipBlacklist: security.loginRestrictions?.ipBlacklist || [],
                    allowedRegions: security.loginRestrictions?.allowedRegions || [],
                    blockFailedAttempts: security.loginRestrictions?.blockFailedAttempts !== false,
                    maxFailedAttempts: security.loginRestrictions?.maxFailedAttempts || 5,
                    lockoutDurationMinutes: security.loginRestrictions?.lockoutDurationMinutes || 15
                },
                twoFactorAuth: {
                    enabled: security.twoFactorAuth?.enabled || false,
                    required: security.twoFactorAuth?.required || false,
                    methods: security.twoFactorAuth?.methods || ['totp']
                }
            }
        });
    } catch (error) {
        console.error('Get security settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch security settings',
            error: error.message
        });
    }
};

/**
 * Update security settings
 * PUT /api/settings/security
 */
exports.updateSecuritySettings = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const { passwordPolicy, sessionRules, loginRestrictions, twoFactorAuth } = req.body;

        // Initialize security object if it doesn't exist
        if (!organization.security) {
            organization.security = {};
        }

        // Update password policy
        if (passwordPolicy) {
            if (!organization.security.passwordPolicy) {
                organization.security.passwordPolicy = {};
            }
            if (passwordPolicy.minLength !== undefined) {
                if (passwordPolicy.minLength < 6 || passwordPolicy.minLength > 128) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password minimum length must be between 6 and 128 characters'
                    });
                }
                organization.security.passwordPolicy.minLength = passwordPolicy.minLength;
            }
            if (passwordPolicy.requireUppercase !== undefined) {
                organization.security.passwordPolicy.requireUppercase = passwordPolicy.requireUppercase;
            }
            if (passwordPolicy.requireLowercase !== undefined) {
                organization.security.passwordPolicy.requireLowercase = passwordPolicy.requireLowercase;
            }
            if (passwordPolicy.requireNumbers !== undefined) {
                organization.security.passwordPolicy.requireNumbers = passwordPolicy.requireNumbers;
            }
            if (passwordPolicy.requireSpecialChars !== undefined) {
                organization.security.passwordPolicy.requireSpecialChars = passwordPolicy.requireSpecialChars;
            }
            if (passwordPolicy.expirationDays !== undefined) {
                if (passwordPolicy.expirationDays < 0 || passwordPolicy.expirationDays > 365) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password expiration days must be between 0 (no expiration) and 365'
                    });
                }
                organization.security.passwordPolicy.expirationDays = passwordPolicy.expirationDays;
            }
            if (passwordPolicy.preventReuse !== undefined) {
                if (passwordPolicy.preventReuse < 0 || passwordPolicy.preventReuse > 24) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password reuse prevention must be between 0 and 24 previous passwords'
                    });
                }
                organization.security.passwordPolicy.preventReuse = passwordPolicy.preventReuse;
            }
        }

        // Update session rules
        if (sessionRules) {
            if (!organization.security.sessionRules) {
                organization.security.sessionRules = {};
            }
            if (sessionRules.durationHours !== undefined) {
                if (sessionRules.durationHours < 1 || sessionRules.durationHours > 168) {
                    return res.status(400).json({
                        success: false,
                        message: 'Session duration must be between 1 and 168 hours (7 days)'
                    });
                }
                organization.security.sessionRules.durationHours = sessionRules.durationHours;
            }
            if (sessionRules.idleTimeoutMinutes !== undefined) {
                if (sessionRules.idleTimeoutMinutes < 5 || sessionRules.idleTimeoutMinutes > 480) {
                    return res.status(400).json({
                        success: false,
                        message: 'Idle timeout must be between 5 and 480 minutes (8 hours)'
                    });
                }
                organization.security.sessionRules.idleTimeoutMinutes = sessionRules.idleTimeoutMinutes;
            }
            if (sessionRules.maxConcurrentSessions !== undefined) {
                if (sessionRules.maxConcurrentSessions < 1 || sessionRules.maxConcurrentSessions > 20) {
                    return res.status(400).json({
                        success: false,
                        message: 'Max concurrent sessions must be between 1 and 20'
                    });
                }
                organization.security.sessionRules.maxConcurrentSessions = sessionRules.maxConcurrentSessions;
            }
        }

        // Update login restrictions
        if (loginRestrictions) {
            if (!organization.security.loginRestrictions) {
                organization.security.loginRestrictions = {};
            }
            if (loginRestrictions.ipWhitelist !== undefined) {
                // Validate IP addresses (basic validation)
                if (Array.isArray(loginRestrictions.ipWhitelist)) {
                    organization.security.loginRestrictions.ipWhitelist = loginRestrictions.ipWhitelist;
                }
            }
            if (loginRestrictions.ipBlacklist !== undefined) {
                if (Array.isArray(loginRestrictions.ipBlacklist)) {
                    organization.security.loginRestrictions.ipBlacklist = loginRestrictions.ipBlacklist;
                }
            }
            if (loginRestrictions.allowedRegions !== undefined) {
                if (Array.isArray(loginRestrictions.allowedRegions)) {
                    organization.security.loginRestrictions.allowedRegions = loginRestrictions.allowedRegions;
                }
            }
            if (loginRestrictions.blockFailedAttempts !== undefined) {
                organization.security.loginRestrictions.blockFailedAttempts = loginRestrictions.blockFailedAttempts;
            }
            if (loginRestrictions.maxFailedAttempts !== undefined) {
                if (loginRestrictions.maxFailedAttempts < 1 || loginRestrictions.maxFailedAttempts > 10) {
                    return res.status(400).json({
                        success: false,
                        message: 'Max failed attempts must be between 1 and 10'
                    });
                }
                organization.security.loginRestrictions.maxFailedAttempts = loginRestrictions.maxFailedAttempts;
            }
            if (loginRestrictions.lockoutDurationMinutes !== undefined) {
                if (loginRestrictions.lockoutDurationMinutes < 1 || loginRestrictions.lockoutDurationMinutes > 1440) {
                    return res.status(400).json({
                        success: false,
                        message: 'Lockout duration must be between 1 and 1440 minutes (24 hours)'
                    });
                }
                organization.security.loginRestrictions.lockoutDurationMinutes = loginRestrictions.lockoutDurationMinutes;
            }
        }

        // Update two-factor authentication
        if (twoFactorAuth) {
            if (!organization.security.twoFactorAuth) {
                organization.security.twoFactorAuth = {};
            }
            if (twoFactorAuth.enabled !== undefined) {
                organization.security.twoFactorAuth.enabled = twoFactorAuth.enabled;
            }
            if (twoFactorAuth.required !== undefined) {
                // If requiring 2FA, it must be enabled first
                if (twoFactorAuth.required && !organization.security.twoFactorAuth.enabled) {
                    return res.status(400).json({
                        success: false,
                        message: 'Two-factor authentication must be enabled before it can be required'
                    });
                }
                organization.security.twoFactorAuth.required = twoFactorAuth.required;
            }
            if (twoFactorAuth.methods !== undefined) {
                if (Array.isArray(twoFactorAuth.methods)) {
                    const validMethods = ['totp', 'sms', 'email'];
                    const invalidMethods = twoFactorAuth.methods.filter(m => !validMethods.includes(m));
                    if (invalidMethods.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid 2FA methods: ${invalidMethods.join(', ')}. Valid methods are: ${validMethods.join(', ')}`
                        });
                    }
                    organization.security.twoFactorAuth.methods = twoFactorAuth.methods;
                }
            }
        }

        await organization.save();

        // Return updated settings
        res.json({
            success: true,
            message: 'Security settings updated successfully',
            data: {
                passwordPolicy: organization.security.passwordPolicy,
                sessionRules: organization.security.sessionRules,
                loginRestrictions: organization.security.loginRestrictions,
                twoFactorAuth: organization.security.twoFactorAuth
            }
        });
    } catch (error) {
        console.error('Update security settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update security settings',
            error: error.message
        });
    }
};

/**
 * Get security activity (login activity, failed attempts, audit events)
 * GET /api/settings/security/activity
 */
exports.getSecurityActivity = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // For now, return mock data since we don't have a dedicated security events collection
        // In production, this would query a SecurityEvent or AuditLog collection
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        
        // Mock security activity data
        // In a real implementation, this would query from a security events collection
        const activity = [
            {
                id: '1',
                type: 'LOGIN_SUCCESS',
                userEmail: 'user@example.com',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0...',
                status: 'success'
            },
            {
                id: '2',
                type: 'LOGIN_FAILED',
                userEmail: 'user@example.com',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0...',
                status: 'failed',
                reason: 'Invalid password'
            }
        ];

        res.json({
            success: true,
            data: {
                activity: activity.slice((page - 1) * limit, page * limit),
                total: activity.length,
                page: page,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Get security activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch security activity',
            error: error.message
        });
    }
};


/**
 * Get all integrations with organization state
 * GET /api/settings/integrations
 */
exports.getIntegrations = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const orgIntegrations = organization.integrations || {};

        const integrations = integrationRegistry.map((integration) => {
            const state = orgIntegrations[integration.key] || {};
            const enabled = state.enabled === true;
            const status = enabled ? (state.status || 'connected') : 'disconnected';
            const scopeLabel = integration.scope === 'platform' ? 'Platform-wide' : 'App-specific';

            return {
                key: integration.key,
                name: integration.name,
                description: integration.description,
                scope: integration.scope,
                scopeLabel,
                apps: integration.apps || [],
                category: integration.category,
                dataSharedSummary: integration.dataSharedSummary,
                recommended: integration.recommended === true,
                enabled,
                status,
                connectedAt: state.connectedAt || null,
                disconnectedAt: state.disconnectedAt || null
            };
        });

        res.json({
            success: true,
            integrations
        });
    } catch (error) {
        console.error('Get integrations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch integrations',
            error: error.message
        });
    }
};

/**
 * Get integration detail
 * GET /api/settings/integrations/:key
 */
exports.getIntegration = async (req, res) => {
    try {
        const { key } = req.params;
        const integration = integrationRegistry.find((i) => i.key === key);
        if (!integration) {
            return res.status(404).json({
                success: false,
                message: 'Integration not found'
            });
        }

        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const state = (organization.integrations || {})[integration.key] || {};
        const enabled = state.enabled === true;
        const status = enabled ? (state.status || 'connected') : 'disconnected';

        const payload = {
            key: integration.key,
            name: integration.name,
            description: integration.description,
            scope: integration.scope,
            apps: integration.apps || [],
            category: integration.category,
            dataSharedSummary: integration.dataSharedSummary,
            dataSharedDetails: integration.dataSharedDetails,
            recommended: integration.recommended === true,
            enabled,
            status,
            connectedAt: state.connectedAt || null,
            disconnectedAt: state.disconnectedAt || null
        };

        if (integration.key === emailService.EMAIL_PROVIDER_KEY) {
            payload.configStatus = emailService.isConfigured() ? 'configured' : 'not_configured';
        }

        res.json({
            success: true,
            integration: payload
        });
    } catch (error) {
        console.error('Get integration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch integration',
            error: error.message
        });
    }
};

/**
 * Enable integration (org-level)
 * POST /api/settings/integrations/:key/enable
 */
exports.enableIntegration = async (req, res) => {
    try {
        const { key } = req.params;
        const integration = integrationRegistry.find((i) => i.key === key);
        if (!integration) {
            return res.status(404).json({
                success: false,
                message: 'Integration not found'
            });
        }

        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const current = organization.integrations || {};
        const state = current[key] || {};
        const now = new Date();

        const nextState = {
            ...state,
            enabled: true,
            status: 'connected',
            connectedAt: now,
            disconnectedAt: state.disconnectedAt || null
        };

        organization.integrations = {
            ...current,
            [key]: nextState
        };

        await organization.save();

        res.json({
            success: true,
            message: 'Integration enabled successfully',
            integration: {
                key,
                enabled: true,
                status: 'connected',
                connectedAt: nextState.connectedAt
            }
        });
    } catch (error) {
        console.error('Enable integration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enable integration',
            error: error.message
        });
    }
};

/**
 * Test integration (e.g. send test email for email-provider)
 * POST /api/settings/integrations/:key/test
 */
exports.testIntegration = async (req, res) => {
    try {
        const { key } = req.params;
        if (key !== emailService.EMAIL_PROVIDER_KEY) {
            return res.status(400).json({
                success: false,
                message: 'Test not supported for this integration'
            });
        }

        const userEmail = req.user?.email;
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Your account has no email address. Add an email to your profile to receive test emails.'
            });
        }

        if (!emailService.isConfigured()) {
            return res.status(400).json({
                success: false,
                message: 'Email service is not configured. Add SMTP or AWS SES credentials to your environment.'
            });
        }

        const result = await emailService.sendEmail({
            to: userEmail,
            subject: 'LiteDesk – Test Email',
            text: 'This is a test email from LiteDesk. If you received this, your email integration is working.',
            html: '<p>This is a test email from LiteDesk.</p><p>If you received this, your email integration is working.</p>'
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: `Test email sent to ${userEmail}. Check your inbox (or Mailtrap if in dev).`
        });
    } catch (error) {
        console.error('Test integration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
};

/**
 * Disable integration (org-level)
 * POST /api/settings/integrations/:key/disable
 */
exports.disableIntegration = async (req, res) => {
    try {
        const { key } = req.params;
        const integration = integrationRegistry.find((i) => i.key === key);
        if (!integration) {
            return res.status(404).json({
                success: false,
                message: 'Integration not found'
            });
        }

        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const current = organization.integrations || {};
        const state = current[key] || {};
        const now = new Date();

        const nextState = {
            ...state,
            enabled: false,
            status: 'disconnected',
            disconnectedAt: now
        };

        organization.integrations = {
            ...current,
            [key]: nextState
        };

        await organization.save();

        res.json({
            success: true,
            message: 'Integration disabled successfully',
            integration: {
                key,
                enabled: false,
                status: 'disconnected',
                disconnectedAt: nextState.disconnectedAt
            }
        });
    } catch (error) {
        console.error('Disable integration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disable integration',
            error: error.message
        });
    }
};

/**
 * Get organization status-types configuration
 * GET /api/settings/core-modules/organizations/status-types
 * 
 * Returns tenant-specific configuration for organization types and status picklists.
 * If no tenant override exists, returns null (frontend will use module defaults).
 */
exports.getOrganizationStatusTypes = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        
        if (!organizationId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Find tenant module configuration for organizations module
        // Status-types configuration is module-level (not app-specific), so we check for any app key
        // Priority: SALES > HELPDESK > other apps (since organizations are primarily used in Sales context)
        const appPriority = ['SALES', 'HELPDESK', 'AUDIT', 'PORTAL', 'LMS'];
        let tenantConfig = null;
        
        for (const appKey of appPriority) {
            tenantConfig = await TenantModuleConfiguration.findOne({
                organizationId,
                appKey,
                moduleKey: 'organizations'
            }).lean();
            if (tenantConfig) break;
        }

        // Extract status-types configuration from settings
        const statusTypesConfig = tenantConfig?.settings?.statusTypes || null;

        console.log('[Backend] GET status-types - tenantConfig found:', !!tenantConfig);
        console.log('[Backend] GET status-types - Raw tenantConfig.settings:', JSON.stringify(tenantConfig?.settings, null, 2));
        console.log('[Backend] GET status-types - statusTypesConfig:', JSON.stringify(statusTypesConfig, null, 2));
        if (statusTypesConfig?.organizationTypes) {
            console.log('[Backend] GET status-types - Dealer enabled state:', statusTypesConfig.organizationTypes.find(t => t.value === 'Dealer')?.enabled);
            console.log('[Backend] GET status-types - Distributor enabled state:', statusTypesConfig.organizationTypes.find(t => t.value === 'Distributor')?.enabled);
        }

        if (!statusTypesConfig) {
            // No tenant override exists - return null to indicate use defaults
            console.log('[Backend] GET status-types - No config found, returning null');
            return res.json({
                success: true,
                data: null
            });
        }

        console.log('[Backend] GET status-types - Returning config:', {
            organizationTypes: statusTypesConfig.organizationTypes?.length || 0,
            customerStatus: statusTypesConfig.statusPicklists?.customerStatus?.length || 0,
            partnerStatus: statusTypesConfig.statusPicklists?.partnerStatus?.length || 0,
            vendorStatus: statusTypesConfig.statusPicklists?.vendorStatus?.length || 0
        });

        res.json({
            success: true,
            data: statusTypesConfig
        });
    } catch (error) {
        console.error('Get organization status-types error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get organization status-types',
            error: error.message
        });
    }
};

/**
 * Update organization status-types configuration
 * PATCH /api/settings/core-modules/organizations/status-types
 * 
 * Saves tenant-specific configuration for organization types and status picklists.
 * Stores in TenantModuleConfiguration.settings.statusTypes
 */
exports.updateOrganizationStatusTypes = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const { organizationTypes, statusPicklists } = req.body;
        
        if (!organizationId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Validate payload
        if (!organizationTypes || !statusPicklists) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payload: organizationTypes and statusPicklists are required'
            });
        }

        // Find or create tenant module configuration
        // Status-types configuration is module-level, so we store it in the first available config
        // Priority: SALES > HELPDESK > other apps
        const appPriority = ['SALES', 'HELPDESK', 'AUDIT', 'PORTAL', 'LMS'];
        let tenantConfig = null;
        
        for (const appKey of appPriority) {
            tenantConfig = await TenantModuleConfiguration.findOne({
                organizationId,
                appKey,
                moduleKey: 'organizations'
            });
            if (tenantConfig) break;
        }
        
        // If no config exists, create one with SALES as default appKey
        if (!tenantConfig) {
            tenantConfig = new TenantModuleConfiguration({
                organizationId,
                appKey: 'SALES',
                moduleKey: 'organizations',
                enabled: true
            });
        }

        if (!tenantConfig) {
            // Create new configuration
            tenantConfig = new TenantModuleConfiguration({
                organizationId,
                appKey: 'SALES', // Default app key for organizations module
                moduleKey: 'organizations',
                enabled: true,
                settings: {
                    statusTypes: {
                        organizationTypes,
                        statusPicklists
                    }
                }
            });
        } else {
            // Update existing configuration
            if (!tenantConfig.settings) {
                tenantConfig.settings = {};
            }
            console.log('[Backend] PATCH status-types - BEFORE update:', {
                hasSettings: !!tenantConfig.settings,
                hasStatusTypes: !!tenantConfig.settings.statusTypes,
                currentOrgTypes: tenantConfig.settings.statusTypes?.organizationTypes?.length || 0
            });
            
            // CRITICAL: For Mongoose Mixed types, we must markModified to ensure nested changes are saved
            tenantConfig.settings.statusTypes = {
                organizationTypes,
                statusPicklists
            };
            tenantConfig.markModified('settings'); // Mark the entire settings object as modified
            tenantConfig.markModified('settings.statusTypes'); // Also mark the nested statusTypes
            
            console.log('[Backend] PATCH status-types - AFTER update (before save):', {
                organizationTypes: tenantConfig.settings.statusTypes.organizationTypes?.length || 0,
                customerStatus: tenantConfig.settings.statusTypes.statusPicklists?.customerStatus?.length || 0,
                dealerEnabled: tenantConfig.settings.statusTypes.organizationTypes?.find(t => t.value === 'Dealer')?.enabled
            });
        }

        const saveResult = await tenantConfig.save();
        
        // CRITICAL: Reload from database to verify what was actually saved
        const savedConfig = await TenantModuleConfiguration.findById(tenantConfig._id).lean();
        console.log('[Backend] PATCH status-types - AFTER save (from DB - reloaded):', {
            organizationTypes: savedConfig?.settings?.statusTypes?.organizationTypes?.length || 0,
            dealerEnabled: savedConfig?.settings?.statusTypes?.organizationTypes?.find(t => t.value === 'Dealer')?.enabled,
            distributorEnabled: savedConfig?.settings?.statusTypes?.organizationTypes?.find(t => t.value === 'Distributor')?.enabled,
            fullDealerObject: savedConfig?.settings?.statusTypes?.organizationTypes?.find(t => t.value === 'Dealer')
        });
        console.log('[Backend] PATCH status-types - Full saved organizationTypes:', JSON.stringify(savedConfig?.settings?.statusTypes?.organizationTypes, null, 2));

        console.log('[Backend] PATCH status-types - Saved successfully:', {
            organizationTypes: organizationTypes?.length || 0,
            customerStatus: statusPicklists?.customerStatus?.length || 0,
            partnerStatus: statusPicklists?.partnerStatus?.length || 0,
            vendorStatus: statusPicklists?.vendorStatus?.length || 0
        });
        console.log('[Backend] PATCH status-types - Full saved data:', JSON.stringify({
            organizationTypes,
            statusPicklists
        }, null, 2));

        res.json({
            success: true,
            message: 'Organization status-types updated successfully',
            data: {
                organizationTypes,
                statusPicklists
            }
        });
    } catch (error) {
        console.error('Update organization status-types error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update organization status-types',
            error: error.message
        });
    }
};
