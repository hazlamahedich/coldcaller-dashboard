/**
 * Services Index
 * Central export for all API services
 */

// Import all services
import { api, apiClient } from './api.js';
import leadsService from './leadsService.js';
import scriptsService from './scriptsService.js';
import audioService from './audioService.js';
import callsService from './callsService.js';

// Re-export all services for easy importing
export {
  api,
  apiClient,
  leadsService,
  scriptsService,
  audioService,
  callsService
};

// Default export with all services grouped
const services = {
  api,
  apiClient,
  leads: leadsService,
  scripts: scriptsService,
  audio: audioService,
  calls: callsService
};

export default services;