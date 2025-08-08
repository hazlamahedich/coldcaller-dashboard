import React, { useState, useRef, useEffect } from 'react';
import { audioService } from '../services';

// AudioRecorder Component - Professional audio recording interface
// Features: real-time recording, live visualization, quality settings
// Integrated with audio service for seamless upload and management

const AudioRecorder = ({ onRecordingComplete, defaultCategory = 'custom' }) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  // Device and permission state
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  // Recording quality settings
  const [sampleRate, setSampleRate] = useState(44100);
  const [bitRate, setBitRate] = useState(128);
  const [format, setFormat] = useState('webm');
  
  // Live visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  
  // Form state
  const [recordingName, setRecordingName] = useState('');
  const [recordingCategory, setRecordingCategory] = useState(defaultCategory);
  const [recordingDescription, setRecordingDescription] = useState('');
  
  // Refs for media handling
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  // Initialize component
  useEffect(() => {
    checkPermissions();
    loadAvailableDevices();
    
    return () => {
      cleanup();
    };
  }, []);

  // Check microphone permissions
  const checkPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      setHasPermission(result.state === 'granted');
      
      result.addEventListener('change', () => {
        setHasPermission(result.state === 'granted');
      });
      
    } catch (err) {
      console.warn('⚠️ Permissions API not supported');
      // Try to get media stream to test permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setHasPermission(true);
      } catch (mediaErr) {
        setPermissionError('Microphone access denied');
      }
    }
  };

  // Load available audio input devices
  const loadAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      setAvailableDevices(audioInputs);
      
      if (audioInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
      
    } catch (err) {
      console.error('❌ Failed to load devices:', err);
    }
  };

  // Request microphone permission and setup stream
  const requestPermission = async () => {
    try {
      setPermissionError(null);
      
      const constraints = {
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          sampleRate: sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      audioStreamRef.current = stream;
      setHasPermission(true);
      
      // Setup audio analysis for level monitoring
      setupAudioAnalysis(stream);
      
    } catch (err) {
      console.error('❌ Permission denied:', err);
      setPermissionError('Microphone access is required for recording');
    }
  };

  // Setup audio analysis for live visualization
  const setupAudioAnalysis = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      setIsMonitoring(true);
      monitorAudioLevel();
      
    } catch (err) {
      console.error('❌ Failed to setup audio analysis:', err);
    }
  };

  // Monitor audio level for visualization
  const monitorAudioLevel = () => {
    if (!analyserRef.current || !isMonitoring) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    setAudioLevel(normalizedLevel);
    
    if (isMonitoring) {
      requestAnimationFrame(monitorAudioLevel);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      if (!audioStreamRef.current) {
        await requestPermission();
      }
      
      if (!audioStreamRef.current) return;
      
      // Reset state
      chunksRef.current = [];
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      
      // Determine MIME type based on format
      const mimeTypes = {
        webm: 'audio/webm;codecs=opus',
        mp4: 'audio/mp4',
        ogg: 'audio/ogg;codecs=opus'
      };
      
      const mimeType = mimeTypes[format] || mimeTypes.webm;
      
      // Create MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(audioStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        audioBitsPerSecond: bitRate * 1000
      });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      
      // Start recording
      mediaRecorderRef.current.start(100); // Record in 100ms chunks
      setIsRecording(true);
      setIsPaused(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Generate default name
      if (!recordingName) {
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
        setRecordingName(`Recording_${timestamp}`);
      }
      
      console.log('✅ Recording started');
      
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      setPermissionError('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      console.log('⏹️ Recording stopped');
    }
  };

  // Pause/resume recording
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('▶️ Recording resumed');
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      console.log('⏸️ Recording paused');
    }
  };

  // Upload recorded audio
  const uploadRecording = async () => {
    if (!audioBlob || !recordingName.trim()) return;
    
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);
      
      const formData = new FormData();
      const filename = `${recordingName}.${format}`;
      formData.append('audio', audioBlob, filename);
      formData.append('name', recordingName);
      formData.append('category', recordingCategory);
      formData.append('description', recordingDescription);
      formData.append('recordedAt', new Date().toISOString());
      
      const response = await audioService.uploadAudioClip(
        formData,
        (progress) => setUploadProgress(progress)
      );
      
      if (response.success) {
        console.log('✅ Recording uploaded successfully');
        
        // Clear recording
        clearRecording();
        
        // Notify parent component
        if (onRecordingComplete) {
          onRecordingComplete(response.data);
        }
        
      } else {
        throw new Error(response.message || 'Upload failed');
      }
      
    } catch (err) {
      console.error('❌ Upload failed:', err);
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Clear recording
  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setRecordingName('');
    setRecordingDescription('');
    setUploadProgress(0);
    setUploadError(null);
  };

  // Cleanup resources
  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setIsMonitoring(false);
  };

  // Format recording time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Audio Recorder</h2>
        <p className="text-gray-600">
          Record high-quality audio clips for your call scripts
        </p>
      </div>

      {/* Permission Error */}
      {permissionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 text-lg mr-2">⚠️</span>
            <span className="text-red-800">{permissionError}</span>
            <button
              onClick={requestPermission}
              className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Grant Permission
            </button>
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 text-lg mr-2">⚠️</span>
            <span className="text-red-800">{uploadError}</span>
          </div>
        </div>
      )}

      {/* Recording Settings */}
      {!isRecording && !audioBlob && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Microphone
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality
            </label>
            <select
              value={`${sampleRate}-${bitRate}`}
              onChange={(e) => {
                const [rate, bit] = e.target.value.split('-').map(Number);
                setSampleRate(rate);
                setBitRate(bit);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="44100-128">CD Quality (44.1kHz, 128kbps)</option>
              <option value="48000-192">High Quality (48kHz, 192kbps)</option>
              <option value="22050-96">Standard (22kHz, 96kbps)</option>
            </select>
          </div>
        </div>
      )}

      {/* Recording Interface */}
      <div className="text-center mb-6">
        {/* Audio Level Visualization */}
        {isMonitoring && (
          <div className="mb-4">
            <div className="flex justify-center items-center space-x-1 h-8">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 bg-gradient-to-t transition-all duration-100 ${
                    audioLevel * 20 > i
                      ? 'from-green-400 to-green-600'
                      : 'from-gray-200 to-gray-300'
                  }`}
                  style={{ 
                    height: `${Math.max(4, Math.min(32, (audioLevel * 20 - i) * 8))}px` 
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recording Timer */}
        <div className="text-3xl font-mono mb-4">
          {formatTime(recordingTime)}
        </div>

        {/* Recording Controls */}
        <div className="flex justify-center space-x-4">
          {!isRecording && !audioBlob ? (
            <button
              onClick={startRecording}
              disabled={!hasPermission}
              className="px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              <div className="text-2xl">🎤</div>
              <div className="text-sm mt-1">Start Recording</div>
            </button>
          ) : isRecording ? (
            <>
              <button
                onClick={togglePauseRecording}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                ⏹️ Stop
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                🔄 Record Again
              </button>
              <button
                onClick={clearRecording}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                🗑️ Clear
              </button>
            </>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-red-800 font-medium">
                {isPaused ? 'Recording Paused' : 'Recording in Progress'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recorded Audio Preview */}
      {audioBlob && audioUrl && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Recording Preview</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <audio controls className="w-full mb-4">
              <source src={audioUrl} />
              Your browser does not support audio playback.
            </audio>
            
            {/* Metadata Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recording Name *
                </label>
                <input
                  type="text"
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                  disabled={isUploading}
                  placeholder="Enter recording name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={recordingCategory}
                  onChange={(e) => setRecordingCategory(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="greetings">Greetings</option>
                  <option value="objections">Objections</option>
                  <option value="closing">Closing</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={recordingDescription}
                onChange={(e) => setRecordingDescription(e.target.value)}
                disabled={isUploading}
                placeholder="Optional description for this recording"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex space-x-3 mt-4">
              <button
                onClick={uploadRecording}
                disabled={isUploading || !recordingName.trim()}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUploading ? '⏳ Uploading...' : '⬆️ Save Recording'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recording Tips */}
      <div className="text-sm text-gray-500 text-center">
        <p className="mb-1">💡 Tips for best quality:</p>
        <ul className="text-xs space-y-1">
          <li>• Use a quiet environment</li>
          <li>• Speak clearly and maintain consistent distance</li>
          <li>• Keep recordings under 5 minutes for better performance</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioRecorder;