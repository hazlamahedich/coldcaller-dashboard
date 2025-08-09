/**
 * Authentication Context
 * Provides authentication state and methods across the application
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api.js';

// Action types for auth reducer
const AuthActions = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN_SUCCESS: 'REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE: 'REFRESH_TOKEN_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING'
};

// Initial auth state
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  lastLogin: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActions.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AuthActions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastLogin: new Date().toISOString()
      };

    case AuthActions.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error
      };

    case AuthActions.LOGOUT:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastLogin: null
      };

    case AuthActions.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        error: null
      };

    case AuthActions.REFRESH_TOKEN_FAILURE:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: action.payload.error
      };

    case AuthActions.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload.user }
      };

    case AuthActions.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AuthActions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.loading
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    initializeAuth();
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (state.refreshToken) {
      const interval = setInterval(() => {
        refreshAccessToken();
      }, 23 * 60 * 60 * 1000); // Refresh every 23 hours

      return () => clearInterval(interval);
    }
  }, [state.refreshToken]);

  const initializeAuth = async () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedRefreshToken && storedUser) {
        const user = JSON.parse(storedUser);
        
        // Verify token is still valid by calling profile endpoint
        try {
          const response = await api.get('/auth/profile');
          if (response.success) {
            dispatch({
              type: AuthActions.LOGIN_SUCCESS,
              payload: {
                user: response.data.user,
                accessToken: storedToken,
                refreshToken: storedRefreshToken
              }
            });
            return;
          }
        } catch (error) {
          // Token might be expired, try to refresh
          console.log('🔄 Stored token invalid, attempting refresh...');
          const refreshResult = await refreshAccessToken();
          if (refreshResult) {
            return;
          }
        }
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
    }

    // Clear invalid tokens and set not loading
    clearStoredAuth();
    dispatch({ type: AuthActions.SET_LOADING, payload: { loading: false } });
  };

  const login = async (email, password) => {
    dispatch({ type: AuthActions.LOGIN_START });

    try {
      console.log('🔐 AuthContext: Attempting login...');
      const response = await api.post('/auth/login', { email, password });

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // Store tokens in localStorage
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        dispatch({
          type: AuthActions.LOGIN_SUCCESS,
          payload: { user, accessToken, refreshToken }
        });

        console.log('✅ AuthContext: Login successful');
        return { success: true, user };
      }

      throw new Error(response.message || 'Login failed');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed';
      
      dispatch({
        type: AuthActions.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });

      console.error('❌ AuthContext: Login failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint if authenticated
      if (state.isAuthenticated) {
        try {
          await api.post('/auth/logout');
          console.log('✅ Server logout successful');
        } catch (error) {
          console.log('⚠️ Server logout failed (proceeding with local logout):', error.message);
        }
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      // Clear local storage and state regardless of server response
      clearStoredAuth();
      dispatch({ type: AuthActions.LOGOUT });
      console.log('✅ Local logout completed');
    }
  };

  const refreshAccessToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken: storedRefreshToken
      });

      if (response.success && response.data) {
        const { accessToken, refreshToken } = response.data;

        // Update stored tokens
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        dispatch({
          type: AuthActions.REFRESH_TOKEN_SUCCESS,
          payload: { accessToken, refreshToken }
        });

        console.log('✅ Token refresh successful');
        return true;
      }

      throw new Error(response.message || 'Token refresh failed');
    } catch (error) {
      console.error('❌ Token refresh failed:', error);

      dispatch({
        type: AuthActions.REFRESH_TOKEN_FAILURE,
        payload: { error: error.message || 'Token refresh failed' }
      });

      clearStoredAuth();
      return false;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);

      if (response.success && response.data) {
        const updatedUser = response.data.user;
        
        // Update stored user
        localStorage.setItem('user', JSON.stringify(updatedUser));

        dispatch({
          type: AuthActions.UPDATE_USER,
          payload: { user: updatedUser }
        });

        console.log('✅ Profile updated successfully');
        return { success: true, user: updatedUser };
      }

      throw new Error(response.message || 'Profile update failed');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Profile update failed';
      console.error('❌ Profile update failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      });

      if (response.success) {
        console.log('✅ Password changed successfully');
        return { success: true };
      }

      throw new Error(response.message || 'Password change failed');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Password change failed';
      console.error('❌ Password change failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const clearStoredAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const clearError = () => {
    dispatch({ type: AuthActions.CLEAR_ERROR });
  };

  // Auth context value
  const value = {
    // State
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    lastLogin: state.lastLogin,
    
    // Methods
    login,
    logout,
    refreshAccessToken,
    updateProfile,
    changePassword,
    clearError,
    
    // Computed properties
    hasRole: (role) => state.user?.role === role,
    isAdmin: () => ['SUPER_ADMIN', 'ADMIN'].includes(state.user?.role),
    isAgent: () => state.user?.role === 'AGENT',
    getFullName: () => state.user ? `${state.user.firstName} ${state.user.lastName}` : '',
    
    // Auth status helpers
    isExpired: () => {
      if (!state.accessToken) return true;
      try {
        const payload = JSON.parse(atob(state.accessToken.split('.')[1]));
        return Date.now() >= payload.exp * 1000;
      } catch {
        return true;
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;