# 🎯 Cold Calling Dashboard

A comprehensive web application for sales professionals to manage cold calling campaigns, track leads, and optimize their calling workflow. **Now featuring an intelligent AI chatbot with hybrid knowledge sourcing!**

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/hazlamahedich/coldcaller-dashboard)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.3-38B2AC.svg)](https://tailwindcss.com/)

## 📋 Project Overview

This is a comprehensive 8-week development project building a complete cold calling solution from frontend to backend, with modern technologies, AI assistance, and best practices. **Recently enhanced with an intelligent hybrid RAG chatbot system!**

## 🚀 Latest Features

### 🤖 **NEW: Hybrid RAG Chatbot System** ✨
- **🧠 Intelligent AI Assistant**: Gemini-1.5-Pro powered chatbot for instant help
- **🌐 Hybrid Knowledge Sources**: Combines internal documentation with real-time web search
- **🎨 Visual Source Distinction**: 
  - 🔵 **Blue buttons** for internal ColdCaller documentation
  - 🟢 **Green buttons** for external web sources
- **🔍 Smart Source Selection**: Automatically determines when to search the web
- **📚 Comprehensive FAQ**: 544-line FAQ covering all platform features
- **⚡ Performance Optimized**: <2s for internal queries, ~3s for web-enhanced responses

### 🎯 **Core Features Completed**

#### Week 8: Complete Enterprise Platform ✅
- **🤖 RAG Chatbot**: Intelligent assistant with document integration
- **📞 Call Recording**: Complete call logging and analysis system  
- **📊 Analytics Dashboard**: Performance tracking and KPI monitoring
- **🔊 Audio Library**: Comprehensive script and clip management
- **🎨 Modern UI**: Polished interface with dark mode support

#### Week 7: Call Management System ✅
- **📝 Note-Rolling Documentation**: Comprehensive call logging system
- **📊 Lead Analytics**: Advanced lead tracking and conversion metrics
- **🔄 Call Status Management**: Real-time call state tracking
- **📈 Performance Dashboards**: Visual analytics and reporting

#### Week 6: Database & Lead Management ✅
- **🗄️ Supabase Integration**: Complete database implementation
- **👥 Lead Management CRM**: Full lead lifecycle management
- **📊 Advanced Analytics**: Lead scoring and conversion tracking
- **🔄 Data Synchronization**: Real-time updates across all components

#### Week 5: Twilio VOIP Integration ✅
- **📞 Real Twilio Calls**: Production-ready calling system
- **🎛️ Call Controls**: Hold, mute, transfer, conference calling
- **📱 Mobile Support**: Responsive design for all devices
- **🔧 Error Handling**: Comprehensive call failure management

#### Week 4: Authentication & Security ✅
- **🔐 Secure Authentication**: JWT-based login system
- **👤 User Management**: Role-based access control
- **🛡️ Security Middleware**: Request validation and sanitization
- **📊 Session Management**: Secure token handling

#### Week 3: Backend API Development ✅
- **🖥️ Express.js Server**: RESTful API architecture
- **📡 Lead Management APIs**: CRUD operations for lead data
- **🔄 Real-time Updates**: WebSocket integration for live updates
- **🧪 Comprehensive Testing**: API endpoint testing and validation

#### Week 2: Tailwind CSS Styling ✅
- **🎨 Professional UI**: Complete conversion to Tailwind CSS
- **🎛️ Design System**: Custom themes, typography, and components
- **📱 Responsive Design**: Mobile-first responsive layout
- **✨ Enhanced UX**: Smooth transitions and polished interactions

#### Week 1: React Frontend Foundation ✅
- **📞 DialPad Component**: Interactive phone dialer with formatting
- **🔊 AudioClipPlayer**: Categorized audio clips for calling scenarios
- **📋 ScriptDisplay**: Color-coded scripts with clipboard functionality
- **👥 LeadPanel**: Lead management with navigation and notes
- **🧪 Comprehensive Testing**: 70%+ test coverage with automated tests

## 🛠 Technology Stack

### Frontend
- **React 19.1.1**: Modern functional components with hooks
- **Tailwind CSS 3.4.3**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **React Testing Library**: Comprehensive testing suite

### Backend
- **Node.js 18+**: Server-side JavaScript runtime
- **Express.js**: Fast, unopinionated web framework
- **Supabase**: PostgreSQL database with real-time features
- **Google Gemini AI**: Advanced language model for chatbot

### AI & Search
- **🧠 RAG System**: Retrieval-Augmented Generation with vector search
- **🔍 Web Search**: DuckDuckGo & Serper API integration
- **📄 Content Processing**: Intelligent document chunking and embedding
- **🌐 Hybrid Sources**: Internal docs + external knowledge

### Communication
- **Twilio Voice API**: Production-grade VOIP calling
- **WebRTC**: Real-time peer-to-peer communication
- **Socket.io**: Real-time bidirectional communication

### Development Tools
- **Jest**: Test runner with coverage reporting
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **GitHub Actions**: CI/CD pipeline
- **Claude Code**: AI-powered development assistance

## 📁 Enhanced Project Structure

```
coldcaller-dashboard/
├── frontend/                      # React application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ChatMessage.js    # AI chatbot message display
│   │   │   ├── SourceLink.js     # Clickable document sources
│   │   │   ├── FloatingChatbot.js # Main chatbot interface
│   │   │   ├── DialPad.js        # Phone dialer
│   │   │   ├── LeadPanel.js      # Lead management
│   │   │   └── VOIPPhone.js      # Twilio calling interface
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── useChat.js        # Chatbot state management
│   │   ├── services/             # API and service integrations
│   │   │   └── chatService.js    # Chatbot API communication
│   │   └── styles/               # CSS and styling
│   │       └── chatbot.css       # Chatbot-specific styles
│   └── package.json
├── backend/                      # Node.js/Express server
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   │   ├── ragChat.js       # RAG chatbot API
│   │   │   ├── documents.js     # Document serving
│   │   │   └── calls.js         # Twilio call management
│   │   ├── services/            # Business logic services
│   │   │   ├── webSearchService.js      # External web search
│   │   │   ├── geminiResponseGenerator.js # AI response generation
│   │   │   ├── supabaseVectorStore.js   # Vector database operations
│   │   │   └── documentProcessor.js     # Document parsing & chunking
│   │   ├── utils/               # Utility functions
│   │   │   ├── contentChunker.js        # Text chunking for RAG
│   │   │   ├── embeddingUtils.js        # Vector embeddings
│   │   │   └── logger.js                # Centralized logging
│   │   └── database/            # Database configuration
│   │       └── migrations/      # Database schema migrations
│   └── package.json
├── docs/                        # Documentation
│   └── COMPREHENSIVE_FAQ.md     # 544-line chatbot knowledge base
├── test-hybrid-rag.html         # RAG system testing interface
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- **Node.js 18+** 
- **npm or yarn**
- **Git**
- **Supabase Account** (for database)
- **Google AI API Key** (for Gemini chatbot)
- **Twilio Account** (for VOIP calling)

### Quick Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hazlamahedich/coldcaller-dashboard.git
   cd coldcaller-dashboard
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies  
   cd ../frontend
   npm install
   ```

3. **Environment setup**
   ```bash
   # Backend environment (.env)
   cd ../backend
   cp .env.example .env
   # Edit .env with your API keys:
   # - GOOGLE_AI_API_KEY=your_gemini_api_key
   # - SUPABASE_URL=your_supabase_url  
   # - SUPABASE_SERVICE_KEY=your_supabase_key
   # - TWILIO_ACCOUNT_SID=your_twilio_sid
   # - TWILIO_AUTH_TOKEN=your_twilio_token
   ```

4. **Start the application**
   ```bash
   # Start backend (Terminal 1)
   cd backend
   npm run dev

   # Start frontend (Terminal 2)  
   cd frontend
   npm start
   ```

5. **Access the application**
   - **Main App**: http://localhost:3000
   - **Backend API**: http://localhost:3001
   - **RAG Test Interface**: http://localhost:3000/test-hybrid-rag.html

## 🤖 Using the AI Chatbot

### Quick Start
1. **Open the app** at http://localhost:3000
2. **Click the blue chat button** in the bottom-right corner
3. **Ask questions** like:
   - *"How do I set up Twilio integration?"* (Internal docs)
   - *"What is Twilio?"* (Web search + internal docs)
   - *"How do I manage leads in ColdCaller?"* (Internal docs)

### Source Types
- **🔵 Blue "View Document" buttons**: Internal ColdCaller documentation
- **🟢 Green "External/Knowledge" buttons**: Web search results  
- **Smart selection**: System automatically chooses the best sources

### Features
- **Intelligent Responses**: Powered by Google Gemini-1.5-Pro
- **Clickable Sources**: All sources link to original documents
- **Real-time Search**: Combines your docs with live web information
- **Context Awareness**: Remembers conversation history

## 🧪 Testing

### Run All Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests  
cd backend
npm test

# Test the RAG chatbot
open http://localhost:3000/test-hybrid-rag.html
```

### Test Coverage
- **Frontend**: 70%+ component and integration test coverage
- **Backend**: API endpoint testing with comprehensive validation
- **RAG System**: Dedicated testing interface with real-time validation

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd backend
NODE_ENV=production npm start
```

### Environment Variables
```env
# Essential for production
NODE_ENV=production
GOOGLE_AI_API_KEY=your_production_gemini_key
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_KEY=your_production_supabase_key
TWILIO_ACCOUNT_SID=your_production_twilio_sid
TWILIO_AUTH_TOKEN=your_production_twilio_token

# Optional web search enhancement
SERPER_API_KEY=your_serper_api_key_for_google_search
```

## 📊 Performance & Analytics

### RAG Chatbot Performance
- **Internal queries**: <2 seconds response time
- **Web-enhanced queries**: ~3 seconds with external search
- **Confidence scores**: 62%+ average confidence with proper attribution
- **Source accuracy**: Visual distinction working perfectly

### System Metrics
- **Test Coverage**: 70%+ across frontend and backend
- **API Response Time**: <200ms for most endpoints
- **Database Queries**: Optimized with vector similarity search
- **Real-time Updates**: WebSocket integration for live data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Use semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team**: For the excellent frontend framework
- **Tailwind CSS**: For the utility-first CSS approach
- **Twilio**: For reliable VOIP communication services
- **Google AI**: For the powerful Gemini language model
- **Supabase**: For the excellent PostgreSQL database platform
- **Claude Code**: For AI-powered development assistance

## 📧 Contact & Support

- **Repository**: [GitHub](https://github.com/hazlamahedich/coldcaller-dashboard)
- **Issues**: [Report bugs or request features](https://github.com/hazlamahedich/coldcaller-dashboard/issues)
- **Discussions**: [Community discussions](https://github.com/hazlamahedich/coldcaller-dashboard/discussions)

---

**🎯 Built with modern web technologies and AI assistance for professional sales teams.**

**🌟 Star this repository if you find it useful!**