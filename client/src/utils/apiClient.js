import { getApiUrlForFetch } from '@/config/apiBase';
import { useAuthStore } from '@/stores/authRegistry';

// Request deduplication: map of in-flight requests by URL+method
const _inFlightRequests = new Map();
const _metadataResponseCache = new Map();

const METADATA_CACHE_TTL_MS = 5 * 60 * 1000;
const CACHEABLE_GET_PATHS = [
    /^\/modules(?:$|\?)/,
    /^\/settings\/core-modules(?:$|\/|\?)/,
    /^\/ui\/apps(?:$|\/|\?)/,
    /^\/ui\/entities(?:$|\?)/,
    /^\/ui\/routes(?:$|\?)/,
];

const INVALIDATING_PATHS = [
    /^\/modules(?:$|\/|\?)/,
    /^\/settings\/core-modules(?:$|\/|\?)/,
    /^\/ui(?:$|\/|\?)/,
];

function authSessionKey(authStore) {
    const user = authStore.user || {};
    const orgId =
        user.organizationId ||
        authStore.organization?._id ||
        user.organization?._id ||
        '';
    return `${user._id || ''}:${orgId}`;
}

function normalizeParams(params = {}) {
    const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null);
    if (!entries.length) return '';
    return new URLSearchParams(entries.sort(([a], [b]) => a.localeCompare(b))).toString();
}

function getPathWithSearch(fullUrl) {
    try {
        const parsed = new URL(fullUrl, window.location.origin);
        return `${parsed.pathname.replace(/^\/api/, '')}${parsed.search || ''}`;
    } catch {
        return String(fullUrl || '').replace(/^\/api/, '');
    }
}

function isCacheableMetadataGet(pathWithSearch) {
    return CACHEABLE_GET_PATHS.some((pattern) => pattern.test(pathWithSearch));
}

function invalidatesMetadata(pathWithSearch) {
    return INVALIDATING_PATHS.some((pattern) => pattern.test(pathWithSearch));
}

function clearMetadataResponseCache() {
    _metadataResponseCache.clear();
}

const apiClient = async (url, options = {}) => {
    const authStore = useAuthStore();
    const token = authStore.user?.token; // Get token from Pinia store
    const sessionKey = authSessionKey(authStore);

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        // Attach the JWT to the request header for protected routes
        headers['Authorization'] = `Bearer ${token}`; 
    }

    // Handle URL params for GET requests
    let fullUrl = getApiUrlForFetch(url);
    if (options.params) {
        const queryString = normalizeParams(options.params);
        if (queryString) {
            fullUrl += `?${queryString}`;
        }
    }

    // Request deduplication: only dedupe GET requests (safe idempotent operations)
    const method = options.method || 'GET';
    const pathWithSearch = getPathWithSearch(fullUrl);
    const cacheableMetadataGet = method === 'GET' && isCacheableMetadataGet(pathWithSearch) && options.cache !== 'no-store';
    const requestKey = `${sessionKey}:${method}:${fullUrl}`;
    
    if (cacheableMetadataGet) {
        const cached = _metadataResponseCache.get(requestKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }
        if (cached) {
            _metadataResponseCache.delete(requestKey);
        }
    }
    
    if (method === 'GET' && _inFlightRequests.has(requestKey)) {
        console.log(`[apiClient] Returning cached in-flight request: ${requestKey}`);
        return _inFlightRequests.get(requestKey);
    }

    if (method !== 'GET' && invalidatesMetadata(pathWithSearch)) {
        clearMetadataResponseCache();
    }

    const requestPromise = (async () => {
        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers,
                body: options.body,
            });

            if (response.status === 401) {
                // If unauthorized, force logout
                authStore.logout();
                throw new Error('Session expired. Please log in again.');
            }

            // Check for other errors
            if (!response.ok) {
                const is404 = response.status === 404;
                let errorMessage = `HTTP error! Status: ${response.status}`;
                let errorData = null;
                try {
                    // Clone response before reading to avoid "body stream already read" error
                    const clonedResponse = response.clone();
                    errorData = await clonedResponse.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    // If response is not JSON (e.g., HTML error page), get text content
                    try {
                        const clonedResponse = response.clone();
                        const textContent = await clonedResponse.text();
                        console.error('Non-JSON response received:', textContent.substring(0, 200));
                        errorMessage = `Server returned non-JSON response (${response.status}): ${textContent.substring(0, 100)}...`;
                    } catch (textError) {
                        // If even text reading fails, use status text
                        errorMessage = `HTTP error! Status: ${response.status} ${response.statusText}`;
                    }
                }
                
                const error = new Error(errorMessage);
                error.status = response.status;
                error.is404 = is404;
                // Attach response data for 400 errors (validation errors)
                if (errorData) {
                    error.response = { data: errorData };
                }
                throw error;
            }

            const data = await response.json();
            if (cacheableMetadataGet) {
                _metadataResponseCache.set(requestKey, {
                    data,
                    expiresAt: Date.now() + METADATA_CACHE_TTL_MS
                });
            }
            return data;
        } catch (error) {
            // Re-throw if it's already our custom error
            if (error.status !== undefined) {
                throw error;
            }
            // For network errors or other issues, wrap them
            const wrappedError = new Error(error.message || 'Network error');
            wrappedError.status = 0;
            wrappedError.is404 = false;
            throw wrappedError;
        } finally {
            // Clean up the in-flight request map
            if (method === 'GET') {
                _inFlightRequests.delete(requestKey);
            }
        }
    })();

    // Store the promise for GET requests to deduplicate
    if (method === 'GET') {
        _inFlightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
};

// Add convenient methods
apiClient.get = (url, options = {}) => {
    return apiClient(url, { ...options, method: 'GET' });
};

/**
 * GET that returns null on 404 or 403 instead of throwing.
 * Use when the missing/forbidden case is expected (e.g. enriching related records that may be deleted or inaccessible).
 */
apiClient.getOptional = (url, options = {}) => {
    return apiClient(url, { ...options, method: 'GET' }).catch((err) => {
        if (err?.status === 404 || err?.status === 403) return null;
        throw err;
    });
};

apiClient.post = (url, data, options = {}) => {
    return apiClient(url, { ...options, method: 'POST', body: JSON.stringify(data) });
};

apiClient.put = (url, data, options = {}) => {
    return apiClient(url, { ...options, method: 'PUT', body: JSON.stringify(data) });
};

apiClient.patch = (url, data, options = {}) => {
    return apiClient(url, { ...options, method: 'PATCH', body: JSON.stringify(data) });
};

apiClient.delete = (url, options = {}) => {
    return apiClient(url, { ...options, method: 'DELETE' });
};

apiClient.clearMetadataResponseCache = clearMetadataResponseCache;

export default apiClient;
