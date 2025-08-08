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

// Import audio utilities and hooks
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import audioUtils from '../utils/audioUtils.js';

// Re-export all services for easy importing
export {
  api,
  apiClient,
  leadsService,
  scriptsService,
  audioService,
  audioManager,
  callsService,
  useAudioRecorder,
  audioUtils
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
  hooks: {
    useAudioRecorder
  },
  utils: {
    audioUtils
  }
};

export default services;