# Call Analytics API Documentation

## Overview

The Call Analytics API provides comprehensive call performance tracking, agent scorecards, quality analysis, and real-time monitoring capabilities for the Cold Calling Dashboard system.

## Base URL
```
http://localhost:3001/api/call-analytics
```

## Authentication
All endpoints require proper authentication. Include your API key or JWT token in the Authorization header.

## Endpoints

### 1. Call Performance Analytics

#### GET /performance
Get comprehensive call performance metrics and trends.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format
- `agent_id` (optional): Filter by specific agent ID
- `lead_source` (optional): Filter by lead source
- `outcome` (optional): Filter by call outcome
- `include_trends` (optional): Include trending analysis (default: true)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCalls": 1250,
      "totalConnected": 875,
      "totalAnswered": 312,
      "avgDuration": 185,
      "conversionRate": 15.2,
      "dateRange": "2025-01-01 to 2025-01-31"
    },
    "volumeAnalysis": {
      "daily": [
        {"date": "2025-01-01", "count": 45, "trend": "+12%"},
        {"date": "2025-01-02", "count": 52, "trend": "+15%"}
      ],
      "trends": {
        "dailyGrowth": "+8.5%",
        "weeklyGrowth": "+12.3%"
      }
    },
    "connectionAnalysis": {
      "connectionRate": "70.0",
      "answerRate": "25.0",
      "voicemailRate": "45.0",
      "optimization": {
        "potentialImprovement": "15%",
        "recommendations": ["Optimize calling times", "Update lead list"]
      }
    }
  }
}
```

### 2. Agent Scorecards

#### GET /agent-scorecards
Get individual agent performance scorecards with KPIs.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format
- `agent_id` (optional): Specific agent ID
- `include_rankings` (optional): Include performance rankings (default: true)
- `include_coaching` (optional): Include coaching recommendations (default: true)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "scorecards": {
      "agent-1": {
        "agentId": "agent-1",
        "agentName": "John Smith",
        "totalCalls": 156,
        "callsPerDay": "7.8",
        "connectionRate": "72.5",
        "conversionRate": "18.2",
        "avgQualityScore": "4.2",
        "performanceRank": 2,
        "improvementAreas": ["Connection Rate", "Note Quality"],
        "strengths": ["Conversion Rate", "Call Quality"],
        "coachingRecommendations": [
          {
            "area": "Connection Rate",
            "recommendation": "Focus on optimal calling times",
            "priority": "High",
            "expectedImprovement": "10-15% increase"
          }
        ]
      }
    },
    "teamSummary": {
      "totalAgents": 8,
      "avgConnectionRate": "68.5",
      "avgConversionRate": "15.8"
    }
  }
}
```

### 3. Call Quality Analysis

#### GET /quality-analysis
Get call quality analysis with detailed insights.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format
- `agent_id` (optional): Filter by agent ID
- `quality_threshold` (optional): Minimum quality threshold (default: 3.0)
- `include_coaching` (optional): Include coaching insights (default: true)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCallsAnalyzed": 1250,
      "avgQualityScore": "3.8",
      "qualityTrend": "improving"
    },
    "qualityAnalysis": {
      "avgScore": "3.8",
      "scoreDistribution": [15, 25, 35, 20, 5],
      "topPerformers": [
        {
          "agentName": "John Smith",
          "avgQuality": "4.5",
          "totalCalls": 156
        }
      ]
    },
    "coachingInsights": {
      "criticalAreas": [
        {
          "skill": "Active Listening",
          "description": "Need improvement in understanding customer needs",
          "agentsAffected": 3,
          "recommendedAction": "Provide active listening training"
        }
      ]
    }
  }
}
```

### 4. Real-Time Dashboard

#### GET /real-time-dashboard
Get real-time call activity monitoring and performance.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalCallsToday": 145,
    "callsInProgress": 3,
    "callsLastHour": 12,
    "connectionRateToday": "74.2",
    "avgQualityToday": "3.9",
    "conversionRateToday": "16.5",
    "activeAgents": 6,
    "alerts": [
      {
        "type": "warning",
        "message": "Connection rate below 50% in last 2 hours",
        "severity": "High"
      }
    ],
    "hourlyBreakdown": [0, 0, 0, 0, 0, 2, 8, 15, 22, 18, 16, 14],
    "lastUpdated": "2025-01-15T10:30:00Z"
  }
}
```

### 5. Specific Analytics Components

#### GET /volume-trends
Get call volume analysis with trending.

#### GET /connection-rates
Get connection and answer rate optimization analysis.

#### GET /duration-analysis
Get call duration and talk time analysis.

#### GET /outcome-distribution
Get call outcome analysis and conversion tracking.

#### GET /timing-analysis
Get peak calling hours and day-of-week performance.

### 6. Coaching Insights

#### GET /coaching-insights
Get agent coaching recommendations and improvement plans.

**Query Parameters:**
- `agent_id` (required): Agent ID for coaching insights
- `start_date` (optional): Start date
- `end_date` (optional): End date
- `focus_area` (optional): Specific area to focus coaching on

**Example Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent-1",
    "performanceSummary": {
      "overallRank": 2,
      "totalAgents": 8,
      "strengthAreas": ["Quality Score", "Conversion Rate"],
      "improvementAreas": ["Connection Rate"]
    },
    "skillsDevelopment": {
      "developmentPath": [
        {
          "skill": "Active Listening",
          "currentScore": 3.2,
          "targetScore": 4.0,
          "timeframe": "4 weeks"
        }
      ]
    }
  }
}
```

### 7. Advanced Analytics

#### GET /advanced-filtering
Get advanced analytics with custom filtering and grouping.

**Query Parameters:**
- `agents[]`: Array of agent IDs
- `outcomes[]`: Array of call outcomes
- `quality_range`: Quality score range (JSON: {"min": 3, "max": 5})
- `duration_range`: Duration range in seconds
- `group_by`: Group results by (agent|outcome|source|industry)

### 8. Reporting & Export

#### POST /automated-report
Generate and schedule automated reports.

**Request Body:**
```json
{
  "reportType": "daily_performance",
  "schedule": {
    "frequency": "daily",
    "time": "08:00"
  },
  "recipients": ["manager@company.com", "team@company.com"],
  "customizations": {
    "includeCharts": true,
    "sections": ["performance", "quality"]
  },
  "deliveryFormat": "email"
}
```

#### POST /export
Export call analytics data in various formats.

**Request Body:**
```json
{
  "exportType": "performance",
  "format": "json",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "filters": {
    "agent_id": "agent-1"
  },
  "includeCharts": false
}
```

## WebSocket Integration

### Real-Time Updates
Connect to `ws://localhost:3001/ws/call-analytics` for real-time updates.

**Event Types:**
- `call_started`: New call initiated
- `call_ended`: Call completed
- `metrics_update`: Dashboard metrics updated
- `performance_alerts`: Performance alerts triggered

**Example WebSocket Message:**
```json
{
  "type": "metrics_update",
  "data": {
    "totalCallsToday": 146,
    "connectionRateToday": "74.5",
    "timestamp": "2025-01-15T10:31:00Z"
  }
}
```

## Error Handling

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Rate Limiting

API requests are limited to 100 requests per 15 minutes per IP address.

## Data Models

### Call Record
```javascript
{
  "id": "call-12345",
  "agent_id": "agent-1",
  "lead_id": "lead-6789",
  "outcome": "Qualified",
  "duration": 245,
  "quality_score": 4.2,
  "notes": "Interested in product demo",
  "created_at": "2025-01-15T10:00:00Z"
}
```

### Agent Scorecard
```javascript
{
  "agentId": "agent-1",
  "agentName": "John Smith",
  "totalCalls": 156,
  "connectionRate": "72.5",
  "conversionRate": "18.2",
  "avgQualityScore": "4.2",
  "performanceRank": 2
}
```

## Integration Examples

### JavaScript/React Integration
```javascript
// Fetch call performance data
const fetchPerformanceData = async () => {
  const response = await fetch('/api/call-analytics/performance?start_date=2025-01-01&end_date=2025-01-31');
  const data = await response.json();
  return data;
};

// WebSocket connection for real-time updates
const ws = new WebSocket('ws://localhost:3001/ws/call-analytics');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

### cURL Examples
```bash
# Get call performance
curl -X GET "http://localhost:3001/api/call-analytics/performance?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate automated report
curl -X POST "http://localhost:3001/api/call-analytics/automated-report" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reportType": "daily_performance",
    "schedule": {"frequency": "daily", "time": "08:00"},
    "recipients": ["manager@company.com"]
  }'
```

## Performance Considerations

- API responses are cached for 5 minutes for improved performance
- Real-time data updates every 30 seconds
- Large datasets are paginated automatically
- Historical data older than 1 year may have longer response times

## Support

For API support and questions, contact the development team or refer to the main project documentation.