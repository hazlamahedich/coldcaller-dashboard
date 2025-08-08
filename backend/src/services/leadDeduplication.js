/**
 * Lead Deduplication and Merging Service
 * Detects and handles duplicate leads
 */

const { leads } = require('../data/dataStore');

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1;
  
  return (maxLength - levenshteinDistance(s1, s2)) / maxLength;
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,         // deletion
        matrix[j - 1][i] + 1,         // insertion
        matrix[j - 1][i - 1] + substitutionCost  // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Normalize phone number for comparison
 * @param {string} phone - Phone number
 * @returns {string} Normalized phone
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, ''); // Remove all non-digits
};

/**
 * Normalize email for comparison
 * @param {string} email - Email address
 * @returns {string} Normalized email
 */
const normalizeEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

/**
 * Normalize company name for comparison
 * @param {string} company - Company name
 * @returns {string} Normalized company name
 */
const normalizeCompany = (company) => {
  if (!company) return '';
  
  const normalized = company.toLowerCase().trim();
  
  // Remove common company suffixes for better matching
  const suffixes = [
    ' inc', ' inc.', ' incorporated',
    ' llc', ' l.l.c.', ' limited liability company',
    ' corp', ' corp.', ' corporation',
    ' co', ' co.', ' company',
    ' ltd', ' ltd.', ' limited'
  ];
  
  let result = normalized;
  suffixes.forEach(suffix => {
    if (result.endsWith(suffix)) {
      result = result.substring(0, result.length - suffix.length).trim();
    }
  });
  
  return result;
};

/**
 * Detect potential duplicate leads
 * @param {Object} targetLead - Lead to check for duplicates
 * @param {number} threshold - Similarity threshold (0-1, default: 0.8)
 * @returns {Array} Array of potential duplicates with similarity scores
 */
const detectDuplicateLeads = (targetLead, threshold = 0.8) => {
  const duplicates = [];
  
  // Get all active leads (exclude deleted and the target lead itself)
  const candidateLeads = leads.filter(lead => 
    !lead.deleted_at && 
    lead.id !== targetLead.id
  );
  
  candidateLeads.forEach(candidate => {
    const similarity = calculateLeadSimilarity(targetLead, candidate);
    
    if (similarity.overall >= threshold) {
      duplicates.push({
        ...candidate,
        similarity_score: similarity.overall,
        similarity_breakdown: similarity,
        confidence: getDuplicateConfidence(similarity),
        recommended_action: getRecommendedAction(similarity)
      });
    }
  });
  
  // Sort by similarity score (highest first)
  duplicates.sort((a, b) => b.similarity_score - a.similarity_score);
  
  return duplicates;
};

/**
 * Calculate similarity between two leads
 * @param {Object} lead1 - First lead
 * @param {Object} lead2 - Second lead
 * @returns {Object} Similarity breakdown
 */
const calculateLeadSimilarity = (lead1, lead2) => {
  const similarity = {
    email: 0,
    phone: 0,
    name: 0,
    company: 0,
    overall: 0
  };
  
  // Exact matches get maximum score
  if (lead1.email && lead2.email && normalizeEmail(lead1.email) === normalizeEmail(lead2.email)) {
    similarity.email = 1.0;
  }
  
  if (lead1.phone && lead2.phone && normalizePhone(lead1.phone) === normalizePhone(lead2.phone)) {
    similarity.phone = 1.0;
  }
  
  // String similarity for names and companies
  if (lead1.name && lead2.name) {
    similarity.name = calculateSimilarity(lead1.name, lead2.name);
  }
  
  if (lead1.company && lead2.company) {
    similarity.company = calculateSimilarity(
      normalizeCompany(lead1.company), 
      normalizeCompany(lead2.company)
    );
  }
  
  // Calculate weighted overall similarity
  // Email and phone are most important for duplicate detection
  const weights = {
    email: 0.4,
    phone: 0.3,
    company: 0.2,
    name: 0.1
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  Object.keys(weights).forEach(field => {
    if (similarity[field] > 0) {
      weightedSum += similarity[field] * weights[field];
      totalWeight += weights[field];
    }
  });
  
  similarity.overall = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  return similarity;
};

/**
 * Get confidence level for duplicate detection
 * @param {Object} similarity - Similarity breakdown
 * @returns {string} Confidence level
 */
const getDuplicateConfidence = (similarity) => {
  if (similarity.email === 1.0 || similarity.phone === 1.0) {
    return 'high';
  }
  
  if (similarity.overall >= 0.9) {
    return 'high';
  }
  
  if (similarity.overall >= 0.8) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * Get recommended action for handling duplicate
 * @param {Object} similarity - Similarity breakdown
 * @returns {string} Recommended action
 */
const getRecommendedAction = (similarity) => {
  if (similarity.email === 1.0 && similarity.phone === 1.0) {
    return 'merge_automatically';
  }
  
  if (similarity.email === 1.0 || similarity.phone === 1.0) {
    return 'review_for_merge';
  }
  
  if (similarity.overall >= 0.9) {
    return 'review_for_merge';
  }
  
  return 'flag_for_review';
};

/**
 * Merge two leads
 * @param {string} sourceLeadId - Lead to merge from (will be deleted)
 * @param {string} targetLeadId - Lead to merge into (will be kept)
 * @param {Object} mergeRules - Rules for merging fields
 * @returns {Object} Merged lead
 */
const mergeLeads = (sourceLeadId, targetLeadId, mergeRules = {}) => {
  const sourceIndex = leads.findIndex(l => l.id === sourceLeadId);
  const targetIndex = leads.findIndex(l => l.id === targetLeadId);
  
  if (sourceIndex === -1 || targetIndex === -1) {
    throw new Error('One or both leads not found');
  }
  
  const sourceLead = leads[sourceIndex];
  const targetLead = leads[targetIndex];
  
  // Default merge rules
  const defaultRules = {
    prefer_source: ['tags', 'notes'], // Always prefer source for these fields
    prefer_target: ['id', 'created_at'], // Always prefer target for these fields
    prefer_newer: ['updated_at', 'last_contact'], // Prefer newer values
    prefer_complete: ['email', 'phone', 'address', 'title', 'industry', 'company_size'], // Prefer non-empty values
    combine: ['tags', 'notes'], // Combine values for these fields
    max_value: ['score', 'call_attempts', 'email_opens', 'email_clicks'], // Take maximum value
    avg_value: ['conversion_probability'] // Take average value
  };
  
  const rules = { ...defaultRules, ...mergeRules };
  
  // Create merged lead
  const mergedLead = { ...targetLead };
  
  // Apply merge rules
  Object.keys(sourceLead).forEach(field => {
    const sourceValue = sourceLead[field];
    const targetValue = targetLead[field];
    
    if (rules.prefer_source.includes(field)) {
      mergedLead[field] = sourceValue;
    } else if (rules.prefer_target.includes(field)) {
      // Keep target value (already set)
    } else if (rules.prefer_newer.includes(field)) {
      if (sourceValue && targetValue) {
        mergedLead[field] = new Date(sourceValue) > new Date(targetValue) ? sourceValue : targetValue;
      } else if (sourceValue) {
        mergedLead[field] = sourceValue;
      }
    } else if (rules.prefer_complete.includes(field)) {
      if (!targetValue && sourceValue) {
        mergedLead[field] = sourceValue;
      }
    } else if (rules.combine.includes(field) && field === 'tags') {
      const sourceTags = Array.isArray(sourceValue) ? sourceValue : [];
      const targetTags = Array.isArray(targetValue) ? targetValue : [];
      mergedLead[field] = [...new Set([...targetTags, ...sourceTags])]; // Remove duplicates
    } else if (rules.combine.includes(field) && field === 'notes') {
      const sourceNotes = sourceValue || '';
      const targetNotes = targetValue || '';
      if (sourceNotes && targetNotes) {
        mergedLead[field] = `${targetNotes}\\n\\n--- Merged Notes ---\\n${sourceNotes}`;
      } else if (sourceNotes) {
        mergedLead[field] = sourceNotes;
      }
    } else if (rules.max_value.includes(field)) {
      const sourceNum = parseFloat(sourceValue) || 0;
      const targetNum = parseFloat(targetValue) || 0;
      mergedLead[field] = Math.max(sourceNum, targetNum);
    } else if (rules.avg_value.includes(field)) {
      const sourceNum = parseFloat(sourceValue) || 0;
      const targetNum = parseFloat(targetValue) || 0;
      mergedLead[field] = ((sourceNum + targetNum) / 2).toFixed(3);
    }
  });
  
  // Update merge metadata
  mergedLead.updated_at = new Date().toISOString();
  mergedLead.merged_from = mergedLead.merged_from || [];
  mergedLead.merged_from.push({
    lead_id: sourceLeadId,
    merged_at: new Date().toISOString(),
    original_data: sourceLead
  });
  
  // Replace target lead with merged lead
  leads[targetIndex] = mergedLead;
  
  // Mark source lead as deleted/merged\n  leads[sourceIndex] = {\n    ...sourceLead,\n    deleted_at: new Date().toISOString(),\n    deletion_reason: `Merged into lead ${targetLeadId}`,\n    merged_into: targetLeadId\n  };\n  \n  return mergedLead;\n};\n\n/**\n * Find leads that might be duplicates across the entire database\n * @param {number} threshold - Similarity threshold\n * @param {number} limit - Maximum number of duplicate groups to return\n * @returns {Array} Array of duplicate groups\n */\nconst findAllDuplicates = (threshold = 0.8, limit = 100) => {\n  const duplicateGroups = [];\n  const processedLeads = new Set();\n  \n  // Get all active leads\n  const activeLeads = leads.filter(lead => !lead.deleted_at);\n  \n  activeLeads.forEach(lead => {\n    if (processedLeads.has(lead.id)) return;\n    \n    const duplicates = detectDuplicateLeads(lead, threshold)\n      .filter(dup => !processedLeads.has(dup.id));\n    \n    if (duplicates.length > 0) {\n      const group = {\n        primary_lead: lead,\n        duplicates: duplicates,\n        group_size: duplicates.length + 1,\n        highest_similarity: Math.max(...duplicates.map(d => d.similarity_score)),\n        recommended_primary: getBestLeadInGroup([lead, ...duplicates])\n      };\n      \n      duplicateGroups.push(group);\n      \n      // Mark all leads in this group as processed\n      processedLeads.add(lead.id);\n      duplicates.forEach(dup => processedLeads.add(dup.id));\n    }\n  });\n  \n  // Sort by group size and similarity\n  duplicateGroups.sort((a, b) => {\n    if (a.group_size !== b.group_size) {\n      return b.group_size - a.group_size;\n    }\n    return b.highest_similarity - a.highest_similarity;\n  });\n  \n  return duplicateGroups.slice(0, limit);\n};\n\n/**\n * Determine the best lead in a group (most complete data)\n * @param {Array} leadsGroup - Array of leads\n * @returns {Object} Best lead\n */\nconst getBestLeadInGroup = (leadsGroup) => {\n  return leadsGroup.reduce((best, current) => {\n    const bestScore = calculateCompletenessScore(best);\n    const currentScore = calculateCompletenessScore(current);\n    \n    return currentScore > bestScore ? current : best;\n  });\n};\n\n/**\n * Calculate completeness score for a lead\n * @param {Object} lead - Lead object\n * @returns {number} Completeness score\n */\nconst calculateCompletenessScore = (lead) => {\n  let score = 0;\n  \n  // Required fields\n  if (lead.email) score += 20;\n  if (lead.phone) score += 20;\n  if (lead.name) score += 10;\n  if (lead.company) score += 10;\n  \n  // Optional but valuable fields\n  if (lead.title) score += 5;\n  if (lead.industry) score += 5;\n  if (lead.company_size) score += 5;\n  if (lead.address) score += 5;\n  if (lead.lead_source) score += 3;\n  if (lead.tags && lead.tags.length > 0) score += 3;\n  if (lead.notes) score += 3;\n  \n  // Engagement indicators\n  if (lead.last_contact) score += 5;\n  if (lead.call_attempts > 0) score += 2;\n  if (lead.email_opens > 0) score += 2;\n  if (lead.email_clicks > 0) score += 2;\n  \n  return score;\n};\n\n/**\n * Auto-merge leads with very high confidence\n * @param {number} confidenceThreshold - Minimum confidence for auto-merge\n * @returns {Array} Array of merge results\n */\nconst autoMergeHighConfidenceLeads = (confidenceThreshold = 0.95) => {\n  const duplicateGroups = findAllDuplicates(confidenceThreshold, 50);\n  const mergeResults = [];\n  \n  duplicateGroups.forEach(group => {\n    if (group.highest_similarity >= confidenceThreshold) {\n      const primary = group.recommended_primary;\n      const toMerge = group.duplicates.filter(d => d.id !== primary.id);\n      \n      toMerge.forEach(duplicate => {\n        try {\n          const merged = mergeLeads(duplicate.id, primary.id);\n          mergeResults.push({\n            success: true,\n            merged_lead: merged,\n            source_lead_id: duplicate.id,\n            target_lead_id: primary.id,\n            similarity_score: duplicate.similarity_score\n          });\n        } catch (error) {\n          mergeResults.push({\n            success: false,\n            error: error.message,\n            source_lead_id: duplicate.id,\n            target_lead_id: primary.id\n          });\n        }\n      });\n    }\n  });\n  \n  return mergeResults;\n};\n\nmodule.exports = {\n  detectDuplicateLeads,\n  mergeLeads,\n  findAllDuplicates,\n  autoMergeHighConfidenceLeads,\n  calculateLeadSimilarity,\n  getBestLeadInGroup,\n  calculateCompletenessScore\n};"