/**
 * Base API Configuration
 * Centralized axios configuration for all API calls
 */

import axios from 'axios';

// API Base URL - Environment-based configuration
const getBaseURL = () => {
  // In production, this would come from environment variables
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  return `${apiUrl}/api`;
};

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth, logging, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle global errors, logging
apiClient.interceptors.response.use(
  (response) => {
    // Log API responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    // Handle common error cases
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle specific error status codes
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          localStorage.removeItem('authToken');
          // In a real app, you'd redirect to login page
          console.warn('🔒 Unauthorized access - please log in again');
          break;
        case 403:
          console.warn('🚫 Forbidden - insufficient permissions');
          break;
        case 404:
          console.warn('🔍 Resource not found');
          break;
        case 500:
          console.error('🔥 Server error - please try again later');
          break;
        default:
          console.error(`❌ API Error ${status}:`, data.message || 'Unknown error');
      }
    } else if (error.request) {
      // Network error
      console.error('🌐 Network Error - check your connection:', error.message);
    } else {
      // Other error
      console.error('❌ Unexpected Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Retry logic for failed requests
const retryRequest = async (originalRequest, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return await apiClient(originalRequest);
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.log(`🔄 Retrying request (${i + 1}/${retries})...`);
    }
  }
};

// API utility functions
export const api = {
  // GET request with optional retry
  get: async (url, config = {}, withRetry = false) => {
    try {
      const response = await apiClient.get(url, config);
      return response.data;
    } catch (error) {
      if (withRetry) {
        const response = await retryRequest({ method: 'get', url, ...config });
        return response.data;
      }
      throw error;
    }
  },
  
  // POST request with optional retry
  post: async (url, data = {}, config = {}, withRetry = false) => {
    try {
      const response = await apiClient.post(url, data, config);
      return response.data;
    } catch (error) {
      if (withRetry) {
        const response = await retryRequest({ method: 'post', url, data, ...config });
        return response.data;
      }
      throw error;
    }
  },
  
  // PUT request with optional retry
  put: async (url, data = {}, config = {}, withRetry = false) => {
    try {
      const response = await apiClient.put(url, data, config);
      return response.data;
    } catch (error) {
      if (withRetry) {
        const response = await retryRequest({ method: 'put', url, data, ...config });
        return response.data;
      }
      throw error;
    }
  },
  
  // DELETE request with optional retry
  delete: async (url, config = {}, withRetry = false) => {
    try {
      const response = await apiClient.delete(url, config);
      return response.data;
    } catch (error) {
      if (withRetry) {
        const response = await retryRequest({ method: 'delete', url, ...config });
        return response.data;
      }
      throw error;
    }
  },
  
  // Health check endpoint
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('🏥 API Health Check Failed:', error);
      return { status: 'error', message: 'API unavailable' };
    }
  }
};

// Export for direct axios usage if needed
export { apiClient };
export default api;