import React, { useState, useEffect } from 'react';
import { notesService } from '../services';

// Note Analytics and Insights Dashboard
const NoteAnalyticsDashboard = ({ leadId, dateRange, onClose }) => {
  const [analytics, setAnalytics] = useState({
    totalNotes: 0,
    averageQuality: 0,
    averageWordCount: 0,
    notesByType: {},
    qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
    sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
    tagFrequency: {},
    followUpRate: 0,
    timelineData: []
  });

  const [templateAnalytics, setTemplateAnalytics] = useState({
    totalTemplates: 0,
    totalUsage: 0,
    averageRating: 0,
    templatesByCategory: {},
    mostPopular: [],
    highestRated: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadAnalytics();
    loadTemplateAnalytics();
  }, [leadId, dateRange, selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await notesService.getNoteAnalytics(leadId, dateRange);
      
      if (response.success) {
        setAnalytics(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateAnalytics = async () => {
    try {
      const response = await notesService.getTemplateAnalytics();
      
      if (response.success) {
        setTemplateAnalytics(response.data);
      }
    } catch (err) {
      console.error('Template analytics error:', err);
    }
  };

  const getQualityColor = (quality) => {
    if (quality >= 80) return 'text-green-600';
    if (quality >= 60) return 'text-blue-600';
    if (quality >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadge = (quality) => {
    if (quality >= 80) return 'bg-green-100 text-green-800';
    if (quality >= 60) return 'bg-blue-100 text-blue-800';
    if (quality >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">{analytics.totalNotes}</div>
          <div className="text-sm opacity-90">Total Notes</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">{analytics.averageQuality}%</div>
          <div className="text-sm opacity-90">Avg Quality</div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">{analytics.averageWordCount}</div>
          <div className="text-sm opacity-90">Avg Words</div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">{analytics.followUpRate}%</div>
          <div className="text-sm opacity-90">Follow-up Rate</div>
        </div>
      </div>

      {/* Quality Distribution */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Distribution</h3>
        <div className="space-y-3">
          {Object.entries(analytics.qualityDistribution).map(([level, count]) => {
            const percentage = analytics.totalNotes > 0 ? (count / analytics.totalNotes) * 100 : 0;
            return (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getQualityBadge(
                    level === 'excellent' ? 90 : 
                    level === 'good' ? 70 : 
                    level === 'fair' ? 50 : 30
                  )} mr-2`}>
                    {level === 'excellent' ? '⭐ Excellent' : 
                     level === 'good' ? '✅ Good' : 
                     level === 'fair' ? '⚠️ Fair' : '❌ Poor'}
                  </span>
                  <span className="text-sm text-gray-600">{count} notes</span>
                </div>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes by Type */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Notes by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(analytics.notesByType).map(([type, count]) => {
            const percentage = analytics.totalNotes > 0 ? (count / analytics.totalNotes) * 100 : 0;
            const typeIcons = {
              'cold-call': '📞',
              'follow-up': '🔄',
              'demo-presentation': '💻',
              'closing-call': '🤝',
              'general': '📝'
            };
            
            return (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{typeIcons[type] || '📝'}</span>
                  <div>
                    <div className="font-medium text-sm capitalize">{type.replace('-', ' ')}</div>
                    <div className="text-xs text-gray-500">{count} notes</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{percentage.toFixed(1)}%</div>
                  <div className="w-16 h-1 bg-gray-200 rounded-full">
                    <div 
                      className="h-1 bg-blue-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderTagsTab = () => (
    <div className="space-y-6">
      {/* Top Tags */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Used Tags</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(analytics.tagFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([tag, count]) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
              >
                {tag}
                <span className="ml-1 px-1.5 py-0.5 bg-blue-200 text-blue-900 rounded-full text-xs">
                  {count}
                </span>
              </span>
            ))
          }
        </div>
      </div>

      {/* Tag Usage Over Time */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tag Trends</h3>
        <div className="text-sm text-gray-600">
          Tag usage trends would be displayed here with a chart showing how tag usage has changed over time.
        </div>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      {/* Template Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{templateAnalytics.totalTemplates}</div>
          <div className="text-sm text-gray-600">Total Templates</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{templateAnalytics.totalUsage}</div>
          <div className="text-sm text-gray-600">Total Usage</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">{templateAnalytics.averageRating}</div>
          <div className="text-sm text-gray-600">Avg Rating</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">
            {Object.keys(templateAnalytics.templatesByCategory).length}
          </div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
      </div>

      {/* Most Popular Templates */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Popular Templates</h3>
        <div className="space-y-3">
          {templateAnalytics.mostPopular.slice(0, 5).map((template, index) => (
            <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{template.category}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">{template.usageCount} uses</div>
                {template.averageRating && (
                  <div className="text-xs text-gray-500">
                    ⭐ {template.averageRating}/5
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Templates by Category */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Templates by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(templateAnalytics.templatesByCategory).map(([category, count]) => {
            const categoryIcons = {
              sales: '💼',
              support: '🛠️',
              'follow-up': '🔄',
              meeting: '👥',
              custom: '⚙️'
            };
            
            return (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{categoryIcons[category] || '📝'}</span>
                  <div>
                    <div className="font-medium text-sm capitalize">{category.replace('-', ' ')}</div>
                    <div className="text-xs text-gray-500">{count} templates</div>
                  </div>
                </div>
                <div className="text-sm font-semibold">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      {/* Sentiment Analysis */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Analysis</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(analytics.sentimentDistribution).map(([sentiment, count]) => {
            const percentage = analytics.totalNotes > 0 ? (count / analytics.totalNotes) * 100 : 0;
            const sentimentConfig = {
              positive: { color: 'text-green-600', bg: 'bg-green-100', icon: '😊' },
              neutral: { color: 'text-gray-600', bg: 'bg-gray-100', icon: '😐' },
              negative: { color: 'text-red-600', bg: 'bg-red-100', icon: '😔' }
            };
            
            const config = sentimentConfig[sentiment];
            
            return (
              <div key={sentiment} className={`p-4 rounded-lg ${config.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${config.color} capitalize`}>{sentiment}</span>
                  <span className="text-lg">{config.icon}</span>
                </div>
                <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
                <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Productivity Insights */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Productivity Insights</h3>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-center">
              <span className="text-lg mr-2">💡</span>
              <div>
                <div className="font-medium text-blue-800">Quality Improvement Opportunity</div>
                <div className="text-sm text-blue-600">
                  {analytics.qualityDistribution.poor > 0 && 
                    `${analytics.qualityDistribution.poor} notes have low quality scores. Consider using templates for better structure.`
                  }
                  {analytics.qualityDistribution.poor === 0 && 
                    "Great job! All your notes maintain good quality standards."
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
            <div className="flex items-center">
              <span className="text-lg mr-2">📈</span>
              <div>
                <div className="font-medium text-green-800">Follow-up Performance</div>
                <div className="text-sm text-green-600">
                  Your follow-up rate is {analytics.followUpRate}%. 
                  {analytics.followUpRate < 20 && " Consider setting more follow-up reminders."}
                  {analytics.followUpRate >= 20 && analytics.followUpRate < 50 && " Good follow-up discipline!"}
                  {analytics.followUpRate >= 50 && " Excellent follow-up tracking!"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
            <div className="flex items-center">
              <span className="text-lg mr-2">🎯</span>
              <div>
                <div className="font-medium text-purple-800">Note Completeness</div>
                <div className="text-sm text-purple-600">
                  Average note length is {analytics.averageWordCount} words. 
                  {analytics.averageWordCount < 50 && " Consider adding more detail for better tracking."}
                  {analytics.averageWordCount >= 50 && analytics.averageWordCount < 200 && " Good level of detail in your notes."}
                  {analytics.averageWordCount >= 200 && " Very comprehensive note-taking!"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="note-analytics-dashboard max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📊 Note Analytics</h2>
          <p className="text-gray-600">
            {leadId ? 'Lead-specific' : 'Overall'} performance insights and trends
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📈' },
            { id: 'tags', label: 'Tags & Topics', icon: '🏷️' },
            { id: 'templates', label: 'Templates', icon: '📋' },
            { id: 'insights', label: 'Insights', icon: '💡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
      <div className="tab-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'tags' && renderTagsTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
        {activeTab === 'insights' && renderInsightsTab()}
      </div>
    </div>
  );
};

export default NoteAnalyticsDashboard;