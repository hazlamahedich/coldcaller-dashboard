import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import authService from '../services/authService';

/**
 * LoginPage - User authentication interface
 * Features: Form validation, loading states, error handling, theme-aware styling
 */
const LoginPage = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Check if user is already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      console.log('🔓 User already authenticated, redirecting...');
      const redirect = location.state?.from?.pathname || '/';
      navigate(redirect, { replace: true });
    }
  }, [navigate, location]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field-specific validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error
    if (error) {
      setError('');
    }
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!authService.isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    const passwordValidation = authService.validatePassword(formData.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔐 Login form submitted');
    
    // Validate form
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await authService.login(formData.email, formData.password);
      
      if (result.success) {
        console.log('✅ Login successful, redirecting...');
        
        // Get redirect path from location state or default to dashboard
        const redirectTo = location.state?.from?.pathname || '/';
        
        // Navigate to the intended page
        navigate(redirectTo, { replace: true });
      } else {
        console.warn('❌ Login failed:', result.message);
        setError(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle demo login (for development)
  const handleDemoLogin = async () => {
    console.log('🎭 Demo login initiated');
    
    setLoading(true);
    setError('');
    
    // Use admin credentials for demo
    setFormData({
      email: 'admin@coldcaller.com',
      password: 'admin123'
    });
    
    try {
      const result = await authService.login('admin@coldcaller.com', 'admin123');
      
      if (result.success) {
        console.log('✅ Demo login successful');
        navigate('/', { replace: true });
      } else {
        console.warn('❌ Demo login failed:', result.message);
        setError(result.message || 'Demo login failed');
      }
    } catch (error) {
      console.error('💥 Demo login error:', error);
      setError('Demo login failed. Please try manual login.');
    } finally {
      setLoading(false);
    }
  };

  // Get input field classes with theme and error states
  const getInputClasses = (fieldName) => {
    const baseClasses = `w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200 ${themeClasses.focusRing} ${themeClasses.focusVisible}`;
    const hasError = validationErrors[fieldName];
    
    if (hasError) {
      return `${baseClasses} ${
        isDarkMode 
          ? 'bg-gray-800 border-red-500 text-white placeholder-gray-400 focus:border-red-400' 
          : 'bg-white border-red-500 text-gray-900 placeholder-gray-500 focus:border-red-400'
      }`;
    }
    
    return `${baseClasses} ${themeClasses.input} focus:border-blue-500`;
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${themeClasses.bg}`}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-6">
            <span className="text-3xl">📞</span>
          </div>
          <h2 className={`text-3xl font-bold ${themeClasses.textPrimary}`}>
            ColdCaller Login
          </h2>
          <p className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
            Sign in to your account to start calling
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* General Error */}
          {error && (
            <div className={`rounded-md p-4 border ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-700 text-red-200' 
                : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              <div className="flex">
                <span className="text-lg mr-2">⚠️</span>
                <div>
                  <p className="text-sm font-medium">Login Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={getInputClasses('email')}
                  placeholder="admin@coldcaller.com"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className={`text-sm ${themeClasses.textMuted}`}>📧</span>
                </div>
              </div>
              {validationErrors.email && (
                <p className={`mt-1 text-sm ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={getInputClasses('password')}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 right-0 flex items-center pr-3 ${themeClasses.textMuted} hover:${themeClasses.textSecondary}`}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <span className="text-sm">
                    {showPassword ? '🙈' : '👁️'}
                  </span>
                </button>
              </div>
              {validationErrors.password && (
                <p className={`mt-1 text-sm ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {validationErrors.password}
                </p>
              )}
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={`h-4 w-4 rounded border ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-800 text-blue-400 focus:ring-blue-400 focus:ring-offset-gray-900' 
                    : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white'
                } focus:ring-2 focus:ring-offset-2`}
                disabled={loading}
              />
              <label htmlFor="remember-me" className={`ml-2 block text-sm ${themeClasses.textSecondary}`}>
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <button
                type="button"
                className={`font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 ${themeClasses.focusVisible}`}
                disabled={loading}
                onClick={() => {
                  // In a real app, this would open a password reset modal/page
                  alert('Password reset functionality would be implemented here');
                }}
              >
                Forgot password?
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors duration-200 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } ${themeClasses.focusVisible}`}
            >
              {loading && (
                <div className="absolute left-3 inset-y-0 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                </div>
              )}
              <span className={loading ? 'ml-6' : ''}>
                {loading ? 'Signing in...' : 'Sign in'}
              </span>
            </button>

            {/* Demo Login Button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border text-sm font-medium rounded-md transition-colors duration-200 ${
                loading
                  ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : themeClasses.buttonSecondary
              } ${themeClasses.focusVisible}`}
            >
              <span className="mr-2">🎭</span>
              {loading ? 'Please wait...' : 'Demo Login (admin@coldcaller.com)'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className={`text-xs ${themeClasses.textMuted}`}>
            ColdCaller Platform v2.0 • Secure Authentication
          </p>
          <div className="mt-2 flex justify-center space-x-4">
            <span className={`text-xs ${
              authService.isAuthenticated() 
                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                : isDarkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              {authService.isAuthenticated() ? '🔐 Authenticated' : '🔓 Not authenticated'}
            </span>
          </div>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className={`mt-6 p-4 rounded-lg border ${
            isDarkMode 
              ? 'bg-yellow-900/20 border-yellow-700 text-yellow-200' 
              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
          }`}>
            <div className="flex">
              <span className="text-lg mr-2">ℹ️</span>
              <div>
                <p className="text-sm font-medium">Development Mode</p>
                <p className="text-sm mt-1">
                  Demo credentials: admin@coldcaller.com / admin123<br/>
                  Backend API: {process.env.REACT_APP_API_URL || 'http://localhost:3001'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;