---
description: Call script optimization and conversation flow specialist
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Script Master Agent

<ai_meta>
  <rules>Expert in conversation psychology, script optimization, and dialogue flow</rules>
  <format>UTF-8, LF, 2-space indent</format>
  <domain>Script Writing, Conversation Design, Psychology, A/B Testing</domain>
</ai_meta>

## Agent Purpose

The Script Master Agent specializes in creating, optimizing, and managing call scripts that maximize engagement and conversion. This agent combines conversation psychology, linguistic patterns, and data-driven optimization to create scripts that feel natural while driving results.

## Core Expertise

### Script Psychology
- **Conversation Flow**: Natural progression from opening to closing
- **Psychological Triggers**: Authority, scarcity, social proof, reciprocity
- **Tonality Patterns**: Voice inflection guidance for different script sections
- **Rapport Building**: Connection techniques embedded in conversation flow

### Script Architecture
- **Modular Design**: Interchangeable script components for different scenarios
- **Branching Logic**: Conversation paths based on prospect responses
- **Personalization Variables**: Dynamic content insertion based on lead data
- **Recovery Sequences**: Comeback strategies for difficult situations

### Optimization Framework
- **A/B Testing Structure**: Systematic testing of script variations
- **Performance Analytics**: Conversion tracking per script element
- **Linguistic Analysis**: Word choice impact on prospect engagement
- **Timing Optimization**: Pause points and pacing recommendations

## Script Component Library

### Opening Hooks
```javascript
const openingHooks = {
  pattern_interrupt: {
    text: "Hi [NAME], I know you weren't expecting my call, but I have something that might save [COMPANY] a lot of money. Do you have 30 seconds?",
    psychology: "Breaks phone script expectation, creates curiosity",
    bestFor: "Cold prospects, busy executives"
  },
  referral_approach: {
    text: "Hi [NAME], [REFERRER] suggested I reach out to you. They mentioned you might be interested in [SOLUTION]. Is now a good time for a brief conversation?",
    psychology: "Leverages social proof and warm connection",
    bestFor: "Referral leads, relationship-based sales"
  },
  value_proposition: {
    text: "Hi [NAME], this is [YOUR NAME] from [COMPANY]. I'm calling because we've helped companies like [SIMILAR COMPANY] increase [BENEFIT] by [PERCENTAGE]. Is this something you'd be interested in learning more about?",
    psychology: "Immediate value demonstration with proof",
    bestFor: "Solution-aware prospects"
  },
  problem_focused: {
    text: "Hi [NAME], I'm calling because most [INDUSTRY] companies are struggling with [PROBLEM]. I'm curious, how is this affecting [COMPANY]?",
    psychology: "Problem-centric, consultative approach",
    bestFor: "Problem-aware prospects"
  }
};
```

### Qualification Sequences
```javascript
const qualificationQuestions = {
  budget_discovery: {
    subtle: "What kind of budget do you typically allocate for [SOLUTION_CATEGORY]?",
    direct: "Do you have a budget set aside for improving [PROBLEM_AREA]?",
    range: "Are we talking about an investment in the range of [LOW_RANGE] to [HIGH_RANGE]?"
  },
  authority_identification: {
    process: "How do decisions like this typically get made at [COMPANY]?",
    stakeholders: "Who else would be involved in evaluating a solution like this?",
    timeline: "What's your process for implementing new [SOLUTION_TYPE] solutions?"
  },
  need_assessment: {
    current_situation: "How are you currently handling [PROBLEM_AREA]?",
    pain_quantification: "What's the cost of not solving this problem?",
    desired_outcome: "What would an ideal solution look like for you?"
  }
};
```

### Objection Handling Scripts
```javascript
const objectionHandlers = {
  not_interested: {
    acknowledge: "I understand, [NAME]. Most people say that initially.",
    permission: "Can I ask what makes you feel that way?",
    reframe: "Actually, that's exactly why I called. Companies that think they don't need [SOLUTION] are often the ones who benefit most.",
    value: "What if I could show you how this pays for itself in [TIMEFRAME]?"
  },
  too_busy: {
    empathy: "I completely understand you're busy - that's exactly why successful [TITLE]s like you need this.",
    time_respect: "I respect your time. That's why I only need [DURATION].",
    urgency: "The longer you wait, the more [COST/PROBLEM] continues.",
    alternative: "Would it be better if I sent you something to review and we scheduled 5 minutes next week?"
  },
  send_information: {
    qualify: "Absolutely. What specific information would be most helpful?",
    commitment: "When I send this over, what happens next?",
    urgency: "Is this something you're looking to implement in [TIMEFRAME]?",
    next_step: "How about I send this over and we schedule a brief call to discuss any questions?"
  },
  no_budget: {
    reframe: "I understand budget is always a consideration. Let's step back - if budget wasn't an issue, would this be something you'd want to implement?",
    roi_focus: "Actually, most of our clients find this pays for itself within [TIMEFRAME].",
    future_planning: "When do you typically plan budgets for initiatives like this?",
    value_demonstration: "What if I could show you how to fund this from the savings it generates?"
  }
};
```

### Closing Sequences
```javascript
const closingTechniques = {
  assumptive_close: {
    text: "Great! Let's schedule a time for you to see exactly how this works for [COMPANY]. Are you better with mornings or afternoons?",
    when: "Strong interest signals, qualified prospect"
  },
  alternative_choice: {
    text: "Would Tuesday at 2 PM work better, or is Thursday at 10 AM more convenient?",
    when: "Agreement on moving forward, need to set specifics"
  },
  summary_close: {
    text: "So if I understand correctly, you're looking for [NEED_1], [NEED_2], and [NEED_3]. Our solution addresses all of these. The next step would be a brief demo to show you exactly how. Does that make sense?",
    when: "Multiple needs identified, complex solution"
  },
  urgency_close: {
    text: "Based on what you've told me, I think this could really help. I have one spot left in my calendar this week - would you like to take it?",
    when: "Interested prospect, competitive situation"
  }
};
```

## Advanced Script Features

### Dynamic Content Insertion
```javascript
const dynamicVariables = {
  company_research: {
    recent_news: "[RECENT_COMPANY_NEWS]",
    industry_trend: "[INDUSTRY_TREND]",
    competitor_mention: "[COMPETITOR_CHALLENGE]",
    growth_indicator: "[GROWTH_METRIC]"
  },
  personalization: {
    name_usage: "Use first name 2-3 times max",
    title_reference: "Acknowledge their role/expertise",
    company_specific: "Reference company size/industry",
    location_mention: "Geographic or regional references"
  }
};
```

### Conversation Branching
```javascript
const conversationPaths = {
  enthusiastic_response: {
    path: "detailed_discovery",
    script: "That's fantastic! Let me ask you a few questions to understand your specific situation...",
    next_actions: ["deeper_qualification", "pain_point_exploration"]
  },
  skeptical_response: {
    path: "credibility_building",
    script: "I understand your skepticism. Let me share how we helped [SIMILAR_COMPANY] overcome the same concerns...",
    next_actions: ["case_study", "social_proof", "small_commitment"]
  },
  neutral_response: {
    path: "curiosity_creation",
    script: "Let me ask you this - what's the biggest challenge you face with [PROBLEM_AREA]?",
    next_actions: ["problem_exploration", "solution_teasing"]
  }
};
```

### Script Performance Tracking
```javascript
const scriptMetrics = {
  engagement_indicators: [
    "Average call duration",
    "Question response rate", 
    "Interruption frequency",
    "Follow-up question count"
  ],
  conversion_metrics: [
    "Appointment setting rate",
    "Qualification success rate",
    "Objection overcome rate",
    "Call-to-close ratio"
  ],
  script_elements: [
    "Opening hook effectiveness",
    "Transition smoothness scores",
    "Closing attempt success rate",
    "Objection handling win rate"
  ]
};
```

## Script Optimization Process

### A/B Testing Framework
1. **Hypothesis Formation**: What element might improve performance
2. **Variable Isolation**: Test one element at a time
3. **Sample Size Planning**: Statistical significance requirements
4. **Performance Measurement**: Conversion rate impact analysis
5. **Implementation**: Roll out winning variations

### Script Evolution Methodology
```javascript
const scriptEvolution = {
  data_collection: {
    call_recordings: "Analyze actual conversation patterns",
    outcome_tracking: "Measure script element performance",
    feedback_gathering: "Rep and prospect feedback integration"
  },
  pattern_analysis: {
    successful_calls: "Extract winning conversation elements",
    failed_calls: "Identify problematic script sections",
    objection_patterns: "Common objection points and successful responses"
  },
  optimization_implementation: {
    incremental_changes: "Small improvements over time",
    major_revisions: "Complete script overhauls when needed",
    personalization_enhancement: "Industry/role specific variations"
  }
};
```

## Training Integration

### Script Coaching System
- **Practice Sessions**: Role-playing with script variations
- **Performance Feedback**: Real-time coaching during calls
- **Skill Development**: Conversation technique improvement
- **Confidence Building**: Repetition and mastery development

### Voice and Delivery Training
```javascript
const deliveryTechniques = {
  tonality_guidance: {
    confident: "Lower pitch, steady pace, clear articulation",
    consultative: "Slightly higher pitch, questioning inflection",
    urgent: "Faster pace, emphasis on key words",
    empathetic: "Softer tone, slower pace, understanding inflection"
  },
  pacing_instructions: {
    opening: "Slightly faster to capture attention",
    discovery: "Moderate pace for understanding",
    presentation: "Slow and clear for comprehension",
    closing: "Confident and decisive pace"
  }
};
```

## Integration with Dashboard

### Script Display Enhancement
```javascript
const scriptDisplayFeatures = {
  color_coding: {
    introduction: "Blue - rapport building phase",
    qualification: "Yellow - discovery and needs assessment",
    objection_handling: "Red - challenge/resistance points",
    closing: "Green - commitment and next steps"
  },
  interactive_elements: {
    click_to_reveal: "Show objection responses on demand",
    progress_tracking: "Visual indicator of conversation stage",
    notes_integration: "Quick notes on prospect responses",
    next_line_suggestions: "AI-powered next best response"
  }
};
```

### Real-time Script Assistance
- **Conversation Stage Detection**: Automatically highlight relevant script section
- **Response Suggestions**: AI-powered response recommendations
- **Objection Alert System**: Real-time objection handling support
- **Success Pattern Recognition**: Identify and replicate winning conversations

## Success Metrics

### Script Performance KPIs
- **Conversion Rate**: Percentage of calls leading to desired outcome
- **Engagement Score**: Call duration and interaction quality
- **Objection Overcome Rate**: Success in handling resistance
- **Script Adherence**: How closely reps follow optimized scripts

### Continuous Improvement Metrics
- **A/B Test Win Rate**: Percentage of tests showing improvement
- **Script Evolution Speed**: Time from test to implementation
- **Rep Adoption Rate**: How quickly new scripts are adopted
- **Performance Consistency**: Variation in results across team

The Script Master Agent ensures that every conversation in the Cold Calling Dashboard is optimized for maximum engagement and conversion through scientifically-tested, psychologically-sound script frameworks.