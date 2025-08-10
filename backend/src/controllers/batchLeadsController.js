const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const LLMDataParser = require('../services/llmDataParser');
const leadService = require('../services/leadsService');
const AILeadScoring = require('../services/aiLeadScoring');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/batch/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'batch-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow most common data formats
        const allowedTypes = [
            'text/csv',
            'application/json',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/xml',
            'application/xml'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file format. Please use CSV, JSON, TXT, Excel, or XML files.'));
        }
    }
});

class BatchLeadsController {
    constructor() {
        this.llmParser = new LLMDataParser();
        this.aiScoring = new AILeadScoring();
        this.activeBatches = new Map(); // Track active batch operations
    }

    /**
     * Upload and analyze file for batch processing
     */
    async uploadFile(req, res) {
        try {
            upload.single('file')(req, res, async (err) => {
                if (err) {
                    return res.status(400).json({
                        error: 'File upload failed',
                        message: err.message
                    });
                }

                if (!req.file) {
                    return res.status(400).json({
                        error: 'No file uploaded'
                    });
                }

                const filePath = req.file.path;
                const batchId = req.file.filename.replace(path.extname(req.file.filename), '');

                try {
                    // Read file content
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    
                    // Analyze data format
                    const analysis = await this.llmParser.analyzeDataFormat(fileContent);
                    
                    // Store batch info
                    this.activeBatches.set(batchId, {
                        id: batchId,
                        filename: req.file.originalname,
                        filePath: filePath,
                        status: 'analyzed',
                        analysis: analysis,
                        uploadedAt: new Date(),
                        processedCount: 0,
                        totalCount: analysis.estimatedRecords
                    });

                    res.json({
                        batchId,
                        filename: req.file.originalname,
                        fileSize: req.file.size,
                        analysis,
                        message: 'File uploaded and analyzed successfully'
                    });

                } catch (error) {
                    console.error('File analysis error:', error);
                    res.status(500).json({
                        error: 'Failed to analyze file',
                        message: error.message
                    });
                }
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                error: 'Upload failed',
                message: error.message
            });
        }
    }

    /**
     * Preview parsed data before processing
     */
    async previewBatch(req, res) {
        try {
            const { batchId } = req.params;
            const batch = this.activeBatches.get(batchId);

            if (!batch) {
                return res.status(404).json({
                    error: 'Batch not found'
                });
            }

            const fileContent = await fs.readFile(batch.filePath, 'utf-8');
            
            // Parse a sample of the data for preview
            const sampleData = fileContent.substring(0, 2000); // First 2KB for preview
            const previewLeads = await this.llmParser.parseData(sampleData, batch.analysis.format);

            res.json({
                batchId,
                filename: batch.filename,
                analysis: batch.analysis,
                preview: previewLeads.slice(0, 5), // Show first 5 leads
                totalPreview: previewLeads.length,
                estimatedTotal: batch.analysis.estimatedRecords
            });

        } catch (error) {
            console.error('Preview error:', error);
            res.status(500).json({
                error: 'Failed to generate preview',
                message: error.message
            });
        }
    }

    /**
     * Process the batch and import leads
     */
    async processBatch(req, res) {
        try {
            const { batchId } = req.params;
            const { skipDuplicates = true, updateExisting = false, enableAIScoring = true } = req.body;
            
            const batch = this.activeBatches.get(batchId);

            if (!batch) {
                return res.status(404).json({
                    error: 'Batch not found'
                });
            }

            // Update batch status
            batch.status = 'processing';
            batch.processedCount = 0;
            batch.errors = [];
            batch.duplicates = [];
            batch.processed = [];

            // Start processing in background
            this.processInBackground(batch, { skipDuplicates, updateExisting, enableAIScoring });

            res.json({
                batchId,
                status: 'processing',
                message: 'Batch processing started'
            });

        } catch (error) {
            console.error('Process error:', error);
            res.status(500).json({
                error: 'Failed to start processing',
                message: error.message
            });
        }
    }

    /**
     * Get batch processing status
     */
    async getBatchStatus(req, res) {
        try {
            const { batchId } = req.params;
            const batch = this.activeBatches.get(batchId);

            if (!batch) {
                return res.status(404).json({
                    error: 'Batch not found'
                });
            }

            res.json({
                batchId,
                filename: batch.filename,
                status: batch.status,
                processedCount: batch.processedCount,
                totalCount: batch.totalCount,
                errors: batch.errors || [],
                duplicates: batch.duplicates || [],
                progress: batch.totalCount > 0 ? (batch.processedCount / batch.totalCount * 100).toFixed(2) : 0,
                aiScoringProgress: batch.aiScoringProgress || 0,
                aiScoringResults: batch.aiScoringResults?.length || 0,
                summary: batch.summary || null
            });

        } catch (error) {
            console.error('Status error:', error);
            res.status(500).json({
                error: 'Failed to get status',
                message: error.message
            });
        }
    }

    /**
     * Get list of active and completed batches
     */
    async listBatches(req, res) {
        try {
            const batches = Array.from(this.activeBatches.values()).map(batch => ({
                id: batch.id,
                filename: batch.filename,
                status: batch.status,
                processedCount: batch.processedCount,
                totalCount: batch.totalCount,
                uploadedAt: batch.uploadedAt,
                progress: batch.totalCount > 0 ? (batch.processedCount / batch.totalCount * 100).toFixed(2) : 0
            }));

            res.json({
                batches: batches.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
            });

        } catch (error) {
            console.error('List error:', error);
            res.status(500).json({
                error: 'Failed to list batches',
                message: error.message
            });
        }
    }

    /**
     * Process batch in background
     */
    async processInBackground(batch, options) {
        try {
            const fileContent = await fs.readFile(batch.filePath, 'utf-8');
            
            // Parse all data using LLM
            const parsedLeads = await this.llmParser.parseData(fileContent, batch.analysis.format);
            
            batch.totalCount = parsedLeads.length;
            batch.aiScoringResults = [];

            // AI scoring phase (if enabled)
            if (options.enableAIScoring && parsedLeads.length > 0) {
                batch.status = 'ai_scoring';
                try {
                    console.log(`Starting AI scoring for ${parsedLeads.length} leads...`);
                    
                    // Process leads in smaller batches for AI scoring
                    const scoringResults = await this.aiScoring.batchEnhanceLeadScores(
                        parsedLeads,
                        {
                            concurrency: 2, // Reduce concurrency to avoid rate limits
                            includeProgressCallback: (processed, total) => {
                                batch.aiScoringProgress = Math.round((processed / total) * 100);
                            }
                        }
                    );
                    
                    // Apply AI scores to leads
                    for (let i = 0; i < parsedLeads.length; i++) {
                        if (scoringResults[i] && scoringResults[i].finalScore) {
                            parsedLeads[i].score = scoringResults[i].finalScore;
                            parsedLeads[i].aiInsights = scoringResults[i].aiInsights;
                            parsedLeads[i].buyingSignals = scoringResults[i].buyingSignals;
                            parsedLeads[i].riskFactors = scoringResults[i].riskFactors;
                            parsedLeads[i].personalizedApproach = scoringResults[i].personalizedApproach;
                            batch.aiScoringResults.push(scoringResults[i]);
                        }
                    }
                    
                    console.log(`AI scoring completed for ${scoringResults.length} leads`);
                } catch (error) {
                    console.error('AI scoring error:', error);
                    batch.errors.push({
                        error: `AI scoring failed: ${error.message}`,
                        type: 'ai_scoring_error'
                    });
                }
            }

            batch.status = 'processing_leads';

            // Process each lead
            for (let i = 0; i < parsedLeads.length; i++) {
                try {
                    const lead = parsedLeads[i];
                    
                    // Check for duplicates if requested
                    if (options.skipDuplicates) {
                        const existingLead = await leadService.findDuplicates(lead);
                        if (existingLead.length > 0) {
                            if (options.updateExisting) {
                                // Update existing lead with AI enhancements
                                const updatedLead = await leadService.updateLead(existingLead[0].id, lead);
                                batch.processed.push({ 
                                    action: 'updated', 
                                    lead: updatedLead,
                                    aiEnhanced: !!lead.score 
                                });
                            } else {
                                // Skip duplicate
                                batch.duplicates.push(lead);
                            }
                            continue;
                        }
                    }

                    // Create new lead with AI enhancements
                    const createdLead = await leadService.createLead(lead);
                    batch.processed.push({ 
                        action: 'created', 
                        lead: createdLead,
                        aiEnhanced: !!lead.score 
                    });
                    
                } catch (error) {
                    batch.errors.push({
                        lead: parsedLeads[i],
                        error: error.message
                    });
                }

                batch.processedCount = i + 1;
            }

            // Generate batch summary with AI insights
            if (options.enableAIScoring && batch.aiScoringResults.length > 0) {
                batch.summary = await this.generateBatchSummary(batch.aiScoringResults, batch.processed);
            }

            batch.status = 'completed';
            console.log(`Batch ${batch.id} processing completed: ${batch.processed.length} leads processed`);

            // Clean up file after processing
            setTimeout(async () => {
                try {
                    await fs.unlink(batch.filePath);
                } catch (error) {
                    console.error('Failed to clean up file:', error);
                }
            }, 3600000); // Clean up after 1 hour

        } catch (error) {
            console.error('Background processing error:', error);
            batch.status = 'failed';
            batch.errors.push({
                error: error.message,
                type: 'processing_error'
            });
        }
    }

    /**
     * Generate AI-powered batch summary
     */
    async generateBatchSummary(aiResults, processedLeads) {
        try {
            const avgScore = aiResults.reduce((sum, r) => sum + (r.finalScore || 0), 0) / aiResults.length;
            const highQualityLeads = aiResults.filter(r => r.finalScore >= 80).length;
            const mediumQualityLeads = aiResults.filter(r => r.finalScore >= 60 && r.finalScore < 80).length;
            
            // Collect common buying signals and insights
            const allBuyingSignals = aiResults.flatMap(r => r.buyingSignals || []);
            const allRiskFactors = aiResults.flatMap(r => r.riskFactors || []);
            const allInsights = aiResults.flatMap(r => r.aiInsights || []);
            
            return {
                totalLeads: processedLeads.length,
                averageScore: Math.round(avgScore * 10) / 10,
                qualityDistribution: {
                    high: highQualityLeads,
                    medium: mediumQualityLeads,
                    low: aiResults.length - highQualityLeads - mediumQualityLeads
                },
                topBuyingSignals: this.getTopOccurrences(allBuyingSignals, 5),
                commonRiskFactors: this.getTopOccurrences(allRiskFactors, 3),
                keyInsights: this.getTopOccurrences(allInsights, 5),
                recommendations: [
                    `${highQualityLeads} high-quality leads ready for immediate contact`,
                    `Focus on leads with scores above ${avgScore.toFixed(0)} for best results`,
                    `Common themes: ${this.getTopOccurrences(allBuyingSignals, 2).join(', ')}`
                ]
            };
        } catch (error) {
            console.error('Summary generation error:', error);
            return {
                totalLeads: processedLeads.length,
                error: 'Failed to generate AI summary'
            };
        }
    }

    /**
     * Get top occurrences from array
     */
    getTopOccurrences(array, limit = 5) {
        const counts = {};
        array.forEach(item => {
            if (typeof item === 'string') {
                counts[item] = (counts[item] || 0) + 1;
            }
        });
        
        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([item]) => item);
    }

    /**
     * Delete a batch
     */
    async deleteBatch(req, res) {
        try {
            const { batchId } = req.params;
            const batch = this.activeBatches.get(batchId);

            if (!batch) {
                return res.status(404).json({
                    error: 'Batch not found'
                });
            }

            // Clean up file
            try {
                await fs.unlink(batch.filePath);
            } catch (error) {
                console.error('Failed to delete file:', error);
            }

            // Remove from active batches
            this.activeBatches.delete(batchId);

            res.json({
                message: 'Batch deleted successfully'
            });

        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({
                error: 'Failed to delete batch',
                message: error.message
            });
        }
    }
}

module.exports = new BatchLeadsController();