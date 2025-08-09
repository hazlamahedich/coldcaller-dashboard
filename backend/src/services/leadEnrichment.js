/**
 * Lead Enrichment Service (Simplified)
 */

/**
 * Enrich lead data
 * @param {Object} lead - Lead object to enrich
 * @returns {Object} Enriched lead data
 */
const enrichLeadData = async (lead) => {
  const enrichment = {
    enriched_at: new Date().toISOString(),
    enrichment_source: 'internal',
    quality_score: 50
  };

  try {
    // Basic email domain enrichment
    if (lead.email) {
      const domain = lead.email.split('@')[1];
      if (domain) {
        enrichment.email_domain = domain;
        
        // Basic business domain detection
        const businessDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
        if (!businessDomains.includes(domain.toLowerCase())) {
          enrichment.email_type = 'business';
          enrichment.business_likelihood = 'high';
          
          // Try to infer company from domain if not provided
          if (!lead.company) {
            enrichment.inferred_company = domain
              .replace(/\.(com|org|net|edu|gov)$/i, '')
              .replace(/[.-]/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
          }
        } else {
          enrichment.email_type = 'personal';
          enrichment.business_likelihood = 'low';
        }
      }
    }

    // Basic phone number enrichment
    if (lead.phone) {
      const cleaned = lead.phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        enrichment.phone_formatted = `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
      } else if (cleaned.length === 11 && cleaned[0] === '1') {
        const phone = cleaned.slice(1);
        enrichment.phone_formatted = `+1 (${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`;
      }
    }

    // Basic title analysis
    if (lead.title) {
      const title = lead.title.toLowerCase();
      if (title.includes('ceo') || title.includes('president') || title.includes('founder')) {
        enrichment.seniority_level = 'executive';
      } else if (title.includes('director') || title.includes('vp') || title.includes('vice president')) {
        enrichment.seniority_level = 'senior';
      } else if (title.includes('manager') || title.includes('lead')) {
        enrichment.seniority_level = 'mid';
      } else {
        enrichment.seniority_level = 'individual_contributor';
      }
    }

    // Basic company size inference
    if (lead.company) {
      const company = lead.company.toLowerCase();
      if (company.includes('corporation') || company.includes('international') || company.includes('global')) {
        enrichment.inferred_company_size = '500+';
      } else if (company.includes('enterprises') || company.includes('group')) {
        enrichment.inferred_company_size = '200-500';
      } else if (company.includes('solutions') || company.includes('services')) {
        enrichment.inferred_company_size = '50-200';
      } else {
        enrichment.inferred_company_size = '10-50';
      }
    }

    // Quality score calculation
    let qualityScore = 0;
    if (lead.email) qualityScore += 20;
    if (lead.phone) qualityScore += 20;
    if (lead.firstName && lead.lastName) qualityScore += 15;
    if (lead.company) qualityScore += 15;
    if (lead.title) qualityScore += 10;
    if (lead.industry) qualityScore += 10;
    if (lead.website) qualityScore += 5;
    if (lead.addressCity && lead.addressState) qualityScore += 5;

    enrichment.quality_score = qualityScore;

  } catch (error) {
    console.warn('Lead enrichment failed:', error);
    enrichment.enrichment_error = error.message;
  }

  return enrichment;
};

/**
 * Batch enrich multiple leads
 * @param {Array} leads - Array of leads to enrich
 * @returns {Array} Array of enriched leads
 */
const batchEnrichLeads = async (leads) => {
  const enrichedLeads = [];

  for (const lead of leads) {
    try {
      const enrichment = await enrichLeadData(lead);
      enrichedLeads.push({
        ...lead,
        enrichment_data: enrichment
      });
    } catch (error) {
      console.warn(`Failed to enrich lead ${lead.id}:`, error);
      enrichedLeads.push({
        ...lead,
        enrichment_data: {
          enrichment_error: error.message,
          enriched_at: new Date().toISOString()
        }
      });
    }
  }

  return enrichedLeads;
};

/**
 * Get enrichment score for a lead
 * @param {Object} lead - Lead object
 * @returns {number} Enrichment score (0-100)
 */
const getEnrichmentScore = (lead) => {
  let score = 0;
  if (lead.email) score += 20;
  if (lead.phone) score += 20;
  if (lead.firstName && lead.lastName) score += 15;
  if (lead.company) score += 15;
  if (lead.title) score += 10;
  if (lead.industry) score += 10;
  if (lead.website) score += 5;
  if (lead.addressCity && lead.addressState) score += 5;
  return score;
};

module.exports = {
  enrichLeadData,
  batchEnrichLeads,
  getEnrichmentScore
};