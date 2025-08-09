#!/usr/bin/env node

/**
 * Twilio Setup Script for ColdCaller Dashboard
 * Interactive setup wizard for Twilio integration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class TwilioSetup {
  constructor() {
    this.config = {};
    this.envPath = path.join(process.cwd(), '.env');
    this.backendEnvPath = path.join(process.cwd(), 'backend', '.env');
    this.frontendEnvPath = path.join(process.cwd(), 'frontend', '.env');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async question(prompt) {
    return new Promise(resolve => {
      rl.question(prompt, resolve);
    });
  }

  async start() {
    this.log('\n🎯 Twilio Integration Setup for ColdCaller Dashboard', 'cyan');
    this.log('=' .repeat(60), 'cyan');
    
    this.log('\nThis wizard will help you configure Twilio Voice integration.', 'bright');
    this.log('Please have your Twilio Console open: https://console.twilio.com/', 'yellow');
    
    const proceed = await this.question('\nDo you want to continue? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      this.log('Setup cancelled.', 'yellow');
      process.exit(0);
    }

    await this.gatherCredentials();
    await this.validateCredentials();
    await this.setupWebhooks();
    await this.updateEnvironmentFiles();
    await this.installDependencies();
    await this.testSetup();
    await this.showNextSteps();
    
    rl.close();
  }

  async gatherCredentials() {
    this.log('\n📋 Step 1: Twilio Credentials', 'green');
    this.log('Please provide your Twilio credentials from the Console Dashboard:', 'bright');
    
    this.config.accountSid = await this.question('Account SID (starts with AC): ');
    this.config.authToken = await this.question('Auth Token: ');
    
    const useApiKey = await this.question('\nDo you want to use API Key (recommended for production)? (y/N): ');
    if (useApiKey.toLowerCase() === 'y') {
      this.log('\nCreate an API Key in Twilio Console: Settings → API Keys & Tokens', 'yellow');
      this.config.apiKey = await this.question('API Key SID (starts with SK): ');
      this.config.apiSecret = await this.question('API Key Secret: ');
    }
    
    this.config.phoneNumber = await this.question('Twilio Phone Number (format: +1234567890): ');
    
    const createTwimlApp = await this.question('\nDo you need to create a TwiML Application? (y/N): ');
    if (createTwimlApp.toLowerCase() === 'y') {
      this.log('\nCreate a TwiML App in Twilio Console: Develop → Voice → TwiML → TwiML Apps', 'yellow');
      this.log('Leave webhook URLs empty for now, we\'ll update them later.', 'yellow');
    }
    
    this.config.twimlAppSid = await this.question('TwiML Application SID (starts with AP, optional): ') || '';
  }

  async validateCredentials() {
    this.log('\n🔍 Step 2: Validating Credentials', 'green');
    
    // Basic validation
    const validations = [
      { field: 'accountSid', pattern: /^AC[a-f0-9]{32}$/, name: 'Account SID' },
      { field: 'authToken', pattern: /^[a-f0-9]{32}$/, name: 'Auth Token' },
      { field: 'phoneNumber', pattern: /^\+\d{10,15}$/, name: 'Phone Number' }
    ];

    if (this.config.apiKey) {
      validations.push(
        { field: 'apiKey', pattern: /^SK[a-f0-9]{32}$/, name: 'API Key' },
        { field: 'apiSecret', pattern: /^[a-zA-Z0-9]{32}$/, name: 'API Secret' }
      );
    }

    let isValid = true;
    for (const validation of validations) {
      if (!validation.pattern.test(this.config[validation.field])) {
        this.log(`❌ Invalid ${validation.name} format`, 'red');
        isValid = false;
      } else {
        this.log(`✅ ${validation.name} format is valid`, 'green');
      }
    }

    if (!isValid) {
      this.log('\nPlease check your credentials and restart the setup.', 'red');
      process.exit(1);
    }
  }

  async setupWebhooks() {
    this.log('\n🔗 Step 3: Webhook Configuration', 'green');
    
    const domain = await this.question('Enter your domain (or ngrok URL for development): ');
    
    this.config.webhooks = {
      voice: `${domain}/api/twilio/voice`,
      status: `${domain}/api/twilio/status`,
      recording: `${domain}/api/twilio/recording`
    };

    this.log('\n📝 Webhook URLs generated:', 'bright');
    Object.entries(this.config.webhooks).forEach(([key, url]) => {
      this.log(`  ${key}: ${url}`, 'cyan');
    });

    this.log('\n⚠️  Important: Update these URLs in your Twilio Console:', 'yellow');
    this.log('  1. Phone Number Configuration: Phone Numbers → Manage → Active numbers', 'yellow');
    this.log('  2. TwiML Application: Develop → Voice → TwiML → TwiML Apps', 'yellow');
  }

  async updateEnvironmentFiles() {
    this.log('\n📝 Step 4: Updating Environment Files', 'green');
    
    const envConfig = this.generateEnvConfig();
    
    // Update main .env file
    await this.updateEnvFile(this.envPath, envConfig);
    
    // Update backend .env if exists
    if (fs.existsSync(path.dirname(this.backendEnvPath))) {
      await this.updateEnvFile(this.backendEnvPath, envConfig);
    }
    
    // Update frontend .env if exists
    if (fs.existsSync(path.dirname(this.frontendEnvPath))) {
      const frontendConfig = {
        'REACT_APP_ENABLE_TWILIO_VOICE': 'true',
        'REACT_APP_TWILIO_DEBUG': 'true'
      };
      await this.updateEnvFile(this.frontendEnvPath, frontendConfig);
    }
    
    this.log('✅ Environment files updated successfully', 'green');
  }

  generateEnvConfig() {
    const config = {
      'TWILIO_ACCOUNT_SID': this.config.accountSid,
      'TWILIO_AUTH_TOKEN': this.config.authToken,
      'TWILIO_PHONE_NUMBER': this.config.phoneNumber,
      'TWILIO_VOICE_WEBHOOK_URL': this.config.webhooks.voice,
      'TWILIO_STATUS_WEBHOOK_URL': this.config.webhooks.status,
      'TWILIO_RECORDING_WEBHOOK_URL': this.config.webhooks.recording,
      'ENABLE_TWILIO_VOICE': 'true',
      'ENABLE_TWILIO_RECORDING': 'true'
    };

    if (this.config.apiKey) {
      config['TWILIO_API_KEY'] = this.config.apiKey;
      config['TWILIO_API_SECRET'] = this.config.apiSecret;
    }

    if (this.config.twimlAppSid) {
      config['TWILIO_TWIML_APP_SID'] = this.config.twimlAppSid;
    }

    return config;
  }

  async updateEnvFile(filePath, newConfig) {
    let content = '';
    
    // Read existing file if it exists
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    // Update or add configuration
    const lines = content.split('\n');
    const updatedLines = [...lines];
    
    Object.entries(newConfig).forEach(([key, value]) => {
      const existingIndex = lines.findIndex(line => line.startsWith(`${key}=`));
      const newLine = `${key}=${value}`;
      
      if (existingIndex !== -1) {
        updatedLines[existingIndex] = newLine;
      } else {
        updatedLines.push(newLine);
      }
    });
    
    // Write updated content
    fs.writeFileSync(filePath, updatedLines.join('\n'));
    this.log(`  Updated: ${filePath}`, 'cyan');
  }

  async installDependencies() {
    this.log('\n📦 Step 5: Installing Dependencies', 'green');
    
    const { spawn } = require('child_process');
    
    // Install backend dependencies
    await this.runCommand('npm', ['install', 'twilio'], 'Installing backend Twilio SDK...');
    
    // Install frontend dependencies
    const frontendPath = path.join(process.cwd(), 'frontend');
    if (fs.existsSync(frontendPath)) {
      process.chdir(frontendPath);
      await this.runCommand('npm', ['install', '@twilio/voice-sdk'], 'Installing frontend Twilio Voice SDK...');
      process.chdir('..');
    }
    
    this.log('✅ Dependencies installed successfully', 'green');
  }

  runCommand(command, args, description) {
    return new Promise((resolve, reject) => {
      this.log(`  ${description}`, 'cyan');
      
      const child = spawn(command, args, { stdio: 'pipe' });
      
      child.on('close', (code) => {
        if (code === 0) {
          this.log(`  ✅ ${description} completed`, 'green');
          resolve();
        } else {
          this.log(`  ❌ ${description} failed`, 'red');
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  async testSetup() {
    this.log('\n🧪 Step 6: Testing Setup', 'green');
    
    const testNow = await this.question('Do you want to test the setup now? (requires server to be running) (y/N): ');
    if (testNow.toLowerCase() !== 'y') {
      this.log('Skipping tests. You can test later using: npm run test:twilio', 'yellow');
      return;
    }
    
    try {
      // Test health endpoint
      const response = await fetch('http://localhost:3001/api/twilio/health');
      if (response.ok) {
        const health = await response.json();
        this.log('✅ Twilio health check passed', 'green');
        this.log(`  Account: ${health.accountSid}`, 'cyan');
        this.log(`  Status: ${health.accountStatus}`, 'cyan');
      } else {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
    } catch (error) {
      this.log(`❌ Health check failed: ${error.message}`, 'red');
      this.log('Make sure your server is running on port 3001', 'yellow');
    }
  }

  async showNextSteps() {
    this.log('\n🎉 Setup Complete!', 'green');
    this.log('=' .repeat(50), 'green');
    
    this.log('\n📋 Next Steps:', 'bright');
    this.log('1. Start your backend server: npm run dev', 'cyan');
    this.log('2. Start your frontend: cd frontend && npm start', 'cyan');
    this.log('3. Update webhook URLs in Twilio Console', 'cyan');
    this.log('4. Test making a call from the dashboard', 'cyan');
    
    this.log('\n🔧 Webhook Configuration Required:', 'yellow');
    this.log('Update these URLs in your Twilio Console:', 'bright');
    Object.entries(this.config.webhooks).forEach(([key, url]) => {
      this.log(`  ${key.toUpperCase()}: ${url}`, 'cyan');
    });
    
    this.log('\n📚 Documentation:', 'bright');
    this.log('  • Setup Guide: TWILIO_SETUP_GUIDE.md', 'cyan');
    this.log('  • Troubleshooting: Check console logs and Twilio Debugger', 'cyan');
    
    this.log('\n🚀 Happy Calling!', 'green');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new TwilioSetup();
  setup.start().catch(error => {
    console.error(`${colors.red}Setup failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = TwilioSetup;