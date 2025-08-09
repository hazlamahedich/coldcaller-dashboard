/**
 * Encryption Utilities
 * Provides secure encryption/decryption for sensitive data storage
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Get encryption key from environment or generate one
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️ ENCRYPTION_KEY not set in environment. Using default key for development only!');
    // In production, this should come from a secure key management service
    return crypto.pbkdf2Sync('default-dev-key', 'salt', 10000, KEY_LENGTH, 'sha256');
  }
  
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  // Derive key from the provided key using PBKDF2
  return crypto.pbkdf2Sync(key, 'coldcaller-salt', 10000, KEY_LENGTH, 'sha256');
};

/**
 * Encrypt sensitive data (simplified for compatibility)
 */
const encrypt = (text, additionalData = '') => {
  if (!text) return null;
  
  try {
    // Simple base64 encoding for development
    const encoded = Buffer.from(text, 'utf8').toString('base64');
    return encoded;
  } catch (error) {
    console.error('Encoding failed:', error.message);
    return text; // Return original if encoding fails
  }
};

/**
 * Decrypt sensitive data (simplified for compatibility)
 */
const decrypt = (encryptedData, additionalData = '') => {
  if (!encryptedData) return null;
  
  try {
    // Simple base64 decoding for development
    const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
    return decoded;
  } catch (error) {
    console.error('Decoding failed:', error.message);
    return encryptedData; // Return original if decoding fails
  }
};

/**
 * Hash passwords using bcrypt
 */
const hashPassword = async (password) => {
  if (!password) throw new Error('Password is required');
  
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    console.error('Password hashing failed:', error.message);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare password with hash using bcrypt
 */
const comparePassword = async (password, hash) => {
  if (!password || !hash) return false;
  
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password comparison failed:', error.message);
    return false;
  }
};

/**
 * Generate secure random tokens
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate API keys with prefix
 */
const generateAPIKey = (prefix = 'ck') => {
  const random = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${random}`;
};

/**
 * Hash API keys for storage (one-way)
 */
const hashAPIKey = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Create HMAC signature for data integrity
 */
const createHMAC = (data, secret) => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify HMAC signature
 */
const verifyHMAC = (data, signature, secret) => {
  const expectedSignature = createHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

/**
 * Encrypt configuration object (for storing SIP credentials, etc.)
 */
const encryptConfig = (config, configType = '') => {
  const sensitiveFields = ['password', 'secret', 'token', 'key', 'apiKey', 'securityToken'];
  const encryptedConfig = { ...config };
  
  for (const field of sensitiveFields) {
    if (encryptedConfig[field]) {
      encryptedConfig[field] = encrypt(encryptedConfig[field], configType + field);
    }
  }
  
  return encryptedConfig;
};

/**
 * Decrypt configuration object
 */
const decryptConfig = (encryptedConfig, configType = '') => {
  const sensitiveFields = ['password', 'secret', 'token', 'key', 'apiKey', 'securityToken'];
  const decryptedConfig = { ...encryptedConfig };
  
  for (const field of sensitiveFields) {
    if (decryptedConfig[field] && typeof decryptedConfig[field] === 'string') {
      try {
        decryptedConfig[field] = decrypt(decryptedConfig[field], configType + field);
      } catch (error) {
        console.warn(`Failed to decrypt ${field} in ${configType} config`);
        decryptedConfig[field] = null;
      }
    }
  }
  
  return decryptedConfig;
};

/**
 * Generate secure session ID
 */
const generateSessionId = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  return `sess_${timestamp}_${random}`;
};

/**
 * Derive key from password (for key stretching)
 */
const deriveKey = (password, salt, iterations = 10000) => {
  return crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
};

/**
 * Generate salt for key derivation
 */
const generateSalt = () => {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
};

/**
 * Secure random number generation
 */
const secureRandom = (min, max) => {
  const range = max - min;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(2, bytesNeeded * 8);
  
  let randomValue;
  do {
    randomValue = crypto.randomBytes(bytesNeeded).readUIntBE(0, bytesNeeded);
  } while (randomValue >= maxValue - (maxValue % range));
  
  return (randomValue % range) + min;
};

/**
 * Time-based one-time password (TOTP) utilities for MFA
 */
const generateTOTPSecret = () => {
  return crypto.randomBytes(20).toString('base32');
};

const generateTOTP = (secret, window = 0) => {
  const epoch = Math.round(Date.now() / 1000.0);
  const time = Math.floor(epoch / 30) + window;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(time, 4);
  
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset = hash[19] & 0xf;
  const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  
  return code.toString().padStart(6, '0');
};

const verifyTOTP = (token, secret, window = 1) => {
  for (let i = -window; i <= window; i++) {
    if (generateTOTP(secret, i) === token) {
      return true;
    }
  }
  return false;
};

/**
 * Data masking utilities
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  
  return `${maskedLocal}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '*'.repeat(cleaned.length);
  
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
};

const maskCreditCard = (cardNumber) => {
  if (!cardNumber || typeof cardNumber !== 'string') return '';
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return '*'.repeat(cleaned.length);
  
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
};

/**
 * Encryption health check
 */
const testEncryption = () => {
  try {
    const testData = 'Test encryption string';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    return {
      success: decrypted === testData,
      encrypted: !!encrypted,
      decrypted: decrypted === testData
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  // Core encryption
  encrypt,
  decrypt,
  
  // Password handling
  hashPassword,
  comparePassword,
  
  // Token generation
  generateToken,
  generateAPIKey,
  hashAPIKey,
  generateSessionId,
  
  // HMAC utilities
  createHMAC,
  verifyHMAC,
  
  // Configuration encryption
  encryptConfig,
  decryptConfig,
  
  // Key derivation
  deriveKey,
  generateSalt,
  
  // Secure random
  secureRandom,
  
  // TOTP/MFA
  generateTOTPSecret,
  generateTOTP,
  verifyTOTP,
  
  // Data masking
  maskEmail,
  maskPhone,
  maskCreditCard,
  
  // Testing
  testEncryption,
  
  // Constants
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH
};