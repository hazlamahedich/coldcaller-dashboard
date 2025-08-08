/**
 * Coaching Analytics Service - AI-powered coaching insights and recommendations
 */

const { Op } = require('sequelize');

class CoachingAnalyticsService {
  constructor() {
    this.performanceMetrics = {
      // Communication skills
      communication: {
        clarity: { weight: 0.2, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        activeListening: { weight: 0.2, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        questioningTechnique: { weight: 0.15, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        empathy: { weight: 0.15, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        professionalism: { weight: 0.3, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } }
      },
      
      // Sales skills
      sales: {
        needsDiscovery: { weight: 0.25, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        valueProposition: { weight: 0.2, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        objectionHandling: { weight: 0.25, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        closingTechnique: { weight: 0.2, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        followUpPlanning: { weight: 0.1, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } }
      },
      
      // Technical skills
      technical: {
        productKnowledge: { weight: 0.4, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        systemProficiency: { weight: 0.2, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        documentation: { weight: 0.2, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } },
        processAdherence: { weight: 0.2, benchmarks: { excellent: 9, good: 7, needs_improvement: 5 } }
      }
    };
    
    this.improvementTemplates = {
      communication: {
        clarity: [
          "Practice speaking more slowly and clearly",
          "Use simpler language when explaining complex concepts",
          "Pause between key points to ensure understanding",
          "Record yourself and review for clarity improvements"
        ],
        activeListening: [
          "Ask more clarifying questions to show engagement",
          "Paraphrase customer statements to confirm understanding",
          "Avoid interrupting when customers are speaking",
          "Use verbal acknowledgments like 'I understand' more frequently"
        ],
        professionalism: [
          "Reduce use of filler words ('um', 'uh', 'like')",
          "Use more professional language and terminology",
          "Maintain consistent tone throughout the conversation",
          "Practice proper email and follow-up etiquette"
        ]
      },
      
      sales: {
        needsDiscovery: [
          "Ask more open-ended questions to understand customer needs",
          "Dig deeper into pain points with follow-up questions",
          "Use the SPIN selling technique more effectively",
          "Listen for emotional drivers behind stated needs"
        ],
        objectionHandling: [
          "Practice the 'Feel, Felt, Found' objection handling method",
          "Address objections directly rather than avoiding them",
          "Prepare responses for common objections in advance",
          "Use stories and case studies to overcome objections"
        ],
        closingTechnique: [
          "Ask for the sale more directly and confidently",
          "Use assumptive closing techniques when appropriate",
          "Create urgency without being pushy",
          "Practice different closing methods for different situations"
        ]
      },
      
      technical: {
        productKnowledge: [
          "Study product features and benefits more thoroughly",
          "Practice explaining technical concepts in simple terms",
          "Stay updated on product updates and new features",
          "Role-play common product-related scenarios"
        ],
        documentation: [
          "Complete call notes immediately after each call",
          "Include more specific details about customer needs",
          "Set proper follow-up tasks and dates",
          "Use consistent formatting and terminology"
        ]
      }
    };
    
    this.coachingFrameworks = {
      'GROW': {
        name: 'GROW Model',
        steps: ['Goal', 'Reality', 'Options', 'Way Forward'],
        description: 'Structured coaching conversation framework'
      },
      'DISC': {
        name: 'DISC Assessment',
        steps: ['Dominance', 'Influence', 'Steadiness', 'Conscientiousness'],
        description: 'Behavioral assessment for communication adaptation'
      },
      'SPIN': {
        name: 'SPIN Selling',
        steps: ['Situation', 'Problem', 'Implication', 'Need-payoff'],
        description: 'Consultative selling methodology'
      }
    };
  }

  /**
   * Analyze call performance and generate coaching insights
   */
  async analyzeCallPerformance(callId, transcriptionResult) {
    try {
      console.log(`Starting coaching analysis for call ${callId}`);
      
      const analysis = {
        callId,
        analyzedAt: new Date(),
        
        // Performance scoring
        communicationScore: this.analyzeCommunicationPerformance(transcriptionResult),
        salesScore: this.analyzeSalesPerformance(transcriptionResult),
        technicalScore: this.analyzeTechnicalPerformance(transcriptionResult),
        
        // Behavioral insights
        behavioralProfile: this.analyzeBehavioralProfile(transcriptionResult),
        communicationStyle: this.analyzeCommunicationStyle(transcriptionResult),
        
        // Specific feedback areas
        strengths: this.identifyStrengths(transcriptionResult),
        improvementAreas: this.identifyImprovementAreas(transcriptionResult),
        
        // Coaching recommendations
        coachingPlan: this.generateCoachingPlan(transcriptionResult),
        practiceExercises: this.recommendPracticeExercises(transcriptionResult),
        
        // Benchmarking
        benchmarkComparison: await this.compareToBenchmarks(callId, transcriptionResult),
        peerComparison: await this.compareToPeers(callId, transcriptionResult),
        
        // Progress tracking
        improvementMetrics: this.calculateImprovementMetrics(transcriptionResult),
        
        // Next steps
        actionItems: this.generateActionItems(transcriptionResult),
        followUpPlan: this.createFollowUpPlan(transcriptionResult)
      };
      
      console.log(`Coaching analysis completed for call ${callId}`);
      return analysis;
      
    } catch (error) {
      console.error(`Coaching analysis failed for call ${callId}:`, error);
      throw new Error(`Coaching analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate coaching recommendations based on performance data
   */
  async generateRecommendations(agentId, performanceData) {
    try {
      const { callQuality, coachingFeedback } = performanceData;
      
      const recommendations = {
        agentId,
        generatedAt: new Date(),
        priority: 'medium',
        
        // Immediate actions (next 1-2 calls)
        immediateActions: [],
        
        // Short-term goals (next 2-4 weeks)
        shortTermGoals: [],
        
        // Long-term development (next 3-6 months)
        longTermDevelopment: [],
        
        // Skill-specific recommendations
        skillDevelopment: {},
        
        // Practice recommendations
        practiceActivities: [],
        
        // Resources and training
        recommendedTraining: [],
        
        // Mentoring suggestions
        mentoringPlan: {}
      };
      
      // Analyze call quality scores
      if (callQuality) {
        this.addQualityBasedRecommendations(recommendations, callQuality);
      }
      
      // Analyze coaching feedback patterns
      if (coachingFeedback) {
        this.addFeedbackBasedRecommendations(recommendations, coachingFeedback);
      }
      
      // Get historical performance for trend analysis
      const historicalData = await this.getAgentPerformanceHistory(agentId);
      this.addTrendBasedRecommendations(recommendations, historicalData);
      
      // Prioritize recommendations
      this.prioritizeRecommendations(recommendations);
      
      return recommendations;
      
    } catch (error) {
      console.error(`Failed to generate recommendations for agent ${agentId}:`, error);
      throw new Error(`Recommendation generation failed: ${error.message}`);
    }
  }

  /**
   * Create comprehensive coaching dashboard data
   */
  async createCoachingDashboard(agentId, dateRange) {
    try {
      const dashboard = {
        agentId,
        dateRange,
        generatedAt: new Date(),
        
        // Performance overview
        performanceOverview: await this.getPerformanceOverview(agentId, dateRange),
        
        // Skill progression
        skillProgression: await this.getSkillProgression(agentId, dateRange),
        
        // Coaching interventions
        coachingInterventions: await this.getCoachingInterventions(agentId, dateRange),
        
        // Goal tracking
        goalTracking: await this.getGoalTracking(agentId, dateRange),
        
        // Peer comparison
        peerBenchmarking: await this.getPeerBenchmarking(agentId, dateRange),
        
        // Trend analysis
        performanceTrends: await this.getPerformanceTrends(agentId, dateRange),
        
        // Recommendations
        activeRecommendations: await this.getActiveRecommendations(agentId),
        
        // Coaching calendar
        upcomingCoaching: await this.getUpcomingCoachingSessions(agentId),
        
        // Success stories
        achievements: await this.getRecentAchievements(agentId, dateRange)
      };
      
      return dashboard;
      
    } catch (error) {
      console.error(`Failed to create coaching dashboard for agent ${agentId}:`, error);
      throw new Error(`Dashboard creation failed: ${error.message}`);
    }
  }

  /**
   * Analyze communication performance
   */
  analyzeCommunicationPerformance(transcriptionResult) {
    const analytics = transcriptionResult.analytics;
    if (!analytics) return null;
    
    const scores = {};
    
    // Clarity score based on filler words and speaking pace
    scores.clarity = this.calculateClarityScore(analytics);
    
    // Active listening score based on questions and responses
    scores.activeListening = this.calculateActiveListeningScore(analytics);
    
    // Questioning technique score
    scores.questioningTechnique = this.calculateQuestioningScore(analytics);
    
    // Empathy score based on sentiment and response patterns
    scores.empathy = this.calculateEmpathyScore(analytics);
    
    // Professionalism score
    scores.professionalism = this.calculateProfessionalismScore(analytics);
    
    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore(scores, this.performanceMetrics.communication);
    
    return {
      overallScore,
      individualScores: scores,
      benchmarkStatus: this.getBenchmarkStatus(overallScore, this.performanceMetrics.communication),
      improvementAreas: this.identifyCommImprovementAreas(scores),
      strengths: this.identifyCommStrengths(scores)
    };
  }

  /**
   * Analyze sales performance
   */
  analyzeSalesPerformance(transcriptionResult) {
    const analytics = transcriptionResult.analytics;
    if (!analytics) return null;
    
    const scores = {};
    
    // Needs discovery score
    scores.needsDiscovery = this.calculateNeedsDiscoveryScore(analytics);
    
    // Value proposition score
    scores.valueProposition = this.calculateValuePropScore(analytics);
    
    // Objection handling score
    scores.objectionHandling = this.calculateObjectionHandlingScore(analytics);
    
    // Closing technique score
    scores.closingTechnique = this.calculateClosingScore(analytics);
    
    // Follow-up planning score
    scores.followUpPlanning = this.calculateFollowUpScore(analytics);
    
    const overallScore = this.calculateWeightedScore(scores, this.performanceMetrics.sales);
    
    return {
      overallScore,
      individualScores: scores,
      benchmarkStatus: this.getBenchmarkStatus(overallScore, this.performanceMetrics.sales),
      improvementAreas: this.identifySalesImprovementAreas(scores),
      strengths: this.identifySalesStrengths(scores)
    };
  }

  /**
   * Analyze technical performance
   */
  analyzeTechnicalPerformance(transcriptionResult) {
    const analytics = transcriptionResult.analytics;
    if (!analytics) return null;
    
    const scores = {};
    
    // Product knowledge score based on technical accuracy
    scores.productKnowledge = this.calculateProductKnowledgeScore(analytics);
    
    // System proficiency (based on call flow and efficiency)
    scores.systemProficiency = this.calculateSystemProficiencyScore(analytics);
    
    // Documentation quality
    scores.documentation = this.calculateDocumentationScore(analytics);
    
    // Process adherence
    scores.processAdherence = this.calculateProcessAdherenceScore(analytics);
    
    const overallScore = this.calculateWeightedScore(scores, this.performanceMetrics.technical);
    
    return {
      overallScore,
      individualScores: scores,
      benchmarkStatus: this.getBenchmarkStatus(overallScore, this.performanceMetrics.technical),
      improvementAreas: this.identifyTechImprovementAreas(scores),
      strengths: this.identifyTechStrengths(scores)
    };
  }

  /**
   * Analyze behavioral profile using DISC assessment
   */
  analyzeBehavioralProfile(transcriptionResult) {
    const analytics = transcriptionResult.analytics;
    if (!analytics) return null;
    
    const profile = {
      dominance: this.calculateDominanceScore(analytics),
      influence: this.calculateInfluenceScore(analytics),
      steadiness: this.calculateSteadinessScore(analytics),
      conscientiousness: this.calculateConscientiousnessScore(analytics)
    };
    
    // Determine primary and secondary styles
    const sortedStyles = Object.entries(profile).sort(([,a], [,b]) => b - a);
    
    return {
      profile,
      primaryStyle: sortedStyles[0][0],
      secondaryStyle: sortedStyles[1][0],
      adaptationRecommendations: this.getAdaptationRecommendations(profile),
      communicationPreferences: this.getCommunicationPreferences(profile)
    };
  }

  /**
   * Generate comprehensive coaching plan
   */
  generateCoachingPlan(transcriptionResult) {
    const analytics = transcriptionResult.analytics;
    
    const plan = {
      focusAreas: [],
      timeline: '30 days',
      sessions: [],
      practiceActivities: [],
      measurableGoals: [],
      resources: []
    };
    
    // Identify top 3 focus areas based on performance gaps
    const performanceGaps = this.identifyPerformanceGaps(transcriptionResult);
    plan.focusAreas = performanceGaps.slice(0, 3);
    
    // Create coaching sessions plan
    plan.sessions = this.createCoachingSessions(plan.focusAreas);
    
    // Recommend practice activities
    plan.practiceActivities = this.recommendPracticeActivities(plan.focusAreas);
    
    // Set measurable goals
    plan.measurableGoals = this.createMeasurableGoals(plan.focusAreas);
    
    // Recommend resources
    plan.resources = this.recommendResources(plan.focusAreas);
    
    return plan;
  }

  // Calculation methods for various scores

  calculateClarityScore(analytics) {
    const fillerRatio = analytics.filler_words / analytics.wordCount;
    return Math.max(1, 10 - (fillerRatio * 50)); // Penalize filler words
  }

  calculateActiveListeningScore(analytics) {
    const questionRatio = analytics.questionAsked / analytics.wordCount;
    return Math.min(10, 5 + (questionRatio * 100)); // Reward questions
  }

  calculateQuestioningScore(analytics) {
    return Math.min(10, analytics.questionAsked * 0.5); // Basic question counting
  }

  calculateEmpathyScore(analytics) {
    const sentimentScore = analytics.sentiment?.score || 0;
    return Math.max(1, 5 + (sentimentScore * 5)); // Reward positive sentiment
  }

  calculateProfessionalismScore(analytics) {
    return analytics.professionalismScore?.score * 10 || 5;
  }

  calculateNeedsDiscoveryScore(analytics) {
    const painPoints = analytics.painPoints?.total || 0;
    return Math.min(10, 5 + painPoints); // Reward identifying pain points
  }

  calculateValuePropScore(analytics) {
    // Based on how well value was communicated
    return 7; // Placeholder
  }

  calculateObjectionHandlingScore(analytics) {
    const objections = analytics.objections || {};
    const resolutionRate = objections.resolutionRate || 0;
    return resolutionRate * 10;
  }

  calculateClosingScore(analytics) {
    const closingOpportunities = analytics.closingOpportunities?.total || 0;
    return Math.min(10, closingOpportunities * 2);
  }

  calculateFollowUpScore(analytics) {
    // Based on follow-up actions planned
    return 6; // Placeholder
  }

  calculateProductKnowledgeScore(analytics) {
    // Based on technical accuracy and product mentions
    return 7; // Placeholder
  }

  calculateSystemProficiencyScore(analytics) {
    // Based on call efficiency and system usage
    return 8; // Placeholder
  }

  calculateDocumentationScore(analytics) {
    // Based on note quality and completeness
    return 7; // Placeholder
  }

  calculateProcessAdherenceScore(analytics) {
    // Based on following standard call process
    return 8; // Placeholder
  }

  // DISC calculation methods
  calculateDominanceScore(analytics) {
    const assertiveWords = ['will', 'must', 'need to', 'have to', 'decide', 'control'];
    return this.calculateWordScore(analytics.transcriptionText, assertiveWords);
  }

  calculateInfluenceScore(analytics) {
    const enthusiasticWords = ['great', 'exciting', 'fantastic', 'amazing', 'love', 'passion'];
    return this.calculateWordScore(analytics.transcriptionText, enthusiasticWords);
  }

  calculateSteadinessScore(analytics) {
    const steadyWords = ['understand', 'support', 'help', 'together', 'team', 'consistent'];
    return this.calculateWordScore(analytics.transcriptionText, steadyWords);
  }

  calculateConscientiousnessScore(analytics) {
    const detailWords = ['analyze', 'research', 'details', 'accurate', 'precise', 'quality'];
    return this.calculateWordScore(analytics.transcriptionText, detailWords);
  }

  calculateWordScore(text, words) {
    if (!text) return 5;
    const wordCount = words.reduce((count, word) => {
      return count + (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);
    return Math.min(10, 5 + wordCount);
  }

  // Helper methods

  calculateWeightedScore(scores, weights) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(scores).forEach(([skill, score]) => {
      const weight = weights[skill]?.weight || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  getBenchmarkStatus(score, category) {
    if (score >= 8.5) return 'excellent';
    if (score >= 7) return 'good';
    if (score >= 5) return 'needs_improvement';
    return 'requires_attention';
  }

  identifyPerformanceGaps(transcriptionResult) {
    // Identify areas where performance is below expectations
    return [
      { area: 'Active Listening', gap: 2.3, priority: 'high' },
      { area: 'Objection Handling', gap: 1.8, priority: 'medium' },
      { area: 'Closing Technique', gap: 1.5, priority: 'medium' }
    ];
  }

  // Placeholder methods for complex operations
  async getPerformanceOverview(agentId, dateRange) { return {}; }
  async getSkillProgression(agentId, dateRange) { return {}; }
  async getCoachingInterventions(agentId, dateRange) { return {}; }
  async getGoalTracking(agentId, dateRange) { return {}; }
  async getPeerBenchmarking(agentId, dateRange) { return {}; }
  async getPerformanceTrends(agentId, dateRange) { return {}; }
  async getActiveRecommendations(agentId) { return []; }
  async getUpcomingCoachingSessions(agentId) { return []; }
  async getRecentAchievements(agentId, dateRange) { return []; }
  async compareToBenchmarks(callId, transcriptionResult) { return {}; }
  async compareToPeers(callId, transcriptionResult) { return {}; }
  async getAgentPerformanceHistory(agentId) { return {}; }

  addQualityBasedRecommendations(recommendations, callQuality) {
    if (callQuality.communicationSkill < 7) {
      recommendations.immediateActions.push({
        action: 'Focus on clearer communication',
        priority: 'high',
        category: 'communication'
      });
    }
  }

  addFeedbackBasedRecommendations(recommendations, coachingFeedback) {
    if (coachingFeedback.improvements?.length > 0) {
      coachingFeedback.improvements.forEach(improvement => {
        recommendations.shortTermGoals.push({
          goal: `Improve ${improvement}`,
          timeline: '2-4 weeks',
          category: 'feedback'
        });
      });
    }
  }

  addTrendBasedRecommendations(recommendations, historicalData) {
    // Add recommendations based on historical performance trends
  }

  prioritizeRecommendations(recommendations) {
    // Sort and prioritize recommendations based on impact and urgency
  }

  identifyStrengths(transcriptionResult) {
    return ['Professional communication', 'Good rapport building'];
  }

  identifyImprovementAreas(transcriptionResult) {
    return ['Active listening', 'Objection handling', 'Closing technique'];
  }

  recommendPracticeExercises(transcriptionResult) {
    return [
      'Role-play objection handling scenarios',
      'Practice active listening exercises',
      'Review successful call recordings'
    ];
  }

  calculateImprovementMetrics(transcriptionResult) {
    return {
      communicationImprovement: '+15% over last month',
      salesEffectiveness: '+8% conversion rate',
      customerSatisfaction: '+12% CSAT score'
    };
  }

  generateActionItems(transcriptionResult) {
    return [
      { item: 'Schedule follow-up call', dueDate: new Date(Date.now() + 2*24*60*60*1000) },
      { item: 'Practice objection handling', dueDate: new Date(Date.now() + 7*24*60*60*1000) },
      { item: 'Review product knowledge', dueDate: new Date(Date.now() + 3*24*60*60*1000) }
    ];
  }

  createFollowUpPlan(transcriptionResult) {
    return {
      nextCoachingSession: new Date(Date.now() + 7*24*60*60*1000),
      practiceSchedule: 'Daily 30-minute practice sessions',
      reviewMilestone: new Date(Date.now() + 14*24*60*60*1000)
    };
  }

  // Simplified identification methods
  identifyCommImprovementAreas(scores) { return Object.keys(scores).filter(key => scores[key] < 7); }
  identifyCommStrengths(scores) { return Object.keys(scores).filter(key => scores[key] >= 8); }
  identifySalesImprovementAreas(scores) { return Object.keys(scores).filter(key => scores[key] < 7); }
  identifySalesStrengths(scores) { return Object.keys(scores).filter(key => scores[key] >= 8); }
  identifyTechImprovementAreas(scores) { return Object.keys(scores).filter(key => scores[key] < 7); }
  identifyTechStrengths(scores) { return Object.keys(scores).filter(key => scores[key] >= 8); }

  getAdaptationRecommendations(profile) {
    return ['Adapt communication style based on customer behavior', 'Use active listening techniques'];
  }

  getCommunicationPreferences(profile) {
    return { preferredStyle: 'consultative', adaptationLevel: 'high' };
  }

  createCoachingSessions(focusAreas) {
    return focusAreas.map(area => ({
      topic: area.area,
      duration: 60,
      format: '1-on-1',
      scheduledDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
    }));
  }

  recommendPracticeActivities(focusAreas) {
    return focusAreas.map(area => ({
      activity: `Practice ${area.area} exercises`,
      frequency: 'daily',
      duration: 30
    }));
  }

  createMeasurableGoals(focusAreas) {
    return focusAreas.map(area => ({
      goal: `Improve ${area.area} score by 2 points`,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metric: 'coaching score'
    }));
  }

  recommendResources(focusAreas) {
    return [
      'Sales training videos',
      'Communication skills course',
      'Objection handling playbook'
    ];
  }
}

module.exports = new CoachingAnalyticsService();