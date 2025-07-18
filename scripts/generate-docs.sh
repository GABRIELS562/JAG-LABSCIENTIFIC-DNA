#!/bin/bash

# Documentation Generation Script for LabScientific LIMS
# This script automatically generates and updates project documentation

set -euo pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"
TEMP_DIR="$PROJECT_ROOT/.docs-temp"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Documentation types
DOC_TYPES="${DOC_TYPES:-api,architecture,deployment,development,operations}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-html,pdf,markdown}"
PUBLISH="${PUBLISH:-false}"

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check Docker (for some doc generators)
    if ! command -v docker &> /dev/null; then
        warning "Docker is not installed (some documentation features may be limited)"
    fi
    
    # Create necessary directories
    mkdir -p "$DOCS_DIR"/{api,architecture,deployment,development,operations,generated}
    mkdir -p "$TEMP_DIR"
    
    success "Prerequisites check passed"
}

# Function to generate API documentation
generate_api_docs() {
    log "Generating API documentation..."
    
    cd "$PROJECT_ROOT"
    
    # Generate from OpenAPI spec
    if [ -f "$DOCS_DIR/api/openapi.yaml" ]; then
        log "Generating API docs from OpenAPI specification..."
        
        # Install redoc-cli if not present
        if ! command -v redoc-cli &> /dev/null; then
            log "Installing redoc-cli..."
            npm install -g redoc-cli
        fi
        
        # Generate HTML documentation
        redoc-cli build "$DOCS_DIR/api/openapi.yaml" \
            --output "$DOCS_DIR/generated/api-docs.html" \
            --title "LabScientific LIMS API Documentation" \
            --theme.colors.primary.main="#007bff"
        
        success "API HTML documentation generated"
        
        # Generate markdown documentation
        if command -v swagger-codegen &> /dev/null; then
            swagger-codegen generate \
                -i "$DOCS_DIR/api/openapi.yaml" \
                -l markdown \
                -o "$DOCS_DIR/generated/api-markdown/"
            
            success "API Markdown documentation generated"
        fi
    else
        warning "OpenAPI specification not found at $DOCS_DIR/api/openapi.yaml"
    fi
    
    # Generate from JSDoc comments
    if [ -f "backend/server.js" ]; then
        log "Generating API docs from JSDoc comments..."
        
        # Install jsdoc if not present
        if ! npm list jsdoc &> /dev/null; then
            log "Installing JSDoc..."
            npm install --save-dev jsdoc
        fi
        
        # Generate JSDoc documentation
        npx jsdoc backend/**/*.js \
            -d "$DOCS_DIR/generated/jsdoc/" \
            -c jsdoc.conf.json \
            --readme README.md
        
        success "JSDoc API documentation generated"
    fi
    
    success "API documentation generation complete"
}

# Function to generate architecture documentation
generate_architecture_docs() {
    log "Generating architecture documentation..."
    
    # Create architecture overview
    cat > "$DOCS_DIR/generated/architecture-overview.md" << 'EOF'
# LabScientific LIMS Architecture Overview

## System Architecture

The LabScientific LIMS follows a microservices architecture pattern designed for scalability, maintainability, and fault tolerance.

### Architecture Principles

1. **Microservices**: Each service is independently deployable and scalable
2. **API-First**: All services expose RESTful APIs
3. **Event-Driven**: Asynchronous communication via message queues
4. **Database per Service**: Each service owns its data
5. **Circuit Breaker Pattern**: Fault tolerance and resilience

### Core Services

#### Authentication Service
- **Purpose**: User authentication and authorization
- **Technology**: Node.js + Express + JWT
- **Database**: Redis (sessions)
- **Port**: 3001

#### Sample Service
- **Purpose**: Sample lifecycle management
- **Technology**: Node.js + Express
- **Database**: PostgreSQL
- **Port**: 3002

#### Analysis Service
- **Purpose**: Genetic analysis workflows
- **Technology**: Node.js + Express
- **Database**: PostgreSQL
- **Port**: 3003

#### Notification Service
- **Purpose**: Email, SMS, and push notifications
- **Technology**: Node.js + Express
- **Database**: PostgreSQL
- **Port**: 3004

### Data Flow

```
Client Request → API Gateway → Authentication → Service → Database
                                    ↓
                           Message Queue → Event Processing
```

### Security Architecture

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **Communication**: TLS 1.3 for all external communication
- **Data Protection**: AES-256 encryption at rest
- **Secrets Management**: Kubernetes secrets / AWS Secrets Manager

### Monitoring and Observability

- **Metrics**: Prometheus + Grafana
- **Tracing**: Jaeger distributed tracing
- **Logging**: ELK stack (Elasticsearch, Logstash, Kibana)
- **Health Checks**: HTTP endpoints + Kubernetes probes

### Deployment Architecture

- **Containerization**: Docker containers
- **Orchestration**: Kubernetes
- **Service Mesh**: Istio (optional)
- **Load Balancing**: NGINX Ingress Controller
- **Auto-scaling**: Horizontal Pod Autoscaler

### Development Architecture

- **Version Control**: Git with GitFlow
- **CI/CD**: GitHub Actions
- **Testing**: Jest (unit), Mocha (integration), Cypress (E2E)
- **Code Quality**: ESLint, Prettier, SonarQube
- **Documentation**: OpenAPI, JSDoc, Architectural Decision Records

EOF
    
    # Generate mermaid diagrams
    if command -v mmdc &> /dev/null; then
        log "Generating architecture diagrams..."
        
        # Create system architecture diagram
        cat > "$TEMP_DIR/system-architecture.mmd" << 'EOF'
graph TB
    subgraph "Client Tier"
        WEB[Web Application<br/>React + Vite]
        MOB[Mobile App<br/>React Native]
    end
    
    subgraph "API Gateway"
        NGINX[NGINX<br/>Load Balancer]
        AUTH[Auth Service<br/>JWT + OAuth]
    end
    
    subgraph "Application Tier"
        SAMPLE[Sample Service<br/>Node.js + Express]
        ANALYSIS[Analysis Service<br/>Node.js + Express]
        REPORT[Reporting Service<br/>Node.js + Express]
    end
    
    subgraph "Data Tier"
        POSTGRES[(PostgreSQL<br/>Primary DB)]
        REDIS[(Redis<br/>Cache + Sessions)]
        S3[(Cloud Storage<br/>Files + Backups)]
    end
    
    subgraph "External Services"
        EMR[EMR Systems]
        LAB[Lab Equipment]
        NOTIFY[Notification Services]
    end
    
    WEB --> NGINX
    MOB --> NGINX
    NGINX --> AUTH
    AUTH --> SAMPLE
    AUTH --> ANALYSIS
    AUTH --> REPORT
    
    SAMPLE --> POSTGRES
    ANALYSIS --> POSTGRES
    REPORT --> POSTGRES
    
    SAMPLE --> REDIS
    ANALYSIS --> REDIS
    REPORT --> REDIS
    
    ANALYSIS --> S3
    REPORT --> S3
    
    SAMPLE --> EMR
    ANALYSIS --> LAB
    REPORT --> NOTIFY
EOF
        
        mmdc -i "$TEMP_DIR/system-architecture.mmd" -o "$DOCS_DIR/generated/system-architecture.png"
        success "Architecture diagrams generated"
    fi
    
    success "Architecture documentation generation complete"
}

# Function to generate deployment documentation
generate_deployment_docs() {
    log "Generating deployment documentation..."
    
    # Create deployment guide
    cat > "$DOCS_DIR/generated/deployment-guide.md" << 'EOF'
# LabScientific LIMS Deployment Guide

## Overview

This guide covers deploying the LabScientific LIMS application across different environments.

## Deployment Environments

### Development Environment
- **Purpose**: Local development and testing
- **URL**: http://localhost:3000
- **Database**: PostgreSQL (local)
- **Caching**: Redis (local)
- **Monitoring**: Basic logging

### Testing Environment
- **Purpose**: Automated testing and integration testing
- **URL**: https://test.labscientific.internal
- **Database**: PostgreSQL (dedicated instance)
- **Caching**: Redis (dedicated instance)
- **Monitoring**: Full monitoring stack

### Staging Environment
- **Purpose**: Pre-production testing and validation
- **URL**: https://staging.labscientific.com
- **Database**: PostgreSQL (production-like)
- **Caching**: Redis (production-like)
- **Monitoring**: Full monitoring stack

### Production Environment
- **Purpose**: Live application serving real users
- **URL**: https://app.labscientific.com
- **Database**: PostgreSQL (high availability)
- **Caching**: Redis (high availability)
- **Monitoring**: Full monitoring stack + alerting

## Deployment Methods

### Docker Compose (Development)

```bash
# Clone repository
git clone https://github.com/your-org/labscientific-lims.git
cd labscientific-lims

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Kubernetes (Production)

```bash
# Install with Helm
helm repo add labscientific https://charts.labscientific.com
helm install lims labscientific/lims \
  --namespace lims-production \
  --values values.prod.yaml

# Check deployment
kubectl get pods -n lims-production
kubectl get services -n lims-production
```

### Cloud Deployment

#### AWS
```bash
# Deploy infrastructure
cd terraform/aws
terraform init
terraform plan -var-file="prod.tfvars"
terraform apply

# Deploy application
cd ../../helm
helm install lims ./lims -f values.aws.yaml
```

#### Azure
```bash
# Deploy infrastructure
az deployment group create \
  --resource-group labscientific-prod \
  --template-file azure/main.json \
  --parameters @azure/prod.parameters.json

# Deploy application
helm install lims ./helm/lims -f values.azure.yaml
```

#### Google Cloud
```bash
# Deploy infrastructure
cd terraform/gcp
terraform init
terraform plan -var-file="prod.tfvars"
terraform apply

# Deploy application
helm install lims ./helm/lims -f values.gcp.yaml
```

## Configuration Management

### Environment Variables

Required environment variables for each service:

#### Authentication Service
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: Token expiration time
- `REDIS_URL`: Redis connection string
- `OAUTH_CLIENT_ID`: OAuth client ID
- `OAUTH_CLIENT_SECRET`: OAuth client secret

#### Sample Service
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `EMR_API_URL`: EMR system API endpoint
- `EMR_API_KEY`: EMR system API key

#### Analysis Service
- `DATABASE_URL`: PostgreSQL connection string
- `LAB_EQUIPMENT_API_URL`: Lab equipment API endpoint
- `LAB_EQUIPMENT_API_KEY`: Lab equipment API key
- `ANALYSIS_QUEUE_URL`: Analysis queue endpoint

#### Notification Service
- `DATABASE_URL`: PostgreSQL connection string
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token

### Secrets Management

#### Kubernetes Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lims-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  database-password: <base64-encoded-password>
  redis-password: <base64-encoded-password>
```

#### AWS Secrets Manager
```bash
# Create secret
aws secretsmanager create-secret \
  --name lims/production/database \
  --secret-string '{"password":"your-secure-password"}'

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id lims/production/database
```

## Database Migration

### Running Migrations
```bash
# Development
npm run db:migrate

# Production
NODE_ENV=production npm run db:migrate

# Rollback
NODE_ENV=production npm run db:rollback
```

### Backup and Restore
```bash
# Backup
pg_dump -h localhost -U postgres lims_production > backup.sql

# Restore
psql -h localhost -U postgres lims_production < backup.sql
```

## Monitoring and Alerting

### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s
  external_labels:
    cluster: 'lims-production'

scrape_configs:
  - job_name: 'lims-api'
    static_configs:
      - targets: ['lims-api:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Grafana Dashboards
- **Application Performance**: Response times, error rates, throughput
- **Infrastructure**: CPU, memory, disk usage
- **Business Metrics**: Sample processing rates, user activity

### Alerting Rules
```yaml
groups:
  - name: lims.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          
      - alert: DatabaseConnectionHigh
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: Database connection count high
```

## Security Considerations

### SSL/TLS Configuration
- Use TLS 1.3 for all external communication
- Implement certificate rotation
- Use HTTP Strict Transport Security (HSTS)

### Network Security
- Implement network segmentation
- Use VPC/VNet for cloud deployments
- Configure security groups/firewall rules

### Access Control
- Implement least privilege principle
- Use service accounts for inter-service communication
- Regular access reviews and revocation

## Troubleshooting

### Common Issues

#### Service Not Starting
```bash
# Check logs
docker-compose logs service-name
kubectl logs deployment/service-name

# Check configuration
kubectl describe pod pod-name
```

#### Database Connection Issues
```bash
# Test connection
psql -h database-host -U username -d database-name

# Check connection pool
kubectl exec -it pod-name -- node -e "console.log(process.env.DATABASE_URL)"
```

#### Performance Issues
```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Check application metrics
curl http://service-name:3001/metrics
```

### Support Contacts
- **DevOps Team**: devops@labscientific.com
- **On-Call**: +1-555-0123 (24/7)
- **Slack**: #lims-support
EOF
    
    success "Deployment documentation generation complete"
}

# Function to generate development documentation
generate_development_docs() {
    log "Generating development documentation..."
    
    # Create development guide
    cat > "$DOCS_DIR/generated/development-guide.md" << 'EOF'
# LabScientific LIMS Development Guide

## Getting Started

### Prerequisites
- Node.js 18.0+
- Docker Desktop 4.0+
- Git 2.30+
- 8GB+ RAM recommended

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/labscientific-lims.git
   cd labscientific-lims
   ```

2. **Run the onboarding script**
   ```bash
   ./scripts/onboard-developer.sh
   ```

3. **Start development environment**
   ```bash
   npm run dev
   ```

### Development Workflow

#### Feature Development
1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Implement feature with tests
3. Run quality checks: `npm run lint && npm run test`
4. Commit changes: `git commit -m "feat: add amazing feature"`
5. Push and create PR: `git push origin feature/amazing-feature`

#### Code Quality Standards
- **ESLint**: Enforces code style and catches errors
- **Prettier**: Automatic code formatting
- **Husky**: Git hooks for pre-commit checks
- **Jest**: Unit testing framework
- **Cypress**: End-to-end testing

#### Testing Strategy
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# All tests
npm run test
```

### Architecture Patterns

#### Service Structure
```
services/
├── auth/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── middleware/
├── sample/
└── analysis/
```

#### API Design
- Use RESTful conventions
- Include proper HTTP status codes
- Implement request validation
- Add comprehensive error handling

#### Database Design
- Use migrations for schema changes
- Implement proper indexing
- Use transactions for consistency
- Include audit trails

### Development Tools

#### IDE Setup (VS Code)
- **Extensions**: ESLint, Prettier, Thunder Client
- **Settings**: Auto-format on save, workspace settings
- **Debugging**: Launch configurations for services

#### Database Tools
- **Adminer**: Web-based database management
- **pgAdmin**: PostgreSQL administration
- **Redis Commander**: Redis key-value browser

#### API Testing
- **Postman**: API collection included
- **Thunder Client**: VS Code extension
- **Swagger UI**: Interactive API documentation

### Environment Configuration

#### Development (.env.local)
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/lims_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-development-jwt-secret
```

#### Testing (.env.test)
```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:5432/lims_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-jwt-secret
```

### Common Tasks

#### Database Operations
```bash
# Create migration
npm run db:migration:create migration_name

# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Seed database
npm run db:seed
```

#### Service Operations
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Performance Optimization

#### Frontend Optimization
- Use React.memo for expensive components
- Implement code splitting with React.lazy
- Optimize bundle size with tree shaking
- Use service workers for caching

#### Backend Optimization
- Implement database connection pooling
- Use Redis for caching frequently accessed data
- Implement proper database indexing
- Use compression middleware

#### Database Optimization
- Analyze query performance with EXPLAIN
- Implement proper indexing strategies
- Use database connection pooling
- Monitor slow queries

### Security Best Practices

#### Authentication
- Use JWT tokens with proper expiration
- Implement refresh token rotation
- Use secure password hashing (bcrypt)
- Implement rate limiting

#### Authorization
- Use role-based access control
- Implement resource-level permissions
- Validate all user inputs
- Use parameterized queries

#### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper session management
- Regular security audits

### Debugging

#### Backend Debugging
```bash
# Start with debugger
npm run debug

# Debug specific service
NODE_ENV=development node --inspect backend/services/sample/index.js
```

#### Frontend Debugging
- Use React Developer Tools
- Browser DevTools for network inspection
- Redux DevTools for state management
- Performance profiling tools

### Contributing Guidelines

#### Code Style
- Follow existing code conventions
- Write meaningful commit messages
- Include tests for new features
- Update documentation

#### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Run CI checks locally
4. Create PR with description
5. Address review feedback
6. Merge after approval

#### Documentation
- Update README for new features
- Add inline code documentation
- Update API documentation
- Create architectural decision records

### Resources

#### Internal Resources
- **Slack**: #lims-development
- **Wiki**: https://wiki.labscientific.com/lims
- **Issue Tracker**: GitHub Issues

#### External Resources
- **Node.js Documentation**: https://nodejs.org/docs
- **React Documentation**: https://reactjs.org/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs
- **Docker Documentation**: https://docs.docker.com

### Troubleshooting

#### Common Issues
1. **Port already in use**: Check running processes
2. **Database connection failed**: Verify connection string
3. **Tests failing**: Check test database setup
4. **Build errors**: Clear node_modules and reinstall

#### Getting Help
- Check documentation first
- Search existing issues
- Ask in team Slack channel
- Create GitHub issue for bugs
EOF
    
    success "Development documentation generation complete"
}

# Function to generate operations documentation
generate_operations_docs() {
    log "Generating operations documentation..."
    
    # Create operations runbook
    cat > "$DOCS_DIR/generated/operations-runbook.md" << 'EOF'
# LabScientific LIMS Operations Runbook

## Overview
This runbook provides operational procedures for maintaining and troubleshooting the LabScientific LIMS system.

## System Overview

### Architecture
- **Frontend**: React application (port 3000)
- **API Gateway**: NGINX reverse proxy
- **Backend Services**: Node.js microservices
- **Database**: PostgreSQL cluster
- **Cache**: Redis cluster
- **Monitoring**: Prometheus + Grafana

### Environments
- **Production**: https://app.labscientific.com
- **Staging**: https://staging.labscientific.com
- **Testing**: https://test.labscientific.internal

## Daily Operations

### Health Checks
```bash
# Check service status
curl -f https://app.labscientific.com/health

# Check individual services
kubectl get pods -n lims-production
kubectl get services -n lims-production

# Check database health
kubectl exec -it postgres-0 -- pg_isready
```

### Monitoring Dashboard
- **Grafana**: https://monitoring.labscientific.com
- **Prometheus**: https://prometheus.labscientific.com
- **Jaeger**: https://tracing.labscientific.com

### Log Analysis
```bash
# View application logs
kubectl logs -f deployment/lims-api -n lims-production

# Search logs
kubectl logs deployment/lims-api -n lims-production | grep ERROR

# View logs by time range
kubectl logs deployment/lims-api -n lims-production --since=1h
```

## Incident Response

### Severity Levels
- **P0 (Critical)**: System down, data loss
- **P1 (High)**: Major functionality broken
- **P2 (Medium)**: Minor functionality issues
- **P3 (Low)**: Cosmetic issues

### Response Times
- **P0**: 15 minutes
- **P1**: 1 hour
- **P2**: 4 hours
- **P3**: 24 hours

### Escalation Path
1. **On-Call Engineer**: Primary responder
2. **DevOps Lead**: Escalate after 30 minutes
3. **Engineering Manager**: Escalate after 1 hour
4. **VP Engineering**: Escalate after 2 hours

## Common Issues and Solutions

### Service Unavailable (503)
```bash
# Check service pods
kubectl get pods -n lims-production

# Check service resources
kubectl describe pod <pod-name> -n lims-production

# Check service logs
kubectl logs <pod-name> -n lims-production

# Restart service
kubectl rollout restart deployment/lims-api -n lims-production
```

### Database Connection Issues
```bash
# Check database status
kubectl exec -it postgres-0 -- pg_isready

# Check connection pool
kubectl exec -it postgres-0 -- psql -c "SELECT * FROM pg_stat_activity;"

# Check database logs
kubectl logs postgres-0 -n lims-production

# Restart database (last resort)
kubectl delete pod postgres-0 -n lims-production
```

### High Memory Usage
```bash
# Check resource usage
kubectl top pods -n lims-production
kubectl describe node <node-name>

# Check memory leaks
kubectl exec -it <pod-name> -- node --inspect=0.0.0.0:9229 app.js

# Scale up resources
kubectl patch deployment lims-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"lims-api","resources":{"requests":{"memory":"512Mi"}}}]}}}}'
```

### Slow Response Times
```bash
# Check application metrics
curl https://app.labscientific.com/metrics

# Check database performance
kubectl exec -it postgres-0 -- psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check cache hit rate
kubectl exec -it redis-0 -- redis-cli info stats

# Check network latency
kubectl exec -it <pod-name> -- ping <service-name>
```

## Deployment Procedures

### Production Deployment
```bash
# 1. Pre-deployment checks
./scripts/pre-deployment-checks.sh

# 2. Create deployment
kubectl apply -f k8s/production/

# 3. Monitor deployment
kubectl rollout status deployment/lims-api -n lims-production

# 4. Run smoke tests
./scripts/smoke-tests.sh production

# 5. Post-deployment verification
./scripts/post-deployment-verification.sh
```

### Rollback Procedure
```bash
# 1. Identify previous version
kubectl rollout history deployment/lims-api -n lims-production

# 2. Rollback to previous version
kubectl rollout undo deployment/lims-api -n lims-production

# 3. Verify rollback
kubectl rollout status deployment/lims-api -n lims-production

# 4. Run verification tests
./scripts/smoke-tests.sh production
```

## Database Operations

### Backup Procedures
```bash
# Daily backup
kubectl exec -it postgres-0 -- pg_dump -h localhost -U postgres lims_production > backup-$(date +%Y%m%d).sql

# Upload to cloud storage
aws s3 cp backup-$(date +%Y%m%d).sql s3://lims-backups/production/

# Verify backup
aws s3 ls s3://lims-backups/production/
```

### Restore Procedures
```bash
# 1. Stop application
kubectl scale deployment lims-api --replicas=0 -n lims-production

# 2. Download backup
aws s3 cp s3://lims-backups/production/backup-20240117.sql .

# 3. Restore database
kubectl exec -it postgres-0 -- psql -h localhost -U postgres lims_production < backup-20240117.sql

# 4. Restart application
kubectl scale deployment lims-api --replicas=3 -n lims-production
```

### Database Maintenance
```bash
# Vacuum database
kubectl exec -it postgres-0 -- psql -c "VACUUM ANALYZE;"

# Reindex database
kubectl exec -it postgres-0 -- psql -c "REINDEX DATABASE lims_production;"

# Check database size
kubectl exec -it postgres-0 -- psql -c "SELECT pg_database_size('lims_production');"
```

## Security Operations

### Certificate Management
```bash
# Check certificate expiration
openssl x509 -in /etc/ssl/certs/lims.crt -noout -enddate

# Renew certificates (Let's Encrypt)
certbot renew --nginx

# Update Kubernetes secrets
kubectl create secret tls lims-tls --cert=tls.crt --key=tls.key -n lims-production
```

### Access Management
```bash
# List current users
kubectl get users

# Create service account
kubectl create serviceaccount lims-service -n lims-production

# Grant permissions
kubectl create rolebinding lims-service-binding --role=lims-role --serviceaccount=lims-production:lims-service
```

### Security Monitoring
```bash
# Check failed login attempts
kubectl logs deployment/lims-api -n lims-production | grep "Authentication failed"

# Monitor unusual activity
kubectl logs deployment/lims-api -n lims-production | grep "rate limit exceeded"

# Check security alerts
curl -s https://monitoring.labscientific.com/api/v1/alerts | jq '.data[] | select(.labels.severity == "critical")'
```

## Performance Optimization

### Application Performance
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null https://app.labscientific.com/api/v1/samples

# Monitor memory usage
kubectl exec -it <pod-name> -- node --expose-gc --inspect=0.0.0.0:9229 app.js

# Profile CPU usage
kubectl exec -it <pod-name> -- node --prof app.js
```

### Database Performance
```bash
# Check slow queries
kubectl exec -it postgres-0 -- psql -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check index usage
kubectl exec -it postgres-0 -- psql -c "SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes ORDER BY idx_scan DESC;"

# Analyze query plans
kubectl exec -it postgres-0 -- psql -c "EXPLAIN ANALYZE SELECT * FROM samples WHERE status = 'pending';"
```

## Disaster Recovery

### Backup Strategy
- **Database**: Daily full backup, continuous WAL archiving
- **Application**: Container images in registry
- **Configuration**: Infrastructure as Code in Git

### Recovery Procedures
1. **Assess damage**: Determine extent of data loss
2. **Restore infrastructure**: Deploy from IaC templates
3. **Restore database**: Use most recent backup
4. **Restore application**: Deploy from container registry
5. **Verify functionality**: Run comprehensive tests

### Recovery Time Objectives (RTO)
- **Database**: 1 hour
- **Application**: 30 minutes
- **Full system**: 2 hours

### Recovery Point Objectives (RPO)
- **Database**: 15 minutes
- **Application**: 0 minutes (stateless)

## Contacts and Escalation

### Team Contacts
- **DevOps Team**: devops@labscientific.com
- **Backend Team**: backend@labscientific.com
- **Frontend Team**: frontend@labscientific.com
- **Database Team**: dba@labscientific.com

### Emergency Contacts
- **On-Call Engineer**: +1-555-0123
- **DevOps Lead**: +1-555-0124
- **Engineering Manager**: +1-555-0125

### External Vendors
- **Cloud Provider**: Support case system
- **Database Vendor**: Premium support
- **Monitoring Vendor**: 24/7 support line

## Maintenance Windows

### Schedule
- **Regular Maintenance**: Sunday 2-4 AM EST
- **Emergency Maintenance**: As needed with 4-hour notice
- **Planned Outages**: Monthly, scheduled 1 week in advance

### Notification Process
1. **Schedule maintenance**: Update maintenance calendar
2. **Notify stakeholders**: Send 48-hour notice
3. **Execute maintenance**: Follow approved procedures
4. **Post-maintenance**: Send completion notice

### Maintenance Checklist
- [ ] Schedule approved by stakeholders
- [ ] Backup completed successfully
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Communication plan executed
- [ ] Post-maintenance verification completed
EOF
    
    success "Operations documentation generation complete"
}

# Function to generate comprehensive documentation index
generate_documentation_index() {
    log "Generating documentation index..."
    
    # Create main documentation index
    cat > "$DOCS_DIR/generated/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LabScientific LIMS Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .docs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }
        .doc-section {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .doc-section:hover {
            transform: translateY(-5px);
        }
        .doc-section h2 {
            color: #2c3e50;
            margin-top: 0;
            font-size: 1.5em;
        }
        .doc-section p {
            color: #666;
            margin-bottom: 20px;
        }
        .doc-links {
            list-style: none;
            padding: 0;
        }
        .doc-links li {
            margin: 10px 0;
        }
        .doc-links a {
            color: #007bff;
            text-decoration: none;
            display: flex;
            align-items: center;
            padding: 10px;
            border-radius: 5px;
            transition: background 0.3s;
        }
        .doc-links a:hover {
            background: #f8f9fa;
        }
        .doc-links a::before {
            content: "📄";
            margin-right: 10px;
        }
        .quick-links {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .quick-links h2 {
            color: #2c3e50;
            margin-top: 0;
        }
        .quick-links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .quick-link {
            display: block;
            padding: 15px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            transition: background 0.3s;
        }
        .quick-link:hover {
            background: #0056b3;
            color: white;
        }
        .footer {
            margin-top: 40px;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #dee2e6;
        }
        .updated {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.1);
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧬 LabScientific LIMS Documentation</h1>
        <p>Comprehensive documentation for the Laboratory Information Management System</p>
        <div class="updated">Last updated: TIMESTAMP</div>
    </div>

    <div class="docs-grid">
        <div class="doc-section">
            <h2>🚀 Getting Started</h2>
            <p>Quick start guides and setup instructions for new developers and users.</p>
            <ul class="doc-links">
                <li><a href="../README.md">Project Overview</a></li>
                <li><a href="development-guide.md">Development Setup</a></li>
                <li><a href="../scripts/onboard-developer.sh">Developer Onboarding</a></li>
                <li><a href="deployment-guide.md">Deployment Guide</a></li>
            </ul>
        </div>

        <div class="doc-section">
            <h2>🏗️ Architecture</h2>
            <p>System architecture, design patterns, and technical decisions.</p>
            <ul class="doc-links">
                <li><a href="architecture-overview.md">Architecture Overview</a></li>
                <li><a href="system-architecture.png">System Diagram</a></li>
                <li><a href="../docs/architecture/">Architecture Docs</a></li>
                <li><a href="../docs/architecture/adrs/">Decision Records</a></li>
            </ul>
        </div>

        <div class="doc-section">
            <h2>📡 API Reference</h2>
            <p>Complete API documentation with examples and schemas.</p>
            <ul class="doc-links">
                <li><a href="api-docs.html">Interactive API Docs</a></li>
                <li><a href="../docs/api/openapi.yaml">OpenAPI Specification</a></li>
                <li><a href="api-markdown/">Markdown API Docs</a></li>
                <li><a href="jsdoc/">JSDoc API Reference</a></li>
            </ul>
        </div>

        <div class="doc-section">
            <h2>🔧 Development</h2>
            <p>Development workflows, coding standards, and best practices.</p>
            <ul class="doc-links">
                <li><a href="development-guide.md">Development Guide</a></li>
                <li><a href="../CONTRIBUTING.md">Contributing Guide</a></li>
                <li><a href="../docs/development/coding-standards.md">Coding Standards</a></li>
                <li><a href="../docs/development/testing.md">Testing Guide</a></li>
            </ul>
        </div>

        <div class="doc-section">
            <h2>🚀 Deployment</h2>
            <p>Deployment procedures, environment setup, and operations.</p>
            <ul class="doc-links">
                <li><a href="deployment-guide.md">Deployment Guide</a></li>
                <li><a href="../helm/">Helm Charts</a></li>
                <li><a href="../terraform/">Infrastructure as Code</a></li>
                <li><a href="../k8s/">Kubernetes Manifests</a></li>
            </ul>
        </div>

        <div class="doc-section">
            <h2>⚙️ Operations</h2>
            <p>Operational procedures, monitoring, and troubleshooting.</p>
            <ul class="doc-links">
                <li><a href="operations-runbook.md">Operations Runbook</a></li>
                <li><a href="../docs/operations/monitoring.md">Monitoring Guide</a></li>
                <li><a href="../docs/operations/troubleshooting.md">Troubleshooting</a></li>
                <li><a href="../docs/operations/security.md">Security Guide</a></li>
            </ul>
        </div>
    </div>

    <div class="quick-links">
        <h2>🔗 Quick Links</h2>
        <div class="quick-links-grid">
            <a href="http://localhost:3000" class="quick-link">Application</a>
            <a href="http://localhost:3001/api-docs" class="quick-link">API Docs</a>
            <a href="http://localhost:3001" class="quick-link">Grafana</a>
            <a href="http://localhost:9090" class="quick-link">Prometheus</a>
            <a href="http://localhost:16686" class="quick-link">Jaeger</a>
            <a href="https://github.com/your-org/labscientific-lims" class="quick-link">GitHub</a>
        </div>
    </div>

    <div class="footer">
        <p>&copy; 2024 LabScientific Team. This documentation is automatically generated and updated.</p>
        <p>For questions or issues, please contact <a href="mailto:docs@labscientific.com">docs@labscientific.com</a></p>
    </div>
</body>
</html>
EOF
    
    # Replace timestamp
    sed -i "s/TIMESTAMP/$TIMESTAMP/g" "$DOCS_DIR/generated/index.html"
    
    success "Documentation index generated"
}

# Function to publish documentation
publish_documentation() {
    if [ "$PUBLISH" = "true" ]; then
        log "Publishing documentation..."
        
        # Copy generated docs to web server directory
        if [ -d "/var/www/docs" ]; then
            cp -r "$DOCS_DIR/generated/"* /var/www/docs/
            success "Documentation published to web server"
        fi
        
        # Upload to cloud storage
        if command -v aws &> /dev/null; then
            aws s3 sync "$DOCS_DIR/generated/" s3://lims-docs/
            success "Documentation uploaded to S3"
        fi
        
        # Create GitHub Pages deployment
        if [ -d ".git" ]; then
            git add docs/generated/
            git commit -m "docs: update generated documentation"
            git push origin main
            success "Documentation committed to Git"
        fi
    fi
}

# Function to clean up temporary files
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    success "Cleanup complete"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  --types TYPE          Documentation types to generate (api,architecture,deployment,development,operations)
  --format FORMAT       Output format (html,pdf,markdown)
  --publish            Publish documentation after generation
  --help               Show this help message

Examples:
  $0 --types api,architecture
  $0 --format html,pdf --publish
  $0 --help
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --types)
            DOC_TYPES="$2"
            shift 2
            ;;
        --format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --publish)
            PUBLISH=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log "Starting documentation generation..."
    log "Types: $DOC_TYPES"
    log "Format: $OUTPUT_FORMAT"
    log "Publish: $PUBLISH"
    
    # Set up error handling
    trap cleanup EXIT
    
    # Run generation steps
    check_prerequisites
    
    # Generate documentation based on types
    IFS=',' read -ra TYPES <<< "$DOC_TYPES"
    for type in "${TYPES[@]}"; do
        case $type in
            api)
                generate_api_docs
                ;;
            architecture)
                generate_architecture_docs
                ;;
            deployment)
                generate_deployment_docs
                ;;
            development)
                generate_development_docs
                ;;
            operations)
                generate_operations_docs
                ;;
            *)
                warning "Unknown documentation type: $type"
                ;;
        esac
    done
    
    # Generate main index
    generate_documentation_index
    
    # Publish if requested
    publish_documentation
    
    success "Documentation generation completed successfully"
    log "Generated documentation available at: $DOCS_DIR/generated/"
}

# Run main function
main "$@"