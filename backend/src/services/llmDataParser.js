const llmService = require('./llmService');

class LLMDataParser {
    constructor() {
        // Use the centralized LLM service
        this.llmService = llmService;
    }

    /**
     * Parse any format of data into structured lead format using LLM
     * @param {string} rawData - Raw data in any format (CSV, JSON, plain text, etc.)
     * @param {string} format - File format hint (optional)
     * @returns {Promise<Array>} - Array of structured lead objects
     */
    async parseData(rawData, format = 'unknown') {
        try {
            const result = await this.llmService.parseData(rawData, format, {
                temperature: 0.1,
                maxTokens: 4000,
                logPrompt: false,
                logResponse: false,
                useCase: 'data_parsing'
            });

            return this.extractAndValidateLeads(result.response);

        } catch (error) {
            console.error('LLM parsing error:', error);
            throw new Error(`Failed to parse data: ${error.message}`);
        }
    }

    /**
     * Build the parsing prompt based on data and format
     */
    buildParsingPrompt(rawData, format) {
        return `You are a data parsing expert. Extract lead information from any format and return structured JSON data.

Please parse the following ${format} data and extract lead information. 

Convert each record into a JSON object with these fields:
- name: Full name of the person/contact
- company: Company name
- phone: Phone number (clean format)
- email: Email address
- title: Job title/position
- industry: Industry/sector
- address: Full address if available
- notes: Any additional relevant information
- tags: Array of relevant tags
- source: Data source or origin
- priority: Priority level (high/medium/low)

Rules:
1. Return ONLY a JSON array of objects
2. Standardize phone numbers to E.164 format when possible
3. Clean and validate email addresses
4. Infer industry from company names when not explicit
5. Extract any relevant tags from the data context
6. Set reasonable priority based on data completeness
7. Handle missing fields gracefully (use null or appropriate defaults)
8. Remove duplicates within the dataset
9. Maintain data integrity and accuracy

Data to parse:
\`\`\`
${rawData}
\`\`\`

Return only the JSON array, no explanation or additional text.`;
    }

    /**
     * Extract and validate leads from LLM response
     */
    extractAndValidateLeads(content) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No valid JSON array found in response');
            }

            const leads = JSON.parse(jsonMatch[0]);
            
            if (!Array.isArray(leads)) {
                throw new Error('Response is not an array');
            }

            // Validate and clean each lead
            return leads.map(lead => this.validateLead(lead)).filter(Boolean);

        } catch (error) {
            console.error('Failed to extract leads from LLM response:', error);
            throw new Error('Invalid response format from LLM');
        }
    }

    /**
     * Validate and clean individual lead data
     */
    validateLead(lead) {
        try {
            const cleanedLead = {
                name: this.cleanString(lead.name),
                company: this.cleanString(lead.company),
                phone: this.cleanPhone(lead.phone),
                email: this.cleanEmail(lead.email),
                title: this.cleanString(lead.title),
                industry: this.cleanString(lead.industry),
                address: this.cleanString(lead.address),
                notes: this.cleanString(lead.notes),
                tags: Array.isArray(lead.tags) ? lead.tags.filter(Boolean) : [],
                source: lead.source || 'batch_upload',
                priority: this.validatePriority(lead.priority),
                status: 'new',
                createdAt: new Date()
            };

            // Must have at least name or company and some contact info
            if ((!cleanedLead.name && !cleanedLead.company) || 
                (!cleanedLead.phone && !cleanedLead.email)) {
                return null;
            }

            return cleanedLead;

        } catch (error) {
            console.error('Error validating lead:', error);
            return null;
        }
    }

    /**
     * Clean and validate string fields
     */
    cleanString(value) {
        if (!value || typeof value !== 'string') return null;
        return value.trim().replace(/\s+/g, ' ') || null;
    }

    /**
     * Clean and validate phone numbers
     */
    cleanPhone(phone) {
        if (!phone) return null;
        
        // Remove all non-digit characters
        const digits = phone.toString().replace(/\D/g, '');
        
        if (digits.length < 10) return null;
        
        // Format as E.164 if possible
        if (digits.length === 10) {
            return `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }
        
        return `+${digits}`;
    }

    /**
     * Clean and validate email addresses
     */
    cleanEmail(email) {
        if (!email || typeof email !== 'string') return null;
        
        const cleaned = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        return emailRegex.test(cleaned) ? cleaned : null;
    }

    /**
     * Validate priority levels
     */
    validatePriority(priority) {
        const validPriorities = ['high', 'medium', 'low'];
        return validPriorities.includes(priority) ? priority : 'medium';
    }

    /**
     * Get data format analysis
     */
    async analyzeDataFormat(sample) {
        try {
            const prompt = `Analyze this data sample and identify:
1. Data format (CSV, JSON, XML, plain text, etc.)
2. Estimated number of records
3. Available fields/columns
4. Data quality assessment
5. Parsing recommendations

Data sample:
\`\`\`
${sample.substring(0, 1000)}
\`\`\`

Return a JSON object with your analysis.`;

            const result = await this.llmService.generateContent('analysis', prompt, {
                temperature: 0.1,
                maxTokens: 500,
                logPrompt: false,
                logResponse: false
            });

            const responseText = result.response;
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON found in response');

        } catch (error) {
            return {
                format: 'unknown',
                estimatedRecords: 0,
                fields: [],
                quality: 'unknown',
                recommendations: 'Manual review required'
            };
        }
    }
}

module.exports = LLMDataParser;