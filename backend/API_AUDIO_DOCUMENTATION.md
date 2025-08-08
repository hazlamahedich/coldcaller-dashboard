# Audio API Documentation - Enhanced Features

## Overview

The Enhanced Audio API provides comprehensive audio file management capabilities including upload, processing, streaming, and analytics. This API extends the original audio clips functionality with full file management features.

## Base URL
```
http://localhost:3001/api/audio
```

## Authentication
Currently, all endpoints are public. Authentication can be added based on requirements.

## Rate Limiting
- Upload endpoints: 20 requests per 15 minutes per IP
- General endpoints: 100 requests per 15 minutes per IP

---

## File Upload & Management

### Upload Audio Files
**POST** `/upload`

Upload one or more audio files with automatic metadata extraction.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `audioFiles`: File(s) - Audio files to upload (max 10 files, 50MB each)
  - `category`: String (optional) - One of: greetings, objections, closing, general, training, music, sfx
  - `description`: String (optional) - Description (max 500 chars)
  - `tags`: String (optional) - JSON array of tags (max 20 tags, 50 chars each)

#### Response
```json
{
  "success": true,
  "message": "Successfully uploaded 2 files",
  "data": {
    "uploadedFiles": [
      {
        "id": "uuid",
        "originalName": "greeting.mp3",
        "filename": "uuid.mp3",
        "url": "/api/audio/file/uuid.mp3",
        "size": 1048576,
        "duration": 30.5,
        "format": "mp3",
        "category": "greetings",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalUploaded": 2,
    "totalErrors": 0
  },
  "uploadMetrics": {
    "duration": 1250,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Supported Audio Formats
- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- M4A (.m4a)
- AAC (.aac)
- FLAC (.flac)
- WebM (.webm)
- WMA (.wma)

---

### Get All Audio Files
**GET** `/files`

Retrieve all audio files with advanced filtering and pagination.

#### Query Parameters
- `category`: String - Filter by category
- `tags`: String - Comma-separated list of tags
- `search`: String - Search in file names and descriptions
- `processed`: Boolean - Filter by processing status
- `page`: Number (default: 1) - Page number
- `limit`: Number (default: 10) - Items per page
- `sortBy`: String (default: createdAt) - Sort field
- `sortOrder`: String (default: desc) - Sort order (asc/desc)

#### Response
```json
{
  "success": true,
  "message": "Audio files retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "originalName": "greeting.mp3",
      "filename": "uuid.mp3",
      "url": "/api/audio/file/uuid",
      "size": 1048576,
      "category": "greetings",
      "tags": ["formal", "intro"],
      "description": "Professional greeting message",
      "duration": 30.5,
      "format": "mp3",
      "isProcessed": true,
      "analytics": {
        "plays": 15,
        "downloads": 3,
        "lastPlayed": "2024-01-01T00:00:00.000Z",
        "lastDownloaded": null
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 45,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Stream Audio File
**GET** `/file/:id`

Stream specific audio file with HTTP range support for seeking.

#### Parameters
- `id`: String - Audio file UUID

#### Headers
- `Range`: String (optional) - Byte range for partial content (e.g., "bytes=0-1023")

#### Response
- **Status**: 200 (full content) or 206 (partial content)
- **Headers**:
  - `Content-Type`: audio/mpeg (or appropriate MIME type)
  - `Accept-Ranges`: bytes
  - `Content-Length`: File size or range size
  - `Content-Range`: Byte range (for 206 responses)
  - `Content-Disposition`: inline; filename="original-name.mp3"
- **Body**: Audio file stream

---

### Get Audio Metadata
**GET** `/metadata/:id`

Get detailed metadata and analytics for a specific audio file.

#### Parameters
- `id`: String - Audio file UUID

#### Response
```json
{
  "success": true,
  "message": "Audio file metadata retrieved successfully",
  "data": {
    "id": "uuid",
    "originalName": "greeting.mp3",
    "filename": "uuid.mp3",
    "url": "/api/audio/file/uuid",
    "size": 1048576,
    "category": "greetings",
    "tags": ["formal", "intro"],
    "description": "Professional greeting message",
    "metadata": {
      "duration": 30.5,
      "format": "mp3",
      "bitrate": 128,
      "sampleRate": 44100,
      "channels": 2,
      "codec": "mp3"
    },
    "waveform": [0, 5, 12, 8, 15, ...], // Array of amplitude values
    "analytics": {
      "plays": 15,
      "downloads": 3,
      "lastPlayed": "2024-01-01T00:00:00.000Z",
      "lastDownloaded": null
    },
    "isProcessed": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Update Audio Metadata
**PUT** `/file/:id`

Update audio file metadata (category, description, tags).

#### Parameters
- `id`: String - Audio file UUID

#### Request Body
```json
{
  "category": "greetings",
  "description": "Updated description",
  "tags": ["updated", "formal"]
}
```

#### Response
```json
{
  "success": true,
  "message": "Audio file updated successfully",
  "data": {
    // Updated audio file object
  }
}
```

---

### Delete Audio File
**DELETE** `/file/:id`

Delete audio file and its metadata from both database and disk.

#### Parameters
- `id`: String - Audio file UUID

#### Response
```json
{
  "success": true,
  "message": "Audio file deleted successfully",
  "data": {
    // Deleted audio file object
  }
}
```

---

## Audio Processing

### Process Audio File
**POST** `/process/:id`

Process audio file with various operations (convert, compress, normalize, trim, waveform).

#### Parameters
- `id`: String - Audio file UUID

#### Request Body
```json
{
  "operation": "compress",
  "options": {
    "quality": "medium"
  }
}
```

#### Operations

##### Convert to MP3
```json
{
  "operation": "convert_mp3",
  "options": {
    "bitrate": "128k",
    "sampleRate": "44100",
    "channels": "2"
  }
}
```

##### Compress Audio
```json
{
  "operation": "compress",
  "options": {
    "quality": "high|medium|low"
  }
}
```

##### Normalize Volume
```json
{
  "operation": "normalize",
  "options": {
    "targetDb": -16
  }
}
```

##### Trim Audio
```json
{
  "operation": "trim",
  "options": {
    "startTime": 5.0,
    "duration": 30.0
  }
}
```

##### Generate Waveform
```json
{
  "operation": "waveform",
  "options": {
    "samples": 1000
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Audio processing completed: compress",
  "data": {
    "operation": "compress",
    "audioFileId": "uuid",
    "compressedPath": "/path/to/compressed/file.mp3",
    "quality": "medium",
    "processedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Library Management

### Get Statistics
**GET** `/statistics`

Get comprehensive audio library statistics.

#### Response
```json
{
  "success": true,
  "message": "Audio statistics retrieved successfully",
  "data": {
    "totalFiles": 150,
    "totalSize": 1073741824,
    "formattedSize": "1.00 GB",
    "totalPlays": 1250,
    "totalDownloads": 350,
    "categories": {
      "greetings": 45,
      "objections": 32,
      "closing": 28,
      "general": 45
    },
    "formats": {
      "mp3": 120,
      "wav": 20,
      "ogg": 10
    },
    "processed": 140,
    "unprocessed": 10
  }
}
```

---

### Search Audio Files
**GET** `/search`

Advanced search for audio files with multiple filters.

#### Query Parameters
- `query`: String (required) - Search term
- `category`: String - Filter by category
- `tags`: String - Comma-separated list of tags
- `minDuration`: Number - Minimum duration in seconds
- `maxDuration`: Number - Maximum duration in seconds

#### Response
```json
{
  "success": true,
  "message": "Found 12 audio files matching 'greeting'",
  "data": {
    "query": "greeting",
    "total": 12,
    "results": [
      {
        "id": "uuid",
        "originalName": "morning-greeting.mp3",
        "filename": "uuid.mp3",
        "url": "/api/audio/file/uuid",
        "category": "greetings",
        "tags": ["morning", "formal"],
        "description": "Morning greeting message",
        "duration": 25.3,
        "format": "mp3",
        "analytics": {
          "plays": 8,
          "downloads": 2
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Legacy Compatibility

The API maintains backward compatibility with the original audio clips endpoints:

### Legacy Endpoints (Still Supported)
- `GET /` - Get all audio clips
- `GET /categories` - Get audio categories
- `GET /:category` - Get clips by category
- `POST /` - Create audio clip
- `PUT /:id` - Update audio clip
- `DELETE /:id` - Delete audio clip

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common Error Codes
- `400` - Bad Request (validation errors, invalid input)
- `404` - Not Found (audio file doesn't exist)
- `413` - Payload Too Large (file too big)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### File Upload Errors
- Invalid file type: Audio files only
- File too large: Maximum 50MB per file
- Too many files: Maximum 10 files per request
- Processing failed: Audio metadata extraction failed

---

## Usage Examples

### Upload Audio File with cURL
```bash
curl -X POST http://localhost:3001/api/audio/upload \
  -F "audioFiles=@greeting.mp3" \
  -F "category=greetings" \
  -F "description=Professional greeting" \
  -F 'tags=["formal","intro"]'
```

### Stream Audio File
```bash
curl -H "Range: bytes=0-1023" \
  http://localhost:3001/api/audio/file/uuid
```

### Process Audio File
```bash
curl -X POST http://localhost:3001/api/audio/process/uuid \
  -H "Content-Type: application/json" \
  -d '{"operation":"compress","options":{"quality":"medium"}}'
```

### Search Audio Files
```bash
curl "http://localhost:3001/api/audio/search?query=greeting&category=greetings"
```

---

## Performance Considerations

1. **Streaming**: Uses HTTP range requests for efficient audio streaming
2. **Processing**: Audio processing operations are asynchronous where possible
3. **Caching**: Consider implementing CDN for audio files in production
4. **Rate Limiting**: Enforced on upload endpoints to prevent abuse
5. **File Cleanup**: Automatic cleanup of temporary processing files

---

## Security Features

1. **File Validation**: Strict audio file type checking
2. **Size Limits**: Prevents large file uploads
3. **Rate Limiting**: Protection against abuse
4. **CORS Configuration**: Secure cross-origin requests
5. **Input Sanitization**: All inputs are validated and sanitized

---

## Development Notes

- All audio processing uses FFmpeg for reliable format handling
- Metadata extraction is automatic on upload
- Waveform generation is performed asynchronously
- Files are stored with UUID names to prevent conflicts
- Analytics are updated automatically on file access