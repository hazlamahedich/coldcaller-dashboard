/**
 * Enhanced Leads Controller - Database-powered lead management with caching and validation
 */

const { Lead, Contact, CallLog, sequelize } = require('../database/models');
const { leadValidationSchema } = require('../database/models/Lead');
const { cacheWrapper, invalidateCache, generateKey } = require('../database/cache/cacheManager');
const ResponseFormatter = require('../utils/responseFormatter');
const { Op } = require('sequelize');

// Cached operations for better performance
const getCachedLead = cacheWrapper('leads', generateKey.lead, 
  async (id) => {
    return await Lead.findByPk(id, {
      include: [
        { model: Contact, as: 'contacts' },
        { model: CallLog, as: 'callLogs', limit: 10, order: [['initiatedAt', 'DESC']] }
      ]
    });
  }
);

const getCachedLeadsList = cacheWrapper('leads', generateKey.leadList,
  async (query) => {
    const { page = 1, limit = 10, status, priority, search, assignedTo, sortBy = 'updatedAt', sortOrder = 'DESC' } = query;
    
    const whereClause = { isActive: true };
    
    // Filters
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedTo) whereClause.assignedTo = assignedTo;
    
    // Search across multiple fields
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('firstName')), { [Op.like]: searchTerm }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('lastName')), { [Op.like]: searchTerm }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('company')), { [Op.like]: searchTerm }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), { [Op.like]: searchTerm })
      ];
    }
    
    const offset = (page - 1) * limit;
    
    return await Lead.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        { model: Contact, as: 'contacts', where: { isPrimary: true }, required: false, limit: 1 }
      ],
      distinct: true
    });
  }
);

const getCachedLeadStats = cacheWrapper('stats', generateKey.leadStats,
  async () => {
    const [statusStats, priorityStats, sourceStats, totalStats] = await Promise.all([
      // Status breakdown
      Lead.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', '*'), 'count']
        ],
        where: { isActive: true },
        group: ['status'],
        raw: true
      }),
      
      // Priority breakdown
      Lead.findAll({
        attributes: [
          'priority', 
          [sequelize.fn('COUNT', '*'), 'count']
        ],
        where: { isActive: true },
        group: ['priority'],
        raw: true
      }),
      
      // Lead source breakdown
      Lead.findAll({
        attributes: [
          'leadSource',
          [sequelize.fn('COUNT', '*'), 'count']
        ],
        where: { isActive: true, leadSource: { [Op.ne]: null } },
        group: ['leadSource'],
        raw: true
      }),
      
      // Total counts and averages
      Lead.findAll({
        attributes: [
          [sequelize.fn('COUNT', '*'), 'totalLeads'],
          [sequelize.fn('AVG', sequelize.col('leadScore')), 'avgLeadScore'],
          [sequelize.fn('AVG', sequelize.col('conversionProbability')), 'avgConversionProbability'],
          [sequelize.fn('SUM', sequelize.col('estimatedValue')), 'totalEstimatedValue']
        ],
        where: { isActive: true },
        raw: true
      })
    ]);
    
    return {
      byStatus: statusStats.reduce((acc, stat) => ({ ...acc, [stat.status]: parseInt(stat.count) }), {}),
      byPriority: priorityStats.reduce((acc, stat) => ({ ...acc, [stat.priority]: parseInt(stat.count) }), {}),
      bySource: sourceStats.reduce((acc, stat) => ({ ...acc, [stat.leadSource]: parseInt(stat.count) }), {}),
      totals: {
        totalLeads: parseInt(totalStats[0].totalLeads),
        avgLeadScore: parseFloat(totalStats[0].avgLeadScore || 0).toFixed(2),
        avgConversionProbability: parseFloat(totalStats[0].avgConversionProbability || 0).toFixed(2),
        totalEstimatedValue: parseFloat(totalStats[0].totalEstimatedValue || 0)
      }
    };
  }
);

/**
 * Get all leads with advanced filtering, pagination, and caching
 */
const getAllLeads = async (req, res) => {
  try {
    const result = await getCachedLeadsList(req.query);
    
    return ResponseFormatter.paginated(
      res,
      result.rows,
      parseInt(req.query.page || 1),
      parseInt(req.query.limit || 10),
      result.count,
      'Leads retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching leads:', error);
    return ResponseFormatter.error(res, 'Failed to fetch leads', 500);
  }
};

/**
 * Get a specific lead by ID with full details
 */
const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lead = await getCachedLead(id);
    
    if (!lead) {
      return ResponseFormatter.notFound(res, 'Lead');
    }
    
    return ResponseFormatter.success(res, lead, 'Lead retrieved successfully');
  } catch (error) {
    console.error('Error fetching lead:', error);
    return ResponseFormatter.error(res, 'Failed to fetch lead', 500);
  }
};

/**
 * Create a new lead with validation and duplicate checking
 */
const createLead = async (req, res) => {
  try {
    // Validate input data
    const { error, value } = leadValidationSchema.validate(req.body);
    if (error) {
      return ResponseFormatter.error(res, error.details.map(d => d.message).join(', '), 400);
    }
    
    // Check for duplicates
    const duplicates = await Lead.findDuplicates(value.email, value.phone, value.company);
    if (duplicates.length > 0) {
      return ResponseFormatter.error(
        res,
        'A lead with similar contact information already exists',
        409,
        { duplicates: duplicates.map(d => ({ id: d.id, name: d.fullName, email: d.email })) }
      );
    }
    
    // Create the lead
    const lead = await Lead.create(value);
    
    // Invalidate relevant caches
    invalidateCache.lead('all');
    
    return ResponseFormatter.success(
      res,
      lead,
      'Lead created successfully',
      201
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return ResponseFormatter.error(res, error.errors.map(e => e.message).join(', '), 400);
    }
    
    return ResponseFormatter.error(res, 'Failed to create lead', 500);
  }
};

/**
 * Update a lead with validation
 */
const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate partial update data
    const { error, value } = leadValidationSchema.validate(updates, { allowUnknown: true });
    if (error) {
      return ResponseFormatter.error(res, error.details.map(d => d.message).join(', '), 400);
    }
    
    // Find the lead
    const lead = await Lead.findByPk(id);
    if (!lead) {
      return ResponseFormatter.notFound(res, 'Lead');
    }
    
    // Check for duplicates if contact info changed
    if (value.email || value.phone || value.company) {
      const email = value.email || lead.email;
      const phone = value.phone || lead.phone;
      const company = value.company || lead.company;
      
      const duplicates = await Lead.findDuplicates(email, phone, company);
      const otherDuplicates = duplicates.filter(d => d.id !== id);
      
      if (otherDuplicates.length > 0) {
        return ResponseFormatter.error(
          res,
          'Another lead with similar contact information already exists',
          409,
          { duplicates: otherDuplicates.map(d => ({ id: d.id, name: d.fullName, email: d.email })) }
        );
      }
    }
    
    // Update the lead
    await lead.update(value);
    
    // Invalidate caches
    invalidateCache.lead(id);
    
    return ResponseFormatter.success(res, lead, 'Lead updated successfully');
  } catch (error) {
    console.error('Error updating lead:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return ResponseFormatter.error(res, error.errors.map(e => e.message).join(', '), 400);
    }
    
    return ResponseFormatter.error(res, 'Failed to update lead', 500);
  }
};

/**
 * Soft delete a lead
 */
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const lead = await Lead.findByPk(id);
    if (!lead) {
      return ResponseFormatter.notFound(res, 'Lead');
    }
    
    // Soft delete the lead
    await lead.update({
      isActive: false,
      archivedAt: new Date(),
      archivedReason: reason || 'Deleted by user'
    });
    
    // Invalidate caches
    invalidateCache.lead(id);
    
    return ResponseFormatter.success(res, { id }, 'Lead deleted successfully');
  } catch (error) {
    console.error('Error deleting lead:', error);
    return ResponseFormatter.error(res, 'Failed to delete lead', 500);
  }
};

/**
 * Get comprehensive lead statistics
 */
const getLeadStats = async (req, res) => {
  try {
    const stats = await getCachedLeadStats();
    return ResponseFormatter.success(res, stats, 'Lead statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    return ResponseFormatter.error(res, 'Failed to fetch lead statistics', 500);
  }
};

/**
 * Search leads with advanced filtering
 */
const searchLeads = async (req, res) => {
  try {
    const { q: query, filters = '{}', page = 1, limit = 10 } = req.query;
    
    let parsedFilters = {};
    try {
      parsedFilters = JSON.parse(filters);
    } catch (e) {
      // Ignore JSON parse errors
    }
    
    const searchParams = {
      ...req.query,
      search: query,
      ...parsedFilters,
      page,
      limit
    };
    
    const result = await getCachedLeadsList(searchParams);
    
    return ResponseFormatter.paginated(
      res,
      result.rows,
      parseInt(page),
      parseInt(limit),
      result.count,
      'Search results retrieved successfully'
    );
  } catch (error) {
    console.error('Error searching leads:', error);
    return ResponseFormatter.error(res, 'Search failed', 500);
  }
};

/**
 * Bulk update leads
 */
const bulkUpdateLeads = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { ids, updates } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return ResponseFormatter.error(res, 'Lead IDs are required', 400);
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return ResponseFormatter.error(res, 'Updates are required', 400);
    }
    
    // Validate updates
    const { error } = leadValidationSchema.validate(updates, { allowUnknown: true });
    if (error) {
      return ResponseFormatter.error(res, error.details.map(d => d.message).join(', '), 400);
    }
    
    // Update leads
    const [affectedCount] = await Lead.update(updates, {
      where: { id: { [Op.in]: ids }, isActive: true },
      transaction: t
    });
    
    await t.commit();
    
    // Invalidate caches for affected leads
    ids.forEach(id => invalidateCache.lead(id));
    
    return ResponseFormatter.success(
      res,
      { updatedCount: affectedCount },
      `${affectedCount} leads updated successfully`
    );
  } catch (error) {
    await t.rollback();
    console.error('Error bulk updating leads:', error);
    return ResponseFormatter.error(res, 'Bulk update failed', 500);
  }
};

/**
 * Get leads requiring follow-up
 */
const getFollowUpLeads = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const leads = await Lead.findAll({
      where: {
        isActive: true,
        nextFollowUpDate: {
          [Op.lte]: targetDate
        }
      },
      order: [['nextFollowUpDate', 'ASC']],
      include: [
        { model: Contact, as: 'contacts', where: { isPrimary: true }, required: false }
      ]
    });
    
    return ResponseFormatter.success(res, leads, 'Follow-up leads retrieved successfully');
  } catch (error) {
    console.error('Error fetching follow-up leads:', error);
    return ResponseFormatter.error(res, 'Failed to fetch follow-up leads', 500);
  }
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  searchLeads,
  bulkUpdateLeads,
  getFollowUpLeads
};