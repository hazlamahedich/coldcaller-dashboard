/**
 * Call Analytics Dashboard
 * Real-time call performance monitoring and analytics visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
} from 'chart.js';
import { Bar, Line, Doughnut, Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

const CallAnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [performanceRes, realtimeRes] = await Promise.all([
        fetch(`/api/call-analytics/performance?time_range=${selectedTimeRange}&agent_id=${selectedAgent}`),
        fetch('/api/call-analytics/real-time-dashboard')
      ]);

      const performanceData = await performanceRes.json();
      const realtimeData = await realtimeRes.json();

      setDashboardData(performanceData.data);
      setRealTimeMetrics(realtimeData.data);
      setAlerts(realtimeData.data.alerts || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, selectedAgent]);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const ws = new WebSocket(`ws://localhost:3001/ws/call-analytics`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'metrics_update':
          setRealTimeMetrics(data.data);
          break;
        case 'performance_alerts':
          setAlerts(data.data.alerts);
          break;
        case 'call_analytics_update':
          // Refresh dashboard data
          fetchDashboardData();
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [autoRefresh, fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  if (loading || !dashboardData || !realTimeMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg">Loading call analytics...</span>
      </div>
    );
  }

  // Chart configurations
  const volumeTrendData = {
    labels: dashboardData.volumeAnalysis?.daily?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Daily Call Volume',
        data: dashboardData.volumeAnalysis?.daily?.map(d => d.count) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      }
    ]
  };

  const outcomeDistributionData = {
    labels: Object.keys(dashboardData.outcomeAnalysis?.distribution || {}),
    datasets: [
      {
        data: Object.values(dashboardData.outcomeAnalysis?.distribution || {}),
        backgroundColor: [
          '#10B981', // Green for positive outcomes
          '#F59E0B', // Yellow for neutral
          '#EF4444', // Red for negative
          '#8B5CF6', // Purple for follow-up needed
          '#6B7280'  // Gray for others
        ]
      }
    ]
  };

  const connectionRatesData = {
    labels: ['Connection Rate', 'Answer Rate', 'Conversion Rate'],
    datasets: [
      {
        label: 'Current',
        data: [
          dashboardData.connectionAnalysis?.connectionRate || 0,
          dashboardData.connectionAnalysis?.answerRate || 0,
          dashboardData.outcomeAnalysis?.conversionRate || 0
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      },
      {
        label: 'Target',
        data: [75, 30, 20], // Target benchmarks
        backgroundColor: 'rgba(34, 197, 94, 0.8)'
      }
    ]
  };

  const formatMetric = (value, type = 'number') => {
    if (value == null) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${parseFloat(value).toFixed(1)}%`;
      case 'duration':
        return `${Math.round(value / 60)}m ${value % 60}s`;
      case 'currency':
        return `$${parseFloat(value).toLocaleString()}`;
      default:
        return typeof value === 'number' ? value.toLocaleString() : value;
    }
  };

  const getMetricTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: change,
      isPositive: change > 0,
      display: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    };
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Call Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Real-time performance monitoring and insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Auto-refresh:</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded-full text-sm ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Performance Alerts ({alerts.length})
                </h3>
                <div className="mt-2 text-sm text-yellow-700 space-y-1">
                  {alerts.map((alert, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{alert.message}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Total Calls Today</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatMetric(realTimeMetrics.totalCallsToday)}
                </p>
                {realTimeMetrics.callsInProgress > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {realTimeMetrics.callsInProgress} active
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Connection Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMetric(realTimeMetrics.connectionRateToday, 'percentage')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMetric(realTimeMetrics.conversionRateToday, 'percentage')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Avg Quality Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMetric(realTimeMetrics.avgQualityToday)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Call Volume Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Call Volume Trends</h3>
          <div className="h-64">
            <Line 
              data={volumeTrendData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Outcome Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Call Outcome Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={outcomeDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Connection Rates Comparison */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Performance vs Targets</h3>
          <div className="h-64">
            <Bar 
              data={connectionRatesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Agent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Agent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Active Agents</p>
                <p className="text-sm text-gray-500">Currently making calls</p>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {realTimeMetrics.activeAgents}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Top Performer Today</p>
                <p className="text-sm text-gray-500">Highest conversion rate</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{realTimeMetrics.topPerformerToday?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">
                  {formatMetric(realTimeMetrics.topPerformerToday?.conversionRate, 'percentage')}
                </p>
              </div>
            </div>

            {realTimeMetrics.agentsNeedingSupport?.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium text-red-800">Agents Needing Support</p>
                <div className="mt-2 space-y-1">
                  {realTimeMetrics.agentsNeedingSupport.map((agent, index) => (
                    <p key={index} className="text-sm text-red-700">
                      {agent.name} - {agent.issue}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Activity */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Today's Hourly Activity</h3>
        <div className="grid grid-cols-24 gap-1">
          {Array.from({ length: 24 }, (_, hour) => {
            const activity = realTimeMetrics.hourlyBreakdown?.[hour] || 0;
            const intensity = Math.min(activity / 10, 1); // Normalize to 0-1
            return (
              <div
                key={hour}
                className={`h-8 rounded-sm ${
                  intensity > 0.7 ? 'bg-green-500' :
                  intensity > 0.4 ? 'bg-yellow-400' :
                  intensity > 0.1 ? 'bg-blue-300' :
                  'bg-gray-200'
                }`}
                title={`${hour}:00 - ${activity} calls`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>Last updated: {new Date(realTimeMetrics.lastUpdated).toLocaleTimeString()}</p>
        <p>Next update in: {autoRefresh ? '30 seconds' : 'Manual refresh only'}</p>
      </div>
    </div>
  );
};

export default CallAnalyticsDashboard;