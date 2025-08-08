# ColdCaller Dashboard - Enhanced API Documentation

## 🚀 OpenAPI 3.0 Specification

### API Overview
- **Base URL**: `https://api.coldcaller.com/v1` (Production) / `http://localhost:3001/api` (Development)
- **Authentication**: JWT Bearer Token
- **Content Type**: `application/json`
- **API Version**: 1.0.0

### OpenAPI Specification
```yaml
openapi: 3.0.3
info:
  title: ColdCaller Dashboard API
  description: Complete REST API for cold calling dashboard with VOIP integration
  version: 1.0.0
  contact:
    name: ColdCaller Support
    email: support@coldcaller.com
    url: https://coldcaller.com/support
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.coldcaller.com/v1
    description: Production server
  - url: https://staging.coldcaller.com/v1
    description: Staging server
  - url: http://localhost:3001/api
    description: Development server

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    
  schemas:
    Lead:
      type: object
      required: [name, phone, email]
      properties:
        id:
          type: integer
          example: 1
        name:
          type: string
          minLength: 1
          maxLength: 100
          example: "John Smith"
        company:
          type: string
          maxLength: 100
          example: "Tech Solutions Inc."
        phone:
          type: string
          pattern: '^\+?[\d\s\-\(\)\.]+$'
          example: "(555) 123-4567"
        email:
          type: string
          format: email
          example: "john@techsolutions.com"
        status:
          type: string
          enum: [New, Contacted, Follow-up, Qualified, Converted, Lost]
          example: "New"
        notes:
          type: string
          maxLength: 2000
          example: "Interested in cloud services"
        assignedTo:
          type: integer
          example: 5
        createdAt:
          type: string
          format: date-time
          example: "2024-01-20T10:00:00Z"
        updatedAt:
          type: string
          format: date-time
          example: "2024-01-20T10:00:00Z"
    
    CallLog:
      type: object
      required: [leadId, phone, outcome]
      properties:
        id:
          type: integer
          example: 1
        leadId:
          type: integer
          example: 1
        userId:
          type: integer
          example: 5
        phone:
          type: string
          example: "(555) 123-4567"
        duration:
          type: integer
          description: "Call duration in seconds"
          example: 180
        outcome:
          type: string
          enum: [Interested, Not Interested, Voicemail, No Answer, Busy, Callback Requested]
          example: "Interested"
        notes:
          type: string
          maxLength: 1000
          example: "Customer interested in enterprise package"
        recordingUrl:
          type: string
          format: uri
          example: "https://recordings.coldcaller.com/call-123.wav"
        createdAt:
          type: string
          format: date-time
          example: "2024-01-20T10:30:00Z"

security:
  - BearerAuth: []

paths:
  /auth/login:
    post:
      tags: [Authentication]
      summary: User login
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
            examples:
              agent_login:
                summary: Sales agent login
                value:
                  email: "agent@company.com"
                  password: "SecurePass123!"
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  token:
                    type: string
                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  user:
                    type: object
                    properties:
                      id:
                        type: integer
                      email:
                        type: string
                      role:
                        type: string
        '401':
          description: Invalid credentials

  /leads:
    get:
      tags: [Leads]
      summary: Get all leads
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [New, Contacted, Follow-up, Qualified, Converted, Lost]
          example: "New"
        - name: search
          in: query
          schema:
            type: string
          example: "Tech Solutions"
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
          example: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
          example: 10
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Lead'
                  pagination:
                    type: object
                    properties:
                      page:
                        type: integer
                      limit:
                        type: integer
                      total:
                        type: integer
                      totalPages:
                        type: integer
    
    post:
      tags: [Leads]
      summary: Create new lead
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Lead'
            examples:
              new_lead:
                summary: Create new lead
                value:
                  name: "Jane Doe"
                  company: "Digital Corp"
                  phone: "(555) 987-6543"
                  email: "jane@digitalcorp.com"
                  status: "New"
                  notes: "Potential high-value client"
      responses:
        '201':
          description: Lead created successfully
        '422':
          description: Validation error

  /calls:
    get:
      tags: [Call Logs]
      summary: Get call logs
      parameters:
        - name: outcome
          in: query
          schema:
            type: string
            enum: [Interested, Not Interested, Voicemail, No Answer, Busy, Callback Requested]
        - name: leadId
          in: query
          schema:
            type: integer
        - name: startDate
          in: query
          schema:
            type: string
            format: date
          example: "2024-01-01"
        - name: endDate
          in: query
          schema:
            type: string
            format: date
          example: "2024-01-31"
      responses:
        '200':
          description: Call logs retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/CallLog'
    
    post:
      tags: [Call Logs]
      summary: Log a call
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CallLog'
            examples:
              successful_call:
                summary: Successful call log
                value:
                  leadId: 1
                  phone: "(555) 123-4567"
                  duration: 300
                  outcome: "Interested"
                  notes: "Customer requested demo next week"
      responses:
        '201':
          description: Call logged successfully
```

---

## 📊 Interactive Examples

### Authentication Examples

#### Login Request
```bash
curl -X POST https://api.coldcaller.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@company.com",
    "password": "SecurePass123!"
  }'
```

#### Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZ2VudCIsImlhdCI6MTY0MjY4MDAwMH0.signature",
  "user": {
    "id": 1,
    "email": "agent@company.com",
    "name": "John Agent",
    "role": "agent"
  },
  "expiresIn": "24h"
}
```

### Lead Management Examples

#### Get Leads with Filtering
```bash
# Get all new leads assigned to current user
curl -X GET "https://api.coldcaller.com/v1/leads?status=New&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Search leads by company name
curl -X GET "https://api.coldcaller.com/v1/leads?search=Tech%20Solutions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create New Lead
```bash
curl -X POST https://api.coldcaller.com/v1/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Sarah Johnson",
    "company": "Innovation Labs",
    "phone": "(555) 234-5678",
    "email": "sarah@innovationlabs.com",
    "status": "New",
    "notes": "Referred by existing client"
  }'
```

#### Update Lead Status
```bash
curl -X PUT https://api.coldcaller.com/v1/leads/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "Qualified",
    "notes": "Passed initial qualification criteria"
  }'
```

### Call Logging Examples

#### Log Successful Call
```bash
curl -X POST https://api.coldcaller.com/v1/calls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "leadId": 123,
    "phone": "(555) 123-4567",
    "duration": 420,
    "outcome": "Interested",
    "notes": "Customer wants to schedule demo for next Tuesday",
    "scheduledFollowUp": "2024-01-25T14:00:00Z"
  }'
```

#### Get Call Statistics
```bash
curl -X GET "https://api.coldcaller.com/v1/analytics/calls?period=week" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔒 Authentication & Security

### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": 1,
    "email": "agent@company.com",
    "role": "agent",
    "permissions": ["read:leads", "write:calls", "read:analytics"],
    "iat": 1642680000,
    "exp": 1642766400
  }
}
```

### Permission Matrix
| Role | Leads | Calls | Analytics | Users | System |
|------|-------|-------|-----------|--------|--------|
| Super Admin | CRUD | CRUD | All | CRUD | CRUD |
| Admin | CRUD | CRUD | All | CRU | CRU |
| Manager | CRU | CRUD | Team | R | R |
| Agent | Own Only | Own Only | Own Only | - | - |

### Security Headers
All API responses include security headers:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## 📈 Analytics & Reporting API

### Performance Metrics Endpoint
```bash
GET /analytics/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "calls": {
      "total": 150,
      "today": 12,
      "thisWeek": 45,
      "averageDuration": 285,
      "conversionRate": 0.187
    },
    "leads": {
      "total": 89,
      "qualified": 23,
      "converted": 8,
      "qualificationRate": 0.258
    },
    "outcomes": {
      "interested": 28,
      "notInterested": 45,
      "voicemail": 52,
      "noAnswer": 20,
      "callback": 5
    }
  },
  "period": "last_30_days"
}
```

### Custom Report Generation
```bash
curl -X POST https://api.coldcaller.com/v1/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reportType": "agent_performance",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "filters": {
      "agents": [1, 2, 3],
      "outcomes": ["Interested", "Qualified"]
    },
    "format": "pdf"
  }'
```

---

## 🎵 Audio Management API

### Audio Upload
```bash
curl -X POST https://api.coldcaller.com/v1/audio \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@greeting.mp3" \
  -F "name=Professional Greeting" \
  -F "category=greetings" \
  -F "description=Standard professional greeting for cold calls"
```

### Audio Streaming
```bash
# Stream audio file
curl -X GET https://api.coldcaller.com/v1/audio/123/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Range: bytes=0-1024"
```

---

## 🔄 Real-time WebSocket API

### Connection Setup
```javascript
const socket = io('wss://api.coldcaller.com', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Listen for real-time updates
socket.on('lead_updated', (data) => {
  console.log('Lead updated:', data);
});

socket.on('call_started', (data) => {
  console.log('Call started:', data);
});

socket.on('analytics_update', (data) => {
  console.log('Analytics update:', data);
});
```

### Real-time Events
| Event | Description | Data Structure |
|-------|-------------|----------------|
| `lead_updated` | Lead information changed | `{leadId, changes, updatedBy}` |
| `call_started` | New call initiated | `{callId, leadId, agentId, phone}` |
| `call_ended` | Call completed | `{callId, duration, outcome}` |
| `analytics_update` | Performance metrics updated | `{metric, value, period}` |

---

## 🚨 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      }
    ],
    "timestamp": "2024-01-20T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

### Error Codes Reference
| HTTP Status | Error Code | Description | Action |
|-------------|------------|-------------|--------|
| 400 | `INVALID_REQUEST` | Malformed request | Check request syntax |
| 401 | `UNAUTHORIZED` | Authentication required | Provide valid token |
| 403 | `FORBIDDEN` | Insufficient permissions | Check user role |
| 404 | `NOT_FOUND` | Resource not found | Verify resource ID |
| 409 | `CONFLICT` | Resource conflict | Check for duplicates |
| 422 | `VALIDATION_ERROR` | Invalid data | Fix validation errors |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff |
| 500 | `INTERNAL_ERROR` | Server error | Contact support |

---

## 📊 Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642681200
X-RateLimit-Window: 900
```

### Rate Limit Policies
| Endpoint Category | Limit | Window | Burst |
|------------------|-------|--------|--------|
| Authentication | 5 requests | 5 minutes | No |
| Lead Management | 100 requests | 15 minutes | 10 |
| Call Logging | 200 requests | 15 minutes | 20 |
| Analytics | 50 requests | 15 minutes | 5 |
| Audio Upload | 10 requests | 60 minutes | No |

---

## 🔌 SDK & Integration Examples

### JavaScript SDK
```javascript
import ColdCallerAPI from '@coldcaller/sdk';

const api = new ColdCallerAPI({
  baseURL: 'https://api.coldcaller.com/v1',
  token: 'YOUR_JWT_TOKEN'
});

// Get leads
const leads = await api.leads.getAll({
  status: 'New',
  limit: 10
});

// Create call log
const callLog = await api.calls.create({
  leadId: 123,
  phone: '(555) 123-4567',
  duration: 300,
  outcome: 'Interested',
  notes: 'Follow up next week'
});
```

### Python SDK
```python
from coldcaller_sdk import ColdCallerAPI

api = ColdCallerAPI(
    base_url='https://api.coldcaller.com/v1',
    token='YOUR_JWT_TOKEN'
)

# Get leads with filtering
leads = api.leads.get_all(status='New', limit=10)

# Create new lead
new_lead = api.leads.create({
    'name': 'John Doe',
    'company': 'Example Corp',
    'phone': '(555) 123-4567',
    'email': 'john@example.com'
})
```

### Webhook Integration
```javascript
// Express.js webhook handler
app.post('/webhooks/coldcaller', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'call.completed':
      // Process completed call
      handleCallCompleted(data);
      break;
    
    case 'lead.qualified':
      // Process qualified lead
      handleLeadQualified(data);
      break;
  }
  
  res.status(200).json({ received: true });
});
```

---

## 🧪 Testing & Development

### Postman Collection
Download our complete Postman collection:
```bash
curl -o coldcaller-api.postman_collection.json \
  https://api.coldcaller.com/v1/postman-collection
```

### API Testing Examples
```javascript
// Jest test example
describe('Leads API', () => {
  test('should create new lead', async () => {
    const response = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Lead',
        company: 'Test Company',
        phone: '(555) 123-4567',
        email: 'test@example.com'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

### Development Environment Setup
```bash
# Clone the repository
git clone https://github.com/coldcaller/api.git
cd api

# Install dependencies
npm install

# Setup environment
cp .env.example .env.development

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# Run API tests
npm test
```

---

## 📚 Additional Resources

### Interactive API Explorer
Visit our interactive API documentation:
- **Production**: https://api.coldcaller.com/docs
- **Staging**: https://staging.coldcaller.com/docs

### Code Examples Repository
Find complete integration examples:
- **GitHub**: https://github.com/coldcaller/examples
- **Node.js Examples**: https://github.com/coldcaller/examples/tree/main/nodejs
- **Python Examples**: https://github.com/coldcaller/examples/tree/main/python

### Support Channels
- **Developer Forum**: https://developers.coldcaller.com/forum
- **Discord Community**: https://discord.gg/coldcaller-dev
- **Stack Overflow**: Tag questions with `coldcaller-api`
- **Email Support**: api-support@coldcaller.com

### Changelog & Updates
- **API Changelog**: https://api.coldcaller.com/changelog
- **Breaking Changes**: https://api.coldcaller.com/breaking-changes
- **Migration Guides**: https://docs.coldcaller.com/migrations

---

**Last Updated**: January 2024  
**API Version**: 1.0.0  
**OpenAPI Spec**: https://api.coldcaller.com/openapi.json