/**
 * Advanced Lead Scoring System
 * Calculates lead scores based on multiple criteria
 */

/**
 * Calculate lead score based on multiple factors
 * @param {Object} lead - Lead object
 * @returns {number} Score from 0-100
 */
const calculateLeadScore = (lead) => {
  let score = 0;
  
  // Contact Information Completeness (20 points max)
  if (lead.email) score += 8;
  if (lead.phone) score += 8;
  if (lead.name) score += 2;
  if (lead.company) score += 2;
  
  // Company Information (25 points max)
  if (lead.industry) {
    // High-value industries get more points
    const highValueIndustries = ['Technology', 'Healthcare', 'Financial Services', 'Manufacturing'];
    score += highValueIndustries.includes(lead.industry) ? 8 : 5;
  }
  
  if (lead.company_size) {
    // Larger companies typically have bigger budgets
    const sizeScores = {
      '1-10': 2,
      '10-50': 4,
      '50-200': 6,
      '200-500': 8,
      '500+': 10
    };
    score += sizeScores[lead.company_size] || 2;
  }
  
  if (lead.title) {
    // Decision makers get higher scores
    const decisionMakers = ['CEO', 'CTO', 'VP', 'Director', 'Manager', 'Owner', 'Founder'];
    const isDecisionMaker = decisionMakers.some(title => 
      lead.title.toLowerCase().includes(title.toLowerCase())
    );
    score += isDecisionMaker ? 7 : 3;
  }
  
  // Lead Source Quality (15 points max)
  const sourceScores = {
    'Referral': 15,
    'Website': 12,
    'LinkedIn': 10,
    'Trade Show': 8,
    'Cold Call': 5,
    'Email Campaign': 6,
    'Social Media': 7,
    'Manual Entry': 3
  };
  score += sourceScores[lead.lead_source] || 3;
  
  // Engagement Level (20 points max)
  if (lead.last_contact) {
    const daysSinceContact = Math.floor(
      (new Date() - new Date(lead.last_contact)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceContact <= 1) score += 10;
    else if (daysSinceContact <= 7) score += 8;
    else if (daysSinceContact <= 30) score += 5;
    else score += 2;
  }
  
  if (lead.call_attempts) {
    score += Math.min(lead.call_attempts * 2, 6);
  }
  
  if (lead.email_opens > 0) score += 2;
  if (lead.email_clicks > 0) score += 2;
  
  // Priority and Status (10 points max)
  const priorityScores = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
  score += priorityScores[lead.priority] || 1;
  
  const statusScores = {
    'New': 2,
    'Follow-up': 3,
    'Qualified': 4,
    'Converted': 0, // Already converted
    'Lost': 0,
    'Not Interested': 0
  };
  score += statusScores[lead.status] || 1;
  
  // Tags bonus (5 points max)
  if (lead.tags && lead.tags.length > 0) {
    const highValueTags = ['budget-approved', 'decision-maker', 'qualified', 'enterprise', 'ready-to-buy'];
    const tagBonus = lead.tags.filter(tag => 
      highValueTags.some(hvt => tag.toLowerCase().includes(hvt.toLowerCase()))
    ).length;
    score += Math.min(tagBonus * 2, 5);
  }
  
  // Geographic bonus (5 points max)
  if (lead.address && lead.address.country === 'USA') {
    score += 3;
    // Additional bonus for major business cities
    const majorCities = ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle'];
    if (majorCities.includes(lead.address.city)) {
      score += 2;
    }
  }
  
  return Math.min(Math.round(score), 100);
};

/**
 * Determine lead lifecycle stage
 * @param {Object} lead - Lead object
 * @returns {string} Lifecycle stage
 */
const getLeadLifecycleStage = (lead) => {
  if (lead.status === 'Converted') return 'Customer';
  if (lead.status === 'Lost' || lead.status === 'Not Interested') return 'Closed';
  
  const score = lead.score || calculateLeadScore(lead);
  
  if (score >= 80) return 'Sales Qualified Lead (SQL)';
  if (score >= 60) return 'Marketing Qualified Lead (MQL)';
  if (score >= 40) return 'Engaged Lead';
  return 'Lead';
};

/**
 * Analyze lead quality and assign grade
 * @param {Object} lead - Lead object
 * @returns {string} Quality grade (A, B, C, D)
 */
const analyzeLeadQuality = (lead) => {
  const score = lead.score || calculateLeadScore(lead);
  
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
};

/**
 * Calculate lead temperature (Hot, Warm, Cold)
 * @param {Object} lead - Lead object
 * @returns {string} Temperature
 */
const getLeadTemperature = (lead) => {
  const score = lead.score || calculateLeadScore(lead);
  const daysSinceCreation = Math.floor(
    (new Date() - new Date(lead.created_at)) / (1000 * 60 * 60 * 24)
  );
  
  if (score >= 80 && daysSinceCreation <= 7) return 'Hot';
  if (score >= 60 && daysSinceCreation <= 30) return 'Warm';
  return 'Cold';
};

/**
 * Get lead score breakdown for transparency
 * @param {Object} lead - Lead object
 * @returns {Object} Score breakdown
 */
const getLeadScoreBreakdown = (lead) => {
  const breakdown = {
    contact_info: 0,
    company_info: 0,
    lead_source: 0,
    engagement: 0,
    priority_status: 0,
    tags_bonus: 0,
    geographic_bonus: 0,
    total: 0
  };
  
  // Contact Information
  if (lead.email) breakdown.contact_info += 8;
  if (lead.phone) breakdown.contact_info += 8;
  if (lead.name) breakdown.contact_info += 2;
  if (lead.company) breakdown.contact_info += 2;
  
  // Company Information
  if (lead.industry) {
    const highValueIndustries = ['Technology', 'Healthcare', 'Financial Services', 'Manufacturing'];
    breakdown.company_info += highValueIndustries.includes(lead.industry) ? 8 : 5;
  }
  
  if (lead.company_size) {
    const sizeScores = { '1-10': 2, '10-50': 4, '50-200': 6, '200-500': 8, '500+': 10 };
    breakdown.company_info += sizeScores[lead.company_size] || 2;
  }
  
  if (lead.title) {
    const decisionMakers = ['CEO', 'CTO', 'VP', 'Director', 'Manager', 'Owner', 'Founder'];
    const isDecisionMaker = decisionMakers.some(title => 
      lead.title.toLowerCase().includes(title.toLowerCase())
    );
    breakdown.company_info += isDecisionMaker ? 7 : 3;
  }
  
  // Lead Source
  const sourceScores = {
    'Referral': 15, 'Website': 12, 'LinkedIn': 10, 'Trade Show': 8,
    'Cold Call': 5, 'Email Campaign': 6, 'Social Media': 7, 'Manual Entry': 3
  };
  breakdown.lead_source = sourceScores[lead.lead_source] || 3;
  
  // Engagement
  if (lead.last_contact) {
    const daysSinceContact = Math.floor(
      (new Date() - new Date(lead.last_contact)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceContact <= 1) breakdown.engagement += 10;
    else if (daysSinceContact <= 7) breakdown.engagement += 8;
    else if (daysSinceContact <= 30) breakdown.engagement += 5;
    else breakdown.engagement += 2;
  }
  
  if (lead.call_attempts) {
    breakdown.engagement += Math.min(lead.call_attempts * 2, 6);
  }
  
  if (lead.email_opens > 0) breakdown.engagement += 2;
  if (lead.email_clicks > 0) breakdown.engagement += 2;
  
  // Priority and Status
  const priorityScores = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
  breakdown.priority_status += priorityScores[lead.priority] || 1;
  
  const statusScores = { 'New': 2, 'Follow-up': 3, 'Qualified': 4, 'Converted': 0, 'Lost': 0, 'Not Interested': 0 };
  breakdown.priority_status += statusScores[lead.status] || 1;
  
  // Tags bonus
  if (lead.tags && lead.tags.length > 0) {
    const highValueTags = ['budget-approved', 'decision-maker', 'qualified', 'enterprise', 'ready-to-buy'];
    const tagBonus = lead.tags.filter(tag => 
      highValueTags.some(hvt => tag.toLowerCase().includes(hvt.toLowerCase()))
    ).length;
    breakdown.tags_bonus = Math.min(tagBonus * 2, 5);
  }
  
  // Geographic bonus
  if (lead.address && lead.address.country === 'USA') {
    breakdown.geographic_bonus += 3;
    const majorCities = ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle'];
    if (majorCities.includes(lead.address.city)) {
      breakdown.geographic_bonus += 2;
    }
  }
  
  breakdown.total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  breakdown.total = Math.min(breakdown.total, 100);
  
  return breakdown;
};

/**
 * Recommend lead scoring improvements
 * @param {Object} lead - Lead object
 * @returns {Array} Array of improvement suggestions
 */
const getLeadScoreImprovements = (lead) => {
  const suggestions = [];
  
  if (!lead.email) suggestions.push({ field: 'email', impact: '+8 points', priority: 'high' });
  if (!lead.phone) suggestions.push({ field: 'phone', impact: '+8 points', priority: 'high' });
  if (!lead.industry) suggestions.push({ field: 'industry', impact: '+5-8 points', priority: 'medium' });
  if (!lead.company_size) suggestions.push({ field: 'company_size', impact: '+2-10 points', priority: 'medium' });
  if (!lead.title) suggestions.push({ field: 'title', impact: '+3-7 points', priority: 'medium' });
  if (!lead.last_contact) suggestions.push({ field: 'contact_lead', impact: '+2-10 points', priority: 'high' });
  if (!lead.tags || lead.tags.length === 0) {
    suggestions.push({ field: 'add_tags', impact: '+2-5 points', priority: 'low' });
  }
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

module.exports = {
  calculateLeadScore,
  getLeadLifecycleStage,
  analyzeLeadQuality,
  getLeadTemperature,
  getLeadScoreBreakdown,
  getLeadScoreImprovements
};