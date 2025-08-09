import React, { useState, useEffect } from 'react';
import { leadsService } from '../services';
import { useTheme } from '../contexts/ThemeContext';

/**
 * LeadAnalyticsDashboard - Comprehensive analytics and insights
 * Features: Funnel visualization, source attribution, performance metrics, real-time feed
 */
const LeadAnalyticsDashboard = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const [analytics, setAnalytics] = useState({
    summary: {
      total: 0,
      new: 0,
      followUp: 0,
      qualified: 0,
      closed: 0,
      notInterested: 0
    },
    funnel: [],
    sources: [],
    priorities: [],
    industries: [],
    conversionRates: {},
    recentActivity: [],
    trends: {
      thisWeek: 0,
      lastWeek: 0,
      thisMonth: 0,
      lastMonth: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // days
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all leads for analysis
      const response = await leadsService.getAllLeads({ limit: 1000 });
      
      if (response.success) {
        // Handle the nested data structure: response.data.leads contains the array
        const leads = response.data.leads || response.data || [];
        console.log('📊 [Analytics] Processing leads data:', {
          responseStructure: Object.keys(response.data),
          leadsCount: Array.isArray(leads) ? leads.length : 0,
          leadsType: typeof leads,
          firstLead: leads[0]
        });
        
        if (!Array.isArray(leads)) {
          console.warn('⚠️ [Analytics] Expected leads to be an array, got:', typeof leads, leads);
          throw new Error('Invalid leads data format - expected array');
        }
        
        const processedAnalytics = processLeadsData(leads);
        setAnalytics(processedAnalytics);
      } else {
        throw new Error(response.message || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process leads data for analytics
  const processLeadsData = (leads) => {
    const now = new Date();
    const dateFilter = new Date(now.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));

    // Filter leads by date range
    const filteredLeads = leads.filter(lead => {
      const createdDate = new Date(lead.created_at || lead.createdAt);
      return createdDate >= dateFilter;
    });

    // Summary counts
    const summary = {
      total: filteredLeads.length,
      new: filteredLeads.filter(l => l.status === 'New').length,
      followUp: filteredLeads.filter(l => l.status === 'Follow-up').length,
      qualified: filteredLeads.filter(l => l.status === 'Qualified').length,
      closed: filteredLeads.filter(l => l.status === 'Closed').length,
      notInterested: filteredLeads.filter(l => l.status === 'Not Interested').length
    };

    // Funnel analysis
    const funnel = [
      { stage: 'New', count: summary.new, percentage: 100 },
      { stage: 'Follow-up', count: summary.followUp, percentage: summary.total > 0 ? (summary.followUp / summary.total) * 100 : 0 },
      { stage: 'Qualified', count: summary.qualified, percentage: summary.total > 0 ? (summary.qualified / summary.total) * 100 : 0 },
      { stage: 'Closed', count: summary.closed, percentage: summary.total > 0 ? (summary.closed / summary.total) * 100 : 0 }
    ];

    // Lead sources
    const sourceMap = {};
    filteredLeads.forEach(lead => {
      const source = lead.lead_source || 'Unknown';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });
    const sources = Object.entries(sourceMap)
      .map(([source, count]) => ({
        source,
        count,
        percentage: (count / filteredLeads.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Priority distribution
    const priorityMap = {};
    filteredLeads.forEach(lead => {
      const priority = lead.priority || 'Medium';
      priorityMap[priority] = (priorityMap[priority] || 0) + 1;
    });
    const priorities = Object.entries(priorityMap)
      .map(([priority, count]) => ({
        priority,
        count,
        percentage: (count / filteredLeads.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Industry breakdown
    const industryMap = {};
    filteredLeads.forEach(lead => {
      const industry = lead.industry || 'Other';
      industryMap[industry] = (industryMap[industry] || 0) + 1;
    });
    const industries = Object.entries(industryMap)
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: (count / filteredLeads.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 industries

    // Conversion rates
    const conversionRates = {
      newToFollowUp: summary.new > 0 ? (summary.followUp / summary.new) * 100 : 0,
      followUpToQualified: summary.followUp > 0 ? (summary.qualified / summary.followUp) * 100 : 0,
      qualifiedToClosed: summary.qualified > 0 ? (summary.closed / summary.qualified) * 100 : 0,
      overallConversion: summary.total > 0 ? (summary.closed / summary.total) * 100 : 0
    };

    // Recent activity (mock data - would come from activity API)
    const recentActivity = filteredLeads
      .sort((a, b) => new Date(b.updated_at || b.updatedAt) - new Date(a.updated_at || a.updatedAt))
      .slice(0, 10)
      .map(lead => ({
        id: lead.id,
        type: 'status_change',
        title: `${lead.name} marked as ${lead.status}`,
        description: `Lead from ${lead.company || 'Unknown Company'}`,
        timestamp: lead.updated_at || lead.updatedAt,
        priority: lead.priority
      }));

    // Trends calculation
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const twoMonthsAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

    const trends = {
      thisWeek: leads.filter(l => new Date(l.created_at || l.createdAt) >= oneWeekAgo).length,
      lastWeek: leads.filter(l => {
        const date = new Date(l.created_at || l.createdAt);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      }).length,
      thisMonth: leads.filter(l => new Date(l.created_at || l.createdAt) >= oneMonthAgo).length,
      lastMonth: leads.filter(l => {
        const date = new Date(l.created_at || l.createdAt);
        return date >= twoMonthsAgo && date < oneMonthAgo;
      }).length
    };

    return {
      summary,
      funnel,
      sources,
      priorities,
      industries,
      conversionRates,
      recentActivity,
      trends
    };
  };

  // Initial load
  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  // Auto-refresh setup
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalytics();
    }, 30000); // Refresh every 30 seconds

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dateRange]);

  // Get trend indicator with dark mode support
  const getTrendIndicator = (current, previous) => {
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

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-500';
      case 'Follow-up': return 'bg-orange-500';
      case 'Qualified': return 'bg-green-500';
      case 'Closed': return 'bg-purple-500';
      case 'Not Interested': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get priority color with dark mode support
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return isDarkMode ? 'text-red-200 bg-red-900/50' : 'text-red-600 bg-red-100';
      case 'Medium': return isDarkMode ? 'text-orange-200 bg-orange-900/50' : 'text-orange-600 bg-orange-100';
      case 'Low': return isDarkMode ? 'text-green-200 bg-green-900/50' : 'text-green-600 bg-green-100';
      default: return isDarkMode ? 'text-gray-300 bg-gray-800' : 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={`${themeClasses.cardBg} rounded-lg shadow-sm p-8`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`${themeClasses.textSecondary} mt-4`}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${themeClasses.cardBg} rounded-lg shadow-sm p-8`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-2`}>Failed to Load Analytics</h3>
          <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={loadAnalytics}
            className={`px-4 py-2 ${themeClasses.buttonPrimary} rounded-lg`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const weeklyTrend = getTrendIndicator(analytics.trends.thisWeek, analytics.trends.lastWeek);
  const monthlyTrend = getTrendIndicator(analytics.trends.thisMonth, analytics.trends.lastMonth);

  return (
    <div className="space-y-6">
      {/* Header */}
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
            onChange={(e) => setDateRange(e.target.value)}
            className={`px-4 py-2 ${themeClasses.input} rounded-lg ${themeClasses.focusRing} focus:ring-2`}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={loadAnalytics}
            className={`px-4 py-2 ${themeClasses.buttonPrimary} rounded-lg`}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Funnel */}
        <div className={`${themeClasses.cardBg} p-6 rounded-lg shadow-sm ${themeClasses.border} border`}>
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} mb-4`}>Lead Funnel</h3>
          <div className="space-y-4">
            {analytics.funnel.map((stage, index) => (
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

      {/* Bottom Row */}
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

      {/* Conversion Metrics */}
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
    </div>
  );
};

export default LeadAnalyticsDashboard;