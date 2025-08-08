const { leads, generateId } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');
const { calculateLeadScore, getLeadLifecycleStage, analyzeLeadQuality } = require('../services/leadScoring');
const { logLeadActivity, getLeadTimeline } = require('../services/leadTracking');
const { detectDuplicateLeads, mergeLeads } = require('../services/leadDeduplication');
const { enrichLeadData } = require('../services/leadEnrichment');
const { generateLeadAnalytics, getConversionFunnel } = require('../services/leadAnalytics');
const validator = require('validator');
const fs = require('fs').promises;

/**
 * Get all leads with advanced filtering, search, and analytics
 */
const getAllLeads = (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      search,
      priority,
      industry,
      company_size,
      lead_source,
      assigned_to,
      score_min,
      score_max,
      tags,
      created_after,
      created_before,
      sort_by = 'created_at',
      sort_order = 'desc',
      include_deleted = false
    } = req.query;
    
    let filteredLeads = [...leads];
    
    // Filter out deleted leads unless specifically requested
    if (!include_deleted) {
      filteredLeads = filteredLeads.filter(lead => !lead.deleted_at);
    }
    
    // Advanced filtering
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredLeads = filteredLeads.filter(lead => 
        statusArray.some(s => lead.status.toLowerCase() === s.toLowerCase())
      );
    }
    
    if (priority) {
      const priorityArray = Array.isArray(priority) ? priority : [priority];
      filteredLeads = filteredLeads.filter(lead => 
        priorityArray.includes(lead.priority)
      );
    }
    
    if (industry) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.industry && lead.industry.toLowerCase().includes(industry.toLowerCase())
      );
    }
    
    if (company_size) {
      filteredLeads = filteredLeads.filter(lead => lead.company_size === company_size);
    }
    
    if (lead_source) {
      filteredLeads = filteredLeads.filter(lead => lead.lead_source === lead_source);
    }
    
    if (assigned_to) {
      filteredLeads = filteredLeads.filter(lead => lead.assigned_to === assigned_to);
    }
    
    if (score_min || score_max) {
      filteredLeads = filteredLeads.filter(lead => {
        const score = lead.score || 0;
        if (score_min && score < parseFloat(score_min)) return false;
        if (score_max && score > parseFloat(score_max)) return false;
        return true;
      });
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      filteredLeads = filteredLeads.filter(lead => 
        lead.tags && tagArray.some(tag => 
          lead.tags.some(leadTag => leadTag.toLowerCase().includes(tag.toLowerCase()))
        )
      );
    }
    
    if (created_after) {
      filteredLeads = filteredLeads.filter(lead => 
        new Date(lead.created_at) >= new Date(created_after)
      );
    }
    
    if (created_before) {
      filteredLeads = filteredLeads.filter(lead => 
        new Date(lead.created_at) <= new Date(created_before)
      );
    }
    
    // Advanced search across multiple fields
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead => {
        const searchableFields = [
          lead.name,
          lead.company,
          lead.email,
          lead.phone,
          lead.title,
          lead.industry,
          lead.notes,
          ...(lead.tags || []),
          lead.address?.city,
          lead.address?.state
        ];
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        );
      });
    }
    
    // Sorting
    filteredLeads.sort((a, b) => {
      let aValue = a[sort_by];
      let bValue = b[sort_by];
      
      if (sort_by === 'score') {
        aValue = a.score || 0;
        bValue = b.score || 0;
      }
      
      if (sort_by === 'conversion_probability') {
        aValue = a.conversion_probability || 0;
        bValue = b.conversion_probability || 0;
      }
      
      if (sort_by === 'last_contact') {
        aValue = a.last_contact ? new Date(a.last_contact) : new Date(0);
        bValue = b.last_contact ? new Date(b.last_contact) : new Date(0);
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sort_order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);
    
    // Add computed fields to each lead
    const enrichedLeads = paginatedLeads.map(lead => ({
      ...lead,
      score: lead.score || calculateLeadScore(lead),
      lifecycle_stage: getLeadLifecycleStage(lead),
      quality_grade: analyzeLeadQuality(lead),
      days_since_creation: Math.floor((new Date() - new Date(lead.created_at)) / (1000 * 60 * 60 * 24)),
      days_since_last_contact: lead.last_contact ? 
        Math.floor((new Date() - new Date(lead.last_contact)) / (1000 * 60 * 60 * 24)) : null
    }));
    
    const response = {
      leads: enrichedLeads,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_items: filteredLeads.length,
        total_pages: Math.ceil(filteredLeads.length / limit),
        has_next: endIndex < filteredLeads.length,
        has_previous: page > 1
      },
      filters_applied: {
        status: status || null,
        priority: priority || null,
        industry: industry || null,
        company_size: company_size || null,
        lead_source: lead_source || null,
        assigned_to: assigned_to || null,
        score_range: score_min || score_max ? { min: score_min, max: score_max } : null,
        tags: tags || null,
        date_range: created_after || created_before ? { after: created_after, before: created_before } : null,
        search: search || null
      },
      sorting: {
        field: sort_by,
        order: sort_order
      }
    };
    
    return ResponseFormatter.success(res, response, 'Leads retrieved successfully');
  } catch (error) {
    console.error('Error fetching leads:', error);
    return ResponseFormatter.error(res, 'Failed to fetch leads');
  }
};

/**
 * Get a specific lead by ID with full details and timeline
 */
const getLeadById = (req, res) => {
  try {
    const { id } = req.params;
    const { include_timeline = true, include_duplicates = false } = req.query;
    
    const lead = leads.find(l => l.id === id || l.id === parseInt(id));
    
    if (!lead || lead.deleted_at) {
      return ResponseFormatter.notFound(res, 'Lead');
    }
    
    // Enrich lead with computed data
    const enrichedLead = {
      ...lead,
      score: lead.score || calculateLeadScore(lead),
      lifecycle_stage: getLeadLifecycleStage(lead),
      quality_grade: analyzeLeadQuality(lead),
      days_since_creation: Math.floor((new Date() - new Date(lead.created_at)) / (1000 * 60 * 60 * 24)),
      days_since_last_contact: lead.last_contact ? 
        Math.floor((new Date() - new Date(lead.last_contact)) / (1000 * 60 * 60 * 24)) : null,
      next_action_recommended: getNextRecommendedAction(lead)
    };
    
    const response = { lead: enrichedLead };
    
    // Include activity timeline if requested
    if (include_timeline) {
      response.timeline = getLeadTimeline(id);
    }
    
    // Include potential duplicates if requested
    if (include_duplicates) {
      response.potential_duplicates = detectDuplicateLeads(lead).slice(0, 5);
    }
    
    return ResponseFormatter.success(res, response, 'Lead retrieved successfully');
  } catch (error) {
    console.error('Error fetching lead:', error);
    return ResponseFormatter.error(res, 'Failed to fetch lead');
  }
};

/**
 * Get recommended next action for a lead
 */
const getNextRecommendedAction = (lead) => {
  const daysSinceLastContact = lead.last_contact ? 
    Math.floor((new Date() - new Date(lead.last_contact)) / (1000 * 60 * 60 * 24)) : null;
  
  if (lead.status === 'New') {
    return {
      action: 'initial_contact',
      priority: 'high',
      description: 'Make initial contact with lead'
    };
  }
  
  if (lead.status === 'Follow-up' && daysSinceLastContact > 7) {
    return {
      action: 'follow_up_call',
      priority: 'medium',
      description: 'Follow up on previous conversation'
    };
  }
  
  if (lead.status === 'Qualified' && daysSinceLastContact > 3) {
    return {
      action: 'proposal_review',
      priority: 'high',
      description: 'Review proposal status and next steps'
    };
  }
  
  return {
    action: 'status_review',
    priority: 'low',
    description: 'Review lead status and update as needed'
  };
};

/**
 * Create a new lead with advanced validation and enrichment
 */
const createLead = async (req, res) => {
  try {
    const {
      name,
      company,
      phone,
      email,
      notes,
      status = 'New',
      priority = 'Medium',
      industry,
      company_size,
      title,
      address,
      lead_source,
      tags = [],
      assigned_to,
      custom_fields = {}
    } = req.body;
    
    // Advanced duplicate detection
    const duplicates = detectDuplicateLeads({ email, phone, name, company });
    if (duplicates.length > 0 && !req.body.ignore_duplicates) {
      return ResponseFormatter.error(
        res,
        {
          message: 'Potential duplicate leads found',
          duplicates: duplicates.map(d => ({
            id: d.id,
            name: d.name,
            company: d.company,
            email: d.email,
            phone: d.phone,
            similarity_score: d.similarity_score
          })),
          suggestion: 'Review duplicates or set ignore_duplicates=true'
        },
        409
      );
    }
    
    // Generate unique ID
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create base lead object
    const newLead = {
      id: leadId,
      name,
      company,
      phone,
      email,
      status,
      priority,
      industry: industry || null,
      company_size: company_size || null,
      title: title || null,
      address: address || null,
      lead_source: lead_source || 'Manual Entry',
      tags: Array.isArray(tags) ? tags : [],
      assigned_to: assigned_to || null,
      notes: notes || '',
      custom_fields,
      
      // System fields
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_contact: null,
      next_follow_up: null,
      call_attempts: 0,
      email_opens: 0,
      email_clicks: 0,
      
      // Computed fields
      conversion_probability: 0.3, // Default, will be recalculated
      lifecycle_stage: 'Lead',
      
      // Tracking
      created_by: req.user?.id || 'system',
      last_modified_by: req.user?.id || 'system',
      deleted_at: null
    };
    
    // Calculate initial lead score
    newLead.score = calculateLeadScore(newLead);
    newLead.lifecycle_stage = getLeadLifecycleStage(newLead);
    newLead.quality_grade = analyzeLeadQuality(newLead);
    
    // Attempt data enrichment if email provided
    if (email && !req.body.skip_enrichment) {
      try {
        const enrichedData = await enrichLeadData(newLead);
        Object.assign(newLead, enrichedData);
      } catch (enrichmentError) {
        console.warn('Lead enrichment failed:', enrichmentError.message);
        // Continue without enrichment
      }
    }
    
    // Add to leads array
    leads.push(newLead);
    
    // Log activity
    logLeadActivity(leadId, 'lead_created', {
      created_by: req.user?.id || 'system',
      source: lead_source,
      initial_score: newLead.score
    });
    
    // Prepare response with enriched data
    const responseData = {
      lead: {
        ...newLead,
        days_since_creation: 0,
        next_action_recommended: getNextRecommendedAction(newLead)
      },
      enrichment_status: req.body.skip_enrichment ? 'skipped' : 'attempted',
      duplicate_check: {
        performed: true,
        duplicates_found: duplicates.length,
        ignored: !!req.body.ignore_duplicates
      }
    };
    
    return ResponseFormatter.success(
      res,
      responseData,
      'Lead created successfully',
      201
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    return ResponseFormatter.error(res, 'Failed to create lead: ' + error.message);
  }
};

/**
 * Update a lead
 */
const updateLead = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const leadIndex = leads.findIndex(l => l.id === parseInt(id));
    if (leadIndex === -1) {
      return ResponseFormatter.notFound(res, 'Lead');
    }
    
    // Update the lead
    const updatedLead = {
      ...leads[leadIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    leads[leadIndex] = updatedLead;
    
    return ResponseFormatter.success(res, updatedLead, 'Lead updated successfully');
  } catch (error) {
    console.error('Error updating lead:', error);
    return ResponseFormatter.error(res, 'Failed to update lead');
  }
};

/**
 * Delete a lead
 */
const deleteLead = (req, res) => {
  try {
    const { id } = req.params;
    const leadIndex = leads.findIndex(l => l.id === parseInt(id));
    
    if (leadIndex === -1) {
      return ResponseFormatter.notFound(res, 'Lead');
    }
    
    const deletedLead = leads.splice(leadIndex, 1)[0];
    
    return ResponseFormatter.success(res, deletedLead, 'Lead deleted successfully');
  } catch (error) {
    console.error('Error deleting lead:', error);
    return ResponseFormatter.error(res, 'Failed to delete lead');
  }
};

/**
 * Get lead statistics
 */
const getLeadStats = (req, res) => {
  try {
    const stats = {
      total: leads.length,
      byStatus: {
        new: leads.filter(l => l.status === 'New').length,
        followUp: leads.filter(l => l.status === 'Follow-up').length,
        qualified: leads.filter(l => l.status === 'Qualified').length,
        converted: leads.filter(l => l.status === 'Converted').length,
        lost: leads.filter(l => l.status === 'Lost').length
      },
      recentlyUpdated: leads
        .filter(l => {
          const dayAgo = new Date();
          dayAgo.setDate(dayAgo.getDate() - 1);
          return new Date(l.updatedAt) > dayAgo;
        })
        .length
    };
    
    return ResponseFormatter.success(res, stats, 'Lead statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    return ResponseFormatter.error(res, 'Failed to fetch lead statistics');
  }
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats
};