import React, { useState, useEffect, useCallback } from 'react';
import CallQualityManager from '../utils/CallQualityManager';
import NetworkMonitor from '../utils/NetworkMonitor';
import WebRTCOptimizer from '../utils/WebRTCOptimizer';
import MobileCallManager from '../utils/MobileCallManager';

/**
 * WebRTCPerformanceDashboard - Real-time WebRTC performance monitoring
 * Features: Call quality metrics, network monitoring, mobile optimizations
 * Provides comprehensive insights into call performance and optimization
 */

const WebRTCPerformanceDashboard = ({ 
  isVisible = false, 
  onClose, 
  peerConnection = null,
  audioStream = null 
}) => {
  // Component state
  const [activeTab, setActiveTab] = useState('overview');
  const [callQuality, setCallQuality] = useState(null);
  const [networkMetrics, setNetworkMetrics] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [qualityHistory, setQualityHistory] = useState([]);
  const [networkHistory, setNetworkHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // Manager instances
  const [managers, setManagers] = useState({
    callQuality: null,
    network: null,
    webrtc: null,
    mobile: null
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize managers
  const initializeManagers = useCallback(async () => {
    try {
      console.log('🚀 Initializing WebRTC Performance managers...');
      
      const callQualityManager = new CallQualityManager();
      const networkMonitor = new NetworkMonitor();
      const webrtcOptimizer = new WebRTCOptimizer();
      const mobileCallManager = new MobileCallManager();
      
      // Initialize call quality manager if we have a peer connection
      if (peerConnection && audioStream) {
        await callQualityManager.initialize(peerConnection, audioStream);
      }
      
      // Setup event listeners
      setupEventListeners(callQualityManager, networkMonitor, webrtcOptimizer, mobileCallManager);
      
      setManagers({
        callQuality: callQualityManager,
        network: networkMonitor,
        webrtc: webrtcOptimizer,
        mobile: mobileCallManager
      });
      
      // Start monitoring
      networkMonitor.startMonitoring();
      setIsMonitoring(true);
      
      console.log('✅ WebRTC Performance managers initialized');
      
    } catch (err) {
      console.error('❌ Failed to initialize managers:', err);
      setError(err.message);
    }
  }, [peerConnection, audioStream]);
  
  // Setup event listeners for all managers
  const setupEventListeners = (callQuality, network, webrtc, mobile) => {
    // Call quality events
    if (callQuality) {
      callQuality.on('qualityUpdate', (data) => {
        setCallQuality(data.metrics);
        setQualityHistory(prev => [...prev.slice(-49), data.metrics]);
        updateRecommendations(data.metrics, null, null, null);
      });
    }
    
    // Network events
    network.on('metricsUpdate', (data) => {
      setNetworkMetrics(data.metrics);
      setNetworkHistory(prev => [...prev.slice(-49), data.metrics]);
      updateRecommendations(null, data.metrics, null, null);
    });
    
    // WebRTC optimizer events
    webrtc.on('connectionStateChange', (data) => {
      setConnectionStatus(prev => ({ ...prev, connectionState: data.newState }));
    });
    
    webrtc.on('iceConnectionStateChange', (data) => {
      setConnectionStatus(prev => ({ ...prev, iceConnectionState: data.newState }));
    });
    
    // Mobile manager events
    mobile.on('batteryChange', (data) => {
      setDeviceStatus(prev => ({ ...prev, battery: data }));
    });
    
    mobile.on('networkChange', (data) => {
      setDeviceStatus(prev => ({ ...prev, network: data }));
    });
    
    mobile.on('memoryPressure', (data) => {
      setDeviceStatus(prev => ({ ...prev, memory: data }));
    });
  };
  
  // Update recommendations based on current metrics
  const updateRecommendations = (quality, network, connection, device) => {
    const newRecommendations = [];
    
    if (quality) {
      const qualityRecs = getQualityRecommendations(quality);
      newRecommendations.push(...qualityRecs);
    }
    
    if (network) {
      const networkRecs = getNetworkRecommendations(network);
      newRecommendations.push(...networkRecs);
    }
    
    if (managers.mobile && device) {
      const mobileRecs = managers.mobile.getMobileRecommendations();
      newRecommendations.push(...mobileRecs);
    }
    
    setRecommendations(newRecommendations);
  };
  
  // Get quality-based recommendations
  const getQualityRecommendations = (quality) => {
    const recommendations = [];
    
    if (quality.mos < 3.0) {
      recommendations.push({
        type: 'quality',
        severity: 'high',
        message: `Poor call quality (MOS: ${quality.mos.toFixed(1)})`,
        suggestions: ['Check network connection', 'Reduce background applications', 'Switch to wired connection']
      });
    }
    
    if (quality.packetLoss > 2) {
      recommendations.push({
        type: 'network',
        severity: 'medium',
        message: `High packet loss (${quality.packetLoss.toFixed(1)}%)`,
        suggestions: ['Check WiFi signal strength', 'Close bandwidth-intensive applications']
      });
    }
    
    return recommendations;
  };
  
  // Get network-based recommendations
  const getNetworkRecommendations = (network) => {
    const recommendations = [];
    
    if (network.quality === 'poor') {
      recommendations.push({
        type: 'network',
        severity: 'high',
        message: 'Poor network quality detected',
        suggestions: ['Switch to better network', 'Move closer to router', 'Check internet speed']
      });
    }
    
    return recommendations;
  };
  
  // Initialize when component becomes visible
  useEffect(() => {
    if (isVisible && !managers.network) {
      initializeManagers();
    }
  }, [isVisible, initializeManagers, managers.network]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(managers).forEach(manager => {
        if (manager && typeof manager.destroy === 'function') {
          manager.destroy();
        }
      });
    };
  }, [managers]);
  
  // Format metrics for display
  const formatMetric = (value, unit = '', decimals = 1) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return `${value.toFixed(decimals)}${unit}`;
    }
    return value;
  };
  
  // Get quality grade color
  const getQualityColor = (grade) => {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      fair: 'text-yellow-600',
      poor: 'text-red-600'
    };
    return colors[grade] || 'text-gray-600';
  };
  
  // Get MOS score color
  const getMOSColor = (mos) => {
    if (mos >= 4.0) return 'text-green-600';
    if (mos >= 3.5) return 'text-blue-600';
    if (mos >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">WebRTC Performance Dashboard</h2>
            <p className="text-blue-100 text-sm">Real-time call quality monitoring and optimization</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm">{isMonitoring ? 'Monitoring' : 'Stopped'}</span>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
            <div className="flex">
              <div className="text-red-700">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'quality', label: 'Call Quality', icon: '🎵' },
              { id: 'network', label: 'Network', icon: '📡' },
              { id: 'mobile', label: 'Mobile', icon: '📱' },
              { id: 'recommendations', label: 'Recommendations', icon: '💡' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Performance Overview</h3>
              
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Call Quality (MOS)</p>
                      <p className={`text-2xl font-bold ${getMOSColor(callQuality?.mos || 0)}`}>
                        {formatMetric(callQuality?.mos, '', 1)}
                      </p>
                    </div>
                    <div className="text-3xl">🎵</div>
                  </div>
                </div>
                
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Network RTT</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatMetric(networkMetrics?.rtt, 'ms', 0)}
                      </p>
                    </div>
                    <div className="text-3xl">📡</div>
                  </div>
                </div>
                
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Packet Loss</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatMetric(callQuality?.packetLoss, '%', 2)}
                      </p>
                    </div>
                    <div className="text-3xl">📦</div>
                  </div>
                </div>
                
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Audio Latency</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatMetric(callQuality?.latency, 'ms', 0)}
                      </p>
                    </div>
                    <div className="text-3xl">⏱️</div>
                  </div>
                </div>
              </div>
              
              {/* Connection Status */}
              {connectionStatus && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Connection Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Connection State:</span>
                      <span className="ml-2 font-medium">{connectionStatus.connectionState}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">ICE State:</span>
                      <span className="ml-2 font-medium">{connectionStatus.iceConnectionState}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'quality' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Call Quality Metrics</h3>
              
              {callQuality ? (
                <div className="space-y-4">
                  {/* Quality Overview */}
                  <div className="bg-white border rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getMOSColor(callQuality.mos)}`}>
                          {callQuality.mos.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">MOS Score</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {callQuality.mos >= 4.0 ? 'Excellent' : 
                           callQuality.mos >= 3.5 ? 'Good' : 
                           callQuality.mos >= 2.5 ? 'Fair' : 'Poor'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600">
                          {callQuality.bitrate}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">kbps</div>
                        <div className="text-xs text-gray-500 mt-1">Current Bitrate</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-600">
                          {callQuality.jitter.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">ms</div>
                        <div className="text-xs text-gray-500 mt-1">Jitter</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Audio Quality</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Packet Loss:</span>
                          <span className="font-medium">{callQuality.packetLoss.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Latency:</span>
                          <span className="font-medium">{callQuality.latency}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Echo Cancellation:</span>
                          <span className="font-medium">{callQuality.echoCancellation ? '✅' : '❌'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Noise Suppression:</span>
                          <span className="font-medium">{callQuality.noiseSuppression ? '✅' : '❌'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Network Performance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">RTT:</span>
                          <span className="font-medium">{callQuality.rtt}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Bitrate:</span>
                          <span className="font-medium">{callQuality.bitrate} kbps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎵</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Call Quality Data</h3>
                  <p className="text-gray-500">Start a call to see quality metrics</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'network' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Network Performance</h3>
              
              {networkMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-lg p-4 text-center">
                      <div className={`text-3xl font-bold ${getQualityColor(networkMetrics.quality)}`}>
                        {networkMetrics.quality.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Network Quality</div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {networkMetrics.rtt}ms
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Round Trip Time</div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round(networkMetrics.bandwidth.download)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">kbps Download</div>
                    </div>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Connection Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Connection Type:</span>
                        <span className="ml-2 font-medium">{networkMetrics.connectionType}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Effective Type:</span>
                        <span className="ml-2 font-medium">{networkMetrics.effectiveType}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Downlink:</span>
                        <span className="ml-2 font-medium">{networkMetrics.downlink} Mbps</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Upload Estimate:</span>
                        <span className="ml-2 font-medium">{Math.round(networkMetrics.bandwidth.upload)} kbps</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📡</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Network Data</h3>
                  <p className="text-gray-500">Collecting network performance metrics...</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'mobile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Mobile Optimization</h3>
              
              {deviceStatus ? (
                <div className="space-y-4">
                  {deviceStatus.battery && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Battery Status</h4>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Battery Level</span>
                            <span className="font-medium">{Math.round(deviceStatus.battery.level * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                deviceStatus.battery.level > 0.5 ? 'bg-green-600' :
                                deviceStatus.battery.level > 0.2 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${deviceStatus.battery.level * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-2xl">
                          {deviceStatus.battery.charging ? '🔌' : '🔋'}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Power Save Mode: <span className="font-medium">{deviceStatus.battery.powerSaveMode}</span>
                      </div>
                    </div>
                  )}
                  
                  {deviceStatus.memory && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Memory Status</h4>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">
                          {deviceStatus.memory.pressure.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Memory Pressure</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📱</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Mobile Optimization</h3>
                  <p className="text-gray-500">
                    {managers.mobile?.isMobile ? 'Loading mobile metrics...' : 'Not running on mobile device'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Performance Recommendations</h3>
              
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div 
                      key={index}
                      className={`border rounded-lg p-4 ${
                        rec.severity === 'high' ? 'border-red-200 bg-red-50' :
                        rec.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`text-2xl mr-3 ${
                          rec.severity === 'high' ? 'text-red-600' :
                          rec.severity === 'medium' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {rec.severity === 'high' ? '🚨' : rec.severity === 'medium' ? '⚠️' : '💡'}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${
                            rec.severity === 'high' ? 'text-red-800' :
                            rec.severity === 'medium' ? 'text-yellow-800' :
                            'text-blue-800'
                          }`}>
                            {rec.message}
                          </h4>
                          {rec.suggestions && (
                            <ul className="mt-2 text-sm text-gray-700 space-y-1">
                              {rec.suggestions.map((suggestion, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="text-gray-400 mr-2">•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">All Systems Optimal</h3>
                  <p className="text-gray-500">No performance recommendations at this time</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebRTCPerformanceDashboard;