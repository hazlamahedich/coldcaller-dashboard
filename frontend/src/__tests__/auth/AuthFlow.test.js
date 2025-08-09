/**
 * Authentication Flow Integration Tests
 * Comprehensive testing of authentication workflows and data synchronization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom';

import Login from '../../components/Login';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import authService, { tokenManager } from '../../services/authService';
import api from '../../services/api';

// Mock data
const mockUser = {
  id: 1,
  email: 'admin@coldcaller.com',
  firstName: 'System',
  lastName: 'Administrator',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: '2023-01-01T00:00:00.000Z',
  lastLogin: null
};

const mockTokens = {
  accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6ImNkNzhjYWZlLTk0MGItNGQ1NS1iNWEyLTBjOWJmNmY5NDQ0YyIsImlhdCI6MTY5OTc5MTExNywiZXhwIjo5OTk5OTk5OTk5fQ.gEQ8pIUIGJfayK-bUCBUUvhUIDd2fLClrSqjO1WvGSU',
  refreshToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwianRpIjoiY2Q3OGNhZmUtOTQwYi00ZDU1LWI1YTItMGM5YmY2Zjk0NDRjIiwiaWF0IjoxNjk5NzkxMTE3LCJleHAiOjk5OTk5OTk5OTl9.8Pnq2PdEJKCAGN2KqWjYfN2VnZjsmpXz4K1EgGdCGNI'
};

const mockLeadsData = {
  success: true,
  data: [
    {
      id: 1,
      name: 'John Doe',
      company: 'Test Company',
      phone: '+1234567890',
      email: 'john@test.com',
      status: 'New',
      notes: 'Test lead',
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      id: 2,
      name: 'Jane Smith',
      company: 'Another Company',
      phone: '+0987654321',
      email: 'jane@another.com',
      status: 'Follow-up',
      notes: 'Another test lead',
      createdAt: '2023-01-02T00:00:00.000Z'
    }
  ],
  pagination: { total: 2, page: 1, limit: 10 }
};

// Mock server setup
const server = setupServer(
  // Login endpoint
  rest.post('http://localhost:3001/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;
    
    if (email === 'admin@coldcaller.com' && password === 'Admin@123') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken,
            tokenType: 'Bearer',
            expiresIn: '24h'
          },
          message: 'Login successful'
        })
      );
    }
    
    if (email === 'locked@test.com') {
      return res(
        ctx.status(423),
        ctx.json({
          success: false,
          error: {
            message: 'Account is locked. Try again in 30 minutes.',
            status: 423,
            code: 'ACCOUNT_LOCKED',
            lockTimeRemaining: 30
          }
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          message: 'Invalid email or password',
          status: 401,
          code: 'INVALID_CREDENTIALS',
          attemptsRemaining: 4
        }
      })
    );
  }),
  
  // Profile endpoint
  rest.get('http://localhost:3001/api/auth/profile', (req, res, ctx) => {
    const authHeader = req.headers.get('authorization');
    
    if (authHeader && authHeader.includes(mockTokens.accessToken)) {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: { user: mockUser },
          message: 'Profile retrieved successfully'
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          message: 'Access token required',
          status: 401,
          code: 'MISSING_TOKEN'
        }
      })
    );
  }),
  
  // Logout endpoint
  rest.post('http://localhost:3001/api/auth/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Logout successful'
      })
    );
  }),
  
  // Token refresh endpoint
  rest.post('http://localhost:3001/api/auth/refresh', (req, res, ctx) => {
    const { refreshToken } = req.body;
    
    if (refreshToken === mockTokens.refreshToken) {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken,
            tokenType: 'Bearer',
            expiresIn: '24h'
          },
          message: 'Token refreshed successfully'
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          message: 'Invalid refresh token',
          status: 401,
          code: 'INVALID_REFRESH_TOKEN'
        }
      })
    );
  }),
  
  // Leads endpoint
  rest.get('http://localhost:3001/api/leads', (req, res, ctx) => {
    const authHeader = req.headers.get('authorization');
    
    if (authHeader && authHeader.includes(mockTokens.accessToken)) {
      return res(
        ctx.status(200),
        ctx.json(mockLeadsData)
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          message: 'Access token required',
          status: 401,
          code: 'MISSING_TOKEN'
        }
      })
    );
  }),
  
  // Health check endpoint
  rest.get('http://localhost:3001/api/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'ok',
        message: 'API is healthy',
        timestamp: new Date().toISOString()
      })
    );
  })
);

// Test helper component to access auth context
const AuthTestComponent = ({ onAuthChange }) => {
  const auth = useAuth();
  
  React.useEffect(() => {
    if (onAuthChange) {
      onAuthChange(auth);
    }
  }, [auth, onAuthChange]);

  return (
    <div>
      <div data-testid="auth-status">{auth.isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-name">{auth.user ? auth.getFullName() : 'No user'}</div>
      <div data-testid="user-role">{auth.user?.role || 'No role'}</div>
      <div data-testid="loading">{auth.isLoading ? 'loading' : 'loaded'}</div>
      {auth.error && <div data-testid="auth-error">{auth.error}</div>}
      <button onClick={() => auth.logout()} data-testid="logout-btn">Logout</button>
    </div>
  );
};

describe('Authentication Flow Integration Tests', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
    jest.clearAllMocks();
  });
  afterAll(() => server.close());

  describe('Login Component Tests', () => {
    test('should render login form with test credentials', () => {
      render(<Login onLogin={jest.fn()} onError={jest.fn()} />);
      
      expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('admin@coldcaller.com');
      expect(screen.getByLabelText(/password/i)).toHaveValue('Admin@123');
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use test credentials/i })).toBeInTheDocument();
      expect(screen.getByText('admin@coldcaller.com / Admin@123')).toBeInTheDocument();
    });

    test('should validate form inputs', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={jest.fn()} onError={jest.fn()} />);
      
      // Clear the pre-filled email
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      await user.clear(emailInput);
      
      // Clear the pre-filled password
      const passwordInput = screen.getByLabelText(/password/i);
      await user.clear(passwordInput);
      
      // Try to submit empty form
      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);
      
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      
      // Test invalid email
      await user.type(emailInput, 'invalid-email');
      await user.click(submitBtn);
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    test('should perform successful login with correct credentials', async () => {
      const user = userEvent.setup();
      const onLoginMock = jest.fn();
      const onErrorMock = jest.fn();
      
      render(<Login onLogin={onLoginMock} onError={onErrorMock} />);
      
      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);
      
      // Wait for login to complete
      await waitFor(() => {
        expect(onLoginMock).toHaveBeenCalledWith(mockUser, mockTokens.accessToken);
      });
      
      expect(onErrorMock).not.toHaveBeenCalled();
      expect(localStorage.getItem('authToken')).toBe(mockTokens.accessToken);
      expect(localStorage.getItem('refreshToken')).toBe(mockTokens.refreshToken);
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);
    });

    test('should handle invalid credentials error', async () => {
      const user = userEvent.setup();
      const onErrorMock = jest.fn();
      
      render(<Login onLogin={jest.fn()} onError={onErrorMock} />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, 'wrong@email.com');
      await user.type(passwordInput, 'wrongpassword');
      
      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password.*4 attempts remaining/)).toBeInTheDocument();
      });
      
      expect(onErrorMock).toHaveBeenCalled();
    });

    test('should handle account locked error', async () => {
      const user = userEvent.setup();
      
      render(<Login onLogin={jest.fn()} onError={jest.fn()} />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, 'locked@test.com');
      await user.type(passwordInput, 'password');
      
      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/Account is locked.*30 minutes/)).toBeInTheDocument();
      });
    });

    test('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={jest.fn()} onError={jest.fn()} />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      await user.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      await user.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('AuthContext Integration Tests', () => {
    test('should initialize with unauthenticated state', () => {
      let authContext;
      
      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('No user');
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    test('should authenticate user with valid tokens in localStorage', async () => {
      // Pre-populate localStorage with valid tokens
      localStorage.setItem('authToken', mockTokens.accessToken);
      localStorage.setItem('refreshToken', mockTokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-name')).toHaveTextContent('System Administrator');
        expect(screen.getByTestId('user-role')).toHaveTextContent('SUPER_ADMIN');
      });
    });

    test('should perform login through context', async () => {
      let authContext;
      
      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
      
      // Perform login
      await act(async () => {
        const result = await authContext.login('admin@coldcaller.com', 'Admin@123');
        expect(result.success).toBe(true);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-name')).toHaveTextContent('System Administrator');
      });
    });

    test('should perform logout through context', async () => {
      // Pre-authenticate
      localStorage.setItem('authToken', mockTokens.accessToken);
      localStorage.setItem('refreshToken', mockTokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );
      
      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
      
      // Perform logout
      const logoutBtn = screen.getByTestId('logout-btn');
      fireEvent.click(logoutBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
        expect(localStorage.getItem('authToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
      });
    });
  });

  describe('Protected Route Access Tests', () => {
    test('should access leads data when authenticated', async () => {
      // Pre-authenticate
      localStorage.setItem('authToken', mockTokens.accessToken);
      localStorage.setItem('refreshToken', mockTokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      const response = await api.get('/leads');
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toBe('John Doe');
      expect(response.pagination.total).toBe(2);
    });

    test('should fail to access leads data when not authenticated', async () => {
      // Clear any stored tokens
      localStorage.clear();
      
      try {
        await api.get('/leads');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.code).toBe('MISSING_TOKEN');
      }
    });
  });

  describe('Token Management Tests', () => {
    test('should refresh tokens successfully', async () => {
      // Store refresh token
      localStorage.setItem('refreshToken', mockTokens.refreshToken);
      
      const result = await authService.refreshToken();
      
      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe(mockTokens.accessToken);
      expect(localStorage.getItem('authToken')).toBe(mockTokens.accessToken);
    });

    test('should handle refresh token failure', async () => {
      // Store invalid refresh token
      localStorage.setItem('refreshToken', 'invalid-token');
      
      const result = await authService.refreshToken();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    test('should detect expired tokens', () => {
      const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTY5OTc5MTExNywiZXhwIjoxNjk5NzkxMTE3fQ.Y7A_SXID9Axa9_Z_CU2vOlf8PXllr0EDQCj_yk3LpNI';
      
      expect(tokenManager.isTokenExpired(expiredToken)).toBe(true);
      expect(tokenManager.isTokenExpired(mockTokens.accessToken)).toBe(false);
      expect(tokenManager.isTokenExpired(null)).toBe(true);
      expect(tokenManager.isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('Data Synchronization Tests', () => {
    test('should maintain consistent lead count across components', async () => {
      // Pre-authenticate
      localStorage.setItem('authToken', mockTokens.accessToken);
      localStorage.setItem('refreshToken', mockTokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      // Test leads service
      const leadsResponse = await api.get('/leads');
      expect(leadsResponse.data).toHaveLength(2);
      expect(leadsResponse.pagination.total).toBe(2);
      
      // Verify data structure consistency
      expect(leadsResponse.success).toBe(true);
      expect(leadsResponse.data[0]).toHaveProperty('id');
      expect(leadsResponse.data[0]).toHaveProperty('name');
      expect(leadsResponse.data[0]).toHaveProperty('company');
      expect(leadsResponse.data[0]).toHaveProperty('status');
    });

    test('should handle authentication state changes across the app', async () => {
      let authContext;
      
      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );
      
      // Start unauthenticated
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });
      
      // Login
      await act(async () => {
        await authContext.login('admin@coldcaller.com', 'Admin@123');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
      
      // Verify can access protected data
      const response = await api.get('/leads');
      expect(response.success).toBe(true);
      
      // Logout
      await act(async () => {
        await authContext.logout();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });
      
      // Verify can't access protected data
      try {
        await api.get('/leads');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      server.use(
        rest.post('http://localhost:3001/api/auth/login', (req, res, ctx) => {
          return res.networkError('Network connection failed');
        })
      );
      
      const result = await authService.login('admin@coldcaller.com', 'Admin@123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Login failed');
    });

    test('should handle server errors gracefully', async () => {
      // Mock server error
      server.use(
        rest.post('http://localhost:3001/api/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              success: false,
              error: {
                message: 'Internal server error',
                status: 500,
                code: 'SERVER_ERROR'
              }
            })
          );
        })
      );
      
      const result = await authService.login('admin@coldcaller.com', 'Admin@123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Security Tests', () => {
    test('should not expose sensitive data in localStorage', async () => {
      await authService.login('admin@coldcaller.com', 'Admin@123');
      
      const storedUser = JSON.parse(localStorage.getItem('user'));
      expect(storedUser).not.toHaveProperty('password');
      expect(storedUser).not.toHaveProperty('tokenVersion');
      expect(storedUser).not.toHaveProperty('loginAttempts');
    });

    test('should validate JWT token structure', () => {
      const token = mockTokens.accessToken;
      const parts = token.split('.');
      
      expect(parts).toHaveLength(3); // header.payload.signature
      
      // Decode payload
      const payload = JSON.parse(atob(parts[1]));
      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('iat');
    });

    test('should handle authorization header correctly', async () => {
      localStorage.setItem('authToken', mockTokens.accessToken);
      
      // This should succeed because the token is valid
      const response = await api.get('/auth/profile');
      expect(response.success).toBe(true);
    });
  });
});

export default {
  mockUser,
  mockTokens,
  mockLeadsData,
  server
};