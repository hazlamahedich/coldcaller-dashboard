/**
 * Agent Scorecard Component
 * Individual agent performance tracking with coaching insights
 */

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Radar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AgentScorecard = ({ agentId, dateRange = 'month', onClose }) => {
  const [scorecardData, setScorecardData] = useState(null);
  const [coachingInsights, setCoachingInsights] = useState(null);
  const [selectedTab, setSelectedTab] = useState('performance');
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState('team'); // team, top10, historical

  // Fetch scorecard data
  useEffect(() => {
    const fetchScorecardData = async () => {
      try {
        setLoading(true);
        
        const [scorecardRes, coachingRes] = await Promise.all([
          fetch(`/api/call-analytics/agent-scorecards?agent_id=${agentId}&start_date=${getDateRange(dateRange).start}&end_date=${getDateRange(dateRange).end}`),
          fetch(`/api/call-analytics/coaching-insights?agent_id=${agentId}&start_date=${getDateRange(dateRange).start}&end_date=${getDateRange(dateRange).end}`)
        ]);

        const scorecardData = await scorecardRes.json();
        const coachingData = await coachingRes.json();

        setScorecardData(scorecardData.data);
        setCoachingInsights(coachingData.data);
      } catch (error) {
        console.error('Error fetching scorecard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      fetchScorecardData();
    }
  }, [agentId, dateRange]);

  const getDateRange = (range) => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  if (loading || !scorecardData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-center">Loading agent scorecard...</p>
        </div>
      </div>
    );
  }

  const agent = scorecardData.scorecards[agentId];
  const benchmarks = scorecardData.benchmarks;

  if (!agent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-lg text-center">Agent not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mx-auto block"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Performance radar chart data
  const radarData = {
    labels: [
      'Connection Rate',
      'Conversion Rate',
      'Call Quality',
      'Calls per Day',
      'Note Completeness',
      'Follow-up Rate'
    ],
    datasets: [
      {
        label: agent.agentName,
        data: [
          (parseFloat(agent.connectionRate) / 100) * 5,
          (parseFloat(agent.conversionRate) / 25) * 5,
          parseFloat(agent.avgQualityScore),
          (parseFloat(agent.callsPerDay) / 50) * 5,
          (agent.noteCompleteness / 100) * 5,
          (agent.followUpAdherence / 100) * 5
        ],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
      },
      {
        label: 'Team Average',
        data: [
          (benchmarks.connectionRate.avg / 100) * 5,
          (benchmarks.conversionRate.avg / 25) * 5,
          benchmarks.qualityScore.avg,
          (benchmarks.callsPerDay.avg / 50) * 5,
          4, // Placeholder
          4  // Placeholder
        ],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
      }
    ]
  };

  // Performance trend data (mock data - would come from API)
  const trendData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Connection Rate',
        data: [65, 70, 72, parseFloat(agent.connectionRate)],
        borderColor: 'rgb(59, 130, 246)',
        tension: 0.1
      },
      {
        label: 'Conversion Rate',
        data: [12, 15, 16, parseFloat(agent.conversionRate)],
        borderColor: 'rgb(16, 185, 129)',
        tension: 0.1
      }
    ]
  };

  const getPerformanceColor = (value, benchmark, isPercentage = true) => {
    const numValue = parseFloat(value);
    const comparison = numValue / benchmark;
    
    if (comparison >= 1.1) return 'text-green-600';
    if (comparison >= 0.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (value, benchmark) => {
    const numValue = parseFloat(value);
    if (numValue >= benchmark * 1.1) return '📈';
    if (numValue >= benchmark * 0.9) return '➡️';
    return '📉';
  };

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connection Rate</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(agent.connectionRate, benchmarks.connectionRate.avg)}`}>
                {agent.connectionRate}%
              </p>
            </div>
            <span className="text-2xl">{getPerformanceIcon(agent.connectionRate, benchmarks.connectionRate.avg)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Team avg: {benchmarks.connectionRate.avg.toFixed(1)}%
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(agent.conversionRate, benchmarks.conversionRate.avg)}`}>
                {agent.conversionRate}%
              </p>
            </div>
            <span className="text-2xl">{getPerformanceIcon(agent.conversionRate, benchmarks.conversionRate.avg)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Team avg: {benchmarks.conversionRate.avg.toFixed(1)}%
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Quality Score</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(agent.avgQualityScore, benchmarks.qualityScore.avg, false)}`}>
                {agent.avgQualityScore}
              </p>
            </div>
            <span className="text-2xl">{getPerformanceIcon(agent.avgQualityScore, benchmarks.qualityScore.avg)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Team avg: {benchmarks.qualityScore.avg.toFixed(1)}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Calls/Day</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(agent.callsPerDay, benchmarks.callsPerDay.avg, false)}`}>
                {agent.callsPerDay}
              </p>
            </div>
            <span className="text-2xl">{getPerformanceIcon(agent.callsPerDay, benchmarks.callsPerDay.avg)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Team avg: {benchmarks.callsPerDay.avg.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Performance Radar</h4>
          <div className="h-64">
            <Radar 
              data={radarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    angleLines: {
                      display: false
                    },
                    suggestedMin: 0,
                    suggestedMax: 5
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Performance Trends</h4>
          <div className="h-64">
            <Line 
              data={trendData}
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
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="text-lg font-semibold mb-4">Team Ranking</h4>
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">#{agent.performanceRank}</p>
            <p className="text-sm text-gray-600">Overall Rank</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Performance Percentile</span>
              <span>{Math.round((1 - agent.performanceRank / Object.keys(scorecardData.scorecards).length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(1 - agent.performanceRank / Object.keys(scorecardData.scorecards).length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCoachingTab = () => (
    <div className="space-y-6">
      {/* Improvement Areas */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-red-800 mb-3">Areas for Improvement</h4>
        <div className="space-y-2">
          {agent.improvementAreas.map((area, index) => (
            <div key={index} className="flex items-center space-x-3">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-red-700">{area}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-green-800 mb-3">Key Strengths</h4>
        <div className="space-y-2">
          {agent.strengths.map((strength, index) => (
            <div key={index} className="flex items-center space-x-3">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-700">{strength}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coaching Recommendations */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-4">Coaching Recommendations</h4>
        <div className="space-y-4">
          {agent.coachingRecommendations.map((rec, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium">{rec.area}</h5>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {rec.priority}
                </span>
              </div>
              <p className="text-gray-600 mb-2">{rec.recommendation}</p>
              <p className="text-sm text-blue-600">{rec.expectedImprovement}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Development Plan */}
      {coachingInsights?.skillsDevelopment && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-4">Skills Development Plan</h4>
          <div className="space-y-4">
            {coachingInsights.skillsDevelopment.developmentPath.map((skill, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{skill.skill}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{skill.currentScore}/{skill.targetScore}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(skill.currentScore / skill.targetScore) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm text-gray-600">Timeline</p>
                  <p className="font-medium">{skill.timeframe}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-screen w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{agent.agentName}</h2>
              <p className="opacity-90">Agent ID: {agent.agentId} | {dateRange.toUpperCase()} Performance</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Tabs */}
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setSelectedTab('performance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'performance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Performance Metrics
              </button>
              <button
                onClick={() => setSelectedTab('coaching')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'coaching'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Coaching & Development
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto max-h-96">
            {selectedTab === 'performance' && renderPerformanceTab()}
            {selectedTab === 'coaching' && renderCoachingTab()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Last updated: {new Date(agent.lastUpdated).toLocaleString()}
          </div>
          <div className="space-x-3">
            <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
              Export Report
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Schedule Coaching
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentScorecard;