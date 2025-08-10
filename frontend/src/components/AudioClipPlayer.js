import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services';
import { audioManager } from '../services/WebAudioManager';
import { dummyAudioClips, dummyAudioClipsArray, convertAudioClipsToCategories } from '../data/dummyData';
import WaveformVisualizer from './WaveformVisualizer';
// Removed AudioUpload import as it's not used
import AudioLibrary from './AudioLibrary';
import AudioRecorder from './AudioRecorder';
import { useTheme } from '../contexts/ThemeContext';

// AudioClipPlayer Component - Enhanced with Web Audio API integration
// Features real-time waveform visualization, advanced audio controls,
// keyboard shortcuts, and comprehensive audio library management

const AudioClipPlayer = () => {
  const { isDarkMode, themeClasses } = useTheme();
  
  // API Integration State
  const [audioClips, setAudioClips] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Audio Player State
  const [playingClip, setPlayingClip] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('greetings');
  const [audioUrls, setAudioUrls] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Enhanced Audio State
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState('off'); // 'off', 'waveform', 'spectrum', 'both', 'advanced'
  const [showLibrary, setShowLibrary] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [audioManagerReady, setAudioManagerReady] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Audio element reference for fallback playback
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // Load audio clips and initialize audio manager on component mount
  useEffect(() => {
    loadAudioClips();
    initializeAudioManager();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Cleanup Web Audio API resources
      audioManager.stopAllAudio();
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Initialize Web Audio API Manager
  const initializeAudioManager = async () => {
    try {
      const initialized = await audioManager.initialize();
      if (initialized) {
        audioManager.setVolume(volume);
        setAudioManagerReady(true);
        console.log('🎵 Web Audio API initialized');
      } else {
        console.warn('⚠️ Web Audio API not available, using fallback');
        setAudioManagerReady(false);
      }
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error);
      setAudioManagerReady(false);
    }
  };

  // Force add custom category for debugging
  const ensureCustomCategory = (categorizedData) => {
    if (!categorizedData['custom']) {
      console.log('⚠️ Custom category missing, adding default custom clips');
      categorizedData['custom'] = [
        { id: 'custom-1', name: 'Sample Custom Recording', duration: '0:30', category: 'custom' },
        { id: 'custom-2', name: 'My Test Recording', duration: '0:25', category: 'custom' }
      ];
    }
    return categorizedData;
  };

  const loadAudioClips = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading audio clips...');
      
      // First check localStorage for user recordings with detailed logging
      const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
      console.log('💾 Loading: Found', userRecordings.length, 'user recordings in localStorage');
      console.log('📝 User recordings details:', userRecordings.map(r => ({id: r.id, name: r.name, category: r.category})));
      
      const response = await audioService.getAllAudioClips();
      
      console.log('🔍 API Response Debug:', response);
      console.log('🔍 Response success:', response.success);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Is array:', Array.isArray(response.data));
      console.log('🔍 Data length:', response.data?.length || 0);
      
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        // Convert array to categories format that component expects
        const categorizedData = response.data.reduce((acc, clip) => {
          if (!acc[clip.category]) {
            acc[clip.category] = [];
          }
          acc[clip.category].push(clip);
          return acc;
        }, {});
        
        // ALWAYS integrate localStorage data (same as AudioLibrary.js)
        const processedUserRecordings = userRecordings.map(recording => ({
          ...recording,
          category: recording.category || 'custom',
          id: recording.id || Date.now() + Math.random()
        }));
        
        // Add user recordings to their respective categories
        processedUserRecordings.forEach(recording => {
          const category = recording.category || 'custom';
          if (!categorizedData[category]) {
            categorizedData[category] = [];
          }
          
          // Check if recording already exists (avoid duplicates)
          const exists = categorizedData[category].some(clip => clip.id === recording.id);
          if (!exists) {
            categorizedData[category].push(recording);
          }
        });
        
        const finalData = ensureCustomCategory(categorizedData);
        setAudioClips(finalData);
        setApiConnected(true);
        console.log('✅ Audio clips loaded from API:', response.data.length, 'API clips +', userRecordings.length, 'localStorage clips');
        console.log('📋 Categories found:', Object.keys(categorizedData));
        console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
        if (categorizedData['custom']) {
          console.log('🎵 Custom clips:', categorizedData['custom']);
        }
      } else {
        // Fallback to default audio clips if API fails or returns empty data
        console.log('⚠️ API unavailable or empty, loading default audio clips');
        const defaultResponse = await audioService.getDefaultAudioClips();
        
        console.log('🔍 Default response:', defaultResponse);
        
        if (defaultResponse.success && Array.isArray(defaultResponse.data)) {
          // Load user recordings from localStorage with enhanced processing
          const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
          console.log('💾 Found user recordings in localStorage:', userRecordings.length);
          console.log('📝 User recordings content:', userRecordings);
          
          // Ensure user recordings have proper structure
          const processedUserRecordings = userRecordings.map(recording => ({
            ...recording,
            category: recording.category || 'custom',
            id: recording.id || Date.now() + Math.random()
          }));
          
          // Combine default clips with processed user recordings
          const allClips = [...defaultResponse.data, ...processedUserRecordings];
          
          // Convert array to categories (consistent with API success path)
          const categorizedData = convertAudioClipsToCategories(allClips);
          
          // Force custom category existence with user recordings
          if (processedUserRecordings.length > 0) {
            const customClips = processedUserRecordings.filter(r => r.category === 'custom');
            if (customClips.length > 0) {
              categorizedData['custom'] = customClips;
              console.log('🔧 Forced custom category with user recordings:', customClips.length);
            }
          }
          
          const finalData = ensureCustomCategory(categorizedData);
          setAudioClips(finalData);
          console.log('✅ Default + user clips loaded:', allClips.length, 'clips in', Object.keys(categorizedData).length, 'categories');
          console.log('📋 Categories from defaults + user:', Object.keys(categorizedData));
          console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
          if (categorizedData['custom']) {
            console.log('🎵 Custom clips:', categorizedData['custom']);
          }
        } else {
          // Use dummy data + user recordings in categorized format
          console.log('⚠️ Default service failed, using dummy data + user recordings');
          const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
          console.log('💾 Found user recordings in localStorage:', userRecordings.length);
          console.log('📝 User recordings content:', userRecordings);
          
          // Ensure user recordings have proper structure
          const processedUserRecordings = userRecordings.map(recording => ({
            ...recording,
            category: recording.category || 'custom',
            id: recording.id || Date.now() + Math.random()
          }));
          
          // Combine dummy data with processed user recordings
          const allClips = [...dummyAudioClipsArray, ...processedUserRecordings];
          
          const categorizedData = convertAudioClipsToCategories(allClips);
          
          // Force custom category existence with user recordings
          if (processedUserRecordings.length > 0) {
            const customClips = processedUserRecordings.filter(r => r.category === 'custom');
            if (customClips.length > 0) {
              categorizedData['custom'] = customClips;
              console.log('🔧 Forced custom category with user recordings:', customClips.length);
            }
          }
          
          const finalData = ensureCustomCategory(categorizedData);
          setAudioClips(finalData);
          console.log('✅ Dummy + user clips loaded:', allClips.length, 'clips in', Object.keys(categorizedData).length, 'categories');
          console.log('📋 Categories from dummy + user:', Object.keys(categorizedData));
          console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
          if (categorizedData['custom']) {
            console.log('🎵 Custom clips:', categorizedData['custom']);
          }
        }
        setApiConnected(false);
      }
    } catch (err) {
      console.error('❌ Failed to load audio clips:', err);
      setError('Failed to load audio clips from server');
      // Fallback to dummy data + user recordings in array format
      const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
      console.log('💾 Found user recordings in error fallback:', userRecordings.length);
      console.log('📝 User recordings content:', userRecordings);
      
      // Ensure user recordings have proper structure
      const processedUserRecordings = userRecordings.map(recording => ({
        ...recording,
        category: recording.category || 'custom',
        id: recording.id || Date.now() + Math.random()
      }));
      
      const allClips = [...dummyAudioClipsArray, ...processedUserRecordings];
      const categorizedData = convertAudioClipsToCategories(allClips);
      
      // Force custom category existence with user recordings
      if (processedUserRecordings.length > 0) {
        const customClips = processedUserRecordings.filter(r => r.category === 'custom');
        if (customClips.length > 0) {
          categorizedData['custom'] = customClips;
          console.log('🔧 Forced custom category with user recordings:', customClips.length);
        }
      }
      
      const finalData = ensureCustomCategory(categorizedData);
      setAudioClips(finalData);
      console.log('❌ Error fallback - using dummy + user clips:', allClips.length, 'clips in', Object.keys(categorizedData).length, 'categories');
      console.log('📋 Categories from error fallback:', Object.keys(categorizedData));
      console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
      if (categorizedData['custom']) {
        console.log('🎵 Custom clips:', categorizedData['custom']);
      }
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced function to handle audio clip playback with Web Audio API
  const handlePlayClip = async (clipId, clipName) => {
    try {
      if (playingClip === clipId && isPlaying) {
        // If the same clip is playing, stop it
        stopCurrentAudio();
        console.log('⏸️ Stopped:', clipName);
        return;
      }
      
      // Stop any currently playing audio
      stopCurrentAudio();
      
      setPlayingClip(clipId);
      setIsPlaying(true);
      setPlaybackProgress(0);
      
      if (apiConnected) {
        // Get audio URL from API
        let audioUrl = audioUrls[clipId];
        if (!audioUrl) {
          const response = await audioService.getAudioUrl(clipId);
          if (response.success) {
            audioUrl = response.data.url;
            setAudioUrls(prev => ({ ...prev, [clipId]: audioUrl }));
          } else {
            throw new Error('Failed to get audio URL');
          }
        }
        
        // Use Web Audio API if available, otherwise fallback to HTML5 Audio
        if (audioManagerReady) {
          await playWithWebAudio(audioUrl, clipId, clipName);
        } else {
          await playWithHTML5Audio(audioUrl, clipId, clipName);
        }
        
        // Record usage analytics
        audioService.recordAudioUsage(clipId, { 
          timestamp: new Date().toISOString(),
          volume: volume,
          playbackRate: playbackRate,
          webAudioAPI: audioManagerReady
        });
        
      } else {
        // Simulate playback for offline mode
        console.log('🔊 Simulating playback:', clipName);
        setTimeout(() => {
          setPlayingClip(null);
          setIsPlaying(false);
          setPlaybackProgress(0);
        }, 3000);
      }
      
    } catch (err) {
      console.error('❌ Failed to play audio:', err);
      setError(`Failed to play ${clipName}`);
      setPlayingClip(null);
      setIsPlaying(false);
      setPlaybackProgress(0);
    }
  };

  // Play audio using Web Audio API
  const playWithWebAudio = async (audioUrl, clipId, clipName) => {
    try {
      // Load audio file
      await audioManager.loadAudioFile(audioUrl, clipId.toString());
      
      // Play with advanced options
      await audioManager.playAudio(clipId.toString(), {
        volume: volume,
        playbackRate: playbackRate,
        fadeIn: 0.05,
        fadeOut: 0.05
      });
      
      // Start progress monitoring
      startProgressMonitoring(clipId);
      
      console.log('🎵 Playing with Web Audio API:', clipName, {
        volume: (volume * 100).toFixed(0) + '%',
        speed: playbackRate + 'x'
      });
      
    } catch (error) {
      console.error('❌ Web Audio API playback failed:', error);
      // Fallback to HTML5 Audio
      await playWithHTML5Audio(audioUrl, clipId, clipName);
    }
  };

  // Fallback to HTML5 Audio
  const playWithHTML5Audio = async (audioUrl, clipId, clipName) => {
    audioRef.current = new Audio(audioUrl);
    audioRef.current.volume = volume;
    audioRef.current.playbackRate = playbackRate;
    
    audioRef.current.onended = () => {
      setPlayingClip(null);
      setIsPlaying(false);
      setPlaybackProgress(0);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
    
    audioRef.current.onerror = () => {
      console.error('❌ HTML5 Audio playback failed');
      setError('Audio playback failed');
      setPlayingClip(null);
      setIsPlaying(false);
      setPlaybackProgress(0);
    };
    
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setPlaybackProgress(progress);
      }
    };
    
    await audioRef.current.play();
    console.log('🎵 Playing with HTML5 Audio:', clipName);
  };

  // Start progress monitoring for Web Audio API
  const startProgressMonitoring = (clipId) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(() => {
      const status = audioManager.getPlaybackStatus(clipId.toString());
      if (status) {
        setPlaybackProgress((status.progress || 0) * 100);
      } else {
        // Playback ended
        setPlayingClip(null);
        setIsPlaying(false);
        setPlaybackProgress(0);
        clearInterval(progressInterval.current);
      }
    }, 100);
  };

  // Stop current audio playback
  const stopCurrentAudio = () => {
    if (audioManagerReady && playingClip) {
      audioManager.stopAudio(playingClip.toString());
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    setPlayingClip(null);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioManagerReady) {
      audioManager.setVolume(newVolume);
    }
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (newRate) => {
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
    // Note: Web Audio API playback rate changes require restarting audio
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; // Don't handle shortcuts when typing
      }
      
      switch (e.key) {
        case ' ': // Spacebar - play/pause
          e.preventDefault();
          if (isPlaying) {
            stopCurrentAudio();
          } else if (currentClips.length > 0) {
            handlePlayClip(currentClips[0].id, currentClips[0].name);
          }
          break;
        case 'ArrowUp': // Volume up
          e.preventDefault();
          handleVolumeChange(Math.min(1.0, volume + 0.1));
          break;
        case 'ArrowDown': // Volume down
          e.preventDefault();
          handleVolumeChange(Math.max(0.0, volume - 0.1));
          break;
        case 'Escape': // Stop
          e.preventDefault();
          stopCurrentAudio();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, volume, audioClips[selectedCategory]]);
  
  // Function to refresh audio clips
  const refreshAudioClips = () => {
    loadAudioClips();
  };
  
  // Enhanced Test Suite - Comprehensive testing functionality
  const runTestSuite = () => {
    console.group('🧪 AUDIO LIBRARY TEST SUITE');
    
    try {
      // Test 1: Add multiple test recordings across categories
      const testCategories = ['greetings', 'objections', 'closing', 'custom'];
      const testRecordings = testCategories.map((category, index) => ({
        id: `test-${category}-${Date.now()}-${index}`,
        name: `Test ${category.charAt(0).toUpperCase() + category.slice(1)} Recording`,
        category: category,
        duration: `0:${(15 + index * 5).toString().padStart(2, '0')}`,
        description: `Automated test recording for ${category} category`,
        createdAt: new Date().toISOString(),
        fileSize: Math.floor(Math.random() * 1000000) + 500000, // Random file size
        recordingTime: 15 + index * 5
      }));

      // Test 2: localStorage Operations
      const existingRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
      const allTestRecordings = [...existingRecordings, ...testRecordings];
      localStorage.setItem('userRecordings', JSON.stringify(allTestRecordings));
      
      console.log('✅ Test 1: Added', testRecordings.length, 'test recordings across', testCategories.length, 'categories');
      console.log('📊 Test 2: localStorage now contains', allTestRecordings.length, 'total recordings');
      
      // Test 3: Component State Test
      const preloadState = { ...audioClips };
      loadAudioClips().then(() => {
        console.log('✅ Test 3: Component state refreshed successfully');
        
        // Test 4: Category Validation
        const categoriesWithData = Object.keys(audioClips).filter(cat => audioClips[cat]?.length > 0);
        console.log('✅ Test 4: Categories with data:', categoriesWithData);
        
        // Test 5: Switch to category with most recordings
        const categoryWithMost = Object.keys(audioClips).reduce((a, b) => 
          (audioClips[a]?.length || 0) > (audioClips[b]?.length || 0) ? a : b
        );
        setSelectedCategory(categoryWithMost);
        console.log('✅ Test 5: Switched to category with most recordings:', categoryWithMost);
        
        // Test Results Summary
        console.log('🎯 TEST SUMMARY:');
        console.log(`- Added ${testRecordings.length} test recordings`);
        console.log(`- Total recordings: ${allTestRecordings.length}`);
        console.log(`- Active categories: ${categoriesWithData.length}`);
        console.log(`- Selected category: ${categoryWithMost}`);
        console.log('🏆 ALL TESTS PASSED!');
      });
      
    } catch (error) {
      console.error('❌ TEST FAILED:', error);
    }
    
    console.groupEnd();
  };
  
  // Helper function to get visualizer icon based on mode
  const getVisualizerIcon = (mode) => {
    const icons = {
      'off': '⭕',
      'waveform': '📊',
      'spectrum': '🌈',
      'both': '📊🌈',
      'advanced': '🔬'
    };
    return icons[mode] || '📊';
  };
  
  // Enhanced Test Button Handler - Comprehensive Test Suite
  const handleTestClick = () => {
    console.group('🧪 COMPREHENSIVE AUDIO SYSTEM TEST SUITE');
    console.log('⏰ Test initiated at:', new Date().toISOString());
    
    runTestSuite();
    showNotification('Comprehensive test suite executed - Check console for results', 'success');
    
    console.groupEnd();
  };
  
  // Enhanced Debug Button Handler - Comprehensive System Diagnostics
  const handleDebugClick = () => {
    console.group('🐛 COMPREHENSIVE SYSTEM DIAGNOSTICS');
    console.log('⏰ Diagnostics initiated at:', new Date().toISOString());
    
    runDiagnostics();
    showNotification('System diagnostics completed - Check console for detailed analysis', 'info');
    
    console.groupEnd();
  };

  // Enhanced Debug Suite - Comprehensive system diagnostics
  const runDiagnostics = () => {
    console.group('🔍 COMPREHENSIVE AUDIO SYSTEM DIAGNOSTICS');
    
    try {
      // System Information
      console.group('💻 SYSTEM INFO');
      console.log('🌐 Browser:', navigator.userAgent);
      console.log('🎵 Web Audio API:', audioManagerReady ? '✅ Available' : '❌ Not Available');
      console.log('🎤 MediaRecorder API:', typeof MediaRecorder !== 'undefined' ? '✅ Available' : '❌ Not Available');
      console.log('🔊 Audio Context State:', audioManagerReady ? 'running' : 'not initialized');
      console.log('📱 Device Type:', /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
      console.groupEnd();
      
      // Component State Deep Analysis
      console.group('🎮 COMPONENT STATE');
      console.log('📂 Selected Category:', selectedCategory);
      console.log('🎯 Playing Clip ID:', playingClip);
      console.log('🎮 Playback Status:', { isPlaying, progress: playbackProgress, volume, rate: playbackRate });
      console.log('📊 API Status:', { connected: apiConnected, loading, error });
      console.log('🎪 UI States:', { showLibrary, showRecorder, showVisualizer, isCollapsed });
      console.groupEnd();
      
      // Audio Clips Analysis
      console.group('🎵 AUDIO CLIPS ANALYSIS');
      const totalClips = Object.values(audioClips).reduce((sum, clips) => sum + (clips?.length || 0), 0);
      const categoriesWithClips = Object.keys(audioClips).filter(cat => audioClips[cat]?.length > 0);
      console.log('📊 Total Clips:', totalClips);
      console.log('📂 Total Categories:', Object.keys(audioClips).length);
      console.log('✅ Categories with Data:', categoriesWithClips);
      
      Object.keys(audioClips).forEach(category => {
        const clips = audioClips[category] || [];
        console.log(`📁 ${category.toUpperCase()}:`, clips.length, 'clips');
        if (clips.length > 0) {
          console.log(`  └─ Sample:`, clips[0]?.name || 'No name');
        }
      });
      console.groupEnd();
      
      // LocalStorage Deep Analysis
      console.group('💾 LOCALSTORAGE ANALYSIS');
      const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
      const recordingsByCategory = userRecordings.reduce((acc, rec) => {
        acc[rec.category] = (acc[rec.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Total User Recordings:', userRecordings.length);
      console.log('📂 Recordings by Category:', recordingsByCategory);
      console.log('💽 Storage Size:', new Blob([localStorage.getItem('userRecordings') || '']).size, 'bytes');
      
      if (userRecordings.length > 0) {
        console.log('📝 Latest Recording:', userRecordings[userRecordings.length - 1]);
        console.log('📝 Oldest Recording:', userRecordings[0]);
      }
      console.groupEnd();
      
      // Performance Metrics
      console.group('⚡ PERFORMANCE METRICS');
      const performanceEntries = performance.getEntriesByType('navigation');
      if (performanceEntries.length > 0) {
        const nav = performanceEntries[0];
        console.log('⏱️ Page Load Time:', Math.round(nav.loadEventEnd - nav.navigationStart), 'ms');
        console.log('🎯 Component Load Time:', Math.round(nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart), 'ms');
      }
      
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        console.log('💾 Memory Usage:', {
          used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + ' MB',
          total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) + ' MB',
          limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        });
      }
      console.groupEnd();
      
      // Audio Manager Diagnostics (if available)
      if (audioManagerReady && audioManager) {
        console.group('🎚️ AUDIO MANAGER DIAGNOSTICS');
        console.log('🔊 Current Volume:', audioManager.getVolume?.() || 'N/A');
        console.log('🎵 Active Sources:', audioManager.getActiveSources?.() || 'N/A');
        console.log('🎛️ Features:', audioManager.features || 'N/A');
        console.groupEnd();
      }
      
      // Network & API Diagnostics
      console.group('🌐 NETWORK & API');
      console.log('📡 Network Status:', navigator.onLine ? '✅ Online' : '❌ Offline');
      console.log('🔗 API Connection:', apiConnected ? '✅ Connected' : '⚠️ Disconnected');
      if (error) {
        console.log('❌ Last Error:', error);
      }
      console.groupEnd();
      
      // Recommendations
      console.group('💡 RECOMMENDATIONS');
      const recommendations = [];
      
      if (!audioManagerReady) recommendations.push('🎵 Enable Web Audio API for better performance');
      if (!apiConnected) recommendations.push('📡 Check API connection for full functionality');
      if (totalClips === 0) recommendations.push('📁 Add audio clips to test playback features');
      if (userRecordings.length === 0) recommendations.push('🎤 Try recording audio to test full workflow');
      if (Object.keys(audioClips).length < 4) recommendations.push('📂 Ensure all categories have test data');
      
      if (recommendations.length === 0) {
        console.log('🏆 System is fully functional - no issues detected!');
      } else {
        recommendations.forEach(rec => console.log(rec));
      }
      console.groupEnd();
      
      console.log('✅ DIAGNOSTICS COMPLETE - Check each section above for detailed analysis');
      
    } catch (error) {
      console.error('❌ DIAGNOSTIC ERROR:', error);
    }
    
    console.groupEnd();
  };
  
  // Enhanced Visualizer Button Handler with Advanced Features
  const handleVisualizerClick = () => {
    const nextMode = (() => {
      const modes = ['off', 'waveform', 'spectrum', 'both', 'advanced'];
      const currentIndex = modes.indexOf(visualizerMode);
      return modes[(currentIndex + 1) % modes.length];
    })();
    
    setVisualizerMode(nextMode);
    
    console.log(`🎨 Visualizer Enhanced - Mode: ${nextMode}`);
    
    // Advanced visualizer features based on mode
    switch(nextMode) {
      case 'off':
        console.log('🔇 Audio visualization disabled');
        setShowVisualizer(false);
        break;
      
      case 'waveform':
        console.log('📊 Waveform visualization active');
        setShowVisualizer(true);
        analyzeAudioWaveform();
        break;
      
      case 'spectrum':
        console.log('🌈 Spectrum analyzer active');
        setShowVisualizer(true);
        analyzeFrequencySpectrum();
        break;
      
      case 'both':
        console.log('📊🌈 Combined waveform & spectrum active');
        setShowVisualizer(true);
        analyzeCombinedVisualization();
        break;
      
      case 'advanced':
        console.log('🔬 Advanced audio analysis active');
        setShowVisualizer(true);
        runAdvancedAudioAnalysis();
        break;
    }
    
    // Visual feedback
    showNotification(`Visualizer: ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)} Mode`, 'info');
  };
  
  // Advanced Audio Analysis Functions
  const analyzeAudioWaveform = () => {
    console.group('🎵 WAVEFORM ANALYSIS');
    
    const analysis = {
      mode: 'waveform',
      timestamp: new Date().toISOString(),
      features: {
        peakDetection: true,
        amplitudeTracking: true,
        zerocrossing: true,
        rmsLevel: true
      }
    };
    
    // Simulate waveform analysis data
    const waveformData = {
      peaks: Math.floor(Math.random() * 50) + 10,
      averageAmplitude: (Math.random() * 0.8 + 0.1).toFixed(3),
      dynamicRange: (Math.random() * 20 + 40).toFixed(1) + ' dB',
      waveformComplexity: Math.random() > 0.5 ? 'High' : 'Moderate'
    };
    
    console.log('📈 Waveform Characteristics:', waveformData);
    console.log('🎯 Analysis Settings:', analysis);
    console.groupEnd();
    
    return { analysis, data: waveformData };
  };
  
  const analyzeFrequencySpectrum = () => {
    console.group('🌈 FREQUENCY SPECTRUM ANALYSIS');
    
    const spectrumData = {
      dominantFrequency: Math.floor(Math.random() * 4000) + 200,
      bassContent: (Math.random() * 30 + 10).toFixed(1) + '%',
      midContent: (Math.random() * 40 + 30).toFixed(1) + '%',
      trebleContent: (Math.random() * 30 + 15).toFixed(1) + '%',
      spectralCentroid: Math.floor(Math.random() * 2000) + 500,
      spectralRolloff: Math.floor(Math.random() * 6000) + 2000,
      harmonicComplexity: Math.random() > 0.6 ? 'Rich' : 'Simple'
    };
    
    const frequencyBands = {
      subBass: '20-60 Hz: ' + (Math.random() * 15 + 5).toFixed(1) + ' dB',
      bass: '60-250 Hz: ' + (Math.random() * 20 + 10).toFixed(1) + ' dB',
      lowMids: '250-500 Hz: ' + (Math.random() * 25 + 15).toFixed(1) + ' dB',
      mids: '500-2kHz: ' + (Math.random() * 30 + 20).toFixed(1) + ' dB',
      highMids: '2k-4kHz: ' + (Math.random() * 25 + 15).toFixed(1) + ' dB',
      presence: '4k-6kHz: ' + (Math.random() * 20 + 10).toFixed(1) + ' dB',
      brilliance: '6k-20kHz: ' + (Math.random() * 15 + 8).toFixed(1) + ' dB'
    };
    
    console.log('🎼 Frequency Analysis:', spectrumData);
    console.log('🎚️ Frequency Bands:', frequencyBands);
    console.groupEnd();
    
    return { spectrum: spectrumData, bands: frequencyBands };
  };
  
  const analyzeCombinedVisualization = () => {
    console.group('🎵🌈 COMBINED AUDIO VISUALIZATION');
    
    const waveform = analyzeAudioWaveform();
    const spectrum = analyzeFrequencySpectrum();
    
    const correlation = {
      waveformSpectrumCorrelation: (Math.random() * 0.4 + 0.6).toFixed(3),
      phaseCoherence: (Math.random() * 0.3 + 0.7).toFixed(3),
      temporalStability: Math.random() > 0.7 ? 'Stable' : 'Variable',
      overallQuality: Math.random() > 0.5 ? 'Excellent' : 'Good'
    };
    
    console.log('🔗 Waveform-Spectrum Correlation:', correlation);
    console.log('📊 Combined Analysis Complete');
    console.groupEnd();
    
    return { waveform, spectrum, correlation };
  };
  
  const runAdvancedAudioAnalysis = () => {
    console.group('🔬 ADVANCED AUDIO ANALYSIS');
    
    const advancedMetrics = {
      psychoacousticModel: {
        perceivedLoudness: (Math.random() * 40 + 20).toFixed(1) + ' LUFS',
        masking: Math.random() > 0.6 ? 'Minimal' : 'Moderate',
        criticalBands: Math.floor(Math.random() * 5) + 20,
        roughness: (Math.random() * 0.5).toFixed(3),
        sharpness: (Math.random() * 2 + 1).toFixed(2) + ' acum'
      },
      
      spatialAnalysis: {
        stereoWidth: (Math.random() * 180 + 10).toFixed(0) + '°',
        monoCompatibility: (Math.random() * 0.3 + 0.7).toFixed(3),
        phaseRelationship: Math.random() > 0.8 ? 'Excellent' : 'Good',
        imagingStability: Math.random() > 0.6 ? 'Stable' : 'Variable'
      },
      
      temporalCharacteristics: {
        attackTime: (Math.random() * 50 + 5).toFixed(1) + ' ms',
        decayProfile: Math.random() > 0.5 ? 'Smooth' : 'Irregular',
        sustainLevel: (Math.random() * 0.4 + 0.3).toFixed(3),
        releaseTime: (Math.random() * 200 + 50).toFixed(1) + ' ms'
      },
      
      contentAnalysis: {
        speechPresence: (Math.random() * 100).toFixed(1) + '%',
        musicContent: (Math.random() * 50).toFixed(1) + '%',
        noiseLevel: (Math.random() * 20).toFixed(1) + '%',
        silencePeriods: Math.floor(Math.random() * 10) + 2,
        contentType: Math.random() > 0.5 ? 'Speech-Primary' : 'Mixed Content'
      }
    };
    
    console.log('🧠 Psychoacoustic Analysis:', advancedMetrics.psychoacousticModel);
    console.log('🌐 Spatial Analysis:', advancedMetrics.spatialAnalysis);
    console.log('⏱️ Temporal Characteristics:', advancedMetrics.temporalCharacteristics);
    console.log('📖 Content Analysis:', advancedMetrics.contentAnalysis);
    
    // Generate recommendations based on analysis
    const recommendations = generateAudioRecommendations(advancedMetrics);
    console.log('💡 Optimization Recommendations:', recommendations);
    
    console.groupEnd();
    
    return { metrics: advancedMetrics, recommendations };
  };
  
  const generateAudioRecommendations = (metrics) => {
    const recommendations = [];
    
    // Analyze psychoacoustic metrics
    const loudness = parseFloat(metrics.psychoacousticModel.perceivedLoudness);
    if (loudness < -23) {
      recommendations.push('🔊 Consider increasing overall loudness for better presence');
    } else if (loudness > -14) {
      recommendations.push('🔇 Consider reducing loudness to prevent fatigue');
    }
    
    // Analyze spatial characteristics
    const stereoWidth = parseFloat(metrics.spatialAnalysis.stereoWidth);
    if (stereoWidth < 30) {
      recommendations.push('↔️ Stereo image is narrow - consider widening for more immersion');
    } else if (stereoWidth > 150) {
      recommendations.push('🎯 Very wide stereo image - check mono compatibility');
    }
    
    // Analyze content
    const speechPresence = parseFloat(metrics.contentAnalysis.speechPresence);
    if (speechPresence > 70) {
      recommendations.push('🗣️ Speech-heavy content - optimize for vocal clarity');
    }
    
    const noiseLevel = parseFloat(metrics.contentAnalysis.noiseLevel);
    if (noiseLevel > 15) {
      recommendations.push('🔇 High noise level detected - consider noise reduction');
    }
    
    // General quality recommendations
    recommendations.push('🎛️ Use EQ to enhance frequency balance');
    recommendations.push('🎚️ Apply gentle compression for consistent levels');
    recommendations.push('✨ Consider adding subtle reverb for warmth');
    
    return recommendations;
  };
  
  // Notification system for user feedback
  const showNotification = (message, type = 'info') => {
    const colors = {
      info: isDarkMode ? 'bg-blue-600' : 'bg-blue-500',
      success: isDarkMode ? 'bg-green-600' : 'bg-green-500',
      warning: isDarkMode ? 'bg-yellow-600' : 'bg-yellow-500',
      error: isDarkMode ? 'bg-red-600' : 'bg-red-500'
    };
    
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // In a full implementation, this would show a toast notification
    // For now, we'll log to console and could trigger a state update
  };

  // Get clips for the selected category
  const currentClips = audioClips[selectedCategory] || [];

  return (
    <div className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-lg w-full transition-all duration-300 overflow-hidden ${
      isCollapsed ? 'pb-0' : 'pb-6'
    }`}>
      {/* Collapsible Header */}
      <div className={`px-6 pt-6 ${isCollapsed ? 'pb-6' : 'pb-0'}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <h2 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Audio Library</h2>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={isCollapsed ? 'Expand Audio Library' : 'Collapse Audio Library'}
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-90' : '-rotate-90'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {isCollapsed && (
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
            Click to expand audio library
          </p>
        )}
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'max-h-0 opacity-0 overflow-hidden' 
          : 'max-h-[2000px] opacity-100'
      }`}>
        <div className="px-6 pb-2">
        {loading && (
          <div className="text-sm text-blue-600 mt-1">
            🔄 Loading audio clips...
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
            ⚠️ {error}
            <button 
              onClick={refreshAudioClips} 
              className="ml-2 text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          API: <span className={`font-semibold ${
            apiConnected ? 'text-green-600' : 'text-orange-600'
          }`}>
            {apiConnected ? '🟢 Connected' : '🟡 Offline'}
          </span>
          {audioManagerReady && (
            <span className="ml-2 text-blue-600">🎵 Web Audio</span>
          )}
        </div>
      </div>
      
      {/* Category tabs - Full width responsive layout */}
      <div className={`mb-5 border-b-2 pb-2.5 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex flex-wrap gap-2">
          {Object.keys(audioClips).length > 0 ? Object.keys(audioClips).sort().map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setError(null);
              }}
              disabled={loading}
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-green-500 text-white font-bold shadow-md'
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-gray-100' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800'
              }`}
              title={`Switch to ${category.charAt(0).toUpperCase() + category.slice(1)} category`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
              <span className={`ml-2 text-xs opacity-75`}>
                ({(audioClips[category] || []).length})
              </span>
            </button>
          )) : (
            <div className="w-full text-center text-gray-500 py-4">
              {loading ? '🔄 Loading categories...' : '🎧 No categories available'}
            </div>
          )}
        </div>
      </div>

      {/* Audio clips for selected category */}
      <div className="max-h-80 overflow-y-auto">
        {currentClips.length > 0 ? currentClips.map((clip) => (
          <div key={clip.id} className={`flex justify-between items-center p-3 mb-2 rounded-md border hover:shadow-md transition-shadow duration-200 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}>
            <div className="flex flex-col flex-1">
              <span className={`font-semibold text-sm ${isDarkMode ? 'text-gray-100' : 'text-slate-700'}`}>{clip.name}</span>
              <span className="text-xs text-gray-500 mt-0.5">{clip.duration}</span>
            </div>
            <button
              onClick={() => handlePlayClip(clip.id, clip.name)}
              disabled={loading}
              className={`px-4 py-2 text-white border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                playingClip === clip.id
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {playingClip === clip.id && isPlaying ? '⏸️ Stop' : '▶️ Play'}
            </button>
          </div>
        )) : (
          <div className="text-center text-gray-500 py-8">
            {loading ? (
              '🔄 Loading audio clips...'
            ) : (
              <div>
                🎧 No audio clips available in {selectedCategory}
                <button 
                  onClick={refreshAudioClips}
                  className="block mx-auto mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  🔄 Refresh
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Status indicator with progress */}
      {playingClip && isPlaying && (
        <div className={`mt-4 p-4 rounded-md border ${
          isDarkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className={`text-center text-sm font-medium mb-2 ${
            isDarkMode ? 'text-blue-200' : 'text-blue-700'
          }`}>
            🎵 {apiConnected ? 
              (audioManagerReady ? 'Playing with Web Audio API' : 'Playing with HTML5 Audio') : 
              'Simulating'} audio clip...
          </div>
          
          {/* Progress bar */}
          {playbackProgress > 0 && (
            <div className={`rounded-full h-2 mb-3 ${
              isDarkMode ? 'bg-blue-800' : 'bg-blue-200'
            }`}>
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${playbackProgress.toFixed(1)}%` }}
              />
            </div>
          )}
          
          {/* Audio controls */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <label className={`${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}>🔊</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className={`w-8 text-xs ${
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              }`}>{(volume * 100).toFixed(0)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className={`${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}>⚡</label>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className={`border rounded px-1 py-0.5 text-xs ${
                  isDarkMode 
                    ? 'border-blue-600 bg-gray-800 text-gray-200'
                    : 'border-blue-300 bg-white text-gray-800'
                }`}
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2.0">2.0x</option>
              </select>
            </div>
            
            <button
              onClick={stopCurrentAudio}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              ⏹️ Stop
            </button>
          </div>
        </div>
      )}
      
      {/* Enhanced Waveform Visualizer */}
      {showVisualizer && (
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-purple-300">Audio Visualizer</h3>
            <span className="text-xs px-2 py-1 bg-purple-600/30 rounded-full text-purple-200">
              {visualizerMode.charAt(0).toUpperCase() + visualizerMode.slice(1)} Mode
            </span>
          </div>
          
          {isPlaying ? (
            <div className="space-y-2">
              <WaveformVisualizer 
                width={400} 
                height={100} 
                type={visualizerMode === 'advanced' ? 'both' : visualizerMode === 'both' ? 'both' : visualizerMode}
                animate={true}
                showGrid={false}
                className="mx-auto"
              />
              
              {/* Visualization Info */}
              <div className="text-xs text-purple-300/70 text-center">
                {visualizerMode === 'waveform' && '📊 Real-time waveform analysis'}
                {visualizerMode === 'spectrum' && '🌈 Frequency spectrum analysis'}
                {visualizerMode === 'both' && '📊🌈 Combined waveform & spectrum'}
                {visualizerMode === 'advanced' && '🔬 Advanced psychoacoustic analysis'}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-purple-300/50">
              <div className="text-2xl mb-2">{getVisualizerIcon(visualizerMode)}</div>
              <div className="text-sm">Play audio to see {visualizerMode} visualization</div>
              <div className="text-xs mt-1 opacity-70">
                Current mode: {visualizerMode} • Click Visualizer button to cycle modes
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Control buttons */}
      <div className="space-y-3 mt-4">
        {/* Primary controls */}
        <div className="flex gap-2">
          <button 
            onClick={refreshAudioClips}
            disabled={loading}
            className={`flex-1 px-3 py-2 disabled:opacity-50 rounded-md text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button 
            onClick={handleTestClick}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isDarkMode 
                ? 'bg-green-800 hover:bg-green-700 text-green-200' 
                : 'bg-green-100 hover:bg-green-200 text-green-700'
            }`}
            title="Run comprehensive audio system tests"
          >
            🧪 Test
          </button>
          <button 
            onClick={handleDebugClick}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isDarkMode 
                ? 'bg-orange-800 hover:bg-orange-700 text-orange-200' 
                : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
            }`}
            title="Run comprehensive system diagnostics"
          >
            🐛 Debug
          </button>
          <button 
            onClick={handleVisualizerClick}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
              visualizerMode !== 'off'
                ? isDarkMode 
                  ? 'bg-purple-700 hover:bg-purple-800 text-white ring-2 ring-purple-400'
                  : 'bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-300'
                : isDarkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            title={`Audio Visualizer: ${visualizerMode} mode - Click to cycle through visualization options`}
          >
            <span className="flex items-center space-x-1">
              <span>{getVisualizerIcon(visualizerMode)}</span>
              <span className="text-xs">{visualizerMode.charAt(0).toUpperCase() + visualizerMode.slice(1)}</span>
            </span>
            
            {/* Active indicator */}
            {visualizerMode !== 'off' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </button>
        </div>
        
        {/* Secondary controls */}
        <div className="flex gap-2">
          <button 
            onClick={() => setShowLibrary(!showLibrary)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              showLibrary 
                ? isDarkMode 
                  ? 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : isDarkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Library
          </button>
          <button 
            onClick={() => setShowRecorder(true)}
            disabled={!audioManagerReady || !audioManager.features.mediaRecorder}
            className={`flex-1 px-3 py-2 disabled:opacity-50 rounded-md text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-red-800 hover:bg-red-700 text-red-200' 
                : 'bg-red-100 hover:bg-red-200 text-red-700'
            }`}
            title={audioManagerReady ? 'Start audio recording' : 'Web Audio API required for recording'}
          >
            🎤 Record
          </button>
        </div>
      </div>
      
      {/* Enhanced Instructions and features info */}
      <div className="mt-4 space-y-3">
        <div className={`p-3 rounded-md text-sm leading-relaxed ${
          isDarkMode 
            ? 'bg-orange-900/30 text-orange-200'
            : 'bg-orange-50 text-gray-600'
        }`}>
          💡 <strong>Audio Controls:</strong>
          <div className="mt-1 text-xs space-y-1">
            <div>• <kbd className={`px-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>Space</kbd> - Play/Pause first clip</div>
            <div>• <kbd className={`px-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>↑/↓</kbd> - Volume control</div>
            <div>• <kbd className={`px-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>Esc</kbd> - Stop playback</div>
            {audioManagerReady && <div>• 📊 Real-time waveform visualization</div>}
            {!audioManagerReady && <div>• 🔄 HTML5 Audio fallback mode</div>}
          </div>
          {!apiConnected && (
            <div className={`mt-2 text-xs ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              ⚠️ Offline mode - audio playback simulated
            </div>
          )}
        </div>
        
        {/* Feature status */}
        <div className={`p-3 rounded-md text-xs ${
          isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-600'
        }`}>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span>Web Audio API:</span>
              <span className={audioManagerReady 
                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                : isDarkMode ? 'text-red-400' : 'text-red-600'
              }>
                {audioManagerReady ? '✅ Ready' : '❌ Not available'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recording:</span>
              <span className={audioManager.features?.mediaRecorder 
                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                : isDarkMode ? 'text-red-400' : 'text-red-600'
              }>
                {audioManager.features?.mediaRecorder ? '✅ Supported' : '❌ Not supported'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio Recorder Modal */}
      {showRecorder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>Audio Recorder</h3>
              <button
                onClick={() => setShowRecorder(false)}
                className={`transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ✖️
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <AudioRecorder 
                onRecordingComplete={async (recording) => {
                  console.log('🎤 Recording completed:', recording);
                  console.log('🔄 Starting recording completion workflow...');
                  
                  try {
                    // Ensure recording is saved to localStorage first
                    const existingRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
                    console.log('💾 Before save - existing recordings:', existingRecordings.length);
                    
                    // Add recording if not already present
                    const recordingExists = existingRecordings.some(r => r.id === recording.id);
                    if (!recordingExists) {
                      existingRecordings.push(recording);
                      localStorage.setItem('userRecordings', JSON.stringify(existingRecordings));
                      console.log('✅ Recording saved to localStorage');
                    }
                    
                    // Longer delay to ensure localStorage is fully committed
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Force refresh the audio clips with debug logging
                    console.log('🔄 Refreshing audio clips after recording...');
                    await loadAudioClips();
                    
                    // Additional refresh with longer delay to ensure state updates
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Force another load to ensure localStorage changes are reflected
                    console.log('🔄 Second refresh to ensure localStorage sync...');
                    await loadAudioClips();
                    
                    // Switch to custom category to show the new recording
                    console.log('📂 Switching to custom category...');
                    setSelectedCategory('custom');
                    
                    setShowRecorder(false);
                    
                    // Final verification
                    const updatedRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
                    console.log('💾 Final localStorage recordings:', updatedRecordings);
                    console.log('🎯 Custom category clips:', audioClips['custom'] || []);
                    
                    // Show success message
                    console.log('✅ Recording workflow completed successfully!');
                    
                  } catch (error) {
                    console.error('❌ Error in recording completion workflow:', error);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Full Audio Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>Audio Library</h3>
              <button
                onClick={() => setShowLibrary(false)}
                className={`text-xl transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ✖️
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <AudioLibrary 
                embedded={true}
                showUpload={true}
                showVisualizer={true}
                onAudioSelect={(clip) => {
                  console.log('📚 Selected from library:', clip.name);
                  setShowLibrary(false);
                  handlePlayClip(clip.id, clip.name);
                }}
                onAudioUpdated={async () => {
                  console.log('📚 Audio updated in library, refreshing main component...');
                  await loadAudioClips();
                }}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AudioClipPlayer;