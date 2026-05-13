# 🔓 Security Disabled for Development

All security measures have been temporarily disabled to focus on feature development.

## What's Disabled:

1. ✅ **Authentication** - `protect` middleware bypasses JWT verification
2. ✅ **Rate Limiting** - All rate limiters are bypassed
3. ✅ **Permission Checks** - All `checkPermission` calls pass through
4. ✅ **Organization Isolation** - No organization verification
5. ✅ **Trial Status Checks** - Trial expiration checks bypassed
6. ✅ **Feature Access Checks** - All features are accessible
7. ✅ **Security Headers** - Security headers middleware disabled

## How It Works:

- When `NODE_ENV !== 'production'` OR `DISABLE_SECURITY=true` in `.env`, all security is bypassed
- A dummy user with owner permissions is automatically created for requests
- Console warnings show when security is bypassed (look for `⚠️ [DEV]` messages)

## To Re-enable Security:

1. Set `NODE_ENV=production` in your `.env` file
2. OR remove/comment out `DISABLE_SECURITY=true` from `.env`
3. Restart the server

## Files Modified:

- `server/middleware/authMiddleware.js` - Bypasses authentication
- `server/middleware/rateLimitMiddleware.js` - Bypasses all rate limiting
- `server/middleware/permissionMiddleware.js` - Bypasses all permission checks
- `server/middleware/organizationMiddleware.js` - Bypasses organization/trial/feature checks
- `server/server.js` - Disables security headers middleware

## Current Status:

🔓 **SECURITY DISABLED** - All requests are allowed without authentication or permission checks.

⚠️ **WARNING**: This should ONLY be used in development. Never deploy with security disabled!

