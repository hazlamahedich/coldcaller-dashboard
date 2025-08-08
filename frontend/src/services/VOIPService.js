import SIPManager from './SIPManager';
import MediaManager from './MediaManager';
import CallSession from './CallSession';
import SIPConfigManager from './SIPConfigManager';
import webrtcUtils from '../utils/webrtcUtils';

// VOIPService - Main VOIP service orchestrator
// Integrates SIP.js, WebRTC media, call management, and configuration
// Provides high-level API for cold calling application

class VOIPService {
  constructor() {
    // Core managers
    this.sipManager = new SIPManager();
    this.mediaManager = new MediaManager();
    this.configManager = new SIPConfigManager();
    
    // Active sessions
    this.activeSessions = new Map();
    this.currentSession = null;
    
    // Service state
    this.isInitialized = false;
    this.isRegistered = false;
    this.connectionStatus = 'disconnected';
    
    // Event listeners
    this.listeners = new Map();
    
    // Performance monitoring
    this.connectionMonitor = null;
    this.qualityMonitor = null;
    
    this.bindMethods();
  }
  
  // Bind methods to maintain context
  bindMethods() {
    this.handleSIPEvent = this.handleSIPEvent.bind(this);
    this.handleMediaEvent = this.handleMediaEvent.bind(this);
    this.handleConfigEvent = this.handleConfigEvent.bind(this);
    this.handleSessionEvent = this.handleSessionEvent.bind(this);
  }
  
  // Initialize VOIP service
  async initialize(options = {}) {
    try {
      console.log('🎤 Initializing VOIP Service...');
      
      this.emit('statusUpdate', { 
        status: 'initializing',
        message: 'Initializing VOIP components...'
      });
      
      // Check browser support
      this.checkBrowserSupport();
      
      // Initialize media manager
      await this.mediaManager.initialize();
      
      // Initialize configuration manager
      await this.configManager.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Apply mobile optimizations if needed
      if (webrtcUtils.browserSupport.isMobile()) {
        this.applyMobileOptimizations();
      }
      
      this.isInitialized = true;
      
      this.emit('initialized', {
        browserInfo: webrtcUtils.browserSupport.getBrowserInfo(),
        mediaDevices: this.mediaManager.getStatus(),
        configurations: this.configManager.getAllConfigurations()
      });
      
      console.log('✅ VOIP Service initialized successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ VOIP Service initialization failed:', error);
      this.emit('error', { 
        type: 'initialization',
        message: error.message,
        error 
      });
      throw error;
    }
  }
  
  // Check browser WebRTC support
  checkBrowserSupport() {
    if (!webrtcUtils.browserSupport.hasWebRTC()) {
      throw new Error('WebRTC is not supported in this browser');
    }
    
    const requiredFeatures = ['getUserMedia', 'enumerateDevices', 'getStats'];
    const missingFeatures = requiredFeatures.filter(
      feature => !webrtcUtils.browserSupport.hasFeature(feature)
    );
    
    if (missingFeatures.length > 0) {
      console.warn(`⚠️ Missing WebRTC features: ${missingFeatures.join(', ')}`);
    }
    
    console.log('✅ Browser WebRTC support confirmed');
  }
  
  // Set up event listeners for all managers
  setupEventListeners() {
    // SIP Manager events
    this.sipManager.on('statusChange', this.handleSIPEvent);
    this.sipManager.on('registered', this.handleSIPEvent);
    this.sipManager.on('callStarting', this.handleSIPEvent);
    this.sipManager.on('callEstablished', this.handleSIPEvent);
    this.sipManager.on('callTerminated', this.handleSIPEvent);
    this.sipManager.on('incomingCall', this.handleSIPEvent);
    this.sipManager.on('error', this.handleSIPEvent);
    
    // Media Manager events
    this.mediaManager.on('initialized', this.handleMediaEvent);
    this.mediaManager.on('localStreamAcquired', this.handleMediaEvent);
    this.mediaManager.on('remoteStreamReceived', this.handleMediaEvent);
    this.mediaManager.on('deviceChange', this.handleMediaEvent);
    this.mediaManager.on('volumeLevels', this.handleMediaEvent);
    this.mediaManager.on('error', this.handleMediaEvent);
    
    // Configuration Manager events
    this.configManager.on('activeConfigurationChanged', this.handleConfigEvent);
    this.configManager.on('connectionTest', this.handleConfigEvent);
    this.configManager.on('monitoringUpdate', this.handleConfigEvent);
    this.configManager.on('error', this.handleConfigEvent);
  }
  
  // Handle SIP Manager events
  handleSIPEvent(event) {
    console.log('📡 SIP Event:', event);
    
    // Update connection status
    if (event.status) {
      this.connectionStatus = event.status;
      this.isRegistered = event.status === 'registered';
    }
    
    // Forward events with VOIP context
    this.emit('sipEvent', event);
    
    // Handle specific events
    switch (event.type || 'statusChange') {
      case 'callEstablished':
        this.startQualityMonitoring();
        break;
        
      case 'callTerminated':
        this.stopQualityMonitoring();
        break;
        
      case 'incomingCall':
        this.handleIncomingCall(event);
        break;
    }
  }
  
  // Handle Media Manager events
  handleMediaEvent(event) {
    console.log('🎵 Media Event:', event);
    this.emit('mediaEvent', event);
  }
  
  // Handle Configuration Manager events
  handleConfigEvent(event) {
    console.log('⚙️ Config Event:', event);
    this.emit('configEvent', event);
    
    if (event.newConfigId && event.config) {
      // Auto-connect with new configuration
      this.connectWithConfiguration(event.config);
    }
  }
  
  // Handle Session events
  handleSessionEvent(sessionId, event) {
    console.log(`📞 Session Event [${sessionId}]:`, event);
    this.emit('sessionEvent', { sessionId, ...event });
  }
  
  // Connect with SIP configuration
  async connectWithConfiguration(config = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('VOIP Service not initialized');
      }
      
      // Use provided config or active configuration
      const sipConfig = config || this.configManager.getActiveConfiguration();
      
      if (!sipConfig) {
        throw new Error('No SIP configuration available');
      }
      
      this.emit('statusUpdate', { 
        status: 'connecting',
        message: 'Connecting to SIP server...'
      });
      
      // Initialize SIP manager with configuration
      const initResult = await this.sipManager.initialize(sipConfig);
      
      if (initResult.success) {
        // Register with SIP server
        const regResult = await this.sipManager.register();
        
        if (regResult.success) {
          this.emit('connected', {
            configId: sipConfig.id,
            configName: sipConfig.name,
            timestamp: new Date().toISOString()
          });
          
          // Start connection monitoring
          this.configManager.startConnectionMonitoring();
          
          console.log('✅ Connected to SIP server successfully');
          return { success: true };
        } else {
          throw new Error('SIP registration failed');
        }
      } else {
        throw new Error('SIP initialization failed');
      }
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.emit('connectionFailed', { 
        message: error.message,
        error 
      });
      throw error;
    }
  }
  
  // Disconnect from SIP server
  async disconnect() {
    try {
      this.emit('statusUpdate', { 
        status: 'disconnecting',
        message: 'Disconnecting from SIP server...'
      });
      
      // End all active sessions
      await this.endAllSessions();
      
      // Stop monitoring
      this.stopQualityMonitoring();
      this.configManager.stopConnectionMonitoring();
      
      // Disconnect SIP manager
      await this.sipManager.disconnect();
      
      this.isRegistered = false;
      this.connectionStatus = 'disconnected';
      
      this.emit('disconnected', {
        timestamp: new Date().toISOString()
      });
      
      console.log('🔌 Disconnected from SIP server');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
      throw error;
    }
  }
  
  // Make outbound call
  async makeCall(phoneNumber, options = {}) {
    try {
      if (!this.isRegistered) {
        throw new Error('Not connected to SIP server');
      }
      
      if (this.currentSession) {
        throw new Error('Another call is already in progress');
      }
      
      // Get user media first
      const stream = await this.mediaManager.getUserMedia();
      
      // Create call session
      const sessionId = this.generateSessionId();
      const session = new CallSession(sessionId, this.sipManager, {
        phoneNumber,
        direction: 'outbound',
        ...options
      });
      
      // Set up session event listeners
      this.setupSessionEventListeners(session);
      
      // Start the call
      const result = await session.startCall(phoneNumber, options);
      
      if (result.success) {
        this.activeSessions.set(sessionId, session);
        this.currentSession = session;
        
        this.emit('callStarted', {
          sessionId,
          phoneNumber,
          direction: 'outbound',
          timestamp: new Date().toISOString()
        });
        
        console.log(`📞 Outbound call started: ${phoneNumber}`);
        return { success: true, sessionId };
      } else {
        session.destroy();
        throw new Error(result.error || 'Failed to start call');
      }
      
    } catch (error) {
      console.error('❌ Failed to make call:', error);
      this.emit('callFailed', { 
        phoneNumber,
        error: error.message 
      });
      throw error;
    }
  }
  
  // Handle incoming call
  handleIncomingCall(event) {
    try {
      const sessionId = this.generateSessionId();
      const session = new CallSession(sessionId, this.sipManager, {
        phoneNumber: event.from,
        displayName: event.displayName,
        direction: 'inbound'
      });
      
      // Set up session event listeners
      this.setupSessionEventListeners(session);
      
      this.activeSessions.set(sessionId, session);
      
      this.emit('incomingCall', {
        sessionId,
        from: event.from,
        displayName: event.displayName,
        timestamp: event.timestamp
      });
      
      console.log(`📲 Incoming call: ${event.from}`);
      
    } catch (error) {
      console.error('❌ Failed to handle incoming call:', error);
    }
  }
  
  // Answer incoming call
  async answerCall(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Call session not found');
      }
      
      // Get user media
      const stream = await this.mediaManager.getUserMedia();
      
      // Answer the call
      const result = await session.answerCall();
      
      if (result.success) {
        this.currentSession = session;
        
        this.emit('callAnswered', {
          sessionId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Call answered: ${sessionId}`);
        return { success: true };
      } else {
        throw new Error('Failed to answer call');
      }
      
    } catch (error) {
      console.error('❌ Failed to answer call:', error);
      this.emit('callFailed', { 
        sessionId,
        error: error.message 
      });
      throw error;
    }
  }
  
  // Reject incoming call
  async rejectCall(sessionId, reason = 'declined') {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Call session not found');
      }
      
      const result = await session.rejectCall(reason);
      
      if (result.success) {
        this.activeSessions.delete(sessionId);
        
        this.emit('callRejected', {
          sessionId,
          reason,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🚫 Call rejected: ${sessionId}`);
        return { success: true };
      } else {
        throw new Error('Failed to reject call');
      }
      
    } catch (error) {
      console.error('❌ Failed to reject call:', error);
      throw error;
    }
  }
  
  // End active call
  async endCall(sessionId = null) {
    try {
      const targetSessionId = sessionId || (this.currentSession?.sessionId);
      if (!targetSessionId) {
        throw new Error('No active call to end');
      }
      
      const session = this.activeSessions.get(targetSessionId);
      if (!session) {
        throw new Error('Call session not found');
      }
      
      const result = await session.endCall();
      
      if (result.success) {
        this.activeSessions.delete(targetSessionId);
        
        if (this.currentSession?.sessionId === targetSessionId) {
          this.currentSession = null;
        }
        
        this.emit('callEnded', {
          sessionId: targetSessionId,
          duration: result.duration,
          timestamp: new Date().toISOString()
        });
        
        console.log(`📵 Call ended: ${targetSessionId}`);
        return { success: true, duration: result.duration };
      } else {
        throw new Error('Failed to end call');
      }
      
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      throw error;
    }
  }
  
  // Hold/unhold call
  async toggleHold(sessionId = null) {
    try {
      const targetSessionId = sessionId || (this.currentSession?.sessionId);
      if (!targetSessionId) {
        throw new Error('No active call');
      }
      
      const session = this.activeSessions.get(targetSessionId);
      if (!session) {
        throw new Error('Call session not found');
      }
      
      const isOnHold = session.mediaState.isOnHold;
      const result = isOnHold 
        ? await session.unholdCall()
        : await session.holdCall();
      
      if (result.success) {
        this.emit('holdStatusChanged', {
          sessionId: targetSessionId,
          isOnHold: !isOnHold,
          timestamp: new Date().toISOString()
        });
        
        console.log(`${isOnHold ? '▶️' : '⏸️'} Call ${isOnHold ? 'resumed' : 'held'}: ${targetSessionId}`);
        return { success: true, isOnHold: !isOnHold };
      } else {
        throw new Error(`Failed to ${isOnHold ? 'unhold' : 'hold'} call`);
      }
      
    } catch (error) {
      console.error('❌ Failed to toggle hold:', error);
      throw error;
    }
  }
  
  // Send DTMF tone
  async sendDTMF(tone, sessionId = null) {
    try {
      const targetSessionId = sessionId || (this.currentSession?.sessionId);
      if (!targetSessionId) {
        throw new Error('No active call');
      }
      
      const session = this.activeSessions.get(targetSessionId);
      if (!session) {
        throw new Error('Call session not found');
      }
      
      const result = await session.sendDTMF(tone);
      
      if (result.success) {
        this.emit('dtmfSent', {
          sessionId: targetSessionId,
          tone,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🔢 DTMF sent: ${tone}`);
        return { success: true };
      } else {
        throw new Error(`Failed to send DTMF: ${tone}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send DTMF:', error);
      throw error;
    }
  }
  
  // Mute/unmute microphone
  async toggleMute(sessionId = null) {
    try {
      const targetSessionId = sessionId || (this.currentSession?.sessionId);
      if (!targetSessionId) {
        throw new Error('No active call');
      }
      
      const session = this.activeSessions.get(targetSessionId);
      if (!session) {
        throw new Error('Call session not found');
      }
      
      const isMuted = session.mediaState.isMuted;
      const result = await session.setMute(!isMuted);
      
      if (result.success) {
        this.emit('muteStatusChanged', {
          sessionId: targetSessionId,
          isMuted: !isMuted,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🎤 Microphone ${isMuted ? 'unmuted' : 'muted'}`);
        return { success: true, isMuted: !isMuted };
      } else {
        throw new Error('Failed to toggle mute');
      }
      
    } catch (error) {
      console.error('❌ Failed to toggle mute:', error);
      throw error;
    }
  }
  
  // Set speaker volume
  setVolume(level, sessionId = null) {
    try {
      const targetSessionId = sessionId || (this.currentSession?.sessionId);
      if (!targetSessionId) {
        throw new Error('No active call');
      }
      
      const session = this.activeSessions.get(targetSessionId);
      if (!session) {
        throw new Error('Call session not found');
      }
      
      const result = session.setVolume(level);
      
      if (result.success) {
        this.emit('volumeChanged', {
          sessionId: targetSessionId,
          level,
          timestamp: new Date().toISOString()
        });
        
        return { success: true, level };
      } else {
        throw new Error('Failed to set volume');
      }
      
    } catch (error) {
      console.error('❌ Failed to set volume:', error);
      throw error;
    }
  }
  
  // Set up session event listeners
  setupSessionEventListeners(session) {
    const events = [
      'callStarted', 'callAnswered', 'callRejected', 'callEnded',
      'callHeld', 'callUnheld', 'dtmfSent', 'muteChanged',
      'volumeChanged', 'stateChanged', 'qualityUpdate'
    ];
    
    events.forEach(event => {
      session.on(event, (data) => this.handleSessionEvent(session.sessionId, { type: event, ...data }));
    });
  }
  
  // Start quality monitoring
  startQualityMonitoring() {
    if (!this.sipManager.currentSession) return;
    
    try {
      const peerConnection = this.sipManager.currentSession.sessionDescriptionHandler.peerConnection;
      
      if (peerConnection) {
        this.qualityMonitor = webrtcUtils.connectionMonitoring.monitorConnection(peerConnection);
        
        this.qualityMonitor.onUpdate((quality) => {
          this.emit('qualityUpdate', {
            sessionId: this.currentSession?.sessionId,
            quality,
            timestamp: new Date().toISOString()
          });
        });
        
        this.qualityMonitor.start();
        console.log('📊 Call quality monitoring started');
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to start quality monitoring:', error);
    }
  }
  
  // Stop quality monitoring
  stopQualityMonitoring() {
    if (this.qualityMonitor) {
      this.qualityMonitor.stop();
      this.qualityMonitor = null;
      console.log('📊 Call quality monitoring stopped');
    }
  }
  
  // End all active sessions
  async endAllSessions() {
    const sessionIds = Array.from(this.activeSessions.keys());
    
    await Promise.all(
      sessionIds.map(async (sessionId) => {
        try {
          await this.endCall(sessionId);
        } catch (error) {
          console.error(`Failed to end session ${sessionId}:`, error);
        }
      })
    );
    
    this.activeSessions.clear();
    this.currentSession = null;
  }
  
  // Apply mobile optimizations
  applyMobileOptimizations() {
    console.log('📱 Applying mobile VOIP optimizations...');
    
    // Update media constraints for mobile
    const mobileConstraints = webrtcUtils.performanceOptimization.optimizeForMobile();
    this.mediaManager.updateConstraints(mobileConstraints.audio);
    
    // Reduce connection monitoring frequency on mobile
    if (this.configManager.connectionMonitor) {
      this.configManager.connectionMonitor.intervalMs = 60000; // 1 minute on mobile
    }
  }
  
  // Generate unique session ID
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get comprehensive service status
  getStatus() {
    return {
      // Service status
      isInitialized: this.isInitialized,
      isRegistered: this.isRegistered,
      connectionStatus: this.connectionStatus,
      
      // Active sessions
      activeSessions: this.activeSessions.size,
      currentSessionId: this.currentSession?.sessionId || null,
      
      // Component status
      sipStatus: this.sipManager.getStatus(),
      mediaStatus: this.mediaManager.getStatus(),
      configStatus: this.configManager.getConnectionStatus(),
      
      // Browser info
      browserInfo: webrtcUtils.browserSupport.getBrowserInfo(),
      isMobile: webrtcUtils.browserSupport.isMobile(),
      
      // Monitoring
      qualityMonitoring: !!this.qualityMonitor,
      connectionMonitoring: this.configManager.connectionMonitor.enabled
    };
  }
  
  // Get session summary
  getSessionSummary(sessionId) {
    const session = this.activeSessions.get(sessionId);
    return session ? session.getSummary() : null;
  }
  
  // Get all sessions summary
  getAllSessionsSummary() {
    return Array.from(this.activeSessions.values()).map(session => session.getSummary());
  }
  
  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error);
        }
      });
    }
  }
  
  // Cleanup and destroy
  async destroy() {
    console.log('🧹 Destroying VOIP Service...');
    
    try {
      // End all sessions
      await this.endAllSessions();
      
      // Disconnect from SIP server
      if (this.isRegistered) {
        await this.disconnect();
      }
      
      // Stop monitoring
      this.stopQualityMonitoring();
      
      // Destroy managers
      this.sipManager.destroy();
      this.mediaManager.destroy();
      this.configManager.destroy();
      
      // Clear listeners
      this.listeners.clear();
      
      console.log('✅ VOIP Service destroyed successfully');
      
    } catch (error) {
      console.error('❌ Error during VOIP Service destruction:', error);
    }
  }
}

// Create singleton instance
const voipService = new VOIPService();

export default voipService;