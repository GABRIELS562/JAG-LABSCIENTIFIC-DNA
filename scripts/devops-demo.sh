#!/bin/bash

# DevOps Demo Automation Script for LabScientific LIMS
# Demonstrates various DevOps practices and deployment methods

set -e

echo "🧬 LabScientific LIMS - DevOps Demonstration Platform"
echo "=" * 60

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js not found. Please install Node.js 18.x or later."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//')
    log "Node.js version: $NODE_VERSION"
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        log "Docker found: $(docker --version)"
    else
        warn "Docker not found. Docker-based demos will be skipped."
    fi
    
    # Check kubectl (optional)
    if command -v kubectl &> /dev/null; then
        log "kubectl found: $(kubectl version --client --short 2>/dev/null || echo 'kubectl available')"
    else
        warn "kubectl not found. Kubernetes demos will be skipped."
    fi
    
    log "Prerequisites check complete ✅"
}

# Function to start local development environment
start_local() {
    log "Starting local development environment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm install
        cd backend && npm install && cd ..
    fi
    
    # Start backend in background
    log "Starting backend server..."
    PORT=3001 node backend/server.js &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 3
    
    # Check backend health
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "Backend started successfully ✅"
    else
        error "Backend failed to start"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Start frontend in background
    log "Starting frontend development server..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for frontend
    sleep 5
    
    log "Development environment ready! 🚀"
    log "Frontend: http://localhost:5173"
    log "Backend:  http://localhost:3001"
    log "Health:   http://localhost:3001/health"
    
    # Save PIDs for cleanup
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
    
    log "Press Ctrl+C to stop all services"
    wait
}

# Function to stop local services
stop_local() {
    log "Stopping local services..."
    
    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm .backend.pid
        log "Backend stopped"
    fi
    
    if [ -f .frontend.pid ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm .frontend.pid
        log "Frontend stopped"
    fi
    
    # Kill any remaining node processes
    pkill -f "vite\|node.*server.js" 2>/dev/null || true
    
    log "All services stopped ✅"
}

# Function to build application
build_app() {
    log "Building application..."
    
    # Install dependencies
    npm ci
    cd backend && npm ci && cd ..
    
    # Run linting
    npm run lint 2>/dev/null || warn "Linting skipped"
    
    # Build frontend
    npm run build
    
    log "Build completed successfully ✅"
    log "Production files available in ./dist/"
}

# Function to run load test
run_load_test() {
    log "Running load test..."
    
    # Check if backend is running
    if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
        error "Backend not running. Start with: $0 start"
        exit 1
    fi
    
    # Run load test with customizable parameters
    TOTAL=${1:-100}
    CONCURRENT=${2:-10}
    
    log "Load testing with $TOTAL total requests, $CONCURRENT concurrent"
    TOTAL=$TOTAL CONCURRENT=$CONCURRENT node scripts/load-test.js
}

# Function to deploy with Docker Compose
deploy_docker() {
    log "Deploying with Docker Compose..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker not found. Please install Docker first."
        exit 1
    fi
    
    # Build the application first
    build_app
    
    # Start Docker Compose services
    docker-compose up --build -d
    
    log "Waiting for services to start..."
    sleep 10
    
    # Check health
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "Docker deployment successful ✅"
        log "Application: http://localhost:80"
        log "API Health:  http://localhost:3001/health"
    else
        error "Docker deployment failed"
        docker-compose logs
        exit 1
    fi
}

# Function to start monitoring stack
start_monitoring() {
    log "Starting monitoring stack..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker required for monitoring stack"
        exit 1
    fi
    
    # Create network if it doesn't exist
    docker network create lims_network 2>/dev/null || true
    
    # Start monitoring services
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d
    
    log "Monitoring stack started ✅"
    log "Prometheus: http://localhost:9090"
    log "Grafana:    http://localhost:3000 (admin/admin123)"
    log "AlertManager: http://localhost:9093"
}

# Function to deploy to Kubernetes (demo)
deploy_k8s() {
    log "Demonstrating Kubernetes deployment..."
    
    if ! command -v kubectl &> /dev/null; then
        warn "kubectl not found. Showing deployment commands instead."
        echo ""
        echo "Kubernetes Deployment Commands:"
        echo "kubectl apply -f k8s/namespace.yml"
        echo "kubectl apply -f k8s/configmap.yml"
        echo "kubectl apply -f deployment/k8s-deployment.yml"
        echo ""
        echo "To check deployment status:"
        echo "kubectl get pods -n labscientific-lims"
        echo "kubectl get services -n labscientific-lims"
        return
    fi
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/namespace.yml
    kubectl apply -f k8s/configmap.yml
    kubectl apply -f deployment/k8s-deployment.yml
    
    log "Kubernetes manifests applied ✅"
    log "Check deployment: kubectl get pods -n labscientific-lims"
}

# Function to show system status
show_status() {
    log "System Status Check"
    echo ""
    
    # Check local processes
    echo "Local Processes:"
    ps aux | grep -E "(node.*server|vite)" | grep -v grep || echo "No local services running"
    echo ""
    
    # Check Docker containers
    if command -v docker &> /dev/null; then
        echo "Docker Containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(labscientific|prometheus|grafana)" || echo "No Docker containers running"
        echo ""
    fi
    
    # Check service health
    echo "Service Health:"
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend API (http://localhost:3001)"
    else
        echo "❌ Backend API (http://localhost:3001)"
    fi
    
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ Frontend Dev Server (http://localhost:5173)"
    else
        echo "❌ Frontend Dev Server (http://localhost:5173)"
    fi
    
    if curl -f http://localhost:80 > /dev/null 2>&1; then
        echo "✅ Docker Deployment (http://localhost:80)"
    else
        echo "❌ Docker Deployment (http://localhost:80)"
    fi
}

# Function to cleanup everything
cleanup_all() {
    log "Cleaning up all services and containers..."
    
    # Stop local services
    stop_local
    
    # Stop Docker containers
    if command -v docker &> /dev/null; then
        docker-compose down 2>/dev/null || true
        docker-compose -f monitoring/docker-compose.monitoring.yml down 2>/dev/null || true
        log "Docker containers stopped"
    fi
    
    # Clean build artifacts
    rm -rf dist node_modules/.cache .backend.pid .frontend.pid 2>/dev/null || true
    
    log "Cleanup completed ✅"
}

# Main script logic
case "${1:-}" in
    "start")
        check_prerequisites
        start_local
        ;;
    "stop")
        stop_local
        ;;
    "build")
        build_app
        ;;
    "test")
        run_load_test "${2:-100}" "${3:-10}"
        ;;
    "docker")
        deploy_docker
        ;;
    "monitoring")
        start_monitoring
        ;;
    "k8s")
        deploy_k8s
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup_all
        ;;
    *)
        echo "LabScientific LIMS - DevOps Demo Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start      - Start local development environment"
        echo "  stop       - Stop local services"
        echo "  build      - Build application for production"
        echo "  test       - Run load test (optional: total concurrent)"
        echo "  docker     - Deploy with Docker Compose"
        echo "  monitoring - Start Prometheus/Grafana monitoring"
        echo "  k8s        - Deploy to Kubernetes (demo)"
        echo "  status     - Show system status"
        echo "  cleanup    - Clean up all services and files"
        echo ""
        echo "Examples:"
        echo "  $0 start                    # Start development environment"
        echo "  $0 test 500 20              # Load test with 500 requests, 20 concurrent"
        echo "  $0 docker                   # Deploy with Docker"
        echo "  $0 monitoring               # Start monitoring stack"
        echo ""
        exit 1
        ;;
esac