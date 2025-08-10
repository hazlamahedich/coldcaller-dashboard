/**
 * SIP Configuration Validator - Validates SIP settings and provider configurations
 * Provides comprehensive validation for different SIP providers and configurations
 */

class SIPConfigValidator {
  constructor() {
    this.providerTemplates = {
      twilio: {
        name: 'Twilio',
        requiredFields: ['accountSid', 'apiKey', 'apiSecret'],
        optionalFields: ['region', 'edge'],
        validation: {
          accountSid: /^AC[a-f0-9]{32}$/,
          apiKey: /^SK[a-f0-9]{32}$/,
          apiSecret: /^[a-zA-Z0-9]{32}$/
        },
        defaults: {
          transport: 'WSS',
          port: 443,
          region: 'us1'
        }
      },
      generic: {
        name: 'Generic SIP',
        requiredFields: ['server', 'username', 'password'],
        optionalFields: ['displayName', 'authUser', 'realm'],
        validation: {
          server: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
          username: /^[a-zA-Z0-9@._-]+$/,
          port: /^\d{1,5}$/
        },
        defaults: {
          transport: 'UDP',
          port: 5060
        }
      },
      asterisk: {
        name: 'Asterisk',
        requiredFields: ['server', 'username', 'password'],
        optionalFields: ['context', 'callerIdName', 'callerIdNumber'],
        validation: {
          server: /^[a-zA-Z0-9.-]+$/,
          username: /^[a-zA-Z0-9_-]+$/,
          context: /^[a-zA-Z0-9_-]+$/
        },
        defaults: {
          transport: 'UDP',
          port: 5060,
          context: 'default'
        }
      },
      '3cx': {
        name: '3CX',
        requiredFields: ['server', 'extension', 'password'],
        optionalFields: ['port', 'outboundProxy'],
        validation: {
          server: /^[a-zA-Z0-9.-]+$/,
          extension: /^\d{3,5}$/,
          port: /^\d{1,5}$/
        },
        defaults: {
          transport: 'TCP',
          port: 5060
        }
      },
      freepbx: {
        name: 'FreePBX',
        requiredFields: ['server', 'extension', 'secret'],
        optionalFields: ['context', 'qualify', 'nat'],
        validation: {
          server: /^[a-zA-Z0-9.-]+$/,
          extension: /^\d{3,6}$/,
          secret: /^[a-zA-Z0-9!@#$%^&*()_+-=]{8,}$/
        },
        defaults: {
          transport: 'UDP',
          port: 5060,
          context: 'from-internal',
          qualify: 'yes',
          nat: 'auto_force_rport'
        }
      }
    };

    this.validationRules = {
      port: {
        min: 1,
        max: 65535,
        recommended: [5060, 5061, 7443, 443]
      },
      transport: {
        valid: ['UDP', 'TCP', 'TLS', 'WS', 'WSS'],
        secure: ['TLS', 'WSS']
      },
      codec: {
        audio: ['PCMU', 'PCMA', 'opus', 'G722', 'GSM', 'iLBC'],
        priorities: ['opus', 'G722', 'PCMU', 'PCMA', 'GSM', 'iLBC']
      }
    };

    this.securityChecks = {
      password: {
        minLength: 8,
        requireMixedCase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        forbiddenPatterns: [
          /123456/,
          /password/i,
          /admin/i,
          /user/i
        ]
      }
    };
  }

  /**
   * Validate complete SIP configuration
   */
  validateConfiguration(config, providerType = 'generic') {
    const result = {
      valid: false,
      provider: providerType,
      errors: [],
      warnings: [],
      suggestions: [],
      score: 0,
      details: {}
    };

    try {
      // Get provider template
      const template = this.providerTemplates[providerType];
      if (!template) {
        result.errors.push(`Unsupported provider type: ${providerType}`);
        return result;
      }

      // Validate required fields
      const missingFields = this.validateRequiredFields(config, template);
      if (missingFields.length > 0) {
        result.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate field formats
      const formatErrors = this.validateFieldFormats(config, template);
      result.errors.push(...formatErrors);

      // Validate network settings
      const networkValidation = this.validateNetworkSettings(config);
      result.errors.push(...networkValidation.errors);
      result.warnings.push(...networkValidation.warnings);

      // Validate security settings
      const securityValidation = this.validateSecuritySettings(config);
      result.errors.push(...securityValidation.errors);
      result.warnings.push(...securityValidation.warnings);

      // Validate codec settings
      const codecValidation = this.validateCodecSettings(config);
      result.warnings.push(...codecValidation.warnings);
      result.suggestions.push(...codecValidation.suggestions);

      // Provider-specific validation
      const providerValidation = this.validateProviderSpecific(config, providerType);
      result.errors.push(...providerValidation.errors);
      result.warnings.push(...providerValidation.warnings);

      // Calculate validation score
      result.score = this.calculateValidationScore(result);
      result.valid = result.errors.length === 0;

      // Generate suggestions
      if (result.valid) {
        result.suggestions.push(...this.generateOptimizationSuggestions(config, template));
      }

      result.details = this.getValidationDetails(config, template);

      return result;

    } catch (error) {
      result.errors.push(`Validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(config, template) {
    return template.requiredFields.filter(field => {
      return !config[field] || 
             (typeof config[field] === 'string' && config[field].trim() === '');
    });
  }

  /**
   * Validate field formats
   */
  validateFieldFormats(config, template) {
    const errors = [];

    for (const [field, pattern] of Object.entries(template.validation || {})) {
      if (config[field] && !pattern.test(config[field])) {
        errors.push(`Invalid format for ${field}: ${config[field]}`);
      }
    }

    return errors;
  }

  /**
   * Validate network settings
   */
  validateNetworkSettings(config) {
    const result = { errors: [], warnings: [] };

    // Validate port
    if (config.port) {
      const port = parseInt(config.port);
      if (isNaN(port) || port < this.validationRules.port.min || port > this.validationRules.port.max) {
        result.errors.push(`Invalid port number: ${config.port}`);
      } else if (!this.validationRules.port.recommended.includes(port)) {
        result.warnings.push(`Non-standard port ${port} - may require firewall configuration`);
      }
    }

    // Validate transport
    if (config.transport) {
      const transport = config.transport.toUpperCase();
      if (!this.validationRules.transport.valid.includes(transport)) {
        result.errors.push(`Invalid transport: ${config.transport}`);
      } else if (!this.validationRules.transport.secure.includes(transport)) {
        result.warnings.push('Using non-secure transport - consider TLS or WSS');
      }
    }

    // Validate server format
    if (config.server) {
      if (config.server.includes('://')) {
        result.warnings.push('Server should not include protocol prefix');
      }
      if (!/^[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?$/.test(config.server)) {
        result.errors.push('Invalid server format');
      }
    }

    return result;
  }

  /**
   * Validate security settings
   */
  validateSecuritySettings(config) {
    const result = { errors: [], warnings: [] };

    // Validate password strength
    if (config.password) {
      const passwordCheck = this.validatePassword(config.password);
      result.errors.push(...passwordCheck.errors);
      result.warnings.push(...passwordCheck.warnings);
    }

    // Check for secure transport
    if (config.transport && !this.validationRules.transport.secure.includes(config.transport.toUpperCase())) {
      result.warnings.push('Consider using secure transport (TLS/WSS) for better security');
    }

    // Check for default credentials
    if (this.hasDefaultCredentials(config)) {
      result.errors.push('Default or weak credentials detected');
    }

    return result;
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const result = { errors: [], warnings: [] };
    const rules = this.securityChecks.password;

    if (password.length < rules.minLength) {
      result.errors.push(`Password too short (minimum ${rules.minLength} characters)`);
    }

    if (rules.requireMixedCase && !/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      result.warnings.push('Password should contain both uppercase and lowercase letters');
    }

    if (rules.requireNumbers && !/\d/.test(password)) {
      result.warnings.push('Password should contain numbers');
    }

    if (rules.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      result.warnings.push('Password should contain special characters');
    }

    // Check forbidden patterns
    for (const pattern of rules.forbiddenPatterns) {
      if (pattern.test(password)) {
        result.errors.push('Password contains common weak patterns');
        break;
      }
    }

    return result;
  }

  /**
   * Check for default credentials
   */
  hasDefaultCredentials(config) {
    const defaultCombos = [
      { username: 'admin', password: 'admin' },
      { username: 'user', password: 'user' },
      { username: 'admin', password: 'password' },
      { username: 'root', password: 'root' },
      { username: config.username, password: config.username } // Same as username
    ];

    return defaultCombos.some(combo => 
      config.username === combo.username && config.password === combo.password
    );
  }

  /**
   * Validate codec settings
   */
  validateCodecSettings(config) {
    const result = { warnings: [], suggestions: [] };

    if (config.codecs && Array.isArray(config.codecs)) {
      const validCodecs = this.validationRules.codec.audio;
      const priorityCodecs = this.validationRules.codec.priorities;

      // Check for invalid codecs
      const invalidCodecs = config.codecs.filter(codec => !validCodecs.includes(codec));
      if (invalidCodecs.length > 0) {
        result.warnings.push(`Unsupported codecs: ${invalidCodecs.join(', ')}`);
      }

      // Suggest optimal codec order
      const hasOpus = config.codecs.includes('opus');
      const hasG722 = config.codecs.includes('G722');

      if (!hasOpus) {
        result.suggestions.push('Consider adding Opus codec for better quality');
      }

      if (!hasG722) {
        result.suggestions.push('Consider adding G.722 codec for HD audio');
      }

      // Check codec priority order
      const optimalOrder = priorityCodecs.filter(codec => config.codecs.includes(codec));
      if (JSON.stringify(config.codecs.slice(0, optimalOrder.length)) !== JSON.stringify(optimalOrder)) {
        result.suggestions.push(`Optimal codec order: ${optimalOrder.join(', ')}`);
      }
    } else if (!config.codecs) {
      result.suggestions.push('Specify preferred codecs for optimal audio quality');
    }

    return result;
  }

  /**
   * Provider-specific validation
   */
  validateProviderSpecific(config, providerType) {
    const result = { errors: [], warnings: [] };

    switch (providerType) {
      case 'twilio':
        return this.validateTwilioConfig(config);
      case 'asterisk':
        return this.validateAsteriskConfig(config);
      case '3cx':
        return this.validate3CXConfig(config);
      case 'freepbx':
        return this.validateFreePBXConfig(config);
      default:
        return result;
    }
  }

  /**
   * Validate Twilio-specific configuration
   */
  validateTwilioConfig(config) {
    const result = { errors: [], warnings: [] };

    if (config.accountSid && !config.accountSid.startsWith('AC')) {
      result.errors.push('Invalid Twilio Account SID format');
    }

    if (config.apiKey && !config.apiKey.startsWith('SK')) {
      result.errors.push('Invalid Twilio API Key format');
    }

    if (config.region) {
      const validRegions = ['us1', 'ie1', 'ap1', 'sydney1', 'tokyo1'];
      if (!validRegions.includes(config.region)) {
        result.warnings.push(`Unknown Twilio region: ${config.region}`);
      }
    }

    if (config.transport && config.transport.toUpperCase() !== 'WSS') {
      result.warnings.push('Twilio recommends WSS transport');
    }

    return result;
  }

  /**
   * Validate Asterisk-specific configuration
   */
  validateAsteriskConfig(config) {
    const result = { errors: [], warnings: [] };

    if (config.context && !/^[a-zA-Z0-9_-]+$/.test(config.context)) {
      result.errors.push('Invalid Asterisk context format');
    }

    if (config.qualify && !['yes', 'no'].includes(config.qualify)) {
      result.warnings.push('Asterisk qualify should be "yes" or "no"');
    }

    return result;
  }

  /**
   * Validate 3CX-specific configuration
   */
  validate3CXConfig(config) {
    const result = { errors: [], warnings: [] };

    if (config.extension && (config.extension.length < 3 || config.extension.length > 5)) {
      result.errors.push('3CX extension should be 3-5 digits');
    }

    if (config.transport && config.transport.toUpperCase() !== 'TCP') {
      result.warnings.push('3CX typically uses TCP transport');
    }

    return result;
  }

  /**
   * Validate FreePBX-specific configuration
   */
  validateFreePBXConfig(config) {
    const result = { errors: [], warnings: [] };

    if (config.context && !['from-internal', 'from-external', 'default'].includes(config.context)) {
      result.warnings.push('Non-standard FreePBX context');
    }

    if (config.nat && !['yes', 'no', 'auto', 'auto_force_rport'].includes(config.nat)) {
      result.warnings.push('Invalid NAT setting for FreePBX');
    }

    return result;
  }

  /**
   * Calculate validation score
   */
  calculateValidationScore(result) {
    let score = 100;

    // Deduct points for errors
    score -= result.errors.length * 25;

    // Deduct points for warnings
    score -= result.warnings.length * 10;

    // Bonus for having suggestions (shows advanced configuration)
    if (result.suggestions.length > 0 && result.errors.length === 0) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(config, template) {
    const suggestions = [];

    // Suggest optimal defaults
    for (const [field, value] of Object.entries(template.defaults)) {
      if (!config[field]) {
        suggestions.push(`Consider setting ${field} to ${value} for optimal performance`);
      }
    }

    // Suggest security improvements
    if (config.transport && !this.validationRules.transport.secure.includes(config.transport.toUpperCase())) {
      suggestions.push('Upgrade to secure transport (TLS/WSS) for better security');
    }

    // Suggest codec optimization
    if (!config.codecs || !config.codecs.includes('opus')) {
      suggestions.push('Add Opus codec for superior audio quality');
    }

    return suggestions;
  }

  /**
   * Get detailed validation information
   */
  getValidationDetails(config, template) {
    return {
      providerName: template.name,
      requiredFields: template.requiredFields,
      optionalFields: template.optionalFields,
      providedFields: Object.keys(config),
      missingOptional: template.optionalFields.filter(field => !config[field]),
      recommendedDefaults: template.defaults,
      securityLevel: this.assessSecurityLevel(config),
      networkCompatibility: this.assessNetworkCompatibility(config)
    };
  }

  /**
   * Assess security level
   */
  assessSecurityLevel(config) {
    let level = 'basic';
    let score = 0;

    if (this.validationRules.transport.secure.includes(config.transport?.toUpperCase())) {
      score += 30;
    }

    if (config.password && config.password.length >= 12) {
      score += 20;
    }

    if (config.password && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(config.password)) {
      score += 20;
    }

    if (config.authUser !== config.username) {
      score += 10;
    }

    if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';

    return { level, score };
  }

  /**
   * Assess network compatibility
   */
  assessNetworkCompatibility(config) {
    const compatibility = {
      firewallFriendly: false,
      natTraversal: 'unknown',
      mobileCompatible: false,
      webCompatible: false
    };

    // Check firewall friendliness
    if (['WSS', 'TLS'].includes(config.transport?.toUpperCase())) {
      compatibility.firewallFriendly = true;
    }

    // Check NAT traversal
    if (['WSS', 'WS'].includes(config.transport?.toUpperCase())) {
      compatibility.natTraversal = 'good';
    } else if (['UDP'].includes(config.transport?.toUpperCase())) {
      compatibility.natTraversal = 'requires_stun';
    }

    // Check mobile compatibility
    if (['WSS', 'WS'].includes(config.transport?.toUpperCase())) {
      compatibility.mobileCompatible = true;
    }

    // Check web compatibility
    if (['WSS', 'WS'].includes(config.transport?.toUpperCase())) {
      compatibility.webCompatible = true;
    }

    return compatibility;
  }

  /**
   * Get provider template
   */
  getProviderTemplate(providerType) {
    return this.providerTemplates[providerType];
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.keys(this.providerTemplates).map(type => ({
      type,
      name: this.providerTemplates[type].name,
      description: this.getProviderDescription(type)
    }));
  }

  /**
   * Get provider description
   */
  getProviderDescription(providerType) {
    const descriptions = {
      twilio: 'Cloud-based communications platform with global infrastructure',
      generic: 'Standard SIP configuration for any compatible provider',
      asterisk: 'Open source PBX and telephony toolkit',
      '3cx': 'Complete communications system for businesses',
      freepbx: 'Web-based open source GUI that manages Asterisk'
    };

    return descriptions[providerType] || 'SIP provider configuration';
  }

  /**
   * Validate batch configurations
   */
  validateBatch(configurations) {
    const results = [];

    for (const config of configurations) {
      const result = this.validateConfiguration(config.config, config.provider);
      results.push({
        ...result,
        name: config.name,
        id: config.id
      });
    }

    return {
      results,
      summary: {
        total: results.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid).length,
        averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
      }
    };
  }
}

export default SIPConfigValidator;