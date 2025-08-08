/**
 * Lead Analytics and Reporting Service
 * Provides comprehensive analytics and insights for lead management
 */

/**
 * Generate comprehensive lead analytics
 * @param {Array} leads - Array of lead objects
 * @param {number} days - Number of days to analyze
 * @returns {Object} Analytics data
 */
const generateLeadAnalytics = (leads, days = 30) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentLeads = leads.filter(l => new Date(l.created_at) >= cutoffDate);
  
  return {
    overview: generateOverviewAnalytics(leads, recentLeads, days),
    conversion: generateConversionAnalytics(leads, recentLeads),
    source: generateSourceAnalytics(leads, recentLeads),
    geographic: generateGeographicAnalytics(leads, recentLeads),
    temporal: generateTemporalAnalytics(leads, days),
    quality: generateQualityAnalytics(leads, recentLeads),
    performance: generatePerformanceAnalytics(leads, recentLeads),
    predictive: generatePredictiveAnalytics(leads)
  };
};

/**
 * Generate overview analytics
 */
const generateOverviewAnalytics = (allLeads, recentLeads, days) => {
  const activeLeads = allLeads.filter(l => !l.deleted_at);
  
  return {
    total_leads: activeLeads.length,
    new_leads_period: recentLeads.length,
    growth_rate: calculateGrowthRate(allLeads, days),
    velocity: (recentLeads.length / days).toFixed(2),
    
    pipeline_value: calculatePipelineValue(activeLeads),
    avg_deal_size: calculateAverageScore(activeLeads),
    
    conversion_rate: calculateConversionRate(activeLeads),
    time_to_conversion: calculateAverageTimeToConversion(activeLeads),
    
    active_opportunities: activeLeads.filter(l => 
      ['Follow-up', 'Qualified'].includes(l.status)
    ).length,
    
    risk_factors: identifyRiskFactors(activeLeads)
  };
};

/**
 * Generate conversion funnel analytics
 */
const generateConversionAnalytics = (allLeads, recentLeads) => {
  const funnelStages = {
    'Lead': allLeads.filter(l => l.status === 'New').length,
    'Engaged': allLeads.filter(l => l.status === 'Follow-up').length,
    'Qualified': allLeads.filter(l => l.status === 'Qualified').length,
    'Converted': allLeads.filter(l => l.status === 'Converted').length,
    'Lost': allLeads.filter(l => ['Lost', 'Not Interested'].includes(l.status)).length
  };
  
  const totalLeads = Object.values(funnelStages).reduce((sum, count) => sum + count, 0);
  
  const conversionRates = {};
  Object.entries(funnelStages).forEach(([stage, count]) => {
    conversionRates[stage] = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(2) : 0;
  });
  
  return {
    funnel_stages: funnelStages,
    conversion_rates: conversionRates,
    drop_off_analysis: calculateDropOffAnalysis(funnelStages),
    bottlenecks: identifyBottlenecks(funnelStages),
    cohort_analysis: generateCohortAnalysis(allLeads)
  };
};

/**
 * Generate source analytics
 */
const generateSourceAnalytics = (allLeads, recentLeads) => {
  const sourcePerformance = {};
  
  // Group by source
  allLeads.forEach(lead => {
    const source = lead.lead_source || 'Unknown';
    if (!sourcePerformance[source]) {
      sourcePerformance[source] = {
        total: 0,
        converted: 0,
        qualified: 0,
        avg_score: 0,
        avg_time_to_conversion: 0,
        recent: 0
      };
    }
    
    sourcePerformance[source].total++;
    if (lead.status === 'Converted') sourcePerformance[source].converted++;
    if (lead.status === 'Qualified') sourcePerformance[source].qualified++;
    
    // Check if lead is in recent period
    if (recentLeads.some(rl => rl.id === lead.id)) {
      sourcePerformance[source].recent++;
    }
  });
  
  // Calculate metrics for each source
  Object.keys(sourcePerformance).forEach(source => {
    const sourceLeads = allLeads.filter(l => (l.lead_source || 'Unknown') === source);
    const stats = sourcePerformance[source];
    
    stats.conversion_rate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(2) : 0;\n    stats.qualification_rate = stats.total > 0 ? ((stats.qualified / stats.total) * 100).toFixed(2) : 0;\n    stats.avg_score = calculateAverageScore(sourceLeads);\n    stats.avg_time_to_conversion = calculateAverageTimeToConversion(\n      sourceLeads.filter(l => l.status === 'Converted')\n    );\n    stats.cost_per_lead = getCostPerLead(source); // Placeholder\n    stats.roi = calculateSourceROI(source, stats); // Placeholder\n  });\n  \n  return {\n    by_source: sourcePerformance,\n    top_performing: getTopPerformingSources(sourcePerformance),\n    source_trends: calculateSourceTrends(allLeads),\n    source_recommendations: generateSourceRecommendations(sourcePerformance)\n  };\n};\n\n/**\n * Generate geographic analytics\n */\nconst generateGeographicAnalytics = (allLeads, recentLeads) => {\n  const geoData = {\n    by_country: {},\n    by_state: {},\n    by_city: {},\n    by_timezone: {}\n  };\n  \n  allLeads.forEach(lead => {\n    if (lead.address) {\n      const { country = 'Unknown', state = 'Unknown', city = 'Unknown' } = lead.address;\n      \n      // Country analysis\n      if (!geoData.by_country[country]) {\n        geoData.by_country[country] = { total: 0, converted: 0, avg_score: 0 };\n      }\n      geoData.by_country[country].total++;\n      if (lead.status === 'Converted') geoData.by_country[country].converted++;\n      \n      // State analysis (for US)\n      if (country === 'USA') {\n        if (!geoData.by_state[state]) {\n          geoData.by_state[state] = { total: 0, converted: 0, avg_score: 0 };\n        }\n        geoData.by_state[state].total++;\n        if (lead.status === 'Converted') geoData.by_state[state].converted++;\n        \n        // City analysis\n        if (!geoData.by_city[city]) {\n          geoData.by_city[city] = { total: 0, converted: 0, avg_score: 0 };\n        }\n        geoData.by_city[city].total++;\n        if (lead.status === 'Converted') geoData.by_city[city].converted++;\n      }\n      \n      // Timezone analysis (if available)\n      if (lead.calling_time_zone) {\n        const tz = lead.calling_time_zone;\n        if (!geoData.by_timezone[tz]) {\n          geoData.by_timezone[tz] = { total: 0, best_call_times: [], conversion_rate: 0 };\n        }\n        geoData.by_timezone[tz].total++;\n      }\n    }\n  });\n  \n  // Calculate conversion rates\n  ['by_country', 'by_state', 'by_city'].forEach(geoType => {\n    Object.keys(geoData[geoType]).forEach(location => {\n      const data = geoData[geoType][location];\n      data.conversion_rate = data.total > 0 ? ((data.converted / data.total) * 100).toFixed(2) : 0;\n      \n      // Calculate average score for this location\n      const locationLeads = allLeads.filter(l => {\n        if (!l.address) return false;\n        if (geoType === 'by_country') return l.address.country === location;\n        if (geoType === 'by_state') return l.address.state === location;\n        if (geoType === 'by_city') return l.address.city === location;\n        return false;\n      });\n      \n      data.avg_score = calculateAverageScore(locationLeads);\n    });\n  });\n  \n  return {\n    distribution: geoData,\n    top_markets: getTopMarkets(geoData),\n    market_penetration: calculateMarketPenetration(geoData),\n    expansion_opportunities: identifyExpansionOpportunities(geoData)\n  };\n};\n\n/**\n * Generate temporal analytics\n */\nconst generateTemporalAnalytics = (leads, days) => {\n  const dailyStats = {};\n  const weeklyStats = {};\n  const monthlyStats = {};\n  const hourlyStats = Array(24).fill(0).map(() => ({ leads: 0, conversions: 0 }));\n  const weekdayStats = Array(7).fill(0).map(() => ({ leads: 0, conversions: 0 }));\n  \n  leads.forEach(lead => {\n    const createdDate = new Date(lead.created_at);\n    const dateStr = createdDate.toISOString().split('T')[0];\n    const hour = createdDate.getHours();\n    const weekday = createdDate.getDay();\n    const monthStr = createdDate.toISOString().substring(0, 7); // YYYY-MM\n    \n    // Daily stats\n    if (!dailyStats[dateStr]) {\n      dailyStats[dateStr] = { leads: 0, conversions: 0 };\n    }\n    dailyStats[dateStr].leads++;\n    if (lead.status === 'Converted') dailyStats[dateStr].conversions++;\n    \n    // Monthly stats\n    if (!monthlyStats[monthStr]) {\n      monthlyStats[monthStr] = { leads: 0, conversions: 0 };\n    }\n    monthlyStats[monthStr].leads++;\n    if (lead.status === 'Converted') monthlyStats[monthStr].conversions++;\n    \n    // Hourly stats\n    hourlyStats[hour].leads++;\n    if (lead.status === 'Converted') hourlyStats[hour].conversions++;\n    \n    // Weekday stats\n    weekdayStats[weekday].leads++;\n    if (lead.status === 'Converted') weekdayStats[weekday].conversions++;\n  });\n  \n  return {\n    daily_trends: dailyStats,\n    monthly_trends: monthlyStats,\n    hourly_patterns: hourlyStats,\n    weekday_patterns: weekdayStats,\n    seasonality: analyzeSeasonality(monthlyStats),\n    optimal_timing: identifyOptimalTiming(hourlyStats, weekdayStats)\n  };\n};\n\n/**\n * Generate quality analytics\n */\nconst generateQualityAnalytics = (allLeads, recentLeads) => {\n  const qualityDistribution = {\n    'A': allLeads.filter(l => (l.quality_grade || 'D') === 'A').length,\n    'B': allLeads.filter(l => (l.quality_grade || 'D') === 'B').length,\n    'C': allLeads.filter(l => (l.quality_grade || 'D') === 'C').length,\n    'D': allLeads.filter(l => (l.quality_grade || 'D') === 'D').length\n  };\n  \n  const scoreDistribution = {\n    '80-100': allLeads.filter(l => (l.score || 0) >= 80).length,\n    '60-79': allLeads.filter(l => (l.score || 0) >= 60 && (l.score || 0) < 80).length,\n    '40-59': allLeads.filter(l => (l.score || 0) >= 40 && (l.score || 0) < 60).length,\n    '0-39': allLeads.filter(l => (l.score || 0) < 40).length\n  };\n  \n  return {\n    quality_distribution: qualityDistribution,\n    score_distribution: scoreDistribution,\n    avg_quality_score: calculateAverageScore(allLeads),\n    quality_trends: analyzeQualityTrends(allLeads),\n    data_completeness: analyzeDataCompleteness(allLeads),\n    quality_improvement_opportunities: identifyQualityImprovements(allLeads)\n  };\n};\n\n/**\n * Generate performance analytics\n */\nconst generatePerformanceAnalytics = (allLeads, recentLeads) => {\n  const agentPerformance = {};\n  \n  allLeads.forEach(lead => {\n    const agent = lead.assigned_to || 'Unassigned';\n    if (!agentPerformance[agent]) {\n      agentPerformance[agent] = {\n        total_leads: 0,\n        converted: 0,\n        qualified: 0,\n        avg_response_time: 0,\n        avg_score: 0,\n        activities: 0\n      };\n    }\n    \n    agentPerformance[agent].total_leads++;\n    if (lead.status === 'Converted') agentPerformance[agent].converted++;\n    if (lead.status === 'Qualified') agentPerformance[agent].qualified++;\n  });\n  \n  // Calculate performance metrics\n  Object.keys(agentPerformance).forEach(agent => {\n    const agentLeads = allLeads.filter(l => (l.assigned_to || 'Unassigned') === agent);\n    const stats = agentPerformance[agent];\n    \n    stats.conversion_rate = stats.total_leads > 0 ? \n      ((stats.converted / stats.total_leads) * 100).toFixed(2) : 0;\n    stats.qualification_rate = stats.total_leads > 0 ? \n      ((stats.qualified / stats.total_leads) * 100).toFixed(2) : 0;\n    stats.avg_score = calculateAverageScore(agentLeads);\n  });\n  \n  return {\n    agent_performance: agentPerformance,\n    top_performers: getTopPerformers(agentPerformance),\n    performance_trends: analyzePerformanceTrends(allLeads),\n    workload_distribution: analyzeWorkloadDistribution(agentPerformance),\n    coaching_opportunities: identifyCoachingOpportunities(agentPerformance)\n  };\n};\n\n/**\n * Generate predictive analytics\n */\nconst generatePredictiveAnalytics = (leads) => {\n  return {\n    conversion_predictions: predictConversions(leads),\n    churn_risk: identifyChurnRisk(leads),\n    revenue_forecast: generateRevenueForecast(leads),\n    lead_scoring_effectiveness: analyzeLeadScoringEffectiveness(leads),\n    optimal_follow_up_times: calculateOptimalFollowUpTimes(leads)\n  };\n};\n\n/**\n * Generate conversion funnel data\n * @param {Array} leads - Array of lead objects\n * @returns {Object} Conversion funnel data\n */\nconst getConversionFunnel = (leads) => {\n  const funnel = {\n    stages: {\n      'Total Leads': leads.length,\n      'Contacted': leads.filter(l => l.last_contact).length,\n      'Engaged': leads.filter(l => ['Follow-up', 'Qualified', 'Converted'].includes(l.status)).length,\n      'Qualified': leads.filter(l => ['Qualified', 'Converted'].includes(l.status)).length,\n      'Converted': leads.filter(l => l.status === 'Converted').length\n    },\n    conversion_rates: {},\n    drop_off_points: {}\n  };\n  \n  const stageOrder = Object.keys(funnel.stages);\n  \n  // Calculate conversion rates between stages\n  for (let i = 1; i < stageOrder.length; i++) {\n    const currentStage = stageOrder[i];\n    const previousStage = stageOrder[i - 1];\n    const currentCount = funnel.stages[currentStage];\n    const previousCount = funnel.stages[previousStage];\n    \n    funnel.conversion_rates[`${previousStage}_to_${currentStage}`] = \n      previousCount > 0 ? ((currentCount / previousCount) * 100).toFixed(2) : 0;\n    \n    funnel.drop_off_points[`${previousStage}_to_${currentStage}`] = \n      previousCount - currentCount;\n  }\n  \n  return funnel;\n};\n\n// Helper functions\nconst calculateGrowthRate = (leads, days) => {\n  const now = new Date();\n  const periodEnd = new Date(now - days * 24 * 60 * 60 * 1000);\n  const previousPeriodEnd = new Date(periodEnd - days * 24 * 60 * 60 * 1000);\n  \n  const currentPeriodLeads = leads.filter(l => \n    new Date(l.created_at) >= periodEnd && new Date(l.created_at) <= now\n  ).length;\n  \n  const previousPeriodLeads = leads.filter(l => \n    new Date(l.created_at) >= previousPeriodEnd && new Date(l.created_at) < periodEnd\n  ).length;\n  \n  if (previousPeriodLeads === 0) return currentPeriodLeads > 0 ? 100 : 0;\n  \n  return (((currentPeriodLeads - previousPeriodLeads) / previousPeriodLeads) * 100).toFixed(2);\n};\n\nconst calculatePipelineValue = (leads) => {\n  return leads\n    .filter(l => ['Follow-up', 'Qualified'].includes(l.status))\n    .reduce((sum, l) => sum + ((l.score || 0) * (l.conversion_probability || 0.3)), 0)\n    .toFixed(2);\n};\n\nconst calculateAverageScore = (leads) => {\n  if (leads.length === 0) return 0;\n  const totalScore = leads.reduce((sum, l) => sum + (l.score || 0), 0);\n  return (totalScore / leads.length).toFixed(2);\n};\n\nconst calculateConversionRate = (leads) => {\n  if (leads.length === 0) return 0;\n  const converted = leads.filter(l => l.status === 'Converted').length;\n  return ((converted / leads.length) * 100).toFixed(2);\n};\n\nconst calculateAverageTimeToConversion = (leads) => {\n  const convertedLeads = leads.filter(l => l.status === 'Converted' && l.last_contact);\n  if (convertedLeads.length === 0) return 0;\n  \n  const totalDays = convertedLeads.reduce((sum, lead) => {\n    const created = new Date(lead.created_at);\n    const converted = new Date(lead.last_contact);\n    const days = (converted - created) / (1000 * 60 * 60 * 24);\n    return sum + days;\n  }, 0);\n  \n  return Math.round(totalDays / convertedLeads.length);\n};\n\nconst identifyRiskFactors = (leads) => {\n  const risks = [];\n  \n  const stalledLeads = leads.filter(l => {\n    if (!l.last_contact) return false;\n    const daysSinceContact = (new Date() - new Date(l.last_contact)) / (1000 * 60 * 60 * 24);\n    return daysSinceContact > 30 && ['Follow-up', 'Qualified'].includes(l.status);\n  }).length;\n  \n  if (stalledLeads > leads.length * 0.2) {\n    risks.push({\n      type: 'high_stalled_leads',\n      description: `${stalledLeads} leads stalled for over 30 days`,\n      severity: 'high',\n      count: stalledLeads\n    });\n  }\n  \n  const lowQualityLeads = leads.filter(l => (l.score || 0) < 30).length;\n  if (lowQualityLeads > leads.length * 0.3) {\n    risks.push({\n      type: 'high_low_quality_leads',\n      description: `${lowQualityLeads} leads with very low scores`,\n      severity: 'medium',\n      count: lowQualityLeads\n    });\n  }\n  \n  return risks;\n};\n\n// Additional helper functions for other analytics...\nconst calculateDropOffAnalysis = (funnelStages) => {\n  const stages = Object.keys(funnelStages);\n  const dropOffs = {};\n  \n  for (let i = 1; i < stages.length; i++) {\n    const currentStage = stages[i];\n    const previousStage = stages[i - 1];\n    dropOffs[`${previousStage}_to_${currentStage}`] = \n      funnelStages[previousStage] - funnelStages[currentStage];\n  }\n  \n  return dropOffs;\n};\n\nconst identifyBottlenecks = (funnelStages) => {\n  // Implementation for identifying bottlenecks\n  return [];\n};\n\nconst generateCohortAnalysis = (leads) => {\n  // Implementation for cohort analysis\n  return {};\n};\n\n// Export all functions\nmodule.exports = {\n  generateLeadAnalytics,\n  getConversionFunnel,\n  generateOverviewAnalytics,\n  generateConversionAnalytics,\n  generateSourceAnalytics,\n  generateGeographicAnalytics,\n  generateTemporalAnalytics,\n  generateQualityAnalytics,\n  generatePerformanceAnalytics,\n  generatePredictiveAnalytics\n};"