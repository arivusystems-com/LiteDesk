/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 * 
 * 🔓 SECURITY DISABLED FOR DEVELOPMENT
 * Set DISABLE_SECURITY=true in .env to bypass all rate limiting
 */

const rateLimit = require('express-rate-limit');

// 🔓 SECURITY DISABLED: Bypass all rate limiting
const SECURITY_DISABLED = process.env.DISABLE_SECURITY === 'true' || process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';
const bypassDisabled = process.env.BYPASS_RATE_LIMIT === 'false';

const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_WINDOW_MS = parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = parsePositiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100);
const AUTH_RATE_LIMIT_WINDOW_MS = parsePositiveInteger(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000
);
const AUTH_RATE_LIMIT_MAX_REQUESTS = parsePositiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    isProduction ? 5 : 30
);

const isHealthCheckPath = (req) => {
    const p = req.path || '';
    return (
        p === '/health' ||
        p === '/health/' ||
        p === '/health/live' ||
        p === '/health/ready' ||
        p === '/health/status' ||
        p === '/api/health'
    );
};

const hasBypassHeader = (req) => {
    const bypassHeader = req.headers['x-bypass-rate-limit'];
    const testHeader = req.headers['x-test-mode'];
    return bypassHeader === 'true' || testHeader === 'true';
};

const isAuthPath = (req) => {
    const originalUrl = req.originalUrl || '';
    const path = req.path || '';
    return originalUrl.startsWith('/api/auth/') || path.startsWith('/auth/');
};

const shouldBypassRateLimit = (req, { logContext } = {}) => {
    if (isProduction || bypassDisabled) {
        return false;
    }

    if (hasBypassHeader(req)) {
        if (logContext) {
            console.warn(`⚠️  [DEV] Rate limiting bypassed for ${logContext}`);
        }
        return true;
    }

    return false;
};

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for certain conditions
    skip: (req) => {
        // 🔓 BYPASS: Skip all rate limiting if security is disabled
        if (SECURITY_DISABLED) {
            return true;
        }
        
        if (shouldBypassRateLimit(req)) {
            return true;
        }

        // Auth routes have dedicated, stricter limiters mounted on authRoutes.
        return isHealthCheckPath(req) || isAuthPath(req);
    }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: AUTH_RATE_LIMIT_MAX_REQUESTS,
    message: {
        error: 'Too many login attempts from this IP, please try again after a few minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use IP + user identifier for better tracking
    keyGenerator: (req) => {
        return req.ip + (req.body?.email || '');
    },
    // DEVELOPMENT ONLY: Skip rate limiting if bypass header is present
    skip: (req) => {
        // 🔓 BYPASS: Skip all rate limiting if security is disabled
        if (SECURITY_DISABLED) {
            return true;
        }
        
        if (shouldBypassRateLimit(req, { logContext: `auth request from ${req.ip} (${req.body?.email || 'unknown user'})` })) {
            return true;
        }

        // Skip for health checks
        return isHealthCheckPath(req);
    }
});

// Strict rate limiter for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit to 3 password reset attempts per hour
    message: {
        error: 'Too many password reset attempts, please try again later.',
        code: 'PASSWORD_RESET_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development mode
    skip: (req) => {
        // 🔓 BYPASS: Skip all rate limiting if security is disabled
        if (SECURITY_DISABLED) {
            return true;
        }
        return process.env.NODE_ENV !== 'production';
    },
    keyGenerator: (req) => {
        return req.ip + (req.body?.email || '');
    }
});

// Strict rate limiter for registration
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit to 3 registrations per hour per IP
    message: {
        error: 'Too many registration attempts, please try again later.',
        code: 'REGISTRATION_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development mode
    skip: (req) => {
        return process.env.NODE_ENV !== 'production';
    }
});

// Strict rate limiter for sensitive operations (delete, update critical data)
const sensitiveOperationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit to 10 sensitive operations per 15 minutes
    message: {
        error: 'Too many sensitive operations, please try again later.',
        code: 'SENSITIVE_OPERATION_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development mode
    skip: (req) => {
        return process.env.NODE_ENV !== 'production';
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    passwordResetLimiter,
    registrationLimiter,
    sensitiveOperationLimiter
};
