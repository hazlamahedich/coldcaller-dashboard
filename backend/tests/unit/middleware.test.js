import { errorHandler, asyncHandler, ApiError } from '../../src/middleware/errorHandler.js';
import { notFound } from '../../src/middleware/notFound.js';

// Mock Express req, res, next
const mockReq = (overrides = {}) => ({
  method: 'GET',
  url: '/test',
  path: '/test',
  originalUrl: '/test',
  ip: '127.0.0.1',
  get: jest.fn(() => 'test-user-agent'),
  ...overrides,
});

const mockRes = (overrides = {}) => ({
  status: jest.fn(() => mockRes()),
  json: jest.fn(() => mockRes()),
  set: jest.fn(() => mockRes()),
  send: jest.fn(() => mockRes()),
  headersSent: false,
  ...overrides,
});

const mockNext = jest.fn();

describe('Error Handling Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Mock console.error
  });

  describe('errorHandler', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Test error');
      const req = mockReq();
      const res = mockRes();

      errorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Test error',
            status: 500,
          }),
        })
      );
    });

    it('should handle ApiError with custom status', () => {
      const error = new ApiError('Custom error', 400);
      const req = mockReq();
      const res = mockRes();

      errorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Custom error',
            status: 400,
          }),
        })
      );
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const req = mockReq();
      const res = mockRes();

      errorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Validation Error',
            status: 400,
          }),
        })
      );
    });

    it('should not process if headers already sent', () => {
      const error = new Error('Test error');
      const req = mockReq();
      const res = mockRes({ headersSent: true });

      errorHandler(error, req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('asyncHandler', () => {
    it('should catch async errors and pass to next', async () => {
      const asyncFunction = async () => {
        throw new Error('Async error');
      };
      
      const wrappedFunction = asyncHandler(asyncFunction);
      const req = mockReq();
      const res = mockRes();
      
      await wrappedFunction(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle successful async functions', async () => {
      const asyncFunction = async (req, res) => {
        res.json({ success: true });
      };
      
      const wrappedFunction = asyncHandler(asyncFunction);
      const req = mockReq();
      const res = mockRes();
      
      await wrappedFunction(req, res, mockNext);
      
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('ApiError', () => {
    it('should create error with default values', () => {
      const error = new ApiError('Test message');
      
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(500);
      expect(error.status).toBe('error');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom values', () => {
      const error = new ApiError('Test message', 400, false);
      
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(false);
    });
  });
});

describe('Not Found Middleware', () => {
  it('should return 404 with proper error format', () => {
    const req = mockReq({ method: 'POST', originalUrl: '/api/nonexistent' });
    const res = mockRes();
    
    notFound(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Route not found: POST /api/nonexistent',
          status: 404,
          suggestions: expect.any(Array),
        }),
      })
    );
  });
});