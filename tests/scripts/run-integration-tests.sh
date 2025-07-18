#!/bin/bash

# Integration Test Runner Script
# This script orchestrates the complete integration testing process

set -euo pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/.." && pwd)"

# Default values
TEST_SUITE="${TEST_SUITE:-all}"
ENVIRONMENT="${ENVIRONMENT:-test}"
PARALLEL="${PARALLEL:-false}"
COVERAGE="${COVERAGE:-false}"
CLEANUP="${CLEANUP:-true}"
DOCKER_COMPOSE="${DOCKER_COMPOSE:-true}"
TIMEOUT="${TIMEOUT:-30000}"
RETRIES="${RETRIES:-3}"

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$TEST_DIR/logs/test-run.log"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$TEST_DIR/logs/test-run.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$TEST_DIR/logs/test-run.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$TEST_DIR/logs/test-run.log"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  --suite SUITE         Test suite to run (all, external, service-mesh, contract, performance, security)
  --environment ENV     Environment configuration (test, ci, local)
  --parallel            Run tests in parallel
  --coverage            Generate code coverage report
  --no-cleanup          Skip cleanup after tests
  --no-docker           Don't use Docker Compose
  --timeout MS          Test timeout in milliseconds (default: 30000)
  --retries COUNT       Number of retries for failed tests (default: 3)
  --help                Show this help message

Examples:
  $0 --suite external --coverage
  $0 --suite all --parallel --environment ci
  $0 --suite contract --no-cleanup
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --no-cleanup)
            CLEANUP=false
            shift
            ;;
        --no-docker)
            DOCKER_COMPOSE=false
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
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
    
    # Check Docker if using Docker Compose
    if [ "$DOCKER_COMPOSE" = "true" ]; then
        if ! command -v docker &> /dev/null; then
            error "Docker is not installed"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            error "Docker Compose is not installed"
            exit 1
        fi
    fi
    
    # Create necessary directories
    mkdir -p "$TEST_DIR/logs" "$TEST_DIR/reports" "$TEST_DIR/coverage" "$TEST_DIR/pacts"
    
    success "Prerequisites check passed"
}

# Function to setup test environment
setup_test_environment() {
    log "Setting up test environment..."
    
    cd "$TEST_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm install
    fi
    
    # Set environment variables
    export NODE_ENV="$ENVIRONMENT"
    export TEST_TIMEOUT="$TIMEOUT"
    export TEST_RETRIES="$RETRIES"
    export TEST_PARALLEL="$PARALLEL"
    export TEST_COVERAGE="$COVERAGE"
    
    if [ "$DOCKER_COMPOSE" = "true" ]; then
        log "Starting Docker Compose services..."
        docker-compose -f docker-compose.integration.yml up -d
        
        # Wait for services to be ready
        log "Waiting for services to be ready..."
        sleep 30
        
        # Check service health
        check_service_health
    fi
    
    success "Test environment setup complete"
}

# Function to check service health
check_service_health() {
    log "Checking service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt/$max_attempts"
        
        # Check PostgreSQL
        if docker-compose -f docker-compose.integration.yml exec -T postgres-test pg_isready -U postgres -d lims_test &> /dev/null; then
            success "PostgreSQL is healthy"
            break
        else
            warning "PostgreSQL not ready, waiting..."
            sleep 5
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error "PostgreSQL failed to become healthy"
        exit 1
    fi
    
    # Check Redis
    if docker-compose -f docker-compose.integration.yml exec -T redis-test redis-cli ping &> /dev/null; then
        success "Redis is healthy"
    else
        error "Redis is not healthy"
        exit 1
    fi
    
    # Check RabbitMQ
    if docker-compose -f docker-compose.integration.yml exec -T rabbitmq-test rabbitmqctl status &> /dev/null; then
        success "RabbitMQ is healthy"
    else
        error "RabbitMQ is not healthy"
        exit 1
    fi
    
    success "All services are healthy"
}

# Function to run tests
run_tests() {
    log "Running integration tests..."
    log "Test suite: $TEST_SUITE"
    log "Environment: $ENVIRONMENT"
    log "Parallel: $PARALLEL"
    log "Coverage: $COVERAGE"
    
    cd "$TEST_DIR"
    
    local test_command="npm run test"
    local exit_code=0
    
    # Select test command based on suite
    case $TEST_SUITE in
        all)
            test_command="npm run test"
            ;;
        external)
            test_command="npm run test:external"
            ;;
        service-mesh)
            test_command="npm run test:service-mesh"
            ;;
        contract)
            test_command="npm run test:contract"
            ;;
        performance)
            test_command="npm run test:performance"
            ;;
        security)
            test_command="npm run test:security"
            ;;
        smoke)
            test_command="npm run test:smoke"
            ;;
        e2e)
            test_command="npm run test:e2e"
            ;;
        *)
            error "Unknown test suite: $TEST_SUITE"
            exit 1
            ;;
    esac
    
    # Add parallel flag if enabled
    if [ "$PARALLEL" = "true" ]; then
        test_command="$test_command --parallel"
    fi
    
    # Add coverage flag if enabled
    if [ "$COVERAGE" = "true" ]; then
        test_command="npm run test:coverage"
    fi
    
    # Run tests with retries
    local retry_count=0
    while [ $retry_count -lt $RETRIES ]; do
        log "Running tests (attempt $((retry_count + 1))/$RETRIES)..."
        
        if $test_command; then
            success "Tests passed"
            exit_code=0
            break
        else
            error "Tests failed on attempt $((retry_count + 1))"
            exit_code=1
            ((retry_count++))
            
            if [ $retry_count -lt $RETRIES ]; then
                warning "Retrying in 10 seconds..."
                sleep 10
            fi
        fi
    done
    
    # Generate JUnit report for CI
    if [ "$ENVIRONMENT" = "ci" ]; then
        log "Generating JUnit report..."
        npm run test:junit
    fi
    
    return $exit_code
}

# Function to run additional tests
run_additional_tests() {
    local exit_code=0
    
    # Run performance tests if requested
    if [ "$TEST_SUITE" = "all" ] || [ "$TEST_SUITE" = "performance" ]; then
        log "Running performance tests..."
        if [ "$DOCKER_COMPOSE" = "true" ]; then
            docker-compose -f docker-compose.integration.yml --profile load-testing up --abort-on-container-exit load-test
        else
            npm run test:performance
        fi
    fi
    
    # Run security tests if requested
    if [ "$TEST_SUITE" = "all" ] || [ "$TEST_SUITE" = "security" ]; then
        log "Running security tests..."
        if [ "$DOCKER_COMPOSE" = "true" ]; then
            docker-compose -f docker-compose.integration.yml --profile security-testing up --abort-on-container-exit security-test
        else
            npm run test:security
        fi
    fi
    
    return $exit_code
}

# Function to generate reports
generate_reports() {
    log "Generating test reports..."
    
    cd "$TEST_DIR"
    
    # Generate coverage report if enabled
    if [ "$COVERAGE" = "true" ]; then
        log "Generating coverage report..."
        if [ -d "coverage" ]; then
            success "Coverage report generated in coverage/ directory"
        else
            warning "No coverage data found"
        fi
    fi
    
    # Generate test summary
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    cat > reports/test-summary.json << EOF
{
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "testSuite": "$TEST_SUITE",
  "parallel": $PARALLEL,
  "coverage": $COVERAGE,
  "timeout": $TIMEOUT,
  "retries": $RETRIES,
  "dockerCompose": $DOCKER_COMPOSE
}
EOF
    
    success "Test reports generated"
}

# Function to cleanup
cleanup() {
    if [ "$CLEANUP" = "true" ]; then
        log "Cleaning up test environment..."
        
        if [ "$DOCKER_COMPOSE" = "true" ]; then
            cd "$TEST_DIR"
            docker-compose -f docker-compose.integration.yml down -v
            docker-compose -f docker-compose.integration.yml --profile load-testing down -v
            docker-compose -f docker-compose.integration.yml --profile security-testing down -v
        fi
        
        success "Cleanup complete"
    else
        log "Skipping cleanup (--no-cleanup flag specified)"
    fi
}

# Function to handle errors and cleanup
handle_error() {
    error "Test run failed"
    cleanup
    exit 1
}

# Main execution
main() {
    log "Starting integration test run..."
    log "Test suite: $TEST_SUITE"
    log "Environment: $ENVIRONMENT"
    log "Docker Compose: $DOCKER_COMPOSE"
    
    # Set up error handling
    trap handle_error ERR
    
    # Run test process
    check_prerequisites
    setup_test_environment
    
    local test_exit_code=0
    if ! run_tests; then
        test_exit_code=1
    fi
    
    if ! run_additional_tests; then
        test_exit_code=1
    fi
    
    generate_reports
    cleanup
    
    if [ $test_exit_code -eq 0 ]; then
        success "Integration test run completed successfully"
    else
        error "Integration test run failed"
        exit 1
    fi
}

# Run main function
main "$@"