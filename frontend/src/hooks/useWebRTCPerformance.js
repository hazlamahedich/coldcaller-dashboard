/**
 * useWebRTCPerformance - React hook for WebRTC performance monitoring
 * Integrates all WebRTC performance managers into a single React hook
 * Provides real-time metrics, optimization, and mobile-specific features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import CallQualityManager from '../utils/CallQualityManager';
import NetworkMonitor from '../utils/NetworkMonitor';
import WebRTCOptimizer from '../utils/WebRTCOptimizer';
import MobileCallManager from '../utils/MobileCallManager';

const useWebRTCPerformance = (options = {}) => {
  // Configuration options
  const {
    autoStart = true,
    monitoringInterval = 5000,
    enableMobileOptimizations = true,
    enableNetworkMonitoring = true,
    enableQualityMonitoring = true,
    enableWebRTCOptimization = true
  } = options;
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState(null);
  
  // Performance metrics state
  const [callQuality, setCallQuality] = useState(null);
  const [networkMetrics, setNetworkMetrics] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  // History and recommendations
  const [qualityHistory, setQualityHistory] = useState([]);
  const [networkHistory, setNetworkHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // Manager instances refs
  const managersRef = useRef({
    callQuality: null,
    network: null,
    webrtc: null,
    mobile: null
  });
  
  // Current call refs
  const peerConnectionRef = useRef(null);
  const audioStreamRef = useRef(null);
  
  // Event listeners cleanup
  const cleanupRef = useRef([]);
  
  /**
   * Initialize all performance managers
   */
  const initialize = useCallback(async () => {
    try {
      setError(null);
      console.log('🚀 Initializing WebRTC Performance Hook...');
      
      const managers = {};
      
      // Initialize Call Quality Manager
      if (enableQualityMonitoring) {
        managers.callQuality = new CallQualityManager();
      }
      
      // Initialize Network Monitor
      if (enableNetworkMonitoring) {
        managers.network = new NetworkMonitor();
      }
      
      // Initialize WebRTC Optimizer
      if (enableWebRTCOptimization) {
        managers.webrtc = new WebRTCOptimizer();
      }
      
      // Initialize Mobile Call Manager
      if (enableMobileOptimizations) {
        managers.mobile = new MobileCallManager();
      }
      
      // Setup event listeners
      setupEventListeners(managers);
      
      managersRef.current = managers;
      setIsInitialized(true);
      
      // Start monitoring if auto-start is enabled
      if (autoStart && enableNetworkMonitoring && managers.network) {
        managers.network.startMonitoring(monitoringInterval);
        setIsMonitoring(true);
      }
      
      console.log('✅ WebRTC Performance Hook initialized');
      
    } catch (err) {
      console.error('❌ Failed to initialize WebRTC Performance Hook:', err);
      setError(err.message);
    }
  }, [
    enableQualityMonitoring,
    enableNetworkMonitoring,
    enableWebRTCOptimization,
    enableMobileOptimizations,
    autoStart,
    monitoringInterval
  ]);
  
  /**
   * Setup event listeners for all managers
   */
  const setupEventListeners = (managers) => {
    const cleanup = [];
    
    // Call Quality Manager events
    if (managers.callQuality) {
      const onQualityUpdate = (data) => {
        setCallQuality(data.metrics);
        setQualityHistory(prev => [...prev.slice(-49), data.metrics]);
        updateRecommendations();
      };
      
      managers.callQuality.on('qualityUpdate', onQualityUpdate);
      cleanup.push(() => managers.callQuality.off('qualityUpdate', onQualityUpdate));
    }
    
    // Network Monitor events
    if (managers.network) {
      const onMetricsUpdate = (data) => {
        setNetworkMetrics(data.metrics);
        setNetworkHistory(prev => [...prev.slice(-49), data.metrics]);
        updateRecommendations();
      };
      
      const onConnectionChange = (data) => {
        console.log('📡 Network connection changed:', data);
      };
      
      managers.network.on('metricsUpdate', onMetricsUpdate);
      managers.network.on('connectionChange', onConnectionChange);
      
      cleanup.push(() => {
        managers.network.off('metricsUpdate', onMetricsUpdate);
        managers.network.off('connectionChange', onConnectionChange);
      });
    }
    
    // WebRTC Optimizer events
    if (managers.webrtc) {
      const onConnectionStateChange = (data) => {
        setConnectionStatus(prev => ({
          ...prev,
          connectionState: data.newState,
          timestamp: data.timestamp
        }));
      };
      
      const onIceConnectionStateChange = (data) => {
        setConnectionStatus(prev => ({
          ...prev,
          iceConnectionState: data.newState,
          timestamp: data.timestamp
        }));
      };
      
      managers.webrtc.on('connectionStateChange', onConnectionStateChange);
      managers.webrtc.on('iceConnectionStateChange', onIceConnectionStateChange);
      
      cleanup.push(() => {
        managers.webrtc.off('connectionStateChange', onConnectionStateChange);
        managers.webrtc.off('iceConnectionStateChange', onIceConnectionStateChange);
      });
    }
    
    // Mobile Call Manager events
    if (managers.mobile) {
      const onBatteryChange = (data) => {
        setDeviceStatus(prev => ({
          ...prev,
          battery: data,
          timestamp: data.timestamp
        }));
        updateRecommendations();
      };
      
      const onNetworkChange = (data) => {
        setDeviceStatus(prev => ({
          ...prev,
          network: data,
          timestamp: data.timestamp
        }));
      };
      
      const onMemoryPressure = (data) => {
        setDeviceStatus(prev => ({
          ...prev,
          memory: data,
          timestamp: data.timestamp
        }));
        updateRecommendations();
      };
      
      managers.mobile.on('batteryChange', onBatteryChange);
      managers.mobile.on('networkChange', onNetworkChange);
      managers.mobile.on('memoryPressure', onMemoryPressure);
      
      cleanup.push(() => {
        managers.mobile.off('batteryChange', onBatteryChange);
        managers.mobile.off('networkChange', onNetworkChange);
        managers.mobile.off('memoryPressure', onMemoryPressure);
      });
    }
    
    cleanupRef.current = cleanup;
  };
  
  /**
   * Update recommendations based on current metrics
   */
  const updateRecommendations = () => {
    const newRecommendations = [];
    
    // Get recommendations from each manager
    if (managersRef.current.callQuality && callQuality) {
      const qualityRecs = managersRef.current.callQuality.getQualityRecommendations();
      newRecommendations.push(...qualityRecs);
    }
    
    if (managersRef.current.network && networkMetrics) {
      const networkRecs = managersRef.current.network.getNetworkRecommendations();
      newRecommendations.push(...networkRecs);
    }
    
    if (managersRef.current.mobile && deviceStatus) {
      const mobileRecs = managersRef.current.mobile.getMobileRecommendations();
      newRecommendations.push(...mobileRecs);
    }
    
    setRecommendations(newRecommendations);
  };
  
  /**
   * Start call monitoring with peer connection and audio stream
   */
  const startCallMonitoring = useCallback(async (peerConnection, audioStream) => {
    try {
      if (!isInitialized) {
        throw new Error('WebRTC Performance Hook not initialized');
      }
      
      peerConnectionRef.current = peerConnection;
      audioStreamRef.current = audioStream;
      
      // Initialize call quality monitoring
      if (managersRef.current.callQuality && peerConnection && audioStream) {
        await managersRef.current.callQuality.initialize(peerConnection, audioStream);
        console.log('✅ Call quality monitoring started');
      }
      
      // Update WebRTC optimizer with peer connection
      if (managersRef.current.webrtc) {
        managersRef.current.webrtc.peerConnection = peerConnection;
        console.log('✅ WebRTC optimizer connected');
      }
      
    } catch (err) {
      console.error('❌ Failed to start call monitoring:', err);
      setError(err.message);
    }
  }, [isInitialized]);
  
  /**
   * Stop call monitoring
   */
  const stopCallMonitoring = useCallback(() => {
    try {
      // Stop call quality monitoring
      if (managersRef.current.callQuality) {
        managersRef.current.callQuality.stopMonitoring();
        console.log('⏹️ Call quality monitoring stopped');
      }
      
      // Reset refs
      peerConnectionRef.current = null;
      audioStreamRef.current = null;
      
      // Reset call-specific state
      setCallQuality(null);
      setConnectionStatus(null);
      
    } catch (err) {
      console.error('❌ Failed to stop call monitoring:', err);
    }
  }, []);
  
  /**
   * Start network monitoring
   */
  const startNetworkMonitoring = useCallback(() => {
    if (managersRef.current.network && !isMonitoring) {
      managersRef.current.network.startMonitoring(monitoringInterval);
      setIsMonitoring(true);
      console.log('📊 Network monitoring started');
    }
  }, [isMonitoring, monitoringInterval]);
  
  /**
   * Stop network monitoring
   */
  const stopNetworkMonitoring = useCallback(() => {
    if (managersRef.current.network && isMonitoring) {
      managersRef.current.network.stopMonitoring();
      setIsMonitoring(false);
      console.log('📊 Network monitoring stopped');
    }
  }, [isMonitoring]);
  
  /**
   * Create optimized peer connection
   */
  const createOptimizedPeerConnection = useCallback(async (config = {}) => {
    if (!managersRef.current.webrtc) {
      throw new Error('WebRTC optimizer not available');
    }
    
    try {
      const peerConnection = await managersRef.current.webrtc.createPeerConnection(config);
      peerConnectionRef.current = peerConnection;
      return peerConnection;
      
    } catch (err) {
      console.error('❌ Failed to create optimized peer connection:', err);
      throw err;
    }
  }, []);
  
  /**
   * Add optimized local stream
   */
  const addOptimizedLocalStream = useCallback(async (constraints = {}) => {
    if (!managersRef.current.webrtc) {
      throw new Error('WebRTC optimizer not available');
    }
    
    try {
      const stream = await managersRef.current.webrtc.addOptimizedLocalStream(constraints);
      audioStreamRef.current = stream;
      return stream;
      
    } catch (err) {
      console.error('❌ Failed to add optimized local stream:', err);
      throw err;
    }
  }, []);
  
  /**
   * Get comprehensive performance summary
   */
  const getPerformanceSummary = useCallback(() => {
    return {
      callQuality: callQuality ? {
        mos: callQuality.mos,
        grade: managersRef.current.callQuality?.getQualityGrade(),
        latency: callQuality.latency,
        packetLoss: callQuality.packetLoss
      } : null,
      
      network: networkMetrics ? {
        quality: networkMetrics.quality,
        rtt: networkMetrics.rtt,
        bandwidth: networkMetrics.bandwidth,
        connectionType: networkMetrics.connectionType
      } : null,
      
      device: deviceStatus ? {
        isMobile: managersRef.current.mobile?.isMobile,
        batteryLevel: deviceStatus.battery?.level,
        powerSaveMode: deviceStatus.battery?.powerSaveMode,
        memoryPressure: deviceStatus.memory?.pressure
      } : null,
      
      connection: connectionStatus,
      recommendations: recommendations,
      
      timestamp: Date.now()
    };
  }, [callQuality, networkMetrics, deviceStatus, connectionStatus, recommendations]);
  
  /**
   * Export performance data
   */
  const exportPerformanceData = useCallback(() => {
    return {
      qualityHistory: qualityHistory,
      networkHistory: networkHistory,
      summary: getPerformanceSummary(),
      exportTime: new Date().toISOString()
    };
  }, [qualityHistory, networkHistory, getPerformanceSummary]);
  
  // Initialize on mount
  useEffect(() => {
    initialize();
    
    // Cleanup on unmount
    return () => {
      // Clean up event listeners
      cleanupRef.current.forEach(cleanup => cleanup());
      
      // Destroy all managers
      Object.values(managersRef.current).forEach(manager => {
        if (manager && typeof manager.destroy === 'function') {
          manager.destroy();
        }
      });
      
      console.log('🗑️ WebRTC Performance Hook cleaned up');
    };
  }, [initialize]);
  
  // Return hook interface
  return {
    // State
    isInitialized,
    isMonitoring,
    error,
    
    // Metrics
    callQuality,
    networkMetrics,
    deviceStatus,
    connectionStatus,
    qualityHistory,
    networkHistory,
    recommendations,
    
    // Actions
    startCallMonitoring,
    stopCallMonitoring,
    startNetworkMonitoring,
    stopNetworkMonitoring,
    createOptimizedPeerConnection,
    addOptimizedLocalStream,
    
    // Utilities
    getPerformanceSummary,
    exportPerformanceData,
    
    // Manager access (for advanced usage)
    managers: managersRef.current
  };
};

export default useWebRTCPerformance;