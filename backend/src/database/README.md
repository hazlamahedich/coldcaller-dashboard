# Cold Caller Database Architecture

## 🏗️ Architecture Overview

This database system provides a comprehensive, high-performance data layer for the Cold Caller application with advanced lead management, call tracking, and contact organization capabilities.

### Key Features

- **🔄 Multi-Environment Support**: SQLite for development, PostgreSQL for production
- **⚡ High-Performance Caching**: Redis-like in-memory caching with intelligent invalidation
- **📊 Performance Monitoring**: Real-time query analysis and optimization recommendations
- **🔒 Data Validation**: Comprehensive Joi-based validation with business logic
- **🔍 Advanced Search**: Full-text search with filtering and pagination
- **📈 Analytics Ready**: Pre-built aggregation queries for reporting
- **🛡️ Data Integrity**: Foreign key constraints, soft deletes, audit trails
- **🏃 Migration System**: Version-controlled schema changes
- **💾 Backup & Recovery**: Automated backups with compression and verification

## 📋 Database Schema

### Core Tables

#### Leads Table
Primary entity for managing sales leads with comprehensive contact and lifecycle information.

```sql
leads (
  id UUID PRIMARY KEY,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  company VARCHAR(255) NOT NULL,
  status ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing'),
  priority ENUM('low', 'medium', 'high', 'urgent'),
  leadScore INTEGER(0-100),
  conversionProbability DECIMAL(3,2),
  -- ... additional fields
)
```

#### Contacts Table
Multiple contact points per lead (phones, emails, addresses, social media).

```sql
contacts (
  id UUID PRIMARY KEY,
  leadId UUID FOREIGN KEY,
  type ENUM('phone', 'email', 'address', 'social'),
  value VARCHAR(500) NOT NULL,
  isPrimary BOOLEAN DEFAULT false,
  isVerified BOOLEAN DEFAULT false,
  -- ... additional fields
)
```

#### Call Logs Table
Detailed call activity tracking with SIP integration support.

```sql
call_logs (
  id UUID PRIMARY KEY,
  leadId UUID FOREIGN KEY,
  phoneNumber VARCHAR(20) NOT NULL,
  direction ENUM('inbound', 'outbound'),
  status ENUM('initiated', 'ringing', 'answered', 'busy', 'failed', 'voicemail', 'completed'),
  duration INTEGER, -- seconds
  recordingUrl VARCHAR(500),
  -- ... additional fields
)
```

### Relationships

```
Lead (1) ——— (many) Contacts
Lead (1) ——— (many) CallLogs
```

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database configuration
```

### Database Setup

```bash
# Run migrations to create tables
npm run db:migrate

# Seed database with sample data (optional)
npm run db:seed

# Or do both in one command
npm run db:reset
```

### Environment Configuration

#### Development (SQLite)
```env
NODE_ENV=development
# SQLite file will be created automatically
```

#### Production (PostgreSQL)
```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coldcaller_prod
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=true
```

## 💻 Usage Examples

### Basic Lead Operations

```javascript
const { Lead, Contact, CallLog } = require('./src/database/models');

// Create a new lead
const lead = await Lead.create({
  firstName: 'John',
  lastName: 'Doe', 
  email: 'john@example.com',
  phone: '+1234567890',
  company: 'Example Corp'
});

// Find leads with filtering
const leads = await Lead.findAll({
  where: {
    status: 'new',
    priority: 'high'
  },
  include: [
    { model: Contact, as: 'contacts' },
    { model: CallLog, as: 'callLogs', limit: 5 }
  ]
});

// Search leads
const searchResults = await Lead.findAll({
  where: {
    [Op.or]: [
      { firstName: { [Op.like]: '%John%' } },
      { company: { [Op.like]: '%Example%' } }
    ]
  }
});
```

### Using the Enhanced Controller

```javascript
const { getAllLeads, createLead } = require('./src/controllers/enhancedLeadsController');

// In your Express routes
app.get('/api/leads', getAllLeads); // Supports pagination, filtering, caching
app.post('/api/leads', createLead); // Includes validation and duplicate checking
```

### Cache Usage

```javascript
const { cacheWrapper, generateKey } = require('./src/database/cache/cacheManager');

// Cached database operation
const getCachedLeadById = cacheWrapper('leads', generateKey.lead, 
  async (id) => {
    return await Lead.findByPk(id, {
      include: ['contacts', 'callLogs']
    });
  }
);

const lead = await getCachedLeadById('lead-uuid-here');
```

## ⚡ Performance Features

### Intelligent Caching

- **Automatic Cache Invalidation**: Updates invalidate related cache entries
- **Cache Warming**: Popular data pre-loaded on startup
- **Performance Metrics**: Hit rates, response times, memory usage
- **TTL Management**: Different TTL for different data types

### Query Optimization

- **Slow Query Detection**: Automatically identifies queries >1 second
- **Index Recommendations**: Suggests missing indexes based on query patterns
- **Performance Monitoring**: Real-time query performance tracking
- **Connection Pooling**: Optimized connection management

### Database Indexes

```sql
-- Automatically created indexes for optimal performance
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status_priority ON leads(status, priority);
CREATE INDEX idx_contacts_leadId_type ON contacts(leadId, type);
CREATE INDEX idx_call_logs_leadId_date ON call_logs(leadId, initiatedAt);
-- ... and more
```

## 📊 Monitoring & Analytics

### Performance Dashboard

```javascript
const { getPerformanceStats } = require('./src/database/monitoring/performanceMonitor');

const stats = getPerformanceStats();
console.log(`Average query time: ${stats.queries.averageTime}ms`);
console.log(`Cache hit rate: ${stats.cache.hitRate}%`);
```

### Health Monitoring

```javascript
const { performHealthCheck } = require('./src/database');

const health = await performHealthCheck();
// Returns comprehensive health status of all database components
```

### Built-in Analytics Queries

```javascript
// Lead conversion funnel
const conversionStats = await Lead.findAll({
  attributes: [
    'status',
    [sequelize.fn('COUNT', '*'), 'count'],
    [sequelize.fn('AVG', sequelize.col('conversionProbability')), 'avgProbability']
  ],
  group: ['status']
});

// Call activity analysis
const callStats = await CallLog.getCallStats('agent_001', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
});
```

## 🔧 Maintenance & Operations

### Database Migrations

```bash
# Create new migration
npm run db:migrate:create -- --name add_new_field

# Run migrations
npm run db:migrate

# Check migration status
npm run db:migrate -- status

# Rollback migration
npm run db:migrate -- down 001_migration_name.js
```

### Backup & Recovery

```bash
# Create backup
npm run db:backup

# Create backup without cleanup
npm run db:backup -- --no-cleanup

# Create SQL-only backup
npm run db:backup -- --sql-only

# Restore from backup
npm run db:restore -- backup_file.sql.gz
```

### Performance Optimization

```bash
# Generate optimization recommendations
node -e "
  const { optimizeDatabase } = require('./src/database');
  optimizeDatabase().then(console.log);
"
```

## 🛡️ Data Validation & Security

### Input Validation

```javascript
const { leadValidationSchema } = require('./src/database/models/Lead');

// Validate lead data
const { error, value } = leadValidationSchema.validate({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
  // ... other fields
});

if (error) {
  console.log('Validation errors:', error.details);
}
```

### Data Quality Features

- **Automatic Data Quality Scoring**: Calculates completeness score for each lead
- **Duplicate Detection**: Hash-based duplicate identification
- **Data Normalization**: Automatic phone/email formatting
- **Audit Trails**: Tracks all data changes with timestamps

### GDPR Compliance

- **Consent Tracking**: `consentGiven`, `consentDate` fields
- **Do Not Contact**: `doNotCall`, `doNotEmail` flags
- **Soft Deletes**: Data marked as deleted but preserved for compliance
- **Data Export**: Built-in methods for data portability

## 📈 Scaling Considerations

### Horizontal Scaling

- **Read Replicas**: Configure read-only replicas for query distribution
- **Connection Pooling**: Optimized for high-concurrency scenarios
- **Cache Distribution**: Ready for Redis cluster deployment
- **Database Sharding**: Schema designed for future sharding if needed

### Vertical Scaling

- **Index Optimization**: Comprehensive indexing strategy
- **Query Optimization**: Built-in slow query detection and optimization
- **Memory Management**: Efficient caching with memory limits
- **Connection Limits**: Configurable connection pool sizes

## 🧪 Testing

### Database Testing

```bash
# Run database tests
npm test -- --testPathPattern=database

# Test with fresh database
NODE_ENV=test npm run db:reset && npm test
```

### Integration Testing

```javascript
const { initializeCompleteDatabase } = require('./src/database');

beforeAll(async () => {
  await initializeCompleteDatabase({
    runMigrations: true,
    enableMonitoring: false,
    preloadCache: false
  });
});
```

## 📚 API Reference

### Models

- **Lead**: Primary lead entity with comprehensive contact information
- **Contact**: Multiple contact points per lead
- **CallLog**: Call activity tracking and recording metadata

### Cache Manager

- **cacheWrapper()**: Wrap database operations with caching
- **invalidateCache**: Intelligent cache invalidation strategies
- **getPerformanceMetrics()**: Cache performance statistics

### Performance Monitor

- **getPerformanceStats()**: Query and connection statistics
- **analyzeQueryPatterns()**: Performance analysis and recommendations
- **healthCheck()**: Database system health verification

## 🚨 Troubleshooting

### Common Issues

#### Migration Errors
```bash
# Reset database and re-run migrations
npm run db:migrate -- down --all
npm run db:migrate
```

#### Performance Issues
```bash
# Check slow queries
node -e "
  const { getPerformanceStats } = require('./src/database/monitoring/performanceMonitor');
  console.log('Slow queries:', getPerformanceStats().recentSlowQueries);
"
```

#### Cache Issues
```bash
# Clear all caches
node -e "
  const { invalidateCache } = require('./src/database/cache/cacheManager');
  invalidateCache.all();
"
```

### Database Logs

Check the application logs for:
- `🐌 Slow query detected` - Queries taking >1 second
- `📦 Preloaded` - Cache preloading status
- `📊` - Performance monitoring messages
- `❌` - Error messages with troubleshooting hints

## 📖 Additional Resources

- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [Database Design Best Practices](https://docs.google.com/document/d/1database-design)
- [Performance Optimization Guide](https://docs.google.com/document/d/1performance-guide)
- [Migration Patterns](https://docs.google.com/document/d/1migration-patterns)

---

**Database Architecture Implementation**: Comprehensive database layer with advanced lead management, performance optimization, caching, monitoring, and analytics capabilities for the Cold Caller application.