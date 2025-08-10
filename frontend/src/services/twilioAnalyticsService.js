/**
 * Twilio Analytics Service - Frontend API client for cost monitoring
 * Handles all communication with Twilio analytics endpoints
 */
class TwilioAnalyticsService {
  constructor() {
    this.baseURL = '/api/twilio-analytics';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authorization headers with current token
   */
  getHeaders() {
    const token = localStorage.getItem('token');
    return {
      ...this.defaultHeaders,
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Handle API responses with error checking
   */
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get comprehensive cost analytics
   */
  async getCostAnalytics(startDate, endDate, granularity = 'daily') {
    try {
      const params = new URLSearchParams({
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
        granularity
      });

      const response = await fetch(`${this.baseURL}/costs?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Cost analytics loaded:', {
        period: result.data?.summary?.period,
        totalCost: result.data?.summary?.totalCost
      });

      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get cost analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time cost metrics for dashboard
   */
  async getRealTimeMetrics() {
    try {
      const response = await fetch(`${this.baseURL}/metrics`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Real-time metrics loaded:', {
        today: result.data?.today,
        thisWeek: result.data?.thisWeek,
        thisMonth: result.data?.thisMonth
      });

      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Update cost thresholds
   */
  async updateCostThresholds(thresholds) {
    try {
      const response = await fetch(`${this.baseURL}/thresholds`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(thresholds)
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Cost thresholds updated:', thresholds);
      
      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to update thresholds:', error);
      throw error;
    }
  }

  /**
   * Get cost forecasts
   */
  async getCostForecasts(period = 30) {
    try {
      const params = new URLSearchParams({ period: period.toString() });

      const response = await fetch(`${this.baseURL}/forecasts?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Forecasts loaded:', {
        nextWeek: result.data?.forecasts?.nextWeek?.cost,
        nextMonth: result.data?.forecasts?.nextMonth?.cost
      });

      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get forecasts:', error);
      throw error;
    }
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(period = 30) {
    try {
      const params = new URLSearchParams({ period: period.toString() });

      const response = await fetch(`${this.baseURL}/optimize?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Optimization suggestions loaded:', {
        estimatedSavings: result.data?.optimization?.estimatedSavings,
        suggestionsCount: (result.data?.optimization?.immediate?.length || 0) +
                         (result.data?.optimization?.shortTerm?.length || 0) +
                         (result.data?.optimization?.longTerm?.length || 0)
      });

      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get optimization suggestions:', error);
      throw error;
    }
  }

  /**
   * Export cost report
   */
  async exportCostReport(startDate, endDate, format = 'json') {
    try {
      const params = new URLSearchParams({
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
        format
      });

      const response = await fetch(`${this.baseURL}/export?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `twilio-cost-report-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('💰 [TwilioAnalytics] CSV report exported');
        return { success: true, message: 'CSV report downloaded' };
      } else {
        const result = await this.handleResponse(response);
        
        // Download JSON report
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `twilio-cost-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('💰 [TwilioAnalytics] JSON report exported');
        return { success: true, message: 'JSON report downloaded', data: result.data };
      }

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to export report:', error);
      throw error;
    }
  }

  /**
   * Get cost alerts
   */
  async getCostAlerts() {
    try {
      const response = await fetch(`${this.baseURL}/alerts`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Cost alerts loaded:', {
        activeAlerts: result.data?.alerts?.active?.length || 0,
        warnings: result.data?.alerts?.warnings?.length || 0,
        info: result.data?.alerts?.info?.length || 0
      });

      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get cost alerts:', error);
      throw error;
    }
  }

  /**
   * Get usage breakdown by category
   */
  async getUsageBreakdown(startDate, endDate, category) {
    try {
      const params = new URLSearchParams({
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
        ...(category && { category })
      });

      const response = await fetch(`${this.baseURL}/breakdown?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Usage breakdown loaded:', {
        categories: result.data?.breakdown?.categories?.length || 0,
        timelineEntries: result.data?.timeline?.length || 0
      });

      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get usage breakdown:', error);
      throw error;
    }
  }

  /**
   * Get cost summary for quick dashboard display
   */
  async getCostSummary() {
    try {
      // Get current month data
      const endDate = new Date();
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      const [analytics, metrics] = await Promise.all([
        this.getCostAnalytics(startDate, endDate),
        this.getRealTimeMetrics()
      ]);

      return {
        success: true,
        data: {
          summary: analytics.data?.summary || {},
          realTime: metrics.data || {},
          alerts: analytics.data?.alerts || { active: [], warnings: [], info: [] }
        }
      };

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get cost summary:', error);
      throw error;
    }
  }

  /**
   * Monitor cost changes (polling function)
   */
  async startCostMonitoring(callback, interval = 60000) {
    console.log('💰 [TwilioAnalytics] Starting cost monitoring...');
    
    const monitor = async () => {
      try {
        const summary = await this.getCostSummary();
        if (callback) callback(summary.data);
      } catch (error) {
        console.error('💰 [TwilioAnalytics] Cost monitoring error:', error);
        if (callback) callback(null, error);
      }
    };

    // Initial call
    await monitor();
    
    // Set up interval
    const intervalId = setInterval(monitor, interval);
    
    return {
      stop: () => {
        clearInterval(intervalId);
        console.log('💰 [TwilioAnalytics] Cost monitoring stopped');
      }
    };
  }

  /**
   * Validate API connection and get service health
   */
  async validateConnection() {
    try {
      const response = await fetch('/api/twilio/health', {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      
      console.log('💰 [TwilioAnalytics] Service health check:', result);
      
      return {
        success: true,
        healthy: result.status === 'healthy',
        data: result
      };

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Health check failed:', error);
      return {
        success: false,
        healthy: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const twilioAnalyticsService = new TwilioAnalyticsService();

export default twilioAnalyticsService;