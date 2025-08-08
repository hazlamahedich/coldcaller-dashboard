const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class SIPManager extends EventEmitter {
  constructor() {
    super();
    this.registrationStatus = {
      registered: false,
      server: null,
      username: null,
      lastRegistration: null,
      lastError: null,
      connectionQuality: 'unknown'
    };
    this.activeConnections = new Map();
    this.callMetrics = {
      totalCalls: 0,
      activeCalls: 0,
      averageLatency: 0,
      packetLoss: 0
    };
  }

  /**
   * Test SIP configuration
   */
  async testConfiguration(config) {
    try {
      // Simulate SIP connection test
      // In production, this would use actual SIP.js library
      const result = {
        success: false,
        error: null,
        latency: 0,
        timestamp: new Date().toISOString()
      };

      // Basic validation
      if (!config.server || !config.username || !config.password) {
        result.error = 'Missing required configuration fields';
        return result;
      }

      if (config.port < 1 || config.port > 65535) {
        result.error = 'Invalid port number';
        return result;
      }

      // Simulate network test
      const startTime = Date.now();
      
      // Mock successful connection for development
      await new Promise(resolve => setTimeout(resolve, 100));
      
      result.latency = Date.now() - startTime;
      result.success = true;
      result.message = 'SIP server connection successful';
      result.serverInfo = {
        server: config.server,
        port: config.port,
        transport: config.transport
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        latency: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Register SIP account
   */
  async register(config) {
    try {
      // Simulate SIP registration
      // In production, this would use SIP.js UserAgent
      
      this.registrationStatus = {
        registered: true,
        server: config.server,
        username: config.username,
        lastRegistration: new Date().toISOString(),
        lastError: null,
        connectionQuality: 'excellent'
      };

      this.emit('registered', this.registrationStatus);

      return {
        success: true,
        message: 'SIP account registered successfully',
        status: this.registrationStatus
      };
    } catch (error) {
      this.registrationStatus.lastError = error.message;
      this.emit('registrationFailed', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unregister SIP account
   */
  async unregister() {
    try {
      this.registrationStatus.registered = false;
      this.registrationStatus.lastUnregistration = new Date().toISOString();
      
      // Close all active connections
      this.activeConnections.clear();
      this.callMetrics.activeCalls = 0;

      this.emit('unregistered');

      return {
        success: true,
        message: 'SIP account unregistered successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get registration status
   */
  async getRegistrationStatus() {
    return {
      ...this.registrationStatus,
      callMetrics: this.callMetrics,
      activeConnections: this.activeConnections.size
    };
  }

  /**
   * Initialize call session
   */
  async initiateCall(callData) {
    try {
      if (!this.registrationStatus.registered) {
        throw new Error('SIP not registered');
      }

      const callId = callData.id || `call_${Date.now()}`;
      const callSession = {
        id: callId,
        phoneNumber: callData.phoneNumber,
        startTime: new Date().toISOString(),
        status: 'connecting',
        quality: {
          latency: 0,
          jitter: 0,
          packetLoss: 0
        }
      };

      this.activeConnections.set(callId, callSession);
      this.callMetrics.activeCalls++;
      this.callMetrics.totalCalls++;

      this.emit('callInitiated', callSession);

      // Simulate call connection
      setTimeout(() => {
        callSession.status = 'connected';
        callSession.connectedAt = new Date().toISOString();
        this.emit('callConnected', callSession);
      }, 1000);

      return {
        success: true,
        callId,
        session: callSession
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * End call session
   */
  async endCall(callId) {
    try {
      const callSession = this.activeConnections.get(callId);
      if (!callSession) {
        throw new Error('Call session not found');
      }

      callSession.status = 'ended';
      callSession.endTime = new Date().toISOString();
      
      if (callSession.connectedAt) {
        const duration = Date.parse(callSession.endTime) - Date.parse(callSession.connectedAt);
        callSession.duration = Math.floor(duration / 1000); // seconds
      }

      this.activeConnections.delete(callId);
      this.callMetrics.activeCalls--;

      this.emit('callEnded', callSession);

      return {
        success: true,
        session: callSession
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start call recording
   */
  async startRecording(callId, recordingPath) {
    try {
      const callSession = this.activeConnections.get(callId);
      if (!callSession) {
        throw new Error('Call session not found');
      }

      const recordingDir = path.dirname(recordingPath);
      await fs.mkdir(recordingDir, { recursive: true });

      callSession.recording = {
        active: true,
        startTime: new Date().toISOString(),
        filePath: recordingPath,
        format: 'mp3',
        bitrate: '128kbps'
      };

      this.emit('recordingStarted', { callId, recording: callSession.recording });

      return {
        success: true,
        recording: callSession.recording
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop call recording
   */
  async stopRecording(callId) {
    try {
      const callSession = this.activeConnections.get(callId);
      if (!callSession || !callSession.recording) {
        throw new Error('No active recording found');
      }

      callSession.recording.active = false;
      callSession.recording.endTime = new Date().toISOString();
      
      const duration = Date.parse(callSession.recording.endTime) - 
                      Date.parse(callSession.recording.startTime);
      callSession.recording.duration = Math.floor(duration / 1000);

      this.emit('recordingStopped', { callId, recording: callSession.recording });

      return {
        success: true,
        recording: callSession.recording
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get call quality metrics
   */
  getCallQuality(callId) {
    const callSession = this.activeConnections.get(callId);
    if (!callSession) {
      return null;
    }

    // Simulate quality metrics
    callSession.quality = {
      latency: Math.floor(Math.random() * 100) + 50, // 50-150ms
      jitter: Math.floor(Math.random() * 20) + 5,    // 5-25ms
      packetLoss: Math.random() * 2,                 // 0-2%
      mos: 4.2 + (Math.random() * 0.6),             // 4.2-4.8 MOS score
      timestamp: new Date().toISOString()
    };

    return callSession.quality;
  }

  /**
   * Get all active calls
   */
  getActiveCalls() {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Get call metrics
   */
  getCallMetrics() {
    return {
      ...this.callMetrics,
      registrationStatus: this.registrationStatus.registered,
      activeConnections: this.activeConnections.size
    };
  }
}

// Export singleton instance
module.exports = new SIPManager();