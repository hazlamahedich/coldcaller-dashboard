# Cold Caller Dashboard - Backend API

RESTful API server for the Cold Calling Dashboard application built with Express.js.

## 🚀 Features

- **RESTful API Design** - Clean, consistent API endpoints
- **Input Validation** - Comprehensive request validation using express-validator
- **Error Handling** - Centralized error handling with detailed responses
- **Request Logging** - Detailed request/response logging
- **Security** - Helmet, CORS, and rate limiting protection
- **Pagination** - Built-in pagination for list endpoints
- **Search & Filtering** - Advanced search and filtering capabilities

## 📊 API Endpoints

### Leads Management
- `GET /api/leads` - Get all leads (with filtering & pagination)
- `GET /api/leads/:id` - Get specific lead
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/stats` - Get lead statistics

### Call Scripts
- `GET /api/scripts` - Get all scripts
- `GET /api/scripts/:type` - Get scripts by type/category
- `POST /api/scripts` - Create new script
- `PUT /api/scripts/:id` - Update script
- `DELETE /api/scripts/:id` - Delete script
- `GET /api/scripts/categories` - Get script categories

### Audio Clips
- `GET /api/audio` - Get all audio clips (with pagination)
- `GET /api/audio/:category` - Get clips by category
- `POST /api/audio` - Create new audio clip
- `PUT /api/audio/:id` - Update audio clip
- `DELETE /api/audio/:id` - Delete audio clip
- `GET /api/audio/categories` - Get audio categories
- `GET /api/audio/search` - Search audio clips

### Call Logs & Statistics
- `GET /api/calls` - Get call history (with filtering)
- `GET /api/calls/:id` - Get specific call log
- `POST /api/calls` - Log new call
- `PUT /api/calls/:id` - Update call log
- `DELETE /api/calls/:id` - Delete call log
- `GET /api/calls/stats` - Get call statistics
- `GET /api/calls/lead/:leadId` - Get calls for specific lead

### System
- `GET /api/health` - Health check endpoint

## 🛠 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Success message",
  "data": [/* array of items */],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "status": 400,
    "details": [/* validation errors if applicable */],
    "timestamp": "2024-01-20T10:30:00.000Z"
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `RATE_LIMIT_MAX` | Rate limit requests per window | 100 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 minutes) |

## 🏗 Architecture

### Project Structure
```
backend/
├── src/
│   ├── controllers/     # Business logic
│   ├── routes/         # Route definitions
│   ├── middleware/     # Custom middleware
│   ├── data/          # In-memory data store
│   ├── utils/         # Utility functions
│   └── server.js      # Express app setup
├── tests/             # Test files
└── package.json       # Dependencies
```

### Middleware Stack
1. **Security** - Helmet for security headers
2. **CORS** - Cross-origin resource sharing
3. **Rate Limiting** - Request rate limiting
4. **Body Parsing** - JSON and URL-encoded parsing
5. **Request Logging** - Custom request logger
6. **Validation** - Input validation with express-validator
7. **Error Handling** - Centralized error handling

## 📊 Data Models

### Lead
```javascript
{
  id: number,
  name: string,
  company: string,
  phone: string,
  email: string,
  status: 'New' | 'Follow-up' | 'Qualified' | 'Converted' | 'Lost',
  notes: string,
  lastContact: string,
  createdAt: string,
  updatedAt: string
}
```

### Script
```javascript
{
  id: string,
  title: string,
  text: string,
  color: string,
  category: string,
  createdAt: string,
  updatedAt: string
}
```

### Audio Clip
```javascript
{
  id: number,
  name: string,
  category: 'greetings' | 'objections' | 'closing' | 'general',
  duration: string,
  url: string,
  createdAt: string
}
```

### Call Log
```javascript
{
  id: number,
  leadId: number,
  leadName: string,
  phone: string,
  date: string,
  time: string,
  duration: string,
  outcome: 'Interested' | 'Not Interested' | 'Voicemail' | 'No Answer' | 'Busy' | 'Callback Requested',
  notes: string,
  createdAt: string
}
```

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Configurable cross-origin requests
- **Rate Limiting** - Protection against abuse
- **Input Validation** - Sanitization and validation
- **Error Sanitization** - No sensitive data in error responses

## 🚀 Future Enhancements

- Database integration (PostgreSQL/MySQL)
- Authentication & authorization
- File upload for audio clips
- Real-time features with WebSockets
- API documentation with Swagger
- Containerization with Docker
- Automated testing suite