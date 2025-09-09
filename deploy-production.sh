#!/bin/bash

# JAG DNA Scientific LIMS - Production Deployment Script
# This script deploys the application using Docker Compose

set -e  # Exit on error

echo "================================================"
echo "JAG DNA Scientific LIMS - Production Deployment"
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

print_step() {
    echo -e "${BLUE}[$1]${NC}"
}

# Check dependencies
print_step "1/7 Checking dependencies"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "$COMPOSE_FILE not found!"
    exit 1
fi

print_success "All dependencies satisfied"

# Create .env.production if it doesn't exist
print_step "2/7 Checking environment configuration"

if [ ! -f "$ENV_FILE" ]; then
    print_info "Creating $ENV_FILE from .env.example..."
    cp .env.example $ENV_FILE
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 16)
    
    # Update the production env file
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" $ENV_FILE
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" $ENV_FILE
    sed -i.bak "s/NODE_ENV=.*/NODE_ENV=production/" $ENV_FILE
    sed -i.bak "s/DB_ADAPTER=.*/DB_ADAPTER=postgres/" $ENV_FILE
    
    print_success "Production environment file created with secure secrets"
    print_info "Please review $ENV_FILE and update any necessary values"
else
    print_success "Using existing $ENV_FILE"
fi

# Build the production image
print_step "3/7 Building production image"

if [ -f "build-production.sh" ]; then
    bash build-production.sh
else
    docker-compose -f $COMPOSE_FILE build
fi

print_success "Production image built"

# Stop existing containers
print_step "4/7 Stopping existing containers"

docker-compose -f $COMPOSE_FILE down || true
print_success "Existing containers stopped"

# Start PostgreSQL first and wait for it to be ready
print_step "5/7 Starting PostgreSQL database"

docker-compose -f $COMPOSE_FILE up -d postgres

echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U lims_user -d limsdb &> /dev/null; then
        print_success "PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 2
done

# Start the application
print_step "6/7 Starting LIMS application"

docker-compose -f $COMPOSE_FILE up -d lims-app
print_success "LIMS application started"

# Wait for application to be healthy
print_step "7/7 Verifying deployment"

echo "Waiting for application to be healthy..."
for i in {1..60}; do
    if curl -f http://localhost:3001/api/health &> /dev/null; then
        print_success "Application is healthy and responding"
        break
    fi
    echo -n "."
    sleep 2
done

# Show container status
echo ""
print_info "Container Status:"
docker-compose -f $COMPOSE_FILE ps

# Show logs from the last few lines
echo ""
print_info "Recent application logs:"
docker-compose -f $COMPOSE_FILE logs --tail=20 lims-app

echo ""
echo "================================================"
echo "Deployment completed successfully!"
echo "================================================"
echo ""
echo "Application URLs:"
echo "  - Main Application: http://localhost:3001"
echo "  - Health Check: http://localhost:3001/api/health"
echo "  - Metrics: http://localhost:9090/metrics"
echo ""
echo "Database:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Database: limsdb"
echo "  - User: lims_user"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  - Stop all: docker-compose -f $COMPOSE_FILE down"
echo "  - Restart: docker-compose -f $COMPOSE_FILE restart"
echo "  - Shell access: docker-compose -f $COMPOSE_FILE exec lims-app sh"
echo ""
echo "To enable monitoring (Prometheus + Grafana):"
echo "  docker-compose -f $COMPOSE_FILE --profile monitoring up -d"
echo ""