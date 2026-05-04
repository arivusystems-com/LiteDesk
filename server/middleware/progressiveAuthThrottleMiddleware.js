const { getRedisClient, isRedisConfigured } = require('../lib/redisClient');

const memoryAttempts = new Map();
const PREFIX = process.env.AUTH_THROTTLE_REDIS_PREFIX || 'litedesk:auth-throttle:';

const WINDOW_SECONDS = parseInt(process.env.AUTH_THROTTLE_WINDOW_SECONDS || '900', 10);
const DELAY_AFTER_ATTEMPTS = parseInt(process.env.AUTH_THROTTLE_DELAY_AFTER_ATTEMPTS || '3', 10);
const BLOCK_AFTER_ATTEMPTS = parseInt(process.env.AUTH_THROTTLE_BLOCK_AFTER_ATTEMPTS || '8', 10);
const BASE_DELAY_MS = parseInt(process.env.AUTH_THROTTLE_BASE_DELAY_MS || '500', 10);
const MAX_DELAY_MS = parseInt(process.env.AUTH_THROTTLE_MAX_DELAY_MS || '2000', 10);
let warnedRedisFallback = false;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getClientIp(req) {
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function normalizeEmail(req) {
    return String(req.body?.email || '').trim().toLowerCase() || 'unknown';
}

function getThrottleKey(req) {
    return `${PREFIX}ip:${getClientIp(req)}:email:${normalizeEmail(req)}`;
}

function incrementMemory(key) {
    const now = Date.now();
    const existing = memoryAttempts.get(key);
    if (!existing || existing.expiresAt <= now) {
        const entry = { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 };
        memoryAttempts.set(key, entry);
        return entry;
    }

    existing.count += 1;
    return existing;
}

async function incrementAttempts(key) {
    if (isRedisConfigured()) {
        try {
            const client = await getRedisClient({ component: 'auth-throttle' });
            if (client) {
                const result = await client.eval(
                    `
                    local current = redis.call("INCR", KEYS[1])
                    if current == 1 then
                        redis.call("EXPIRE", KEYS[1], ARGV[1])
                    end
                    local ttl = redis.call("TTL", KEYS[1])
                    return { current, ttl }
                    `,
                    {
                        keys: [key],
                        arguments: [String(WINDOW_SECONDS)],
                    }
                );

                return {
                    count: Number(result[0]),
                    resetSeconds: Math.max(Number(result[1]), 0),
                };
            }
        } catch (error) {
            if (!warnedRedisFallback) {
                warnedRedisFallback = true;
                console.warn('[auth-throttle] Redis unavailable; using in-memory fallback:', error.message);
            }
        }
    }

    const entry = incrementMemory(key);
    return {
        count: entry.count,
        resetSeconds: Math.ceil((entry.expiresAt - Date.now()) / 1000),
    };
}

async function resetAttempts(key) {
    memoryAttempts.delete(key);

    if (!isRedisConfigured()) return;

    try {
        const client = await getRedisClient({ component: 'auth-throttle' });
        if (client) {
            await client.del(key);
        }
    } catch (error) {
        if (!warnedRedisFallback) {
            warnedRedisFallback = true;
            console.warn('[auth-throttle] Redis unavailable during reset:', error.message);
        }
    }
}

function delayForAttempt(count) {
    if (count <= DELAY_AFTER_ATTEMPTS) return 0;
    const delaySteps = count - DELAY_AFTER_ATTEMPTS;
    return Math.min(BASE_DELAY_MS * delaySteps, MAX_DELAY_MS);
}

function setThrottleHeaders(res, count, resetSeconds) {
    res.setHeader('RateLimit-Limit', String(BLOCK_AFTER_ATTEMPTS));
    res.setHeader('RateLimit-Remaining', String(Math.max(BLOCK_AFTER_ATTEMPTS - count, 0)));
    res.setHeader('RateLimit-Reset', String(resetSeconds || WINDOW_SECONDS));
}

async function progressiveAuthThrottle(req, res, next) {
    if (process.env.AUTH_PROGRESSIVE_THROTTLE_ENABLED === 'false') {
        return next();
    }

    try {
        const key = getThrottleKey(req);
        const { count, resetSeconds } = await incrementAttempts(key);
        setThrottleHeaders(res, count, resetSeconds);

        if (count > BLOCK_AFTER_ATTEMPTS) {
            res.setHeader('Retry-After', String(resetSeconds || WINDOW_SECONDS));
            console.log('AUTH THROTTLE HIT:', getClientIp(req), req.originalUrl, {
                email: normalizeEmail(req),
                attempts: count,
            });
            return res.status(429).json({
                error: 'Too many login attempts, please try again later.',
                code: 'AUTH_THROTTLE_EXCEEDED',
            });
        }

        const delayMs = delayForAttempt(count);
        if (delayMs > 0) {
            await sleep(delayMs);
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resetAttempts(key).catch((error) => {
                    console.warn('[auth-throttle] Reset skipped:', error.message);
                });
            }
            return originalJson(body);
        };

        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    progressiveAuthThrottle,
};
