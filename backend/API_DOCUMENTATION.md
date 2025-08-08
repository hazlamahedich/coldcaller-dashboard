# Cold Caller Dashboard API Documentation

Complete REST API documentation for the Cold Calling Dashboard backend.

## 🚀 Quick Start

1. **Install dependencies**: `npm install`
2. **Start server**: `npm run dev`
3. **Test API**: `GET http://localhost:3001/api/health`

## 📊 Base URL

```
http://localhost:3001/api
```

## 🔒 Response Format

All API responses follow this consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status": 400,
    "details": [/* validation errors */],
    "timestamp": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## 👥 Leads API

### GET /leads
Get all leads with optional filtering and pagination.

**Query Parameters:**
- `status` (optional): Filter by lead status (New, Follow-up, Qualified, Converted, Lost)
- `search` (optional): Search by name, company, or email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example Request:**
```bash
GET /api/leads?status=New&page=1&limit=5
```

**Example Response:**
```json
{
  "success": true,
  "message": "Leads retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "John Smith",
      "company": "Tech Solutions Inc.",
      "phone": "(555) 123-4567",
      "email": "john@techsolutions.com",
      "status": "New",
      "lastContact": "Never",
      "notes": "Interested in cloud services",
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 15,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /leads/:id
Get a specific lead by ID.

**Example Request:**
```bash
GET /api/leads/1
```

### POST /leads
Create a new lead.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "company": "Digital Corp",
  "phone": "(555) 987-6543",
  "email": "jane@digitalcorp.com",
  "status": "New",
  "notes": "Potential high-value client"
}
```

### PUT /leads/:id
Update an existing lead.

**Request Body:**
```json
{
  "status": "Follow-up",
  "notes": "Scheduled demo for next week",
  "lastContact": "2024-01-20"
}
```

### DELETE /leads/:id
Delete a lead.

### GET /leads/stats
Get lead statistics.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "byStatus": {
      "new": 10,
      "followUp": 8,
      "qualified": 4,
      "converted": 2,
      "lost": 1
    },
    "recentlyUpdated": 5
  }
}
```

---

## 📝 Scripts API

### GET /scripts
Get all call scripts with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by script category

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "introduction",
      "title": "Introduction",
      "text": "Hi [NAME], this is [YOUR NAME] from [COMPANY]...",
      "color": "blue",
      "category": "opening",
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

### GET /scripts/:type
Get scripts by type/category or specific script by ID.

**Example Request:**
```bash
GET /api/scripts/introduction
GET /api/scripts/opening  # Get all scripts in 'opening' category
```

### POST /scripts
Create a new script.

**Request Body:**
```json
{
  "id": "new-script",
  "title": "New Script",
  "text": "Script content here...",
  "color": "green",
  "category": "closing"
}
```

### PUT /scripts/:id
Update an existing script.

### DELETE /scripts/:id
Delete a script.

### GET /scripts/categories
Get all script categories with statistics.

---

## 🎵 Audio API

### GET /audio
Get all audio clips with pagination.

**Query Parameters:**
- `category` (optional): Filter by category (greetings, objections, closing, general)
- `page` (optional): Page number
- `limit` (optional): Items per page

### GET /audio/:category
Get audio clips by category.

**Example Request:**
```bash
GET /api/audio/greetings
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Professional Intro",
      "category": "greetings",
      "duration": "0:15",
      "url": "/audio/professional-intro.mp3",
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

### GET /audio/search
Search audio clips by name.

**Query Parameters:**
- `query` (required): Search term

**Example Request:**
```bash
GET /api/audio/search?query=professional
```

### POST /audio
Create a new audio clip.

**Request Body:**
```json
{
  "name": "New Audio Clip",
  "category": "greetings",
  "duration": "0:30",
  "url": "/audio/new-clip.mp3"
}
```

### PUT /audio/:id
Update an audio clip.

### DELETE /audio/:id
Delete an audio clip.

### GET /audio/categories
Get audio categories with statistics.

---

## 📞 Calls API

### GET /calls
Get all call logs with filtering and pagination.

**Query Parameters:**
- `outcome` (optional): Filter by call outcome
- `leadId` (optional): Filter by specific lead
- `date` (optional): Filter by date (YYYY-MM-DD)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "leadId": 1,
      "leadName": "John Smith",
      "phone": "(555) 123-4567",
      "date": "2024-01-20",
      "time": "10:30 AM",
      "duration": "5:23",
      "outcome": "Voicemail",
      "notes": "Left message about our services",
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

### GET /calls/:id
Get a specific call log by ID.

### POST /calls
Create a new call log.

**Request Body:**
```json
{
  "leadId": 1,
  "leadName": "John Smith",
  "phone": "(555) 123-4567",
  "duration": "8:45",
  "outcome": "Interested",
  "notes": "Scheduled follow-up meeting"
}
```

### PUT /calls/:id
Update a call log.

### DELETE /calls/:id
Delete a call log.

### GET /calls/stats
Get call statistics.

**Query Parameters:**
- `period` (optional): Time period (all, today, week, month)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 45,
    "byOutcome": {
      "connected": 25,
      "voicemail": 15,
      "noAnswer": 5,
      "busy": 0,
      "interested": 8
    },
    "averageCallDuration": "6:32",
    "callsPerDay": 7.5,
    "conversionRate": 17.8
  }
}
```

### GET /calls/lead/:leadId
Get all call logs for a specific lead.

---

## 🏥 System API

### GET /health
Health check endpoint.

**Example Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## 🔧 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 📊 Common Validation Rules

### Lead Fields
- `name`: 1-100 characters, required
- `company`: 1-100 characters, required  
- `phone`: Valid phone number format
- `email`: Valid email format
- `status`: One of: New, Follow-up, Qualified, Converted, Lost
- `notes`: Max 1000 characters

### Script Fields
- `id`: 1-50 characters, letters/numbers/underscore/hyphen only
- `title`: 1-100 characters
- `text`: 1-2000 characters
- `color`: One of: blue, green, red, yellow, purple, gray, orange
- `category`: 1-50 characters

### Audio Fields
- `name`: 1-100 characters
- `category`: One of: greetings, objections, closing, general
- `duration`: MM:SS format (e.g., "1:30")
- `url`: Valid URL format

### Call Log Fields
- `leadId`: Positive integer (must exist)
- `phone`: Valid phone number format
- `duration`: MM:SS format
- `outcome`: One of: Interested, Not Interested, Voicemail, No Answer, Busy, Callback Requested
- `notes`: Max 1000 characters

---

## 🚀 Rate Limiting

- **Limit**: 100 requests per 15-minute window per IP
- **Headers**: Rate limit info included in response headers
- **Exceeded**: Returns 429 status with retry information

---

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Rate Limiting**: Request throttling
- **Input Sanitization**: XSS protection
- **Error Sanitization**: No stack traces in production