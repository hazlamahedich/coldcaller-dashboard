/**
 * SIP Provider Presets - Pre-configured settings for major SIP providers
 * Includes provider-specific optimizations and codec configurations
 */

export const SIP_PROVIDER_PRESETS = {
  twilio: {
    name: 'Twilio',
    type: 'cloud',
    category: 'VoIP Service',
    description: 'Cloud-based communication platform with global reach',
    wsServers: ['wss://chunder.twilio.com/v1/wsserver'],
    
    authentication: {
      method: 'token',
      tokenEndpoint: '/api/twilio/token',
      supportedMethods: ['token']
    },
    
    connection: {
      transport: 'wss',
      port: 443,
      stunServers: [
        'stun:global.stun.twilio.com:3478',
        'stun:stun.l.google.com:19302'
      ],
      turnServers: [], // Twilio provides TURN automatically
      registerExpires: 300,
      natTraversal: 'auto'
    },
    
    media: {
      preferredCodecs: ['opus', 'pcmu', 'pcma'],
      supportedCodecs: ['opus', 'g722', 'pcmu', 'pcma', 'g729'],
      primaryCodec: 'opus',
      sampleRate: 48000,
      bitrate: 64000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    
    dtmf: {
      supportedMethods: ['rfc4733', 'info'],
      preferred: 'rfc4733',
      duration: 160,
      interToneGap: 50,
      payloadType: 101
    },
    
    features: {
      recording: true,
      conferencing: true,
      transcription: true,
      sipTrunking: true,
      video: true,
      messaging: true
    },
    
    limitations: {
      maxConcurrentCalls: 1000,
      regionSupport: 'global',
      customizationLevel: 'limited'
    },
    
    documentation: {
      setupGuide: 'https://www.twilio.com/docs/voice/sdks/javascript',
      apiDocs: 'https://www.twilio.com/docs/voice/client/javascript',
      supportLevel: 'enterprise'
    }
  },

  ringcentral: {
    name: 'RingCentral',
    type: 'cloud',
    category: 'UCaaS',
    description: 'Unified Communications as a Service platform',
    wsServers: ['wss://platform.ringcentral.com/restapi/v1.0/client-info/sip-provision'],
    
    authentication: {
      method: 'oauth',
      tokenEndpoint: '/api/ringcentral/token',
      supportedMethods: ['oauth', 'digest']
    },
    
    connection: {
      transport: 'wss',
      port: 443,
      stunServers: [
        'stun:stun.ringcentral.com:3478',
        'stun:stun.l.google.com:19302'
      ],
      turnServers: [],
      registerExpires: 600,
      natTraversal: 'stun'
    },
    
    media: {
      preferredCodecs: ['opus', 'g722', 'pcmu'],
      supportedCodecs: ['opus', 'g722', 'g729', 'pcmu', 'pcma'],
      primaryCodec: 'opus',
      sampleRate: 16000,
      bitrate: 32000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    
    dtmf: {
      supportedMethods: ['rfc4733', 'info'],
      preferred: 'rfc4733',
      duration: 200,
      interToneGap: 50,
      payloadType: 101
    },
    
    features: {
      recording: true,
      conferencing: true,
      transcription: true,
      sipTrunking: true,
      video: true,
      messaging: true,
      presence: true
    }
  },

  vonage: {
    name: 'Vonage (Nexmo)',
    type: 'cloud',
    category: 'CPaaS',
    description: 'Communications Platform as a Service',
    wsServers: ['wss://api.nexmo.com/v1/voice/websocket'],
    
    authentication: {
      method: 'jwt',
      tokenEndpoint: '/api/vonage/token',
      supportedMethods: ['jwt', 'api_key']
    },
    
    connection: {
      transport: 'wss',
      port: 443,
      stunServers: [
        'stun:stun.vonage.com:3478',
        'stun:stun.l.google.com:19302'
      ],
      turnServers: [],
      registerExpires: 300,
      natTraversal: 'auto'
    },
    
    media: {
      preferredCodecs: ['opus', 'pcmu', 'pcma'],
      supportedCodecs: ['opus', 'g722', 'pcmu', 'pcma'],
      primaryCodec: 'opus',
      sampleRate: 48000,
      bitrate: 64000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    
    dtmf: {
      supportedMethods: ['rfc4733', 'info'],
      preferred: 'rfc4733',
      duration: 160,
      interToneGap: 40,
      payloadType: 101
    },
    
    features: {
      recording: true,
      conferencing: false,
      transcription: true,
      sipTrunking: true,
      video: true,
      messaging: true
    }
  },

  freepbx: {
    name: 'FreePBX',
    type: 'pbx',
    category: 'On-Premise PBX',
    description: 'Open-source IP PBX based on Asterisk',
    wsServers: null, // User configurable
    
    authentication: {
      method: 'digest',
      supportedMethods: ['digest', 'md5']
    },
    
    connection: {
      transport: 'wss',
      port: 5061,
      stunServers: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302'
      ],
      turnServers: [],
      registerExpires: 120,
      natTraversal: 'stun'
    },
    
    media: {
      preferredCodecs: ['g722', 'pcmu', 'pcma', 'opus'],
      supportedCodecs: ['g722', 'g729', 'pcmu', 'pcma', 'gsm', 'opus'],
      primaryCodec: 'g722',
      sampleRate: 16000,
      bitrate: 64000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false
    },
    
    dtmf: {
      supportedMethods: ['rfc4733', 'info', 'inband'],
      preferred: 'rfc4733',
      duration: 100,
      interToneGap: 50,
      payloadType: 101
    },
    
    features: {
      recording: true,
      conferencing: true,
      transcription: false,
      sipTrunking: true,
      video: true,
      voicemail: true,
      callQueues: true
    }
  },

  '3cx': {
    name: '3CX',
    type: 'pbx',
    category: 'Unified Communications',
    description: 'Software-based IP PBX system',
    wsServers: null, // User configurable: wss://hostname:5001/ws
    
    authentication: {
      method: 'digest',
      supportedMethods: ['digest']
    },
    
    connection: {
      transport: 'wss',
      port: 5001,
      stunServers: [
        'stun:stun.l.google.com:19302'
      ],
      turnServers: [],
      registerExpires: 300,
      natTraversal: 'stun'
    },
    
    media: {
      preferredCodecs: ['opus', 'g722', 'pcmu'],
      supportedCodecs: ['opus', 'g722', 'g729', 'pcmu', 'pcma'],
      primaryCodec: 'opus',
      sampleRate: 48000,
      bitrate: 32000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    
    dtmf: {
      supportedMethods: ['rfc4733', 'info'],
      preferred: 'rfc4733',
      duration: 160,
      interToneGap: 50,
      payloadType: 101
    },
    
    features: {
      recording: true,
      conferencing: true,
      transcription: false,
      sipTrunking: true,
      video: true,
      chat: true,
      presence: true
    }
  },

  asterisk: {
    name: 'Asterisk',
    type: 'pbx',
    category: 'Open Source PBX',
    description: 'Open-source framework for building communications applications',
    wsServers: null, // User configurable
    
    authentication: {
      method: 'digest',
      supportedMethods: ['digest', 'md5']
    },
    
    connection: {
      transport: 'wss',
      port: 8088,
      stunServers: [
        'stun:stun.l.google.com:19302'
      ],
      turnServers: [],
      registerExpires: 120,
      natTraversal: 'ice'
    },
    
    media: {
      preferredCodecs: ['g722', 'opus', 'pcmu', 'pcma'],
      supportedCodecs: ['g722', 'g729', 'pcmu', 'pcma', 'gsm', 'ilbc', 'opus', 'g726'],
      primaryCodec: 'g722',
      sampleRate: 16000,
      bitrate: 64000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false
    },
    
    dtmf: {
      supportedMethods: ['rfc4733', 'info', 'inband'],
      preferred: 'rfc4733',
      duration: 100,
      interToneGap: 50,
      payloadType: 101
    },
    
    features: {
      recording: true,
      conferencing: true,
      transcription: false,
      sipTrunking: true,
      video: true,
      agi: true,
      ami: true
    }
  },

  generic: {
    name: 'Generic SIP',
    type: 'generic',
    category: 'Custom Provider',
    description: 'Generic SIP configuration for custom providers',
    wsServers: null, // User configurable
    
    authentication: {
      method: 'digest',
      supportedMethods: ['digest', 'md5', 'token']
    },
    
    connection: {
      transport: 'wss',
      port: 5060,
      stunServers: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302'
      ],
      turnServers: [],
      registerExpires: 300,
      natTraversal: 'auto'
    },
    
    media: {
      preferredCodecs: ['opus', 'g722', 'pcmu', 'pcma'],
      supportedCodecs: ['opus', 'g722', 'g729', 'pcmu', 'pcma', 'gsm'],
      primaryCodec: 'opus',
      sampleRate: 48000,
      bitrate: 64000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    
    dtmf: {
      supportedMethods: ['rfc4733', 'info', 'inband'],
      preferred: 'rfc4733',
      duration: 160,
      interToneGap: 50,
      payloadType: 101
    },
    
    features: {
      recording: false,
      conferencing: false,
      transcription: false,
      sipTrunking: true,
      video: false
    }
  }
};

/**
 * Get provider preset by ID
 */
export const getProviderPreset = (providerId) => {
  return SIP_PROVIDER_PRESETS[providerId] || SIP_PROVIDER_PRESETS.generic;
};

/**
 * Get all available provider presets
 */
export const getAllProviderPresets = () => {
  return Object.entries(SIP_PROVIDER_PRESETS).map(([id, preset]) => ({
    id,
    ...preset
  }));
};

/**
 * Auto-detect provider from SIP URI
 */
export const detectProviderFromURI = (sipUri) => {
  if (!sipUri) return 'generic';
  
  const uri = sipUri.toLowerCase();
  
  if (uri.includes('twilio.com')) return 'twilio';
  if (uri.includes('ringcentral.com')) return 'ringcentral';
  if (uri.includes('vonage.com') || uri.includes('nexmo.com')) return 'vonage';
  if (uri.includes('3cx.')) return '3cx';
  
  return 'generic';
};

/**
 * Generate provider-specific configuration template
 */
export const generateConfigTemplate = (providerId, customSettings = {}) => {
  const preset = getProviderPreset(providerId);
  
  return {
    provider: providerId,
    name: preset.name,
    authentication: {
      ...preset.authentication,
      ...customSettings.authentication
    },
    connection: {
      ...preset.connection,
      ...customSettings.connection
    },
    media: {
      ...preset.media,
      ...customSettings.media
    },
    dtmf: {
      ...preset.dtmf,
      ...customSettings.dtmf
    },
    features: {
      ...preset.features,
      ...customSettings.features
    }
  };
};

export default SIP_PROVIDER_PRESETS;