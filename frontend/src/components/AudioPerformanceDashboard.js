/**
 * Audio Performance Dashboard Component
 * Real-time monitoring and analytics for audio performance
 */

import React, { useState, useEffect } from 'react';
import audioPerformanceManager from '../utils/audioPerformanceManager';
import audioAnalytics from '../utils/audioAnalytics';

const AudioPerformanceDashboard = ({ isVisible, onClose }) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [activeTab, setActiveTab] = useState('performance');
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    if (isVisible) {
      loadDashboardData();
      
      // Start auto-refresh
      const interval = setInterval(() => {
        loadDashboardData();
      }, 2000);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isVisible]);

  const loadDashboardData = () => {
    // Get performance data
    const perfData = audioPerformanceManager.getPerformanceDashboard();
    setPerformanceData(perfData);

    // Get analytics data
    const analyticsData = {
      summary: audioAnalytics.getPerformanceSummary(),
      patterns: audioAnalytics.getUsagePatterns(),
      technical: audioAnalytics.metrics.technical
    };
    setAnalyticsData(analyticsData);

    // Get historical data
    const historical = audioAnalytics.getHistoricalData();
    setHistoricalData(historical);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-orange-600 bg-orange-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Audio Performance Dashboard</h2>
              <p className="text-blue-100 text-sm">Real-time monitoring and analytics</p>
            </div>
            <button
              onClick={onClose}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
            >
              <span className="text-lg">×</span>
            </button>
          </div>

          {/* Status Overview */}
          {performanceData && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <div className="text-blue-100 text-xs uppercase">Status</div>
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(performanceData.summary.status)}`}>
                  {performanceData.summary.status.toUpperCase()}
                </div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <div className="text-blue-100 text-xs uppercase">Load Time</div>
                <div className="text-white font-bold">{performanceData.summary.loadTime}</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <div className="text-blue-100 text-xs uppercase">Memory</div>
                <div className="text-white font-bold">{performanceData.summary.memoryUsage}</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <div className="text-blue-100 text-xs uppercase">Network</div>
                <div className="text-white font-bold">{performanceData.summary.networkProfile}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'performance', label: 'Performance', icon: '⚡' },
              { id: 'analytics', label: 'Analytics', icon: '📊' },
              { id: 'usage', label: 'Usage Patterns', icon: '📈' },
              { id: 'technical', label: 'Technical', icon: '🔧' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Performance Tab */}
          {activeTab === 'performance' && performanceData && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Response Times</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Load Time</span>
                      <span className="font-medium">{performanceData.summary.loadTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Target</span>
                      <span className="text-green-600">&lt; 2000ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cache Hit Rate</span>
                      <span className="font-medium">{performanceData.summary.cacheHitRate}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Memory Usage</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Usage</span>
                      <span className="font-medium">{performanceData.summary.memoryUsage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cache Size</span>
                      <span className="font-medium">{performanceData.details.cacheSize} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Streams</span>
                      <span className="font-medium">{performanceData.details.activeStreams}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Network Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Connection</span>
                      <span className="font-medium">{performanceData.details.networkProfile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Loaded</span>
                      <span className="font-medium">{performanceData.details.totalLoaded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Load Errors</span>
                      <span className={performanceData.details.loadErrors > 0 ? 'text-red-600' : 'text-green-600'}>
                        {performanceData.details.loadErrors}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {performanceData.recommendations.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">💡 Performance Recommendations</h3>
                  <ul className="space-y-1">
                    {performanceData.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-yellow-700">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analyticsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Session Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Clips Played</span>
                      <span className="font-medium">{analyticsData.summary.totalClipsPlayed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Unique Clips</span>
                      <span className="font-medium">{analyticsData.summary.uniqueClipsPlayed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Session Duration</span>
                      <span className="font-medium">{Math.floor(analyticsData.summary.sessionDuration / 60)}m {analyticsData.summary.sessionDuration % 60}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Error Rate</span>
                      <span className={`font-medium ${analyticsData.summary.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                        {analyticsData.summary.errorRate}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Performance Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Load Time</span>
                      <span className="font-medium">{analyticsData.summary.averageLoadTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cache Hit Rate</span>
                      <span className="font-medium">{analyticsData.summary.cacheHitRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Peak Memory</span>
                      <span className="font-medium">{analyticsData.summary.memoryPeakUsage}MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usage Patterns Tab */}
          {activeTab === 'usage' && analyticsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Top Used Clips */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Top Used Clips</h3>
                  {analyticsData.patterns.topClips.length > 0 ? (
                    <div className="space-y-2">
                      {analyticsData.patterns.topClips.map((clip, index) => (
                        <div key={clip.id} className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium">{clip.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({clip.category})</span>
                          </div>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {clip.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No usage data available</p>
                  )}
                </div>

                {/* Category Preferences */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Category Usage</h3>
                  {analyticsData.patterns.categoryPreferences.length > 0 ? (
                    <div className="space-y-2">
                      {analyticsData.patterns.categoryPreferences.map((cat, index) => (
                        <div key={cat.category} className="flex justify-between items-center">
                          <span className="text-sm font-medium capitalize">{cat.category}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${cat.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 w-8">{cat.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No usage data available</p>
                  )}
                </div>
              </div>

              {/* Usage Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Peak Usage Hour</h3>
                <p className="text-sm text-gray-600">
                  Most active usage at <span className="font-medium">{analyticsData.patterns.peakUsageHour}:00</span>
                </p>
              </div>
            </div>
          )}

          {/* Technical Tab */}
          {activeTab === 'technical' && analyticsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Browser Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Browser</span>
                      <span className="font-medium">{analyticsData.technical.browserInfo.name} {analyticsData.technical.browserInfo.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Platform</span>
                      <span className="font-medium">{analyticsData.technical.browserInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Language</span>
                      <span className="font-medium">{analyticsData.technical.browserInfo.language}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Device Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Device Type</span>
                      <span className="font-medium">{analyticsData.technical.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Screen Size</span>
                      <span className="font-medium">{analyticsData.technical.deviceInfo.screenWidth}x{analyticsData.technical.deviceInfo.screenHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Touch Support</span>
                      <span className="font-medium">{analyticsData.technical.deviceInfo.touchSupport ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Audio Support</h3>
                <div className="flex flex-wrap gap-2">
                  {analyticsData.technical.supportedFormats.map(format => (
                    <span key={format} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {format.toUpperCase()}
                    </span>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Audio Context</span>
                    <span className="font-medium">{analyticsData.technical.audioContextState || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Connection Type</span>
                    <span className="font-medium">{analyticsData.technical.connectionType || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPerformanceDashboard;