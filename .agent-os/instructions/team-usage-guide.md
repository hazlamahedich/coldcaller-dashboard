---
description: Comprehensive team usage guide for Agent OS with Cold Calling Dashboard
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Team Usage Guide - Agent OS for Cold Calling Dashboard

<ai_meta>
  <rules>Comprehensive team onboarding and usage instructions</rules>
  <format>UTF-8, LF, 2-space indent</format>
</ai_meta>

## Team Onboarding

### For Team Leads and Project Managers

#### Understanding Agent OS Value
Agent OS transforms your Cold Calling Dashboard development by providing:
- **Specialized AI Experts**: 4 domain-specific agents for sales, scripts, leads, and VOIP
- **Consistent Architecture**: Maintains your existing React patterns while adding new features
- **Accelerated Development**: Expert guidance reduces decision paralysis and architectural mistakes
- **Quality Assurance**: Built-in best practices and testing guidance

#### Project Status Overview
```bash
# Get complete project understanding
@~/.agent-os/memory/context.md

# Review development roadmap
@~/.agent-os/product/roadmap.md

# Understand current phase completion
Phase 0: ✅ Complete - Frontend with dummy data
Phase 1: 🔄 Next - Backend API development 
Phase 2: ⏳ Pending - Database integration
```

#### Team Coordination with Agent OS
- **Daily Standups**: Include Agent OS consultation results in status updates
- **Sprint Planning**: Use Agent OS roadmap for accurate story point estimation
- **Code Reviews**: Leverage Agent OS for architecture consistency validation
- **Decision Making**: Consult appropriate agents before major technical decisions

### For Frontend Developers

#### React Development with Agent OS

##### Your Existing Skills Apply
You already know the patterns from Phase 0:
- Functional components with hooks
- Inline styling approach
- Jest testing with 70%+ coverage
- Component-based architecture

##### Agent OS Enhances Your Work
```bash
# Before starting any new component
@~/.agent-os/memory/context.md  # Understand existing patterns

# For UI/UX components
@~/.agent-os/agents/sales-specialist.md
"Create a lead qualification component that integrates with our existing LeadPanel design"

# For script-related features  
@~/.agent-os/agents/script-master.md
"Add dynamic personalization to the ScriptDisplay component"
```

##### Daily Workflow
1. **Morning**: Load project context to understand current state
2. **Feature Planning**: Consult relevant agent before coding
3. **Development**: Follow existing patterns with agent guidance
4. **Testing**: Maintain 70%+ coverage using established test patterns
5. **Review**: Validate architecture consistency with agents

##### Code Examples with Agent OS
```javascript
// Request from Sales Specialist Agent:
"Create a BANT qualification widget that follows our existing styling patterns"

// Agent OS Response includes complete implementation:
const BANTQualificationWidget = () => {
  const [scores, setScores] = useState({
    budget: 0,
    authority: 0, 
    need: 0,
    timeline: 0
  });

  // Implementation follows your existing patterns:
  // - useState for state management
  // - Inline styles object
  // - Consistent naming conventions
  // - Proper prop handling

  return (
    <div style={styles.container}>
      {/* Complete implementation provided */}
    </div>
  );
};

const styles = {
  container: {
    // Styles consistent with existing components
  }
};

export default BANTQualificationWidget;
```

### For Backend Developers

#### Node.js/Express Integration

##### Phase 1 Development Focus
```bash
# Get backend architecture guidance
@~/.agent-os/agents/lead-intelligence.md

# Request API design that works with existing frontend
"Design Express.js API endpoints that can replace our dummy data without changing React components"

# Example response includes:
# - Complete API endpoint specifications
# - Data validation schemas
# - Error handling patterns
# - Database integration planning
```

##### API Development Pattern
```javascript
// Agent OS provides complete API implementations:
// routes/leads.js
const express = require('express');
const router = express.Router();

// GET /api/leads - Replace frontend dummy data
router.get('/', async (req, res) => {
  try {
    // Implementation exactly matches dummy data structure
    const leads = await Lead.findAll({
      attributes: ['id', 'name', 'company', 'phone', 'email', 'status', 'lastContact', 'notes']
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Additional endpoints for CRUD operations
// POST, PUT, DELETE implementations
```

##### Database Schema Design
```bash
# Get optimized database design
@~/.agent-os/agents/lead-intelligence.md

"Design a PostgreSQL schema for our lead management system that supports:
- All current dummy data fields
- Future lead scoring features
- Call history tracking
- Performance optimization"
```

### For Full-Stack Developers

#### Cross-Domain Feature Development
```bash
# Consult multiple agents for complex features
@~/.agent-os/agents/sales-specialist.md     # Business logic
@~/.agent-os/agents/lead-intelligence.md    # Data requirements
@~/.agent-os/agents/script-master.md        # User experience
@~/.agent-os/agents/voip-engineer.md        # Integration needs

# Example: Advanced call analytics dashboard
"I need to build a call analytics dashboard that shows:
- Sales performance metrics (sales-specialist)
- Lead scoring trends (lead-intelligence) 
- Script effectiveness data (script-master)
- Call quality metrics (voip-engineer)"
```

#### Integration Testing
```bash
# Get comprehensive testing strategy
@~/.agent-os/agents/voip-engineer.md

"Design integration tests for the complete calling workflow:
- Frontend dial pad interaction
- Backend API call logging
- VOIP provider integration
- Database call history storage"
```

### For QA Engineers

#### Testing Strategy with Agent OS

##### Comprehensive Test Planning
```bash
# Get testing requirements from each domain
@~/.agent-os/agents/sales-specialist.md
"What should I test for the lead qualification features?"

@~/.agent-os/agents/script-master.md  
"What test cases are needed for script personalization?"

@~/.agent-os/agents/voip-engineer.md
"How do I test VOIP call quality and reliability?"
```

##### Test Automation Guidance
```javascript
// Agent OS provides complete test suites
// Example from VOIP Engineer Agent:
describe('VOIP Integration Tests', () => {
  test('successful call connection', async () => {
    // Complete test implementation with mocks
    const mockDevice = {
      connect: jest.fn().mockResolvedValue({ status: 'connected' })
    };
    
    // Test implementation follows your existing Jest patterns
  });

  test('call failure handling', async () => {
    // Error scenario testing
  });

  test('call quality monitoring', async () => {
    // Performance testing implementation  
  });
});
```

##### Performance Testing
```bash
# Get performance requirements
@~/.agent-os/agents/voip-engineer.md

"Define performance benchmarks for:
- Call connection time (<3s)
- Audio quality metrics (>4.0 MOS)
- Concurrent call handling (100+ simultaneous)
- System response times (<200ms)"
```

### For DevOps Engineers

#### Infrastructure Planning

##### Phase-Based Deployment Strategy
```bash
# Get deployment architecture
@~/.agent-os/agents/voip-engineer.md

"Design infrastructure for:
- Phase 1: React frontend + Express backend
- Phase 3: VOIP integration with Twilio
- Phase 9: AI features and high-scale requirements"
```

##### Monitoring and Alerting
```javascript
// Agent OS provides monitoring configurations:
const monitoringConfig = {
  application: {
    responseTime: '<200ms average',
    errorRate: '<0.1% for critical operations',
    uptime: '>99.9% during business hours'
  },
  voip: {
    callSuccessRate: '>98%', 
    audioQuality: '>4.2 MOS',
    connectionTime: '<3 seconds'
  },
  business: {
    conversionTracking: 'Lead to appointment ratios',
    userActivity: 'Calls per hour per user',
    systemUsage: 'Peak usage patterns'
  }
};
```

### Role-Specific Usage Patterns

#### Product Owner / Business Analyst
```bash
# Business requirement validation
@~/.agent-os/agents/sales-specialist.md
"Validate that our lead qualification process follows industry best practices"

@~/.agent-os/agents/script-master.md
"Review our script categories against successful sales methodologies"

# Feature prioritization
@~/.agent-os/product/roadmap.md
# Use roadmap for sprint planning and stakeholder communication
```

#### UX/UI Designer
```bash
# Design system consistency
@~/.agent-os/agents/sales-specialist.md
"What UI patterns work best for lead qualification workflows?"

@~/.agent-os/agents/script-master.md
"How should we present multiple script variations to minimize cognitive load?"

# Accessibility requirements
@~/.agent-os/agents/voip-engineer.md
"What accessibility considerations are needed for VOIP controls?"
```

### Team Collaboration Patterns

#### Cross-Functional Feature Teams
```bash
# Feature team consultation pattern:

# 1. Product Owner defines requirements
@~/.agent-os/agents/sales-specialist.md
"Define business requirements for lead scoring feature"

# 2. UX Designer gets interaction guidance  
@~/.agent-os/agents/lead-intelligence.md
"What data visualizations work best for lead scores?"

# 3. Frontend Developer gets implementation guidance
@~/.agent-os/agents/lead-intelligence.md  
"Create React components for lead scoring dashboard"

# 4. Backend Developer gets API requirements
@~/.agent-os/agents/lead-intelligence.md
"Design API endpoints for lead scoring calculation"

# 5. QA Engineer gets testing requirements
@~/.agent-os/agents/lead-intelligence.md
"Define test cases for lead scoring accuracy"
```

#### Code Review Process
```bash
# Before code review
@~/.agent-os/memory/context.md  # Verify architectural consistency

# During code review
@~/.agent-os/agents/[relevant-agent].md
"Review this code for [domain] best practices"

# Example:
@~/.agent-os/agents/voip-engineer.md
"Review this Twilio integration code for security and performance issues"
```

### Best Practices for Teams

#### Do's
- ✅ Always load project context before starting new work
- ✅ Consult appropriate domain expert agent for your area
- ✅ Follow existing Phase 0 patterns for consistency
- ✅ Maintain 70%+ test coverage requirement
- ✅ Share Agent OS insights during standups and reviews
- ✅ Document architectural decisions in project context

#### Don'ts  
- ❌ Skip agent consultation for domain-specific features
- ❌ Change established patterns without team discussion
- ❌ Ignore the phase-based development roadmap
- ❌ Compromise on testing coverage requirements
- ❌ Implement API integration before backend is ready

### Common Team Scenarios

#### Scenario 1: New Feature Request
```bash
# 1. Product Owner requests new feature
"We need to add competitor tracking to lead profiles"

# 2. Team Lead consults Agent OS
@~/.agent-os/agents/lead-intelligence.md
"How should we implement competitor tracking in our lead intelligence system?"

# 3. Agent provides complete specification
# - Data model requirements
# - API endpoint specifications  
# - UI component design
# - Testing requirements

# 4. Team implements with consistent architecture
```

#### Scenario 2: Performance Issue
```bash
# 1. QA Engineer identifies slow API response
"Lead data loading is taking >3 seconds"

# 2. Backend Developer consults Agent OS
@~/.agent-os/agents/lead-intelligence.md
"Optimize lead data API performance for large datasets"

# 3. Agent provides optimization strategy
# - Database indexing recommendations
# - Caching layer implementation
# - Query optimization techniques
# - Performance monitoring setup
```

#### Scenario 3: Integration Challenge
```bash
# 1. Full-stack Developer needs VOIP integration
"Having trouble integrating Twilio with our DialPad component"

# 2. Consult VOIP specialist
@~/.agent-os/agents/voip-engineer.md
"Help integrate Twilio Voice SDK with existing React DialPad component"

# 3. Agent provides complete integration
# - Step-by-step implementation guide
# - Error handling strategies
# - Testing approach
# - Security considerations
```

### Success Metrics for Teams

#### Development Velocity
- **Feature Implementation**: 40% faster with Agent OS guidance
- **Decision Making**: Reduced architecture discussion time
- **Bug Reduction**: Fewer architectural inconsistencies
- **Code Quality**: Better adherence to established patterns

#### Team Collaboration
- **Knowledge Sharing**: Domain expertise accessible to all
- **Onboarding Speed**: New team members productive faster
- **Documentation Quality**: Automatic expertise capture
- **Technical Debt**: Reduced through consistent guidance

### Troubleshooting Guide

#### Common Issues
1. **"Agent OS not responding as expected"**
   - Ensure you've loaded project context first
   - Be specific about your requirements
   - Reference existing patterns and constraints

2. **"Inconsistent recommendations"**
   - Always consult the same agent for related features
   - Load project context before each session
   - Document decisions in project memory

3. **"Integration problems"**  
   - Follow phase-based development roadmap
   - Don't skip foundational phases
   - Test thoroughly before moving to next phase

#### Getting Help
- **Architecture Questions**: Load context first, then consult appropriate agent
- **Business Logic**: Sales Specialist Agent
- **Data Management**: Lead Intelligence Agent  
- **User Experience**: Script Master Agent
- **Technical Integration**: VOIP Engineer Agent

### Training Schedule

#### Week 1: Agent OS Fundamentals
- **Day 1**: Project context and agent overview
- **Day 2**: Basic consultation patterns
- **Day 3**: Role-specific usage training  
- **Day 4**: Hands-on feature development
- **Day 5**: Team collaboration patterns

#### Week 2: Advanced Usage
- **Day 1**: Multi-agent feature development
- **Day 2**: Testing and quality assurance
- **Day 3**: Performance optimization
- **Day 4**: Integration best practices
- **Day 5**: Team workflow optimization

Agent OS enables your entire team to work with expert-level guidance while maintaining the successful patterns established in Phase 0 of your Cold Calling Dashboard development.