/**
 * Database Index Optimizer
 * Analyzes query patterns and recommends/creates optimal indexes
 */

const { sequelize } = require('../config/database');
const performanceMonitor = require('../monitoring/performanceMonitor');
const { performance } = require('perf_hooks');

class IndexOptimizer {
  constructor() {
    this.queryLog = [];
    this.indexSuggestions = [];
    this.indexAnalysis = {
      existing: [],
      missing: [],
      unused: [],
      redundant: []
    };
    
    // Common query patterns to monitor
    this.queryPatterns = {
      frequent: [], // High frequency queries
      slow: [],     // Slow queries
      complex: []   // Complex JOIN queries
    };
    
    // Index recommendations database
    this.indexRecommendations = {
      leads: [
        { columns: ['email'], type: 'unique', priority: 'high', reason: 'Primary lookup field' },
        { columns: ['phone'], type: 'index', priority: 'high', reason: 'Frequently searched' },
        { columns: ['status'], type: 'index', priority: 'medium', reason: 'Status filtering' },
        { columns: ['priority'], type: 'index', priority: 'medium', reason: 'Priority sorting' },
        { columns: ['assignedTo'], type: 'index', priority: 'medium', reason: 'Agent filtering' },
        { columns: ['nextFollowUpDate'], type: 'index', priority: 'medium', reason: 'Date range queries' },
        { columns: ['createdAt'], type: 'index', priority: 'low', reason: 'Date sorting' },
        { columns: ['status', 'priority'], type: 'composite', priority: 'high', reason: 'Combined filtering' },
        { columns: ['assignedTo', 'status'], type: 'composite', priority: 'medium', reason: 'Agent dashboard queries' }
      ],
      contacts: [
        { columns: ['leadId'], type: 'index', priority: 'high', reason: 'Foreign key lookups' },
        { columns: ['type'], type: 'index', priority: 'medium', reason: 'Contact type filtering' },
        { columns: ['isPrimary'], type: 'index', priority: 'low', reason: 'Primary contact queries' },
        { columns: ['leadId', 'isPrimary'], type: 'composite', priority: 'medium', reason: 'Primary contact lookup' }
      ],
      call_logs: [
        { columns: ['leadId'], type: 'index', priority: 'high', reason: 'Call history lookups' },
        { columns: ['initiatedAt'], type: 'index', priority: 'high', reason: 'Time-based queries' },
        { columns: ['status'], type: 'index', priority: 'medium', reason: 'Call status filtering' },
        { columns: ['agentId'], type: 'index', priority: 'medium', reason: 'Agent performance queries' },
        { columns: ['duration'], type: 'index', priority: 'low', reason: 'Duration analysis' },
        { columns: ['leadId', 'initiatedAt'], type: 'composite', priority: 'high', reason: 'Lead call history' },
        { columns: ['agentId', 'initiatedAt'], type: 'composite', priority: 'medium', reason: 'Agent activity reports' }
      ],
      enhanced_call_logs: [
        { columns: ['leadId'], type: 'index', priority: 'high', reason: 'Enhanced call lookups' },
        { columns: ['callId'], type: 'index', priority: 'medium', reason: 'Call correlation' },
        { columns: ['sentiment'], type: 'index', priority: 'low', reason: 'Sentiment analysis' },
        { columns: ['qualityScore'], type: 'index', priority: 'low', reason: 'Quality filtering' }
      ],
      notes: [
        { columns: ['leadId'], type: 'index', priority: 'high', reason: 'Note lookups by lead' },
        { columns: ['createdAt'], type: 'index', priority: 'medium', reason: 'Chronological sorting' },
        { columns: ['tags'], type: 'index', priority: 'low', reason: 'Tag-based searches' },
        { columns: ['leadId', 'createdAt'], type: 'composite', priority: 'medium', reason: 'Lead note timeline' }
      ],
      note_templates: [
        { columns: ['category'], type: 'index', priority: 'medium', reason: 'Template categorization' },
        { columns: ['isActive'], type: 'index', priority: 'low', reason: 'Active template filtering' }
      ]
    };
    
    this.performanceThresholds = {
      slowQueryTime: 500,  // 500ms
      frequentQueryCount: 10, // 10+ times
      indexUsageThreshold: 0.1 // 10% usage threshold
    };
  }
  
  /**
   * Analyze current database performance and indexes
   */
  async analyzeIndexPerformance() {
    console.log('🔍 Starting database index analysis...');
    
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        existing_indexes: await this.getExistingIndexes(),
        query_patterns: await this.analyzeQueryPatterns(),
        recommendations: await this.generateIndexRecommendations(),
        performance_impact: await this.calculatePerformanceImpact()
      };
      
      this.indexAnalysis = analysis;
      console.log('✅ Index analysis completed');
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Index analysis failed:', error);
      throw error;
    }
  }
  
  /**
   * Get all existing indexes in the database
   */
  async getExistingIndexes() {
    try {
      const indexes = {};
      const tables = ['leads', 'contacts', 'call_logs', 'enhanced_call_logs', 'notes', 'note_templates'];
      
      for (const table of tables) {
        try {
          // Get indexes for SQLite
          const tableIndexes = await sequelize.query(
            `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name=?`,
            {
              replacements: [table],
              type: sequelize.QueryTypes.SELECT
            }
          );
          
          indexes[table] = tableIndexes.map(idx => ({
            name: idx.name,
            sql: idx.sql,
            columns: this.extractColumnsFromIndex(idx.sql),
            unique: idx.sql?.includes('UNIQUE') || false,
            type: this.determineIndexType(idx.sql)
          })).filter(idx => !idx.name.startsWith('sqlite_')); // Filter out system indexes
          
        } catch (error) {
          console.warn(`⚠️ Could not analyze indexes for table ${table}:`, error.message);
          indexes[table] = [];
        }
      }
      
      return indexes;
      
    } catch (error) {
      console.error('❌ Failed to get existing indexes:', error);
      return {};
    }
  }
  
  /**
   * Analyze query patterns from performance monitor
   */
  async analyzeQueryPatterns() {
    try {
      const performanceStats = performanceMonitor.getPerformanceStats();
      const slowQueries = performanceStats.recentSlowQueries || [];
      
      const patterns = {
        slow_queries: slowQueries.map(query => ({
          sql: query.sql,
          duration: query.duration,
          frequency: 1, // Would need to track this over time
          tables_involved: this.extractTablesFromQuery(query.sql),
          columns_used: this.extractColumnsFromQuery(query.sql)
        })),
        frequent_operations: this.analyzeFrequentOperations(performanceStats),
        join_patterns: this.analyzeJoinPatterns(slowQueries)
      };
      
      return patterns;
      
    } catch (error) {
      console.error('❌ Failed to analyze query patterns:', error);
      return { slow_queries: [], frequent_operations: [], join_patterns: [] };
    }
  }
  
  /**
   * Generate index recommendations based on analysis
   */
  async generateIndexRecommendations() {
    try {
      const existingIndexes = await this.getExistingIndexes();
      const recommendations = [];
      
      // Check each table against recommended indexes
      for (const [tableName, tableRecommendations] of Object.entries(this.indexRecommendations)) {
        const existing = existingIndexes[tableName] || [];
        
        for (const recommendation of tableRecommendations) {
          const indexExists = this.checkIndexExists(existing, recommendation.columns);
          
          if (!indexExists) {
            const impact = await this.estimateIndexImpact(tableName, recommendation);
            
            recommendations.push({
              table: tableName,
              columns: recommendation.columns,
              type: recommendation.type,
              priority: recommendation.priority,
              reason: recommendation.reason,
              estimated_impact: impact,
              sql: this.generateIndexSQL(tableName, recommendation),
              implementation_order: this.calculateImplementationOrder(recommendation)
            });
          }
        }
      }
      
      // Sort by priority and estimated impact
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return (b.estimated_impact?.performance_gain || 0) - (a.estimated_impact?.performance_gain || 0);
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('❌ Failed to generate index recommendations:', error);
      return [];
    }
  }
  
  /**
   * Calculate performance impact of current index configuration
   */
  async calculatePerformanceImpact() {
    try {
      const stats = performanceMonitor.getPerformanceStats();
      
      const impact = {
        current_performance: {
          avg_query_time: stats.queries?.averageTime || 0,
          slow_query_count: stats.queries?.slowQueries || 0,
          total_queries: stats.queries?.total || 0
        },
        index_effectiveness: await this.analyzeIndexEffectiveness(),
        bottlenecks: await this.identifyPerformanceBottlenecks(),
        projected_improvements: await this.calculateProjectedImprovements()
      };
      
      return impact;
      
    } catch (error) {
      console.error('❌ Failed to calculate performance impact:', error);
      return {};
    }
  }
  
  /**
   * Implement recommended indexes
   */
  async implementIndexRecommendations(recommendations = null, options = {}) {
    const indexesToImplement = recommendations || this.indexAnalysis.recommendations;
    const { dryRun = false, maxIndexes = 5, priorityFilter = ['high', 'medium'] } = options;
    
    if (!indexesToImplement || indexesToImplement.length === 0) {
      console.log('ℹ️ No index recommendations to implement');
      return { implemented: [], errors: [] };
    }
    
    // Filter by priority and limit
    const filteredIndexes = indexesToImplement
      .filter(rec => priorityFilter.includes(rec.priority))
      .slice(0, maxIndexes);
    
    console.log(`🚀 ${dryRun ? 'Simulating' : 'Implementing'} ${filteredIndexes.length} index recommendations...`);
    
    const results = {
      implemented: [],
      errors: [],
      performance_before: await this.benchmarkQueryPerformance(),
      performance_after: null
    };
    
    for (const recommendation of filteredIndexes) {
      try {
        const startTime = performance.now();
        
        if (!dryRun) {
          await sequelize.query(recommendation.sql);
        }
        
        const implementationTime = performance.now() - startTime;
        
        results.implemented.push({
          ...recommendation,
          implementation_time: implementationTime,
          status: dryRun ? 'simulated' : 'implemented',
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ ${dryRun ? 'Simulated' : 'Implemented'} index: ${recommendation.table} (${recommendation.columns.join(', ')})`);
        
      } catch (error) {
        const errorResult = {
          ...recommendation,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        results.errors.push(errorResult);
        console.error(`❌ Failed to ${dryRun ? 'simulate' : 'implement'} index ${recommendation.table} (${recommendation.columns.join(', ')}):`, error.message);
      }
    }
    
    // Benchmark performance after implementation
    if (!dryRun && results.implemented.length > 0) {
      // Wait a moment for indexes to be ready
      await this.sleep(1000);
      results.performance_after = await this.benchmarkQueryPerformance();
    }
    
    console.log(`✅ Index ${dryRun ? 'simulation' : 'implementation'} completed: ${results.implemented.length} successful, ${results.errors.length} failed`);
    
    return results;
  }
  
  /**
   * Benchmark query performance
   */
  async benchmarkQueryPerformance() {
    const benchmarks = {
      timestamp: Date.now(),
      tests: []
    };
    
    // Common query benchmarks
    const testQueries = [
      {
        name: 'lead_by_email',
        query: 'SELECT * FROM leads WHERE email = ?',
        params: ['test@example.com']
      },
      {
        name: 'leads_by_status',
        query: 'SELECT * FROM leads WHERE status = ?',
        params: ['active']
      },
      {
        name: 'calls_by_date_range',
        query: 'SELECT * FROM call_logs WHERE initiatedAt BETWEEN ? AND ?',
        params: [new Date(Date.now() - 86400000).toISOString(), new Date().toISOString()]
      },
      {
        name: 'agent_performance',
        query: 'SELECT agentId, COUNT(*) as calls FROM call_logs WHERE agentId IS NOT NULL GROUP BY agentId',
        params: []
      }
    ];
    
    for (const test of testQueries) {
      try {
        const startTime = performance.now();
        const results = await sequelize.query(test.query, {
          replacements: test.params,
          type: sequelize.QueryTypes.SELECT
        });
        const duration = performance.now() - startTime;
        
        benchmarks.tests.push({
          name: test.name,
          duration: duration,
          rows_returned: results.length,
          status: 'success'
        });
        
      } catch (error) {
        benchmarks.tests.push({
          name: test.name,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    return benchmarks;
  }
  
  /**
   * Monitor index usage and effectiveness
   */
  async monitorIndexUsage(duration = 300000) { // 5 minutes
    console.log(`📊 Starting index usage monitoring for ${duration / 1000}s...`);
    
    const monitoring = {
      start_time: Date.now(),
      duration: duration,
      query_count: 0,
      index_hits: {},
      slow_queries: [],
      recommendations: []
    };
    
    // Set up query monitoring
    const originalQuery = sequelize.query;
    sequelize.query = function(...args) {
      const startTime = performance.now();
      const sql = args[0];
      
      monitoring.query_count++;
      
      const result = originalQuery.apply(this, args);
      
      if (result && typeof result.then === 'function') {
        return result.then(
          (queryResult) => {
            const duration = performance.now() - startTime;
            
            if (duration > 100) { // Track queries > 100ms
              monitoring.slow_queries.push({
                sql: sql.substring(0, 200),
                duration: Math.round(duration),
                timestamp: Date.now()
              });
            }
            
            return queryResult;
          },
          (error) => {
            throw error;
          }
        );
      }
      
      return result;
    };
    
    // Run monitoring for specified duration
    await this.sleep(duration);
    
    // Restore original query function
    sequelize.query = originalQuery;
    
    monitoring.end_time = Date.now();
    
    // Analyze results
    monitoring.analysis = {
      avg_queries_per_second: monitoring.query_count / (duration / 1000),
      slow_query_percentage: (monitoring.slow_queries.length / monitoring.query_count) * 100,
      most_frequent_slow_patterns: this.analyzeMostFrequentSlowPatterns(monitoring.slow_queries)
    };
    
    console.log('✅ Index usage monitoring completed');
    console.log(`  Total queries: ${monitoring.query_count}`);
    console.log(`  Slow queries: ${monitoring.slow_queries.length} (${monitoring.analysis.slow_query_percentage.toFixed(2)}%)`);
    console.log(`  Queries/second: ${monitoring.analysis.avg_queries_per_second.toFixed(2)}`);
    
    return monitoring;
  }
  
  // Helper methods
  extractColumnsFromIndex(sql) {
    if (!sql) return [];
    
    const match = sql.match(/\((.*?)\)/);
    if (match) {
      return match[1].split(',').map(col => col.trim().replace(/["`]/g, ''));
    }
    
    return [];
  }
  
  determineIndexType(sql) {
    if (!sql) return 'unknown';
    
    if (sql.includes('UNIQUE')) return 'unique';
    if (sql.includes('PRIMARY KEY')) return 'primary';
    return 'index';
  }
  
  extractTablesFromQuery(sql) {
    const tables = [];
    const matches = sql.match(/(?:FROM|JOIN)\s+(\w+)/gi);
    
    if (matches) {
      matches.forEach(match => {
        const table = match.replace(/(?:FROM|JOIN)\s+/i, '').trim();
        if (!tables.includes(table)) {
          tables.push(table);
        }
      });
    }
    
    return tables;
  }
  
  extractColumnsFromQuery(sql) {
    const columns = [];
    
    // Extract WHERE clause columns
    const whereMatches = sql.match(/WHERE\s+.*?(?:ORDER|GROUP|LIMIT|$)/i);
    if (whereMatches) {
      const whereClause = whereMatches[0];
      const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g);
      if (columnMatches) {
        columnMatches.forEach(match => {
          const column = match.replace(/\s*[=<>!].*/, '').trim();
          if (!columns.includes(column)) {
            columns.push(column);
          }
        });
      }
    }
    
    // Extract ORDER BY columns
    const orderMatches = sql.match(/ORDER\s+BY\s+(.*?)(?:LIMIT|$)/i);
    if (orderMatches) {
      const orderColumns = orderMatches[1].split(',');
      orderColumns.forEach(col => {
        const column = col.trim().replace(/\s+(ASC|DESC)$/i, '');
        if (!columns.includes(column)) {
          columns.push(column);
        }
      });
    }
    
    return columns;
  }
  
  checkIndexExists(existingIndexes, columns) {
    return existingIndexes.some(index => {
      const indexColumns = index.columns;
      return columns.every((col, i) => indexColumns[i] === col) && 
             columns.length === indexColumns.length;
    });
  }
  
  async estimateIndexImpact(tableName, recommendation) {
    try {
      // Estimate based on table size and query patterns
      const tableStats = await this.getTableStatistics(tableName);
      
      const impact = {
        performance_gain: this.calculatePerformanceGain(recommendation, tableStats),
        storage_cost: this.calculateStorageCost(recommendation, tableStats),
        maintenance_overhead: this.calculateMaintenanceOverhead(recommendation)
      };
      
      return impact;
    } catch (error) {
      return { performance_gain: 0, storage_cost: 0, maintenance_overhead: 'low' };
    }
  }
  
  async getTableStatistics(tableName) {
    try {
      const result = await sequelize.query(
        `SELECT COUNT(*) as row_count FROM ${tableName}`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      return {
        row_count: result[0]?.row_count || 0,
        estimated_size: (result[0]?.row_count || 0) * 1024 // Rough estimate
      };
    } catch (error) {
      return { row_count: 0, estimated_size: 0 };
    }
  }
  
  calculatePerformanceGain(recommendation, tableStats) {
    const baseGain = {
      high: 0.7,
      medium: 0.4,
      low: 0.2
    };
    
    const sizeMultiplier = Math.min(tableStats.row_count / 10000, 2); // More benefit for larger tables
    return (baseGain[recommendation.priority] || 0.2) * (1 + sizeMultiplier);
  }
  
  calculateStorageCost(recommendation, tableStats) {
    const bytesPerRow = recommendation.columns.length * 32; // Rough estimate
    return tableStats.row_count * bytesPerRow;
  }
  
  calculateMaintenanceOverhead(recommendation) {
    if (recommendation.type === 'composite' && recommendation.columns.length > 3) {
      return 'high';
    } else if (recommendation.type === 'unique') {
      return 'medium';
    }
    return 'low';
  }
  
  generateIndexSQL(tableName, recommendation) {
    const indexName = `idx_${tableName}_${recommendation.columns.join('_')}`;
    const uniqueKeyword = recommendation.type === 'unique' ? 'UNIQUE ' : '';
    const columns = recommendation.columns.join(', ');
    
    return `CREATE ${uniqueKeyword}INDEX ${indexName} ON ${tableName}(${columns})`;
  }
  
  calculateImplementationOrder(recommendation) {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    const typeOrder = { unique: 1, index: 2, composite: 3 };
    
    return (priorityOrder[recommendation.priority] || 3) * 10 + 
           (typeOrder[recommendation.type] || 3);
  }
  
  analyzeFrequentOperations(stats) {
    const operations = [];
    
    if (stats.queries?.byType) {
      Object.entries(stats.queries.byType).forEach(([type, data]) => {
        if (data.count > 10) { // Frequent operations
          operations.push({
            type: type,
            count: data.count,
            avg_time: data.averageTime || 0
          });
        }
      });
    }
    
    return operations;
  }
  
  analyzeJoinPatterns(slowQueries) {
    const patterns = [];
    
    slowQueries.forEach(query => {
      if (query.sql.toLowerCase().includes('join')) {
        const tables = this.extractTablesFromQuery(query.sql);
        if (tables.length > 1) {
          patterns.push({
            tables: tables,
            duration: query.duration,
            sql_snippet: query.sql.substring(0, 100)
          });
        }
      }
    });
    
    return patterns;
  }
  
  async analyzeIndexEffectiveness() {
    // This would require EXPLAIN QUERY PLAN analysis
    // For now, return a simplified analysis
    return {
      indexes_used: 'Would require EXPLAIN analysis',
      table_scans: 'Would require query plan analysis',
      join_efficiency: 'Would require detailed profiling'
    };
  }
  
  async identifyPerformanceBottlenecks() {
    const stats = performanceMonitor.getPerformanceStats();
    const bottlenecks = [];
    
    if (stats.queries?.averageTime > 100) {
      bottlenecks.push({
        type: 'slow_queries',
        severity: 'medium',
        description: `Average query time is ${stats.queries.averageTime.toFixed(2)}ms`
      });
    }
    
    if (stats.queries?.slowQueries > 10) {
      bottlenecks.push({
        type: 'frequent_slow_queries',
        severity: 'high',
        description: `${stats.queries.slowQueries} slow queries detected`
      });
    }
    
    return bottlenecks;
  }
  
  async calculateProjectedImprovements() {
    const currentStats = performanceMonitor.getPerformanceStats();
    
    return {
      estimated_query_time_reduction: '30-50%',
      estimated_throughput_increase: '20-40%',
      estimated_resource_usage_reduction: '15-25%',
      note: 'Estimates based on typical index performance improvements'
    };
  }
  
  analyzeMostFrequentSlowPatterns(slowQueries) {
    const patterns = {};
    
    slowQueries.forEach(query => {
      // Simple pattern extraction - look for table names
      const tables = this.extractTablesFromQuery(query.sql);
      const pattern = tables.join('_');
      
      if (!patterns[pattern]) {
        patterns[pattern] = { count: 0, total_duration: 0, example: query.sql };
      }
      
      patterns[pattern].count++;
      patterns[pattern].total_duration += query.duration;
      patterns[pattern].avg_duration = patterns[pattern].total_duration / patterns[pattern].count;
    });
    
    return Object.entries(patterns)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .map(([pattern, data]) => ({ pattern, ...data }));
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Generate comprehensive optimization report
   */
  async generateOptimizationReport() {
    const analysis = await this.analyzeIndexPerformance();
    
    const report = {
      timestamp: new Date().toISOString(),
      executive_summary: {
        total_recommendations: analysis.recommendations?.length || 0,
        high_priority_recommendations: analysis.recommendations?.filter(r => r.priority === 'high').length || 0,
        estimated_performance_improvement: '30-50%',
        implementation_effort: 'Low to Medium'
      },
      current_state: {
        existing_indexes: analysis.existing_indexes,
        performance_metrics: analysis.performance_impact?.current_performance,
        bottlenecks: analysis.performance_impact?.bottlenecks
      },
      recommendations: analysis.recommendations,
      implementation_plan: this.generateImplementationPlan(analysis.recommendations),
      risk_assessment: this.assessImplementationRisk(analysis.recommendations)
    };
    
    return report;
  }
  
  generateImplementationPlan(recommendations) {
    const plan = {
      phases: [],
      total_estimated_time: 0,
      success_criteria: []
    };
    
    const highPriority = recommendations.filter(r => r.priority === 'high');
    const mediumPriority = recommendations.filter(r => r.priority === 'medium');
    const lowPriority = recommendations.filter(r => r.priority === 'low');
    
    if (highPriority.length > 0) {
      plan.phases.push({
        phase: 1,
        name: 'Critical Performance Indexes',
        recommendations: highPriority,
        estimated_time: '1-2 hours',
        expected_improvement: '40-60%'
      });
    }
    
    if (mediumPriority.length > 0) {
      plan.phases.push({
        phase: 2,
        name: 'Secondary Optimization Indexes',
        recommendations: mediumPriority,
        estimated_time: '2-4 hours',
        expected_improvement: '20-30%'
      });
    }
    
    if (lowPriority.length > 0) {
      plan.phases.push({
        phase: 3,
        name: 'Fine-tuning Indexes',
        recommendations: lowPriority,
        estimated_time: '1-2 hours',
        expected_improvement: '10-15%'
      });
    }
    
    return plan;
  }
  
  assessImplementationRisk(recommendations) {
    return {
      overall_risk: 'Low',
      storage_impact: 'Minimal',
      downtime_required: 'None',
      rollback_plan: 'Indexes can be dropped safely if needed',
      monitoring_requirements: [
        'Monitor query performance before and after',
        'Track storage usage growth',
        'Watch for lock contention during peak hours'
      ]
    };
  }
}

module.exports = new IndexOptimizer();