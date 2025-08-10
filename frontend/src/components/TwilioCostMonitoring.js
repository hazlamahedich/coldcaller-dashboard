import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import twilioAnalyticsService from '../services/twilioAnalyticsService';

/**
 * TwilioCostMonitoring - Comprehensive cost monitoring and analytics for Twilio
 * Features: Real-time cost tracking, billing analysis, usage forecasting, alerts
 */
const TwilioCostMonitoring = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const [costData, setCostData] = useState({
    summary: {
      totalCost: 0,
      voiceCost: 0,
      smsCost: 0,
      phoneNumberCost: 0,
      recordingCost: 0,
      period: { start: null, end: null, days: 0 }
    },
    breakdown: {
      voice: 0,
      sms: 0,
      phoneNumbers: 0,
      recording: 0,
      categories: [],
      timeline: []
    },
    trends: {
      daily: [],
      growth: { daily: 0, weekly: 0 },
      patterns: { averageDailyCost: 0, peakDays: [] }
    },
    forecasts: {
      nextWeek: { cost: 0, confidence: 0 },
      nextMonth: { cost: 0, confidence: 0 },
      projections: { conservative: 0, realistic: 0, aggressive: 0 }
    },
    alerts: { active: [], warnings: [], info: [] },
    optimization: { immediate: [], shortTerm: [], longTerm: [], estimatedSavings: 0 }
  });

  const [metrics, setMetrics] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    alerts: [],
    trends: { direction: 'stable', percentage: 0 }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [thresholds, setThresholds] = useState({
    daily: 50,
    weekly: 300,
    monthly: 1000
  });
  const [activeTab, setActiveTab] = useState('overview');
  
  // Use ref to track loading state to prevent race conditions
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Load cost analytics with enhanced loading control
  const loadCostAnalytics = useCallback(async () => {
    if (loadingRef.current) {
      console.log('💰 [CostMonitoring] Already loading, skipping duplicate request');
      return; // Prevent duplicate calls while already loading
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000);

      console.log('💰 [CostMonitoring] Loading cost analytics:', { startDate, endDate });

      // Add timeout protection for API calls
      const analyticsPromise = Promise.race([
        twilioAnalyticsService.getCostAnalytics(startDate, endDate),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cost analytics request timeout')), 10000)
        )
      ]);

      const metricsPromise = Promise.race([
        twilioAnalyticsService.getRealTimeMetrics(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Metrics request timeout')), 10000)
        )
      ]);

      const [analyticsData, metricsData] = await Promise.all([analyticsPromise, metricsPromise]);

      // Handle API responses with fallback data
      if (analyticsData && analyticsData.success) {
        setCostData(analyticsData.data);
      } else {
        console.warn('💰 [CostMonitoring] Analytics data unavailable, using defaults');
        // Keep existing costData or use safe defaults
      }

      if (metricsData && metricsData.success) {
        setMetrics(metricsData.data);
      } else {
        console.warn('💰 [CostMonitoring] Metrics data unavailable, using defaults');
        // Keep existing metrics or use safe defaults
      }

    } catch (err) {
      console.error('💰 [CostMonitoring] Failed to load analytics:', err);
      setError(err.message || 'Failed to load cost monitoring data');
      
      // Set fallback data to prevent blank UI
      setCostData(prevData => ({
        ...prevData,
        summary: { 
          ...prevData.summary, 
          totalCost: prevData.summary?.totalCost || 0 
        },
        breakdown: { 
          ...prevData.breakdown, 
          voice: prevData.breakdown?.voice || 0, 
          sms: prevData.breakdown?.sms || 0, 
          phoneNumbers: prevData.breakdown?.phoneNumbers || 0, 
          recording: prevData.breakdown?.recording || 0 
        }
      }));
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [dateRange]); // Add dateRange as dependency to useCallback

  // Update cost thresholds without triggering reload loop
  const updateThresholds = async (newThresholds) => {
    try {
      const result = await twilioAnalyticsService.updateCostThresholds(newThresholds);

      if (result.success) {
        setThresholds({ ...thresholds, ...newThresholds });
        console.log('💰 [CostMonitoring] Thresholds updated successfully');
        // Don't automatically reload - let user manually refresh if needed
      } else {
        throw new Error(result.message);
      }

    } catch (err) {
      console.error('💰 [CostMonitoring] Failed to update thresholds:', err);
      setError(err.message);
    }
  };

  // Export cost report
  const exportReport = async (format = 'json') => {
    try {
      const endDate = new Date();
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000);

      await twilioAnalyticsService.exportCostReport(startDate, endDate, format);

    } catch (err) {
      console.error('💰 [CostMonitoring] Failed to export report:', err);
      setError(err.message);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial load with proper dependency and loading control
  useEffect(() => {
    // Prevent duplicate calls during rapid state changes
    const timeoutId = setTimeout(() => {
      loadCostAnalytics();
    }, 100); // Small debounce
    
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCostAnalytics]); // Use loadCostAnalytics as dependency instead of dateRange

  // Get cost category color
  const getCostCategoryColor = (category) => {
    const colors = {
      voice: isDarkMode ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-100',
      sms: isDarkMode ? 'text-green-400 bg-green-900/50' : 'text-green-600 bg-green-100',
      phoneNumbers: isDarkMode ? 'text-purple-400 bg-purple-900/50' : 'text-purple-600 bg-purple-100',
      recording: isDarkMode ? 'text-orange-400 bg-orange-900/50' : 'text-orange-600 bg-orange-100',
      other: isDarkMode ? 'text-gray-400 bg-gray-800' : 'text-gray-600 bg-gray-100'
    };
    return colors[category] || colors.other;
  };

  // Get alert severity color
  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return isDarkMode ? 'text-red-400 bg-red-900/50 border-red-500' : 'text-red-700 bg-red-50 border-red-200';
      case 'warning': return isDarkMode ? 'text-orange-400 bg-orange-900/50 border-orange-500' : 'text-orange-700 bg-orange-50 border-orange-200';
      case 'info': return isDarkMode ? 'text-blue-400 bg-blue-900/50 border-blue-500' : 'text-blue-700 bg-blue-50 border-blue-200';
      default: return isDarkMode ? 'text-gray-400 bg-gray-800 border-gray-600' : 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  // Get trend indicator
  const getTrendIndicator = (percentage) => {
    if (percentage > 10) return { icon: '📈', color: 'text-red-500', text: `+${percentage.toFixed(1)}%` };
    if (percentage > 0) return { icon: '📊', color: 'text-orange-500', text: `+${percentage.toFixed(1)}%` };
    if (percentage < -10) return { icon: '📉', color: 'text-green-500', text: `${percentage.toFixed(1)}%` };
    return { icon: '➡️', color: 'text-gray-500', text: '0%' };
  };

  if (loading) {
    return (
      <div className={`${themeClasses.cardBg} rounded-lg shadow-sm p-8`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`${themeClasses.textSecondary} mt-4`}>Loading cost monitoring...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${themeClasses.cardBg} rounded-lg shadow-sm p-8`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">💰⚠️</div>
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>Cost Monitoring Error</h3>
          <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={loadCostAnalytics}
            className={`px-4 py-2 ${themeClasses.buttonPrimary} rounded-lg`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const dailyTrend = getTrendIndicator(costData.trends.growth.daily);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${themeClasses.textPrimary} flex items-center gap-2`}>
            <span className="text-3xl">💰</span>
            Twilio Cost Monitoring
          </h2>
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
            Real-time cost tracking and optimization insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={`px-4 py-2 ${themeClasses.input} rounded-lg ${themeClasses.focusRing} focus:ring-2`}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={loadCostAnalytics}
            className={`px-4 py-2 ${themeClasses.buttonPrimary} rounded-lg`}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => exportReport('csv')}
            className={`px-4 py-2 ${themeClasses.buttonSecondary} rounded-lg`}
          >
            📊 Export
          </button>
        </div>
      </div>

      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Today</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>${metrics.today.toFixed(2)}</p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} rounded-full`}>
              <span className="text-2xl">📅</span>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${thresholds.daily > metrics.today ? 'text-green-500' : 'text-red-500'}`}>
              ${thresholds.daily - metrics.today > 0 ? (thresholds.daily - metrics.today).toFixed(2) : 0} under threshold
            </span>
          </div>
        </div>

        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>This Week</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>${metrics.thisWeek.toFixed(2)}</p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-green-900/50' : 'bg-green-100'} rounded-full`}>
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <span className={`text-xs ${dailyTrend.color}`}>
              {dailyTrend.icon} {dailyTrend.text}
            </span>
            <span className={`text-xs ${themeClasses.textMuted} ml-2`}>vs last week</span>
          </div>
        </div>

        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>This Month</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>${metrics.thisMonth.toFixed(2)}</p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'} rounded-full`}>
              <span className="text-2xl">💳</span>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${themeClasses.textMuted}`}>
              {((metrics.thisMonth / thresholds.monthly) * 100).toFixed(1)}% of budget
            </span>
          </div>
        </div>

        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Forecasted</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                ${costData.forecasts.nextMonth.cost.toFixed(0)}
              </p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-100'} rounded-full`}>
              <span className="text-2xl">🔮</span>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${themeClasses.textMuted}`}>
              {costData.forecasts.nextMonth.confidence.toFixed(0)}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(costData.alerts.active.length > 0 || costData.alerts.warnings.length > 0) && (
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4 flex items-center gap-2`}>
            <span className="text-2xl">🚨</span>
            Cost Alerts
          </h3>
          <div className="space-y-3">
            {[...costData.alerts.active, ...costData.alerts.warnings].map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{alert.title}</h4>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                  <div className="text-xs opacity-75">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={`${themeClasses.cardBg} rounded-lg shadow-sm ${themeClasses.border} border`}>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'breakdown', name: 'Cost Breakdown', icon: '💰' },
              { id: 'forecasts', name: 'Forecasts', icon: '🔮' },
              { id: 'optimization', name: 'Optimization', icon: '⚡' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : `border-transparent ${themeClasses.textSecondary} hover:${themeClasses.textPrimary} hover:border-gray-300 dark:hover:border-gray-600`
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Summary */}
              <div>
                <h4 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Cost Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`${themeClasses.textSecondary}`}>Voice Calls</span>
                    <span className={`font-semibold ${themeClasses.textPrimary}`}>
                      ${costData.breakdown.voice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${themeClasses.textSecondary}`}>SMS Messages</span>
                    <span className={`font-semibold ${themeClasses.textPrimary}`}>
                      ${costData.breakdown.sms.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${themeClasses.textSecondary}`}>Phone Numbers</span>
                    <span className={`font-semibold ${themeClasses.textPrimary}`}>
                      ${costData.breakdown.phoneNumbers.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${themeClasses.textSecondary}`}>Recordings</span>
                    <span className={`font-semibold ${themeClasses.textPrimary}`}>
                      ${costData.breakdown.recording.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className={`font-semibold ${themeClasses.textPrimary}`}>Total</span>
                    <span className={`text-xl font-bold ${themeClasses.textPrimary}`}>
                      ${costData.summary.totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Daily Trends Chart (Simple) */}
              <div>
                <h4 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Daily Cost Trend</h4>
                <div className="space-y-2">
                  {costData.trends.daily.slice(-7).map((day, index) => {
                    const maxCost = Math.max(...costData.trends.daily.map(d => d.cost));
                    const percentage = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;
                    
                    return (
                      <div key={day.date} className="flex items-center space-x-3">
                        <div className={`text-xs w-20 ${themeClasses.textSecondary}`}>
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1">
                          <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-4`}>
                            <div
                              className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className={`text-xs font-medium w-16 text-right ${themeClasses.textPrimary}`}>
                          ${day.cost.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown Tab */}
          {activeTab === 'breakdown' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <div>
                  <h4 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>By Category</h4>
                  <div className="space-y-3">
                    {costData.breakdown.categories.slice(0, 8).map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCostCategoryColor(category.category)} mr-3`}>
                            {category.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${themeClasses.textPrimary}`}>
                            ${category.cost.toFixed(2)}
                          </div>
                          <div className={`text-xs ${themeClasses.textMuted}`}>
                            {category.count} {category.usageUnit || 'units'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Categories Pie Chart Representation */}
                <div>
                  <h4 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Cost Distribution</h4>
                  <div className="space-y-4">
                    {[
                      { name: 'Voice', value: costData.breakdown.voice, color: 'bg-blue-500' },
                      { name: 'SMS', value: costData.breakdown.sms, color: 'bg-green-500' },
                      { name: 'Phone Numbers', value: costData.breakdown.phoneNumbers, color: 'bg-purple-500' },
                      { name: 'Recordings', value: costData.breakdown.recording, color: 'bg-orange-500' }
                    ].filter(item => item.value > 0).map((item) => {
                      const percentage = costData.summary.totalCost > 0 ? 
                        (item.value / costData.summary.totalCost) * 100 : 0;
                      
                      return (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded ${item.color} mr-3`}></div>
                            <span className={`text-sm ${themeClasses.textSecondary}`}>{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className={`w-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                              <div
                                className={`${item.color} h-2 rounded-full`}
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                              ></div>
                            </div>
                            <div className="text-right min-w-16">
                              <div className={`text-sm font-semibold ${themeClasses.textPrimary}`}>
                                ${item.value.toFixed(2)}
                              </div>
                              <div className={`text-xs ${themeClasses.textMuted}`}>
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forecasts Tab */}
          {activeTab === 'forecasts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Cost Projections</h4>
                <div className="space-y-4">
                  <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
                    <div className="flex justify-between items-center">
                      <span className={`${themeClasses.textSecondary}`}>Next Week</span>
                      <span className={`font-semibold ${themeClasses.textPrimary}`}>
                        ${costData.forecasts.nextWeek.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-green-500 mt-1">
                      {costData.forecasts.nextWeek.confidence.toFixed(0)}% confidence
                    </div>
                  </div>
                  
                  <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
                    <div className="flex justify-between items-center">
                      <span className={`${themeClasses.textSecondary}`}>Next Month</span>
                      <span className={`font-semibold ${themeClasses.textPrimary}`}>
                        ${costData.forecasts.nextMonth.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-green-500 mt-1">
                      {costData.forecasts.nextMonth.confidence.toFixed(0)}% confidence
                    </div>
                  </div>

                  {costData.forecasts.nextQuarter && (
                    <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
                      <div className="flex justify-between items-center">
                        <span className={`${themeClasses.textSecondary}`}>Next Quarter</span>
                        <span className={`font-semibold ${themeClasses.textPrimary}`}>
                          ${(costData.forecasts.nextQuarter.cost || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-green-500 mt-1">
                        {(costData.forecasts.nextQuarter.confidence || 0).toFixed(0)}% confidence
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Scenario Analysis</h4>
                <div className="space-y-4">
                  <div className={`p-4 border-l-4 border-green-500 ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} rounded`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-700 dark:text-green-400">Conservative</span>
                      <span className="font-bold text-green-700 dark:text-green-400">
                        ${costData.forecasts.projections.conservative.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-500 mt-1">
                      20% below current trend
                    </div>
                  </div>

                  <div className={`p-4 border-l-4 border-blue-500 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} rounded`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-700 dark:text-blue-400">Realistic</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        ${costData.forecasts.projections.realistic.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                      Based on current usage
                    </div>
                  </div>

                  <div className={`p-4 border-l-4 border-orange-500 ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'} rounded`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-orange-700 dark:text-orange-400">Aggressive</span>
                      <span className="font-bold text-orange-700 dark:text-orange-400">
                        ${costData.forecasts.projections.aggressive.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-orange-600 dark:text-orange-500 mt-1">
                      30% above current trend
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {activeTab === 'optimization' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Optimization Recommendations</h4>
                <div className={`px-3 py-1 ${isDarkMode ? 'bg-green-900/50' : 'bg-green-100'} text-green-600 rounded-full text-sm font-medium`}>
                  Potential Savings: ${costData.optimization.estimatedSavings.toFixed(2)}/month
                </div>
              </div>

              {/* Immediate Actions */}
              {costData.optimization.immediate.length > 0 && (
                <div className={`p-4 border-l-4 border-red-500 ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'} rounded`}>
                  <h5 className="font-semibold text-red-700 dark:text-red-400 mb-3">🚨 Immediate Actions</h5>
                  <div className="space-y-3">
                    {costData.optimization.immediate.map((suggestion, index) => (
                      <div key={index} className="flex justify-between items-start">
                        <div>
                          <h6 className="font-medium">{suggestion.title}</h6>
                          <p className="text-sm text-red-600 dark:text-red-500">{suggestion.description}</p>
                        </div>
                        <div className="text-sm font-semibold text-red-700 dark:text-red-400 ml-4">
                          ${suggestion.potentialSavings?.toFixed(2) || '0.00'}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Short-term Actions */}
              {costData.optimization.shortTerm.length > 0 && (
                <div className={`p-4 border-l-4 border-orange-500 ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'} rounded`}>
                  <h5 className="font-semibold text-orange-700 dark:text-orange-400 mb-3">⚡ Short-term Actions</h5>
                  <div className="space-y-3">
                    {costData.optimization.shortTerm.map((suggestion, index) => (
                      <div key={index} className="flex justify-between items-start">
                        <div>
                          <h6 className="font-medium">{suggestion.title}</h6>
                          <p className="text-sm text-orange-600 dark:text-orange-500">{suggestion.description}</p>
                        </div>
                        <div className="text-sm font-semibold text-orange-700 dark:text-orange-400 ml-4">
                          ${suggestion.potentialSavings?.toFixed(2) || '0.00'}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Long-term Actions */}
              {costData.optimization.longTerm.length > 0 && (
                <div className={`p-4 border-l-4 border-green-500 ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} rounded`}>
                  <h5 className="font-semibold text-green-700 dark:text-green-400 mb-3">💡 Long-term Planning</h5>
                  <div className="space-y-3">
                    {costData.optimization.longTerm.map((suggestion, index) => (
                      <div key={index} className="flex justify-between items-start">
                        <div>
                          <h6 className="font-medium">{suggestion.title}</h6>
                          <p className="text-sm text-green-600 dark:text-green-500">{suggestion.description}</p>
                        </div>
                        <div className="text-sm font-semibold text-green-700 dark:text-green-400 ml-4">
                          ${suggestion.potentialSavings?.toFixed(2) || '0.00'}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No suggestions */}
              {costData.optimization.immediate.length === 0 && 
               costData.optimization.shortTerm.length === 0 && 
               costData.optimization.longTerm.length === 0 && (
                <div className={`p-8 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
                  <div className="text-6xl mb-4">🎯</div>
                  <h5 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>
                    Great Job! Your usage is optimized
                  </h5>
                  <p className={`${themeClasses.textSecondary}`}>
                    No immediate optimization opportunities detected. Keep monitoring for changes.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Threshold Settings */}
      <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4 flex items-center gap-2`}>
          <span className="text-2xl">⚙️</span>
          Cost Thresholds
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
              Daily Threshold ($)
            </label>
            <input
              type="number"
              value={thresholds.daily}
              onChange={(e) => setThresholds({...thresholds, daily: parseFloat(e.target.value)})}
              onBlur={() => updateThresholds({daily: thresholds.daily})}
              className={`w-full px-3 py-2 ${themeClasses.input} rounded-lg ${themeClasses.focusRing} focus:ring-2`}
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
              Weekly Threshold ($)
            </label>
            <input
              type="number"
              value={thresholds.weekly}
              onChange={(e) => setThresholds({...thresholds, weekly: parseFloat(e.target.value)})}
              onBlur={() => updateThresholds({weekly: thresholds.weekly})}
              className={`w-full px-3 py-2 ${themeClasses.input} rounded-lg ${themeClasses.focusRing} focus:ring-2`}
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
              Monthly Threshold ($)
            </label>
            <input
              type="number"
              value={thresholds.monthly}
              onChange={(e) => setThresholds({...thresholds, monthly: parseFloat(e.target.value)})}
              onBlur={() => updateThresholds({monthly: thresholds.monthly})}
              className={`w-full px-3 py-2 ${themeClasses.input} rounded-lg ${themeClasses.focusRing} focus:ring-2`}
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>🔔 You'll receive alerts when costs exceed these thresholds</p>
        </div>
      </div>
    </div>
  );
};

export default TwilioCostMonitoring;