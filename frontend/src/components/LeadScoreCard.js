import React, { useState } from 'react';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Brain,
  Star,
  Clock,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

const LeadScoreCard = ({ lead, scoreData, className = "" }) => {
  const [expanded, setExpanded] = useState(false);

  if (!scoreData) return null;

  const {
    baseScore,
    aiScore,
    finalScore,
    confidence,
    aiInsights = [],
    buyingSignals = [],
    riskFactors = [],
    recommendations = [],
    personalizedApproach,
    bestContactTime
  } = scoreData;

  // Score color and grade
  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getGrade = (score) => {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  const getTemperature = (score) => {
    if (score >= 80) return { text: 'Hot', icon: '🔥', color: 'text-red-500' };
    if (score >= 60) return { text: 'Warm', icon: '🌡️', color: 'text-orange-500' };
    return { text: 'Cold', icon: '❄️', color: 'text-blue-500' };
  };

  const temperature = getTemperature(finalScore);
  const scoreColorClass = getScoreColor(finalScore);

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center ${scoreColorClass}`}>
            <div className="text-2xl font-bold">{finalScore}</div>
            <div className="text-xs font-medium">{getGrade(finalScore)}</div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {lead?.name || 'Unknown Lead'}
            </h3>
            <p className="text-sm text-gray-600">{lead?.company || 'Unknown Company'}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-sm font-medium ${temperature.color}`}>
                {temperature.icon} {temperature.text}
              </span>
              {aiScore && (
                <span className="flex items-center text-xs text-purple-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Enhanced
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>{expanded ? 'Less' : 'More'}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Score Breakdown */}
      {baseScore && aiScore && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">Traditional Score</div>
            <div className="text-xl font-semibold text-gray-800">{baseScore}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 flex items-center justify-center">
              <Brain className="h-3 w-3 mr-1" />
              AI Score
            </div>
            <div className="text-xl font-semibold text-purple-600">{aiScore}</div>
            {confidence && (
              <div className="text-xs text-gray-500">
                {Math.round(confidence * 100)}% confidence
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Insights */}
      <div className="space-y-3">
        {buyingSignals.length > 0 && (
          <div className="flex items-start space-x-2">
            <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-900">Buying Signals</div>
              <div className="text-xs text-gray-600">
                {buyingSignals.slice(0, 2).join(', ')}
                {buyingSignals.length > 2 && ` +${buyingSignals.length - 2} more`}
              </div>
            </div>
          </div>
        )}

        {riskFactors.length > 0 && (
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-900">Risk Factors</div>
              <div className="text-xs text-gray-600">
                {riskFactors.slice(0, 2).join(', ')}
                {riskFactors.length > 2 && ` +${riskFactors.length - 2} more`}
              </div>
            </div>
          </div>
        )}

        {personalizedApproach && (
          <div className="flex items-start space-x-2">
            <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-900">Approach</div>
              <div className="text-xs text-gray-600">{personalizedApproach}</div>
            </div>
          </div>
        )}

        {bestContactTime && (
          <div className="flex items-start space-x-2">
            <Clock className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-900">Best Contact Time</div>
              <div className="text-xs text-gray-600">{bestContactTime}</div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900">AI Insights</span>
              </div>
              <ul className="space-y-1">
                {aiInsights.map((insight, index) => (
                  <li key={index} className="text-xs text-gray-600 pl-6">
                    • {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Buying Signals */}
          {buyingSignals.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900">
                  Buying Signals ({buyingSignals.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {buyingSignals.map((signal, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md border border-green-200"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {riskFactors.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900">
                  Risk Factors ({riskFactors.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {riskFactors.map((risk, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-md border border-yellow-200"
                  >
                    {risk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900">Recommendations</span>
              </div>
              <ul className="space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-gray-600 pl-6">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex space-x-2">
        <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Contact Lead
        </button>
        <button className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
};

export default LeadScoreCard;