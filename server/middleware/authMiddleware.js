// 🔓 OPTIONAL AUTH BYPASS (explicit opt-in only)
// Set DISABLE_SECURITY=true in .env to bypass all security checks.
// IMPORTANT: Do NOT disable security by default in development, otherwise the backend will
// impersonate the first user in the DB and the frontend may "switch users" on refresh
// (e.g., during /api/users/profile refresh).
const SECURITY_DISABLED = process.env.DISABLE_SECURITY === 'true';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    // 🔓 BYPASS: Security disabled - create dummy user
    if (SECURITY_DISABLED) {
        // If a Bearer token is provided, honor it even in dev-bypass mode.
        // This prevents confusing "user switches" on refresh when multiple users log in locally.
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            // fall through to normal auth below
        } else {
        console.warn('⚠️  [DEV] Security disabled - bypassing authentication');
        
        // Try to find first user in database as dummy user, or create minimal user object
        try {
            const dummyUser = await User.findOne().lean();
            if (dummyUser) {
                req.user = dummyUser;
                req.user.organizationId = dummyUser.organizationId || dummyUser._id;
                req.user.isOwner = true; // Grant all permissions
                req.user.role = 'owner';
                req.user.permissions = {}; // Empty permissions = all allowed
            } else {
                // No users exist yet - create minimal user object
                req.user = {
                    _id: new require('mongoose').Types.ObjectId(),
                    organizationId: new require('mongoose').Types.ObjectId(),
                    isOwner: true,
                    role: 'owner',
                    permissions: {}
                };
            }
        } catch (error) {
            // If we can't find a user, create minimal object
            const mongoose = require('mongoose');
            req.user = {
                _id: new mongoose.Types.ObjectId(),
                organizationId: new mongoose.Types.ObjectId(),
                isOwner: true,
                role: 'owner',
                permissions: {}
            };
        }
        return next();
        }
    }

    // 🔒 SECURITY ENABLED: Original authentication logic
    let token;

    // SECURITY: Ensure JWT_SECRET is set - fail hard if not configured
    if (!process.env.JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET environment variable is not set!');
        return res.status(500).json({ 
            message: 'Server configuration error. Please contact support.',
            code: 'SERVER_CONFIG_ERROR'
        });
    }

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header (Bearer <token>)
            token = req.headers.authorization.split(' ')[1];

            // Verify token with configured secret (no fallback for security)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user to the request object (without the password hash)
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }
            
            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        // No token provided
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };