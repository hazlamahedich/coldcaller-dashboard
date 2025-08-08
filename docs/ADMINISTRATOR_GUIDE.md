# ColdCaller Dashboard - System Administrator Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [Configuration Management](#configuration-management)
4. [User Management](#user-management)
5. [VOIP Configuration](#voip-configuration)
6. [Database Management](#database-management)
7. [Security & Monitoring](#security--monitoring)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

### Architecture Components
```
┌─────────────────────────────────────────────────────┐
│                  Load Balancer                      │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│               Frontend (React)                      │
│  • User Interface      • VOIP Client               │
│  • Call Controls       • Lead Management           │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│               Backend (Node.js)                     │
│  • REST API           • WebSocket                   │
│  • Authentication     • Call Logging                │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┼───────────────────────────────────┐
│     Database    │    External Integrations          │
│  • SQLite/PG    │  • SIP Server                     │
│  • Call Logs    │  • CRM Systems                    │
│  • User Data    │  • Email Services                 │
└─────────────────┴───────────────────────────────────┘
```

### System Requirements

#### Minimum Production Requirements
- **Server**: 4 CPU cores, 8GB RAM, 100GB storage
- **Network**: 10 Mbps dedicated bandwidth per 10 users
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **Node.js**: Version 18+ LTS
- **Database**: PostgreSQL 13+ or SQLite 3.38+

#### Recommended Production Setup
- **Server**: 8 CPU cores, 16GB RAM, 500GB SSD
- **Network**: 50 Mbps dedicated bandwidth
- **Load Balancer**: Nginx or HAProxy
- **SSL Certificate**: Valid SSL/TLS certificate
- **Monitoring**: Prometheus + Grafana or similar

---

## Installation & Setup

### Fresh Installation

#### 1. Prerequisites Installation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (recommended for production)
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb coldcaller

# Install Git and PM2 for process management
sudo apt install git
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx
```

#### 2. Application Setup
```bash
# Clone the repository
git clone https://github.com/your-org/coldcaller.git
cd coldcaller

# Install backend dependencies
cd backend
npm install
npm run db:migrate
npm run db:seed

# Install frontend dependencies and build
cd ../frontend
npm install
npm run build

# Copy build files to web server
sudo cp -r build/* /var/www/html/
```

#### 3. Environment Configuration
Create `/opt/coldcaller/backend/.env`:
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=coldcaller
DATABASE_USER=coldcaller_user
DATABASE_PASSWORD=secure_password_here

# VOIP Configuration
SIP_SERVER_WSS=wss://your-sip-server.com:7443
SIP_DOMAIN=your-domain.com
SIP_PROXY=your-sip-proxy.com

# Security Configuration
JWT_SECRET=your_very_long_random_secret_key_here
SESSION_SECRET=another_random_secret_key_here
ENCRYPTION_KEY=32_character_encryption_key_here

# External Services
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=noreply@yourdomain.com
EMAIL_PASSWORD=app_password_here

# File Upload Configuration
UPLOAD_PATH=/opt/coldcaller/uploads
MAX_UPLOAD_SIZE=10MB
ALLOWED_FILE_TYPES=mp3,wav,m4a

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/coldcaller/app.log
```

#### 4. Process Management Setup
Create PM2 ecosystem file `/opt/coldcaller/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'coldcaller-backend',
    script: './backend/src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/var/log/coldcaller/combined.log',
    out_file: '/var/log/coldcaller/out.log',
    error_file: '/var/log/coldcaller/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '1G',
    watch: false,
    autorestart: true
  }]
}

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Nginx Configuration
Create `/etc/nginx/sites-available/coldcaller`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Configuration Management

### Environment Variables

#### Core Application Settings
```bash
# Application Environment
NODE_ENV=production|development|test
PORT=3001
HOST=0.0.0.0
APP_NAME="ColdCaller Dashboard"
APP_VERSION=1.0.0

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
CORS_CREDENTIALS=true

# Session Configuration
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
REMEMBER_ME_DURATION=2592000000  # 30 days in milliseconds
```

#### Database Configuration
```bash
# PostgreSQL (Recommended for Production)
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=coldcaller_prod
DATABASE_USER=coldcaller_app
DATABASE_PASSWORD=your_secure_password
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_TIMEOUT=30000

# SQLite (Development/Small Scale)
DATABASE_TYPE=sqlite
DATABASE_FILE=/opt/coldcaller/data/database.sqlite
```

#### VOIP & Communication Settings
```bash
# Primary SIP Configuration
PRIMARY_SIP_SERVER=wss://sip.provider.com:7443
PRIMARY_SIP_DOMAIN=provider.com
PRIMARY_SIP_PROXY=sip.provider.com

# Backup SIP Configuration
BACKUP_SIP_SERVER=wss://backup-sip.provider.com:7443
BACKUP_SIP_DOMAIN=backup.provider.com

# Audio Settings
AUDIO_CODEC=PCMU,PCMA,G722
DTMF_TYPE=RFC2833
RTP_PORT_RANGE=10000-20000

# Call Recording
RECORDING_ENABLED=true
RECORDING_PATH=/opt/coldcaller/recordings
RECORDING_FORMAT=wav
RECORDING_QUALITY=high
```

### Feature Flags
Configure features via environment variables:
```bash
# Feature Toggles
FEATURE_CALL_RECORDING=true
FEATURE_VIDEO_CALLS=false
FEATURE_TEAM_CHAT=true
FEATURE_CRM_INTEGRATION=true
FEATURE_ANALYTICS_EXPORT=true
FEATURE_MOBILE_APP=false

# Integration Toggles
INTEGRATION_SALESFORCE=false
INTEGRATION_HUBSPOT=true
INTEGRATION_ZAPIER=true
INTEGRATION_SLACK=true
```

### Configuration Validation
Create configuration validation script:
```bash
#!/bin/bash
# config-validator.sh

echo "🔍 Validating ColdCaller Configuration..."

# Check required environment variables
REQUIRED_VARS=(
    "NODE_ENV"
    "DATABASE_TYPE"
    "JWT_SECRET"
    "PRIMARY_SIP_SERVER"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

# Test database connection
node -e "
const config = require('./backend/src/database/config/database.js');
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(config.production);
sequelize.authenticate()
    .then(() => console.log('✅ Database connection successful'))
    .catch(err => { console.log('❌ Database connection failed:', err.message); process.exit(1); });
"

echo "✅ Configuration validation completed successfully"
```

---

## User Management

### User Roles & Permissions

#### Role Hierarchy
```
Super Admin (Full System Access)
├── System Administrator (System Management)
├── Sales Manager (Team Management)
│   ├── Senior Agent (Advanced Features)
│   └── Sales Agent (Basic Calling)
└── Read-only User (Reporting Only)
```

#### Permission Matrix
| Feature | Super Admin | Admin | Manager | Senior Agent | Agent | Read-Only |
|---------|-------------|-------|---------|--------------|--------|-----------|
| User Management | ✅ | ✅ | Partial | ❌ | ❌ | ❌ |
| System Config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lead Management | ✅ | ✅ | ✅ | ✅ | Own Only | ❌ |
| Make Calls | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | Own Only | ✅ |
| Export Data | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### User Account Management

#### Creating Users
```bash
# Command line user creation
node backend/scripts/createUser.js \
    --email="user@company.com" \
    --password="TempPassword123!" \
    --role="agent" \
    --firstName="John" \
    --lastName="Doe" \
    --department="Sales"
```

#### Bulk User Import
Create CSV file with user data:
```csv
email,firstName,lastName,role,department,phone
john.doe@company.com,John,Doe,agent,Sales,(555) 123-4567
jane.smith@company.com,Jane,Smith,manager,Sales,(555) 123-4568
```

Import users:
```bash
node backend/scripts/bulkImportUsers.js --file=users.csv
```

#### User Authentication Settings
```bash
# Password Policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
PASSWORD_MAX_AGE=90  # days
PASSWORD_HISTORY=5   # prevent reusing last 5 passwords

# Account Lockout Policy
LOCKOUT_ATTEMPTS=5
LOCKOUT_DURATION=30  # minutes
LOCKOUT_RESET_TIME=24  # hours

# Two-Factor Authentication
TWO_FACTOR_REQUIRED=false
TWO_FACTOR_METHOD=totp  # totp, sms, email
```

### Active Directory Integration
```javascript
// backend/src/config/ldap.js
module.exports = {
  ldap: {
    url: 'ldap://your-domain-controller.com:389',
    bindDN: 'cn=admin,dc=company,dc=com',
    bindCredentials: 'admin-password',
    searchBase: 'dc=company,dc=com',
    searchFilter: '(sAMAccountName={{username}})',
    attributes: {
      user: ['sAMAccountName', 'mail', 'displayName', 'department'],
      group: ['cn', 'member']
    }
  }
};
```

---

## VOIP Configuration

### SIP Server Setup

#### Supported SIP Providers
- **FreePBX**: Open source PBX platform
- **Asterisk**: Full-featured PBX engine
- **FusionPBX**: Web-based PBX management
- **3CX**: Commercial PBX solution
- **Cloud Providers**: Twilio, RingCentral, etc.

#### SIP Trunk Configuration
```javascript
// backend/src/config/sip.js
module.exports = {
  primary: {
    wsServer: 'wss://sip.your-provider.com:7443',
    domain: 'your-provider.com',
    displayName: 'ColdCaller System',
    authUsername: 'your-trunk-username',
    password: 'your-trunk-password',
    registrarServer: 'sip.your-provider.com',
    outboundProxy: 'sip-proxy.your-provider.com:5060'
  },
  backup: {
    wsServer: 'wss://backup-sip.your-provider.com:7443',
    domain: 'backup.your-provider.com',
    displayName: 'ColdCaller Backup',
    authUsername: 'backup-trunk-username',
    password: 'backup-trunk-password'
  },
  codecs: ['PCMU', 'PCMA', 'G722', 'G729'],
  dtmfType: 'RFC2833',
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302'
  ]
};
```

#### WebRTC Configuration
```javascript
// frontend/src/config/webrtc.js
export const webrtcConfig = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302'
      ]
    },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'turn-username',
      credential: 'turn-password'
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'balanced',
  rtcpMuxPolicy: 'require',
  audioCodecs: {
    preferred: ['PCMU', 'PCMA'],
    fallback: ['G722', 'G729']
  }
};
```

### Quality of Service (QoS)

#### Network Requirements
- **Bandwidth**: 64kbps per concurrent call (up/down)
- **Latency**: <150ms one-way preferred, <300ms maximum
- **Jitter**: <30ms preferred, <50ms maximum
- **Packet Loss**: <1% preferred, <3% maximum

#### Router Configuration Example
```bash
# Cisco Router QoS Configuration
class-map match-all VOIP-SIGNALING
  match dscp cs3
class-map match-all VOIP-MEDIA
  match dscp ef

policy-map WAN-OUT
  class VOIP-MEDIA
    priority percent 30
  class VOIP-SIGNALING
    bandwidth percent 5
  class class-default
    fair-queue
    random-detect

interface GigabitEthernet0/1
  service-policy output WAN-OUT
```

### Call Flow Monitoring
```bash
# Enable SIP debugging
echo "SIP_DEBUG=true" >> /opt/coldcaller/backend/.env

# Monitor call statistics
tail -f /var/log/coldcaller/sip-debug.log | grep "INVITE\|BYE\|CANCEL"

# Real-time call monitoring
node backend/scripts/monitorCalls.js
```

---

## Database Management

### Database Schema Overview
```sql
-- Core Tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'New',
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE call_logs (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    user_id INTEGER REFERENCES users(id),
    phone_number VARCHAR(50) NOT NULL,
    call_duration INTEGER,
    outcome VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Operations

#### Backup Procedures
```bash
#!/bin/bash
# Daily backup script - /opt/coldcaller/scripts/daily-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/coldcaller/backups"
DB_NAME="coldcaller_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump $DB_NAME > $BACKUP_DIR/coldcaller_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/coldcaller_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/coldcaller_$DATE.sql.gz s3://your-backup-bucket/

echo "Backup completed: coldcaller_$DATE.sql.gz"
```

#### Database Migration Management
```bash
# Run migrations
cd /opt/coldcaller/backend
npm run db:migrate

# Create new migration
npm run migration:create -- --name add_new_field_to_leads

# Rollback last migration
npm run db:migrate:undo

# Reset database (DANGER: Only for development)
npm run db:reset
```

#### Performance Monitoring
```sql
-- Monitor long-running queries
SELECT 
    query,
    query_start,
    state,
    wait_event,
    backend_start
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 minutes';

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
```

### Data Retention Policies
```bash
# Environment variables for data retention
DATA_RETENTION_CALL_LOGS=365  # days
DATA_RETENTION_RECORDINGS=90  # days
DATA_RETENTION_ANALYTICS=730  # days
DATA_RETENTION_AUDIT_LOGS=1095  # days

# Cleanup script - runs weekly
node backend/scripts/dataCleanup.js --dry-run
node backend/scripts/dataCleanup.js --execute
```

---

## Security & Monitoring

### Security Hardening

#### SSL/TLS Configuration
```bash
# Generate strong SSL certificate
sudo certbot --nginx -d yourdomain.com

# Test SSL configuration
ssl-checker yourdomain.com

# SSL Labs test
curl -s "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.com" | jq
```

#### Firewall Configuration
```bash
# UFW firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5060/udp  # SIP
sudo ufw allow 10000:20000/udp  # RTP

# Enable firewall
sudo ufw enable
```

#### Security Headers
```nginx
# Additional Nginx security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

### Application Monitoring

#### Health Check Endpoints
```javascript
// backend/src/routes/health.js
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    database: 'connected',  // Check actual DB connection
    sipServer: 'connected'  // Check SIP server status
  });
});

router.get('/health/detailed', (req, res) => {
  res.json({
    status: 'OK',
    checks: {
      database: checkDatabase(),
      sipServer: checkSipServer(),
      diskSpace: checkDiskSpace(),
      memory: process.memoryUsage()
    }
  });
});
```

#### Log Management
```bash
# Logrotate configuration - /etc/logrotate.d/coldcaller
/var/log/coldcaller/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 coldcaller coldcaller
    postrotate
        systemctl reload nginx
    endscript
}
```

#### Monitoring Stack Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
```

### Audit Logging
```javascript
// Audit log configuration
const auditEvents = [
  'user.login',
  'user.logout', 
  'user.create',
  'user.update',
  'user.delete',
  'lead.create',
  'lead.update',
  'lead.delete',
  'call.start',
  'call.end',
  'system.config.update'
];

// Log format
{
  timestamp: '2024-01-20T10:30:00Z',
  event: 'user.login',
  userId: 'user123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  details: {
    loginMethod: 'password',
    success: true
  }
}
```

---

## Backup & Recovery

### Backup Strategy

#### Automated Backup System
```bash
#!/bin/bash
# Complete backup script - /opt/coldcaller/scripts/full-backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/opt/backups/coldcaller"
APPLICATION_DIR="/opt/coldcaller"

# Create backup directories
mkdir -p $BACKUP_ROOT/{database,application,config,uploads,logs}

# Database backup
echo "📊 Backing up database..."
pg_dump coldcaller_prod | gzip > $BACKUP_ROOT/database/coldcaller_$TIMESTAMP.sql.gz

# Application backup
echo "📁 Backing up application files..."
tar -czf $BACKUP_ROOT/application/app_$TIMESTAMP.tar.gz -C $APPLICATION_DIR .

# Configuration backup
echo "⚙️ Backing up configuration..."
tar -czf $BACKUP_ROOT/config/config_$TIMESTAMP.tar.gz /etc/nginx/sites-available/coldcaller $APPLICATION_DIR/.env

# Upload files backup
echo "📸 Backing up uploads..."
rsync -av $APPLICATION_DIR/uploads/ $BACKUP_ROOT/uploads/

# Log backup
echo "📋 Backing up logs..."
tar -czf $BACKUP_ROOT/logs/logs_$TIMESTAMP.tar.gz /var/log/coldcaller/

# Cloud sync (if configured)
if [ ! -z "$BACKUP_CLOUD_ENABLED" ]; then
    echo "☁️ Syncing to cloud storage..."
    aws s3 sync $BACKUP_ROOT s3://$BACKUP_BUCKET/coldcaller/
fi

# Cleanup old backups (keep 30 days)
find $BACKUP_ROOT -name "*_*.gz" -mtime +30 -delete
find $BACKUP_ROOT -name "*_*.tar.gz" -mtime +30 -delete

echo "✅ Backup completed successfully"
```

#### Backup Scheduling
```bash
# Crontab entry
0 2 * * * /opt/coldcaller/scripts/full-backup.sh >> /var/log/coldcaller/backup.log 2>&1
0 */6 * * * /opt/coldcaller/scripts/database-backup.sh >> /var/log/coldcaller/backup.log 2>&1
```

### Disaster Recovery

#### Recovery Procedures
```bash
#!/bin/bash
# Recovery script - /opt/coldcaller/scripts/restore.sh

BACKUP_DATE="$1"
BACKUP_ROOT="/opt/backups/coldcaller"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_date> (format: YYYYMMDD_HHMMSS)"
    exit 1
fi

echo "🔄 Starting recovery process for backup: $BACKUP_DATE"

# Stop services
echo "⏹️ Stopping services..."
pm2 stop all
sudo systemctl stop nginx

# Restore database
echo "📊 Restoring database..."
dropdb coldcaller_prod
createdb coldcaller_prod
gunzip -c $BACKUP_ROOT/database/coldcaller_$BACKUP_DATE.sql.gz | psql coldcaller_prod

# Restore application
echo "📁 Restoring application files..."
rm -rf /opt/coldcaller_old
mv /opt/coldcaller /opt/coldcaller_old
mkdir -p /opt/coldcaller
tar -xzf $BACKUP_ROOT/application/app_$BACKUP_DATE.tar.gz -C /opt/coldcaller

# Restore configuration
echo "⚙️ Restoring configuration..."
tar -xzf $BACKUP_ROOT/config/config_$BACKUP_DATE.tar.gz -C /

# Restore uploads
echo "📸 Restoring uploads..."
rsync -av $BACKUP_ROOT/uploads/ /opt/coldcaller/uploads/

# Start services
echo "▶️ Starting services..."
sudo systemctl start nginx
pm2 start /opt/coldcaller/ecosystem.config.js

echo "✅ Recovery completed successfully"
echo "⚠️ Please verify system functionality"
```

#### High Availability Setup
```yaml
# docker-compose.ha.yml
version: '3.8'
services:
  coldcaller-app-1:
    image: coldcaller:latest
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres-primary
    depends_on:
      - postgres-primary
      - redis

  coldcaller-app-2:
    image: coldcaller:latest
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres-primary
    depends_on:
      - postgres-primary
      - redis

  haproxy:
    image: haproxy:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg

  postgres-primary:
    image: postgres:13
    environment:
      POSTGRES_DB: coldcaller
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data
```

---

## Performance Optimization

### Database Optimization

#### Index Management
```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_leads_status ON leads(status);
CREATE INDEX CONCURRENTLY idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX CONCURRENTLY idx_call_logs_date ON call_logs(created_at);
CREATE INDEX CONCURRENTLY idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_call_logs_user_date ON call_logs(user_id, created_at);
CREATE INDEX CONCURRENTLY idx_leads_status_assigned ON leads(status, assigned_to);
```

#### Query Optimization
```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT l.name, l.company, cl.outcome, cl.created_at
FROM leads l
JOIN call_logs cl ON l.id = cl.lead_id
WHERE cl.user_id = 1 
AND cl.created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Update table statistics
ANALYZE leads;
ANALYZE call_logs;
ANALYZE users;
```

### Application Performance

#### Node.js Optimization
```javascript
// backend/src/config/performance.js
module.exports = {
  // Connection pooling
  database: {
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // Redis caching
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'coldcaller:',
    ttl: 3600,
    maxRetriesPerRequest: 3
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
    standardHeaders: true,
    legacyHeaders: false
  }
};
```

#### Caching Strategy
```javascript
// Redis caching implementation
const redis = require('redis');
const client = redis.createClient();

// Cache frequently accessed data
const cacheLeads = async (userId) => {
  const cacheKey = `leads:user:${userId}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const leads = await Lead.findAll({ 
    where: { assigned_to: userId },
    limit: 50 
  });
  
  await client.setEx(cacheKey, 300, JSON.stringify(leads)); // 5 minute cache
  return leads;
};
```

### Frontend Optimization

#### Bundle Optimization
```javascript
// webpack.config.js optimizations
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
};
```

#### CDN Configuration
```nginx
# CDN-friendly headers
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
}
```

---

## Troubleshooting

### Common Issues & Solutions

#### Application Won't Start
```bash
# Check logs
pm2 logs coldcaller-backend

# Common issues:
# 1. Port already in use
sudo netstat -tulpn | grep :3001
sudo kill -9 $(lsof -ti:3001)

# 2. Database connection failed
node -e "require('./backend/src/database/config/database.js').production"

# 3. Missing environment variables
node -c backend/scripts/validateConfig.js
```

#### VOIP/Audio Issues
```bash
# Check WebRTC connectivity
curl -I https://yourdomain.com

# Test STUN/TURN servers
node backend/scripts/testStunTurn.js

# Monitor SIP traffic
tcpdump -i any -n port 5060

# Audio device debugging
sudo dmesg | grep audio
```

#### Database Performance Issues
```sql
-- Check for blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Kill blocking query (if needed)
SELECT pg_cancel_backend(12345);  -- Use actual PID
```

### Log Analysis

#### Log Locations
```bash
# Application logs
tail -f /var/log/coldcaller/app.log
tail -f /var/log/coldcaller/error.log

# System logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
tail -f /var/log/postgresql/postgresql.log

# PM2 logs
pm2 logs coldcaller-backend --lines 100
```

#### Log Analysis Tools
```bash
# Install log analysis tools
sudo apt install goaccess

# Analyze nginx logs
goaccess /var/log/nginx/access.log -c

# Real-time log monitoring
multitail /var/log/coldcaller/app.log /var/log/nginx/error.log
```

### Health Monitoring

#### System Health Script
```bash
#!/bin/bash
# health-check.sh

echo "🏥 ColdCaller System Health Check"
echo "================================="

# Check disk space
df -h | grep -E "(Filesystem|/dev/)"

# Check memory usage
free -h

# Check CPU load
uptime

# Check process status
pm2 list

# Check database connectivity
psql -U coldcaller -d coldcaller_prod -c "SELECT 1;" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database: Connected"
else
    echo "❌ Database: Connection failed"
fi

# Check application endpoint
curl -f -s -o /dev/null https://yourdomain.com/api/health
if [ $? -eq 0 ]; then
    echo "✅ Application: Healthy"
else
    echo "❌ Application: Health check failed"
fi

echo "================================="
echo "Health check completed at $(date)"
```

### Emergency Procedures

#### Service Recovery
```bash
#!/bin/bash
# emergency-restart.sh

echo "🚨 Emergency Service Recovery"

# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Wait for processes to stop
sleep 10

# Clear any stuck processes
pkill -f "node.*coldcaller"
pkill -f "nginx.*coldcaller"

# Clear caches
rm -rf /tmp/coldcaller-*
redis-cli flushall

# Restart services
sudo systemctl start nginx
pm2 start /opt/coldcaller/ecosystem.config.js

# Wait for startup
sleep 30

# Verify services
pm2 list
curl -f https://yourdomain.com/api/health

echo "🏥 Emergency recovery completed"
```

---

## Maintenance & Updates

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
# Weekly maintenance script
#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up logs
sudo logrotate -f /etc/logrotate.conf

# Database maintenance
psql -U postgres -d coldcaller_prod -c "VACUUM ANALYZE;"

# Clear application caches
redis-cli flushall

# Check SSL certificate expiry
ssl-checker yourdomain.com

# Generate performance report
node backend/scripts/performanceReport.js
```

#### Monthly Tasks
```bash
# Monthly maintenance checklist
- [ ] Review security logs
- [ ] Update SSL certificates
- [ ] Performance optimization review
- [ ] Backup integrity verification
- [ ] User access review
- [ ] Database optimization
- [ ] Update monitoring dashboards
```

### Application Updates

#### Update Procedure
```bash
#!/bin/bash
# update-application.sh

VERSION="$1"
BACKUP_DIR="/opt/backups/pre-update-$(date +%Y%m%d_%H%M%S)"

# Create pre-update backup
mkdir -p $BACKUP_DIR
cp -r /opt/coldcaller $BACKUP_DIR/
pg_dump coldcaller_prod > $BACKUP_DIR/database.sql

# Download new version
wget "https://releases.coldcaller.com/v$VERSION/coldcaller-$VERSION.tar.gz"
tar -xzf "coldcaller-$VERSION.tar.gz"

# Stop services
pm2 stop all

# Update application
rm -rf /opt/coldcaller_old
mv /opt/coldcaller /opt/coldcaller_old
mv "coldcaller-$VERSION" /opt/coldcaller

# Run database migrations
cd /opt/coldcaller/backend
npm run db:migrate

# Update dependencies
npm install --production

# Start services
pm2 start ecosystem.config.js

# Verify update
curl -f https://yourdomain.com/api/health

echo "✅ Update to version $VERSION completed"
```

---

## Support & Contact Information

### Technical Support Channels
- **Emergency Support**: +1-800-COLD-911
- **Email Support**: admin-support@coldcaller.com
- **Documentation**: https://docs.coldcaller.com
- **Community Forum**: https://community.coldcaller.com

### Escalation Procedures
1. **Level 1**: Basic troubleshooting using this guide
2. **Level 2**: Contact technical support with logs
3. **Level 3**: Emergency phone support for critical issues
4. **Level 4**: Remote assistance and emergency patching

---

**Last Updated**: January 2024  
**Version**: 2.0  
**Support**: admin-support@coldcaller.com