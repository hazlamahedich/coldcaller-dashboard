const { GoogleGenerativeAI } = require('@google/generative-ai');
const { calculateLeadScore } = require('./leadScoring');

class AILeadScoring {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    /**
     * Enhance lead scoring with AI analysis
     * @param {Object} lead - Lead data
     * @returns {Promise<Object>} Enhanced scoring data
     */
    async enhanceLeadScore(lead) {
        try {
            // Get base score from traditional algorithm
            const baseScore = calculateLeadScore(lead);
            
            // Get AI analysis
            const aiAnalysis = await this.analyzeLeadWithAI(lead);
            
            // Combine scores intelligently
            const enhancedScore = this.combineScores(baseScore, aiAnalysis);
            
            return {
                baseScore,
                aiScore: aiAnalysis.score,
                finalScore: enhancedScore.final,
                confidence: aiAnalysis.confidence,
                aiInsights: aiAnalysis.insights,
                scoringFactors: enhancedScore.factors,
                recommendations: aiAnalysis.recommendations,
                buyingSignals: aiAnalysis.buyingSignals,
                riskFactors: aiAnalysis.riskFactors,
                bestContactTime: aiAnalysis.bestContactTime,
                personalizedApproach: aiAnalysis.personalizedApproach
            };
        } catch (error) {
            console.error('AI lead scoring error:', error);
            // Fallback to traditional scoring
            return {
                baseScore: calculateLeadScore(lead),
                finalScore: calculateLeadScore(lead),
                aiScore: null,
                confidence: 0,
                aiInsights: ['AI analysis unavailable - using traditional scoring'],
                error: error.message
            };
        }
    }

    /**
     * Analyze lead with AI for intelligent scoring
     */
    async analyzeLeadWithAI(lead) {
        const prompt = this.buildScoringPrompt(lead);
        
        const result = await this.model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2000,
                responseMimeType: 'application/json'
            }
        });

        const response = JSON.parse(result.response.text());
        return this.validateAIResponse(response);
    }

    /**
     * Build comprehensive scoring prompt for AI
     */
    buildScoringPrompt(lead) {
        const leadData = JSON.stringify(lead, null, 2);
        
        return `You are an expert B2B sales lead scoring analyst. Analyze this lead and provide intelligent scoring insights.

Lead Data:
${leadData}

Provide a comprehensive analysis in the following JSON format:
{
  "score": <number 0-100>,
  "confidence": <number 0-1>,
  "insights": [
    "<key insight about lead quality>",
    "<another important insight>"
  ],
  "buyingSignals": [
    "<positive signal indicating readiness to buy>",
    "<another buying signal>"
  ],
  "riskFactors": [
    "<factor that might reduce conversion probability>",
    "<another risk factor>"
  ],
  "recommendations": [
    "<specific action to improve lead quality>",
    "<another recommendation>"
  ],
  "bestContactTime": "<suggested time/day to contact>",
  "personalizedApproach": "<tailored approach strategy>",
  "industryContext": "<industry-specific insights>",
  "companyMaturity": "<assessment of company maturity and decision-making>",
  "urgencyIndicators": [
    "<signs of immediate need>",
    "<urgency signals>"
  ],
  "competitiveAdvantage": "<how to position against competitors>",
  "budgetIndicators": "<signals about budget availability>",
  "decisionMakingProcess": "<assessment of their buying process>"
}

Scoring Guidelines:
- 90-100: Exceptional leads with strong buying signals, decision-maker access, and clear need
- 80-89: High-quality leads with good potential but may need nurturing
- 70-79: Solid leads with moderate potential, worth pursuing
- 60-69: Average leads that need qualification and development
- 50-59: Below-average leads with significant gaps
- 0-49: Poor leads with major issues or misalignment

Consider:
1. Industry trends and market conditions
2. Company growth stage and funding status
3. Technology stack and modernization needs
4. Competitive landscape and urgency
5. Budget indicators and procurement processes
6. Seasonal factors and business cycles
7. Decision-maker access and authority
8. Previous interaction quality and engagement
9. Company culture and communication preferences
10. Timing indicators and project readiness

Be specific and actionable in your recommendations.`;
    }

    /**
     * Validate and clean AI response
     */
    validateAIResponse(response) {
        const validated = {
            score: Math.max(0, Math.min(100, response.score || 50)),
            confidence: Math.max(0, Math.min(1, response.confidence || 0.5)),
            insights: Array.isArray(response.insights) ? response.insights.slice(0, 5) : [],
            buyingSignals: Array.isArray(response.buyingSignals) ? response.buyingSignals.slice(0, 5) : [],
            riskFactors: Array.isArray(response.riskFactors) ? response.riskFactors.slice(0, 5) : [],
            recommendations: Array.isArray(response.recommendations) ? response.recommendations.slice(0, 5) : [],
            bestContactTime: response.bestContactTime || 'Business hours',
            personalizedApproach: response.personalizedApproach || 'Professional approach',
            industryContext: response.industryContext || 'Standard industry approach',
            companyMaturity: response.companyMaturity || 'Unknown maturity level',
            urgencyIndicators: Array.isArray(response.urgencyIndicators) ? response.urgencyIndicators : [],
            competitiveAdvantage: response.competitiveAdvantage || 'Focus on unique value proposition',
            budgetIndicators: response.budgetIndicators || 'Budget status unknown',
            decisionMakingProcess: response.decisionMakingProcess || 'Standard B2B process'
        };

        return validated;
    }

    /**
     * Intelligently combine traditional and AI scores
     */
    combineScores(baseScore, aiAnalysis) {
        const aiWeight = aiAnalysis.confidence;
        const baseWeight = 1 - aiWeight;
        
        // Weighted average with AI confidence as the weight
        let combinedScore = (baseScore * baseWeight) + (aiAnalysis.score * aiWeight);
        
        // Apply AI-specific adjustments
        const adjustments = this.calculateAIAdjustments(aiAnalysis);
        combinedScore += adjustments.total;
        
        // Ensure score stays within bounds
        const finalScore = Math.max(0, Math.min(100, Math.round(combinedScore)));
        
        return {
            final: finalScore,
            factors: {
                baseScore: baseScore,
                aiScore: aiAnalysis.score,
                aiConfidence: aiAnalysis.confidence,
                buyingSignalsBonus: adjustments.buyingSignals,
                riskPenalty: adjustments.riskPenalty,
                urgencyBonus: adjustments.urgency,
                industryBonus: adjustments.industry
            }
        };
    }

    /**
     * Calculate AI-specific score adjustments
     */
    calculateAIAdjustments(aiAnalysis) {
        let buyingSignals = Math.min(aiAnalysis.buyingSignals.length * 2, 8);
        let riskPenalty = Math.min(aiAnalysis.riskFactors.length * -3, -12);
        let urgency = Math.min(aiAnalysis.urgencyIndicators.length * 3, 10);
        let industry = 0;
        
        // Industry-specific bonuses
        if (aiAnalysis.industryContext && aiAnalysis.industryContext.toLowerCase().includes('growing')) {
            industry += 3;
        }
        if (aiAnalysis.budgetIndicators && aiAnalysis.budgetIndicators.toLowerCase().includes('approved')) {
            industry += 5;
        }
        
        return {
            buyingSignals,
            riskPenalty,
            urgency,
            industry,
            total: buyingSignals + riskPenalty + urgency + industry
        };
    }

    /**
     * Batch process multiple leads with AI scoring
     */
    async batchEnhanceLeadScores(leads, options = {}) {
        const { concurrency = 3, includeProgressCallback } = options;
        const results = [];
        
        // Process leads in batches to avoid API rate limits
        for (let i = 0; i < leads.length; i += concurrency) {
            const batch = leads.slice(i, i + concurrency);
            
            const batchPromises = batch.map(async (lead) => {
                try {
                    return await this.enhanceLeadScore(lead);
                } catch (error) {
                    return {
                        baseScore: calculateLeadScore(lead),
                        finalScore: calculateLeadScore(lead),
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
            
            // Progress callback
            if (includeProgressCallback) {
                includeProgressCallback(Math.min(i + concurrency, leads.length), leads.length);
            }
            
            // Rate limiting - small delay between batches
            if (i + concurrency < leads.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        return results;
    }

    /**
     * Get AI-powered lead prioritization
     */
    async prioritizeLeads(leads) {
        try {
            const prompt = `Analyze and prioritize these leads based on conversion probability and business value:

Leads Summary:
${leads.slice(0, 20).map((lead, i) => `${i + 1}. ${lead.name || 'Unknown'} at ${lead.company || 'Unknown'} - ${lead.industry || 'Unknown'} (Score: ${lead.finalScore || lead.score || 'N/A'})`).join('\n')}

Return a JSON array with prioritization:
[
  {
    "leadIndex": <0-based index>,
    "priority": <1-5 where 1 is highest>,
    "reasoning": "<why this priority>",
    "urgency": "<high/medium/low>",
    "expectedValue": "<estimated deal value>",
    "conversionProbability": <0-1>
  }
]

Focus on leads with:
- High conversion probability
- Large deal potential  
- Time-sensitive opportunities
- Strong buying signals`;

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
            });

            return JSON.parse(result.response.text());
        } catch (error) {
            console.error('Lead prioritization error:', error);
            return leads.map((lead, index) => ({
                leadIndex: index,
                priority: Math.ceil((lead.finalScore || lead.score || 50) / 20),
                reasoning: 'Default scoring-based prioritization',
                urgency: lead.finalScore > 80 ? 'high' : lead.finalScore > 60 ? 'medium' : 'low'
            }));
        }
    }

    /**
     * Generate personalized outreach suggestions
     */
    async generateOutreachSuggestions(lead) {
        try {
            const prompt = `Create personalized outreach suggestions for this lead:

Lead: ${JSON.stringify(lead, null, 2)}

Provide specific, actionable outreach strategies in JSON format:
{
  "emailSubjects": ["<compelling subject line 1>", "<subject line 2>"],
  "keyMessages": ["<main value proposition>", "<secondary message>"],
  "painPoints": ["<likely pain point 1>", "<pain point 2>"],
  "valuePropositions": ["<specific value prop 1>", "<value prop 2>"],
  "socialMediaApproach": "<LinkedIn/social strategy>",
  "callScript": "<opening line for cold call>",
  "followUpSequence": ["<day 3 follow-up>", "<week 1 follow-up>"],
  "contentRecommendations": ["<relevant content to share>"],
  "bestChannels": ["<email/phone/linkedin priority order>"],
  "timingRecommendations": "<best days/times to contact>"
}`;

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 1000 }
            });

            return JSON.parse(result.response.text());
        } catch (error) {
            console.error('Outreach suggestions error:', error);
            return {
                emailSubjects: ['Following up on our conversation', 'Quick question about your priorities'],
                keyMessages: ['Value proposition for your industry', 'How we can help solve your challenges'],
                bestChannels: ['email', 'phone', 'linkedin']
            };
        }
    }
}

module.exports = AILeadScoring;