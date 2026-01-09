import { useAuthStore } from '@/stores/auth';

/**
 * Portal API Client
 * 
 * Centralized API client for Portal application endpoints.
 * Handles authentication and error handling for /portal/* routes.
 * 
 * Portal routes are proxied by Vite to the backend server.
 * These routes require:
 * - Authentication (Bearer token)
 * - Portal app context (appKey = PORTAL)
 * - Portal app entitlement
 */
const portalApiClient = async (url, options = {}) => {
  const authStore = useAuthStore();
  const token = authStore.user?.token;

  if (!token) {
    console.error('[PortalApiClient] No authentication token available');
    authStore.logout();
    throw new Error('Authentication required. Please log in again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  // Handle URL params for GET requests
  let fullUrl = url;
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
      console.error('[PortalApiClient] 401 Unauthorized - token may be invalid or expired');
      authStore.logout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const is404 = response.status === 404;
      let errorMessage = `HTTP error! Status: ${response.status}`;
      
      // For 404 errors, don't try to parse the response body
      if (is404) {
        const error = new Error(errorMessage);
        error.status = 404;
        error.is404 = true;
        throw error;
      }
      
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
          console.error('[PortalApiClient] Non-JSON response received:', textContent.substring(0, 200));
          errorMessage = `Server returned non-JSON response (${response.status}): ${textContent.substring(0, 100)}...`;
        } catch (textError) {
          // If even text reading fails, use status text
          errorMessage = `HTTP error! Status: ${response.status} ${response.statusText}`;
        }
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.is404 = false;
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
portalApiClient.get = (url, options = {}) => {
  return portalApiClient(url, { ...options, method: 'GET' });
};

portalApiClient.post = (url, data, options = {}) => {
  return portalApiClient(url, { ...options, method: 'POST', body: JSON.stringify(data) });
};

portalApiClient.put = (url, data, options = {}) => {
  return portalApiClient(url, { ...options, method: 'PUT', body: JSON.stringify(data) });
};

portalApiClient.patch = (url, data, options = {}) => {
  return portalApiClient(url, { ...options, method: 'PATCH', body: JSON.stringify(data) });
};

portalApiClient.delete = (url, options = {}) => {
  return portalApiClient(url, { ...options, method: 'DELETE' });
};

export default portalApiClient;

