---
description: Quick start guide for using Agent OS with Cold Calling Dashboard
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Agent OS Quick Start Guide

<ai_meta>
  <rules>Provide clear, actionable instructions for immediate Agent OS usage</rules>
  <format>UTF-8, LF, 2-space indent</format>
</ai_meta>

## Getting Started with Agent OS

### Prerequisites
- Cold Calling Dashboard project is already set up with Phase 0 complete
- Node.js 20+ and npm installed
- Basic familiarity with React development
- Visual Studio Code (recommended) with Agent OS integration

### Immediate Usage Commands

#### 1. Feature Development
```bash
# Start any new feature development
@~/.agent-os/instructions/create-spec.md

# Example: Adding backend API
Feature: Lead Management API
Domain: lead-intelligence
Priority: high
Phase: 1
```

#### 2. Get Expert Consultation
```bash
# Sales-related features
@~/.agent-os/agents/sales-specialist.md

# Script optimization
@~/.agent-os/agents/script-master.md

# Lead data management  
@~/.agent-os/agents/lead-intelligence.md

# VOIP integration
@~/.agent-os/agents/voip-engineer.md
```

#### 3. Load Project Context
```bash
# Get complete project understanding
@~/.agent-os/memory/context.md

# This loads:
# - Current implementation status
# - Technical architecture decisions
# - Component relationships
# - Future integration plans
```

### Common Use Cases

#### Adding a New React Component
```bash
# 1. Consult appropriate specialist
@~/.agent-os/agents/sales-specialist.md

# 2. Create component with Agent OS guidance
Create a lead qualification component that:
- Implements BANT scoring framework
- Integrates with existing LeadPanel
- Follows current inline styling approach
- Maintains 70%+ test coverage requirement

# 3. Agent OS will provide:
# - Complete component code
# - Test suite implementation
# - Integration instructions
# - Styling consistent with existing components
```

#### Implementing Backend Features
```bash
# 1. Load current project context
@~/.agent-os/memory/context.md

# 2. Consult lead intelligence specialist
@~/.agent-os/agents/lead-intelligence.md

# 3. Request API development
Build Express.js API endpoints that:
- Replace dummy lead data from frontend
- Provide CRUD operations for leads
- Include data validation and error handling
- Follow RESTful conventions
```

#### Optimizing Call Scripts
```bash
# 1. Consult script master specialist
@~/.agent-os/agents/script-master.md

# 2. Request script enhancement
Improve the existing ScriptDisplay component to:
- Add dynamic personalization variables
- Implement A/B testing framework
- Include objection handling flows
- Provide real-time script suggestions
```

#### VOIP Integration Planning
```bash
# 1. Consult VOIP engineer
@~/.agent-os/agents/voip-engineer.md

# 2. Plan integration approach
Design Twilio integration that:
- Replaces DialPad console.log with real calls
- Implements call recording with compliance
- Provides call quality monitoring
- Handles connection failures gracefully
```

### Daily Development Workflow

#### Morning Setup (5 minutes)
```bash
# 1. Load project context
@~/.agent-os/memory/context.md

# 2. Review current development phase
Check roadmap: Phase 0 complete, Phase 1 backend foundation next

# 3. Identify today's focus area
Consult relevant specialist agent for guidance
```

#### Feature Development (Throughout Day)
```bash
# Always start with specification
@~/.agent-os/instructions/create-spec.md

# Consult appropriate specialist
# - Sales features -> sales-specialist
# - Scripts -> script-master  
# - Data features -> lead-intelligence
# - Communication -> voip-engineer

# Follow existing patterns from Phase 0
# - React functional components
# - Inline styling approach
# - Jest testing with 70%+ coverage
# - Dummy data first, API integration later
```

#### End of Day Review (5 minutes)
```bash
# Update project context if needed
Document any architectural decisions made

# Plan tomorrow's work with specialist consultation
Identify next features to implement based on roadmap
```

### Troubleshooting Common Issues

#### Component Integration Problems
```bash
# 1. Load project context for component relationships
@~/.agent-os/memory/context.md

# 2. Consult appropriate specialist
Example: Sales logic issues -> @~/.agent-os/agents/sales-specialist.md

# 3. Request debugging assistance
"I'm having trouble integrating the new lead scoring component with the existing LeadPanel. The props aren't being passed correctly."
```

#### Testing Issues
```bash
# Reference existing test patterns
All components in frontend/src/components/__tests__/ show the testing approach

# Maintain coverage requirement
npm run test:coverage
# Must maintain 70%+ across branches, functions, lines, statements

# Follow existing test structure
# - Rendering tests
# - User interaction tests  
# - State change tests
```

#### Styling Inconsistencies
```bash
# Follow established inline styling patterns
Reference existing components:
- App.js for layout styles
- DialPad.js for input/button styles
- LeadPanel.js for card/panel styles
- ScriptDisplay.js for text/content styles

# Maintain responsive design
All components use flexible layouts that work on mobile and desktop
```

### Advanced Usage

#### Multi-Agent Consultation
```bash
# For complex features involving multiple domains
Example: Advanced call analytics dashboard

# 1. Consult all relevant specialists
@~/.agent-os/agents/sales-specialist.md - KPI requirements
@~/.agent-os/agents/script-master.md - Script performance metrics  
@~/.agent-os/agents/lead-intelligence.md - Lead scoring analytics
@~/.agent-os/agents/voip-engineer.md - Call quality metrics

# 2. Synthesize recommendations into unified approach
```

#### Custom Workflow Creation
```bash
# Create project-specific workflows
@~/.agent-os/workflows/development.md

# Modify workflows based on team needs
# Add custom quality gates
# Implement team-specific testing requirements
# Integrate with existing CI/CD processes
```

### Integration with Existing Tools

#### Visual Studio Code
- Install Agent OS extension (if available)
- Use @~/.agent-os/ commands directly in VS Code terminal
- Set up snippets for common Agent OS consultation patterns

#### Git Workflow
```bash
# Before committing new features
@~/.agent-os/instructions/code-review.md

# Automatic specialist consultation for:
# - Code quality validation
# - Architecture consistency checking
# - Security vulnerability scanning
```

#### npm Scripts Integration
```bash
# Add Agent OS commands to package.json scripts
"scripts": {
  "agent:sales": "@~/.agent-os/agents/sales-specialist.md",
  "agent:scripts": "@~/.agent-os/agents/script-master.md", 
  "agent:leads": "@~/.agent-os/agents/lead-intelligence.md",
  "agent:voip": "@~/.agent-os/agents/voip-engineer.md",
  "agent:context": "@~/.agent-os/memory/context.md"
}

# Quick access during development
npm run agent:sales
```

### Success Tips

#### Best Practices
1. **Always load context first** - Understand current state before requesting changes
2. **Consult appropriate specialist** - Match your request to the right domain expert
3. **Follow existing patterns** - Maintain consistency with Phase 0 implementation
4. **Test continuously** - Maintain the 70%+ coverage requirement
5. **Document decisions** - Update context memory for future reference

#### Common Pitfalls to Avoid
1. Don't bypass specialist consultation for domain-specific features
2. Don't ignore the established architectural patterns from Phase 0
3. Don't skip testing - coverage requirements are non-negotiable
4. Don't implement API integration before backend is ready (follow phase plan)
5. Don't change styling approach without updating all components

### Getting Help

#### Quick Reference
- **Product overview**: `.agent-os/product/overview.md`
- **Development roadmap**: `.agent-os/product/roadmap.md`  
- **Technical decisions**: `.agent-os/memory/context.md`
- **Workflows**: `.agent-os/workflows/development.md`

#### Specialist Consultation
- **Business logic questions**: `@~/.agent-os/agents/sales-specialist.md`
- **Conversation design**: `@~/.agent-os/agents/script-master.md`
- **Data management**: `@~/.agent-os/agents/lead-intelligence.md`
- **Integration issues**: `@~/.agent-os/agents/voip-engineer.md`

Start with any of these commands and Agent OS will guide you through implementing features that align with the Cold Calling Dashboard's architecture and business requirements.