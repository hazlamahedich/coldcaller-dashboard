# Analytics API Documentation

## Overview

The Analytics API provides comprehensive reporting, metrics, and data insights for the Cold Calling Dashboard system. It includes lead performance analytics, conversion funnel analysis, agent productivity metrics, forecasting capabilities, and predictive lead scoring.

## Base URL

```
http://localhost:3001/api/analytics
```

## Authentication

All analytics endpoints require proper authentication (implementation depends on your auth system).

## Rate Limiting

Analytics endpoints are subject to rate limiting:
- 100 requests per 15-minute window per IP address
- Real-time endpoints have higher limits for frequent polling

## Common Query Parameters

Many endpoints support these common filters:

- `start_date` (string): Start date in YYYY-MM-DD or ISO 8601 format
- `end_date` (string): End date in YYYY-MM-DD or ISO 8601 format
- `lead_source` (string): Filter by lead source
- `agent_id` (string): Filter by specific agent ID
- `status` (string): Filter by lead status

## Endpoints

### Lead Analytics

#### GET /api/analytics/leads

Get comprehensive lead performance metrics and trends.

**Query Parameters:**
- `start_date` (optional): Start date for analysis period
- `end_date` (optional): End date for analysis period
- `lead_source` (optional): Filter by lead source (Website, Cold Call, Referral, etc.)
- `status` (optional): Filter by lead status (New, Follow-up, Qualified, etc.)
- `priority` (optional): Filter by priority (High, Medium, Low)
- `industry` (optional): Filter by industry
- `assigned_to` (optional): Filter by assigned agent

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 150,
      "newLeads": 45,
      "qualifiedLeads": 32,
      "convertedLeads": 18,
      "qualificationRate": 21.33,
      "conversionRate": 12.0,
      "avgConversionProb": 0.65,
      "avgCallAttempts": 2.3
    },
    "distributions": {
      "leadSources": {
        "Website": 65,
        "Cold Call": 35,
        "Referral": 30,
        "LinkedIn": 20
      },
      "priorities": {
        "High": 45,
        "Medium": 75,
        "Low": 30
      },
      "industries": {
        "Technology": 60,
        "Healthcare": 40,
        "Financial Services": 30,
        "Manufacturing": 20
      },
      "geography": {
        "CA": { "total": 45, "cities": { "San Francisco": 25, "Los Angeles": 20 } },
        "NY": { "total": 35, "cities": { "New York": 30, "Albany": 5 } }
      }
    },
    "trends": {
      "message": "Trend analysis coming soon"
    }
  },
  "message": "Lead analytics retrieved successfully"
}
```

### Conversion Funnel

#### GET /api/analytics/conversion

Get detailed conversion funnel analysis with drop-off rates.

**Query Parameters:**
- `start_date`, `end_date`: Date range filters
- `lead_source`: Filter by lead source
- `agent_id`: Filter by agent ID

**Response:**
```json
{
  "success": true,
  "data": {
    "funnel": {
      "totalLeads": 150,
      "contacted": 120,
      "answered": 85,
      "interested": 60,
      "qualified": 32,
      "converted": 18
    },
    "dropOffAnalysis": {
      "contactRate": 80.0,
      "answerRate": 70.83,
      "interestRate": 70.59,
      "qualificationRate": 53.33,
      "conversionRate": 56.25
    },
    "callOutcomes": {
      "Interested": 35,
      "Not Interested": 25,
      "Voicemail": 30,
      "Qualified": 32,
      "Callback Requested": 15
    },
    "recommendations": [
      "Improve lead contact rate by updating phone numbers",
      "Optimize call timing and frequency"
    ]
  },
  "message": "Conversion funnel analytics retrieved successfully"
}
```

### Source Attribution

#### GET /api/analytics/sources

Get lead source attribution analysis with ROI calculations.

**Query Parameters:**
- `start_date`, `end_date`: Date range filters

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": {
      "Website": {
        "totalLeads": 65,
        "qualified": 18,
        "converted": 12,
        "qualificationRate": 27.69,
        "conversionRate": 18.46,
        "avgQualityScore": 4.2,
        "avgConversionProb": 0.68,
        "totalCallTime": 3600,
        "costPerLead": 25,
        "roi": 140.5
      },
      "Referral": {
        "totalLeads": 30,
        "qualified": 12,
        "converted": 8,
        "qualificationRate": 40.0,
        "conversionRate": 26.67,
        "avgQualityScore": 4.6,
        "avgConversionProb": 0.78,
        "totalCallTime": 1800,
        "costPerLead": 15,
        "roi": 188.9
      }
    },
    "ranking": [
      ["Referral", { "roi": 188.9 }],
      ["Website", { "roi": 140.5 }]
    ],
    "recommendations": [
      "Focus more investment on Referral (highest ROI)",
      "Consider reducing spend on low-performing sources"
    ]
  },
  "message": "Source attribution analytics retrieved successfully"
}
```

### Agent Performance

#### GET /api/analytics/agents

Get comprehensive agent performance and productivity metrics.

**Query Parameters:**
- `start_date`, `end_date`: Date range filters
- `agent_id`: Filter by specific agent ID
- `include_rankings`: Include agent rankings (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": {
      "agent_001": {
        "agentId": "agent_001",
        "agentName": "Sarah Williams",
        "calls": {
          "total": 85,
          "totalTime": 6300,
          "avgDuration": 74.12,
          "avgQualityScore": 4.3,
          "outcomes": {
            "Interested": 25,
            "Qualified": 15,
            "Voicemail": 30,
            "Not Interested": 15
          }
        },
        "leads": {
          "total": 60,
          "qualified": 18,
          "converted": 12,
          "qualificationRate": 30.0,
          "conversionRate": 20.0
        },
        "performance": {
          "callsPerDay": 8.5,
          "successRate": 47.06,
          "qualificationRate": 17.65,
          "productivity": 4.2
        }
      }
    },
    "rankings": {
      "byQualityScore": [
        { "agentId": "agent_001", "agentName": "Sarah Williams", "score": 4.3 }
      ],
      "byConversionRate": [
        { "agentId": "agent_001", "agentName": "Sarah Williams", "score": 20.0 }
      ],
      "byProductivity": [
        { "agentId": "agent_001", "agentName": "Sarah Williams", "score": 4.2 }
      ]
    },
    "teamSummary": {
      "totalAgents": 3,
      "totalCalls": 245,
      "avgQualityScore": 4.15,
      "teamConversionRate": 18.5
    },
    "recommendations": [
      "Provide additional training for agents with low quality scores",
      "Share best practices from top performers"
    ]
  },
  "message": "Agent performance analytics retrieved successfully"
}
```

### Forecasting

#### GET /api/analytics/forecasting

Get pipeline forecasting and predictions.

**Query Parameters:**
- `start_date`, `end_date`: Date range for historical analysis
- `forecast_period`: Forecast period in days (default: 30, max: 365)

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": {
      "message": "Historical analysis coming soon"
    },
    "pipeline": {
      "totalValue": 625000,
      "stages": {
        "New": 45,
        "Follow-up": 35,
        "Qualified": 32,
        "Converted": 18
      }
    },
    "predictions": {
      "leadGeneration": { "predicted": 87 },
      "conversionForecast": { "predicted": 93750 },
      "revenueForecast": { "predicted": 156250 },
      "capacityForecast": { "recommendedAgents": 3 }
    },
    "confidence": 75,
    "recommendations": [
      "Plan capacity for predicted lead volume",
      "Adjust sales targets based on forecasts"
    ]
  },
  "message": "Forecasting analytics retrieved successfully"
}
```

### Dashboard Data

#### GET /api/analytics/dashboard

Get comprehensive dashboard data combining all analytics.

**Query Parameters:**
- `start_date`, `end_date`: Date range filters

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": { /* Lead analytics data */ },
    "conversion": { /* Conversion funnel data */ },
    "sources": { /* Source attribution data */ },
    "agents": { /* Agent performance data */ },
    "forecasting": { /* Forecasting data */ },
    "generatedAt": "2024-01-20T15:30:00Z",
    "dateRange": "All time"
  },
  "message": "Dashboard data retrieved successfully"
}
```

### Real-time Metrics

#### GET /api/analytics/real-time

Get real-time metrics for today's performance.

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "leads": {
        "totalLeads": 12,
        "conversionRate": 15.5
      },
      "agents": {
        "totalCalls": 45,
        "avgQualityScore": 4.2
      }
    },
    "timestamp": "2024-01-20T15:30:00Z",
    "nextUpdate": "2024-01-20T15:35:00Z"
  },
  "message": "Real-time metrics retrieved successfully"
}
```

### Key Performance Indicators

#### GET /api/analytics/kpis

Get key performance indicators with trend information.

**Query Parameters:**
- `start_date`, `end_date`: Date range filters
- `compare_period`: Period to compare against (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "lead_generation": {
      "value": 150,
      "label": "Total Leads",
      "trend": "+12%",
      "status": "good"
    },
    "conversion_rate": {
      "value": "12.0%",
      "label": "Conversion Rate",
      "trend": "+5.2%",
      "status": "good"
    },
    "avg_call_quality": {
      "value": 4.15,
      "label": "Avg Call Quality",
      "trend": "+0.3",
      "status": "stable"
    },
    "pipeline_value": {
      "value": "$125,000",
      "label": "Pipeline Value",
      "trend": "+8%",
      "status": "good"
    }
  },
  "message": "KPIs retrieved successfully"
}
```

### Export Analytics

#### GET /api/analytics/exports/:type

Export analytics data in various formats.

**URL Parameters:**
- `type`: Export type (leads|agents|sources|dashboard|calls)

**Query Parameters:**
- `start_date`, `end_date`: Date range filters
- `format`: Export format (json|csv) - default: json

**Response:**
- JSON format: Regular JSON response
- CSV format: CSV file download with appropriate headers

### Custom Report Generation

#### POST /api/analytics/reports/generate

Generate custom reports with specific sections and formats.

**Request Body:**
```json
{
  "reportType": "summary",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "lead_source": "Website",
    "status": "Qualified"
  },
  "includeCharts": true,
  "format": "json",
  "sections": ["leads", "conversion", "sources", "agents"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "custom_1642684800000",
    "reportType": "summary",
    "generatedAt": "2024-01-20T15:30:00Z",
    "dateRange": "2024-01-01 to 2024-01-31",
    "filters": {
      "lead_source": "Website",
      "status": "Qualified"
    },
    "sections": {
      "leads": { /* Lead analytics data */ },
      "conversion": { /* Conversion data */ },
      "sources": { /* Source data */ },
      "agents": { /* Agent data */ }
    },
    "summary": {
      "totalLeads": 45,
      "conversionRate": 15.5,
      "topPerformingSource": "Website",
      "recommendedActions": [
        "Focus on lead qualification improvement"
      ]
    }
  },
  "message": "Custom report generated successfully"
}
```

## Predictive Analytics (Advanced Features)

### Lead Scoring API

While not yet exposed as HTTP endpoints, the analytics service provides advanced predictive capabilities:

#### Lead Scoring
```javascript
const analyticsService = require('./services/analyticsService');

// Generate lead scoring
const scoring = await analyticsService.generateLeadScoring('lead_001');
```

#### Conversion Prediction
```javascript
// Predict conversion probability
const prediction = await analyticsService.predictConversionProbability('lead_001');
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

## Data Freshness

- **Real-time metrics**: Updated every 30 seconds
- **Aggregated data**: Refreshed every 5 minutes
- **Dashboard data**: Generated on-demand with caching
- **Reports**: Generated fresh for each request

## Performance Considerations

- Use date ranges to limit data scope for better performance
- Dashboard endpoint aggregates multiple analytics - consider individual endpoints for specific needs
- Real-time endpoint is optimized for frequent polling
- Export endpoints may take longer for large datasets

## Rate Limits

- Standard endpoints: 100 requests per 15 minutes
- Real-time endpoints: 300 requests per 15 minutes
- Export endpoints: 10 requests per hour
- Report generation: 20 requests per hour

## WebSocket Support

Real-time analytics support WebSocket connections for live updates:

```javascript
// Connect to WebSocket for real-time updates
const socket = io('/analytics');

socket.on('realtime_update', (data) => {
  console.log('Real-time metrics updated:', data);
});
```

## Data Privacy and Security

- All endpoints require authentication
- Data is filtered based on user permissions
- Sensitive information is excluded from exports
- Rate limiting prevents abuse
- All requests are logged for audit purposes

## Support and Troubleshooting

For issues or questions:

1. Check the error response for specific details
2. Verify authentication and permissions
3. Ensure date formats are correct (YYYY-MM-DD or ISO 8601)
4. Check rate limits if receiving 429 errors
5. Contact system administrators for persistent issues

## Changelog

### v1.0.0
- Initial release with comprehensive analytics endpoints
- Lead performance metrics
- Conversion funnel analysis
- Agent performance tracking
- Source attribution and ROI
- Dashboard aggregation
- Real-time metrics
- Custom report generation
- Predictive lead scoring (service layer)
- Export functionality
- KPI tracking