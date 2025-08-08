# Call Management Backend API Documentation

## Overview

Comprehensive backend call management system with SIP integration, real-time WebSocket updates, call recording capabilities, and advanced analytics for the Cold Caller dashboard.

## Features

- ✅ **Real-time Call Management** - Start, update, and end calls with live status updates
- ✅ **SIP Integration** - Full SIP server configuration and management
- ✅ **Call Recording** - Start/stop recording with automatic file management
- ✅ **WebSocket Support** - Real-time updates for call status, quality, and system metrics
- ✅ **Advanced Analytics** - Comprehensive call statistics and performance metrics
- ✅ **System Monitoring** - Performance tracking and health monitoring
- ✅ **Quality Metrics** - Call quality monitoring (latency, jitter, packet loss, MOS)

## API Endpoints

### 🔄 Real-time Call Management

#### Start Call
```
POST /api/calls/start
```
**Body:**
```json
{
  "leadId": 123,
  "phoneNumber": "+15551234567",
  "agentId": "agent_001",
  "campaignId": "campaign_001"
}
```

#### Update Call Status
```
PUT /api/calls/:id/update
```
**Body:**
```json
{
  "status": "connected",
  "quality": {
    "latency": 85,
    "jitter": 12,
    "packetLoss": 0.5,
    "mos": 4.2
  },
  "notes": "Customer interested in pricing"
}
```

#### End Call
```
POST /api/calls/:id/end
```
**Body:**
```json
{
  "outcome": "Interested",
  "disposition": "qualified",
  "notes": "Scheduled follow-up demo",
  "tags": ["demo-scheduled", "budget-approved"],
  "objections": ["pricing_concern"],
  "nextActions": ["send_proposal", "schedule_demo"]
}
```

### 📞 SIP Configuration

#### Configure SIP Server
```
POST /api/sip/configure
```
**Body:**
```json
{
  "provider": "Twilio",
  "server": "your-account.pstn.twilio.com",
  "port": 5060,
  "username": "your_sip_username",
  "password": "your_sip_password",
  "domain": "your-account.pstn.twilio.com",
  "transport": "UDP",
  "enableRecording": true,
  "recordingPath": "./recordings"
}
```

#### Get SIP Settings
```
GET /api/sip/settings
```

#### Test SIP Connection
```
POST /api/sip/test
```

#### Get SIP Status
```
GET /api/sip/status
```

#### Register SIP Account
```
POST /api/sip/register
```

#### Get Supported Providers
```
GET /api/sip/providers
```

### 🎤 Call Recording

#### Start Recording
```
POST /api/calls/:id/recording/start
```
**Body:**
```json
{
  "format": "mp3"
}
```

#### Stop Recording
```
POST /api/calls/:id/recording/stop
```

#### Get Recording
```
GET /api/calls/:id/recording?download=true
```

#### List All Recordings
```
GET /api/calls/recordings?page=1&limit=10&format=mp3&dateFrom=2024-01-01
```

#### Delete Recording
```
DELETE /api/calls/:id/recording
```

### 📊 Analytics & Reporting

#### Get Call Analytics
```
GET /api/calls/analytics?period=month&agentId=agent_001&campaignId=campaign_001
```

**Response:**
```json
{
  "summary": {
    "totalCalls": 150,
    "connectedCalls": 95,
    "recordedCalls": 85,
    "averageCallDuration": "00:08:45",
    "conversionRate": 12.5,
    "connectionRate": 63.3
  },
  "outcomes": {
    "interested": 18,
    "notInterested": 45,
    "voicemail": 32,
    "noAnswer": 28,
    "busy": 12,
    "callbackRequested": 8,
    "qualified": 7
  },
  "quality": {
    "averageLatency": 75.2,
    "averageJitter": 8.5,
    "averagePacketLoss": 0.3,
    "averageMOS": 4.1
  },
  "trends": {
    "callsPerDay": 12.5,
    "peakHours": [
      {"hour": 10, "calls": 25},
      {"hour": 14, "calls": 22},
      {"hour": 11, "calls": 18}
    ]
  },
  "agents": [...],
  "campaigns": [...]
}
```

#### Get Real-time Metrics
```
GET /api/calls/metrics/realtime
```

**Response:**
```json
{
  "system": {
    "status": "online",
    "sipRegistered": true,
    "connectionQuality": "excellent",
    "uptime": 86400
  },
  "calls": {
    "active": 3,
    "total": 1250,
    "todayTotal": 45,
    "connecting": 1,
    "connected": 2,
    "recording": 1
  },
  "performance": {
    "averageLatency": 65.8,
    "packetLoss": 0.2,
    "callQuality": "excellent",
    "systemLoad": 0.45
  },
  "activeCalls": [
    {
      "id": "call_123",
      "phoneNumber": "+15551234567",
      "status": "connected",
      "duration": 185,
      "quality": {
        "latency": 75,
        "jitter": 8,
        "packetLoss": 0.1,
        "mos": 4.3
      },
      "recording": true
    }
  ]
}
```

### 🔍 System Health & Monitoring

#### Basic Health Check
```
GET /api/health
```

#### Detailed System Status
```
GET /api/health/monitoring
```

#### WebSocket Statistics
```
GET /api/health/websocket
```

#### SIP System Status
```
GET /api/health/sip
```

## WebSocket Integration

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = function() {
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'calls'
  }));
  
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'metrics'
  }));
};
```

### Available Channels

#### `calls` Channel
Real-time call events:
- `callInitiated` - New call started
- `callConnected` - Call successfully connected
- `callEnded` - Call terminated
- `callQualityUpdate` - Quality metrics updated

#### `recordings` Channel
Recording events:
- `recordingStarted` - Recording began
- `recordingStopped` - Recording ended

#### `sip` Channel
SIP system events:
- `sipRegistered` - SIP account registered
- `sipRegistrationFailed` - Registration failed
- `sipUnregistered` - Account unregistered

#### `metrics` Channel
System metrics (every 10 seconds):
- `metricsUpdate` - Real-time system metrics

#### `performance` Channel
Performance alerts:
- `slowRequest` - Request took >1000ms
- `highMemoryUsage` - Memory usage >100MB

### Example WebSocket Messages

**Call Initiated:**
```json
{
  "type": "callInitiated",
  "channel": "calls",
  "data": {
    "id": "call_123",
    "phoneNumber": "+15551234567",
    "startTime": "2024-01-20T10:30:00.000Z",
    "status": "connecting"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Metrics Update:**
```json
{
  "type": "metricsUpdate",
  "channel": "metrics",
  "data": {
    "sipStatus": {
      "registered": true,
      "connectionQuality": "excellent"
    },
    "activeCalls": 2,
    "systemUptime": 86400,
    "memoryUsage": {
      "heapUsed": 45000000,
      "heapTotal": 67000000
    }
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "code": 400,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

- **API Calls**: 100 requests per 15 minutes per IP
- **WebSocket**: No explicit limits, but connection monitoring active
- **File Uploads**: 10MB maximum file size

## Performance Considerations

- **Call Quality**: Monitored in real-time with automatic alerts
- **Memory Usage**: System monitoring with 100MB threshold alerts
- **Response Time**: Requests >1000ms trigger performance alerts
- **Recording Storage**: Automatic cleanup and directory management

## Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Test SIP Configuration:**
   ```bash
   curl -X POST http://localhost:3001/api/sip/test
   ```

4. **WebSocket Test:**
   ```javascript
   const ws = new WebSocket('ws://localhost:3001/ws');
   ws.onmessage = (msg) => console.log(JSON.parse(msg.data));
   ```

## Production Deployment

### Environment Variables
```env
PORT=3001
FRONTEND_URL=https://your-domain.com
SIP_RECORDING_PATH=/var/recordings
MAX_RECORDING_SIZE=100MB
WEBSOCKET_HEARTBEAT=30000
```

### SIP Provider Configuration

**Twilio:**
```json
{
  "provider": "Twilio",
  "server": "your-account.pstn.twilio.com",
  "port": 5060,
  "transport": "UDP"
}
```

**RingCentral:**
```json
{
  "provider": "RingCentral",
  "server": "sip.ringcentral.com",
  "port": 5061,
  "transport": "TLS"
}
```

**Asterisk:**
```json
{
  "provider": "Asterisk",
  "server": "your-asterisk-server.com",
  "port": 5060,
  "transport": "UDP"
}
```

## Security Features

- ✅ **Input Validation** - All inputs validated with express-validator
- ✅ **Rate Limiting** - API rate limiting to prevent abuse
- ✅ **CORS Protection** - Cross-origin request security
- ✅ **Helmet Integration** - Security headers and CSP
- ✅ **SIP Authentication** - Secure SIP credential management
- ✅ **Recording Privacy** - Secure file storage and access control

## Monitoring & Observability

- **Real-time Metrics**: System performance, call quality, memory usage
- **Health Endpoints**: Comprehensive system health monitoring
- **WebSocket Events**: Live system event broadcasting
- **Performance Alerts**: Automatic alerts for slow requests and high memory usage
- **SIP Monitoring**: Connection status and quality tracking

This comprehensive call management system provides enterprise-grade calling capabilities with real-time monitoring, recording, and analytics for professional cold calling operations.