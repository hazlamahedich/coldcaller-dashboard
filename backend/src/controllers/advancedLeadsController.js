/**
 * Advanced Lead Management Controllers
 * Bulk operations, analytics, and advanced features
 */

const { leads, generateId } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');
const { calculateLeadScore, getLeadLifecycleStage, analyzeLeadQuality, getLeadScoreBreakdown, getLeadScoreImprovements } = require('../services/leadScoring');
const { logLeadActivity, getLeadTimeline: fetchTimeline, getLeadActivityStats } = require('../services/leadTracking');
const { detectDuplicateLeads, mergeLeads, findAllDuplicates } = require('../services/leadDeduplication');
const { enrichLeadData, batchEnrichLeads } = require('../services/leadEnrichment');
const { generateLeadAnalytics } = require('../services/leadAnalytics');

/**
 * Bulk import leads with duplicate detection and validation
 */
const bulkImportLeads = async (req, res) => {
  try {
    const { leads: importLeads, options = {} } = req.body;
    const { 
      skip_duplicates = false, 
      merge_duplicates = false,
      auto_enrich = false,
      batch_size = 100 
    } = options;
    
    if (!Array.isArray(importLeads) || importLeads.length === 0) {
      return ResponseFormatter.error(res, 'No leads provided for import', 400);
    }

    if (importLeads.length > 1000) {
      return ResponseFormatter.error(res, 'Maximum 1000 leads per batch import', 400);
    }
    
    const results = {
      total_processed: importLeads.length,
      successful: 0,
      failed: 0,
      duplicates_found: 0,
      enrichment_attempted: 0,
      enrichment_successful: 0,
      errors: []
    };
    
    // Process in batches to avoid memory issues
    for (let i = 0; i < importLeads.length; i += batch_size) {
      const batch = importLeads.slice(i, i + batch_size);
      
      for (const leadData of batch) {
        try {
          // Validate required fields
          if (!leadData.email && !leadData.phone) {
            results.failed++;
            results.errors.push({
              lead_data: leadData,
              error: 'Either email or phone is required'
            });
            continue;
          }
          
          // Check for duplicates
          const duplicates = detectDuplicateLeads(leadData);
          
          if (duplicates.length > 0) {
            results.duplicates_found++;
            
            if (skip_duplicates) {
              continue;
            } else if (merge_duplicates && duplicates[0].similarity_score >= 0.9) {
              // Auto-merge high confidence duplicates
              try {
                const merged = mergeLeads('temp_' + Date.now(), duplicates[0].id, {
                  prefer_source: ['notes', 'tags'],
                  combine: ['tags', 'notes']
                });
                
                logLeadActivity(duplicates[0].id, 'lead_merged', {
                  merged_from: 'bulk_import',
                  source_data: leadData,
                  similarity_score: duplicates[0].similarity_score
                });
                
                results.successful++;
                continue;
              } catch (mergeError) {
                results.failed++;
                results.errors.push({
                  lead_data: leadData,
                  error: `Merge failed: ${mergeError.message}`,
                  duplicate_id: duplicates[0].id
                });
                continue;
              }
            } else {
              results.failed++;
              results.errors.push({
                lead_data: leadData,
                error: 'Duplicate found - review required',
                duplicates: duplicates.slice(0, 3).map(d => ({
                  id: d.id,
                  name: d.name,
                  company: d.company,
                  similarity_score: d.similarity_score
                }))
              });
              continue;
            }
          }
          
          // Create new lead
          const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newLead = {
            id: leadId,
            name: leadData.name || '',
            company: leadData.company || '',
            phone: leadData.phone || '',
            email: leadData.email || '',
            status: leadData.status || 'New',
            priority: leadData.priority || 'Medium',
            industry: leadData.industry || null,
            company_size: leadData.company_size || null,
            title: leadData.title || null,
            address: leadData.address || null,
            lead_source: leadData.lead_source || 'Bulk Import',
            tags: Array.isArray(leadData.tags) ? leadData.tags : [],
            assigned_to: leadData.assigned_to || null,
            notes: leadData.notes || '',
            custom_fields: leadData.custom_fields || {},
            
            // System fields
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: req.user?.id || 'bulk_import',
            last_modified_by: req.user?.id || 'bulk_import',
            last_contact: null,
            next_follow_up: null,
            call_attempts: 0,
            email_opens: 0,
            email_clicks: 0,
            conversion_probability: leadData.conversion_probability || 0.3,
            deleted_at: null
          };
          
          // Calculate computed fields
          newLead.score = calculateLeadScore(newLead);
          newLead.lifecycle_stage = getLeadLifecycleStage(newLead);
          newLead.quality_grade = analyzeLeadQuality(newLead);
          
          // Add to leads array
          leads.push(newLead);
          
          // Log creation
          logLeadActivity(leadId, 'lead_created', {
            created_by: 'bulk_import',
            source: 'bulk_import',
            initial_score: newLead.score,
            batch_operation: true
          });
          
          // Attempt enrichment if enabled
          if (auto_enrich && newLead.email) {
            results.enrichment_attempted++;
            try {
              const enrichedData = await enrichLeadData(newLead);
              if (Object.keys(enrichedData).length > 0) {
                Object.assign(newLead, {
                  ...enrichedData,
                  last_enriched: new Date().toISOString()
                });
                results.enrichment_successful++;
              }
            } catch (enrichError) {
              // Continue without enrichment on error
              console.warn(`Enrichment failed for lead ${leadId}:`, enrichError.message);
            }
          }
          
          results.successful++;
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            lead_data: leadData,
            error: error.message
          });
        }
      }
    }
    
    // Generate summary report
    const summary = {
      ...results,
      success_rate: results.total_processed > 0 ? 
        ((results.successful / results.total_processed) * 100).toFixed(2) : 0,
      enrichment_rate: results.enrichment_attempted > 0 ? 
        ((results.enrichment_successful / results.enrichment_attempted) * 100).toFixed(2) : 0
    };
    
    return ResponseFormatter.success(
      res,
      summary,
      `Bulk import completed: ${results.successful} successful, ${results.failed} failed`,
      201
    );
  } catch (error) {
    console.error('Error in bulk import:', error);
    return ResponseFormatter.error(res, 'Bulk import failed: ' + error.message);
  }
};

/**
 * Bulk update multiple leads
 */
const bulkUpdateLeads = async (req, res) => {
  try {
    const { lead_ids, updates, options = {} } = req.body;
    const { skip_validation = false, recalculate_scores = true } = options;
    
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return ResponseFormatter.error(res, 'No lead IDs provided', 400);
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return ResponseFormatter.error(res, 'No updates provided', 400);
    }
    
    const results = {
      total_requested: lead_ids.length,
      successful: 0,
      failed: 0,
      not_found: 0,
      validation_errors: 0,
      errors: []
    };
    
    // Validate update fields
    const validateLeadUpdates = (updates) => {
      const errors = [];
      const data = { ...updates };
      
      if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
        delete data.email;
      }
      
      const validStatuses = ['New', 'Follow-up', 'Qualified', 'Converted', 'Lost', 'Not Interested'];
      if (updates.status && !validStatuses.includes(updates.status)) {
        errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
        delete data.status;
      }
      
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (updates.priority && !validPriorities.includes(updates.priority)) {
        errors.push({ field: 'priority', message: `Priority must be one of: ${validPriorities.join(', ')}` });
        delete data.priority;
      }
      
      return { data, errors };
    };
    
    for (const leadId of lead_ids) {
      try {
        const leadIndex = leads.findIndex(l => 
          (l.id === leadId || l.id === parseInt(leadId)) && !l.deleted_at
        );
        
        if (leadIndex === -1) {
          results.not_found++;
          continue;
        }
        
        const lead = leads[leadIndex];
        
        // Validate updates if not skipped
        let validatedUpdates = updates;
        if (!skip_validation) {
          const validation = validateLeadUpdates(updates);
          if (validation.errors.length > 0) {
            results.validation_errors++;
            results.failed++;
            results.errors.push({
              lead_id: leadId,
              error: 'Validation failed',
              validation_errors: validation.errors
            });
            continue;
          }
          validatedUpdates = validation.data;
        }
        
        // Apply updates
        const originalData = { ...lead };
        const updatedLead = {
          ...lead,
          ...validatedUpdates,
          updated_at: new Date().toISOString(),
          last_modified_by: req.user?.id || 'bulk_update'
        };
        
        // Recalculate computed fields if needed
        if (recalculate_scores || [\n          'industry', 'company_size', 'title', 'lead_source', 'status', \n          'priority', 'email', 'phone', 'tags'\n        ].some(field => updates.hasOwnProperty(field))) {\n          updatedLead.score = calculateLeadScore(updatedLead);\n          updatedLead.lifecycle_stage = getLeadLifecycleStage(updatedLead);\n          updatedLead.quality_grade = analyzeLeadQuality(updatedLead);\n        }\n        \n        // Update status-related fields\n        if (updates.status && ['Follow-up', 'Qualified', 'Converted'].includes(updates.status)) {\n          if (!updatedLead.last_contact) {\n            updatedLead.last_contact = new Date().toISOString();\n          }\n          if (updates.status !== originalData.status) {\n            updatedLead.call_attempts = (updatedLead.call_attempts || 0) + 1;\n          }\n        }\n        \n        leads[leadIndex] = updatedLead;\n        \n        // Log activity\n        const changedFields = Object.keys(validatedUpdates);\n        logLeadActivity(leadId, 'lead_bulk_updated', {\n          updated_by: req.user?.id || 'bulk_update',\n          changed_fields: changedFields,\n          batch_operation: true,\n          previous_values: changedFields.reduce((acc, field) => {\n            acc[field] = originalData[field];\n            return acc;\n          }, {})\n        });\n        \n        results.successful++;\n      } catch (error) {\n        results.failed++;\n        results.errors.push({\n          lead_id: leadId,\n          error: error.message\n        });\n      }\n    }\n    \n    const summary = {\n      ...results,\n      success_rate: results.total_requested > 0 ? \n        ((results.successful / results.total_requested) * 100).toFixed(2) : 0\n    };\n    \n    return ResponseFormatter.success(\n      res,\n      summary,\n      `Bulk update completed: ${results.successful} successful, ${results.failed} failed`\n    );\n  } catch (error) {\n    console.error('Error in bulk update:', error);\n    return ResponseFormatter.error(res, 'Bulk update failed: ' + error.message);\n  }\n};\n\n/**\n * Bulk delete leads (soft or hard delete)\n */\nconst bulkDeleteLeads = async (req, res) => {\n  try {\n    const { lead_ids, options = {} } = req.body;\n    const { hard_delete = false, reason = 'Bulk delete operation' } = options;\n    \n    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {\n      return ResponseFormatter.error(res, 'No lead IDs provided', 400);\n    }\n    \n    const results = {\n      total_requested: lead_ids.length,\n      successful: 0,\n      failed: 0,\n      not_found: 0,\n      already_deleted: 0,\n      deletion_type: hard_delete ? 'permanent' : 'soft',\n      errors: []\n    };\n    \n    for (const leadId of lead_ids) {\n      try {\n        const leadIndex = leads.findIndex(l => l.id === leadId || l.id === parseInt(leadId));\n        \n        if (leadIndex === -1) {\n          results.not_found++;\n          continue;\n        }\n        \n        const lead = leads[leadIndex];\n        \n        if (lead.deleted_at && !hard_delete) {\n          results.already_deleted++;\n          continue;\n        }\n        \n        if (hard_delete) {\n          // Hard delete - remove from array\n          const deletedLead = leads.splice(leadIndex, 1)[0];\n          \n          logLeadActivity(leadId, 'lead_hard_deleted', {\n            deleted_by: req.user?.id || 'bulk_delete',\n            reason: reason,\n            batch_operation: true,\n            original_data: deletedLead\n          });\n        } else {\n          // Soft delete - mark as deleted\n          leads[leadIndex] = {\n            ...lead,\n            deleted_at: new Date().toISOString(),\n            deleted_by: req.user?.id || 'bulk_delete',\n            deletion_reason: reason,\n            last_modified_by: req.user?.id || 'bulk_delete',\n            updated_at: new Date().toISOString()\n          };\n          \n          logLeadActivity(leadId, 'lead_soft_deleted', {\n            deleted_by: req.user?.id || 'bulk_delete',\n            reason: reason,\n            batch_operation: true\n          });\n        }\n        \n        results.successful++;\n      } catch (error) {\n        results.failed++;\n        results.errors.push({\n          lead_id: leadId,\n          error: error.message\n        });\n      }\n    }\n    \n    const summary = {\n      ...results,\n      success_rate: results.total_requested > 0 ? \n        ((results.successful / results.total_requested) * 100).toFixed(2) : 0\n    };\n    \n    return ResponseFormatter.success(\n      res,\n      summary,\n      `Bulk delete completed: ${results.successful} successful, ${results.failed} failed`\n    );\n  } catch (error) {\n    console.error('Error in bulk delete:', error);\n    return ResponseFormatter.error(res, 'Bulk delete failed: ' + error.message);\n  }\n};\n\n/**\n * Find duplicate leads with advanced similarity detection\n */\nconst findDuplicates = (req, res) => {\n  try {\n    const { \n      threshold = 0.8, \n      limit = 100,\n      auto_merge_threshold = 0.95,\n      include_suggestions = true \n    } = req.query;\n    \n    const duplicateGroups = findAllDuplicates(\n      parseFloat(threshold),\n      parseInt(limit)\n    );\n    \n    const summary = {\n      total_groups: duplicateGroups.length,\n      total_duplicates: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),\n      highest_similarity: duplicateGroups.length > 0 ? \n        Math.max(...duplicateGroups.map(g => g.highest_similarity)) : 0,\n      auto_merge_candidates: duplicateGroups.filter(g => \n        g.highest_similarity >= parseFloat(auto_merge_threshold)\n      ).length,\n      potential_savings: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0)\n    };\n    \n    let response = { summary, duplicate_groups: duplicateGroups };\n    \n    if (include_suggestions === 'true') {\n      response.recommendations = {\n        high_confidence_merges: duplicateGroups\n          .filter(g => g.highest_similarity >= 0.95)\n          .map(g => ({\n            primary_lead: g.recommended_primary,\n            duplicates: g.duplicates.filter(d => d.similarity_score >= 0.95),\n            action: 'auto_merge_recommended'\n          })),\n        manual_review_required: duplicateGroups\n          .filter(g => g.highest_similarity >= 0.8 && g.highest_similarity < 0.95)\n          .map(g => ({\n            primary_lead: g.primary_lead,\n            duplicates: g.duplicates,\n            action: 'manual_review_required'\n          }))\n      };\n    }\n    \n    return ResponseFormatter.success(\n      res,\n      response,\n      `Found ${summary.total_groups} duplicate groups with ${summary.total_duplicates} duplicates`\n    );\n  } catch (error) {\n    console.error('Error finding duplicates:', error);\n    return ResponseFormatter.error(res, 'Failed to find duplicates: ' + error.message);\n  }\n};\n\n/**\n * Merge two leads with customizable merge rules\n */\nconst mergeLeadsEndpoint = async (req, res) => {\n  try {\n    const { source_lead_id, target_lead_id, merge_rules = {}, preview = false } = req.body;\n    \n    if (!source_lead_id || !target_lead_id) {\n      return ResponseFormatter.error(res, 'Both source_lead_id and target_lead_id are required', 400);\n    }\n    \n    if (source_lead_id === target_lead_id) {\n      return ResponseFormatter.error(res, 'Cannot merge lead with itself', 400);\n    }\n    \n    const sourceLead = leads.find(l => l.id === source_lead_id && !l.deleted_at);\n    const targetLead = leads.find(l => l.id === target_lead_id && !l.deleted_at);\n    \n    if (!sourceLead || !targetLead) {\n      return ResponseFormatter.notFound(res, 'One or both leads not found');\n    }\n    \n    if (preview) {\n      // Return preview of merge result without actually merging\n      const previewResult = {\n        source_lead: sourceLead,\n        target_lead: targetLead,\n        merge_preview: {\n          name: merge_rules.prefer_source?.includes('name') ? sourceLead.name : targetLead.name,\n          email: targetLead.email || sourceLead.email,\n          phone: targetLead.phone || sourceLead.phone,\n          company: targetLead.company || sourceLead.company,\n          tags: [...new Set([...(targetLead.tags || []), ...(sourceLead.tags || [])])],\n          score: Math.max(sourceLead.score || 0, targetLead.score || 0),\n          notes: (targetLead.notes || '') + (sourceLead.notes ? '\\n\\n--- Merged Notes ---\\n' + sourceLead.notes : '')\n        },\n        warnings: []\n      };\n      \n      // Add warnings for potential data loss\n      if (sourceLead.email !== targetLead.email && sourceLead.email && targetLead.email) {\n        previewResult.warnings.push('Different email addresses - target will be kept');\n      }\n      \n      if (sourceLead.phone !== targetLead.phone && sourceLead.phone && targetLead.phone) {\n        previewResult.warnings.push('Different phone numbers - target will be kept');\n      }\n      \n      return ResponseFormatter.success(\n        res,\n        previewResult,\n        'Merge preview generated successfully'\n      );\n    }\n    \n    // Perform actual merge\n    const mergedLead = mergeLeads(source_lead_id, target_lead_id, merge_rules);\n    \n    logLeadActivity(target_lead_id, 'lead_merged', {\n      merged_by: req.user?.id || 'system',\n      source_lead_id: source_lead_id,\n      merge_rules_applied: Object.keys(merge_rules),\n      similarity_score: detectDuplicateLeads(sourceLead).find(d => d.id === target_lead_id)?.similarity_score\n    });\n    \n    return ResponseFormatter.success(\n      res,\n      {\n        merged_lead: mergedLead,\n        merge_info: {\n          source_lead_id,\n          target_lead_id,\n          merged_at: new Date().toISOString(),\n          merged_by: req.user?.id || 'system',\n          merge_rules_applied: merge_rules\n        }\n      },\n      'Leads merged successfully'\n    );\n  } catch (error) {\n    console.error('Error merging leads:', error);\n    return ResponseFormatter.error(res, 'Failed to merge leads: ' + error.message);\n  }\n};\n\n/**\n * Get detailed lead score breakdown and improvement suggestions\n */\nconst getLeadScoreBreakdown = (req, res) => {\n  try {\n    const { id } = req.params;\n    const lead = leads.find(l => (l.id === id || l.id === parseInt(id)) && !l.deleted_at);\n    \n    if (!lead) {\n      return ResponseFormatter.notFound(res, 'Lead');\n    }\n    \n    const breakdown = getLeadScoreBreakdown(lead);\n    const improvements = getLeadScoreImprovements(lead);\n    \n    return ResponseFormatter.success(\n      res,\n      {\n        lead_id: id,\n        lead_name: lead.name,\n        current_score: lead.score || breakdown.total,\n        score_breakdown: breakdown,\n        improvement_suggestions: improvements,\n        analysis: {\n          quality_grade: lead.quality_grade || analyzeLeadQuality(lead),\n          lifecycle_stage: lead.lifecycle_stage || getLeadLifecycleStage(lead),\n          generated_at: new Date().toISOString()\n        },\n        next_steps: improvements.slice(0, 3).map(imp => ({\n          action: `Update ${imp.field}`,\n          impact: imp.impact,\n          priority: imp.priority\n        }))\n      },\n      'Lead score breakdown retrieved successfully'\n    );\n  } catch (error) {\n    console.error('Error getting lead score breakdown:', error);\n    return ResponseFormatter.error(res, 'Failed to get score breakdown: ' + error.message);\n  }\n};\n\n/**\n * Get comprehensive lead activity timeline\n */\nconst getLeadTimeline = (req, res) => {\n  try {\n    const { id } = req.params;\n    const { \n      limit = 50,\n      activity_types,\n      start_date,\n      end_date,\n      include_system = true,\n      category\n    } = req.query;\n    \n    const lead = leads.find(l => (l.id === id || l.id === parseInt(id)) && !l.deleted_at);\n    if (!lead) {\n      return ResponseFormatter.notFound(res, 'Lead');\n    }\n    \n    const options = {\n      limit: parseInt(limit),\n      activity_types: activity_types ? activity_types.split(',') : null,\n      start_date,\n      end_date,\n      include_system: include_system === 'true'\n    };\n    \n    const timeline = fetchTimeline(id, options);\n    const stats = getLeadActivityStats(id, 30);\n    \n    // Filter by category if specified\n    let filteredTimeline = timeline;\n    if (category) {\n      filteredTimeline = timeline.filter(activity => activity.category === category);\n    }\n    \n    return ResponseFormatter.success(\n      res,\n      {\n        lead_id: id,\n        lead_name: lead.name,\n        timeline: filteredTimeline,\n        statistics: stats,\n        filters_applied: options,\n        summary: {\n          total_activities: timeline.length,\n          activities_shown: filteredTimeline.length,\n          date_range: timeline.length > 0 ? {\n            earliest: timeline[timeline.length - 1]?.timestamp,\n            latest: timeline[0]?.timestamp\n          } : null\n        }\n      },\n      'Lead timeline retrieved successfully'\n    );\n  } catch (error) {\n    console.error('Error getting lead timeline:', error);\n    return ResponseFormatter.error(res, 'Failed to get lead timeline: ' + error.message);\n  }\n};\n\n/**\n * Export leads in various formats with advanced filtering\n */\nconst exportLeads = async (req, res) => {\n  try {\n    const {\n      format = 'csv',\n      filters = {},\n      include_deleted = false,\n      fields,\n      include_activities = false,\n      max_records = 10000\n    } = req.query;\n    \n    // Apply filtering (reuse logic from getAllLeads)\n    let filteredLeads = [...leads];\n    \n    if (!include_deleted) {\n      filteredLeads = filteredLeads.filter(lead => !lead.deleted_at);\n    }\n    \n    // Apply additional filters if provided\n    if (filters.status) {\n      filteredLeads = filteredLeads.filter(l => l.status === filters.status);\n    }\n    if (filters.priority) {\n      filteredLeads = filteredLeads.filter(l => l.priority === filters.priority);\n    }\n    if (filters.assigned_to) {\n      filteredLeads = filteredLeads.filter(l => l.assigned_to === filters.assigned_to);\n    }\n    \n    // Limit results\n    if (filteredLeads.length > max_records) {\n      filteredLeads = filteredLeads.slice(0, max_records);\n    }\n    \n    // Determine export fields\n    const defaultFields = [\n      'id', 'name', 'company', 'email', 'phone', 'status', 'priority',\n      'industry', 'title', 'lead_source', 'score', 'quality_grade',\n      'lifecycle_stage', 'created_at', 'last_contact', 'assigned_to'\n    ];\n    \n    const exportFields = fields ? fields.split(',') : defaultFields;\n    \n    // Prepare export data\n    const exportData = filteredLeads.map(lead => {\n      const exportLead = {};\n      exportFields.forEach(field => {\n        if (field.includes('.')) {\n          // Handle nested fields like 'address.city'\n          const fieldPath = field.split('.');\n          let value = lead;\n          for (const path of fieldPath) {\n            value = value?.[path];\n          }\n          exportLead[field] = value || '';\n        } else if (field === 'tags' && Array.isArray(lead[field])) {\n          exportLead[field] = lead[field].join('; ');\n        } else {\n          exportLead[field] = lead[field] || '';\n        }\n      });\n      \n      // Add activity summary if requested\n      if (include_activities === 'true') {\n        const activityStats = getLeadActivityStats(lead.id, 30);\n        exportLead.recent_activities = activityStats.total_activities;\n        exportLead.last_activity = activityStats.last_activity?.timestamp || '';\n      }\n      \n      return exportLead;\n    });\n    \n    const timestamp = new Date().toISOString().split('T')[0];\n    \n    if (format === 'json') {\n      res.setHeader('Content-Type', 'application/json');\n      res.setHeader('Content-Disposition', `attachment; filename=\"leads_${timestamp}.json\"`);\n      return res.json({\n        export_info: {\n          generated_at: new Date().toISOString(),\n          total_records: exportData.length,\n          fields_included: exportFields,\n          filters_applied: filters\n        },\n        leads: exportData\n      });\n    } else if (format === 'csv') {\n      // Generate CSV\n      const csvHeader = exportFields.join(',');\n      const csvRows = exportData.map(lead => \n        exportFields.map(field => {\n          const value = lead[field];\n          // Escape CSV values that contain commas, quotes, or newlines\n          if (typeof value === 'string' && (value.includes(',') || value.includes('\"') || value.includes('\\n'))) {\n            return `\"${value.replace(/\"/g, '\"\"')}\"`;\n          }\n          return value;\n        }).join(',')\n      );\n      \n      const csvContent = [csvHeader, ...csvRows].join('\\n');\n      \n      res.setHeader('Content-Type', 'text/csv');\n      res.setHeader('Content-Disposition', `attachment; filename=\"leads_${timestamp}.csv\"`);\n      return res.send(csvContent);\n    }\n    \n    return ResponseFormatter.error(res, 'Unsupported export format. Use json or csv.', 400);\n  } catch (error) {\n    console.error('Error exporting leads:', error);\n    return ResponseFormatter.error(res, 'Failed to export leads: ' + error.message);\n  }\n};\n\n/**\n * Batch enrich leads with external data\n */\nconst batchEnrichLeads = async (req, res) => {\n  try {\n    const { \n      lead_ids, \n      options = { maxConcurrent: 5, skipIfRecentlyEnriched: true, enrichmentCacheHours: 24 }\n    } = req.body;\n    \n    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {\n      return ResponseFormatter.error(res, 'No lead IDs provided', 400);\n    }\n    \n    const leadsToEnrich = leads.filter(l => \n      lead_ids.includes(l.id) && !l.deleted_at\n    );\n    \n    if (leadsToEnrich.length === 0) {\n      return ResponseFormatter.error(res, 'No valid leads found for enrichment', 404);\n    }\n    \n    const enrichmentResults = await batchEnrichLeads(leadsToEnrich, options);\n    \n    // Update leads with enrichment data\n    enrichmentResults.forEach(result => {\n      if (result.success && result.enriched_data && !result.skipped) {\n        const leadIndex = leads.findIndex(l => l.id === result.lead_id);\n        if (leadIndex !== -1) {\n          leads[leadIndex] = {\n            ...leads[leadIndex],\n            ...result.enriched_data,\n            last_enriched: new Date().toISOString(),\n            updated_at: new Date().toISOString()\n          };\n          \n          // Log enrichment activity\n          logLeadActivity(result.lead_id, 'enrichment_completed', {\n            fields_enriched: result.fields_enriched,\n            enriched_by: 'batch_enrichment'\n          });\n        }\n      }\n    });\n    \n    const summary = {\n      total_requested: lead_ids.length,\n      leads_found: leadsToEnrich.length,\n      successful_enrichments: enrichmentResults.filter(r => r.success && !r.skipped).length,\n      skipped: enrichmentResults.filter(r => r.skipped).length,\n      failed: enrichmentResults.filter(r => !r.success).length,\n      total_fields_enriched: enrichmentResults.reduce((sum, r) => sum + (r.fields_enriched || 0), 0)\n    };\n    \n    return ResponseFormatter.success(\n      res,\n      {\n        summary,\n        detailed_results: enrichmentResults\n      },\n      `Batch enrichment completed: ${summary.successful_enrichments} leads enriched`\n    );\n  } catch (error) {\n    console.error('Error in batch enrichment:', error);\n    return ResponseFormatter.error(res, 'Batch enrichment failed: ' + error.message);\n  }\n};\n\n/**\n * Get comprehensive lead analytics\n */\nconst getLeadAnalytics = (req, res) => {\n  try {\n    const { \n      days = 30,\n      include_predictive = true,\n      granularity = 'daily'\n    } = req.query;\n    \n    const activeLeads = leads.filter(l => !l.deleted_at);\n    const analytics = generateLeadAnalytics(activeLeads, parseInt(days));\n    \n    return ResponseFormatter.success(\n      res,\n      {\n        analytics,\n        meta: {\n          generated_at: new Date().toISOString(),\n          period_days: parseInt(days),\n          total_leads_analyzed: activeLeads.length,\n          granularity\n        }\n      },\n      'Lead analytics generated successfully'\n    );\n  } catch (error) {\n    console.error('Error generating analytics:', error);\n    return ResponseFormatter.error(res, 'Failed to generate analytics: ' + error.message);\n  }\n};\n\nmodule.exports = {\n  // Bulk operations\n  bulkImportLeads,\n  bulkUpdateLeads,\n  bulkDeleteLeads,\n  \n  // Advanced features\n  findDuplicates,\n  mergeLeadsEndpoint,\n  getLeadScoreBreakdown,\n  getLeadTimeline,\n  exportLeads,\n  batchEnrichLeads,\n  getLeadAnalytics\n};"