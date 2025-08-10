/**
 * Lead Management Service
 * Handles CRUD operations for leads with duplicate detection and enrichment
 */

class LeadsService {
    constructor() {
        this.leads = new Map(); // In-memory storage for now
        this.nextId = 1;
    }

    /**
     * Create a new lead
     */
    async createLead(leadData) {
        const lead = {
            id: this.nextId++,
            ...this.sanitizeLead(leadData),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.leads.set(lead.id, lead);
        return lead;
    }

    /**
     * Get lead by ID
     */
    async getLeadById(id) {
        return this.leads.get(parseInt(id)) || null;
    }

    /**
     * Get all leads with filtering and pagination
     */
    async getLeads(options = {}) {
        const { 
            page = 1, 
            limit = 50, 
            status, 
            priority, 
            industry, 
            tags,
            search 
        } = options;

        let filteredLeads = Array.from(this.leads.values());

        // Apply filters
        if (status) {
            filteredLeads = filteredLeads.filter(lead => lead.status === status);
        }
        if (priority) {
            filteredLeads = filteredLeads.filter(lead => lead.priority === priority);
        }
        if (industry) {
            filteredLeads = filteredLeads.filter(lead => 
                lead.industry?.toLowerCase().includes(industry.toLowerCase())
            );
        }
        if (tags && tags.length > 0) {
            filteredLeads = filteredLeads.filter(lead => 
                tags.some(tag => lead.tags?.includes(tag))
            );
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filteredLeads = filteredLeads.filter(lead => 
                lead.name?.toLowerCase().includes(searchLower) ||
                lead.company?.toLowerCase().includes(searchLower) ||
                lead.email?.toLowerCase().includes(searchLower) ||
                lead.phone?.includes(search)
            );
        }

        // Sort by updated date (newest first)
        filteredLeads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        // Pagination
        const total = filteredLeads.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

        return {
            leads: paginatedLeads,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: endIndex < total,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Update lead by ID
     */
    async updateLead(id, updates) {
        const lead = this.leads.get(parseInt(id));
        if (!lead) {
            throw new Error('Lead not found');
        }

        const updatedLead = {
            ...lead,
            ...this.sanitizeLead(updates),
            updatedAt: new Date()
        };

        this.leads.set(lead.id, updatedLead);
        return updatedLead;
    }

    /**
     * Delete lead by ID
     */
    async deleteLead(id) {
        const lead = this.leads.get(parseInt(id));
        if (!lead) {
            throw new Error('Lead not found');
        }

        this.leads.delete(parseInt(id));
        return { message: 'Lead deleted successfully' };
    }

    /**
     * Find duplicate leads based on email and phone
     */
    async findDuplicates(leadData) {
        const duplicates = [];
        const allLeads = Array.from(this.leads.values());

        for (const lead of allLeads) {
            // Check for email match (exact)
            if (leadData.email && lead.email && 
                leadData.email.toLowerCase() === lead.email.toLowerCase()) {
                duplicates.push({
                    ...lead,
                    matchType: 'email',
                    confidence: 1.0
                });
                continue;
            }

            // Check for phone match (normalized)
            if (leadData.phone && lead.phone && 
                this.normalizePhone(leadData.phone) === this.normalizePhone(lead.phone)) {
                duplicates.push({
                    ...lead,
                    matchType: 'phone',
                    confidence: 1.0
                });
                continue;
            }

            // Check for name + company match (fuzzy)
            if (leadData.name && leadData.company && 
                lead.name && lead.company) {
                const nameMatch = this.fuzzyMatch(leadData.name, lead.name);
                const companyMatch = this.fuzzyMatch(leadData.company, lead.company);
                
                if (nameMatch > 0.8 && companyMatch > 0.8) {
                    duplicates.push({
                        ...lead,
                        matchType: 'name_company',
                        confidence: (nameMatch + companyMatch) / 2
                    });
                }
            }
        }

        return duplicates;
    }

    /**
     * Bulk create leads with duplicate handling
     */
    async bulkCreateLeads(leadsData, options = {}) {
        const { skipDuplicates = true, updateExisting = false } = options;
        const results = {
            created: [],
            updated: [],
            duplicates: [],
            errors: []
        };

        for (const leadData of leadsData) {
            try {
                // Check for duplicates
                const duplicates = await this.findDuplicates(leadData);
                
                if (duplicates.length > 0) {
                    if (updateExisting) {
                        // Update the first duplicate found
                        const updated = await this.updateLead(duplicates[0].id, leadData);
                        results.updated.push(updated);
                    } else if (skipDuplicates) {
                        // Skip this lead
                        results.duplicates.push(leadData);
                    } else {
                        // Create anyway
                        const created = await this.createLead(leadData);
                        results.created.push(created);
                    }
                } else {
                    // No duplicates, create new lead
                    const created = await this.createLead(leadData);
                    results.created.push(created);
                }
            } catch (error) {
                results.errors.push({
                    leadData,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get leads statistics
     */
    async getLeadsStats() {
        const allLeads = Array.from(this.leads.values());
        const total = allLeads.length;

        const statsByStatus = {};
        const statsByPriority = {};
        const statsByIndustry = {};

        for (const lead of allLeads) {
            // Status stats
            statsByStatus[lead.status] = (statsByStatus[lead.status] || 0) + 1;
            
            // Priority stats
            statsByPriority[lead.priority] = (statsByPriority[lead.priority] || 0) + 1;
            
            // Industry stats
            if (lead.industry) {
                statsByIndustry[lead.industry] = (statsByIndustry[lead.industry] || 0) + 1;
            }
        }

        return {
            total,
            byStatus: statsByStatus,
            byPriority: statsByPriority,
            byIndustry: statsByIndustry,
            recentActivity: allLeads
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 5)
        };
    }

    /**
     * Sanitize and validate lead data
     */
    sanitizeLead(data) {
        return {
            name: data.name?.trim() || null,
            company: data.company?.trim() || null,
            phone: this.normalizePhone(data.phone) || null,
            email: this.normalizeEmail(data.email) || null,
            title: data.title?.trim() || null,
            industry: data.industry?.trim() || null,
            address: data.address?.trim() || null,
            notes: data.notes?.trim() || null,
            tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : [],
            source: data.source || 'manual',
            priority: this.validatePriority(data.priority) || 'medium',
            status: this.validateStatus(data.status) || 'new'
        };
    }

    /**
     * Normalize phone numbers
     */
    normalizePhone(phone) {
        if (!phone) return null;
        
        // Remove all non-digit characters
        const digits = phone.toString().replace(/\D/g, '');
        
        if (digits.length < 10) return null;
        
        // Format as E.164
        if (digits.length === 10) {
            return `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }
        
        return `+${digits}`;
    }

    /**
     * Normalize email addresses
     */
    normalizeEmail(email) {
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
     * Validate status values
     */
    validateStatus(status) {
        const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'closed', 'lost'];
        return validStatuses.includes(status) ? status : 'new';
    }

    /**
     * Fuzzy string matching using simple algorithm
     */
    fuzzyMatch(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) return 1;
        
        // Simple Levenshtein distance ratio
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.length === 0) return 1;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

module.exports = new LeadsService();