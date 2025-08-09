/**
 * Login Component
 * Handles user authentication with comprehensive error handling and validation
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import './Login.css';

const Login = ({ onLogin, onError }) => {
  const [formData, setFormData] = useState({
    email: 'admin@coldcaller.com', // Pre-filled for testing
    password: 'Admin@123'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);

  // Clear lock timer
  useEffect(() => {
    let timer;
    if (lockTime > 0) {
      timer = setInterval(() => {
        setLockTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 60000); // Update every minute
    }
    return () => clearInterval(timer);
  }, [lockTime]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      setErrors({ general: `Account is locked. Please try again in ${lockTime} minutes.` });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('🔐 Attempting login with:', { 
        email: formData.email, 
        passwordLength: formData.password.length 
      });

      const response = await api.post('/auth/login', {
        email: formData.email.trim(),
        password: formData.password
      });

      console.log('✅ Login response:', response);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        
        // Store tokens
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        console.log('🎯 Login successful, tokens stored');

        // Reset state
        setLoginAttempts(0);
        setIsLocked(false);
        setLockTime(0);

        // Call parent callback
        if (onLogin) {
          onLogin(user, accessToken);
        }

        return;
      } else {
        throw new Error(response.message || 'Login failed');
      }

    } catch (error) {
      console.error('❌ Login error:', error);

      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 401:
            if (data.error?.code === 'INVALID_CREDENTIALS') {
              const attemptsRemaining = data.error.attemptsRemaining;
              errorMessage = `Invalid email or password. ${attemptsRemaining > 0 ? `${attemptsRemaining} attempts remaining.` : ''}`;
              setLoginAttempts(prev => prev + 1);
            } else {
              errorMessage = 'Invalid email or password';
            }
            break;
            
          case 423:
            if (data.error?.code === 'ACCOUNT_LOCKED') {
              setIsLocked(true);
              setLockTime(data.error.lockTimeRemaining || 30);
              errorMessage = `Account is locked. Try again in ${data.error.lockTimeRemaining || 30} minutes.`;
            } else {
              errorMessage = 'Account is temporarily locked';
            }
            break;
            
          case 403:
            errorMessage = 'Account is deactivated. Please contact support.';
            break;
            
          case 429:
            errorMessage = 'Too many login attempts. Please try again later.';
            break;
            
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
            
          default:
            errorMessage = data.error?.message || errorMessage;
        }
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }

      setErrors({ general: errorMessage });
      
      if (onError) {
        onError(error, errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTestCredentials = () => {
    setFormData({
      email: 'admin@coldcaller.com',
      password: 'Admin@123'
    });
    setErrors({});
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Sign In</h2>
          <p>Welcome back to Cold Caller</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? 'error' : ''}
              disabled={loading}
              autoComplete="email"
              placeholder="Enter your email"
            />
            {errors.email && (
              <div className="error-message">{errors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
                disabled={loading}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <div className="error-message">{errors.password}</div>
            )}
          </div>

          <div className="login-actions">
            <button
              type="submit"
              className="login-button"
              disabled={loading || isLocked}
            >
              {loading ? 'Signing in...' : isLocked ? `Locked (${lockTime}m)` : 'Sign In'}
            </button>

            <button
              type="button"
              className="test-button"
              onClick={handleTestCredentials}
              disabled={loading}
            >
              Use Test Credentials
            </button>
          </div>

          <div className="login-info">
            <p>Test Credentials:</p>
            <code>admin@coldcaller.com / Admin@123</code>
          </div>
        </form>

        <div className="login-status">
          {loginAttempts > 0 && !isLocked && (
            <div className="warning">
              ⚠️ {loginAttempts} failed attempt{loginAttempts > 1 ? 's' : ''}. 
              Account will be locked after 5 attempts.
            </div>
          )}
          
          {isLocked && (
            <div className="error">
              🔒 Account is locked for {lockTime} more minute{lockTime !== 1 ? 's' : ''}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;