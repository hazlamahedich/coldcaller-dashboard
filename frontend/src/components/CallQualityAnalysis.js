/**
 * Call Quality Analysis Component
 * Advanced call quality insights with sentiment analysis and coaching recommendations
 */

import React, { useState, useEffect } from 'react';
import { Bar, Line, Radar, Scatter } from 'react-chartjs-2';

const CallQualityAnalysis = ({ dateRange, agentFilter }) => {
  const [qualityData, setQualityData] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(agentFilter || 'all');

  // Fetch quality analysis data
  useEffect(() => {
    const fetchQualityData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (dateRange?.start) params.append('start_date', dateRange.start);
        if (dateRange?.end) params.append('end_date', dateRange.end);
        if (selectedAgent !== 'all') params.append('agent_id', selectedAgent);

        const response = await fetch(`/api/call-analytics/quality-analysis?${params}`);
        const result = await response.json();
        
        setQualityData(result.data);
      } catch (error) {
        console.error('Error fetching quality data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQualityData();
  }, [dateRange, selectedAgent]);

  if (loading || !qualityData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg">Loading quality analysis...</span>
      </div>
    );
  }

  // Quality score distribution chart
  const qualityDistributionData = {
    labels: ['1-2 (Poor)', '2-3 (Below Avg)', '3-4 (Average)', '4-5 (Good)', '5 (Excellent)'],
    datasets: [
      {
        label: 'Call Distribution',
        data: qualityData.qualityAnalysis?.scoreDistribution || [0, 0, 0, 0, 0],
        backgroundColor: [
          '#EF4444', // Red for poor
          '#F97316', // Orange for below average
          '#EAB308', // Yellow for average
          '#22C55E', // Green for good
          '#059669'  // Dark green for excellent
        ]
      }
    ]
  };

  // Outcome correlation data
  const outcomeCorrelationData = {
    datasets: [
      {
        label: 'Quality vs Outcome',
        data: qualityData.outcomeCorrelation?.correlationPoints?.map(point => ({
          x: point.qualityScore,
          y: point.conversionRate,
          r: point.callCount / 10 // Bubble size
        })) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.6)'
      }
    ]
  };

  // Script effectiveness data
  const scriptEffectivenessData = {
    labels: Object.keys(qualityData.scriptAnalysis?.effectiveness || {}),
    datasets: [
      {
        label: 'Average Quality Score',
        data: Object.values(qualityData.scriptAnalysis?.effectiveness || {}),
        backgroundColor: 'rgba(34, 197, 94, 0.8)'
      }
    ]
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Quality</p>
              <p className="text-2xl font-bold text-gray-900">
                {qualityData.summary?.avgQualityScore || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Quality Trend</p>
              <p className={`text-2xl font-bold ${
                qualityData.qualityAnalysis?.trend?.isImproving ? 'text-green-600' : 'text-red-600'
              }`}>
                {qualityData.qualityAnalysis?.trend?.direction || 'Stable'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Best Script</p>
              <p className="text-2xl font-bold text-gray-900">
                {qualityData.scriptAnalysis?.topScript || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Calls Analyzed</p>
              <p className="text-2xl font-bold text-gray-900">
                {qualityData.summary?.totalCallsAnalyzed || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Distribution Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quality Score Distribution</h3>
        <div className="h-64">
          <Bar 
            data={qualityDistributionData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
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

      {/* Top Performers and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-600">Top Quality Performers</h3>
          <div className="space-y-3">
            {qualityData.qualityAnalysis?.topPerformers?.slice(0, 5).map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">{performer.agentName}</p>
                  <p className="text-sm text-gray-600">{performer.totalCalls} calls</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{performer.avgQuality}</p>
                  <p className="text-sm text-gray-500">Quality Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600">Needs Improvement</h3>
          <div className="space-y-3">
            {qualityData.qualityAnalysis?.improvementOpportunities?.slice(0, 5).map((opportunity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium">{opportunity.agentName}</p>
                  <p className="text-sm text-gray-600">{opportunity.issueArea}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{opportunity.currentScore}</p>
                  <p className="text-sm text-gray-500">Quality Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCorrelationTab = () => (
    <div className="space-y-6">
      {/* Quality vs Outcome Correlation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quality Score vs Conversion Rate</h3>
        <div className="h-64">
          <Scatter 
            data={outcomeCorrelationData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return `Quality: ${context.parsed.x}, Conversion: ${context.parsed.y}%, Calls: ${context.raw.r * 10}`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Quality Score'
                  },
                  min: 1,
                  max: 5
                },
                y: {
                  title: {
                    display: true,
                    text: 'Conversion Rate (%)'
                  },
                  beginAtZero: true
                },
              },
            }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Bubble size represents call volume. Higher quality scores typically correlate with better conversion rates.
        </p>
      </div>

      {/* Lead Characteristics Impact */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quality by Lead Characteristics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium mb-3">By Industry</h4>
            <div className="space-y-2">
              {qualityData.outcomeCorrelation?.byIndustry && Object.entries(qualityData.outcomeCorrelation.byIndustry).map(([industry, score]) => (
                <div key={industry} className="flex justify-between">
                  <span className="text-sm">{industry}</span>
                  <span className="text-sm font-medium">{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">By Lead Source</h4>
            <div className="space-y-2">
              {qualityData.outcomeCorrelation?.bySource && Object.entries(qualityData.outcomeCorrelation.bySource).map(([source, score]) => (
                <div key={source} className="flex justify-between">
                  <span className="text-sm">{source}</span>
                  <span className="text-sm font-medium">{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">By Company Size</h4>
            <div className="space-y-2">
              {qualityData.outcomeCorrelation?.byCompanySize && Object.entries(qualityData.outcomeCorrelation.byCompanySize).map(([size, score]) => (
                <div key={size} className="flex justify-between">
                  <span className="text-sm">{size}</span>
                  <span className="text-sm font-medium">{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScriptAnalysisTab = () => (
    <div className="space-y-6">
      {/* Script Effectiveness Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Script Effectiveness by Quality Score</h3>
        <div className="h-64">
          <Bar 
            data={scriptEffectivenessData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 5,
                  title: {
                    display: true,
                    text: 'Average Quality Score'
                  }
                },
              },
            }}
          />
        </div>
      </div>

      {/* Objection Handling Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Objection Handling Effectiveness</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Common Objections</h4>
            <div className="space-y-3">
              {qualityData.objectionAnalysis?.commonObjections?.map((objection, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{objection.type}</p>
                      <p className="text-xs text-gray-600 mt-1">{objection.frequency} occurrences</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        objection.successRate > 70 ? 'text-green-600' :
                        objection.successRate > 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {objection.successRate}%
                      </p>
                      <p className="text-xs text-gray-500">Success Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Best Responses</h4>
            <div className="space-y-3">
              {qualityData.objectionAnalysis?.bestResponses?.map((response, index) => (
                <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-medium text-sm text-green-800">{response.objectionType}</p>
                  <p className="text-xs text-green-700 mt-1">{response.response}</p>
                  <p className="text-xs text-green-600 mt-2">Success Rate: {response.successRate}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCoachingTab = () => (
    <div className="space-y-6">
      {/* Coaching Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quality Coaching Insights</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 text-red-600">Critical Areas</h4>
            <div className="space-y-3">
              {qualityData.coachingInsights?.criticalAreas?.map((area, index) => (
                <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-red-800">{area.skill}</p>
                      <p className="text-sm text-red-700 mt-1">{area.description}</p>
                    </div>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                      {area.agentsAffected} agents
                    </span>
                  </div>
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className="text-sm"><strong>Recommended Action:</strong></p>
                    <p className="text-sm text-gray-700">{area.recommendedAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3 text-blue-600">Training Recommendations</h4>
            <div className="space-y-3">
              {qualityData.coachingInsights?.trainingRecommendations?.map((rec, index) => (
                <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-blue-800">{rec.topic}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">{rec.description}</p>
                  <div className="text-xs text-blue-600">
                    <p><strong>Expected Impact:</strong> {rec.expectedImprovement}</p>
                    <p><strong>Timeline:</strong> {rec.estimatedTimeline}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Identified Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qualityData.bestPractices?.map((practice, index) => (
            <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium text-green-800">{practice.title}</p>
                  <p className="text-sm text-green-700 mt-1">{practice.description}</p>
                  <p className="text-xs text-green-600 mt-2">
                    Observed in {practice.frequency}% of high-quality calls
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Call Quality Analysis</h2>
          <p className="text-gray-600 mt-1">Advanced quality insights and coaching recommendations</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            {/* Would be populated from API */}
            <option value="agent-1">John Smith</option>
            <option value="agent-2">Sarah Johnson</option>
            <option value="agent-3">Mike Davis</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'correlation', 'scripts', 'coaching'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedAnalysis(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                selectedAnalysis === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'scripts' ? 'Script Analysis' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedAnalysis === 'overview' && renderOverviewTab()}
      {selectedAnalysis === 'correlation' && renderCorrelationTab()}
      {selectedAnalysis === 'scripts' && renderScriptAnalysisTab()}
      {selectedAnalysis === 'coaching' && renderCoachingTab()}
    </div>
  );
};

export default CallQualityAnalysis;