/**
 * Authentication Service
 * Handles all authentication-related API calls and token management
 */

import api from './api.js';

// Token management
export const tokenManager = {
  getAccessToken: () => localStorage.getItem('authToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  getUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  
  setTokens: (accessToken, refreshToken, user) => {
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  clearTokens: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  
  isTokenExpired: (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
};

// Authentication service
export const authService = {
  /**
   * User login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login result
   */
  login: async (email, password) => {
    try {
      console.log('🔐 [authService] Login attempt:', { email });
      
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password
      });

      console.log('✅ [authService] Login response:', response);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        
        // Store tokens
        tokenManager.setTokens(accessToken, refreshToken, user);
        
        return {
          success: true,
          data: { user, accessToken, refreshToken },
          message: 'Login successful'
        };
      }

      return {
        success: false,
        error: response.message || 'Login failed'
      };
    } catch (error) {
      console.error('❌ [authService] Login failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Login failed'
      };
    }
  },

  /**
   * User logout
   * @returns {Promise<Object>} Logout result
   */
  logout: async () => {
    try {
      // Call server logout if token exists
      const token = tokenManager.getAccessToken();
      if (token) {
        try {
          await api.post('/auth/logout');
          console.log('✅ [authService] Server logout successful');
        } catch (error) {
          console.log('⚠️ [authService] Server logout failed:', error.message);
        }
      }

      // Clear local tokens regardless
      tokenManager.clearTokens();
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('❌ [authService] Logout error:', error);
      
      // Clear tokens even if server logout fails
      tokenManager.clearTokens();
      
      return {
        success: true, // Return success since local logout completed
        message: 'Logout completed'
      };
    }
  },

  /**
   * Refresh access token
   * @returns {Promise<Object>} Refresh result
   */
  refreshToken: async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken
      });

      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        const user = tokenManager.getUser();
        
        // Update stored tokens
        tokenManager.setTokens(accessToken, newRefreshToken, user);
        
        console.log('✅ [authService] Token refresh successful');
        
        return {
          success: true,
          data: { accessToken, refreshToken: newRefreshToken },
          message: 'Token refreshed successfully'
        };
      }

      throw new Error(response.message || 'Token refresh failed');
    } catch (error) {
      console.error('❌ [authService] Token refresh failed:', error);
      
      // Clear invalid tokens
      tokenManager.clearTokens();
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Token refresh failed'
      };
    }
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} Profile result
   */
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');

      if (response.success && response.data) {
        const { user } = response.data;
        
        // Update stored user data
        const tokens = {
          accessToken: tokenManager.getAccessToken(),
          refreshToken: tokenManager.getRefreshToken()
        };
        
        if (tokens.accessToken && tokens.refreshToken) {
          tokenManager.setTokens(tokens.accessToken, tokens.refreshToken, user);
        }
        
        return {
          success: true,
          data: { user },
          message: 'Profile retrieved successfully'
        };
      }

      return {
        success: false,
        error: response.message || 'Failed to retrieve profile'
      };
    } catch (error) {
      console.error('❌ [authService] Get profile failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Failed to retrieve profile'
      };
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile update data
   * @returns {Promise<Object>} Update result
   */
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);

      if (response.success && response.data) {
        const { user } = response.data;
        
        // Update stored user data
        const tokens = {
          accessToken: tokenManager.getAccessToken(),
          refreshToken: tokenManager.getRefreshToken()
        };
        
        if (tokens.accessToken && tokens.refreshToken) {
          tokenManager.setTokens(tokens.accessToken, tokens.refreshToken, user);
        }
        
        return {
          success: true,
          data: { user },
          message: 'Profile updated successfully'
        };
      }

      return {
        success: false,
        error: response.message || 'Profile update failed'
      };
    } catch (error) {
      console.error('❌ [authService] Update profile failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Profile update failed'
      };
    }
  },

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Change result
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      });

      if (response.success) {
        return {
          success: true,
          message: 'Password changed successfully'
        };
      }

      return {
        success: false,
        error: response.message || 'Password change failed'
      };
    } catch (error) {
      console.error('❌ [authService] Change password failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Password change failed'
      };
    }
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);

      if (response.success && response.data) {
        const { user } = response.data;
        
        return {
          success: true,
          data: { user },
          message: 'Registration successful'
        };
      }

      return {
        success: false,
        error: response.message || 'Registration failed'
      };
    } catch (error) {
      console.error('❌ [authService] Registration failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Registration failed'
      };
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    const token = tokenManager.getAccessToken();
    const user = tokenManager.getUser();
    
    return !!(token && user && !tokenManager.isTokenExpired(token));
  },

  /**
   * Get current user info
   * @returns {Object|null} User info or null
   */
  getCurrentUser: () => {
    return tokenManager.getUser();
  }
};

export default authService;