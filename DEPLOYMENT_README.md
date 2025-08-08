# Coldcaller Production Deployment Guide

## 🚀 Complete Production-Ready Infrastructure

This deployment configuration provides enterprise-grade infrastructure with high availability, security, monitoring, and automated CI/CD pipelines.

## 📋 Infrastructure Overview

### Core Components
- **Frontend**: React application with Nginx reverse proxy
- **Backend**: Node.js API with Express.js framework
- **Database**: PostgreSQL 15 with automated backups
- **Cache**: Redis with persistence and replication
- **Load Balancer**: Nginx with SSL termination
- **Monitoring**: Prometheus, Grafana, Loki stack
- **Orchestration**: Kubernetes with auto-scaling
- **Infrastructure**: Terraform-managed AWS resources

### Deployment Targets
- **Local Development**: Docker Compose
- **Staging**: Kubernetes cluster with basic monitoring
- **Production**: HA Kubernetes with full observability stack

## 🛠️ Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- kubectl (for Kubernetes deployments)
- Terraform (for infrastructure)
- AWS CLI (for cloud deployments)

### Local Development
```bash
# Clone and setup
git clone <repository>
cd coldcaller

# Setup environment
make setup
# Edit .env file with your configuration

# Start local development
make dev
```

### Docker Deployment
```bash
# Build and run with Docker Compose
make docker-run

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3030
```

## 🏗️ Infrastructure Components

### Docker Configuration
- **Multi-stage builds** for optimized images
- **Security hardening** with non-root users
- **Health checks** for all services
- **Resource limits** and proper networking
- **Volume management** for data persistence

### Kubernetes Manifests
- **Namespaced deployments** for environment isolation
- **ConfigMaps** for application configuration
- **Secrets management** for sensitive data
- **Persistent volumes** for data storage
- **Horizontal Pod Autoscaling** for dynamic scaling
- **Ingress controllers** with SSL termination

### Terraform Infrastructure
- **VPC setup** with public/private subnets
- **EKS cluster** with managed node groups
- **RDS PostgreSQL** with Multi-AZ deployment
- **ElastiCache Redis** cluster
- **S3 buckets** for backups and static assets
- **IAM roles** with least-privilege access

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
Trigger: Push to main/staging/develop branches
Steps:
  1. Security scanning (Trivy, dependency check)
  2. Backend testing (unit, integration, coverage)
  3. Frontend testing (unit, coverage, build)
  4. E2E testing (Playwright automation)
  5. Docker image building and pushing
  6. Infrastructure deployment (Terraform)
  7. Application deployment (Kubernetes)
  8. Performance testing (K6 load tests)
  9. Notification and cleanup
```

### Deployment Strategies
- **Rolling updates**: Zero-downtime deployments
- **Blue-green**: Full environment switching
- **Canary releases**: Gradual traffic shifting

## 📊 Monitoring & Observability

### Metrics Collection
- **Prometheus**: Application and infrastructure metrics
- **Grafana**: Visual dashboards and alerting
- **Node Exporter**: System-level metrics
- **Application metrics**: Custom business metrics

### Logging
- **Loki**: Centralized log aggregation
- **Promtail**: Log collection from containers
- **Structured logging**: JSON format with correlation IDs

### Alerting
- **Performance alerts**: Response time, error rate
- **Infrastructure alerts**: CPU, memory, disk usage
- **Business alerts**: Critical workflow failures
- **Integration**: Slack, email, PagerDuty notifications

## 🔒 Security Features

### Container Security
- **Non-root users** in all containers
- **Read-only filesystems** where possible
- **Security contexts** and capabilities dropping
- **Image scanning** with Trivy in CI/CD

### Network Security
- **Network policies** for pod-to-pod communication
- **TLS encryption** for all external traffic
- **Private subnets** for database and cache
- **Security groups** with minimal required access

### Secrets Management
- **Kubernetes secrets** for application credentials
- **AWS Secrets Manager** integration option
- **HashiCorp Vault** ready integration points
- **Secret rotation** procedures documented

## 📈 High Availability & Scalability

### Database HA
- **PostgreSQL read replicas** for load distribution
- **Automated backups** with point-in-time recovery
- **Connection pooling** for optimal resource usage
- **Performance monitoring** with detailed metrics

### Application Scaling
- **Horizontal Pod Autoscaling** based on CPU/memory
- **Cluster autoscaling** for node management
- **Load balancing** across multiple replicas
- **Resource requests/limits** for proper scheduling

### Disaster Recovery
- **Automated backups** to S3 with encryption
- **Cross-region replication** option
- **Database restore procedures** documented
- **RTO/RPO metrics** defined and monitored

## 🚀 Deployment Commands

### Development
```bash
make dev              # Start local development
make test             # Run all tests
make build            # Build applications
make docker-build     # Build Docker images
```

### Staging Deployment
```bash
make deploy-staging   # Deploy to staging environment
make k8s-status       # Check deployment status
make k8s-logs         # View application logs
```

### Production Deployment
```bash
make terraform-plan   # Review infrastructure changes
make terraform-apply  # Apply infrastructure changes
make deploy-production # Deploy to production
make health-check     # Verify deployment health
```

### Maintenance
```bash
make backup           # Create database backup
make monitoring-up    # Start monitoring stack
make security-scan    # Run security vulnerability scans
make clean            # Clean build artifacts
```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:
- Database connection settings
- Redis configuration
- JWT secrets
- AWS credentials (for cloud deployments)
- Monitoring and alerting webhooks

### Kubernetes Secrets
Update `infrastructure/kubernetes/secrets.yml` with base64-encoded values:
```bash
echo -n "your-password" | base64
```

### Terraform Variables
Configure `infrastructure/terraform/environments/production.tfvars`:
- Instance sizes and scaling parameters
- Database and cache configurations
- Domain names and SSL certificates
- Backup retention policies

## 📚 Operational Procedures

### Daily Operations
- Monitor dashboards for performance trends
- Check backup completion and integrity
- Review error logs and alerts
- Validate SSL certificate expiration

### Weekly Operations
- Security vulnerability scans
- Performance baseline reviews
- Backup restore testing
- Dependency updates

### Monthly Operations
- Infrastructure cost analysis
- Capacity planning reviews
- Disaster recovery testing
- Security audit and compliance check

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
kubectl logs -l app=postgres -n coldcaller-production
kubectl exec -it <postgres-pod> -- psql -U postgres -d coldcaller
```

**Application Startup Issues**
```bash
kubectl describe pod <pod-name> -n coldcaller-production
kubectl logs <pod-name> -n coldcaller-production --previous
```

**Load Balancer Problems**
```bash
kubectl get ingress -n coldcaller-production
kubectl describe ingress coldcaller-ingress -n coldcaller-production
```

**Performance Issues**
- Check Grafana dashboards for bottlenecks
- Review Prometheus alerts
- Analyze application logs in Loki
- Scale resources if needed

### Emergency Procedures

**Rollback Deployment**
```bash
kubectl rollout undo deployment/coldcaller-backend -n coldcaller-production
kubectl rollout undo deployment/coldcaller-frontend -n coldcaller-production
```

**Scale Up Resources**
```bash
kubectl scale deployment coldcaller-backend --replicas=5 -n coldcaller-production
```

**Database Emergency Maintenance**
```bash
kubectl patch deployment coldcaller-backend -p '{"spec":{"replicas":0}}' -n coldcaller-production
# Perform maintenance
kubectl patch deployment coldcaller-backend -p '{"spec":{"replicas":3}}' -n coldcaller-production
```

## 📞 Support and Contacts

### Development Team
- **Lead Developer**: [contact]
- **DevOps Engineer**: [contact]
- **Database Administrator**: [contact]

### Emergency Contacts
- **On-call Engineer**: [contact]
- **Infrastructure Team**: [contact]
- **Business Continuity**: [contact]

### External Services
- **AWS Support**: [account details]
- **Domain Registrar**: [contact]
- **SSL Certificate Provider**: [contact]

---

## 🎯 Performance Targets

- **Availability**: 99.9% uptime (8.7 hours downtime/year)
- **Response Time**: <200ms API responses, <3s page loads
- **Throughput**: 1000+ concurrent users
- **Recovery Time**: <5 minutes for application issues
- **Backup Recovery**: <1 hour for full database restore

This deployment configuration provides enterprise-grade reliability, security, and scalability for the Coldcaller application.