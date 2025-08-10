const express = require('express');
const router = express.Router();
const AILeadScoring = require('../services/aiLeadScoring');
const { calculateLeadScore, getLeadScoreBreakdown, getLeadScoreImprovements } = require('../services/leadScoring');

const aiScoring = new AILeadScoring();

/**
 * @swagger
 * components:
 *   schemas:
 *     LeadScore:
 *       type: object
 *       properties:
 *         baseScore:
 *           type: number
 *           description: Traditional algorithm score (0-100)
 *         aiScore:
 *           type: number
 *           description: AI-generated score (0-100)
 *         finalScore:
 *           type: number
 *           description: Combined final score (0-100)
 *         confidence:
 *           type: number
 *           description: AI confidence level (0-1)
 *         aiInsights:
 *           type: array
 *           items:
 *             type: string
 *           description: AI-generated insights about the lead
 *         buyingSignals:
 *           type: array
 *           items:
 *             type: string
 *           description: Positive signals indicating buying readiness
 *         riskFactors:
 *           type: array
 *           items:
 *             type: string
 *           description: Factors that might reduce conversion probability
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *           description: Actionable recommendations to improve lead quality
 *         personalizedApproach:
 *           type: string
 *           description: Tailored approach strategy for this lead
 */

/**
 * @swagger
 * /api/lead-scoring/analyze:
 *   post:
 *     summary: Analyze and score a single lead with AI
 *     tags: [Lead Scoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lead:
 *                 type: object
 *                 description: Lead data to analyze
 *               useAI:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to use AI enhancement
 *     responses:
 *       200:
 *         description: Lead scoring analysis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeadScore'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/analyze', async (req, res) => {
    try {
        const { lead, useAI = true } = req.body;

        if (!lead) {
            return res.status(400).json({
                error: 'Lead data is required'
            });
        }

        let result;
        
        if (useAI) {
            // Enhanced AI scoring
            result = await aiScoring.enhanceLeadScore(lead);
        } else {
            // Traditional scoring only
            const baseScore = calculateLeadScore(lead);
            const breakdown = getLeadScoreBreakdown(lead);
            const improvements = getLeadScoreImprovements(lead);
            
            result = {
                baseScore,
                finalScore: baseScore,
                breakdown,
                improvements,
                aiInsights: ['Traditional scoring used - enable AI for enhanced insights']
            };
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Lead scoring error:', error);
        res.status(500).json({
            error: 'Failed to analyze lead',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lead-scoring/batch-analyze:
 *   post:
 *     summary: Analyze and score multiple leads with AI
 *     tags: [Lead Scoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leads:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of leads to analyze
 *               useAI:
 *                 type: boolean
 *                 default: true
 *               concurrency:
 *                 type: number
 *                 default: 3
 *                 description: Number of concurrent AI requests
 *     responses:
 *       200:
 *         description: Batch scoring results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeadScore'
 *                 summary:
 *                   type: object
 *                   description: Batch analysis summary
 */
router.post('/batch-analyze', async (req, res) => {
    try {
        const { leads, useAI = true, concurrency = 3 } = req.body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({
                error: 'Array of leads is required'
            });
        }

        if (leads.length > 100) {
            return res.status(400).json({
                error: 'Maximum 100 leads per batch'
            });
        }

        let results;
        
        if (useAI) {
            // AI batch scoring
            results = await aiScoring.batchEnhanceLeadScores(leads, { concurrency });
        } else {
            // Traditional scoring
            results = leads.map(lead => ({
                baseScore: calculateLeadScore(lead),
                finalScore: calculateLeadScore(lead),
                breakdown: getLeadScoreBreakdown(lead),
                improvements: getLeadScoreImprovements(lead)
            }));
        }

        // Generate summary
        const validResults = results.filter(r => r && typeof r.finalScore === 'number');
        const avgScore = validResults.reduce((sum, r) => sum + r.finalScore, 0) / validResults.length;
        const highQuality = validResults.filter(r => r.finalScore >= 80).length;
        const mediumQuality = validResults.filter(r => r.finalScore >= 60 && r.finalScore < 80).length;

        const summary = {
            totalAnalyzed: validResults.length,
            averageScore: Math.round(avgScore * 10) / 10,
            qualityDistribution: {
                high: highQuality,
                medium: mediumQuality,
                low: validResults.length - highQuality - mediumQuality
            },
            recommendations: [
                `${highQuality} leads ready for immediate contact`,
                `Focus on ${highQuality + mediumQuality} leads with scores above 60`,
                `Average quality: ${avgScore >= 70 ? 'Good' : avgScore >= 50 ? 'Average' : 'Below Average'}`
            ]
        };

        res.json({
            success: true,
            data: {
                results,
                summary
            }
        });

    } catch (error) {
        console.error('Batch scoring error:', error);
        res.status(500).json({
            error: 'Failed to analyze leads',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lead-scoring/prioritize:
 *   post:
 *     summary: Get AI-powered lead prioritization
 *     tags: [Lead Scoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leads:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of leads to prioritize
 *     responses:
 *       200:
 *         description: Lead prioritization results
 */
router.post('/prioritize', async (req, res) => {
    try {
        const { leads } = req.body;

        if (!leads || !Array.isArray(leads)) {
            return res.status(400).json({
                error: 'Array of leads is required'
            });
        }

        const prioritization = await aiScoring.prioritizeLeads(leads);

        res.json({
            success: true,
            data: prioritization
        });

    } catch (error) {
        console.error('Prioritization error:', error);
        res.status(500).json({
            error: 'Failed to prioritize leads',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lead-scoring/outreach-suggestions:
 *   post:
 *     summary: Generate personalized outreach suggestions for a lead
 *     tags: [Lead Scoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lead:
 *                 type: object
 *                 description: Lead data
 *     responses:
 *       200:
 *         description: Personalized outreach suggestions
 */
router.post('/outreach-suggestions', async (req, res) => {
    try {
        const { lead } = req.body;

        if (!lead) {
            return res.status(400).json({
                error: 'Lead data is required'
            });
        }

        const suggestions = await aiScoring.generateOutreachSuggestions(lead);

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        console.error('Outreach suggestions error:', error);
        res.status(500).json({
            error: 'Failed to generate outreach suggestions',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lead-scoring/traditional:
 *   post:
 *     summary: Get traditional (non-AI) lead score and breakdown
 *     tags: [Lead Scoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lead:
 *                 type: object
 *                 description: Lead data to score
 *     responses:
 *       200:
 *         description: Traditional scoring results
 */
router.post('/traditional', async (req, res) => {
    try {
        const { lead } = req.body;

        if (!lead) {
            return res.status(400).json({
                error: 'Lead data is required'
            });
        }

        const score = calculateLeadScore(lead);
        const breakdown = getLeadScoreBreakdown(lead);
        const improvements = getLeadScoreImprovements(lead);

        res.json({
            success: true,
            data: {
                score,
                breakdown,
                improvements,
                grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D',
                temperature: score >= 80 ? 'Hot' : score >= 60 ? 'Warm' : 'Cold'
            }
        });

    } catch (error) {
        console.error('Traditional scoring error:', error);
        res.status(500).json({
            error: 'Failed to calculate score',
            message: error.message
        });
    }
});

module.exports = router;