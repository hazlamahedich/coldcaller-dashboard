/**
 * Authentication Controller
 * Handles user authentication, registration, and session management
 */

const { 
  hashPassword, 
  comparePassword, 
  generateTokens, 
  verifyRefreshToken,
  securityLogger,
  ROLES 
} = require('../middleware/auth');
const ResponseFormatter = require('../utils/responseFormatter');

// TODO: Replace with actual User model when database is set up
// This is a temporary in-memory store for demonstration
const users = new Map();
let userIdCounter = 1;

// Default admin user (remove in production)
const createDefaultAdmin = async () => {
  const adminEmail = 'admin@coldcaller.com';
  if (!users.has(adminEmail)) {
    const hashedPassword = await hashPassword('Admin@123');
    users.set(adminEmail, {
      id: userIdCounter++,
      email: adminEmail,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: ROLES.SUPER_ADMIN,
      isActive: true,
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    });
    console.log('🔐 Default admin user created:', adminEmail);
  }
};

// Initialize default admin
createDefaultAdmin();

/**
 * User registration
 */
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = ROLES.AGENT } = req.body;

    // Check if user already exists
    if (users.has(email.toLowerCase())) {
      securityLogger('REGISTRATION_FAILED_DUPLICATE', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
          status: 409,
          code: 'USER_EXISTS'
        }
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = {
      id: userIdCounter++,
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      isActive: true,
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    };

    users.set(email.toLowerCase(), user);

    securityLogger('USER_REGISTERED', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return user without password
    const { password: _, ...userResponse } = user;

    return ResponseFormatter.success(
      res,
      { user: userResponse },
      'User registered successfully',
      201
    );
  } catch (error) {
    securityLogger('REGISTRATION_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed',
        status: 500,
        code: 'REGISTRATION_ERROR'
      }
    });
  }
};

/**
 * User login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userEmail = email.toLowerCase();

    // Find user
    const user = users.get(userEmail);
    if (!user) {
      securityLogger('LOGIN_FAILED_USER_NOT_FOUND', {
        email: userEmail,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          status: 401,
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const lockTimeRemaining = Math.ceil((user.lockedUntil - new Date()) / (1000 * 60));
      
      securityLogger('LOGIN_FAILED_ACCOUNT_LOCKED', {
        userId: user.id,
        email: userEmail,
        lockTimeRemaining,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(423).json({
        success: false,
        error: {
          message: `Account is locked. Try again in ${lockTimeRemaining} minutes.`,
          status: 423,
          code: 'ACCOUNT_LOCKED',
          lockTimeRemaining
        }
      });
    }

    // Check if account is active
    if (!user.isActive) {
      securityLogger('LOGIN_FAILED_ACCOUNT_INACTIVE', {
        userId: user.id,
        email: userEmail,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          status: 403,
          code: 'ACCOUNT_INACTIVE'
        }
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        user.loginAttempts = 0;
        
        securityLogger('ACCOUNT_LOCKED_BRUTE_FORCE', {
          userId: user.id,
          email: userEmail,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      } else {
        securityLogger('LOGIN_FAILED_INVALID_PASSWORD', {
          userId: user.id,
          email: userEmail,
          attempts: user.loginAttempts,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      users.set(userEmail, user);

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          status: 401,
          code: 'INVALID_CREDENTIALS',
          attemptsRemaining: Math.max(0, 5 - user.loginAttempts)
        }
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();
    users.set(userEmail, user);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    securityLogger('LOGIN_SUCCESS', {
      userId: user.id,
      email: userEmail,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return response without password
    const { password: _, loginAttempts, lockedUntil, tokenVersion, ...userResponse } = user;

    return ResponseFormatter.success(res, {
      user: userResponse,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: '24h'
    }, 'Login successful');

  } catch (error) {
    securityLogger('LOGIN_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Login failed',
        status: 500,
        code: 'LOGIN_ERROR'
      }
    });
  }
};

/**
 * Token refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          status: 401,
          code: 'MISSING_REFRESH_TOKEN'
        }
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    const user = Array.from(users.values()).find(u => u.id === decoded.id);

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      securityLogger('REFRESH_TOKEN_INVALID', {
        userId: decoded.id,
        tokenVersion: decoded.tokenVersion,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid refresh token',
          status: 401,
          code: 'INVALID_REFRESH_TOKEN'
        }
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          status: 403,
          code: 'ACCOUNT_INACTIVE'
        }
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    securityLogger('TOKEN_REFRESHED', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return ResponseFormatter.success(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: '24h'
    }, 'Token refreshed successfully');

  } catch (error) {
    securityLogger('REFRESH_TOKEN_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token refresh failed',
        status: 401,
        code: 'REFRESH_TOKEN_ERROR'
      }
    });
  }
};

/**
 * Logout (invalidate tokens)
 */
const logout = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (userId) {
      // Find user and increment token version to invalidate all tokens
      const user = Array.from(users.values()).find(u => u.id === userId);
      if (user) {
        user.tokenVersion += 1;
        users.set(user.email, user);
        
        securityLogger('LOGOUT_SUCCESS', {
          userId: user.id,
          email: user.email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    }

    return ResponseFormatter.success(res, null, 'Logout successful');

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Logout failed',
        status: 500,
        code: 'LOGOUT_ERROR'
      }
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = Array.from(users.values()).find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          status: 404,
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Return user without sensitive information
    const { password, loginAttempts, lockedUntil, tokenVersion, ...userProfile } = user;

    return ResponseFormatter.success(res, { user: userProfile }, 'Profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve profile',
        status: 500,
        code: 'PROFILE_ERROR'
      }
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName } = req.body;
    
    const user = Array.from(users.values()).find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          status: 404,
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Update profile fields
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    user.updatedAt = new Date().toISOString();

    users.set(user.email, user);

    securityLogger('PROFILE_UPDATED', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return updated user without sensitive information
    const { password, loginAttempts, lockedUntil, tokenVersion, ...userProfile } = user;

    return ResponseFormatter.success(res, { user: userProfile }, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update profile',
        status: 500,
        code: 'PROFILE_UPDATE_ERROR'
      }
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = Array.from(users.values()).find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          status: 404,
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      securityLogger('PASSWORD_CHANGE_FAILED_INVALID_CURRENT', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
          status: 401,
          code: 'INVALID_CURRENT_PASSWORD'
        }
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    user.updatedAt = new Date().toISOString();
    
    // Increment token version to invalidate all tokens
    user.tokenVersion += 1;

    users.set(user.email, user);

    securityLogger('PASSWORD_CHANGED', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return ResponseFormatter.success(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to change password',
        status: 500,
        code: 'PASSWORD_CHANGE_ERROR'
      }
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
};