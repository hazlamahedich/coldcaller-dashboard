/**
 * Performance Dashboard - Real-time performance monitoring component
 * Displays comprehensive performance metrics and optimization recommendations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import performanceOptimizer from '../utils/performanceOptimizer';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  
  // Fetch performance data
  const fetchPerformanceData = useCallback(async () => {
    try {
      // Get frontend metrics
      const frontendMetrics = performanceOptimizer.getDashboardData();
      
      // Get backend metrics
      const backendResponse = await fetch(`/api/performance/metrics?timeRange=${selectedTimeRange}`);
      const backendData = await backendResponse.json();
      
      // Get system health
      const healthResponse = await fetch('/api/performance/health');
      const healthData = await healthResponse.json();
      
      setMetrics({
        frontend: frontendMetrics,
        backend: backendData.success ? backendData.data : null,
        timestamp: Date.now()
      });
      
      setSystemHealth(healthData.success ? healthData.data : null);
      
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  }, [selectedTimeRange]);
  
  // Auto-refresh when live mode is enabled
  useEffect(() => {
    let interval;
    
    if (isLive) {
      interval = setInterval(fetchPerformanceData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, refreshInterval, fetchPerformanceData]);
  
  // Initial data fetch
  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);
  
  // Memoized status color helper
  const getStatusColor = useMemo(() => (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);
  
  // Memoized metric card component
  const MetricCard = React.memo(({ title, value, unit, status, trend, children }) => (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">
              {typeof value === 'number' ? value.toFixed(2) : value || 'N/A'}
            </p>
            {unit && <span className="ml-2 text-sm text-gray-500">{unit}</span>}
          </div>
        </div>
        {status && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        )}
      </div>
      {trend && (
        <div className="mt-2">
          <span className={`text-sm ${trend.direction === 'up' ? 'text-red-600' : 'text-green-600'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
          </span>
          <span className="text-xs text-gray-500 ml-2">vs last period</span>
        </div>
      )}
      {children}
    </div>
  ));
  
  // Core Web Vitals component
  const CoreWebVitals = React.memo(({ vitals }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <MetricCard
        title="First Contentful Paint (FCP)"
        value={vitals?.fcp}
        unit="ms"
        status={vitals?.fcp < 2000 ? 'healthy' : vitals?.fcp < 4000 ? 'degraded' : 'unhealthy'}
      >
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${vitals?.fcp < 2000 ? 'bg-green-500' : vitals?.fcp < 4000 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min((vitals?.fcp || 0) / 4000 * 100, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">Target: &lt;2000ms</div>
      </MetricCard>
      
      <MetricCard
        title="Largest Contentful Paint (LCP)"
        value={vitals?.lcp}
        unit="ms"
        status={vitals?.lcp < 2500 ? 'healthy' : vitals?.lcp < 4000 ? 'degraded' : 'unhealthy'}
      >
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${vitals?.lcp < 2500 ? 'bg-green-500' : vitals?.lcp < 4000 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min((vitals?.lcp || 0) / 4000 * 100, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">Target: &lt;2500ms</div>
      </MetricCard>
      
      <MetricCard
        title="Cumulative Layout Shift (CLS)"
        value={vitals?.cls}
        status={vitals?.cls < 0.1 ? 'healthy' : vitals?.cls < 0.25 ? 'degraded' : 'unhealthy'}
      >
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${vitals?.cls < 0.1 ? 'bg-green-500' : vitals?.cls < 0.25 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min((vitals?.cls || 0) / 0.5 * 100, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">Target: &lt;0.1</div>
      </MetricCard>
    </div>
  ));
  
  // System overview component
  const SystemOverview = React.memo(({ health }) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health?.status)}`}>
          {health?.status || 'Unknown'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{health?.performance?.cpu || 0}%</div>
          <div className="text-sm text-gray-500">CPU Usage</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{health?.performance?.memory || 0}%</div>
          <div className="text-sm text-gray-500">Memory Usage</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{health?.performance?.avgResponseTime || 0}ms</div>
          <div className="text-sm text-gray-500">Avg Response</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{health?.performance?.activeCalls || 0}</div>
          <div className="text-sm text-gray-500">Active Calls</div>
        </div>
      </div>
      
      {health?.issues && health.issues.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Active Issues ({health.issues.length})</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {health.issues.slice(0, 3).map((issue, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                {issue.type}: {issue.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ));
  
  // Performance recommendations component
  const PerformanceRecommendations = React.memo(({ recommendations }) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Optimization Recommendations</h2>
      
      {recommendations && recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {rec.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
              {rec.actions && (
                <div className="mt-2">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600">View Actions</summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {rec.actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="text-gray-600">• {action}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No recommendations available</p>
      )}
    </div>
  ));
  
  // Resource usage chart (simplified)
  const ResourceChart = React.memo(({ resources }) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h2>
      
      {resources && (
        <div className="space-y-4">
          {Object.entries(resources.byType || {}).map(([type, data]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                <span className="font-medium capitalize">{type}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span>{data.count} files</span>
                <span>{(data.totalSize / 1024).toFixed(1)}KB</span>
                <span>{data.avgDuration.toFixed(0)}ms avg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ));
  
  // Real-time metrics chart placeholder
  const RealTimeChart = React.memo(() => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Real-time Metrics</h2>
      <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>Real-time charts would display here</p>
          <p className="text-sm">(CPU, Memory, Response Times)</p>
        </div>
      </div>
    </div>
  ));
  
  if (!metrics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600">Real-time performance monitoring and optimization</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="all">All Metrics</option>
            <option value="frontend">Frontend Only</option>
            <option value="backend">Backend Only</option>
            <option value="system">System Only</option>
          </select>
          
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              isLive 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isLive ? '● Live' : 'Start Live'}
          </button>
          
          <button
            onClick={fetchPerformanceData}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* System Health Overview */}
      <SystemOverview health={systemHealth} />
      
      {/* Core Web Vitals */}
      {(selectedCategory === 'all' || selectedCategory === 'frontend') && metrics.frontend && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h2>
          <CoreWebVitals vitals={metrics.frontend.vitals} />
        </>
      )}
      
      {/* Performance Recommendations */}
      <PerformanceRecommendations 
        recommendations={metrics.frontend?.recommendations || []} 
      />
      
      {/* Resource Usage */}
      {(selectedCategory === 'all' || selectedCategory === 'frontend') && (
        <ResourceChart resources={metrics.frontend?.resources} />
      )}
      
      {/* Real-time Charts */}
      {isLive && <RealTimeChart />}
      
      {/* Backend Metrics Grid */}
      {(selectedCategory === 'all' || selectedCategory === 'backend') && metrics.backend && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Backend Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="API Requests"
              value={metrics.backend.api?.requests?.total}
              unit="total"
            />
            <MetricCard
              title="Avg Response Time"
              value={metrics.backend.api?.requests?.avgResponseTime}
              unit="ms"
              status={metrics.backend.api?.requests?.avgResponseTime < 500 ? 'healthy' : 'degraded'}
            />
            <MetricCard
              title="Database Queries"
              value={metrics.backend.database?.queries?.total}
              unit="total"
            />
            <MetricCard
              title="Active Connections"
              value={metrics.backend.database?.connections?.active}
              unit="conn"
            />
            <MetricCard
              title="Audio Uploads"
              value={metrics.backend.audio?.uploads?.total}
              unit="files"
            />
            <MetricCard
              title="Processing Queue"
              value={metrics.backend.audio?.processing?.queue}
              unit="items"
              status={metrics.backend.audio?.processing?.queue > 5 ? 'degraded' : 'healthy'}
            />
            <MetricCard
              title="Active Calls"
              value={metrics.backend.voip?.calls?.active}
              unit="calls"
            />
            <MetricCard
              title="Call Quality"
              value={metrics.backend.voip?.calls?.quality?.length ? 
                metrics.backend.voip.calls.quality[metrics.backend.voip.calls.quality.length - 1]?.quality 
                : 'N/A'}
              unit="/5"
            />
          </div>
        </>
      )}
      
      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Last updated: {metrics.timestamp ? new Date(metrics.timestamp).toLocaleString() : 'Unknown'}</p>
        <p>Performance monitoring powered by ColdCaller Performance Engine</p>
      </div>
    </div>
  );
};

export default React.memo(PerformanceDashboard);