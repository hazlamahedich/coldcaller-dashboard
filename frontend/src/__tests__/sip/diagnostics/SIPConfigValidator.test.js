/**
 * SIP Configuration Validator Tests
 * Comprehensive test suite for SIP configuration validation functionality
 */

import { jest } from '@jest/globals';
import SIPConfigValidator from '../../../services/diagnostics/SIPConfigValidator';

describe('SIPConfigValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new SIPConfigValidator();
  });

  describe('Initialization', () => {
    test('should initialize with provider templates', () => {
      expect(validator).toBeDefined();
      expect(validator.providerTemplates).toBeDefined();
      expect(validator.providerTemplates.twilio).toBeDefined();
      expect(validator.providerTemplates.generic).toBeDefined();
      expect(validator.providerTemplates.asterisk).toBeDefined();
    });

    test('should have validation rules configured', () => {
      expect(validator.validationRules).toBeDefined();
      expect(validator.validationRules.port).toBeDefined();
      expect(validator.validationRules.transport).toBeDefined();
      expect(validator.validationRules.codec).toBeDefined();
    });
  });

  describe('Generic SIP Configuration Validation', () => {
    test('should validate complete generic configuration', () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        port: 5060,
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(config, 'generic');

      expect(result.valid).toBe(true);
      expect(result.provider).toBe('generic');
      expect(result.errors).toEqual([]);
      expect(result.score).toBeGreaterThan(80);
    });

    test('should detect missing required fields', () => {
      const config = {
        server: 'sip.example.com'
        // Missing username and password
      };

      const result = validator.validateConfiguration(config, 'generic');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Missing required fields'))).toBe(true);
      expect(result.errors.some(error => error.includes('username'))).toBe(true);
      expect(result.errors.some(error => error.includes('password'))).toBe(true);
    });

    test('should validate server format', () => {
      const invalidConfig = {
        server: 'invalid-server-format',
        username: 'testuser',
        password: 'SecurePass123!',
        port: 5060,
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(invalidConfig, 'generic');

      expect(result.errors.some(error => error.includes('Invalid server format'))).toBe(true);
    });

    test('should validate port numbers', () => {
      const invalidPortConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        port: 99999, // Invalid port
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(invalidPortConfig, 'generic');

      expect(result.errors.some(error => error.includes('Invalid port number'))).toBe(true);
    });

    test('should warn about non-standard ports', () => {
      const nonStandardPortConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        port: 8080, // Non-standard SIP port
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(nonStandardPortConfig, 'generic');

      expect(result.warnings.some(warning => warning.includes('Non-standard port'))).toBe(true);
    });

    test('should validate transport protocols', () => {
      const invalidTransportConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        port: 5060,
        transport: 'INVALID'
      };

      const result = validator.validateConfiguration(invalidTransportConfig, 'generic');

      expect(result.errors.some(error => error.includes('Invalid transport'))).toBe(true);
    });

    test('should recommend secure transport', () => {
      const insecureConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        port: 5060,
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(insecureConfig, 'generic');

      expect(result.warnings.some(warning => warning.includes('secure transport'))).toBe(true);
    });
  });

  describe('Password Security Validation', () => {
    test('should accept strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyVerySecurePassword456',
        'Compl3x!P@ssw0rd',
        'SuperLongPasswordWithNumbers123'
      ];

      strongPasswords.forEach(password => {
        const config = {
          server: 'sip.example.com',
          username: 'testuser',
          password,
          port: 5060
        };

        const result = validator.validateConfiguration(config, 'generic');
        expect(result.errors.filter(e => e.includes('Password')).length).toBe(0);
      });
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        '123',        // Too short
        'pass',       // Too short
        '1234567',    // Too short
        'password',   // Common pattern
        'admin'       // Common pattern
      ];

      weakPasswords.forEach(password => {
        const config = {
          server: 'sip.example.com',
          username: 'testuser',
          password,
          port: 5060
        };

        const result = validator.validateConfiguration(config, 'generic');
        expect(result.errors.some(error => 
          error.includes('Password') || error.includes('weak patterns')
        )).toBe(true);
      });
    });

    test('should detect default credentials', () => {
      const defaultCredentialsConfig = {
        server: 'sip.example.com',
        username: 'admin',
        password: 'admin', // Default combo
        port: 5060
      };

      const result = validator.validateConfiguration(defaultCredentialsConfig, 'generic');

      expect(result.errors.some(error => error.includes('Default or weak credentials'))).toBe(true);
    });
  });

  describe('Twilio Provider Validation', () => {
    test('should validate complete Twilio configuration', () => {
      const config = {
        accountSid: 'AC' + 'a'.repeat(32),
        apiKey: 'SK' + 'b'.repeat(32),
        apiSecret: 'c'.repeat(32),
        region: 'us1',
        transport: 'WSS'
      };

      const result = validator.validateConfiguration(config, 'twilio');

      expect(result.valid).toBe(true);
      expect(result.provider).toBe('twilio');
      expect(result.score).toBeGreaterThan(80);
    });

    test('should validate Twilio Account SID format', () => {
      const invalidConfig = {
        accountSid: 'INVALID_SID',
        apiKey: 'SK' + 'b'.repeat(32),
        apiSecret: 'c'.repeat(32)
      };

      const result = validator.validateConfiguration(invalidConfig, 'twilio');

      expect(result.errors.some(error => error.includes('Invalid Twilio Account SID'))).toBe(true);
    });

    test('should validate Twilio API Key format', () => {
      const invalidConfig = {
        accountSid: 'AC' + 'a'.repeat(32),
        apiKey: 'INVALID_KEY',
        apiSecret: 'c'.repeat(32)
      };

      const result = validator.validateConfiguration(invalidConfig, 'twilio');

      expect(result.errors.some(error => error.includes('Invalid Twilio API Key'))).toBe(true);
    });

    test('should recommend WSS transport for Twilio', () => {
      const config = {
        accountSid: 'AC' + 'a'.repeat(32),
        apiKey: 'SK' + 'b'.repeat(32),
        apiSecret: 'c'.repeat(32),
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(config, 'twilio');

      expect(result.warnings.some(warning => warning.includes('Twilio recommends WSS'))).toBe(true);
    });

    test('should validate Twilio regions', () => {
      const config = {
        accountSid: 'AC' + 'a'.repeat(32),
        apiKey: 'SK' + 'b'.repeat(32),
        apiSecret: 'c'.repeat(32),
        region: 'invalid-region'
      };

      const result = validator.validateConfiguration(config, 'twilio');

      expect(result.warnings.some(warning => warning.includes('Unknown Twilio region'))).toBe(true);
    });
  });

  describe('Asterisk Provider Validation', () => {
    test('should validate Asterisk configuration', () => {
      const config = {
        server: 'asterisk.example.com',
        username: 'extension123',
        password: 'SecurePass123!',
        context: 'default',
        port: 5060
      };

      const result = validator.validateConfiguration(config, 'asterisk');

      expect(result.valid).toBe(true);
      expect(result.provider).toBe('asterisk');
    });

    test('should validate Asterisk context format', () => {
      const config = {
        server: 'asterisk.example.com',
        username: 'extension123',
        password: 'SecurePass123!',
        context: 'invalid@context!',
        port: 5060
      };

      const result = validator.validateConfiguration(config, 'asterisk');

      expect(result.errors.some(error => error.includes('Invalid Asterisk context'))).toBe(true);
    });
  });

  describe('3CX Provider Validation', () => {
    test('should validate 3CX configuration', () => {
      const config = {
        server: '3cx.example.com',
        extension: '1001',
        password: 'SecurePass123!',
        port: 5060
      };

      const result = validator.validateConfiguration(config, '3cx');

      expect(result.valid).toBe(true);
      expect(result.provider).toBe('3cx');
    });

    test('should validate 3CX extension format', () => {
      const invalidExtensionConfig = {
        server: '3cx.example.com',
        extension: '12', // Too short
        password: 'SecurePass123!',
        port: 5060
      };

      const result = validator.validateConfiguration(invalidExtensionConfig, '3cx');

      expect(result.errors.some(error => error.includes('3CX extension should be 3-5 digits'))).toBe(true);
    });

    test('should recommend TCP transport for 3CX', () => {
      const config = {
        server: '3cx.example.com',
        extension: '1001',
        password: 'SecurePass123!',
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(config, '3cx');

      expect(result.warnings.some(warning => warning.includes('3CX typically uses TCP'))).toBe(true);
    });
  });

  describe('FreePBX Provider Validation', () => {
    test('should validate FreePBX configuration', () => {
      const config = {
        server: 'freepbx.example.com',
        extension: '2001',
        secret: 'VerySecureSecret123!',
        context: 'from-internal'
      };

      const result = validator.validateConfiguration(config, 'freepbx');

      expect(result.valid).toBe(true);
      expect(result.provider).toBe('freepbx');
    });

    test('should warn about non-standard FreePBX context', () => {
      const config = {
        server: 'freepbx.example.com',
        extension: '2001',
        secret: 'VerySecureSecret123!',
        context: 'custom-context'
      };

      const result = validator.validateConfiguration(config, 'freepbx');

      expect(result.warnings.some(warning => warning.includes('Non-standard FreePBX context'))).toBe(true);
    });
  });

  describe('Codec Validation', () => {
    test('should validate codec configuration', () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        codecs: ['opus', 'G722', 'PCMU']
      };

      const result = validator.validateConfiguration(config, 'generic');

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.warnings.filter(w => w.includes('codec')).length).toBe(0);
    });

    test('should suggest optimal codec order', () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        codecs: ['PCMU', 'opus'] // Sub-optimal order
      };

      const result = validator.validateConfiguration(config, 'generic');

      expect(result.suggestions.some(suggestion => suggestion.includes('Optimal codec order'))).toBe(true);
    });

    test('should recommend missing high-quality codecs', () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        codecs: ['PCMU', 'PCMA'] // Missing opus and G722
      };

      const result = validator.validateConfiguration(config, 'generic');

      expect(result.suggestions.some(suggestion => suggestion.includes('Opus codec'))).toBe(true);
      expect(result.suggestions.some(suggestion => suggestion.includes('G.722 codec'))).toBe(true);
    });

    test('should warn about unsupported codecs', () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        codecs: ['opus', 'INVALID_CODEC']
      };

      const result = validator.validateConfiguration(config, 'generic');

      expect(result.warnings.some(warning => warning.includes('Unsupported codecs'))).toBe(true);
    });
  });

  describe('Security Assessment', () => {
    test('should assess security level correctly', () => {
      const secureConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'VerySecurePassword123!',
        authUser: 'differentuser',
        transport: 'TLS'
      };

      const result = validator.validateConfiguration(secureConfig, 'generic');

      expect(result.details.securityLevel.level).toBe('high');
      expect(result.details.securityLevel.score).toBeGreaterThan(60);
    });

    test('should identify basic security level', () => {
      const basicConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'basic',
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(basicConfig, 'generic');

      expect(result.details.securityLevel.level).toBe('basic');
      expect(result.details.securityLevel.score).toBeLessThan(30);
    });
  });

  describe('Network Compatibility Assessment', () => {
    test('should assess firewall friendliness', () => {
      const firewallFriendlyConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        transport: 'WSS'
      };

      const result = validator.validateConfiguration(firewallFriendlyConfig, 'generic');

      expect(result.details.networkCompatibility.firewallFriendly).toBe(true);
      expect(result.details.networkCompatibility.webCompatible).toBe(true);
    });

    test('should assess NAT traversal requirements', () => {
      const udpConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        transport: 'UDP'
      };

      const result = validator.validateConfiguration(udpConfig, 'generic');

      expect(result.details.networkCompatibility.natTraversal).toBe('requires_stun');
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple configurations', () => {
      const configurations = [
        {
          id: 'config1',
          name: 'Twilio Config',
          provider: 'twilio',
          config: {
            accountSid: 'AC' + 'a'.repeat(32),
            apiKey: 'SK' + 'b'.repeat(32),
            apiSecret: 'c'.repeat(32)
          }
        },
        {
          id: 'config2',
          name: 'Generic Config',
          provider: 'generic',
          config: {
            server: 'sip.example.com',
            username: 'testuser',
            password: 'SecurePass123!'
          }
        }
      ];

      const results = validator.validateBatch(configurations);

      expect(results.results).toHaveLength(2);
      expect(results.summary.total).toBe(2);
      expect(results.summary.averageScore).toBeGreaterThan(0);
    });
  });

  describe('Provider Information', () => {
    test('should get provider template', () => {
      const twilioTemplate = validator.getProviderTemplate('twilio');

      expect(twilioTemplate).toBeDefined();
      expect(twilioTemplate.name).toBe('Twilio');
      expect(twilioTemplate.requiredFields).toContain('accountSid');
    });

    test('should get available providers', () => {
      const providers = validator.getAvailableProviders();

      expect(providers).toBeInstanceOf(Array);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0]).toHaveProperty('type');
      expect(providers[0]).toHaveProperty('name');
      expect(providers[0]).toHaveProperty('description');
    });

    test('should get provider descriptions', () => {
      const description = validator.getProviderDescription('twilio');

      expect(description).toContain('Cloud-based');
      expect(description).toContain('communications');
    });
  });

  describe('Error Handling', () => {
    test('should handle unsupported provider type', () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      const result = validator.validateConfiguration(config, 'unsupported');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unsupported provider type'))).toBe(true);
    });

    test('should handle validation errors gracefully', () => {
      const config = null; // Invalid config

      const result = validator.validateConfiguration(config, 'generic');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('failed'))).toBe(true);
    });
  });

  describe('Scoring System', () => {
    test('should calculate scores correctly', () => {
      const perfectConfig = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'VerySecurePassword123!',
        port: 5060,
        transport: 'TLS',
        codecs: ['opus', 'G722', 'PCMU']
      };

      const result = validator.validateConfiguration(perfectConfig, 'generic');

      expect(result.score).toBeGreaterThan(90);
    });

    test('should penalize poor configurations', () => {
      const poorConfig = {
        server: 'invalid',
        username: 'u',
        password: 'p',
        port: 99999
      };

      const result = validator.validateConfiguration(poorConfig, 'generic');

      expect(result.score).toBeLessThan(50);
    });
  });
});