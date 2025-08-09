/**
 * Mock AudioManager for Jest Tests
 */

export const audioManager = {
  stopAllAudio: jest.fn(),
  playClip: jest.fn(() => Promise.resolve()),
  stopClip: jest.fn(),
  setVolume: jest.fn(),
  getVolume: jest.fn(() => 0.7),
  isPlaying: jest.fn(() => false),
  loadClips: jest.fn(() => Promise.resolve([])),
  preloadClips: jest.fn(() => Promise.resolve()),
  cleanup: jest.fn()
};

// Default export
export default audioManager;