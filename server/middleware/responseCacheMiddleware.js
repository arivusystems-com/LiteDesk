const { getRedisClient, isRedisConfigured } = require('../lib/redisClient');
const crypto = require('crypto');

const memoryCache = new Map();
const CACHE_APP_NAME = process.env.CACHE_APP_NAME || process.env.APP_NAME || 'arivu';
const CACHE_ENV = process.env.CACHE_ENV || process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const CACHE_PREFIX = process.env.RESPONSE_CACHE_REDIS_PREFIX || `${CACHE_APP_NAME}:${CACHE_ENV}:response-cache:`;
const DEFAULT_TTL_SECONDS = parseInt(process.env.RESPONSE_CACHE_TTL_SECONDS || '45', 10);
const MAX_CACHE_PAYLOAD_BYTES = parseInt(process.env.RESPONSE_CACHE_MAX_PAYLOAD_BYTES || String(128 * 1024), 10);
const TTL_JITTER_SECONDS = parseInt(process.env.RESPONSE_CACHE_TTL_JITTER_SECONDS || '10', 10);
const redisCacheRequired = process.env.RESPONSE_CACHE_REDIS_REQUIRED === 'true';
const CACHE_BUSTER_PARAMS = new Set(
    (process.env.RESPONSE_CACHE_IGNORED_QUERY_PARAMS || '_,_t,t,timestamp,cacheBust,cache_bust,cb,v')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);
const cacheObservabilityEnabled = process.env.RESPONSE_CACHE_LOG_HITS === 'true';
let warnedRedisReadFailure = false;
let warnedRedisWriteFailure = false;

function getUserCacheId(req) {
    return req.user?._id ? String(req.user._id) : null;
}

function getTenantCacheId(req) {
    const tenantId =
        req.organization?._id ||
        req.user?.organizationId?._id ||
        req.user?.organizationId ||
        req.headers['x-organization-id'];
    return tenantId ? String(tenantId) : null;
}

function shouldBypassCache(req) {
    const headerValue = String(req.headers['x-cache-bypass'] || '').toLowerCase();
    const queryValue = String(req.query?.noCache || req.query?.nocache || '').toLowerCase();
    return headerValue === 'true' || headerValue === '1' || queryValue === 'true' || queryValue === '1';
}

function normalizeQuery(req) {
    const entries = Object.entries(req.query || {})
        .filter(([key, value]) => !CACHE_BUSTER_PARAMS.has(key) && value !== undefined && value !== null)
        .map(([key, value]) => {
            const normalizedValue = Array.isArray(value)
                ? value.map((item) => String(item)).sort()
                : String(value);
            return [key, normalizedValue];
        })
        .sort(([a], [b]) => a.localeCompare(b));

    return JSON.stringify(entries);
}

function getRouteCacheId(req) {
    const routePath = req.route?.path ? String(req.route.path) : req.path;
    return `${req.method}:${req.baseUrl || ''}${routePath}`;
}

function logCacheResult(result, req, namespace) {
    if (!cacheObservabilityEnabled) return;
    console.log(`CACHE ${result}:`, getRouteCacheId(req), {
        namespace,
        query: normalizeQuery(req),
    });
}

function hashPart(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function getCacheScope(req, namespace) {
    const userId = getUserCacheId(req);
    const tenantId = getTenantCacheId(req);
    if (!userId || !tenantId) return null;

    return `${CACHE_PREFIX}${namespace}:tenant:${tenantId}:user:${userId}`;
}

function getCacheKey(req, namespace) {
    const scope = getCacheScope(req, namespace);
    if (!scope) return null;

    const route = hashPart(getRouteCacheId(req));
    const query = hashPart(normalizeQuery(req));
    return `${scope}:route:${route}:query:${query}`;
}

function getMemoryCache(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        memoryCache.delete(key);
        return null;
    }
    return entry.value;
}

function setMemoryCache(key, value, ttlSeconds) {
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}

function ttlWithJitter(ttlSeconds) {
    if (!TTL_JITTER_SECONDS || TTL_JITTER_SECONDS < 1) {
        return ttlSeconds;
    }
    return ttlSeconds + Math.floor(Math.random() * (TTL_JITTER_SECONDS + 1));
}

function serializeCacheValue(value) {
    const serialized = JSON.stringify(value);
    return {
        serialized,
        byteLength: Buffer.byteLength(serialized, 'utf8'),
    };
}

async function readCache(key) {
    if (isRedisConfigured()) {
        try {
            const client = await getRedisClient({ component: 'response-cache', required: redisCacheRequired });
            if (client) {
                const cached = await client.get(key);
                return cached ? JSON.parse(cached) : null;
            }
        } catch (error) {
            if (redisCacheRequired) throw error;
            if (!warnedRedisReadFailure) {
                warnedRedisReadFailure = true;
                console.warn('[response-cache] Redis read failed; falling back to memory:', error.message);
            }
        }
    }

    return getMemoryCache(key);
}

async function writeCache(key, value, ttlSeconds) {
    const { serialized, byteLength } = serializeCacheValue(value);
    if (byteLength > MAX_CACHE_PAYLOAD_BYTES) {
        return false;
    }

    const effectiveTtlSeconds = ttlWithJitter(ttlSeconds);

    if (isRedisConfigured()) {
        try {
            const client = await getRedisClient({ component: 'response-cache', required: redisCacheRequired });
            if (client) {
                await client.setEx(key, effectiveTtlSeconds, serialized);
                return true;
            }
        } catch (error) {
            if (redisCacheRequired) throw error;
            if (!warnedRedisWriteFailure) {
                warnedRedisWriteFailure = true;
                console.warn('[response-cache] Redis write failed; falling back to memory:', error.message);
            }
        }
    }

    setMemoryCache(key, value, effectiveTtlSeconds);
    return true;
}

function cacheJsonResponse({ namespace, ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
    if (!namespace) {
        throw new Error('cacheJsonResponse requires a namespace');
    }

    return async (req, res, next) => {
        if (req.method !== 'GET' || req.headers['cache-control'] === 'no-store') {
            return next();
        }

        if (shouldBypassCache(req)) {
            res.setHeader('X-Cache', 'BYPASS');
            logCacheResult('BYPASS', req, namespace);
            return next();
        }

        const key = getCacheKey(req, namespace);
        if (!key) {
            return next();
        }

        try {
            const cached = await readCache(key);
            if (cached) {
                logCacheResult('HIT', req, namespace);
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('Cache-Control', 'private, max-age=0');
                return res.status(cached.statusCode || 200).json(cached.body);
            }
        } catch (error) {
            return next(error);
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300 && body !== undefined) {
                writeCache(key, { statusCode: res.statusCode, body }, ttlSeconds)
                    .then((stored) => {
                        if (!stored) {
                            logCacheResult('SKIP_SIZE', req, namespace);
                        }
                    })
                    .catch((error) => {
                        console.warn('[response-cache] Cache write skipped:', error.message);
                    });
            }
            logCacheResult('MISS', req, namespace);
            res.setHeader('X-Cache', 'MISS');
            return originalJson(body);
        };

        return next();
    };
}

function invalidateCacheOnSuccessfulMutation({ namespace, getUserId = getUserCacheId } = {}) {
    if (!namespace) {
        throw new Error('invalidateCacheOnSuccessfulMutation requires a namespace');
    }

    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const userId = getUserId(req);
                const tenantId = getTenantCacheId(req);
                invalidateResponseCache({ namespace, userId, tenantId }).catch((error) => {
                    console.warn('[response-cache] Cache invalidation skipped:', error.message);
                });
            }
            return originalJson(body);
        };
        next();
    };
}

async function deleteMemoryByPrefix(prefix) {
    for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) {
            memoryCache.delete(key);
        }
    }
}

async function invalidateResponseCache({ namespace, userId, tenantId } = {}) {
    if (!namespace || !userId || !tenantId) return;
    const scope = `${CACHE_PREFIX}${namespace}:tenant:${tenantId}:user:${userId}`;

    if (isRedisConfigured()) {
        const client = await getRedisClient({ component: 'response-cache', required: redisCacheRequired });
        if (client) {
            const keys = [];
            for await (const key of client.scanIterator({ MATCH: `${scope}:*`, COUNT: 100 })) {
                keys.push(key);
                if (keys.length >= 100) {
                    await client.del(keys.splice(0, keys.length));
                }
            }
            if (keys.length) {
                await client.del(keys);
            }
        }
    }
    await deleteMemoryByPrefix(`${scope}:`);
}

module.exports = {
    cacheJsonResponse,
    invalidateCacheOnSuccessfulMutation,
    invalidateResponseCache,
};
