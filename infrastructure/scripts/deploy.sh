#!/bin/bash

# Production deployment script for Coldcaller application
# Supports blue-green deployment with health checks and rollback

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-production}"
DEPLOY_MODE="${2:-rolling}"  # rolling, blue-green, canary
DRY_RUN="${3:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kubernetes configuration
NAMESPACE="coldcaller-$ENVIRONMENT"
KUBECONFIG="${KUBECONFIG:-~/.kube/config}"

# Deployment settings
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true
BACKUP_BEFORE_DEPLOY=true

# Logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" >&2
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check kubectl connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log "Creating namespace $NAMESPACE"
        if [[ "$DRY_RUN" != "true" ]]; then
            kubectl create namespace "$NAMESPACE"
        fi
    fi
    
    # Check required secrets exist
    local required_secrets=("coldcaller-secrets" "postgres-secret")
    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret "$secret" -n "$NAMESPACE" >/dev/null 2>&1; then
            warning "Required secret '$secret' not found in namespace '$NAMESPACE'"
        fi
    done
    
    # Check Docker images exist
    local images=("ghcr.io/coldcaller/backend:latest" "ghcr.io/coldcaller/frontend:latest")
    for image in "${images[@]}"; do
        if ! docker manifest inspect "$image" >/dev/null 2>&1; then
            warning "Docker image '$image' not found or not accessible"
        fi
    done
    
    success "Pre-deployment checks completed"
}

# Database backup before deployment
backup_database() {
    if [[ "$BACKUP_BEFORE_DEPLOY" == "true" ]]; then
        log "Creating database backup before deployment..."
        
        if [[ "$DRY_RUN" != "true" ]]; then
            # Run backup job
            kubectl run backup-job-$(date +%s) \
                --image=postgres:15-alpine \
                --restart=Never \
                --namespace="$NAMESPACE" \
                --env="PGPASSWORD=$(kubectl get secret postgres-secret -n $NAMESPACE -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)" \
                --command -- /bin/sh -c "
                pg_dump -h postgres-service -p 5432 -U postgres -d coldcaller \
                    --no-password --clean --if-exists > /tmp/backup-$(date +%Y%m%d_%H%M%S).sql
                "
        fi
        
        success "Database backup initiated"
    fi
}

# Deploy infrastructure components
deploy_infrastructure() {
    log "Deploying infrastructure components..."
    
    local manifests=(
        "infrastructure/kubernetes/namespace.yml"
        "infrastructure/kubernetes/configmap.yml"
        "infrastructure/kubernetes/secrets.yml"
        "infrastructure/kubernetes/postgres.yml"
        "infrastructure/kubernetes/redis.yml"
    )
    
    for manifest in "${manifests[@]}"; do
        if [[ -f "$PROJECT_ROOT/$manifest" ]]; then
            log "Applying $manifest"
            if [[ "$DRY_RUN" != "true" ]]; then
                kubectl apply -f "$PROJECT_ROOT/$manifest"
            fi
        else
            warning "Manifest not found: $manifest"
        fi
    done
    
    # Wait for infrastructure to be ready
    if [[ "$DRY_RUN" != "true" ]]; then
        log "Waiting for infrastructure components to be ready..."
        kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s
        kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s
    fi
    
    success "Infrastructure deployment completed"
}

# Deploy applications
deploy_applications() {
    log "Deploying application components..."
    
    local manifests=(
        "infrastructure/kubernetes/backend.yml"
        "infrastructure/kubernetes/frontend.yml"
        "infrastructure/kubernetes/ingress.yml"
    )
    
    for manifest in "${manifests[@]}"; do
        if [[ -f "$PROJECT_ROOT/$manifest" ]]; then
            log "Applying $manifest"
            if [[ "$DRY_RUN" != "true" ]]; then
                kubectl apply -f "$PROJECT_ROOT/$manifest"
            fi
        fi
    done
    
    success "Application deployment initiated"
}

# Health checks
perform_health_checks() {
    log "Performing health checks..."
    
    local services=("coldcaller-backend" "coldcaller-frontend")
    local start_time
    start_time=$(date +%s)
    
    for service in "${services[@]}"; do
        log "Checking health of $service..."
        
        if [[ "$DRY_RUN" != "true" ]]; then
            # Wait for rollout to complete
            if ! kubectl rollout status "deployment/$service" -n "$NAMESPACE" --timeout="${HEALTH_CHECK_TIMEOUT}s"; then
                error "Deployment rollout failed for $service"
            fi
            
            # Additional health check via HTTP endpoint
            if [[ "$service" == "coldcaller-backend" ]]; then
                local pod_name
                pod_name=$(kubectl get pods -l app=coldcaller-backend -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
                
                if ! kubectl exec "$pod_name" -n "$NAMESPACE" -- curl -f http://localhost:3001/health; then
                    error "Backend health check failed"
                fi
            fi
        fi
        
        success "$service health check passed"
    done
    
    local end_time duration
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    success "All health checks completed in ${duration} seconds"
}

# Blue-green deployment
blue_green_deploy() {
    log "Performing blue-green deployment..."
    
    # This is a simplified blue-green deployment
    # In production, you'd have more sophisticated traffic switching
    
    local current_version
    current_version=$(kubectl get deployment coldcaller-backend -n "$NAMESPACE" -o jsonpath='{.metadata.labels.version}' || echo "blue")
    local new_version
    
    if [[ "$current_version" == "blue" ]]; then
        new_version="green"
    else
        new_version="blue"
    fi
    
    log "Current version: $current_version, deploying: $new_version"
    
    # Deploy new version
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl patch deployment coldcaller-backend -n "$NAMESPACE" -p '{"metadata":{"labels":{"version":"'$new_version'"}}}'
        kubectl patch deployment coldcaller-frontend -n "$NAMESPACE" -p '{"metadata":{"labels":{"version":"'$new_version'"}}}'
    fi
    
    # Wait and perform health checks
    perform_health_checks
    
    # Switch traffic (this would be more complex in a real blue-green setup)
    log "Switching traffic to $new_version"
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl patch service coldcaller-backend-service -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"'$new_version'"}}}'
        kubectl patch service coldcaller-frontend-service -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"'$new_version'"}}}'
    fi
    
    success "Blue-green deployment completed"
}

# Rollback function
rollback_deployment() {
    log "Rolling back deployment..."
    
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl rollout undo deployment/coldcaller-backend -n "$NAMESPACE"
        kubectl rollout undo deployment/coldcaller-frontend -n "$NAMESPACE"
        
        # Wait for rollback to complete
        kubectl rollout status deployment/coldcaller-backend -n "$NAMESPACE"
        kubectl rollout status deployment/coldcaller-frontend -n "$NAMESPACE"
    fi
    
    success "Rollback completed"
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    log "NOTIFICATION [$status]: $message"
    
    # Example Slack notification (uncomment and configure)
    # if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data "{\"text\":\"Coldcaller Deployment [$status]: $message\"}" \
    #         "$SLACK_WEBHOOK_URL"
    # fi
}

# Main deployment function
main() {
    local start_time
    start_time=$(date +%s)
    
    log "Starting deployment to $ENVIRONMENT environment..."
    log "Deploy mode: $DEPLOY_MODE"
    log "Dry run: $DRY_RUN"
    
    # Pre-deployment
    pre_deployment_checks
    
    if [[ "$BACKUP_BEFORE_DEPLOY" == "true" ]]; then
        backup_database
    fi
    
    # Deploy infrastructure first
    deploy_infrastructure
    
    # Deploy applications based on mode
    case "$DEPLOY_MODE" in
        "blue-green")
            blue_green_deploy
            ;;
        "rolling")
            deploy_applications
            perform_health_checks
            ;;
        "canary")
            warning "Canary deployment not implemented yet, falling back to rolling"
            deploy_applications
            perform_health_checks
            ;;
        *)
            error "Unknown deployment mode: $DEPLOY_MODE"
            ;;
    esac
    
    local end_time duration
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    success "Deployment completed successfully in ${duration} seconds"
    send_notification "SUCCESS" "Deployment to $ENVIRONMENT completed in ${duration}s"
}

# Error handling with rollback
trap 'error_handler' ERR

error_handler() {
    error "Deployment failed!"
    
    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
        log "Initiating automatic rollback..."
        rollback_deployment
    fi
    
    send_notification "FAILED" "Deployment to $ENVIRONMENT failed and was rolled back"
    exit 1
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [deploy_mode] [dry_run]"
    echo "  environment: production, staging (default: production)"
    echo "  deploy_mode: rolling, blue-green, canary (default: rolling)"
    echo "  dry_run: true, false (default: false)"
    echo ""
    echo "Example: $0 production blue-green false"
}

# Validate arguments
if [[ "$ENVIRONMENT" != "production" ]] && [[ "$ENVIRONMENT" != "staging" ]]; then
    error "Invalid environment: $ENVIRONMENT"
fi

if [[ "$#" -gt 3 ]]; then
    usage
    exit 1
fi

# Run main function
main "$@"