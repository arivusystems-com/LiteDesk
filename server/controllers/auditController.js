/**
 * ============================================================================
 * Audit Application Controller
 * ============================================================================
 * 
 * Minimal controller for Audit application (App #3).
 * Provides basic user and organization information for audit users.
 * 
 * Features:
 * - User profile (GET /audit/me)
 * - Organization summary (GET /audit/org)
 * - Health check (GET /audit/health)
 * 
 * This is a skeleton implementation. Future audit-specific logic will be added here.
 * 
 * ============================================================================
 */

const User = require('../models/User');
const Organization = require('../models/Organization');

/**
 * GET /audit/me
 * Returns authenticated user profile for Audit
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password') // Exclude password
            .populate('organizationId', 'name industry settings')
            .populate('roleId', 'name description color icon level')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Return minimal user profile for Audit
        res.json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                avatar: user.avatar,
                role: user.role,
                roleId: user.roleId,
                organization: {
                    _id: user.organizationId?._id,
                    name: user.organizationId?.name,
                    industry: user.organizationId?.industry
                }
            }
        });
    } catch (error) {
        console.error('[AuditController] Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /audit/org
 * Returns organization summary for Audit
 */
exports.getOrg = async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId)
            .select('name industry settings isActive')
            .lean();

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Return minimal organization summary for Audit
        res.json({
            success: true,
            data: {
                _id: organization._id,
                name: organization.name,
                industry: organization.industry,
                isActive: organization.isActive,
                settings: {
                    dateFormat: organization.settings?.dateFormat || 'MM/DD/YYYY',
                    timeZone: organization.settings?.timeZone || 'UTC',
                    currency: organization.settings?.currency || 'USD'
                }
            }
        });
    } catch (error) {
        console.error('[AuditController] Error fetching organization:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching organization',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /audit/health
 * Audit-specific health check endpoint
 */
exports.getHealth = async (req, res) => {
    try {
        // Basic health check - verify user and organization exist
        const user = await User.findById(req.user._id).select('_id email').lean();
        const organization = await Organization.findById(req.user.organizationId).select('_id name isActive').lean();

        res.json({
            success: true,
            status: 'healthy',
            app: 'AUDIT',
            timestamp: new Date().toISOString(),
            user: {
                authenticated: !!user,
                userId: user?._id,
                email: user?.email
            },
            organization: {
                found: !!organization,
                organizationId: organization?._id,
                name: organization?.name,
                isActive: organization?.isActive
            }
        });
    } catch (error) {
        console.error('[AuditController] Health check error:', error);
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            app: 'AUDIT',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
};

