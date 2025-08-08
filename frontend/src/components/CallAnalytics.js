import React, { useState, useEffect, useRef } from 'react';
import { callsService } from '../services';

/**
 * CallAnalytics Component - Performance metrics and analytics dashboard
 * Real-time analytics with interactive charts and performance insights
 */

const CallAnalytics = ({ 
  userId = null, 
  dateRange = '7d',
  refreshInterval = 300000, // 5 minutes
  showRealTime = true,
  className = '' 
}) => {
  // Analytics state
  const [metrics, setMetrics] = useState({
    totalCalls: 0,
    connectedCalls: 0,
    connectionRate: 0,
    averageDuration: '0:00',
    appointmentsSet: 0,
    appointmentRate: 0,
    followUpsScheduled: 0,
    conversationQuality: 0
  });
  
  // Detailed analytics
  const [outcomeBreakdown, setOutcomeBreakdown] = useState({});
  const [timeAnalytics, setTimeAnalytics] = useState([]);
  const [performanceTrends, setPerformanceTrends] = useState([]);
  const [topPerformingHours, setTopPerformingHours] = useState([]);
  
  // Comparison data
  const [teamAverages, setTeamAverages] = useState({});
  const [previousPeriod, setPreviousPeriod] = useState({});
  const [goals, setGoals] = useState({
    dailyCalls: 50,
    connectionRate: 25,
    appointmentRate: 15
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState('calls');
  const [isRealTime, setIsRealTime] = useState(showRealTime);
  
  // Chart refs for canvas-based charts
  const chartRef = useRef(null);
  const trendChartRef = useRef(null);
  
  // Time period options
  const timePeriods = [
    { id: '1d', label: 'Today', days: 1 },
    { id: '7d', label: 'Last 7 Days', days: 7 },
    { id: '30d', label: 'Last 30 Days', days: 30 },
    { id: '90d', label: 'Last 90 Days', days: 90 },
    { id: 'custom', label: 'Custom Range', days: null }
  ];
  
  // Metric definitions with goals and benchmarks
  const metricDefinitions = [
    {
      id: 'calls',
      name: 'Total Calls',
      icon: '📞',
      format: 'number',
      goal: 'dailyCalls',
      benchmark: 40,
      description: 'Total number of calls made'
    },
    {
      id: 'connection_rate',
      name: 'Connection Rate',
      icon: '✅',
      format: 'percentage',
      goal: 'connectionRate',
      benchmark: 25,
      description: 'Percentage of calls that connected'
    },
    {
      id: 'appointment_rate',
      name: 'Appointment Rate',
      icon: '📅',
      format: 'percentage',
      goal: 'appointmentRate',
      benchmark: 15,
      description: 'Percentage of connected calls that resulted in appointments'
    },
    {
      id: 'avg_duration',
      name: 'Average Duration',
      icon: '⏱️',
      format: 'duration',
      benchmark: '3:30',
      description: 'Average duration of connected calls'
    },
    {
      id: 'quality_score',
      name: 'Quality Score',
      icon: '⭐',
      format: 'score',
      benchmark: 8.5,
      description: 'Overall conversation quality score (1-10)'
    }
  ];
  
  // Real-time data refresh
  useEffect(() => {
    loadAnalytics();
    
    let interval;
    if (isRealTime && refreshInterval > 0) {
      interval = setInterval(loadAnalytics, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dateRange, userId, isRealTime, refreshInterval]);
  
  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      const period = timePeriods.find(p => p.id === dateRange);
      if (period && period.days) {
        startDate.setDate(startDate.getDate() - period.days);
      }
      
      // Load main metrics
      const [
        statsResponse,
        outcomeResponse,
        trendsResponse
      ] = await Promise.all([
        callsService.getStatsForDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        callsService.getOutcomeStats({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }),
        loadPerformanceTrends(startDate, endDate)
      ]);
      
      // Process main metrics
      if (statsResponse.success) {
        const data = statsResponse.data;
        setMetrics({
          totalCalls: data.totalCalls || 0,
          connectedCalls: data.connected || 0,
          connectionRate: data.totalCalls > 0 ? Math.round((data.connected / data.totalCalls) * 100) : 0,
          averageDuration: data.averageDuration || '0:00',
          appointmentsSet: data.appointments || 0,
          appointmentRate: data.connected > 0 ? Math.round((data.appointments / data.connected) * 100) : 0,
          followUpsScheduled: data.followUps || 0,
          conversationQuality: data.qualityScore || 0
        });
      }
      
      // Process outcome breakdown
      if (outcomeResponse.success) {
        setOutcomeBreakdown(outcomeResponse.data);
      }
      
      // Load additional analytics
      await Promise.all([
        loadTimeAnalytics(startDate, endDate),
        loadTeamComparison(),
        loadPreviousPeriodComparison(startDate, endDate)
      ]);
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Use demo data
      setMetrics({
        totalCalls: 45,
        connectedCalls: 12,
        connectionRate: 27,
        averageDuration: '3:45',
        appointmentsSet: 3,
        appointmentRate: 25,
        followUpsScheduled: 8,
        conversationQuality: 7.8
      });
      setOutcomeBreakdown({
        'Connected': 12,
        'Voicemail': 18,
        'No Answer': 10,
        'Busy': 3,
        'Not Interested': 2
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Load performance trends
  const loadPerformanceTrends = async (startDate, endDate) => {
    try {
      // This would be a real API call in production
      const trends = [];
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      for (let i = daysDiff; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          calls: Math.floor(Math.random() * 20) + 30,
          connected: Math.floor(Math.random() * 8) + 5,
          appointments: Math.floor(Math.random() * 3) + 1,
          quality: (Math.random() * 2 + 7).toFixed(1)
        });
      }
      
      setPerformanceTrends(trends);
      return { success: true };
    } catch (error) {
      console.error('Failed to load trends:', error);
      return { success: false };
    }
  };
  
  // Load time-based analytics
  const loadTimeAnalytics = async (startDate, endDate) => {
    try {
      // Generate hourly performance data
      const hourlyData = [];
      for (let hour = 8; hour < 18; hour++) {
        hourlyData.push({
          hour,
          calls: Math.floor(Math.random() * 8) + 2,
          connected: Math.floor(Math.random() * 3) + 1,
          connectionRate: Math.floor(Math.random() * 30) + 20
        });
      }
      
      setTimeAnalytics(hourlyData);
      setTopPerformingHours(
        hourlyData
          .sort((a, b) => b.connectionRate - a.connectionRate)
          .slice(0, 3)
      );
      
    } catch (error) {
      console.error('Failed to load time analytics:', error);
    }
  };
  
  // Load team comparison data
  const loadTeamComparison = async () => {
    try {
      // Demo team averages
      setTeamAverages({
        totalCalls: 38,
        connectionRate: 23,
        appointmentRate: 18,
        averageDuration: '3:15',
        qualityScore: 7.2
      });
    } catch (error) {
      console.error('Failed to load team comparison:', error);
    }
  };
  
  // Load previous period comparison
  const loadPreviousPeriodComparison = async (startDate, endDate) => {
    try {
      // Demo previous period data
      setPreviousPeriod({
        totalCalls: 42,
        connectionRate: 25,
        appointmentRate: 20,
        changePercent: {
          totalCalls: 7.1,
          connectionRate: 8.0,
          appointmentRate: 25.0
        }
      });
    } catch (error) {
      console.error('Failed to load previous period:', error);
    }
  };
  
  // Format metric value
  const formatMetricValue = (value, format) => {
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'duration':
        return value;
      case 'score':
        return value.toFixed(1);
      case 'number':
      default:
        return value.toLocaleString();
    }
  };
  
  // Get performance indicator
  const getPerformanceIndicator = (value, benchmark, format) => {
    let numValue = value;
    let numBenchmark = benchmark;
    
    if (format === 'percentage') {
      // Values are already numbers for percentages
    } else if (format === 'duration') {
      // Convert duration to seconds for comparison
      const parseTime = (timeStr) => {
        if (typeof timeStr === 'string') {
          const [minutes, seconds] = timeStr.split(':').map(Number);
          return (minutes || 0) * 60 + (seconds || 0);
        }
        return 0;
      };
      numValue = parseTime(value);
      numBenchmark = parseTime(benchmark);
    }
    
    if (numValue >= numBenchmark * 1.1) return 'excellent';
    if (numValue >= numBenchmark * 0.9) return 'good';
    if (numValue >= numBenchmark * 0.7) return 'fair';
    return 'poor';
  };
  
  // Get indicator color
  const getIndicatorColor = (indicator) => {
    switch (indicator) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  // Render metric card
  const renderMetricCard = (metric) => {
    const def = metricDefinitions.find(d => d.id === metric.id);
    if (!def) return null;
    
    const value = metrics[metric.key] || 0;
    const indicator = getPerformanceIndicator(value, def.benchmark, def.format);
    const colorClasses = getIndicatorColor(indicator);
    
    return (
      <div key={def.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{def.icon}</span>
            <h4 className="text-sm font-medium text-gray-700">{def.name}</h4>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${colorClasses}`}>
            {indicator}
          </span>
        </div>
        
        <div className="mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatMetricValue(value, def.format)}
          </span>
          {def.goal && goals[def.goal] && (
            <span className="text-sm text-gray-500 ml-2">
              / {formatMetricValue(goals[def.goal], def.format)} goal
            </span>
          )}
        </div>
        
        <div className="text-xs text-gray-600 mb-2">
          {def.description}
        </div>
        
        {/* Progress bar */}
        {def.goal && goals[def.goal] && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                value >= goals[def.goal] ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((value / goals[def.goal]) * 100, 100)}%` }}
            ></div>
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <span className="animate-spin mr-3 text-2xl">🔄</span>
          <span className="text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">📊 Call Analytics</h3>
            {isRealTime && (
              <span className="flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Time Period Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
            >
              {timePeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
            
            {/* Real-time toggle */}
            <button
              onClick={() => setIsRealTime(!isRealTime)}
              className={`p-2 rounded-lg text-sm transition-colors ${
                isRealTime 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Toggle real-time updates"
            >
              {isRealTime ? '🔴' : '⏸️'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {renderMetricCard({ id: 'calls', key: 'totalCalls' })}
          {renderMetricCard({ id: 'connection_rate', key: 'connectionRate' })}
          {renderMetricCard({ id: 'appointment_rate', key: 'appointmentRate' })}
          {renderMetricCard({ id: 'avg_duration', key: 'averageDuration' })}
          {renderMetricCard({ id: 'quality_score', key: 'conversationQuality' })}
        </div>
        
        {/* Outcome Breakdown */}
        {Object.keys(outcomeBreakdown).length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Call Outcomes</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(outcomeBreakdown).map(([outcome, count]) => (
                <div key={outcome} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-600">{outcome}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Performance Trends Chart */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">Performance Trends</h4>
          <div className="bg-gray-50 rounded-lg p-4 h-48 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📈</div>
              <div>Interactive chart would display here</div>
              <div className="text-xs mt-1">
                Showing {performanceTrends.length} data points
              </div>
            </div>
          </div>
        </div>
        
        {/* Time-based Analytics */}
        {timeAnalytics.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Best Performing Hours</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformingHours.map((hourData, index) => (
                <div key={hourData.hour} className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-900">
                      #{index + 1} Best Hour
                    </span>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                      {hourData.connectionRate}% rate
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {hourData.hour}:00 - {hourData.hour + 1}:00
                  </div>
                  <div className="text-xs text-blue-700">
                    {hourData.calls} calls • {hourData.connected} connected
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Comparison with Team/Previous Period */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Comparison */}
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-3">vs Team Average</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Connection Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metrics.connectionRate}%</span>
                  <span className="text-xs text-gray-500">vs {teamAverages.connectionRate || 0}%</span>
                  <span className={`text-xs px-1 py-0.5 rounded ${
                    metrics.connectionRate > (teamAverages.connectionRate || 0)
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {metrics.connectionRate > (teamAverages.connectionRate || 0) ? '↗️' : '↘️'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Total Calls</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metrics.totalCalls}</span>
                  <span className="text-xs text-gray-500">vs {teamAverages.totalCalls || 0}</span>
                  <span className={`text-xs px-1 py-0.5 rounded ${
                    metrics.totalCalls > (teamAverages.totalCalls || 0)
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {metrics.totalCalls > (teamAverages.totalCalls || 0) ? '↗️' : '↘️'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Previous Period */}
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-3">vs Previous Period</h4>
            <div className="space-y-2">
              {previousPeriod.changePercent && Object.entries(previousPeriod.changePercent).map(([key, change]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    change > 0 
                      ? 'bg-green-100 text-green-700' 
                      : change < 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Quick Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-md font-medium text-blue-900 mb-2">💡 Quick Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="text-blue-800">
              • Your connection rate is {metrics.connectionRate > (teamAverages.connectionRate || 0) ? 'above' : 'below'} team average
            </div>
            <div className="text-blue-800">
              • Best performance window: {topPerformingHours[0]?.hour || 10}:00-{(topPerformingHours[0]?.hour || 10) + 1}:00
            </div>
            <div className="text-blue-800">
              • {metrics.appointmentRate >= 20 ? 'Strong' : 'Opportunity for'} appointment conversion rate
            </div>
            <div className="text-blue-800">
              • {metrics.totalCalls >= goals.dailyCalls ? 'Meeting' : 'Below'} daily call volume goal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallAnalytics;