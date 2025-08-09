/**
 * Lead Analytics Service (Simplified)
 */

/**
 * Calculate average score for leads
 */
const calculateAverageScore = (leads) => {
  if (!leads || leads.length === 0) return 0;
  const scores = leads.map(l => l.leadScore || 0);
  return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
};

/**
 * Generate lead analytics dashboard data
 */
const generateAnalyticsDashboard = async (timeRange = 30) => {
  try {
    // Mock data for now since we're using a simplified version
    const mockData = {
      overview: {
        total_leads: 0,
        new_leads: 0,
        qualified_leads: 0,
        converted_leads: 0,
        conversion_rate: 0,
        avg_lead_score: 0
      },
      trends: {
        daily: [],
        weekly: [],
        monthly: []
      },
      sources: {
        by_source: {},
        top_performing: [],
        source_trends: {}
      },
      geographic: {
        by_country: {},
        by_state: {},
        top_markets: []
      },
      performance: {
        agent_performance: {},
        top_performers: [],
        avg_response_time: 0
      },
      quality: {
        avg_quality_score: 0,
        quality_distribution: {
          'A': 0, 'B': 0, 'C': 0, 'D': 0
        },
        data_completeness: 0
      }
    };

    return {
      success: true,
      data: mockData,
      generated_at: new Date().toISOString(),
      time_range: timeRange
    };
  } catch (error) {
    console.error('Analytics generation failed:', error);
    return {
      success: false,
      error: error.message,
      generated_at: new Date().toISOString()
    };
  }
};

/**
 * Generate source performance analytics
 */
const generateSourceAnalytics = async (leads = []) => {
  const sourceStats = {};
  
  leads.forEach(lead => {
    const source = lead.leadSource || 'Unknown';
    if (!sourceStats[source]) {
      sourceStats[source] = {
        total: 0,
        converted: 0,
        qualified: 0,
        avg_score: 0
      };
    }
    
    sourceStats[source].total++;
    if (lead.status === 'converted') sourceStats[source].converted++;
    if (lead.status === 'qualified') sourceStats[source].qualified++;
  });

  // Calculate rates
  Object.keys(sourceStats).forEach(source => {
    const stats = sourceStats[source];
    stats.conversion_rate = stats.total > 0 ? 
      ((stats.converted / stats.total) * 100).toFixed(2) : 0;
    stats.qualification_rate = stats.total > 0 ? 
      ((stats.qualified / stats.total) * 100).toFixed(2) : 0;
  });

  return sourceStats;
};

/**
 * Generate performance analytics for agents
 */
const generateAgentPerformance = async (leads = []) => {
  const agentStats = {};
  
  leads.forEach(lead => {
    const agent = lead.assignedTo || 'Unassigned';
    if (!agentStats[agent]) {
      agentStats[agent] = {
        total_leads: 0,
        converted: 0,
        qualified: 0,
        avg_score: 0,
        conversion_rate: 0
      };
    }
    
    agentStats[agent].total_leads++;
    if (lead.status === 'converted') agentStats[agent].converted++;
    if (lead.status === 'qualified') agentStats[agent].qualified++;
  });

  // Calculate performance metrics
  Object.keys(agentStats).forEach(agent => {
    const stats = agentStats[agent];
    stats.conversion_rate = stats.total_leads > 0 ? 
      ((stats.converted / stats.total_leads) * 100).toFixed(2) : 0;
    
    const agentLeads = leads.filter(l => (l.assignedTo || 'Unassigned') === agent);
    stats.avg_score = calculateAverageScore(agentLeads);
  });

  return agentStats;
};

/**
 * Generate temporal analytics
 */
const generateTemporalAnalytics = async (leads = []) => {
  const dailyStats = {};
  const monthlyStats = {};
  
  leads.forEach(lead => {
    const createdDate = new Date(lead.createdAt || Date.now());
    const dateStr = createdDate.toISOString().split('T')[0];
    const monthStr = createdDate.toISOString().substring(0, 7);
    
    // Daily stats
    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = { leads: 0, conversions: 0 };
    }
    dailyStats[dateStr].leads++;
    if (lead.status === 'converted') dailyStats[dateStr].conversions++;
    
    // Monthly stats
    if (!monthlyStats[monthStr]) {
      monthlyStats[monthStr] = { leads: 0, conversions: 0 };
    }
    monthlyStats[monthStr].leads++;
    if (lead.status === 'converted') monthlyStats[monthStr].conversions++;
  });

  return {
    daily_trends: dailyStats,
    monthly_trends: monthlyStats
  };
};

module.exports = {
  generateAnalyticsDashboard,
  generateSourceAnalytics,
  generateAgentPerformance,
  generateTemporalAnalytics,
  calculateAverageScore
};