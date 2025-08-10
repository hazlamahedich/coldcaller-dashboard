import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { leadsService } from '../services';
import { useTheme } from '../contexts/ThemeContext';

/**
 * OptimizedLeadAnalyticsDashboard - High-Performance Analytics Component
 * Performance Optimizations:
 * - React.memo for preventing unnecessary re-renders
 * - useMemo for expensive calculations
 * - useCallback for event handlers
 * - Single-pass data processing
 * - Request cancellation with AbortController
 * - Progressive loading architecture
 */
const OptimizedLeadAnalyticsDashboard = React.memo(() => {
  const { isDarkMode, themeClasses } = useTheme();
  const [rawLeads, setRawLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const abortControllerRef = useRef();

  // Memoized analytics processing - Single pass through data
  const analytics = useMemo(() => {
    if (!rawLeads.length) return getEmptyAnalytics();

    const now = new Date();
    const dateFilter = new Date(now.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));

    // Single-pass processing for optimal performance
    return rawLeads.reduce((acc, lead) => {
      const createdDate = new Date(lead.created_at || lead.createdAt);
      const updatedDate = new Date(lead.updated_at || lead.updatedAt);
      
      // Date filtering
      if (createdDate < dateFilter) return acc;

      // Summary metrics (single iteration)
      acc.summary.total++;
      const status = lead.status || 'New';
      acc.summary[mapStatusToKey(status)] = (acc.summary[mapStatusToKey(status)] || 0) + 1;

      // Source distribution
      const source = lead.lead_source || 'Unknown';
      if (!acc.sourceMap[source]) {
        acc.sourceMap[source] = { count: 0, conversions: 0 };
      }
      acc.sourceMap[source].count++;
      if (status === 'Closed') acc.sourceMap[source].conversions++;

      // Priority distribution
      const priority = lead.priority || 'Medium';
      acc.priorityMap[priority] = (acc.priorityMap[priority] || 0) + 1;

      // Industry breakdown
      const industry = lead.industry || 'Other';
      acc.industryMap[industry] = (acc.industryMap[industry] || 0) + 1;

      // Time-based metrics
      const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const twoMonthsAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

      if (createdDate >= oneWeekAgo) acc.trends.thisWeek++;
      else if (createdDate >= twoWeeksAgo) acc.trends.lastWeek++;
      
      if (createdDate >= oneMonthAgo) acc.trends.thisMonth++;
      else if (createdDate >= twoMonthsAgo) acc.trends.lastMonth++;

      // Recent activity (top 10)
      if (acc.recentActivity.length < 10) {
        acc.recentActivity.push({
          id: lead.id,
          type: 'status_change',
          title: `${lead.name} marked as ${status}`,
          description: `Lead from ${lead.company || 'Unknown Company'}`,
          timestamp: updatedDate,
          priority: lead.priority
        });
      }

      return acc;
    }, {
      summary: { total: 0, new: 0, followUp: 0, qualified: 0, closed: 0, notInterested: 0 },
      sourceMap: {},
      priorityMap: {},
      industryMap: {},
      recentActivity: [],
      trends: { thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0 }
    });
  }, [rawLeads, dateRange]);

  // Memoized derived data
  const processedData = useMemo(() => {
    if (!analytics.summary.total) return getEmptyProcessedData();

    // Convert maps to sorted arrays
    const sources = Object.entries(analytics.sourceMap)
      .map(([source, data]) => ({
        source,
        count: data.count,
        percentage: (data.count / analytics.summary.total) * 100
      }))
      .sort((a, b) => b.count - a.count);

    const priorities = Object.entries(analytics.priorityMap)
      .map(([priority, count]) => ({
        priority,
        count,
        percentage: (count / analytics.summary.total) * 100
      }))
      .sort((a, b) => b.count - a.count);

    const industries = Object.entries(analytics.industryMap)
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: (count / analytics.summary.total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Funnel analysis
    const funnel = [
      { stage: 'New', count: analytics.summary.new, percentage: 100 },
      { 
        stage: 'Follow-up', 
        count: analytics.summary.followUp, 
        percentage: analytics.summary.total > 0 ? (analytics.summary.followUp / analytics.summary.total) * 100 : 0 
      },
      { 
        stage: 'Qualified', 
        count: analytics.summary.qualified, 
        percentage: analytics.summary.total > 0 ? (analytics.summary.qualified / analytics.summary.total) * 100 : 0 
      },
      { 
        stage: 'Closed', 
        count: analytics.summary.closed, 
        percentage: analytics.summary.total > 0 ? (analytics.summary.closed / analytics.summary.total) * 100 : 0 
      }
    ];

    // Conversion rates
    const conversionRates = {
      newToFollowUp: analytics.summary.new > 0 ? (analytics.summary.followUp / analytics.summary.new) * 100 : 0,
      followUpToQualified: analytics.summary.followUp > 0 ? (analytics.summary.qualified / analytics.summary.followUp) * 100 : 0,
      qualifiedToClosed: analytics.summary.qualified > 0 ? (analytics.summary.closed / analytics.summary.qualified) * 100 : 0,
      overallConversion: analytics.summary.total > 0 ? (analytics.summary.closed / analytics.summary.total) * 100 : 0
    };

    return {
      summary: analytics.summary,
      funnel,
      sources,
      priorities,
      industries,
      conversionRates,
      recentActivity: analytics.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      trends: analytics.trends
    };
  }, [analytics]);

  // Optimized load analytics with abort controller
  const loadAnalytics = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError(null);

      const response = await leadsService.getAllLeads({ 
        limit: 1000,
        signal // Pass abort signal
      });
      
      if (response.success) {
        const leads = response.data.leads || response.data || [];
        
        if (!Array.isArray(leads)) {
          throw new Error('Invalid leads data format - expected array');
        }
        
        setRawLeads(leads);
      } else {
        throw new Error(response.message || 'Failed to load analytics');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load analytics:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized date range handler
  const handleDateRangeChange = useCallback((newDateRange) => {
    setDateRange(newDateRange);
  }, []);

  // Optimized refresh handler
  const handleRefresh = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    loadAnalytics(abortControllerRef.current.signal);
  }, [loadAnalytics]);

  // Initial load with cleanup
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadAnalytics(controller.signal);
    
    return () => {
      if (controller && typeof controller.abort === 'function') {
        controller.abort();
      }
    };
  }, [loadAnalytics]);

  // Auto-refresh with cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [handleRefresh]);

  // Memoized trend indicators
  const weeklyTrend = useMemo(() => 
    getTrendIndicator(processedData.trends.thisWeek, processedData.trends.lastWeek, isDarkMode),
    [processedData.trends.thisWeek, processedData.trends.lastWeek, isDarkMode]
  );

  const monthlyTrend = useMemo(() => 
    getTrendIndicator(processedData.trends.thisMonth, processedData.trends.lastMonth, isDarkMode),
    [processedData.trends.thisMonth, processedData.trends.lastMonth, isDarkMode]
  );

  // Memoized color functions
  const getStatusColor = useCallback((status) => {
    const colorMap = {
      'New': 'bg-blue-500',
      'Follow-up': 'bg-orange-500',
      'Qualified': 'bg-green-500',
      'Closed': 'bg-purple-500',
      'Not Interested': 'bg-red-500'
    };
    return colorMap[status] || 'bg-gray-500';
  }, []);

  const getPriorityColor = useCallback((priority) => {
    const colorMap = {
      'High': isDarkMode ? 'text-red-200 bg-red-900/50' : 'text-red-600 bg-red-100',
      'Medium': isDarkMode ? 'text-orange-200 bg-orange-900/50' : 'text-orange-600 bg-orange-100',
      'Low': isDarkMode ? 'text-green-200 bg-green-900/50' : 'text-green-600 bg-green-100'
    };
    return colorMap[priority] || (isDarkMode ? 'text-gray-300 bg-gray-800' : 'text-gray-600 bg-gray-100');
  }, [isDarkMode]);

  if (loading) {
    return <LoadingState themeClasses={themeClasses} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleRefresh} themeClasses={themeClasses} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <HeaderSection 
        themeClasses={themeClasses}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={handleRefresh}
      />

      {/* Summary Cards */}
      <SummaryCards 
        analytics={processedData}
        weeklyTrend={weeklyTrend}
        monthlyTrend={monthlyTrend}
        themeClasses={themeClasses}
        isDarkMode={isDarkMode}
      />

      {/* Charts Row */}
      <ChartsRow 
        analytics={processedData}
        getStatusColor={getStatusColor}
        themeClasses={themeClasses}
        isDarkMode={isDarkMode}
      />

      {/* Bottom Row */}
      <BottomRow 
        analytics={processedData}
        getPriorityColor={getPriorityColor}
        themeClasses={themeClasses}
        isDarkMode={isDarkMode}
      />

      {/* Conversion Metrics */}
      <ConversionMetrics 
        analytics={processedData}
        themeClasses={themeClasses}
      />
    </div>
  );
});

// Optimized sub-components
const LoadingState = React.memo(({ themeClasses }) => (
  <div className={`${themeClasses.cardBg} rounded-lg shadow-sm p-8`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className={`${themeClasses.textSecondary} mt-4`}>Loading analytics...</p>
    </div>
  </div>
));

const ErrorState = React.memo(({ error, onRetry, themeClasses }) => (
  <div className={`${themeClasses.cardBg} rounded-lg shadow-sm p-8`}>
    <div className="text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>Failed to Load Analytics</h3>
      <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
      <button
        onClick={onRetry}
        className={`px-4 py-2 ${themeClasses.buttonPrimary} rounded-lg`}
      >
        Retry
      </button>
    </div>
  </div>
));

const HeaderSection = React.memo(({ themeClasses, dateRange, onDateRangeChange, onRefresh }) => (
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>Lead Analytics</h2>
      <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
        Performance insights and trends
      </p>
    </div>
    <div className="flex items-center gap-3">
      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value)}
        className={`px-4 py-2 ${themeClasses.input} rounded-lg ${themeClasses.focusRing} focus:ring-2`}
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last year</option>
      </select>
      <button
        onClick={onRefresh}
        className={`px-4 py-2 ${themeClasses.buttonPrimary} rounded-lg`}
      >
        🔄 Refresh
      </button>
    </div>
  </div>
));

const SummaryCards = React.memo(({ analytics, weeklyTrend, monthlyTrend, themeClasses, isDarkMode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {/* Total Leads Card */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Total Leads</p>
          <p className={`text-3xl font-bold ${themeClasses.textPrimary}`}>{analytics.summary.total}</p>
        </div>
        <div className={`p-3 ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} rounded-full`}>
          <span className="text-2xl">👥</span>
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <span className={`text-sm ${weeklyTrend.color}`}>
          {weeklyTrend.icon} {weeklyTrend.text}
        </span>
        <span className={`text-sm ${themeClasses.textMuted} ml-2`}>vs last week</span>
      </div>
    </div>

    {/* Qualified Card */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Qualified</p>
          <p className="text-3xl font-bold text-green-600">{analytics.summary.qualified}</p>
        </div>
        <div className={`p-3 ${isDarkMode ? 'bg-green-900/50' : 'bg-green-100'} rounded-full`}>
          <span className="text-2xl">✅</span>
        </div>
      </div>
      <div className="mt-4">
        <span className={`text-sm ${themeClasses.textMuted}`}>
          {analytics.summary.total > 0 ? 
            `${((analytics.summary.qualified / analytics.summary.total) * 100).toFixed(1)}% of total` :
            'No data'
          }
        </span>
      </div>
    </div>

    {/* Conversion Rate Card */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>Conversion Rate</p>
          <p className="text-3xl font-bold text-purple-600">
            {analytics.conversionRates.overallConversion.toFixed(1)}%
          </p>
        </div>
        <div className={`p-3 ${isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'} rounded-full`}>
          <span className="text-2xl">🎯</span>
        </div>
      </div>
      <div className="mt-4">
        <span className={`text-sm ${themeClasses.textMuted}`}>
          New to Closed
        </span>
      </div>
    </div>

    {/* This Month Card */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>This Month</p>
          <p className="text-3xl font-bold text-orange-600">{analytics.trends.thisMonth}</p>
        </div>
        <div className={`p-3 ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-100'} rounded-full`}>
          <span className="text-2xl">📅</span>
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <span className={`text-sm ${monthlyTrend.color}`}>
          {monthlyTrend.icon} {monthlyTrend.text}
        </span>
        <span className={`text-sm ${themeClasses.textMuted} ml-2`}>vs last month</span>
      </div>
    </div>
  </div>
));

const ChartsRow = React.memo(({ analytics, getStatusColor, themeClasses, isDarkMode }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Lead Funnel */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Lead Funnel</h3>
      <div className="space-y-4">
        {analytics.funnel.map((stage) => (
          <div key={stage.stage} className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>{stage.stage}</span>
              <span className={`text-sm ${themeClasses.textMuted}`}>
                {stage.count} ({stage.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-3`}>
              <div
                className={`h-3 rounded-full ${getStatusColor(stage.stage)} transition-all duration-500`}
                style={{ width: `${Math.max(stage.percentage, 5)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Lead Sources */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Lead Sources</h3>
      <div className="space-y-3">
        {analytics.sources.slice(0, 6).map((source, index) => (
          <div key={source.source} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-red-500', 'bg-gray-500'][index]
              }`}></div>
              <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>{source.source}</span>
            </div>
            <div className="text-right">
              <div className={`text-sm font-semibold ${themeClasses.textPrimary}`}>{source.count}</div>
              <div className={`text-xs ${themeClasses.textMuted}`}>{source.percentage.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

const BottomRow = React.memo(({ analytics, getPriorityColor, themeClasses }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Priority Distribution */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Priority Distribution</h3>
      <div className="space-y-3">
        {analytics.priorities.map((priority) => (
          <div key={priority.priority} className="flex items-center justify-between">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(priority.priority)}`}>
              {priority.priority}
            </span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>{priority.count}</span>
              <span className={`text-xs ${themeClasses.textMuted}`}>({priority.percentage.toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Top Industries */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Top Industries</h3>
      <div className="space-y-3">
        {analytics.industries.slice(0, 5).map((industry) => (
          <div key={industry.industry} className="flex items-center justify-between">
            <span className={`text-sm font-medium ${themeClasses.textSecondary} truncate`}>{industry.industry}</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>{industry.count}</span>
              <span className={`text-xs ${themeClasses.textMuted}`}>({industry.percentage.toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recent Activity */}
    <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
      <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Recent Activity</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {analytics.recentActivity.map((activity) => (
          <div key={`${activity.id}-${activity.timestamp}`} className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${themeClasses.textPrimary} truncate`}>{activity.title}</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>{activity.description}</p>
              <p className={`text-xs ${themeClasses.textMuted} mt-1`}>
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

const ConversionMetrics = React.memo(({ analytics, themeClasses }) => (
  <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
    <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Conversion Metrics</h3>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {analytics.conversionRates.newToFollowUp.toFixed(1)}%
        </div>
        <div className={`text-sm ${themeClasses.textSecondary}`}>New → Follow-up</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">
          {analytics.conversionRates.followUpToQualified.toFixed(1)}%
        </div>
        <div className={`text-sm ${themeClasses.textSecondary}`}>Follow-up → Qualified</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {analytics.conversionRates.qualifiedToClosed.toFixed(1)}%
        </div>
        <div className={`text-sm ${themeClasses.textSecondary}`}>Qualified → Closed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">
          {analytics.conversionRates.overallConversion.toFixed(1)}%
        </div>
        <div className={`text-sm ${themeClasses.textSecondary}`}>Overall Conversion</div>
      </div>
    </div>
  </div>
));

// Utility functions
const getEmptyAnalytics = () => ({
  summary: { total: 0, new: 0, followUp: 0, qualified: 0, closed: 0, notInterested: 0 },
  sourceMap: {},
  priorityMap: {},
  industryMap: {},
  recentActivity: [],
  trends: { thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0 }
});

const getEmptyProcessedData = () => ({
  summary: { total: 0, new: 0, followUp: 0, qualified: 0, closed: 0, notInterested: 0 },
  funnel: [],
  sources: [],
  priorities: [],
  industries: [],
  conversionRates: {
    newToFollowUp: 0,
    followUpToQualified: 0,
    qualifiedToClosed: 0,
    overallConversion: 0
  },
  recentActivity: [],
  trends: { thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0 }
});

const mapStatusToKey = (status) => {
  const statusMap = {
    'New': 'new',
    'Follow-up': 'followUp',
    'Qualified': 'qualified',
    'Closed': 'closed',
    'Not Interested': 'notInterested'
  };
  return statusMap[status] || 'new';
};

const getTrendIndicator = (current, previous, isDarkMode) => {
  if (previous === 0) return { 
    icon: '📈', 
    color: isDarkMode ? 'text-blue-400' : 'text-blue-600', 
    text: 'New' 
  };
  const change = ((current - previous) / previous) * 100;
  if (change > 0) return { 
    icon: '📈', 
    color: isDarkMode ? 'text-green-400' : 'text-green-600', 
    text: `+${change.toFixed(1)}%` 
  };
  if (change < 0) return { 
    icon: '📉', 
    color: isDarkMode ? 'text-red-400' : 'text-red-600', 
    text: `${change.toFixed(1)}%` 
  };
  return { 
    icon: '➡️', 
    color: isDarkMode ? 'text-gray-400' : 'text-gray-600', 
    text: 'No change' 
  };
};

OptimizedLeadAnalyticsDashboard.displayName = 'OptimizedLeadAnalyticsDashboard';

export default OptimizedLeadAnalyticsDashboard;