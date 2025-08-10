import React, { useState, useEffect, useMemo } from 'react';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { performanceCache, analyticsCache } from '../utils/performanceCache';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Performance Dashboard - Real-time Performance Monitoring
 * 
 * Features:
 * - Core Web Vitals tracking
 * - Performance budgets monitoring
 * - Cache statistics
 * - Memory usage tracking
 * - Network condition monitoring
 * - Performance score calculation
 * - Real-time alerts and recommendations
 */
const PerformanceDashboard = React.memo(() => {
  const { isDarkMode, themeClasses } = useTheme();
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [alerts, setAlerts] = useState([]);
  const [performanceHistory, setPerformanceHistory] = useState([]);

  // Performance monitoring with custom handlers
  const { 
    getMetrics, 
    getPerformanceScore, 
    generateReport,
    trackMemory,
    trackNetwork
  } = usePerformanceMonitor({
    onMetric: (name, value, tags) => {
      console.log(`📊 Performance Metric: ${name} = ${value}`, tags);
    },
    onBudgetViolation: (metric, value, budget, context) => {
      const alert = {
        id: Date.now(),
        type: 'warning',
        metric,
        value,
        budget,
        context,
        timestamp: new Date(),
        severity: calculateSeverity(metric, value, budget)
      };
      
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    },
    budgets: {
      fcp: 2000,
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      ttfb: 600,
      renderTime: 16
    }
  });

  // Current performance metrics
  const currentMetrics = useMemo(() => {
    const metrics = getMetrics();
    const score = getPerformanceScore();
    const memoryInfo = trackMemory();
    const networkInfo = trackNetwork();
    
    return {
      ...metrics,
      score,
      memory: memoryInfo,
      network: networkInfo,
      timestamp: Date.now()
    };
  }, [getMetrics, getPerformanceScore, trackMemory, trackNetwork]);

  // Cache statistics
  const cacheStats = useMemo(() => {
    return {
      performance: performanceCache.getStats(),
      analytics: analyticsCache.getStats()
    };
  }, []);

  // Update performance history
  useEffect(() => {
    const interval = setInterval(() => {
      const newSnapshot = {
        timestamp: Date.now(),
        score: getPerformanceScore(),
        vitals: getMetrics().vitals,
        memory: trackMemory()
      };
      
      setPerformanceHistory(prev => 
        [...prev, newSnapshot].slice(-60) // Keep last 60 snapshots (5 minutes at 5s intervals)
      );
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, getPerformanceScore, getMetrics, trackMemory]);

  // Performance score color
  const getScoreColor = (score) => {
    if (score >= 90) return isDarkMode ? 'text-green-400' : 'text-green-600';
    if (score >= 70) return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
    if (score >= 50) return isDarkMode ? 'text-orange-400' : 'text-orange-600';
    return isDarkMode ? 'text-red-400' : 'text-red-600';
  };

  // Alert severity color
  const getAlertColor = (severity) => {
    const colors = {
      low: isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-100',
      medium: isDarkMode ? 'text-yellow-400 bg-yellow-900/20' : 'text-yellow-600 bg-yellow-100',
      high: isDarkMode ? 'text-orange-400 bg-orange-900/20' : 'text-orange-600 bg-orange-100',
      critical: isDarkMode ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-100'
    };
    return colors[severity] || colors.medium;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
            Performance Dashboard
          </h2>
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
            Real-time performance monitoring and optimization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className={`px-3 py-2 text-sm ${themeClasses.input} rounded-lg ${themeClasses.focusRing} focus:ring-2`}
          >
            <option value={1000}>1s refresh</option>
            <option value={5000}>5s refresh</option>
            <option value={10000}>10s refresh</option>
            <option value={30000}>30s refresh</option>
          </select>
        </div>
      </div>

      {/* Performance Score & Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Performance Score */}
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Performance Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(currentMetrics.score)}`}>
                {currentMetrics.score}/100
              </p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'} rounded-full`}>
              <span className="text-2xl">⚡</span>
            </div>
          </div>
          <div className="mt-4">
            <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentMetrics.score >= 90 ? 'bg-green-500' :
                  currentMetrics.score >= 70 ? 'bg-yellow-500' :
                  currentMetrics.score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${currentMetrics.score}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Largest Contentful Paint */}
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>LCP</p>
              <p className={`text-2xl font-bold ${
                (currentMetrics.vitals?.lcp || 0) <= 2500 ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentMetrics.vitals?.lcp ? `${currentMetrics.vitals.lcp.toFixed(0)}ms` : 'N/A'}
              </p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} rounded-full`}>
              <span className="text-xl">🎯</span>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${themeClasses.textMuted}`}>
              Target: &lt;2500ms
            </span>
          </div>
        </div>

        {/* First Input Delay */}
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>FID</p>
              <p className={`text-2xl font-bold ${
                (currentMetrics.vitals?.fid || 0) <= 100 ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentMetrics.vitals?.fid ? `${currentMetrics.vitals.fid.toFixed(0)}ms` : 'N/A'}
              </p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-green-900/50' : 'bg-green-100'} rounded-full`}>
              <span className="text-xl">⚡</span>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${themeClasses.textMuted}`}>
              Target: &lt;100ms
            </span>
          </div>
        </div>

        {/* Cumulative Layout Shift */}
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>CLS</p>
              <p className={`text-2xl font-bold ${
                (currentMetrics.vitals?.cls || 0) <= 0.1 ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentMetrics.vitals?.cls ? currentMetrics.vitals.cls.toFixed(3) : '0.000'}
              </p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-100'} rounded-full`}>
              <span className="text-xl">📐</span>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${themeClasses.textMuted}`}>
              Target: &lt;0.1
            </span>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className={`font-medium ${themeClasses.textSecondary} mb-2`}>Cache Performance</h4>
            <p className={`text-2xl font-bold ${
              cacheStats.performance.hitRate > 80 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {cacheStats.performance.hitRate.toFixed(1)}%
            </p>
            <p className={`text-sm ${themeClasses.textMuted}`}>Hit Rate</p>
          </div>
          
          <div>
            <h4 className={`font-medium ${themeClasses.textSecondary} mb-2`}>Memory Usage</h4>
            <p className={`text-2xl font-bold ${
              currentMetrics.memory && currentMetrics.memory.percentage < 75 ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentMetrics.memory ? `${currentMetrics.memory.percentage.toFixed(1)}%` : 'N/A'}
            </p>
            <p className={`text-sm ${themeClasses.textMuted}`}>Heap Usage</p>
          </div>
          
          <div>
            <h4 className={`font-medium ${themeClasses.textSecondary} mb-2`}>Alerts</h4>
            <p className={`text-2xl font-bold ${alerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {alerts.length}
            </p>
            <p className={`text-sm ${themeClasses.textMuted}`}>Active Alerts</p>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Recent Performance Alerts</h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {alert.metric.toUpperCase()} Budget Violation
                  </span>
                  <span className="text-xs opacity-75">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-90">
                  Current: {typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value}
                  {' '}• Budget: {alert.budget}
                  {alert.context && ` • ${alert.context}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Helper function to calculate alert severity
const calculateSeverity = (metric, value, budget) => {
  const ratio = value / budget;
  
  if (ratio >= 2) return 'critical';
  if (ratio >= 1.5) return 'high';
  if (ratio >= 1.2) return 'medium';
  return 'low';
};

PerformanceDashboard.displayName = 'PerformanceDashboard';

export default PerformanceDashboard;