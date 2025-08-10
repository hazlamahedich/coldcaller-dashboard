# FloatingChatbot Component Documentation

## Overview

The FloatingChatbot is a fully-featured, interactive RAG (Retrieval-Augmented Generation) chatbot component designed for the Cold Calling Dashboard. It provides users with an AI-powered assistant that can help with cold calling strategies, lead management, analytics, and objection handling.

## Features

### 🎯 Core Functionality
- **Drag & Drop**: Users can reposition the chatbot anywhere on screen
- **Resize Capability**: Corner handles allow resizing with min/max constraints
- **Minimize/Expand**: Collapsible interface to save screen space
- **Smooth Animations**: Powered by Framer Motion for fluid interactions

### 🤖 Chat Features
- **Real-time Messaging**: Instant responses with typing indicators
- **Source Citations**: AI responses include relevant source citations
- **Message History**: Persistent chat history across sessions
- **Quick Actions**: Pre-defined buttons for common queries
- **Error Handling**: Graceful error handling with retry options
- **Offline Support**: Works offline with cached responses

### 🔧 Technical Features
- **Supabase Integration**: Authentication and chat history storage
- **RESTful API**: Backend integration for AI responses
- **Accessibility**: Full ARIA support and keyboard navigation
- **Responsive Design**: Works on desktop and mobile devices
- **Performance Optimized**: Efficient rendering and memory management

## Components Architecture

```
FloatingChatbot/
├── FloatingChatbot.js      # Main chatbot component
├── ChatMessage.js          # Individual message component
├── ChatInput.js           # Message input with features
├── ChatbotToggle.js       # Toggle button component
├── useChat.js             # Chat state management hook
├── chatService.js         # API service layer
└── chatbot.css           # Custom styling
```

### FloatingChatbot.js
Main component handling:
- Window management (drag, resize, minimize)
- Chat container and message display
- State management integration
- Animation orchestration

### ChatMessage.js
Individual message rendering:
- User vs assistant message styling
- Source citation display
- Confidence indicators
- Retry functionality for errors

### ChatInput.js
Input interface featuring:
- Auto-resizing textarea
- Quick action buttons
- File upload capability
- Typing indicators
- Send/cancel functionality

### ChatbotToggle.js
Toggle button component:
- Floating action button
- Smooth show/hide animations
- Notification badges (for future use)

## API Integration

### Backend Routes
The chatbot integrates with these backend endpoints:

```javascript
POST /api/chat/message    # Send chat message
POST /api/chat/search     # Search knowledge base
GET  /api/chat/health     # Health check
```

### Knowledge Base
The backend includes a mock knowledge base with:
- Cold calling best practices
- Lead scoring and management
- Call analytics and metrics
- Objection handling techniques

### Response Format
```json
{
  "response": "AI generated response text",
  "sources": [
    {
      "title": "Source Title",
      "snippet": "Relevant excerpt...",
      "category": "calling_tips"
    }
  ],
  "confidence": 0.85,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Setup Instructions

### 1. Environment Configuration
Create a `.env` file:
```bash
REACT_APP_CHAT_API_URL=http://localhost:5000/api/chat
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
```

### 2. Dependencies Installation
```bash
npm install framer-motion @supabase/supabase-js
```

### 3. Database Setup (Optional)
If using Supabase, create this table:
```sql
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  message_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage

### Basic Implementation
```jsx
import ChatbotToggle from './components/ChatbotToggle';

function App() {
  return (
    <div className="app">
      {/* Your app content */}
      <ChatbotToggle />
    </div>
  );
}
```

### Direct Component Usage
```jsx
import FloatingChatbot from './components/FloatingChatbot';

function MyPage() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div>
      {showChat && (
        <FloatingChatbot 
          onClose={() => setShowChat(false)}
          initialPosition={{ x: 100, y: 100 }}
        />
      )}
    </div>
  );
}
```

## Customization

### Styling
The component uses Tailwind CSS with custom CSS variables:
```css
:root {
  --chat-primary: #3b82f6;
  --chat-secondary: #f1f5f9;
  --chat-accent: #10b981;
}
```

### Quick Actions
Customize quick action buttons:
```javascript
const customActions = [
  {
    id: 'custom',
    label: 'Custom Action',
    icon: '🚀',
    message: 'Tell me about custom features'
  }
];
```

### Knowledge Base
Extend the backend knowledge base:
```javascript
const knowledgeBase = [
  {
    id: 5,
    title: "Custom Topic",
    content: "Your custom content here...",
    category: "custom_category",
    tags: ["custom", "topic"]
  }
];
```

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Logical tab order
- **High Contrast**: Supports high contrast mode
- **Reduced Motion**: Respects `prefers-reduced-motion`

## Performance Optimizations

- **Message Virtualization**: Efficient rendering of long conversations
- **Lazy Loading**: Components load only when needed
- **Request Caching**: Intelligent response caching
- **Memory Management**: Automatic cleanup of old messages
- **Debounced Inputs**: Prevents excessive API calls

## Testing

Run tests with:
```bash
npm test FloatingChatbot
```

The test suite covers:
- Component rendering
- User interactions
- API integration
- Error handling
- Accessibility

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Security Considerations

- **Input Sanitization**: All user inputs are sanitized
- **Authentication**: Supabase RLS policies protect user data
- **Rate Limiting**: Backend implements rate limiting
- **Data Validation**: Comprehensive input validation

## Troubleshooting

### Common Issues

1. **Chatbot not appearing**: Check if ChatbotToggle is imported correctly
2. **API errors**: Verify backend is running and CORS is configured
3. **Supabase issues**: Check environment variables and database permissions
4. **Animation glitches**: Ensure Framer Motion is properly installed

### Debug Mode
Enable debug logging:
```javascript
localStorage.setItem('chatbot_debug', 'true');
```

## Future Enhancements

- **Voice Input**: Speech-to-text integration
- **Multi-language Support**: Internationalization
- **Theme Customization**: Dynamic theme switching
- **Plugin System**: Extensible functionality
- **Advanced Analytics**: Usage tracking and insights

## Contributing

When contributing to the chatbot:
1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test accessibility compliance
5. Ensure mobile responsiveness

## License

This component is part of the Cold Calling Dashboard project and follows the same licensing terms.