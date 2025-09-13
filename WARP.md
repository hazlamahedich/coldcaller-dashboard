# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ColdCaller is a comprehensive web application for sales professionals featuring:
- **Modern Stack**: React 19 + Node.js/Express + Supabase PostgreSQL
- **AI Integration**: Google Gemini-powered RAG chatbot with hybrid knowledge sources
- **VOIP Calling**: Production-ready Twilio integration with WebRTC
- **Enterprise Features**: Call recording, analytics, lead management, OAuth integrations

**Architecture**: Full-stack TypeScript/JavaScript with microservices-ready Docker setup and comprehensive testing (Jest + Cypress).

## Quick Development Commands

### Essential Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start both frontend and backend servers |
| `make dev` | Alternative development startup with Docker |
| `npm test` | Run all tests (frontend + backend) |
| `npm run build` | Build production frontend |
| `make setup` | Initial project setup with dependencies |

### Specialized Commands

```bash
# Development
npm run dev:backend          # Backend only (port 3001)
npm run dev:frontend         # Frontend only (port 3000)

# Testing
npm run test:frontend        # React component tests
npm run test:backend         # Backend API tests  
npm run test:e2e            # Cypress E2E tests
npm run test:coverage       # Generate coverage reports
jest --testPathPattern=components/__tests__/DialPad  # Single test file

# Building & Deployment
make docker-build           # Build Docker images
make k8s-deploy            # Deploy to Kubernetes
make terraform-apply       # Infrastructure deployment

# Database
make db-migrate            # Run database migrations
make db-seed              # Seed with test data
npm run data:init         # Initialize data layers
```

## Architecture Overview

### High-Level Structure

```
coldcaller/
├── frontend/              # React 19 + Tailwind CSS
│   ├── src/
│   │   ├── components/    # UI components (DialPad, VOIPPhone, ChatBot)
│   │   ├── hooks/         # Custom React hooks (useChat, useCall)
│   │   ├── services/      # API clients and integrations
│   │   ├── contexts/      # React Context providers (Auth, Theme, Lead)
│   │   └── pages/         # Route components
├── backend/               # Node.js/Express API
│   ├── src/
│   │   ├── routes/        # API endpoints (auth, calls, ragChat)
│   │   ├── services/      # Business logic (webSearchService, geminiResponseGenerator)
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Security, auth, rate limiting
│   │   ├── database/      # Models, migrations, seeders
│   │   └── utils/         # Shared utilities (encryption, embeddings)
├── infrastructure/        # Docker, K8s, Terraform configs
└── cypress/              # E2E test specifications
```

### Key Architectural Patterns

1. **Frontend**: Context providers for global state, custom hooks for API integration, component-based architecture
2. **Backend**: Express middleware stack, service layer pattern, controller-service separation
3. **Database**: Supabase with vector search for RAG, PostgreSQL with Redis caching
4. **AI**: Hybrid RAG system combining internal docs + web search via DuckDuckGo/Serper APIs
5. **VOIP**: Twilio Voice SDK with WebRTC fallback, SIP.js integration

### Critical Folders

| Path | Purpose |
|------|---------|
| `backend/src/routes/ragChat.js` | AI chatbot API endpoints |
| `frontend/src/components/FloatingChatbot.js` | Main chatbot UI |
| `backend/src/services/geminiResponseGenerator.js` | AI response logic |
| `backend/src/middleware/security.js` | Security middleware stack |
| `frontend/src/components/VOIPPhone.js` | Twilio calling interface |
| `backend/src/routes/twilio.js` | VOIP call management |

## Key Integrations & Environment Setup

### Required Environment Variables

```bash
# Backend (.env)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
GOOGLE_AI_API_KEY=your_gemini_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret

# Optional integrations
SERPER_API_KEY=your_google_search_api_key
MICROSOFT_CLIENT_ID=oauth_client_id
GOOGLE_OAUTH_CLIENT_ID=oauth_client_id
```

### Service Dependencies

| Service | Purpose | Local Dev |
|---------|---------|-----------|
| **Supabase** | PostgreSQL + Vector Search | Use cloud instance or local Docker |
| **Twilio** | VOIP calling, SMS | Demo account included |
| **Google Gemini** | AI chat responses | Requires API key |
| **Redis** | Caching, sessions | `docker-compose up redis` |
| **Prometheus/Grafana** | Monitoring | `make monitoring-up` |

### Docker Development Setup

```bash
# Start full stack with monitoring
docker-compose up -d

# Individual services
docker-compose up -d postgres redis  # Database layer only
docker-compose up -d backend         # API server only
```

## Development Workflows

### SPARC Methodology (from CLAUDE.md)

This project follows **SPARC** (Specification, Pseudocode, Architecture, Refinement, Completion) for systematic development:

```bash
# Concurrent execution is mandatory - batch all operations
npx claude-flow sparc tdd "implement feature" --batch-tdd
npx claude-flow sparc pipeline "task" --parallel
```

**Critical Rule**: ALL operations must be concurrent/parallel in single messages. Never chain sequential operations.

### Testing Workflows

```bash
# Test-driven development
npm run test:watch                    # Watch mode
npm run test:coverage                # Coverage reports
npm run test:e2e:open               # Interactive Cypress

# Specific test patterns
jest --testNamePattern="DialPad"     # Test by name
jest src/components/__tests__/       # Directory tests
cypress run --spec="cypress/e2e/calls/**/*"  # E2E by folder
```

### Git & CI/CD Conventions

- **Pre-commit**: Husky runs linting and tests automatically
- **Branch Protection**: Required status checks on main branch  
- **CI Pipeline**: GitHub Actions runs full test suite on PRs
- **Coverage**: 80%+ required (85%+ for components, 90%+ for controllers)

## Design System Guidelines

### Theme Standards (from .cursor/rules)

**Default**: Modern dark professional theme optimized for call center environments

```css
/* Core theme variables */
--background: #0a0a0a;
--card: #111111;
--primary: #3b82f6;
--accent: #10b981;
--success: #22c55e;
--warning: #eab308;
--font-sans: Inter, system-ui, sans-serif;
```

### UI Component Standards

1. **Accessibility**: High contrast, screen reader support, keyboard navigation
2. **Dialpad**: Chunky 70px+ buttons, tactile hover effects
3. **Call Controls**: Visual state indicators, clear affordances
4. **Professional Colors**: Dark theme default, blacks/grays/whites with accent highlights
5. **Typography**: Inter/Roboto family, readable sizes for professional use

### Tailwind Configuration

- **Responsive**: Mobile-first, optimized for desktop call centers
- **Custom Classes**: Professional component library in `frontend/src/styles/`
- **Theme Toggle**: Automatic light/dark mode switching

## Further Reading

### Project Documentation
- `README.md` - Comprehensive project overview and features
- `START_GUIDE.md` - Quick startup instructions
- `CLAUDE.md` - Full SPARC development methodology
- `docs/COMPREHENSIVE_FAQ.md` - 544-line knowledge base for RAG chatbot

### API Documentation
- `backend/API_DOCUMENTATION.md` - Core API endpoints
- `backend/CALL_MANAGEMENT_API.md` - VOIP integration details
- `backend/ANALYTICS_API_DOCUMENTATION.md` - Metrics and reporting

### Testing & QA
- `TESTING_GUIDE.md` - Comprehensive testing strategies
- `COMPREHENSIVE_TESTING_SUITE_REPORT.md` - 200+ test cases overview
- `jest.config.js` - Multi-project testing configuration
- `cypress.config.js` - E2E testing setup

### Infrastructure
- `DEPLOYMENT_README.md` - Production deployment guide
- `SECURITY_AUDIT_REPORT.md` - Security assessment
- `docker-compose.yml` - Full stack containerization
- `infrastructure/` - Kubernetes, Terraform, monitoring configs

### Integration Guides
- `TWILIO_SETUP_GUIDE.md` - VOIP calling configuration
- `OAUTH_SETUP_GUIDE.md` - Authentication providers
- `RAG_SETUP_GUIDE.md` - AI chatbot configuration