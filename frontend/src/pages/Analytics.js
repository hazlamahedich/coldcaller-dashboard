import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

function Analytics() {
  const { themeClasses } = useTheme();
  const { useMockData } = useSettings();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState({
    callStats: {
      totalCalls: 0,
      connectedCalls: 0,
      avgCallDuration: 0,
      conversionRate: 0
    },
    leadStats: {
      totalLeads: 0,
      qualifiedLeads: 0,
      appointmentsSet: 0,
      closedDeals: 0
    },
    performanceMetrics: {
      callsPerDay: [],
      successRate: [],
      hourlyActivity: []
    }
  });

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // If mock data is disabled, show empty analytics for production
      if (!useMockData) {
        console.log('🚫 Mock data disabled - showing empty analytics');
        setAnalyticsData({
          callStats: {
            totalCalls: 0,
            connectedCalls: 0,
            avgCallDuration: 0,
            conversionRate: 0
          },
          leadStats: {
            totalLeads: 0,
            qualifiedLeads: 0,
            appointmentsSet: 0,
            closedDeals: 0
          },
          performanceMetrics: {
            callsPerDay: [],
            successRate: [],
            hourlyActivity: []
          }
        });
        setLoading(false);
        return;
      }
      
      // In a real app, this would fetch from analytics API
      // For now, we'll use demo data (only if mock data enabled)
      setAnalyticsData({
        callStats: {
          totalCalls: timeRange === '7d' ? 156 : timeRange === '30d' ? 623 : 89,
          connectedCalls: timeRange === '7d' ? 89 : timeRange === '30d' ? 341 : 45,
          avgCallDuration: timeRange === '7d' ? 4.2 : timeRange === '30d' ? 3.8 : 5.1,
          conversionRate: timeRange === '7d' ? 12.8 : timeRange === '30d' ? 15.2 : 8.9
        },
        leadStats: {
          totalLeads: timeRange === '7d' ? 234 : timeRange === '30d' ? 1045 : 125,
          qualifiedLeads: timeRange === '7d' ? 45 : timeRange === '30d' ? 198 : 23,
          appointmentsSet: timeRange === '7d' ? 20 : timeRange === '30d' ? 95 : 11,
          closedDeals: timeRange === '7d' ? 8 : timeRange === '30d' ? 38 : 4
        },
        performanceMetrics: {
          callsPerDay: timeRange === '7d' ? [12, 18, 15, 22, 25, 19, 23] : [20, 25, 18, 30, 28, 22, 26],
          successRate: timeRange === '7d' ? [58, 62, 45, 71, 68, 53, 65] : [61, 58, 72, 64, 69, 55, 67],
          hourlyActivity: [2, 5, 8, 12, 18, 25, 22, 15, 12, 8, 5, 2]
        }
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, useMockData]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getChangeIndicator = (current, previous) => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous * 100).toFixed(1);
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const MetricCard = ({ title, value, subtitle, trend, icon, color = "blue" }) => (
    <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} transition-colors duration-200`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${themeClasses.textSecondary}`}>{title}</p>
            <p className={`text-2xl font-bold ${themeClasses.textPrimary} mt-1`}>{value}</p>
            {subtitle && (
              <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <svg className={`w-4 h-4 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
                {trend.value}% vs previous period
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/30`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  const chartData = analyticsData.performanceMetrics.callsPerDay.map((calls, index) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`,
    calls,
    success: analyticsData.performanceMetrics.successRate[index] || 0
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>Analytics Dashboard</h1>
            <p className={`text-sm ${themeClasses.textSecondary}`}>Track your calling performance and lead conversion metrics</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="mt-4 sm:mt-0">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {[
                { key: '1d', label: 'Today' },
                { key: '7d', label: '7 Days' },
                { key: '30d', label: '30 Days' }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTimeRange(option.key)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    timeRange === option.key
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`text-center py-12 ${themeClasses.textSecondary}`}>
          <div className="animate-spin inline-block w-8 h-8 border-[2px] border-current border-t-transparent rounded-full mb-4"></div>
          <div>Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Calls"
              value={analyticsData.callStats.totalCalls}
              trend={getChangeIndicator(analyticsData.callStats.totalCalls, 120)}
              color="blue"
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Connected Calls"
              value={analyticsData.callStats.connectedCalls}
              subtitle={`${((analyticsData.callStats.connectedCalls / analyticsData.callStats.totalCalls) * 100).toFixed(1)}% success rate`}
              trend={getChangeIndicator(analyticsData.callStats.connectedCalls, 65)}
              color="green"
              icon={
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Avg Call Duration"
              value={`${analyticsData.callStats.avgCallDuration}m`}
              trend={getChangeIndicator(analyticsData.callStats.avgCallDuration, 3.5)}
              color="purple"
              icon={
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Conversion Rate"
              value={`${analyticsData.callStats.conversionRate}%`}
              trend={getChangeIndicator(analyticsData.callStats.conversionRate, 10.5)}
              color="yellow"
              icon={
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>

          {/* Lead Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Leads"
              value={analyticsData.leadStats.totalLeads}
              trend={getChangeIndicator(analyticsData.leadStats.totalLeads, 180)}
              color="indigo"
              icon={
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Qualified Leads"
              value={analyticsData.leadStats.qualifiedLeads}
              subtitle={`${((analyticsData.leadStats.qualifiedLeads / analyticsData.leadStats.totalLeads) * 100).toFixed(1)}% qualification rate`}
              trend={getChangeIndicator(analyticsData.leadStats.qualifiedLeads, 32)}
              color="teal"
              icon={
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Appointments Set"
              value={analyticsData.leadStats.appointmentsSet}
              trend={getChangeIndicator(analyticsData.leadStats.appointmentsSet, 15)}
              color="pink"
              icon={
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Closed Deals"
              value={analyticsData.leadStats.closedDeals}
              subtitle={`${((analyticsData.leadStats.closedDeals / analyticsData.leadStats.appointmentsSet) * 100).toFixed(1)}% close rate`}
              trend={getChangeIndicator(analyticsData.leadStats.closedDeals, 6)}
              color="emerald"
              icon={
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Call Activity Chart */}
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border}`}>
              <div className="p-6">
                <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Daily Call Activity</h3>
                <div className="space-y-3">
                  {chartData.map((day, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`w-12 text-xs font-medium ${themeClasses.textSecondary}`}>{day.day}</div>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(day.calls / Math.max(...chartData.map(d => d.calls))) * 100}%` }}
                          ></div>
                        </div>
                        <div className={`text-sm font-medium ${themeClasses.textPrimary} w-8`}>{day.calls}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Success Rate Trend */}
            <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border}`}>
              <div className="p-6">
                <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Success Rate Trend</h3>
                <div className="space-y-3">
                  {chartData.map((day, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`w-12 text-xs font-medium ${themeClasses.textSecondary}`}>{day.day}</div>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${day.success}%` }}
                          ></div>
                        </div>
                        <div className={`text-sm font-medium ${themeClasses.textPrimary} w-10`}>{day.success}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;