import { getApiUrlForFetch } from '@/config/apiBase';
import { useAuthStore } from '@/stores/authRegistry';

const apiClient = async (url, options = {}) => {
    const authStore = useAuthStore();
    const token = authStore.user?.token; // Get token from Pinia store

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
        const queryString = new URLSearchParams(options.params).toString();
        fullUrl += `?${queryString}`;
    }

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

        return response.json();
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
    }
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

export default apiClient;