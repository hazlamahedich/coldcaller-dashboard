const request = require('supertest');
const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/errorHandler');
const { startCall } = require('../../controllers/callsController');

// Create test app
const app = express();
app.use(express.json());

// Test validation middleware
const testValidation = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      // More flexible phone number validation for international numbers
      // Allow: +, digits, spaces, dashes, dots, parentheses
      const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{8,20}$/;
      const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
      
      // Must start with digit 1-9 after cleaning, and have appropriate length
      if (!phoneRegex.test(value) || !/^[\+]?[1-9]\d*$/.test(cleanPhone) || cleanPhone.length < 8 || cleanPhone.length > 16) {
        throw new Error('Invalid phone number format. Must be 8-16 digits, optionally starting with + and may contain spaces, dashes, dots, or parentheses');
      }
      return true;
    }),
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
];

app.post('/test/validation', testValidation, handleValidationErrors, (req, res) => {
  res.json({ success: true, message: 'Validation passed' });
});

describe('Backend Validation Improvements', () => {
  describe('Phone Number Validation', () => {
    test('should accept valid US phone number', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: '+1234567890' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should accept international phone number with country code', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: '+44 20 7946 0958' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should accept phone number with formatting', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: '(555) 123-4567' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject empty phone number', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details[0].field).toBe('phoneNumber');
    });

    test('should reject phone number that is too short', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: '123456' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('Invalid phone number format');
    });

    test('should reject phone number that is too long', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: '+123456789012345678' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('Invalid phone number format');
    });

    test('should reject phone number with invalid characters', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: 'abc123defg' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('Invalid phone number format');
    });
  });

  describe('LeadId Validation', () => {
    test('should accept positive integer leadId', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ 
          phoneNumber: '+1234567890',
          leadId: 123
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should accept missing leadId (optional)', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: '+1234567890' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject negative leadId', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ 
          phoneNumber: '+1234567890',
          leadId: -1
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].field).toBe('leadId');
      expect(response.body.error.details[0].message).toBe('Lead ID must be a positive integer');
    });

    test('should reject zero leadId', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ 
          phoneNumber: '+1234567890',
          leadId: 0
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].field).toBe('leadId');
    });

    test('should reject non-integer leadId', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ 
          phoneNumber: '+1234567890',
          leadId: 'abc'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].field).toBe('leadId');
    });
  });

  describe('Enhanced Error Response Format', () => {
    test('should return properly formatted validation errors', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ 
          phoneNumber: '',
          leadId: -1
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.status).toBe(400);
      expect(response.body.error.details).toBeInstanceOf(Array);
      expect(response.body.error.details.length).toBeGreaterThan(0);
      expect(response.body.error.timestamp).toBeDefined();
      
      // Check error detail structure
      const errorDetail = response.body.error.details[0];
      expect(errorDetail.field).toBeDefined();
      expect(errorDetail.message).toBeDefined();
      expect(errorDetail.code).toBe('VALIDATION_ERROR');
      expect(errorDetail.location).toBeDefined();
    });
  });
});

// Edge cases for international phone numbers
describe('International Phone Number Edge Cases', () => {
  const testCases = [
    { phone: '+44 20 7946 0958', description: 'UK London number with spaces' },
    { phone: '+33-1-42-86-83-26', description: 'French number with dashes' },
    { phone: '+49.30.12345678', description: 'German number with dots' },
    { phone: '+81-3-1234-5678', description: 'Japanese number' },
    { phone: '+86 138 0013 8000', description: 'Chinese mobile number' },
    { phone: '+91 98765 43210', description: 'Indian mobile number' },
    { phone: '+55 11 99999-9999', description: 'Brazilian mobile number' },
    { phone: '1-555-123-4567', description: 'US number without + prefix' },
    { phone: '(555) 123.4567', description: 'US number with mixed formatting' }
  ];

  testCases.forEach(({ phone, description }) => {
    test(`should accept ${description}: ${phone}`, async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({ phoneNumber: phone });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});