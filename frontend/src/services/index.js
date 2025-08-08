/**
 * Services Index
 * Central export for all API services
 */

// Import all services
import { api, apiClient } from './api.js';
import leadsService from './leadsService.js';
import scriptsService from './scriptsService.js';
import audioService from './audioService.js';
import { audioManager } from './AudioManager.js';
import callsService from './callsService.js';

// Import VOIP services
import voipService from './VOIPService.js';
import SIPManager from './SIPManager.js';
import MediaManager from './MediaManager.js';
import CallSession from './CallSession.js';
import SIPConfigManager from './SIPConfigManager.js';

// Import utilities and hooks
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import audioUtils from '../utils/audioUtils.js';
import webrtcUtils from '../utils/webrtcUtils.js';

// Re-export all services for easy importing
export {
  api,
  apiClient,
  leadsService,
  scriptsService,
  audioService,
  audioManager,
  callsService,
  voipService,
  SIPManager,
  MediaManager,
  CallSession,
  SIPConfigManager,
  useAudioRecorder,
  audioUtils,
  webrtcUtils
};

// Default export with all services grouped
const services = {
  api,
  apiClient,
  leads: leadsService,
  scripts: scriptsService,
  audio: audioService,
  audioManager,
  calls: callsService,
  voip: voipService,
  sip: {
    manager: SIPManager,
    mediaManager: MediaManager,
    callSession: CallSession,
    configManager: SIPConfigManager
  },
  hooks: {
    useAudioRecorder
  },
  utils: {
    audioUtils,
    webrtcUtils
  }
};

export default services;