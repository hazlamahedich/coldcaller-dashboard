# Coldcaller Application Makefile
# Production-ready deployment and development automation

.PHONY: help install build test deploy clean docker-build docker-push k8s-deploy terraform-plan terraform-apply backup

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Variables
PROJECT_NAME := coldcaller
ENVIRONMENT ?= development
DOCKER_REGISTRY ?= ghcr.io
DOCKER_REPO := $(DOCKER_REGISTRY)/$(PROJECT_NAME)
VERSION ?= latest
AWS_REGION ?= us-west-2
TERRAFORM_DIR := infrastructure/terraform
K8S_DIR := infrastructure/kubernetes

# Development targets
install: ## Install dependencies for both frontend and backend
	@echo "Installing backend dependencies..."
	cd backend && npm ci
	@echo "Installing frontend dependencies..."
	cd frontend && npm ci
	@echo "Dependencies installed successfully"

dev: ## Start development environment
	@echo "Starting development environment..."
	docker-compose up -d postgres redis
	@echo "Starting backend in development mode..."
	cd backend && npm run dev &
	@echo "Starting frontend in development mode..."
	cd frontend && npm start

dev-stop: ## Stop development environment
	@echo "Stopping development environment..."
	docker-compose down
	pkill -f "npm run dev" || true
	pkill -f "npm start" || true

# Testing targets
test: ## Run all tests
	@echo "Running backend tests..."
	cd backend && npm test
	@echo "Running frontend tests..."
	cd frontend && npm test -- --watchAll=false
	@echo "All tests completed"

test-coverage: ## Run tests with coverage
	@echo "Running backend tests with coverage..."
	cd backend && npm run test:coverage
	@echo "Running frontend tests with coverage..."
	cd frontend && npm run test:coverage

test-e2e: ## Run end-to-end tests
	@echo "Starting services for E2E tests..."
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	sleep 30
	@echo "Running E2E tests..."
	cd frontend && npm run test:e2e
	docker-compose down

# Build targets
build: ## Build both frontend and backend
	@echo "Building backend..."
	cd backend && npm run build || echo "No build script for backend"
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Build completed successfully"

lint: ## Run linting for both frontend and backend
	@echo "Running backend linting..."
	cd backend && npm run lint
	@echo "Running frontend linting..."
	cd frontend && npm run lint || echo "No lint script for frontend"

# Docker targets
docker-build: ## Build Docker images
	@echo "Building backend Docker image..."
	docker build -t $(DOCKER_REPO)/backend:$(VERSION) ./backend
	@echo "Building frontend Docker image..."
	docker build -t $(DOCKER_REPO)/frontend:$(VERSION) ./frontend
	@echo "Docker images built successfully"

docker-push: docker-build ## Push Docker images to registry
	@echo "Pushing backend image..."
	docker push $(DOCKER_REPO)/backend:$(VERSION)
	@echo "Pushing frontend image..."
	docker push $(DOCKER_REPO)/frontend:$(VERSION)
	@echo "Docker images pushed successfully"

docker-run: ## Run application with Docker Compose
	@echo "Starting application with Docker Compose..."
	docker-compose up -d
	@echo "Application started. Access at http://localhost:3000"

docker-logs: ## Show Docker container logs
	docker-compose logs -f

docker-clean: ## Clean Docker images and containers
	@echo "Cleaning Docker resources..."
	docker-compose down -v
	docker system prune -f
	@echo "Docker cleanup completed"

# Infrastructure targets
terraform-init: ## Initialize Terraform
	@echo "Initializing Terraform..."
	cd $(TERRAFORM_DIR) && terraform init

terraform-plan: terraform-init ## Plan Terraform infrastructure changes
	@echo "Planning Terraform changes for $(ENVIRONMENT)..."
	cd $(TERRAFORM_DIR) && terraform plan -var-file="environments/$(ENVIRONMENT).tfvars"

terraform-apply: terraform-init ## Apply Terraform infrastructure changes
	@echo "Applying Terraform changes for $(ENVIRONMENT)..."
	cd $(TERRAFORM_DIR) && terraform apply -var-file="environments/$(ENVIRONMENT).tfvars" -auto-approve

terraform-destroy: terraform-init ## Destroy Terraform infrastructure
	@echo "Destroying Terraform infrastructure for $(ENVIRONMENT)..."
	cd $(TERRAFORM_DIR) && terraform destroy -var-file="environments/$(ENVIRONMENT).tfvars" -auto-approve

# Kubernetes targets
k8s-namespace: ## Create Kubernetes namespace
	kubectl apply -f $(K8S_DIR)/namespace.yml

k8s-secrets: ## Apply Kubernetes secrets (ensure they are configured)
	@echo "Applying Kubernetes secrets..."
	kubectl apply -f $(K8S_DIR)/secrets.yml

k8s-config: ## Apply Kubernetes configuration
	kubectl apply -f $(K8S_DIR)/configmap.yml

k8s-infrastructure: k8s-namespace k8s-secrets k8s-config ## Deploy Kubernetes infrastructure components
	@echo "Deploying infrastructure components..."
	kubectl apply -f $(K8S_DIR)/postgres.yml
	kubectl apply -f $(K8S_DIR)/redis.yml
	@echo "Waiting for infrastructure to be ready..."
	kubectl wait --for=condition=ready pod -l app=postgres -n coldcaller-$(ENVIRONMENT) --timeout=300s
	kubectl wait --for=condition=ready pod -l app=redis -n coldcaller-$(ENVIRONMENT) --timeout=300s

k8s-apps: ## Deploy Kubernetes applications
	@echo "Deploying application components..."
	kubectl apply -f $(K8S_DIR)/backend.yml
	kubectl apply -f $(K8S_DIR)/frontend.yml
	kubectl apply -f $(K8S_DIR)/ingress.yml
	@echo "Waiting for applications to be ready..."
	kubectl wait --for=condition=ready pod -l app=coldcaller-backend -n coldcaller-$(ENVIRONMENT) --timeout=300s
	kubectl wait --for=condition=ready pod -l app=coldcaller-frontend -n coldcaller-$(ENVIRONMENT) --timeout=300s

k8s-deploy: k8s-infrastructure k8s-apps ## Deploy full application to Kubernetes
	@echo "Deployment to Kubernetes completed successfully"

k8s-status: ## Show Kubernetes deployment status
	@echo "Deployment status for $(ENVIRONMENT):"
	kubectl get all -n coldcaller-$(ENVIRONMENT)

k8s-logs: ## Show Kubernetes pod logs
	@echo "Backend logs:"
	kubectl logs -l app=coldcaller-backend -n coldcaller-$(ENVIRONMENT) --tail=50
	@echo "Frontend logs:"
	kubectl logs -l app=coldcaller-frontend -n coldcaller-$(ENVIRONMENT) --tail=50

k8s-clean: ## Clean Kubernetes deployments
	@echo "Cleaning Kubernetes deployments..."
	kubectl delete namespace coldcaller-$(ENVIRONMENT) --ignore-not-found=true

# Deployment targets
deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging environment..."
	$(MAKE) ENVIRONMENT=staging docker-push
	$(MAKE) ENVIRONMENT=staging k8s-deploy

deploy-production: ## Deploy to production environment
	@echo "Deploying to production environment..."
	$(MAKE) ENVIRONMENT=production docker-push
	$(MAKE) ENVIRONMENT=production k8s-deploy

deploy-local: ## Deploy locally with Docker Compose
	@echo "Deploying locally..."
	$(MAKE) docker-run

# Backup and maintenance targets
backup: ## Create database and files backup
	@echo "Creating backup..."
	docker-compose exec -T postgres pg_dump -U postgres coldcaller > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created successfully"

restore: ## Restore database from backup (requires BACKUP_FILE variable)
	@echo "Restoring database from $(BACKUP_FILE)..."
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Please specify BACKUP_FILE=path/to/backup.sql"; exit 1; fi
	docker-compose exec -T postgres psql -U postgres -d coldcaller < $(BACKUP_FILE)
	@echo "Database restored successfully"

logs: ## Show application logs
	@echo "Backend logs:"
	cd backend && npm run logs || docker-compose logs backend
	@echo "Frontend logs:"
	docker-compose logs frontend

health-check: ## Check application health
	@echo "Checking application health..."
	curl -f http://localhost:3001/health || echo "Backend health check failed"
	curl -f http://localhost:3000 || echo "Frontend health check failed"

# Security targets
security-scan: ## Run security vulnerability scans
	@echo "Running security scans..."
	cd backend && npm audit
	cd frontend && npm audit
	@echo "Scanning Docker images..."
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image $(DOCKER_REPO)/backend:$(VERSION) || true
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image $(DOCKER_REPO)/frontend:$(VERSION) || true

# Monitoring targets
monitoring-up: ## Start monitoring stack
	@echo "Starting monitoring stack..."
	docker-compose -f docker-compose.yml up -d prometheus grafana loki promtail
	@echo "Monitoring stack started:"
	@echo "  Prometheus: http://localhost:9090"
	@echo "  Grafana: http://localhost:3030 (admin/admin)"

monitoring-down: ## Stop monitoring stack
	docker-compose stop prometheus grafana loki promtail

# Utility targets
clean: docker-clean ## Clean all build artifacts and containers
	@echo "Cleaning build artifacts..."
	rm -rf backend/node_modules/.cache || true
	rm -rf frontend/build || true
	rm -rf frontend/node_modules/.cache || true
	@echo "Cleanup completed"

setup: install ## Initial project setup
	@echo "Setting up project..."
	cp .env.example .env
	@echo "Project setup completed. Please update .env file with your configuration."

# CI/CD targets
ci-test: install lint test ## Run CI tests
	@echo "CI tests completed successfully"

cd-deploy: docker-build docker-push ## Run CD deployment
	@echo "CD deployment completed successfully"

# Development utilities
db-reset: ## Reset database with fresh data
	@echo "Resetting database..."
	docker-compose exec backend npm run db:reset
	@echo "Database reset completed"

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	docker-compose exec backend npm run db:migrate
	@echo "Database migrations completed"

db-seed: ## Seed database with test data
	@echo "Seeding database..."
	docker-compose exec backend npm run db:seed
	@echo "Database seeded successfully"