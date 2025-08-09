/**
 * Lead Deduplication Service (Simplified)
 */

// Mock data for testing
const leads = [];

/**
 * Calculate similarity between two leads
 * @param {Object} lead1 - First lead
 * @param {Object} lead2 - Second lead
 * @returns {number} Similarity score (0-1)
 */
const calculateLeadSimilarity = (lead1, lead2) => {
  let score = 0;
  let comparisons = 0;

  // Email match (highest weight)
  if (lead1.email && lead2.email) {
    comparisons++;
    if (lead1.email.toLowerCase() === lead2.email.toLowerCase()) {
      score += 0.4;
    }
  }

  // Phone match
  if (lead1.phone && lead2.phone) {
    comparisons++;
    const phone1 = lead1.phone.replace(/\D/g, '');
    const phone2 = lead2.phone.replace(/\D/g, '');
    if (phone1 === phone2) {
      score += 0.3;
    }
  }

  // Name similarity
  if (lead1.firstName && lead2.firstName && lead1.lastName && lead2.lastName) {
    comparisons++;
    const name1 = `${lead1.firstName} ${lead1.lastName}`.toLowerCase();
    const name2 = `${lead2.firstName} ${lead2.firstName}`.toLowerCase();
    if (name1 === name2) {
      score += 0.2;
    }
  }

  // Company match
  if (lead1.company && lead2.company) {
    comparisons++;
    if (lead1.company.toLowerCase() === lead2.company.toLowerCase()) {
      score += 0.1;
    }
  }

  return comparisons > 0 ? score : 0;
};

/**
 * Detect duplicate leads
 * @param {Object} targetLead - Lead to find duplicates for
 * @param {number} threshold - Similarity threshold
 * @returns {Array} Array of potential duplicates
 */
const detectDuplicateLeads = (targetLead, threshold = 0.8) => {
  return leads
    .filter(lead => lead.id !== targetLead.id)
    .map(lead => ({
      ...lead,
      similarity_score: calculateLeadSimilarity(targetLead, lead)
    }))
    .filter(lead => lead.similarity_score >= threshold)
    .sort((a, b) => b.similarity_score - a.similarity_score);
};

/**
 * Merge two leads
 * @param {string} sourceLeadId - ID of lead to merge from
 * @param {string} targetLeadId - ID of lead to merge into
 * @returns {Object} Merged lead
 */
const mergeLeads = (sourceLeadId, targetLeadId) => {
  const sourceIndex = leads.findIndex(lead => lead.id === sourceLeadId);
  const targetIndex = leads.findIndex(lead => lead.id === targetLeadId);

  if (sourceIndex === -1 || targetIndex === -1) {
    throw new Error('One or both leads not found');
  }

  const sourceLead = leads[sourceIndex];
  const targetLead = leads[targetIndex];

  // Simple merge strategy - take non-null values from source
  const mergedLead = { ...targetLead };
  Object.keys(sourceLead).forEach(key => {
    if (sourceLead[key] && !targetLead[key]) {
      mergedLead[key] = sourceLead[key];
    }
  });

  mergedLead.updated_at = new Date().toISOString();
  
  // Mark source as merged
  leads[sourceIndex] = {
    ...sourceLead,
    deleted_at: new Date().toISOString(),
    merged_into: targetLeadId
  };

  leads[targetIndex] = mergedLead;
  return mergedLead;
};

/**
 * Find all duplicate groups
 * @param {number} threshold - Similarity threshold
 * @param {number} limit - Maximum groups to return
 * @returns {Array} Array of duplicate groups
 */
const findAllDuplicates = (threshold = 0.8, limit = 100) => {
  const duplicateGroups = [];
  const processed = new Set();

  leads.filter(lead => !lead.deleted_at).forEach(lead => {
    if (processed.has(lead.id)) return;

    const duplicates = detectDuplicateLeads(lead, threshold);
    if (duplicates.length > 0) {
      duplicateGroups.push({
        primary_lead: lead,
        duplicates: duplicates,
        group_size: duplicates.length + 1,
        highest_similarity: Math.max(...duplicates.map(d => d.similarity_score))
      });

      processed.add(lead.id);
      duplicates.forEach(dup => processed.add(dup.id));
    }
  });

  return duplicateGroups.slice(0, limit);
};

/**
 * Auto-merge high confidence duplicates
 * @param {number} confidenceThreshold - Minimum confidence for auto-merge
 * @returns {Array} Array of merge results
 */
const autoMergeHighConfidenceLeads = (confidenceThreshold = 0.95) => {
  const groups = findAllDuplicates(confidenceThreshold, 50);
  const results = [];

  groups.forEach(group => {
    if (group.highest_similarity >= confidenceThreshold) {
      group.duplicates.forEach(duplicate => {
        try {
          const merged = mergeLeads(duplicate.id, group.primary_lead.id);
          results.push({
            success: true,
            merged_lead: merged,
            source_lead_id: duplicate.id,
            target_lead_id: group.primary_lead.id,
            similarity_score: duplicate.similarity_score
          });
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            source_lead_id: duplicate.id,
            target_lead_id: group.primary_lead.id
          });
        }
      });
    }
  });

  return results;
};

/**
 * Get best lead in group
 * @param {Array} leadsGroup - Array of leads
 * @returns {Object} Best lead
 */
const getBestLeadInGroup = (leadsGroup) => {
  return leadsGroup.reduce((best, current) => {
    const bestScore = calculateCompletenessScore(best);
    const currentScore = calculateCompletenessScore(current);
    return currentScore > bestScore ? current : best;
  });
};

/**
 * Calculate completeness score
 * @param {Object} lead - Lead object
 * @returns {number} Completeness score
 */
const calculateCompletenessScore = (lead) => {
  let score = 0;
  if (lead.email) score += 20;
  if (lead.phone) score += 20;
  if (lead.firstName && lead.lastName) score += 10;
  if (lead.company) score += 10;
  if (lead.title) score += 5;
  return score;
};

module.exports = {
  detectDuplicateLeads,
  mergeLeads,
  findAllDuplicates,
  autoMergeHighConfidenceLeads,
  calculateLeadSimilarity,
  getBestLeadInGroup,
  calculateCompletenessScore
};