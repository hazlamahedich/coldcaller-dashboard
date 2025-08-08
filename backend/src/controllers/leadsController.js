const { leads, generateId } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');

/**
 * Get all leads with optional filtering and pagination
 */
const getAllLeads = (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    
    let filteredLeads = [...leads];
    
    // Filter by status
    if (status) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Search by name, company, or email
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm) ||
        lead.company.toLowerCase().includes(searchTerm) ||
        lead.email.toLowerCase().includes(searchTerm)
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);
    
    return ResponseFormatter.paginated(
      res,
      paginatedLeads,
      page,
      limit,
      filteredLeads.length,
      'Leads retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching leads:', error);
    return ResponseFormatter.error(res, 'Failed to fetch leads');
  }
};

/**
 * Get a specific lead by ID
 */
const getLeadById = (req, res) => {
  try {
    const { id } = req.params;
    const lead = leads.find(l => l.id === parseInt(id));
    
    if (!lead) {
      return ResponseFormatter.notFound(res, 'Lead');
    }
    
    return ResponseFormatter.success(res, lead, 'Lead retrieved successfully');
  } catch (error) {
    console.error('Error fetching lead:', error);
    return ResponseFormatter.error(res, 'Failed to fetch lead');
  }
};

/**
 * Create a new lead
 */
const createLead = (req, res) => {
  try {
    const { name, company, phone, email, notes, status = 'New' } = req.body;
    
    // Check if lead with same email or phone already exists
    const existingLead = leads.find(l => l.email === email || l.phone === phone);
    if (existingLead) {
      return ResponseFormatter.error(
        res,
        'Lead with this email or phone already exists',
        409
      );
    }
    
    const newLead = {
      id: generateId(),
      name,
      company,
      phone,
      email,
      status,
      notes: notes || '',
      lastContact: 'Never',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    leads.push(newLead);
    
    return ResponseFormatter.success(
      res,
      newLead,
      'Lead created successfully',
      201
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    return ResponseFormatter.error(res, 'Failed to create lead');
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