/**
 * Lead Activity Tracking and Timeline Management
 * Manages lead interaction history and timeline
 */

const fs = require('fs').promises;
const path = require('path');

// In-memory storage for activities (in production, use database)
let leadActivities = [];

// Initialize activities file path
const ACTIVITIES_FILE = path.join(__dirname, '../data/leadActivities.json');

/**
 * Initialize activities data
 */
const initializeActivities = async () => {
  try {
    const data = await fs.readFile(ACTIVITIES_FILE, 'utf8');
    leadActivities = JSON.parse(data);
  } catch (error) {
    // File doesn't exist, start with empty array
    leadActivities = [];
    await saveActivities();
  }
};

/**
 * Save activities to file
 */
const saveActivities = async () => {
  try {
    await fs.writeFile(ACTIVITIES_FILE, JSON.stringify(leadActivities, null, 2));
  } catch (error) {
    console.error('Error saving lead activities:', error);
  }
};

/**
 * Log a lead activity
 * @param {string} leadId - Lead ID
 * @param {string} activityType - Type of activity
 * @param {Object} data - Additional activity data
 * @param {string} userId - User who performed the activity
 */
const logLeadActivity = async (leadId, activityType, data = {}, userId = 'system') => {
  const activity = {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    lead_id: leadId,
    activity_type: activityType,
    timestamp: new Date().toISOString(),
    user_id: userId,
    data: data,
    ip_address: data.ip_address || null,
    user_agent: data.user_agent || null
  };
  
  leadActivities.push(activity);
  
  // Keep only last 10000 activities to prevent memory issues
  if (leadActivities.length > 10000) {
    leadActivities = leadActivities.slice(-10000);
  }
  
  await saveActivities();
  return activity;
};

/**
 * Get lead timeline with all activities
 * @param {string} leadId - Lead ID
 * @param {Object} options - Query options
 * @returns {Array} Timeline activities
 */
const getLeadTimeline = (leadId, options = {}) => {
  const {
    limit = 100,
    activity_types = null,
    start_date = null,
    end_date = null,
    include_system = true
  } = options;
  
  let timeline = leadActivities.filter(activity => activity.lead_id === leadId);
  
  // Filter by activity types
  if (activity_types && activity_types.length > 0) {
    timeline = timeline.filter(activity => activity_types.includes(activity.activity_type));
  }
  
  // Filter by date range
  if (start_date) {
    timeline = timeline.filter(activity => new Date(activity.timestamp) >= new Date(start_date));
  }
  
  if (end_date) {
    timeline = timeline.filter(activity => new Date(activity.timestamp) <= new Date(end_date));
  }
  
  // Filter out system activities if requested
  if (!include_system) {
    timeline = timeline.filter(activity => activity.user_id !== 'system');
  }
  
  // Sort by timestamp (newest first)
  timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Limit results
  if (limit > 0) {
    timeline = timeline.slice(0, limit);
  }
  
  // Enhance activities with human-readable descriptions
  return timeline.map(activity => ({
    ...activity,
    description: getActivityDescription(activity),
    time_ago: getTimeAgo(activity.timestamp),
    category: getActivityCategory(activity.activity_type)
  }));
};

/**
 * Get human-readable description for activity
 * @param {Object} activity - Activity object
 * @returns {string} Description
 */
const getActivityDescription = (activity) => {
  const { activity_type, data } = activity;
  
  switch (activity_type) {
    case 'lead_created':
      return `Lead created from ${data.source || 'unknown source'}`;
    
    case 'lead_updated':
      const fields = data.changed_fields || [];
      return `Lead updated: ${fields.join(', ')}`;
    
    case 'lead_deleted':
      return `Lead deleted: ${data.reason || 'No reason provided'}`;
    
    case 'lead_restored':
      return `Lead restored: ${data.reason || 'No reason provided'}`;
    
    case 'call_made':
      return `Call made (${data.duration || 'unknown duration'}): ${data.outcome || 'No outcome recorded'}`;
    
    case 'call_received':
      return `Incoming call received (${data.duration || 'unknown duration'})`;
    
    case 'email_sent':
      return `Email sent: "${data.subject || 'No subject'}"`;
    
    case 'email_opened':
      return `Email opened: "${data.subject || 'No subject'}"`;
    
    case 'email_clicked':
      return `Email link clicked: ${data.link || 'unknown link'}`;
    
    case 'meeting_scheduled':
      return `Meeting scheduled for ${data.meeting_date || 'unknown date'}`;
    
    case 'meeting_completed':
      return `Meeting completed: ${data.outcome || 'No outcome recorded'}`;
    
    case 'note_added':
      return `Note added: "${data.note ? data.note.substring(0, 50) + '...' : 'No content'}"`;
    
    case 'status_changed':
      return `Status changed from "${data.previous_status}" to "${data.new_status}"`;
    
    case 'priority_changed':
      return `Priority changed from "${data.previous_priority}" to "${data.new_priority}"`;
    
    case 'assigned':
      return `Lead assigned to ${data.assigned_to || 'unknown agent'}`;
    
    case 'unassigned':
      return `Lead unassigned from ${data.previous_agent || 'unknown agent'}`;
    
    case 'tag_added':
      return `Tag added: "${data.tag}"`;
    
    case 'tag_removed':
      return `Tag removed: "${data.tag}"`;
    
    case 'score_updated':
      return `Lead score updated: ${data.previous_score || 'N/A'} → ${data.new_score || 'N/A'}`;
    
    case 'duplicate_detected':
      return `Potential duplicate detected with lead ${data.duplicate_lead_id}`;
    
    case 'merged':
      return `Lead merged with ${data.target_lead_id}`;
    
    case 'enrichment_completed':
      return `Data enrichment completed: ${data.fields_enriched || 0} fields updated`;
    
    case 'campaign_added':
      return `Added to campaign: "${data.campaign_name}"`;
    
    case 'campaign_removed':
      return `Removed from campaign: "${data.campaign_name}"`;
    
    case 'document_sent':
      return `Document sent: "${data.document_name}"`;
    
    case 'document_viewed':
      return `Document viewed: "${data.document_name}"`;
    
    case 'website_visit':
      return `Website visit: ${data.page || 'unknown page'}`;
    
    case 'form_submitted':
      return `Form submitted: "${data.form_name}"`;
    
    case 'social_media_interaction':
      return `Social media interaction on ${data.platform}: ${data.action}`;
    
    default:
      return `${activity_type.replace(/_/g, ' ')}${data.description ? ': ' + data.description : ''}`;
  }
};

/**
 * Get activity category for grouping
 * @param {string} activityType - Activity type
 * @returns {string} Category
 */
const getActivityCategory = (activityType) => {
  const categories = {
    // Lead Management
    lead_created: 'lead_management',
    lead_updated: 'lead_management',
    lead_deleted: 'lead_management',
    lead_restored: 'lead_management',
    status_changed: 'lead_management',
    priority_changed: 'lead_management',
    assigned: 'lead_management',
    unassigned: 'lead_management',
    
    // Communication
    call_made: 'communication',
    call_received: 'communication',
    email_sent: 'communication',
    email_opened: 'communication',
    email_clicked: 'communication',
    meeting_scheduled: 'communication',
    meeting_completed: 'communication',
    
    // Content & Engagement
    note_added: 'engagement',
    document_sent: 'engagement',
    document_viewed: 'engagement',
    website_visit: 'engagement',
    form_submitted: 'engagement',
    social_media_interaction: 'engagement',
    
    // Data Management
    tag_added: 'data_management',
    tag_removed: 'data_management',
    score_updated: 'data_management',
    duplicate_detected: 'data_management',
    merged: 'data_management',
    enrichment_completed: 'data_management',
    
    // Campaigns
    campaign_added: 'campaigns',
    campaign_removed: 'campaigns'
  };
  
  return categories[activityType] || 'other';
};

/**
 * Get time ago string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Time ago string
 */
const getTimeAgo = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
};

/**
 * Get activity statistics for a lead
 * @param {string} leadId - Lead ID
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Object} Activity statistics
 */
const getLeadActivityStats = (leadId, days = 30) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentActivities = leadActivities.filter(activity => 
    activity.lead_id === leadId && new Date(activity.timestamp) >= cutoffDate
  );
  
  const stats = {
    total_activities: recentActivities.length,
    by_category: {},
    by_type: {},
    by_day: {},
    most_active_day: null,
    last_activity: null,
    activity_frequency: 0 // activities per day
  };
  
  recentActivities.forEach(activity => {
    const category = getActivityCategory(activity.activity_type);
    const type = activity.activity_type;
    const day = activity.timestamp.split('T')[0];
    
    stats.by_category[category] = (stats.by_category[category] || 0) + 1;
    stats.by_type[type] = (stats.by_type[type] || 0) + 1;
    stats.by_day[day] = (stats.by_day[day] || 0) + 1;
  });
  
  // Find most active day
  if (Object.keys(stats.by_day).length > 0) {
    stats.most_active_day = Object.entries(stats.by_day)
      .sort(([,a], [,b]) => b - a)[0][0];
  }
  
  // Get last activity
  if (recentActivities.length > 0) {
    stats.last_activity = recentActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  }
  
  // Calculate activity frequency
  stats.activity_frequency = days > 0 ? (stats.total_activities / days).toFixed(2) : 0;
  
  return stats;
};

/**
 * Get bulk activity statistics for multiple leads
 * @param {Array} leadIds - Array of lead IDs
 * @param {number} days - Number of days to analyze
 * @returns {Object} Bulk statistics
 */
const getBulkActivityStats = (leadIds, days = 30) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const relevantActivities = leadActivities.filter(activity =>
    leadIds.includes(activity.lead_id) && new Date(activity.timestamp) >= cutoffDate
  );
  
  const stats = {
    total_leads: leadIds.length,
    total_activities: relevantActivities.length,
    average_activities_per_lead: 0,
    most_active_leads: [],
    activity_trends: {},
    category_breakdown: {}
  };
  
  // Calculate per-lead activity counts
  const leadActivityCounts = {};
  relevantActivities.forEach(activity => {
    leadActivityCounts[activity.lead_id] = (leadActivityCounts[activity.lead_id] || 0) + 1;
    
    const category = getActivityCategory(activity.activity_type);
    stats.category_breakdown[category] = (stats.category_breakdown[category] || 0) + 1;
    
    const day = activity.timestamp.split('T')[0];
    stats.activity_trends[day] = (stats.activity_trends[day] || 0) + 1;
  });
  
  stats.average_activities_per_lead = leadIds.length > 0 ? 
    (stats.total_activities / leadIds.length).toFixed(2) : 0;
  
  // Get most active leads
  stats.most_active_leads = Object.entries(leadActivityCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([leadId, count]) => ({ lead_id: leadId, activity_count: count }));
  
  return stats;
};

// Initialize activities on module load
initializeActivities().catch(console.error);

module.exports = {
  logLeadActivity,
  getLeadTimeline,
  getLeadActivityStats,
  getBulkActivityStats,
  getActivityDescription,
  getActivityCategory,
  getTimeAgo
};