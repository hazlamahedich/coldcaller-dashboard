/**
 * VOIP Security Testing Mocks
 * Mock implementations for SIP, WebRTC, and VOIP security testing
 * These prepare for future VOIP implementation
 */

// Mock SIP Message Generator
export class MockSIPMessage {
  constructor(method, uri, headers = {}, body = '') {
    this.method = method;
    this.uri = uri;
    this.headers = {
      'Via': 'SIP/2.0/WSS client.example.com:443;branch=z9hG4bK-123456',
      'Max-Forwards': '70',
      'From': 'user@example.com;tag=12345',
      'To': 'target@example.com',
      'Call-ID': `${Date.now()}-${Math.random()}@client.example.com`,
      'CSeq': '1 ' + method,
      'Contact': 'sip:user@client.example.com:443;transport=wss',
      'User-Agent': 'ColdCaller VOIP Client 1.0',
      'Content-Length': body.length.toString(),
      ...headers
    };
    this.body = body;
    this.sourceIP = headers.sourceIP || '192.168.1.100';
    this.timestamp = Date.now();
  }

  static create(method, options = {}) {
    return new MockSIPMessage(
      method,
      options.uri || 'sip:default@example.com',
      options.headers || {},
      options.body || ''
    );
  }

  static createInvite(options = {}) {
    const sdp = options.body || `
v=0
o=user 123456 654321 IN IP4 192.168.1.100
s=ColdCaller Session
c=IN IP4 192.168.1.100
t=0 0
m=audio 5004 UDP/TLS/RTP/SAVPF 111
a=rtpmap:111 opus/48000/2
a=fingerprint:sha-256 12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF
a=setup:actpass
a=sendrecv
`;

    return new MockSIPMessage('INVITE', options.to || 'sip:target@example.com', {
      'From': options.from || 'user@example.com;tag=12345',
      'To': options.to || 'target@example.com',
      'Call-ID': options.callId || `call-${Date.now()}@client.example.com`,
      'Content-Type': 'application/sdp',
      'Authorization': options.authorization,
      'sourceIP': options.sourceIP
    }, sdp);
  }

  toRawMessage() {
    let message = `${this.method} ${this.uri} SIP/2.0\r\n`;
    
    Object.entries(this.headers).forEach(([key, value]) => {
      if (value !== undefined && key !== 'sourceIP') {
        message += `${key}: ${value}\r\n`;
      }
    });
    
    message += '\r\n';
    if (this.body) {
      message += this.body;
    }
    
    return message;
  }
}

// Mock SIP Proxy with Security Features
export class MockSIPProxy {
  constructor(config = {}) {
    this.config = {
      requireAuth: true,
      rateLimitEnabled: true,
      messageValidation: true,
      maxRequestsPerSecond: 10,
      maxRequestsPerMinute: 60,
      ...config
    };
    
    this.requestCounts = new Map(); // IP -> count tracking
    this.authNonces = new Map(); // Nonce -> expiry tracking
    this.activeSessions = new Map(); // Call-ID -> session info
    this.penalties = new Map(); // IP -> penalty expiry
    this.lastProcessedMessage = null;
    this.lastProcessedSDP = null;
  }

  async handleMessage(sipMessage) {
    this.lastProcessedMessage = sipMessage;
    
    // Check IP penalties first
    if (this.isPenalized(sipMessage.sourceIP)) {
      return this.createResponse(503, 'Service Unavailable', {
        'Retry-After': this.getPenaltyDuration(sipMessage.sourceIP).toString()
      });
    }

    // Rate limiting
    if (this.config.rateLimitEnabled && this.isRateLimited(sipMessage.sourceIP)) {
      this.applyPenalty(sipMessage.sourceIP, 60); // 1 minute penalty
      return this.createResponse(429, 'Too Many Requests');
    }

    // Message validation
    if (this.config.messageValidation) {
      const validationResult = this.validateMessage(sipMessage);
      if (!validationResult.valid) {
        return this.createResponse(400, `Bad Request - ${validationResult.reason}`);
      }
    }

    // Authentication check
    if (this.config.requireAuth && this.requiresAuthentication(sipMessage.method)) {
      const authResult = await this.handleAuthentication(sipMessage);
      if (authResult.statusCode !== 200) {
        return authResult;
      }
    }

    // Process SDP if present
    if (sipMessage.body && sipMessage.headers['Content-Type']?.includes('application/sdp')) {
      this.lastProcessedSDP = this.sanitizeSDP(sipMessage.body);
    }

    // Handle method-specific logic
    return this.handleMethodSpecific(sipMessage);
  }

  createResponse(statusCode, reasonPhrase, headers = {}) {
    const response = {
      statusCode,
      reasonPhrase,
      headers: {
        'Via': 'SIP/2.0/WSS proxy.example.com:443;branch=z9hG4bK-response',
        'Content-Length': '0',
        'Server': 'ColdCaller SIP Proxy 1.0',
        ...headers
      },
      timestamp: Date.now(),
      responseTime: Math.random() * 50 + 10 // 10-60ms simulated response time
    };

    return response;
  }

  isRateLimited(sourceIP) {
    const now = Date.now();
    const windowSize = 60000; // 1 minute window
    
    if (!this.requestCounts.has(sourceIP)) {
      this.requestCounts.set(sourceIP, []);
    }
    
    const requests = this.requestCounts.get(sourceIP);
    
    // Clean old requests outside window
    const recentRequests = requests.filter(time => now - time < windowSize);
    this.requestCounts.set(sourceIP, recentRequests);
    
    // Add current request
    recentRequests.push(now);
    
    return recentRequests.length > this.config.maxRequestsPerMinute;
  }

  validateMessage(sipMessage) {
    // Check for basic SIP structure
    if (!sipMessage.method || !sipMessage.uri) {
      return { valid: false, reason: 'Missing method or URI' };
    }

    // Check for malicious headers
    for (const [key, value] of Object.entries(sipMessage.headers)) {
      if (typeof value === 'string') {
        if (value.includes('<script>') || value.includes('javascript:') || value.includes('../')) {
          return { valid: false, reason: `Invalid header: ${key}` };
        }
        
        // Check for CRLF injection
        if (value.includes('\r') || value.includes('\n')) {
          return { valid: false, reason: `CRLF injection in header: ${key}` };
        }
      }
    }

    // Validate URI format
    if (sipMessage.uri.includes('<script>') || sipMessage.uri.includes('../')) {
      return { valid: false, reason: 'Invalid URI format' };
    }

    // Check message size
    const messageSize = JSON.stringify(sipMessage).length;
    if (messageSize > 1024 * 1024) { // 1MB limit
      return { valid: false, reason: 'Message too large' };
    }

    return { valid: true };
  }

  requiresAuthentication(method) {
    return ['INVITE', 'REGISTER', 'MESSAGE', 'REFER'].includes(method);
  }

  async handleAuthentication(sipMessage) {
    const authHeader = sipMessage.headers['Authorization'];
    
    if (!authHeader) {
      // Generate challenge
      const nonce = this.generateNonce();
      this.authNonces.set(nonce, Date.now() + 300000); // 5 minute expiry
      
      return this.createResponse(401, 'Unauthorized', {
        'WWW-Authenticate': `Digest realm="secure-domain.com", nonce="${nonce}", algorithm=MD5, qop="auth"`
      });
    }

    // Validate digest authentication
    const digestInfo = this.parseDigestAuth(authHeader);
    if (!digestInfo) {
      return this.createResponse(401, 'Unauthorized - Invalid auth format');
    }

    // Check nonce validity
    if (!this.authNonces.has(digestInfo.nonce) || Date.now() > this.authNonces.get(digestInfo.nonce)) {
      return this.createResponse(401, 'Unauthorized - Invalid or expired nonce');
    }

    // Validate credentials (simplified for mock)
    if (digestInfo.username === 'admin' && digestInfo.response === 'invalid') {
      return this.createResponse(403, 'Forbidden - Weak credentials');
    }

    // Remove used nonce to prevent replay
    this.authNonces.delete(digestInfo.nonce);
    
    return this.createResponse(200, 'OK');
  }

  generateNonce() {
    return Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64');
  }

  parseDigestAuth(authHeader) {
    // Simplified digest auth parser
    if (!authHeader.startsWith('Digest ')) return null;
    
    const params = {};
    const paramRegex = /(\w+)=["']?([^"',\s]+)["']?/g;
    let match;
    
    while ((match = paramRegex.exec(authHeader)) !== null) {
      params[match[1]] = match[2];
    }
    
    return params.username && params.nonce && params.response ? params : null;
  }

  sanitizeSDP(sdp) {
    // Remove potentially dangerous SDP attributes
    let sanitized = sdp
      .replace(/a=tool:.*\r?\n/g, '')
      .replace(/a=malicious:.*\r?\n/g, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/\.\.\//g, '');
    
    return sanitized;
  }

  handleMethodSpecific(sipMessage) {
    switch (sipMessage.method) {
      case 'INVITE':
        return this.handleInvite(sipMessage);
      case 'REGISTER':
        return this.handleRegister(sipMessage);
      case 'BYE':
        return this.handleBye(sipMessage);
      case 'OPTIONS':
        return this.handleOptions(sipMessage);
      case 'REFER':
        return this.handleRefer(sipMessage);
      default:
        return this.createResponse(501, 'Not Implemented');
    }
  }

  handleInvite(sipMessage) {
    const callId = sipMessage.headers['Call-ID'];
    const from = sipMessage.headers['From'];
    
    // Check for session hijacking
    if (this.activeSessions.has(callId)) {
      const existingSession = this.activeSessions.get(callId);
      if (existingSession.sourceIP !== sipMessage.sourceIP) {
        return this.createResponse(403, 'Forbidden - Session hijacking detected');
      }
    } else {
      // Create new session
      this.activeSessions.set(callId, {
        sourceIP: sipMessage.sourceIP,
        from,
        startTime: Date.now()
      });
    }

    // Simulate call processing
    return this.createResponse(100, 'Trying');
  }

  handleRegister(sipMessage) {
    // Check for registration flooding from same IP
    const registrationsFromIP = Array.from(this.activeSessions.values())
      .filter(session => session.sourceIP === sipMessage.sourceIP)
      .length;
    
    if (registrationsFromIP > 5) {
      this.applyPenalty(sipMessage.sourceIP, 300); // 5 minute penalty
      return this.createResponse(429, 'Too Many Registrations');
    }
    
    return this.createResponse(200, 'OK');
  }

  handleBye(sipMessage) {
    const callId = sipMessage.headers['Call-ID'];
    
    // Validate session exists and source matches
    if (this.activeSessions.has(callId)) {
      const session = this.activeSessions.get(callId);
      if (session.sourceIP !== sipMessage.sourceIP) {
        return this.createResponse(403, 'Forbidden - Unauthorized session termination');
      }
      this.activeSessions.delete(callId);
    }
    
    return this.createResponse(200, 'OK');
  }

  handleOptions(sipMessage) {
    // Don't reveal too much information
    return this.createResponse(200, 'OK', {
      'Allow': 'INVITE, ACK, CANCEL, BYE, REGISTER',
      'Supported': 'path, outbound'
    });
  }

  handleRefer(sipMessage) {
    const callId = sipMessage.headers['Call-ID'];
    const referTo = sipMessage.headers['Refer-To'];
    
    // Validate session exists
    if (!this.activeSessions.has(callId)) {
      return this.createResponse(404, 'Call Not Found');
    }
    
    const session = this.activeSessions.get(callId);
    if (session.sourceIP !== sipMessage.sourceIP) {
      return this.createResponse(403, 'Unauthorized - REFER from wrong source');
    }
    
    // Check if REFER target is suspicious
    if (referTo?.includes('malicious.com') || referTo?.includes('attacker')) {
      return this.createResponse(403, 'Forbidden - Suspicious redirect target');
    }
    
    return this.createResponse(202, 'Accepted');
  }

  isPenalized(sourceIP) {
    if (!this.penalties.has(sourceIP)) return false;
    
    const penaltyExpiry = this.penalties.get(sourceIP);
    if (Date.now() > penaltyExpiry) {
      this.penalties.delete(sourceIP);
      return false;
    }
    
    return true;
  }

  applyPenalty(sourceIP, seconds) {
    const currentPenalty = this.penalties.get(sourceIP) || Date.now();
    const newExpiry = Math.max(currentPenalty, Date.now()) + (seconds * 1000);
    this.penalties.set(sourceIP, newExpiry);
  }

  getPenaltyDuration(sourceIP) {
    if (!this.penalties.has(sourceIP)) return 0;
    return Math.max(0, Math.ceil((this.penalties.get(sourceIP) - Date.now()) / 1000));
  }

  getLastProcessedMessage() {
    return this.lastProcessedMessage;
  }

  getLastProcessedSDP() {
    return this.lastProcessedSDP;
  }

  reset() {
    this.requestCounts.clear();
    this.authNonces.clear();
    this.activeSessions.clear();
    this.penalties.clear();
    this.lastProcessedMessage = null;
    this.lastProcessedSDP = null;
  }
}

// Mock WebRTC Manager
export class MockWebRTCManager {
  constructor(config = {}) {
    this.config = {
      requireEncryption: true,
      validateCertificates: true,
      enforceSecureTransport: true,
      maxConnectionsPerUser: 10,
      bandwidthLimit: 1000000, // 1 Mbps
      ...config
    };
    
    this.activeConnections = new Map();
    this.connectionAttempts = new Map();
    this.bandwidthMonitors = new Map();
  }

  async createSecurePeerConnection(options = {}) {
    const { userId = 'anonymous', sourceIP = '192.168.1.100' } = options;
    
    // Rate limiting check
    if (this.isConnectionRateLimited(sourceIP)) {
      throw new Error('Connection rate limit exceeded');
    }
    
    // Connection limit check
    if (this.isUserConnectionLimitExceeded(userId)) {
      throw new Error('Connection limit exceeded for user');
    }
    
    const peerConnection = new MockPeerConnection(this.config);
    
    // Track connection
    const connectionId = `${userId}-${Date.now()}`;
    this.activeConnections.set(connectionId, {
      userId,
      sourceIP,
      peerConnection,
      startTime: Date.now()
    });
    
    // Track attempt for rate limiting
    this.trackConnectionAttempt(sourceIP);
    
    return peerConnection;
  }

  isConnectionRateLimited(sourceIP) {
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const maxAttempts = 5;
    
    if (!this.connectionAttempts.has(sourceIP)) {
      return false;
    }
    
    const attempts = this.connectionAttempts.get(sourceIP)
      .filter(time => now - time < windowSize);
    
    return attempts.length >= maxAttempts;
  }

  isUserConnectionLimitExceeded(userId) {
    const userConnections = Array.from(this.activeConnections.values())
      .filter(conn => conn.userId === userId).length;
    
    return userConnections >= this.config.maxConnectionsPerUser;
  }

  trackConnectionAttempt(sourceIP) {
    if (!this.connectionAttempts.has(sourceIP)) {
      this.connectionAttempts.set(sourceIP, []);
    }
    this.connectionAttempts.get(sourceIP).push(Date.now());
  }

  async validateMediaStream(mediaStream) {
    // Check stream source
    if (mediaStream.source === 'unknown' || mediaStream.source === 'file') {
      return {
        isValid: false,
        reason: 'Untrusted stream source'
      };
    }
    
    // Check constraints
    if (mediaStream.constraints?.audio?.echoCancellation === false) {
      return {
        isValid: false,
        reason: 'Suspicious audio configuration'
      };
    }
    
    return { isValid: true };
  }

  createQualityMonitor(peerConnection) {
    return new MockQualityMonitor(peerConnection);
  }

  getBandwidthMonitor(peerConnection) {
    const connId = peerConnection.connectionId;
    if (!this.bandwidthMonitors.has(connId)) {
      this.bandwidthMonitors.set(connId, new MockBandwidthMonitor(this.config.bandwidthLimit));
    }
    return this.bandwidthMonitors.get(connId);
  }

  async detectMediaInjection(peerConnection, audioData) {
    const negotiatedConstraints = peerConnection.negotiatedConstraints;
    
    // Check if audio parameters match negotiated values
    if (audioData.sampleRate !== negotiatedConstraints?.sampleRate) {
      return true;
    }
    
    if (audioData.channelCount !== negotiatedConstraints?.channelCount) {
      return true;
    }
    
    if (audioData.source === 'synthetic') {
      return true;
    }
    
    return false;
  }

  cleanup() {
    this.activeConnections.clear();
    this.connectionAttempts.clear();
    this.bandwidthMonitors.clear();
  }
}

// Mock Peer Connection
export class MockPeerConnection {
  constructor(config = {}) {
    this.config = config;
    this.connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.connectionState = 'new';
    this.iceGatheringState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.localCandidates = [];
    this.remoteCandidates = [];
    this.tracks = [];
    this.negotiatedConstraints = null;
    this.eventListeners = new Map();
    this.consentFreshnessConfig = {
      enabled: true,
      interval: 5000,
      timeout: 30000
    };
  }

  async createOffer(options = {}) {
    const sdp = `
v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=ice-ufrag:${this.generateICEUfrag()}
a=ice-pwd:${this.generateICEPassword()}
a=fingerprint:sha-256 ${this.generateFingerprint()}
a=setup:actpass
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:${this.generateICEUfrag()}
a=ice-pwd:${this.generateICEPassword()}
a=fingerprint:sha-256 ${this.generateFingerprint()}
a=setup:actpass
a=mid:0
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
`;

    return { type: 'offer', sdp: sdp.trim() };
  }

  async createAnswer(options = {}) {
    if (!this.remoteDescription) {
      throw new Error('No remote description set');
    }

    const sdp = this.remoteDescription.sdp
      .replace('a=setup:actpass', 'a=setup:active')
      .replace(/o=- \d+/, `o=- ${Date.now()}`);

    return { type: 'answer', sdp };
  }

  async setLocalDescription(description) {
    if (description && description.sdp) {
      // Validate encryption is present
      if (this.config.requireEncryption && !description.sdp.includes('UDP/TLS/RTP/SAVPF')) {
        throw new Error('Encryption required but not present in SDP');
      }
    }
    
    this.localDescription = description;
    this.connectionState = 'connecting';
    
    // Simulate ICE gathering
    setTimeout(() => {
      this.iceGatheringState = 'gathering';
      this.dispatchEvent(new Event('icegatheringstatechange'));
      
      setTimeout(() => {
        this.iceGatheringState = 'complete';
        this.dispatchEvent(new Event('icegatheringstatechange'));
      }, 100);
    }, 10);
  }

  async setRemoteDescription(description) {
    if (!description || !description.sdp) {
      throw new Error('Invalid remote description');
    }

    // Security validations
    if (this.config.requireEncryption) {
      if (!description.sdp.includes('UDP/TLS/RTP/SAVPF') && !description.sdp.includes('TCP/TLS/RTP/SAVPF')) {
        throw new Error('Secure transport required');
      }
    }

    // Check for fingerprint
    if (this.config.validateCertificates && !description.sdp.includes('a=fingerprint:')) {
      throw new Error('DTLS fingerprint required');
    }

    // Validate fingerprint format
    const fingerprintMatch = description.sdp.match(/a=fingerprint:sha-256 ([A-F0-9:]+)/);
    if (fingerprintMatch) {
      const fingerprint = fingerprintMatch[1];
      if (fingerprint === 'INVALID:FINGERPRINT:12:34:56:78:90' || fingerprint.length < 80) {
        throw new Error('Invalid fingerprint format');
      }
    }

    // Check for downgrade attacks
    if (this.localDescription && this.localDescription.sdp.includes('UDP/TLS/RTP/SAVPF') &&
        !description.sdp.includes('UDP/TLS/RTP/SAVPF')) {
      throw new Error('Downgrade attack detected - encryption downgrade not allowed');
    }

    this.remoteDescription = description;
    this.connectionState = 'connected';
    
    this.dispatchEvent(new Event('connectionstatechange'));
  }

  async addIceCandidate(candidate) {
    if (!candidate || !candidate.candidate) {
      throw new Error('Invalid ICE candidate');
    }

    // Security validations
    if (candidate.candidate.includes('<script>') || candidate.candidate.includes('javascript:')) {
      throw new Error('Malicious candidate detected');
    }

    // Check for too many candidates (DoS protection)
    if (this.remoteCandidates.length > 50) {
      throw new Error('Too many ICE candidates');
    }

    this.remoteCandidates.push(candidate);
  }

  async addTrack(track, stream) {
    const sender = new MockRTCRtpSender(track);
    this.tracks.push({ track, stream, sender });
    return sender;
  }

  getTransceivers() {
    return this.tracks.map(({ track, sender }) => ({
      direction: 'sendrecv',
      sender,
      receiver: new MockRTCRtpReceiver(track)
    }));
  }

  async getStats() {
    return new Map([
      ['candidate-pair-1', {
        type: 'candidate-pair',
        state: 'succeeded',
        bytesSent: 12345,
        bytesReceived: 54321
      }],
      ['outbound-rtp-1', {
        type: 'outbound-rtp',
        packetsSent: 100,
        bytesSent: 12345
      }]
    ]);
  }

  async getLocalCandidates() {
    return this.localCandidates.map(candidate => ({
      candidate: candidate.replace(/192\.168\.\d+\.\d+/, 'obfuscated.local'),
      sdpMLineIndex: 0
    }));
  }

  async getRemoteCertificates() {
    if (!this.config.validateCertificates) {
      return null;
    }

    return {
      fingerprints: [{
        algorithm: 'sha-256',
        value: '12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF'
      }],
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      issuer: 'Valid CA',
      subject: 'company.com'
    };
  }

  getConsentFreshnessConfig() {
    return this.consentFreshnessConfig;
  }

  async generateRTCPReports() {
    return [
      {
        type: 'sender-report',
        timestamp: Math.floor(Date.now() / 1000) * 1000, // Rounded for privacy
        packetsSent: 100,
        bytesSent: 12345
      }
    ];
  }

  generateICEUfrag() {
    return Math.random().toString(36).substr(2, 8);
  }

  generateICEPassword() {
    return Math.random().toString(36).substr(2, 24);
  }

  generateFingerprint() {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
    ).join(':');
  }

  addEventListener(type, listener) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(listener);
  }

  dispatchEvent(event) {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
  }

  close() {
    this.connectionState = 'closed';
    this.dispatchEvent(new Event('connectionstatechange'));
  }
}

// Mock RTC RTP Sender
class MockRTCRtpSender {
  constructor(track) {
    this.track = track;
  }

  async replaceTrack(newTrack) {
    // Security check: prevent unauthorized replacement
    if (newTrack && newTrack.source === 'file') {
      throw new Error('Unauthorized track replacement - file source not allowed');
    }
    
    this.track = newTrack;
  }

  static getCapabilities(kind) {
    const capabilities = {
      audio: {
        codecs: [
          { mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
          { mimeType: 'audio/G722', clockRate: 16000, channels: 1 },
          { mimeType: 'audio/PCMU', clockRate: 8000, channels: 1 },
          { mimeType: 'audio/PCMA', clockRate: 8000, channels: 1 }
        ]
      },
      video: {
        codecs: [
          { mimeType: 'video/VP8', clockRate: 90000 },
          { mimeType: 'video/H264', clockRate: 90000 }
        ]
      }
    };

    return capabilities[kind] || { codecs: [] };
  }
}

// Mock RTC RTP Receiver
class MockRTCRtpReceiver {
  constructor(track) {
    this.track = track;
  }

  static getCapabilities(kind) {
    return MockRTCRtpSender.getCapabilities(kind);
  }
}

// Mock Media Stream
export class MediaStreamMock {
  constructor(kind = 'audio', options = {}) {
    this.id = options.id || `stream-${Date.now()}`;
    this.kind = kind;
    this.source = options.source || 'microphone';
    this.constraints = options.constraints || {};
    this.bitrate = options.bitrate || 64000;
    this.tracks = [new MediaStreamTrackMock(kind, options)];
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter(track => track.kind === 'audio');
  }

  getVideoTracks() {
    return this.tracks.filter(track => track.kind === 'video');
  }

  simulateQualityDegradation(metrics) {
    this.qualityMetrics = metrics;
  }

  simulateHighBandwidthUsage(bitrate) {
    this.bitrate = bitrate;
  }
}

// Mock Media Stream Track
class MediaStreamTrackMock {
  constructor(kind, options = {}) {
    this.kind = kind;
    this.id = `track-${Date.now()}`;
    this.enabled = true;
    this.readyState = 'live';
    this.source = options.source || 'microphone';
  }
}

// Mock ICE Candidate
export class ICECandidateMock {
  constructor(init) {
    this.candidate = init.candidate || '';
    this.sdpMLineIndex = init.sdpMLineIndex || 0;
    this.sdpMid = init.sdpMid || null;
  }
}

// Mock Quality Monitor
class MockQualityMonitor {
  constructor(peerConnection) {
    this.peerConnection = peerConnection;
    this.isStarted = false;
  }

  async start() {
    this.isStarted = true;
  }

  async checkForAnomalies() {
    // Simulate detection based on stream quality metrics
    const stream = this.peerConnection.tracks[0]?.stream;
    if (stream && stream.qualityMetrics) {
      const metrics = stream.qualityMetrics;
      
      if (metrics.packetLoss > 20 || metrics.jitter > 200 || metrics.rtt > 1000) {
        return {
          detected: true,
          suspiciousMetrics: Object.keys(metrics).filter(key => 
            (key === 'packetLoss' && metrics[key] > 20) ||
            (key === 'jitter' && metrics[key] > 200) ||
            (key === 'rtt' && metrics[key] > 1000)
          ),
          threatLevel: 'HIGH'
        };
      }
    }

    return { detected: false };
  }
}

// Mock Bandwidth Monitor
class MockBandwidthMonitor {
  constructor(limit) {
    this.limit = limit;
  }

  async getCurrentUsage() {
    // Simulate bandwidth monitoring
    return {
      actualBitrate: Math.min(this.requestedBitrate || 128000, this.limit),
      requestedBitrate: this.requestedBitrate || 128000,
      limited: (this.requestedBitrate || 128000) > this.limit,
      throttleReason: (this.requestedBitrate || 128000) > this.limit ? 'Bandwidth limit exceeded' : null
    };
  }

  setRequestedBitrate(bitrate) {
    this.requestedBitrate = bitrate;
  }
}

// Security Test Utils
export class SecurityTestUtils {
  constructor() {
    this.testData = new Map();
  }

  createMaliciousFile(name) {
    return new File(['malicious content'], name, { type: 'application/octet-stream' });
  }

  createOversizedFile(sizeMB) {
    const size = sizeMB * 1024 * 1024;
    const content = new Array(size).fill('A').join('');
    return new File([content], 'large.mp3', { type: 'audio/mpeg' });
  }

  validateFileType(file, allowedTypes) {
    return allowedTypes.includes(file.type);
  }

  validateFileSize(file, maxSizeMB) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  }

  generateDigestAuth({ username, realm, password, nonce, uri, method }) {
    // Simplified digest generation for testing
    const ha1 = this.md5(`${username}:${realm}:${password}`);
    const ha2 = this.md5(`${method}:${uri}`);
    const response = this.md5(`${ha1}:${nonce}:${ha2}`);
    
    return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  }

  extractNonce(wwwAuthHeader) {
    const nonceMatch = wwwAuthHeader.match(/nonce="([^"]+)"/);
    return nonceMatch ? nonceMatch[1] : null;
  }

  md5(input) {
    // Simplified MD5 for testing - not cryptographically secure
    return Buffer.from(input).toString('base64').substr(0, 32);
  }

  cleanup() {
    this.testData.clear();
  }
}

// Threat Simulator
export class ThreatSimulator {
  constructor() {
    this.attackPatterns = new Map();
  }

  simulateRobocalling(callData) {
    return callData.volume > 100 && callData.averageDuration < 30;
  }

  simulateSpoofing(callData) {
    // Simulate caller ID spoofing detection
    return callData.callerId && callData.callerId.includes('fake');
  }

  simulateFlooding(requestCount, timeWindow) {
    return requestCount > (timeWindow / 1000) * 10; // 10 requests per second threshold
  }

  simulateDDoS(sources) {
    // Multiple sources attacking
    return sources.length > 100;
  }
}

export function generateRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
}

export function createTestAudioData() {
  return new ArrayBuffer(1024); // Simulate audio data
}