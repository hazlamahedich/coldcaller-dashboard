import React, { useRef, useState, useEffect } from 'react';
import AudioFeedbackService from '../services/AudioFeedbackService';

/**
 * AudioFeedbackDemo - Interactive demo component for testing AudioFeedbackService
 * Shows all available audio feedback states and allows real-time testing
 */
const AudioFeedbackDemo = () => {
  const audioServiceRef = useRef(null);
  const [serviceState, setServiceState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [testResults, setTestResults] = useState([]);
  
  // Initialize audio service
  useEffect(() => {
    const initService = async () => {
      audioServiceRef.current = new AudioFeedbackService();
      
      // Listen for service events
      audioServiceRef.current.on('initialized', (data) => {
        console.log('🎵 Audio service initialized:', data);
        setIsInitialized(true);
        updateServiceState();
      });
      
      audioServiceRef.current.on('feedbackPlayed', (data) => {
        console.log('🔊 Feedback played:', data);
        setTestResults(prev => [...prev.slice(-9), {
          type: data.type,
          message: data.message,
          timestamp: new Date().toLocaleTimeString(),
          success: true
        }]);
      });
      
      audioServiceRef.current.on('error', (data) => {
        console.error('❌ Audio service error:', data);
        setTestResults(prev => [...prev.slice(-9), {
          type: 'error',
          message: data.error?.message || 'Unknown error',
          timestamp: new Date().toLocaleTimeString(),
          success: false
        }]);
      });
      
      // Initialize the service
      await audioServiceRef.current.initializeServices();
    };
    
    initService();
    
    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.destroy();
      }
    };
  }, []);
  
  const updateServiceState = () => {
    if (audioServiceRef.current) {
      setServiceState(audioServiceRef.current.getState());
    }
  };
  
  // Test specific feedback type
  const testFeedback = async (type, priority = 'normal') => {
    if (!audioServiceRef.current) return;
    
    console.log(`🧪 Testing ${type} feedback...`);
    await audioServiceRef.current.playFeedback(type, null, { 
      priority, 
      vibrate: true,
      testMode: true 
    });
    
    updateServiceState();
  };
  
  // Test DTMF
  const testDTMF = async (key) => {
    if (!audioServiceRef.current) return;
    
    console.log(`🧪 Testing DTMF: ${key}`);
    await audioServiceRef.current.playDTMFConfirmation(key);
  };
  
  // Run comprehensive test
  const runFullTest = async () => {
    if (!audioServiceRef.current) return;
    
    setTestResults([]);
    await audioServiceRef.current.test();
  };
  
  // Quick connectivity test
  const runQuickTest = async () => {
    if (!audioServiceRef.current) return;
    
    const result = await audioServiceRef.current.quickTest();
    setTestResults(prev => [...prev.slice(-9), {
      type: 'quickTest',
      message: result ? 'Test passed' : 'Test failed',
      timestamp: new Date().toLocaleTimeString(),
      success: result
    }]);
  };
  
  // Update preferences
  const updatePreferences = (key, value) => {
    if (!audioServiceRef.current) return;
    
    audioServiceRef.current.setPreferences({ [key]: value });
    updateServiceState();
  };
  
  // Call state scenarios
  const callStateScenarios = [
    { type: 'idle', name: 'System Ready', priority: 'low' },
    { type: 'connecting', name: 'Connecting', priority: 'high' },
    { type: 'ringing', name: 'Ringing', priority: 'high' },
    { type: 'connected', name: 'Call Connected', priority: 'critical' },
    { type: 'active', name: 'Call Active', priority: 'normal' },
    { type: 'hold', name: 'On Hold', priority: 'normal' },
    { type: 'resume', name: 'Resume Call', priority: 'normal' },
    { type: 'muted', name: 'Muted', priority: 'normal' },
    { type: 'unmuted', name: 'Unmuted', priority: 'normal' },
    { type: 'ending', name: 'Ending Call', priority: 'high' },
    { type: 'ended', name: 'Call Ended', priority: 'high' },
    { type: 'failed', name: 'Call Failed', priority: 'critical' }
  ];
  
  const dtmfKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  
  if (!isInitialized) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing Audio Feedback Service...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🎵 Enhanced Audio Feedback Demo
        </h1>
        <p className="text-gray-600">
          Interactive demo for testing call state audio feedback and TTS announcements
        </p>
      </div>
      
      {/* Service Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          📊 Service Status
          <span className={`ml-3 px-2 py-1 rounded text-sm ${
            serviceState?.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {serviceState?.isEnabled ? '🟢 Enabled' : '🔴 Disabled'}
          </span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Volume:</strong> {Math.round((serviceState?.volume || 0) * 100)}%
          </div>
          <div>
            <strong>State:</strong> {serviceState?.currentState || 'unknown'}
          </div>
          <div>
            <strong>Queue:</strong> {serviceState?.queueLength || 0} items
          </div>
          <div>
            <strong>Audio Context:</strong> {serviceState?.audioContextState || 'unknown'}
          </div>
        </div>
        
        {/* Quick Controls */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button 
            onClick={runQuickTest}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            🚀 Quick Test
          </button>
          <button 
            onClick={runFullTest}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
          >
            🧪 Full Test Suite
          </button>
          <button 
            onClick={() => audioServiceRef.current?.stop()}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
          >
            ⏹️ Stop All
          </button>
          <button 
            onClick={updateServiceState}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      
      {/* Call State Tests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">📞 Call State Feedback</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {callStateScenarios.map(({ type, name, priority }) => (
            <button
              key={type}
              onClick={() => testFeedback(type, priority)}
              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                priority === 'critical' 
                  ? 'bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300'
                  : priority === 'high'
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-2 border-orange-300'
                  : priority === 'normal'
                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      
      {/* DTMF Tests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">📟 DTMF Tones</h2>
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {dtmfKeys.map(key => (
            <button
              key={key}
              onClick={() => testDTMF(key)}
              className="p-4 text-xl font-bold bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      
      {/* Audio Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">⚙️ Audio Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              🔊 Volume: {Math.round((serviceState?.volume || 0) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((serviceState?.volume || 0) * 100)}
              onChange={(e) => audioServiceRef.current?.setVolume(e.target.value / 100)}
              className="w-full"
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={serviceState?.preferences?.enableTTS}
                onChange={(e) => updatePreferences('enableTTS', e.target.checked)}
              />
              <span>🗣️ Text-to-Speech</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={serviceState?.preferences?.enableTones}
                onChange={(e) => updatePreferences('enableTones', e.target.checked)}
              />
              <span>🎵 Audio Tones</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={serviceState?.preferences?.enableVibration}
                onChange={(e) => updatePreferences('enableVibration', e.target.checked)}
              />
              <span>📳 Vibration</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Test Results Log */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">📋 Test Results</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 italic">No tests run yet...</p>
          ) : (
            testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm flex justify-between items-center ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <span className="font-medium">
                  {result.success ? '✅' : '❌'} {result.type}: {result.message}
                </span>
                <span className="text-gray-500 text-xs">{result.timestamp}</span>
              </div>
            ))
          )}
        </div>
        
        {testResults.length > 0 && (
          <button
            onClick={() => setTestResults([])}
            className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
          >
            🗑️ Clear Results
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioFeedbackDemo;