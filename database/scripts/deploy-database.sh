#!/bin/bash

# Database Deployment Script for LIMS Application
# This script handles database deployment across different environments

set -euo pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-development}"
DRY_RUN="${DRY_RUN:-false}"

# Default values
DEFAULT_DB_HOST="localhost"
DEFAULT_DB_PORT="5432"
DEFAULT_DB_NAME="lims_${ENVIRONMENT}"
DEFAULT_DB_USER="postgres"

# Environment variables
DB_HOST="${DB_HOST:-$DEFAULT_DB_HOST}"
DB_PORT="${DB_PORT:-$DEFAULT_DB_PORT}"
DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"
DB_USER="${DB_USER:-$DEFAULT_DB_USER}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_SSL="${DB_SSL:-false}"

# Deployment options
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SEEDS="${RUN_SEEDS:-true}"
VALIDATE_AFTER_DEPLOY="${VALIDATE_AFTER_DEPLOY:-true}"

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DATABASE_DIR/logs/deployment.log"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DATABASE_DIR/logs/deployment.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DATABASE_DIR/logs/deployment.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DATABASE_DIR/logs/deployment.log"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check if PostgreSQL client is installed
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client is not installed"
        exit 1
    fi
    
    # Check if required directories exist
    if [ ! -d "$DATABASE_DIR/migrations" ]; then
        error "Migrations directory not found"
        exit 1
    fi
    
    if [ ! -d "$DATABASE_DIR/seeds" ]; then
        error "Seeds directory not found"
        exit 1
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p "$DATABASE_DIR/logs"
    
    success "Prerequisites check passed"
}

# Function to validate environment
validate_environment() {
    log "Validating environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        development|staging|production)
            log "Environment '$ENVIRONMENT' is valid"
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
            exit 1
            ;;
    esac
    
    # Check required environment variables for production
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ -z "$DB_PASSWORD" ]; then
            error "DB_PASSWORD is required for production environment"
            exit 1
        fi
        
        if [ "$DB_SSL" != "true" ]; then
            warning "SSL is not enabled for production environment"
        fi
    fi
    
    success "Environment validation passed"
}

# Function to test database connection
test_database_connection() {
    log "Testing database connection..."
    
    # Set PGPASSWORD environment variable for psql
    export PGPASSWORD="$DB_PASSWORD"
    
    # Test connection
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        success "Database connection successful"
    else
        error "Database connection failed"
        error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        exit 1
    fi
}

# Function to create database backup
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log "Creating database backup..."
        
        local backup_label="pre_deploy_$(date +%Y%m%d_%H%M%S)"
        
        cd "$DATABASE_DIR"
        if node migration-manager.js backup "$backup_label"; then
            success "Database backup created: $backup_label"
        else
            error "Database backup failed"
            exit 1
        fi
    else
        log "Skipping database backup (BACKUP_BEFORE_DEPLOY=false)"
    fi
}

# Function to run migrations
run_migrations() {
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        log "Running database migrations..."
        
        cd "$DATABASE_DIR"
        
        # Show migration status
        node migration-manager.js status
        
        # Run migrations
        if [ "$DRY_RUN" = "true" ]; then
            log "Dry run: Previewing migrations..."
            node migration-manager.js migrate --dry-run
        else
            if node migration-manager.js migrate; then
                success "Database migrations completed successfully"
            else
                error "Database migrations failed"
                exit 1
            fi
        fi
    else
        log "Skipping database migrations (RUN_MIGRATIONS=false)"
    fi
}

# Function to run seeds
run_seeds() {
    if [ "$RUN_SEEDS" = "true" ]; then
        log "Running database seeds for environment: $ENVIRONMENT"
        
        cd "$DATABASE_DIR"
        
        if [ "$DRY_RUN" = "true" ]; then
            log "Dry run: Would seed database for environment: $ENVIRONMENT"
        else
            if node migration-manager.js seed "$ENVIRONMENT"; then
                success "Database seeding completed successfully"
            else
                error "Database seeding failed"
                exit 1
            fi
        fi
    else
        log "Skipping database seeding (RUN_SEEDS=false)"
    fi
}

# Function to validate deployment
validate_deployment() {
    if [ "$VALIDATE_AFTER_DEPLOY" = "true" ]; then
        log "Validating deployment..."
        
        cd "$DATABASE_DIR"
        
        # Check migration status
        log "Checking migration status..."
        node migration-manager.js status
        
        # Test database health
        log "Testing database health..."
        if npm run db:health-check; then
            success "Database health check passed"
        else
            error "Database health check failed"
            exit 1
        fi
        
        # Additional validation for production
        if [ "$ENVIRONMENT" = "production" ]; then
            log "Running production-specific validations..."
            
            # Check if admin user exists
            export PGPASSWORD="$DB_PASSWORD"
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT username FROM users WHERE username = 'admin';" | grep -q "admin"; then
                success "Admin user exists"
            else
                error "Admin user not found"
                exit 1
            fi
            
            # Check if essential system settings exist
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM system_settings;" | grep -q "[1-9]"; then
                success "System settings configured"
            else
                error "System settings not configured"
                exit 1
            fi
        fi
        
        success "Deployment validation passed"
    else
        log "Skipping deployment validation (VALIDATE_AFTER_DEPLOY=false)"
    fi
}

# Function to generate deployment report
generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="$DATABASE_DIR/logs/deployment_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "database": {
      "host": "$DB_HOST",
      "port": $DB_PORT,
      "name": "$DB_NAME",
      "user": "$DB_USER",
      "ssl": $DB_SSL
    },
    "options": {
      "dry_run": $DRY_RUN,
      "backup_before_deploy": $BACKUP_BEFORE_DEPLOY,
      "run_migrations": $RUN_MIGRATIONS,
      "run_seeds": $RUN_SEEDS,
      "validate_after_deploy": $VALIDATE_AFTER_DEPLOY
    },
    "status": "completed"
  }
}
EOF
    
    success "Deployment report generated: $report_file"
}

# Function to handle rollback
handle_rollback() {
    if [ "$1" = "rollback" ]; then
        local migration_version="$2"
        
        if [ -z "$migration_version" ]; then
            error "Migration version required for rollback"
            exit 1
        fi
        
        log "Rolling back to migration version: $migration_version"
        
        # Create backup before rollback
        create_backup
        
        cd "$DATABASE_DIR"
        if node migration-manager.js rollback "$migration_version"; then
            success "Rollback completed successfully"
        else
            error "Rollback failed"
            exit 1
        fi
        
        exit 0
    fi
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] [COMMAND]

Commands:
  deploy              Deploy database (default)
  rollback <version>  Rollback to specific migration version
  status             Show deployment status
  help               Show this help message

Options:
  --environment ENV         Target environment (development, staging, production)
  --dry-run                Perform dry run without making changes
  --no-backup              Skip backup creation
  --no-migrations          Skip migration execution
  --no-seeds               Skip seed execution
  --no-validation          Skip post-deployment validation

Environment Variables:
  DB_HOST                   Database host (default: localhost)
  DB_PORT                   Database port (default: 5432)
  DB_NAME                   Database name (default: lims_\$ENVIRONMENT)
  DB_USER                   Database user (default: postgres)
  DB_PASSWORD               Database password (required for production)
  DB_SSL                    Enable SSL (default: false)
  BACKUP_BEFORE_DEPLOY      Create backup before deployment (default: true)
  RUN_MIGRATIONS            Run migrations (default: true)
  RUN_SEEDS                 Run seeds (default: true)
  VALIDATE_AFTER_DEPLOY     Validate after deployment (default: true)

Examples:
  $0 --environment production
  $0 --environment staging --dry-run
  $0 rollback 002
  $0 --no-backup --no-seeds
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-backup)
            BACKUP_BEFORE_DEPLOY=false
            shift
            ;;
        --no-migrations)
            RUN_MIGRATIONS=false
            shift
            ;;
        --no-seeds)
            RUN_SEEDS=false
            shift
            ;;
        --no-validation)
            VALIDATE_AFTER_DEPLOY=false
            shift
            ;;
        rollback)
            handle_rollback "$1" "$2"
            ;;
        status)
            cd "$DATABASE_DIR"
            node migration-manager.js status
            exit 0
            ;;
        help)
            show_usage
            exit 0
            ;;
        deploy)
            # Default action, continue
            shift
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment process
main() {
    log "Starting database deployment..."
    log "Environment: $ENVIRONMENT"
    log "Dry run: $DRY_RUN"
    log "Target database: $DB_NAME@$DB_HOST:$DB_PORT"
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    test_database_connection
    create_backup
    run_migrations
    run_seeds
    validate_deployment
    generate_deployment_report
    
    if [ "$DRY_RUN" = "true" ]; then
        success "Dry run completed successfully"
    else
        success "Database deployment completed successfully"
    fi
    
    # Production-specific post-deployment reminders
    if [ "$ENVIRONMENT" = "production" ] && [ "$DRY_RUN" = "false" ]; then
        warning "PRODUCTION DEPLOYMENT COMPLETED"
        warning "Please complete the following tasks immediately:"
        warning "1. Change admin password"
        warning "2. Update laboratory information"
        warning "3. Configure SMTP settings"
        warning "4. Setup monitoring and alerting"
        warning "5. Verify SSL certificates"
        warning "6. Test all critical functionality"
    fi
}

# Run main function
main "$@"