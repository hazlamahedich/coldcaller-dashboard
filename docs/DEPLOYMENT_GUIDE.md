# ColdCaller Dashboard - Production Deployment Guide

## 🚀 Production Deployment Overview

This comprehensive guide covers deploying ColdCaller Dashboard to production environments with security, scalability, and reliability best practices.

---

## 📋 Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] **Server Resources**: Minimum 8GB RAM, 4 CPU cores, 500GB SSD storage
- [ ] **Network**: Dedicated bandwidth (50+ Mbps for 100+ users)
- [ ] **SSL Certificate**: Valid SSL/TLS certificate from trusted CA
- [ ] **Domain Name**: Production domain configured with DNS
- [ ] **Database Server**: PostgreSQL 13+ or equivalent cloud database
- [ ] **Load Balancer**: Nginx, HAProxy, or cloud load balancer
- [ ] **Monitoring Tools**: Prometheus/Grafana or equivalent monitoring stack

### Security Requirements
- [ ] **Firewall Configuration**: Proper port restrictions and access controls
- [ ] **Security Scanning**: Vulnerability assessment completed
- [ ] **SSL Configuration**: A+ rating on SSL Labs test
- [ ] **Access Controls**: Role-based access control implemented
- [ ] **Data Encryption**: Encryption at rest and in transit
- [ ] **Backup Strategy**: Automated backup and recovery procedures

### Operational Requirements
- [ ] **CI/CD Pipeline**: Automated deployment pipeline configured
- [ ] **Environment Variables**: All production environment variables set
- [ ] **Database Migrations**: Migration strategy tested and documented
- [ ] **Monitoring & Alerting**: Health checks and alert systems configured
- [ ] **Support Documentation**: Operational runbooks prepared
- [ ] **Team Training**: Operations team trained on deployment procedures

---

## 🏗️ Infrastructure Architecture

### Recommended Production Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │ 
                    │    (Nginx)      │
                    └─────────┬───────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
    ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
    │   Frontend    │ │   Frontend    │ │   Frontend    │
    │   Server 1    │ │   Server 2    │ │   Server 3    │
    └───────────────┘ └───────────────┘ └───────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
    ┌─────────────────────────▼─────────────────────────┐
    │                Backend Cluster                    │
    │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐│
    │  │  App Node 1 │  │  App Node 2 │  │  App Node 3  ││
    │  │  Port 3001  │  │  Port 3001  │  │  Port 3001   ││
    │  └─────────────┘  └─────────────┘  └──────────────┘│
    └─────────────────────────▼─────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐    ┌────────▼────────┐    ┌──────▼──────┐
│   PostgreSQL  │    │      Redis      │    │    File     │
│   Primary DB  │    │    (Sessions/   │    │   Storage   │
│               │    │     Cache)      │    │             │
└───────────────┘    └─────────────────┘    └─────────────┘
        │
┌───────▼───────┐
│   PostgreSQL  │
│   Replica DB  │
│   (Read-only) │
└───────────────┘
```

### Cloud Provider Recommendations

#### AWS Architecture
```yaml
# AWS Production Setup
VPC:
  - Private subnets for backend services
  - Public subnets for load balancers
  - NAT Gateway for outbound connectivity

Compute:
  - EC2 instances with Auto Scaling Groups
  - Application Load Balancer (ALB)
  - ECS/Fargate for containerized deployment

Database:
  - RDS PostgreSQL with Multi-AZ
  - ElastiCache Redis for session management
  - S3 for file storage and backups

Security:
  - WAF for application protection
  - Security Groups for network access
  - IAM roles for service permissions
  - Secrets Manager for credentials
```

#### Azure Architecture
```yaml
# Azure Production Setup
Resource Group:
  - Virtual Network with multiple subnets
  - Application Gateway for load balancing
  - Container Instances or App Service

Database:
  - Azure Database for PostgreSQL
  - Azure Cache for Redis
  - Blob Storage for files

Security:
  - Azure Firewall
  - Key Vault for secrets
  - Azure AD integration
  - Application Security Groups
```

---

## 🔧 Server Configuration

### Operating System Setup (Ubuntu 20.04 LTS)

```bash
#!/bin/bash
# Initial server setup script

# Update system packages
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget gnupg software-properties-common \
    build-essential git nginx supervisor certbot \
    postgresql-client redis-tools htop fail2ban

# Create application user
useradd -m -s /bin/bash coldcaller
usermod -aG sudo coldcaller

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2
pm2 startup systemd -u coldcaller --hp /home/coldcaller

# Install Docker (for monitoring stack)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker coldcaller
```

### Nginx Configuration

Create `/etc/nginx/sites-available/coldcaller.conf`:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Upstream backend servers
upstream coldcaller_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    
    # Health checks
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        application/rss+xml
        application/atom+xml
        image/svg+xml;
    
    # Frontend static files
    location / {
        root /var/www/coldcaller/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Security for sensitive files
        location ~ /\.(ht|git|env) {
            deny all;
        }
    }
    
    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://coldcaller_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # Authentication endpoints with stricter limits
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://coldcaller_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket connections
    location /socket.io/ {
        proxy_pass http://coldcaller_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 43200s; # 12 hours for long connections
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/coldcaller.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🗄️ Database Setup

### PostgreSQL Configuration

Install and configure PostgreSQL:
```bash
# Install PostgreSQL 13
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt update
apt install postgresql-13 postgresql-client-13

# Configure PostgreSQL
sudo -u postgres psql
```

PostgreSQL setup commands:
```sql
-- Create database and user
CREATE DATABASE coldcaller_prod;
CREATE USER coldcaller_app WITH ENCRYPTED PASSWORD 'secure_password_here';

-- Grant permissions
GRANT CONNECT ON DATABASE coldcaller_prod TO coldcaller_app;
GRANT USAGE ON SCHEMA public TO coldcaller_app;
GRANT CREATE ON SCHEMA public TO coldcaller_app;
GRANT ALL PRIVILEGES ON DATABASE coldcaller_prod TO coldcaller_app;

-- Performance optimizations
ALTER DATABASE coldcaller_prod SET log_statement = 'none';
ALTER DATABASE coldcaller_prod SET log_min_duration_statement = 1000;
ALTER DATABASE coldcaller_prod SET log_checkpoints = on;
ALTER DATABASE coldcaller_prod SET log_connections = on;
ALTER DATABASE coldcaller_prod SET log_disconnections = on;
```

PostgreSQL configuration (`/etc/postgresql/13/main/postgresql.conf`):
```ini
# Memory settings
shared_buffers = 2GB                    # 25% of system RAM
effective_cache_size = 6GB              # 75% of system RAM
work_mem = 64MB                         # For complex queries
maintenance_work_mem = 512MB            # For VACUUM, CREATE INDEX

# Checkpoint settings
checkpoint_completion_target = 0.9
checkpoint_timeout = 10min
max_wal_size = 2GB
min_wal_size = 1GB

# Connection settings
max_connections = 200
listen_addresses = 'localhost'
port = 5432

# Logging
log_destination = 'csvlog'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000ms
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### Redis Configuration

Install and configure Redis:
```bash
apt install redis-server

# Configure Redis
vim /etc/redis/redis.conf
```

Redis configuration:
```ini
# Network
bind 127.0.0.1 ::1
port 6379
protected-mode yes

# Memory
maxmemory 1gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes

# Security
requirepass your_redis_password_here

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

---

## 🚀 Application Deployment

### Environment Configuration

Create `/opt/coldcaller/.env`:
```bash
# Application Environment
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
APP_NAME="ColdCaller Dashboard"
APP_VERSION=1.0.0

# Database Configuration
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=coldcaller_prod
DATABASE_USER=coldcaller_app
DATABASE_PASSWORD=secure_password_here
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
REDIS_DB=0

# Security Configuration
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=24h
SESSION_SECRET=your_session_secret_key_minimum_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key_here

# CORS Configuration
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
CORS_CREDENTIALS=true

# VOIP Configuration
SIP_SERVER_WSS=wss://your-sip-provider.com:7443
SIP_DOMAIN=your-domain.com
SIP_PROXY=proxy.your-sip-provider.com

# File Upload Configuration
UPLOAD_PATH=/opt/coldcaller/uploads
MAX_UPLOAD_SIZE=50MB
ALLOWED_FILE_TYPES=mp3,wav,m4a,pdf,doc,docx

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=true

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
EMAIL_FROM=ColdCaller <noreply@your-domain.com>

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/coldcaller/app.log
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=10

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Feature Flags
FEATURE_CALL_RECORDING=true
FEATURE_ANALYTICS_EXPORT=true
FEATURE_TEAM_CHAT=false
```

### PM2 Ecosystem Configuration

Create `/opt/coldcaller/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'coldcaller-backend',
      script: './backend/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      
      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      
      // Logging
      log_file: '/var/log/coldcaller/combined.log',
      out_file: '/var/log/coldcaller/out.log',
      error_file: '/var/log/coldcaller/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=2048',
      
      // Monitoring
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],
      
      // Restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true
    }
  ]
};
```

### Application Build & Deploy Script

Create `/opt/coldcaller/deploy.sh`:
```bash
#!/bin/bash
set -e

# Configuration
APP_DIR="/opt/coldcaller"
BACKUP_DIR="/opt/backups/coldcaller"
BUILD_DIR="/tmp/coldcaller-build"
NODE_ENV="production"

echo "🚀 Starting ColdCaller deployment..."

# Create backup
echo "📦 Creating backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/coldcaller_$TIMESTAMP.tar.gz -C $APP_DIR .

# Stop services
echo "⏹️ Stopping services..."
pm2 stop coldcaller-backend || true

# Update application code
echo "📥 Updating application code..."
cd $APP_DIR
git fetch origin
git reset --hard origin/main

# Install dependencies
echo "📦 Installing dependencies..."
cd backend
npm ci --production
cd ../frontend
npm ci

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Copy built files
echo "📋 Copying built files..."
sudo rm -rf /var/www/coldcaller/build
sudo mkdir -p /var/www/coldcaller
sudo cp -r build /var/www/coldcaller/
sudo chown -R www-data:www-data /var/www/coldcaller

# Run database migrations
echo "🗄️ Running database migrations..."
cd $APP_DIR/backend
npm run db:migrate

# Start services
echo "▶️ Starting services..."
pm2 start ecosystem.config.js --env production
pm2 save

# Verify deployment
echo "✅ Verifying deployment..."
sleep 10
curl -f http://localhost:3001/api/health || {
  echo "❌ Health check failed!"
  pm2 logs coldcaller-backend --lines 50
  exit 1
}

# Test frontend
curl -f https://your-domain.com/health || {
  echo "❌ Frontend health check failed!"
  nginx -t
  systemctl status nginx
  exit 1
}

echo "✅ Deployment completed successfully!"
echo "📊 Application status:"
pm2 list
```

Make deploy script executable:
```bash
chmod +x /opt/coldcaller/deploy.sh
```

---

## 🔒 Security Configuration

### SSL Certificate Setup

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
certbot renew --dry-run

# Setup automatic renewal cron job
crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Fail2Ban Configuration

Create `/etc/fail2ban/jail.local`:
```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
```

### File Permissions Setup

```bash
# Set correct ownership
chown -R coldcaller:coldcaller /opt/coldcaller
chown -R www-data:www-data /var/www/coldcaller

# Set secure permissions
find /opt/coldcaller -type f -exec chmod 644 {} \;
find /opt/coldcaller -type d -exec chmod 755 {} \;
chmod 700 /opt/coldcaller/.env
chmod +x /opt/coldcaller/deploy.sh

# Secure log directories
mkdir -p /var/log/coldcaller
chown coldcaller:coldcaller /var/log/coldcaller
chmod 750 /var/log/coldcaller

# Secure upload directories
mkdir -p /opt/coldcaller/uploads
chown coldcaller:www-data /opt/coldcaller/uploads
chmod 2775 /opt/coldcaller/uploads
```

---

## 📊 Monitoring & Logging

### System Monitoring Setup

Docker Compose for monitoring stack (`/opt/monitoring/docker-compose.yml`):
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

### Prometheus Configuration

Create `/opt/monitoring/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'coldcaller-backend'
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['host.docker.internal:9113']
```

### Log Rotation Configuration

Create `/etc/logrotate.d/coldcaller`:
```bash
/var/log/coldcaller/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 coldcaller coldcaller
    postrotate
        pm2 reload coldcaller-backend
    endscript
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Run frontend tests
        run: cd frontend && npm test -- --coverage --watchAll=false
      
      - name: Build frontend
        run: cd frontend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/coldcaller
            ./deploy.sh
            
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Deployment Verification Script

Create `/opt/coldcaller/verify-deployment.sh`:
```bash
#!/bin/bash

echo "🔍 Verifying ColdCaller deployment..."

# Test backend health
echo "Testing backend health..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ $BACKEND_STATUS -eq 200 ]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed (HTTP $BACKEND_STATUS)"
    exit 1
fi

# Test frontend
echo "Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com)
if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed (HTTP $FRONTEND_STATUS)"
    exit 1
fi

# Test database connection
echo "Testing database connection..."
cd /opt/coldcaller/backend
if npm run db:status > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Test Redis connection
echo "Testing Redis connection..."
if redis-cli -a $REDIS_PASSWORD ping | grep -q PONG; then
    echo "✅ Redis connection successful"
else
    echo "❌ Redis connection failed"
    exit 1
fi

# Check PM2 processes
echo "Checking PM2 processes..."
PM2_STATUS=$(pm2 jlist | jq '.[] | select(.name=="coldcaller-backend") | .pm2_env.status' -r)
if [ "$PM2_STATUS" = "online" ]; then
    echo "✅ PM2 processes running"
else
    echo "❌ PM2 processes not running properly"
    pm2 list
    exit 1
fi

# Check SSL certificate
echo "Checking SSL certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
    echo "✅ SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
else
    echo "⚠️ SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
fi

echo "✅ All deployment verification checks passed!"
```

---

## 🔧 Performance Optimization

### Database Performance Tuning

```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_leads_status_assigned ON leads(status, assigned_to);
CREATE INDEX CONCURRENTLY idx_call_logs_user_date ON call_logs(user_id, created_at);
CREATE INDEX CONCURRENTLY idx_call_logs_lead_outcome ON call_logs(lead_id, outcome);

-- Update table statistics
ANALYZE leads;
ANALYZE call_logs;
ANALYZE users;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
```

### Application Performance Monitoring

Add to backend application:
```javascript
// backend/src/middleware/metrics.js
const promClient = require('prom-client');

// Create custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 15, 50, 100, 500]
});

const activeConnections = new promClient.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

const callsTotal = new promClient.Counter({
  name: 'calls_total',
  help: 'Total number of calls made',
  labelNames: ['outcome']
});

// Middleware to collect metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

module.exports = {
  metricsMiddleware,
  activeConnections,
  callsTotal,
  register: promClient.register
};
```

---

## 🚨 Troubleshooting Guide

### Common Deployment Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs coldcaller-backend

# Check environment variables
cat /opt/coldcaller/.env

# Test database connection
cd /opt/coldcaller/backend
node -e "require('./src/database/config/database.js')"

# Check port availability
netstat -tulpn | grep :3001
```

#### SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew certificate
certbot renew

# Test SSL configuration
ssl-checker your-domain.com

# Check nginx configuration
nginx -t
```

#### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U coldcaller_app -d coldcaller_prod

# Check PostgreSQL status
systemctl status postgresql

# View PostgreSQL logs
tail -f /var/log/postgresql/postgresql-13-main.log
```

#### Performance Issues
```bash
# Check system resources
htop
df -h
iostat -x 1

# Check application metrics
curl http://localhost:3001/metrics

# Monitor database performance
psql -U coldcaller_app -d coldcaller_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 5;"
```

### Emergency Recovery Procedures

#### Rollback Deployment
```bash
#!/bin/bash
# rollback.sh

BACKUP_DATE="$1"
if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_timestamp>"
    ls -la /opt/backups/coldcaller/
    exit 1
fi

echo "Rolling back to backup: $BACKUP_DATE"

# Stop services
pm2 stop coldcaller-backend

# Restore backup
cd /
tar -xzf /opt/backups/coldcaller/coldcaller_$BACKUP_DATE.tar.gz

# Restart services
pm2 start /opt/coldcaller/ecosystem.config.js

echo "Rollback completed"
```

#### Database Recovery
```bash
# Restore database from backup
dropdb coldcaller_prod
createdb coldcaller_prod
psql -U coldcaller_app -d coldcaller_prod < /opt/backups/db_backup.sql
```

---

## 📋 Production Maintenance

### Daily Tasks
- [ ] Check application health endpoints
- [ ] Review error logs for issues
- [ ] Monitor system resource usage
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Update system security patches
- [ ] Review performance metrics
- [ ] Clean up old log files
- [ ] Test backup restoration process

### Monthly Tasks
- [ ] Review and update SSL certificates
- [ ] Analyze security logs for threats
- [ ] Update monitoring dashboards
- [ ] Conduct disaster recovery test

---

## 📞 Support & Escalation

### Support Channels
- **Emergency Support**: +1-800-COLD-911 (24/7)
- **Technical Support**: support@coldcaller.com
- **Deployment Issues**: devops@coldcaller.com
- **Security Issues**: security@coldcaller.com

### Escalation Matrix
| Issue Severity | Response Time | Contact |
|----------------|---------------|---------|
| Critical (System Down) | 15 minutes | Emergency Support |
| High (Major Feature) | 2 hours | Technical Support |
| Medium (Minor Issue) | 4 hours | Technical Support |
| Low (Enhancement) | Next Business Day | Technical Support |

---

**Deployment Completed!** Your ColdCaller Dashboard is now ready for production use.

**Last Updated**: January 2024  
**Deployment Guide Version**: 2.0  
**For Support**: devops@coldcaller.com